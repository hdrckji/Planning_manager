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

/** GET /api/ical/:collaboratorId  →  text/calendar */
app.get("/api/ical/:collaboratorId", async (req, res) => {
  try {
    const collabId = req.params.collaboratorId;
    const { rows } = await pool.query(
      "SELECT value FROM kv_store WHERE key = 'flowdesk-state'"
    );
    const st = rows[0]?.value || {};
    const tasks   = (st.planningTasks || []).filter(t => t.collaboratorId === collabId);
    const tickets = (st.tickets || []).filter(t => t.assignedTo === collabId && (t.plannedDate || t.desiredDate));
    const collab  = (st.users || []).find(u => u.id === collabId);
    const calName = collab ? `FamiTask – ${collab.name}` : "FamiTask Planning";

    const lines = [
      "BEGIN:VCALENDAR", "VERSION:2.0",
      "PRODID:-//FamiTask//Famiflora//FR",
      `X-WR-CALNAME:${escIcal(calName)}`,
      "X-WR-TIMEZONE:Europe/Brussels",
      "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    ];

    const stamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

    for (const task of tasks) {
      const d = (task.date || "").replace(/-/g, "");
      if (!d) continue;
      lines.push("BEGIN:VEVENT", `UID:task-${task.id}@famitask`, `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${d}`,
        `SUMMARY:${escIcal(task.title)}`,
        ...(task.description ? [`DESCRIPTION:${escIcal(task.description)}`] : []),
        `STATUS:${task.status === "termine" ? "COMPLETED" : "CONFIRMED"}`,
        "END:VEVENT");
    }

    for (const ticket of tickets) {
      const d = ((ticket.plannedDate || ticket.desiredDate) || "").replace(/-/g, "");
      if (!d) continue;
      lines.push("BEGIN:VEVENT", `UID:ticket-${ticket.id}@famitask`, `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${d}`,
        `SUMMARY:${escIcal(ticket.title)}`,
        ...(ticket.description ? [`DESCRIPTION:${escIcal(ticket.description)}`] : []),
        `STATUS:${ticket.status === "termine" ? "COMPLETED" : "CONFIRMED"}`,
        "END:VEVENT");
    }

    lines.push("END:VCALENDAR");
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.send(lines.join("\r\n"));
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
