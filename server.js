process.on("uncaughtException",  (err) => console.error("UNCAUGHT:", err.stack));
process.on("unhandledRejection", (r)   => console.error("UNHANDLED:", r));

const path    = require("path");
const express = require("express");
const cors    = require("cors");
const bcrypt  = require("bcryptjs");
const crypto  = require("crypto");
const { pool, initSchema } = require("./db");

// ── Web Push (VAPID) ─────────────────────────────────────────────────────────
let webpush        = null;
const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY  || "";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_EMAIL   = process.env.VAPID_EMAIL       || "mailto:admin@famiflora.be";
try {
  webpush = require("web-push");
  if (VAPID_PUBLIC && VAPID_PRIVATE) {
    webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
    console.log("Push notifications: VAPID configuré ✓");
  } else {
    const keys = webpush.generateVAPIDKeys();
    console.log("Push: clés VAPID manquantes. Ajouter dans les variables Railway :");
    console.log(`  VAPID_PUBLIC_KEY=${keys.publicKey}`);
    console.log(`  VAPID_PRIVATE_KEY=${keys.privateKey}`);
    webpush = null;
  }
} catch (e) {
  console.warn("web-push non disponible:", e.message);
}

// ── Sécurité : secret d'application ────────────────────────────────────────
// Si APP_SECRET est défini en variable d'env → les tokens sont stables entre redémarrages
// et la protection en écriture est activée (REQUIRE_AUTH_WRITES implicite).
const APP_SECRET_FROM_ENV = process.env.APP_SECRET || "";
const APP_SECRET = APP_SECRET_FROM_ENV || crypto.randomBytes(32).toString("hex");
const WRITE_AUTH_ENABLED = !!APP_SECRET_FROM_ENV;

// ── Helpers token (payload signé HMAC-SHA256, valide 48h) ──────────────────
function makeToken(userId, role) {
  const exp = Math.floor(Date.now() / 86400000) + 30; // valide 30 jours
  const payload = Buffer.from(JSON.stringify({ userId, role, exp })).toString("base64url");
  const sig = crypto.createHmac("sha256", APP_SECRET).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

function verifyToken(token) {
  if (!token || typeof token !== "string") return null;
  const dot = token.lastIndexOf(".");
  if (dot === -1) return null;
  const payload = token.slice(0, dot);
  const sig     = token.slice(dot + 1);
  const expected = crypto.createHmac("sha256", APP_SECRET).update(payload).digest("base64url");
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    const today = Math.floor(Date.now() / 86400000);
    if (data.exp < today) return null; // expiré
    return data;
  } catch { return null; }
}

// Retire les mots de passe avant d'envoyer l'état au client,
// remplacés par un flag hasPassword pour conserver le mode migration.
function sanitizeStateForClient(state) {
  if (!state || !Array.isArray(state.users)) return state;
  return {
    ...state,
    users: state.users.map(({ password, ...u }) => ({
      ...u,
      hasPassword: typeof password === "string" && password.length > 0,
    })),
  };
}

// Middleware : exige un token valide si APP_SECRET est défini en env.
function requireToken(req, res, next) {
  if (!WRITE_AUTH_ENABLED) return next();
  const auth  = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token || !verifyToken(token)) return res.status(401).json({ error: "unauthorized" });
  next();
}

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: "20mb" }));

// ── Static files (HTML / CSS / JS) ─────────────────────────────────────────
app.use(express.static(path.join(__dirname)));

// ── API : key-value store ───────────────────────────────────────────────────

/** GET /api/kv/:key  →  { value }  (mots de passe retirés pour flowdesk-state) */
app.get("/api/kv/:key", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT value FROM kv_store WHERE key = $1",
      [req.params.key],
    );
    if (rows.length === 0) return res.json({ value: null });
    let value = rows[0].value;
    if (req.params.key === "flowdesk-state") value = sanitizeStateForClient(value);
    res.json({ value });
  } catch (err) {
    console.error("GET /api/kv error:", err.message);
    res.status(500).json({ error: "db_error" });
  }
});

