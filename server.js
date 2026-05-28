process.on("uncaughtException",  (err) => console.error("UNCAUGHT:", err.stack));
process.on("unhandledRejection", (r)   => console.error("UNHANDLED:", r));

const path    = require("path");
const express = require("express");
const cors    = require("cors");
const { pool, initSchema } = require("./db");

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: "20mb" }));

// ── Static files (HTML / CSS / JS) ─────────────────────────────────────────
app.use(express.static(path.join(__dirname)));

// ── API : key-value store ───────────────────────────────────────────────────

/** GET /api/kv/:key  →  { value } */
app.get("/api/kv/:key", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT value FROM kv_store WHERE key = $1",
      [req.params.key],
    );
    if (rows.length === 0) return res.json({ value: null });
    res.json({ value: rows[0].value });
  } catch (err) {
    console.error("GET /api/kv error:", err.message);
    res.status(500).json({ error: "db_error" });
  }
});

/** PUT /api/kv/:key  body: { value }  →  204 */
app.put("/api/kv/:key", async (req, res) => {
  const { value } = req.body;
  if (value === undefined) return res.status(400).json({ error: "missing_value" });
  try {
    await pool.query(
      `INSERT INTO kv_store (key, value, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (key) DO UPDATE
         SET value = EXCLUDED.value,
             updated_at = NOW()`,
      [req.params.key, JSON.stringify(value)],
    );
    res.sendStatus(204);
  } catch (err) {
    console.error("PUT /api/kv error:", err.message);
    res.status(500).json({ error: "db_error" });
  }
});

/** DELETE /api/kv/:key  →  204 */
app.delete("/api/kv/:key", async (req, res) => {
  try {
    await pool.query("DELETE FROM kv_store WHERE key = $1", [req.params.key]);
    res.sendStatus(204);
  } catch (err) {
    console.error("DELETE /api/kv error:", err.message);
    res.status(500).json({ error: "db_error" });
  }
});

// ── iCal feed (planning → Google Calendar / Outlook) ───────────────────────

function escIcal(str) {
  return (str || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function escHtml(str) {
  return (str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildHtmlDesc({ description, statut, hours, photoUrl, appUrl }) {
  return [
    '<html><body style="font-family:sans-serif;font-size:14px;color:#222;">',
    description ? `<p>${escHtml(description)}</p>` : "",
    `<p><strong>Statut :</strong> ${escHtml(statut)}&nbsp;&nbsp;`,
    `<strong>Estimé :</strong> ${hours}h</p>`,
    photoUrl ? `<p><img src="${photoUrl}" alt="Photo" style="max-width:480px;border-radius:8px;border:1px solid #ddd;" /></p>` : "",
    `<p><a href="${appUrl}" style="background:#1a5228;color:#fff;padding:8px 16px;border-radius:6px;text-decoration:none;font-weight:bold;">`,
    `&#128279; Mettre à jour dans FamiTask</a></p>`,
    "</body></html>",
  ].join("");
}

// Replie les lignes iCal > 75 octets (RFC 5545)
function foldLine(line) {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;
  const parts = [];
  let offset = 0;
  let first = true;
  while (offset < bytes.length) {
    const limit = first ? 75 : 74;
    parts.push(bytes.slice(offset, offset + limit).toString("utf8"));
    offset += limit;
    first = false;
  }
  return parts.join("\r\n ");
}

// Retourne la date du lendemain au format YYYYMMDD (DTEND exclusif pour événements journée entière)
function nextDay(dateStr) {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

const STATUS_LABELS_ICAL = { nouveau: "Nouveau", en_attente: "En attente", planifie: "Planifié", en_cours: "En cours", termine: "Terminé" };

async function servePhotoDataUrl(dataUrl, res) {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/s);
  if (!m) return res.status(400).send("Invalid photo");
  res.setHeader("Content-Type", m[1]);
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.send(Buffer.from(m[2], "base64"));
}

/** GET /api/photo/:ticketId  →  image (photo du ticket) */
app.get("/api/photo/:ticketId", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT value FROM kv_store WHERE key = 'flowdesk-state'");
    const st = rows[0]?.value || {};
    const ticket = (st.tickets || []).find(t => t.id === req.params.ticketId);
    if (!ticket?.photoDataUrl) return res.status(404).send("Not found");
    await servePhotoDataUrl(ticket.photoDataUrl, res);
  } catch (err) {
    console.error("Photo error:", err.message);
    res.status(500).send("Error");
  }
});

/** GET /api/photo/task/:taskId  →  image (photo d'une tâche planning) */
app.get("/api/photo/task/:taskId", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT value FROM kv_store WHERE key = 'flowdesk-state'");
    const st = rows[0]?.value || {};
    const task = (st.planningTasks || []).find(t => t.id === req.params.taskId);
    if (!task?.photoDataUrl) return res.status(404).send("Not found");
    await servePhotoDataUrl(task.photoDataUrl, res);
  } catch (err) {
    console.error("Task photo error:", err.message);
    res.status(500).send("Error");
  }
});