/** PUT /api/kv/:key  body: { value }  →  204 */
app.put("/api/kv/:key", requireToken, async (req, res) => {
  const { value } = req.body;
  if (value === undefined) return res.status(400).json({ error: "missing_value" });

  let finalValue = value;

  // Réintègre les mots de passe hachés que le GET a masqués.
  // Le client ne reçoit jamais les vrais hashes (sanitizeStateForClient),
  // donc chaque PUT restaure les mots de passe depuis la valeur existante en base.
  if (req.params.key === "flowdesk-state" && value && Array.isArray(value.users)) {
    try {
      const { rows } = await pool.query(
        "SELECT value FROM kv_store WHERE key = 'flowdesk-state'"
      );
      const existing = rows[0]?.value;
      if (existing && Array.isArray(existing.users)) {
        const pwdMap = {};
        existing.users.forEach((u) => {
          if (u.id && typeof u.password === "string" && u.password) {
            pwdMap[u.id] = u.password;
          }
        });
        finalValue = {
          ...value,
          users: value.users.map((u) => ({
            ...u,
            password: (typeof u.password === "string" && u.password)
              ? u.password          // le client a envoyé un vrai hash (création / changement)
              : (pwdMap[u.id] || ""), // sinon, restaurer depuis la base
          })),
        };
      }
    } catch (mergeErr) {
      console.warn("Merge mots de passe échoué, save sans restauration:", mergeErr.message);
    }
  }

  try {
    await pool.query(
      `INSERT INTO kv_store (key, value, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (key) DO UPDATE
         SET value = EXCLUDED.value,
             updated_at = NOW()`,
      [req.params.key, JSON.stringify(finalValue)],
    );
    res.sendStatus(204);
  } catch (err) {
    console.error("PUT /api/kv error:", err.message);
    res.status(500).json({ error: "db_error" });
  }
});

/** DELETE /api/kv/:key  →  204 */
app.delete("/api/kv/:key", requireToken, async (req, res) => {
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

// ── Helpers iCal ─────────────────────────────────────────────────────────────
const SCHED_DAYS_SRV = ["mon","tue","wed","thu","fri","sat","sun"];

function isoWeekNumSrv(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dn = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dn);
  return Math.ceil((((d - new Date(Date.UTC(d.getUTCFullYear(), 0, 1))) / 86400000) + 1) / 7);
}

function buildEventTimes(dateRaw, schedule) {
  const dateCompact = dateRaw.replace(/-/g, "");
  if (schedule) {
    const d = new Date(dateRaw + "T00:00:00");
    const wt = isoWeekNumSrv(d) % 2 === 0 ? "A" : "B";
    const dk = SCHED_DAYS_SRV[d.getDay() === 0 ? 6 : d.getDay() - 1];
    const ds = schedule[wt]?.[dk];
    if (ds?.active && ds.start && ds.end) {
      return [
        `DTSTART;TZID=Europe/Brussels:${dateCompact}T${ds.start.replace(":", "")}00`,
        `DTEND;TZID=Europe/Brussels:${dateCompact}T${ds.end.replace(":", "")}00`,
      ];
    }
  }
  return [`DTSTART;VALUE=DATE:${dateCompact}`, `DTEND;VALUE=DATE:${nextDay(dateRaw)}`];
}

function icalStatus(status) {
  if (status === "termine") return "COMPLETED";
  if (status === "en_cours") return "IN-PROCESS";
  return "CONFIRMED";
}

const VTIMEZONE_BRUSSELS = [
  "BEGIN:VTIMEZONE",
  "TZID:Europe/Brussels",
  "BEGIN:STANDARD",
  "DTSTART:19701025T030000",
  "RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=10",
  "TZOFFSETFROM:+0200",
  "TZOFFSETTO:+0100",
  "TZNAME:CET",
  "END:STANDARD",
  "BEGIN:DAYLIGHT",
  "DTSTART:19700329T020000",
  "RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=3",
  "TZOFFSETFROM:+0100",
  "TZOFFSETTO:+0200",
  "TZNAME:CEST",
  "END:DAYLIGHT",
  "END:VTIMEZONE",
];

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
    const [stateResult, sitesResult] = await Promise.all([
      pool.query("SELECT value FROM kv_store WHERE key = 'flowdesk-state'"),
      pool.query("SELECT value FROM kv_store WHERE key = 'flowdesk-sites'"),
    ]);
    const st = stateResult.rows[0]?.value || {};
    const sitesData = Array.isArray(sitesResult.rows[0]?.value) ? sitesResult.rows[0].value : [];
    const users = st.users || [];
    // Résolution : accepte l'ID exact OU le nom (insensible à la casse)
    const collabLower = collabId.toLowerCase();
    const collab = users.find(u => u.id === collabId)
                || users.find(u => (u.name || "").toLowerCase() === collabLower);
    const resolvedId = collab ? collab.id : collabId;
    const schedule  = collab?.schedule ?? null;
    const tasks   = (st.planningTasks || []).filter(t => t.collaboratorId === resolvedId);
    const tickets = (st.tickets || []).filter(t => t.assignedTo === resolvedId && (t.plannedDate || t.desiredDate));
    const calName = collab ? `FamiTask – ${collab.name}` : "FamiTask Planning";
    const appUrl  = `${baseUrl}/collaborator.html`;

    function siteName(siteId) {
      if (!siteId) return null;
      const s = sitesData.find(x => x.id === siteId);
      return s ? s.name : null;
    }

    const lines = [
      "BEGIN:VCALENDAR", "VERSION:2.0",
      "PRODID:-//FamiTask//Famiflora//FR",
      `X-WR-CALNAME:${escIcal(calName)}`,
      "X-WR-TIMEZONE:Europe/Brussels",
      "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
      "REFRESH-INTERVAL;VALUE=DURATION:PT15M",
      "X-PUBLISHED-TTL:PT15M",
      ...VTIMEZONE_BRUSSELS,
    ];

    const stamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

    for (const task of tasks) {
      const dateRaw = task.date || "";
      if (!dateRaw) continue;
      const eventTimes = buildEventTimes(dateRaw, schedule);
      const statut  = STATUS_LABELS_ICAL[task.status] || task.status;
      const hours   = task.estimatedHours || 1;
      const photoUrl = task.photoDataUrl ? `${baseUrl}/api/photo/task/${encodeURIComponent(task.id)}` : null;
      const location = siteName(task.siteId);
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
        ...eventTimes,
        `SUMMARY:📋 ${escIcal(task.title)}`,
        `DESCRIPTION:${escIcal(plainDesc)}`,
        `X-ALT-DESC;FMTTYPE=text/html:${html}`,
        `URL:${appUrl}`,
        ...(location ? [`LOCATION:${escIcal(location)}`] : []),
        ...(photoUrl ? [`ATTACH;FMTTYPE=image/jpeg:${photoUrl}`] : []),
        `STATUS:${icalStatus(task.status)}`,
        "END:VEVENT"
      );
    }

    for (const ticket of tickets) {
      const dateRaw = ticket.plannedDate || ticket.desiredDate || "";
      if (!dateRaw) continue;
      const eventTimes = buildEventTimes(dateRaw, schedule);
      const statut   = STATUS_LABELS_ICAL[ticket.status] || ticket.status;
      const hours    = ticket.estimatedHours || 1;
      const photoUrl = ticket.photoDataUrl ? `${baseUrl}/api/photo/${encodeURIComponent(ticket.id)}` : null;
      const location = siteName(ticket.siteId);
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
        ...eventTimes,
        `SUMMARY:🔧 ${escIcal(ticket.title)}`,
        `DESCRIPTION:${escIcal(plainDesc)}`,
        `X-ALT-DESC;FMTTYPE=text/html:${html}`,
        `URL:${appUrl}`,
        ...(location ? [`LOCATION:${escIcal(location)}`] : []),
        ...(photoUrl ? [`ATTACH;FMTTYPE=image/jpeg:${photoUrl}`] : []),
        `STATUS:${icalStatus(ticket.status)}`,
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

// ── iCal manager feeds ───────────────────────────────────────────────────────
// Token stable dérivé du APP_SECRET — ne jamais exposer APP_SECRET lui-même
const ICAL_MANAGER_SECRET = crypto
  .createHmac("sha256", APP_SECRET)
  .update("ical-manager-v1")
  .digest("hex")
  .slice(0, 24);

function checkIcalToken(req, res) {
  if (req.query.token !== ICAL_MANAGER_SECRET) {
    res.status(401).send("Token iCal invalide.");
    return false;
  }
  return true;
}

function icalCalHeader(calName) {
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0",
    "PRODID:-//FamiTask//Famiflora//FR",
    `X-WR-CALNAME:${escIcal(calName)}`,
    "X-WR-TIMEZONE:Europe/Brussels",
    "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "REFRESH-INTERVAL;VALUE=DURATION:PT15M",
    "X-PUBLISHED-TTL:PT15M",
    ...VTIMEZONE_BRUSSELS,
  ];
}