/** GET /api/ical/:collaboratorId  →  text/calendar */
app.get("/api/ical/:collaboratorId", async (req, res) => {
  try {
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const collabId = req.params.collaboratorId;
    const { rows } = await pool.query(
      "SELECT value FROM kv_store WHERE key = 'flowdesk-state'"
    );
    const st = rows[0]?.value || {};
    const users = st.users || [];
    // Résolution : accepte l'ID exact OU le nom (insensible à la casse)
    const collabLower = collabId.toLowerCase();
    const collab = users.find(u => u.id === collabId)
                || users.find(u => (u.name || "").toLowerCase() === collabLower);
    const resolvedId = collab ? collab.id : collabId;
    const tasks   = (st.planningTasks || []).filter(t => t.collaboratorId === resolvedId);
    const tickets = (st.tickets || []).filter(t => t.assignedTo === resolvedId && (t.plannedDate || t.desiredDate));
    const calName = collab ? `FamiTask – ${collab.name}` : "FamiTask Planning";
    const appUrl  = `${baseUrl}/collaborator.html`;

    const lines = [
      "BEGIN:VCALENDAR", "VERSION:2.0",
      "PRODID:-//FamiTask//Famiflora//FR",
      foldLine(`X-WR-CALNAME:${escIcal(calName)}`),
      "X-WR-TIMEZONE:Europe/Brussels",
      "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
      "REFRESH-INTERVAL;VALUE=DURATION:PT15M",
      "X-PUBLISHED-TTL:PT15M",
    ];

    const stamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

    for (const task of tasks) {
      const dateRaw = task.date || "";
      if (!dateRaw) continue;
      const dtstart = dateRaw.replace(/-/g, "");
      const dtend   = nextDay(dateRaw);
      const statut  = STATUS_LABELS_ICAL[task.status] || task.status;
      const hours   = task.estimatedHours || 1;
      const photoUrl = task.photoDataUrl ? `${baseUrl}/api/photo/task/${encodeURIComponent(task.id)}` : null;
      const plainDesc = [
        task.description || "",
        `Statut : ${statut}`,
        `Estimé : ${hours}h`,
        `Mettre à jour : ${appUrl}`,
      ].filter(Boolean).join("\\n");
      const html = buildHtmlDesc({ description: task.description, statut, hours, photoUrl, appUrl });
      lines.push(
        "BEGIN:VEVENT",
        `UID:task-${task.id}@famitask`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${dtstart}`,
        `DTEND;VALUE=DATE:${dtend}`,
        foldLine(`SUMMARY:📋 ${escIcal(task.title)}`),
        foldLine(`DESCRIPTION:${escIcal(plainDesc)}`),
        foldLine(`X-ALT-DESC;FMTTYPE=text/html:${html}`),
        `URL:${appUrl}`,
        ...(photoUrl ? [`ATTACH;FMTTYPE=image/jpeg:${photoUrl}`] : []),
        `STATUS:${task.status === "termine" ? "COMPLETED" : "CONFIRMED"}`,
        "END:VEVENT"
      );
    }

    for (const ticket of tickets) {
      const dateRaw = ticket.plannedDate || ticket.desiredDate || "";
      if (!dateRaw) continue;
      const dtstart  = dateRaw.replace(/-/g, "");
      const dtend    = nextDay(dateRaw);
      const statut   = STATUS_LABELS_ICAL[ticket.status] || ticket.status;
      const hours    = ticket.estimatedHours || 1;
      const photoUrl = ticket.photoDataUrl ? `${baseUrl}/api/photo/${encodeURIComponent(ticket.id)}` : null;
      const plainDesc = [
        ticket.description || "",
        `Statut : ${statut}`,
        `Estimé : ${hours}h`,
        `Mettre à jour : ${appUrl}`,
      ].filter(Boolean).join("\\n");
      const html = buildHtmlDesc({ description: ticket.description, statut, hours, photoUrl, appUrl });
      lines.push(
        "BEGIN:VEVENT",
        `UID:ticket-${ticket.id}@famitask`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${dtstart}`,
        `DTEND;VALUE=DATE:${dtend}`,
        foldLine(`SUMMARY:🔧 ${escIcal(ticket.title)}`),
        foldLine(`DESCRIPTION:${escIcal(plainDesc)}`),
        foldLine(`X-ALT-DESC;FMTTYPE=text/html:${html}`),
        `URL:${appUrl}`,
        ...(photoUrl ? [`ATTACH;FMTTYPE=image/jpeg:${photoUrl}`] : []),
        `STATUS:${ticket.status === "termine" ? "COMPLETED" : "CONFIRMED"}`,
        "END:VEVENT"
      );
    }

    lines.push("END:VCALENDAR");
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.send(lines.map(foldLine).join("\r\n"));
  } catch (err) {
    console.error("iCal error:", err.message);
    res.status(500).send("Error");
  }
});

// ── Push stubs (no-op until web-push is configured) ────────────────────────
app.get("/api/push/vapid-public-key", (_, res) => res.status(503).json({ error: "push_not_configured" }));
app.post("/api/push/subscribe",       (_, res) => res.status(503).json({ error: "push_not_configured" }));
app.post("/api/push/unsubscribe",     (_, res) => res.sendStatus(204));

// ── SPA fallback ────────────────────────────────────────────────────────────
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ── Start : listen immediately so Railway health-check passes ───────────────
app.listen(PORT, () => {
  console.log(`FamiTask server running on port ${PORT}`);
  initSchema().catch((err) => console.error("Schema init error:", err.message));
});