/** GET /api/ical/manager/urls  →  { team, prestataires } — nécessite auth manager */
app.get("/api/ical/manager/urls", (req, res) => {
  const auth  = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  const claims = verifyToken(token);
  if (!claims || claims.role !== "manager") return res.status(403).json({ error: "Forbidden" });
  const base = `${req.protocol}://${req.get("host")}`;
  res.json({
    team:         `${base}/api/ical/manager/team?token=${ICAL_MANAGER_SECRET}`,
    prestataires: `${base}/api/ical/manager/prestataires?token=${ICAL_MANAGER_SECRET}`,
  });
});

/** GET /api/ical/manager/team?token=xxx  →  text/calendar (tous les collaborateurs) */
app.get("/api/ical/manager/team", async (req, res) => {
  if (!checkIcalToken(req, res)) return;
  try {
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const [stateResult, sitesResult] = await Promise.all([
      pool.query("SELECT value FROM kv_store WHERE key = 'flowdesk-state'"),
      pool.query("SELECT value FROM kv_store WHERE key = 'flowdesk-sites'"),
    ]);
    const st = stateResult.rows[0]?.value || {};
    const sitesData = Array.isArray(sitesResult.rows[0]?.value) ? sitesResult.rows[0].value : [];
    const users = st.users || [];
    const collabs = users.filter(u => u.role === "collaborator");
    const appUrl  = `${baseUrl}/manager.html`;
    const stamp   = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

    function siteName(siteId) {
      if (!siteId) return null;
      const s = sitesData.find(x => x.id === siteId);
      return s ? s.name : null;
    }

    const lines = icalCalHeader("FamiTask – Équipe");

    for (const task of (st.planningTasks || [])) {
      if (!task.collaboratorId || !task.date) continue;
      const collab = collabs.find(c => c.id === task.collaboratorId);
      const collabName = collab?.name || "Collaborateur";
      const eventTimes = buildEventTimes(task.date, collab?.schedule ?? null);
      const statut   = STATUS_LABELS_ICAL[task.status] || task.status;
      const hours    = task.estimatedHours || 1;
      const photoUrl = task.photoDataUrl ? `${baseUrl}/api/photo/task/${encodeURIComponent(task.id)}` : null;
      const location = siteName(task.siteId);
      const plainDesc = [
        task.description || "",
        `Collaborateur : ${collabName}`,
        `Statut : ${statut}`,
        `Estimé : ${hours}h`,
      ].filter(Boolean).join("\\n");
      const html = buildHtmlDesc({ description: task.description, statut, hours, photoUrl, appUrl });
      lines.push(
        "BEGIN:VEVENT",
        `UID:task-${task.id}@famitask`,
        `DTSTAMP:${stamp}`,
        ...eventTimes,
        `SUMMARY:👤 ${escIcal(collabName)} – ${escIcal(task.title)}`,
        `DESCRIPTION:${escIcal(plainDesc)}`,
        `X-ALT-DESC;FMTTYPE=text/html:${html}`,
        `URL:${appUrl}`,
        ...(location ? [`LOCATION:${escIcal(location)}`] : []),
        ...(photoUrl ? [`ATTACH;FMTTYPE=image/jpeg:${photoUrl}`] : []),
        `STATUS:${icalStatus(task.status)}`,
        "END:VEVENT"
      );
    }

    for (const ticket of (st.tickets || [])) {
      if (!ticket.assignedTo) continue;
      const dateRaw = ticket.plannedDate || ticket.desiredDate || "";
      if (!dateRaw) continue;
      const collab = collabs.find(c => c.id === ticket.assignedTo);
      const collabName = collab?.name || "Collaborateur";
      const eventTimes = buildEventTimes(dateRaw, collab?.schedule ?? null);
      const statut   = STATUS_LABELS_ICAL[ticket.status] || ticket.status;
      const hours    = ticket.estimatedHours || 1;
      const photoUrl = ticket.photoDataUrl ? `${baseUrl}/api/photo/${encodeURIComponent(ticket.id)}` : null;
      const location = siteName(ticket.siteId);
      const plainDesc = [
        ticket.description || "",
        `Collaborateur : ${collabName}`,
        `Statut : ${statut}`,
        `Estimé : ${hours}h`,
      ].filter(Boolean).join("\\n");
      const html = buildHtmlDesc({ description: ticket.description, statut, hours, photoUrl, appUrl });
      lines.push(
        "BEGIN:VEVENT",
        `UID:ticket-${ticket.id}@famitask`,
        `DTSTAMP:${stamp}`,
        ...eventTimes,
        `SUMMARY:🔧 ${escIcal(collabName)} – ${escIcal(ticket.title)}`,
        `DESCRIPTION:${escIcal(plainDesc)}`,
        `X-ALT-DESC;FMTTYPE=text/html:${html}`,
        `URL:${appUrl}`,
        ...(location ? [`LOCATION:${escIcal(location)}`] : []),
        ...(photoUrl ? [`ATTACH;FMTTYPE=image/jpeg:${photoUrl}`] : []),
        `STATUS:${icalStatus(ticket.status)}`,
        "END:VEVENT"
      );
    }

    lines.push("END:VCALENDAR");
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="famitask-equipe.ics"');
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.send(lines.map(foldLine).join("\r\n"));
  } catch (err) {
    console.error("iCal team error:", err.message);
    res.status(500).send("Error");
  }
});

/** GET /api/ical/manager/prestataires?token=xxx  →  text/calendar (tous les prestataires) */
app.get("/api/ical/manager/prestataires", async (req, res) => {
  if (!checkIcalToken(req, res)) return;
  try {
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const [stateResult, prestResult, sitesResult] = await Promise.all([
      pool.query("SELECT value FROM kv_store WHERE key = 'flowdesk-state'"),
      pool.query("SELECT value FROM kv_store WHERE key = 'flowdesk-prestataires'"),
      pool.query("SELECT value FROM kv_store WHERE key = 'flowdesk-sites'"),
    ]);
    const st = stateResult.rows[0]?.value || {};
    const prestataires = Array.isArray(prestResult.rows[0]?.value) ? prestResult.rows[0].value : [];
    const sitesData    = Array.isArray(sitesResult.rows[0]?.value) ? sitesResult.rows[0].value : [];
    const appUrl  = `${baseUrl}/manager.html`;
    const stamp   = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

    function siteName(siteId) {
      if (!siteId) return null;
      const s = sitesData.find(x => x.id === siteId);
      return s ? s.name : null;
    }
    function prestName(prestId) {
      if (!prestId) return "Prestataire";
      const p = prestataires.find(x => x.id === prestId);
      return p?.name || prestId;
    }

    const lines = icalCalHeader("FamiTask – Prestataires");

    for (const task of (st.planningTasks || [])) {
      if (!task.prestataireId || !task.date) continue;
      const name = prestName(task.prestataireId);
      const dateCompact = task.date.replace(/-/g, "");
      const statut  = STATUS_LABELS_ICAL[task.status] || task.status;
      const hours   = task.estimatedHours || 1;
      const photoUrl = task.photoDataUrl ? `${baseUrl}/api/photo/task/${encodeURIComponent(task.id)}` : null;
      const location = siteName(task.siteId);
      const plainDesc = [
        task.description || "",
        `Prestataire : ${name}`,
        `Statut : ${statut}`,
        `Estimé : ${hours}h`,
      ].filter(Boolean).join("\\n");
      const html = buildHtmlDesc({ description: task.description, statut, hours, photoUrl, appUrl });
      lines.push(
        "BEGIN:VEVENT",
        `UID:extTask-${task.id}@famitask`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${dateCompact}`,
        `DTEND;VALUE=DATE:${nextDay(task.date)}`,
        `SUMMARY:🏢 ${escIcal(name)} – ${escIcal(task.title)}`,
        `DESCRIPTION:${escIcal(plainDesc)}`,
        `X-ALT-DESC;FMTTYPE=text/html:${html}`,
        `URL:${appUrl}`,
        ...(location ? [`LOCATION:${escIcal(location)}`] : []),
        ...(photoUrl ? [`ATTACH;FMTTYPE=image/jpeg:${photoUrl}`] : []),
        `STATUS:${icalStatus(task.status)}`,
        "END:VEVENT"
      );
    }

    for (const ticket of (st.tickets || [])) {
      if (!ticket.assignedToExternal) continue;
      const dateRaw = ticket.plannedDate || ticket.desiredDate || "";
      if (!dateRaw) continue;
      const name = prestName(ticket.assignedToExternal);
      const dateCompact = dateRaw.replace(/-/g, "");
      const statut  = STATUS_LABELS_ICAL[ticket.status] || ticket.status;
      const hours   = ticket.estimatedHours || 1;
      const photoUrl = ticket.photoDataUrl ? `${baseUrl}/api/photo/${encodeURIComponent(ticket.id)}` : null;
      const location = siteName(ticket.siteId);
      const plainDesc = [
        ticket.description || "",
        `Prestataire : ${name}`,
        `Statut : ${statut}`,
        `Estimé : ${hours}h`,
      ].filter(Boolean).join("\\n");
      const html = buildHtmlDesc({ description: ticket.description, statut, hours, photoUrl, appUrl });
      lines.push(
        "BEGIN:VEVENT",
        `UID:extTicket-${ticket.id}@famitask`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${dateCompact}`,
        `DTEND;VALUE=DATE:${nextDay(dateRaw)}`,
        `SUMMARY:🔧 ${escIcal(name)} – ${escIcal(ticket.title)}`,
        `DESCRIPTION:${escIcal(plainDesc)}`,
        `X-ALT-DESC;FMTTYPE=text/html:${html}`,
        `URL:${appUrl}`,
        ...(location ? [`LOCATION:${escIcal(location)}`] : []),
        ...(photoUrl ? [`ATTACH;FMTTYPE=image/jpeg:${photoUrl}`] : []),
        `STATUS:${icalStatus(ticket.status)}`,
        "END:VEVENT"
      );
    }

    lines.push("END:VCALENDAR");
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="famitask-prestataires.ics"');
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.send(lines.map(foldLine).join("\r\n"));
  } catch (err) {
    console.error("iCal prestataires error:", err.message);
    res.status(500).send("Error");
  }
});

// ── Authentification serveur ────────────────────────────────────────────────

/** POST /api/login  body: { login, password, role? }  →  { userId, role, token } */
app.post("/api/login", async (req, res) => {
  const { role: roleInput, login: loginInput, password: passwordInput } = req.body || {};
  const VALID_ROLES = ["employee", "manager", "collaborator"];
  try {
    const { rows } = await pool.query("SELECT value FROM kv_store WHERE key = 'flowdesk-state'");
    const state = rows[0]?.value || {};
    // Si un rôle est précisé, chercher uniquement dans ce rôle ; sinon chercher partout
    const pool_users = roleInput && VALID_ROLES.includes(roleInput)
      ? (state.users || []).filter((u) => u.role === roleInput)
      : (state.users || []);
    const needle = String(loginInput || "").trim().toLowerCase();
    const user = pool_users.find((u) => {
      const id = String(u.login || u.name || "").trim().toLowerCase();
      return id === needle;
    });
    if (!user) {
      console.log(`[login] identifiant introuvable: "${loginInput}" (${pool_users.length} users cherchés)`);
      return res.status(401).json({ error: "invalid_credentials" });
    }
    // Utilisateur sans mot de passe → accès libre (mode migration)
    if (!user.password) {
      const token = makeToken(user.id, user.role);
      console.log(`[login] accès migration: ${user.name || user.login} (${user.role})`);
      return res.json({ userId: user.id, role: user.role, token });
    }
    const passStr = String(passwordInput || "");
    const isHashed = user.password.startsWith("$2b$") || user.password.startsWith("$2a$");
    let valid = false;
    if (isHashed) {
      valid = await bcrypt.compare(passStr, user.password);
    } else {
      valid = user.password === passStr;
      if (valid) {
        // Migration progressive : on hache le mot de passe en clair au premier login
        const hashed = await bcrypt.hash(passStr, 12);
        const updatedState = {
          ...state,
          users: state.users.map((u2) =>
            u2.id === user.id ? { ...u2, password: hashed } : u2
          ),
        };
        pool.query(
          `INSERT INTO kv_store (key, value, updated_at) VALUES ($1, $2::jsonb, NOW())
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
          ["flowdesk-state", JSON.stringify(updatedState)]
        ).catch((err) => console.error("Password migration error:", err.message));
      }
    }
    if (!valid) {
      console.log(`[login] mot de passe incorrect pour: ${user.name || user.login} (${user.role})`);
      return res.status(401).json({ error: "invalid_credentials" });
    }
    res.json({ userId: user.id, role: user.role, token: makeToken(user.id, user.role) });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ error: "server_error" });
  }
});

// ── Diagnostic (temporaire — à supprimer après debug) ──────────────────────

/** GET /api/debug/users  →  liste des utilisateurs sans mots de passe */
app.get("/api/debug/users", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT value FROM kv_store WHERE key = 'flowdesk-state'");
    const state = rows[0]?.value || {};
    const users = (state.users || []).map((u) => ({
      id:          u.id,
      name:        u.name,
      login:       u.login,
      role:        u.role,
      hasPassword: !!(u.password),
    }));
    res.json({ count: users.length, users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Push notifications ───────────────────────────────────────────────────────
app.get("/api/push/vapid-public-key", (_, res) => {
  if (!webpush || !VAPID_PUBLIC) return res.status(503).json({ error: "push_not_configured" });
  res.json({ publicKey: VAPID_PUBLIC });
});

app.post("/api/push/subscribe", async (req, res) => {
  if (!webpush) return res.status(503).json({ error: "push_not_configured" });
  const { subscription, userId, role } = req.body || {};
  if (!subscription?.endpoint || !userId) return res.status(400).json({ error: "invalid_payload" });
  try {
    await pool.query(
      `INSERT INTO push_subscriptions (user_id, role, endpoint, subscription)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, endpoint) DO UPDATE SET subscription = $4, role = $2`,
      [userId, role || "", subscription.endpoint, JSON.stringify(subscription)]
    );
    res.sendStatus(201);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/push/unsubscribe", async (req, res) => {
  const { userId, endpoint } = req.body || {};
  if (userId && endpoint) {
    try {
      await pool.query(
        "DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2",
        [userId, endpoint]
      );
    } catch { /* ignore */ }
  }
  res.sendStatus(204);
});

app.post("/api/push/notify", async (req, res) => {
  if (!webpush) return res.status(503).json({ error: "push_not_configured" });
  const { targetUserIds, title, body, url, tag } = req.body || {};
  if (!Array.isArray(targetUserIds) || targetUserIds.length === 0) {
    return res.status(400).json({ error: "targetUserIds requis" });
  }
  try {
    const placeholders = targetUserIds.map((_, i) => `$${i + 1}`).join(",");
    const { rows } = await pool.query(
      `SELECT user_id, endpoint, subscription FROM push_subscriptions WHERE user_id IN (${placeholders})`,
      targetUserIds
    );
    const payload = JSON.stringify({ title, body, url: url || "/", tag: tag || "famitask" });
    const results = await Promise.allSettled(
      rows.map((row) => webpush.sendNotification(row.subscription, payload))
    );
    // Supprimer les abonnements expirés (410 Gone)
    const expiredEndpoints = results
      .map((r, i) => ({ r, row: rows[i] }))
      .filter(({ r }) => r.status === "rejected" && r.reason?.statusCode === 410)
      .map(({ row }) => row.endpoint);
    if (expiredEndpoints.length > 0) {
      const ep = expiredEndpoints.map((_, i) => `$${i + 1}`).join(",");
      await pool.query(`DELETE FROM push_subscriptions WHERE endpoint IN (${ep})`, expiredEndpoints);
    }
    res.json({ sent: results.filter((r) => r.status === "fulfilled").length, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── SPA fallback ────────────────────────────────────────────────────────────
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ── Start : listen immediately so Railway health-check passes ───────────────
app.listen(PORT, () => {
  console.log(`FamiTask server running on port ${PORT}`);
  initSchema().catch((err) => console.error("Schema init error:", err.message));
});
