const path    = require("path");
const express = require("express");
const cors    = require("cors");
const webpush = require("web-push");
const { pool, initSchema } = require("./db");

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: "4mb" }));

// ── Static files (HTML / CSS / JS) ─────────────────────────────────────────
app.use(express.static(path.join(__dirname)));

// ── VAPID — auto-generated on first start, stored in DB ────────────────────
let vapidReady = false;

async function initVapid() {
  try {
    const { rows } = await pool.query(
      "SELECT value FROM kv_store WHERE key = 'vapid-keys'"
    );
    let keys;
    if (rows.length > 0 && rows[0].value?.publicKey) {
      keys = rows[0].value;
    } else {
      keys = webpush.generateVAPIDKeys();
      await pool.query(
        `INSERT INTO kv_store (key, value, updated_at)
         VALUES ('vapid-keys', $1::jsonb, NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [JSON.stringify(keys)]
      );
      console.log("VAPID keys generated and stored.");
    }
    webpush.setVapidDetails("mailto:admin@famiflora.be", keys.publicKey, keys.privateKey);
    app.locals.vapidPublicKey = keys.publicKey;
    vapidReady = true;
  } catch (err) {
    console.error("VAPID init failed:", err.message);
  }
}

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
    // Detect new tickets → push notification to managers
    if (req.params.key === "flowdesk-state" && vapidReady) {
      const { rows: oldRows } = await pool.query(
        "SELECT value FROM kv_store WHERE key = 'flowdesk-state'"
      );
      const oldTickets = oldRows[0]?.value?.tickets || [];
      const newTickets = value?.tickets || [];
      const oldIds = new Set(oldTickets.map(t => t.id));
      const added = newTickets.filter(t => !oldIds.has(t.id));

      if (added.length > 0) {
        const { rows: subRows } = await pool.query(
          "SELECT value FROM kv_store WHERE key = 'push-subscriptions'"
        );
        const allSubs = subRows[0]?.value || {};
        const managerSubs = Object.values(allSubs).filter(s => s.role === "manager");

        for (const ticket of added) {
          const payload = JSON.stringify({
            title: "Nouvelle demande — FamiTask",
            body: ticket.title || "Nouvelle demande reçue",
            url: "/manager.html",
            tag: `ticket-${ticket.id}`,
          });
          for (const entry of managerSubs) {
            try {
              await webpush.sendNotification(entry.subscription, payload);
            } catch (err) {
              if (err.statusCode === 410) {
                // Subscription expired — clean it up
                delete allSubs[entry.userId];
                await pool.query(
                  `INSERT INTO kv_store (key, value, updated_at)
                   VALUES ('push-subscriptions', $1::jsonb, NOW())
                   ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
                  [JSON.stringify(allSubs)]
                );
              }
            }
          }
        }
      }
    }

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

// ── Push notifications ──────────────────────────────────────────────────────

/** GET /api/push/vapid-public-key */
app.get("/api/push/vapid-public-key", (req, res) => {
  if (!vapidReady) return res.status(503).json({ error: "vapid_not_ready" });
  res.json({ publicKey: app.locals.vapidPublicKey });
});

/** POST /api/push/subscribe  body: { subscription, userId, role } */
app.post("/api/push/subscribe", async (req, res) => {
  const { subscription, userId, role } = req.body;
  if (!subscription || !userId) return res.status(400).json({ error: "missing_fields" });
  try {
    const { rows } = await pool.query(
      "SELECT value FROM kv_store WHERE key = 'push-subscriptions'"
    );
    const subs = rows[0]?.value || {};
    subs[userId] = { subscription, userId, role: role || "manager" };
    await pool.query(
      `INSERT INTO kv_store (key, value, updated_at)
       VALUES ('push-subscriptions', $1::jsonb, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [JSON.stringify(subs)]
    );
    res.sendStatus(201);
  } catch (err) {
    console.error("subscribe error:", err.message);
    res.status(500).json({ error: "db_error" });
  }
});

/** POST /api/push/unsubscribe  body: { userId } */
app.post("/api/push/unsubscribe", async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "missing_userId" });
  try {
    const { rows } = await pool.query(
      "SELECT value FROM kv_store WHERE key = 'push-subscriptions'"
    );
    const subs = rows[0]?.value || {};
    delete subs[userId];
    await pool.query(
      `INSERT INTO kv_store (key, value, updated_at)
       VALUES ('push-subscriptions', $1::jsonb, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [JSON.stringify(subs)]
    );
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: "db_error" });
  }
});

// ── iCal feed (planning → Google Calendar / Outlook widget) ────────────────

function escIcal(str) {
  return (str || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function toIcalDate(dateStr) {
  return dateStr.replace(/-/g, "");
}

/** GET /api/ical/:collaboratorId  →  text/calendar */
app.get("/api/ical/:collaboratorId", async (req, res) => {
  try {
    const collabId = req.params.collaboratorId;
    const { rows } = await pool.query(
      "SELECT value FROM kv_store WHERE key = 'flowdesk-state'"
    );
    const state = rows[0]?.value || {};
    const tasks = (state.planningTasks || []).filter(
      t => t.collaboratorId === collabId
    );
    const tickets = (state.tickets || []).filter(
      t => t.assignedTo === collabId && (t.plannedDate || t.desiredDate)
    );
    const collaborator = (state.users || []).find(u => u.id === collabId);
    const calName = collaborator ? `FamiTask – ${collaborator.name}` : "FamiTask Planning";

    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//FamiTask//Famiflora//FR",
      `X-WR-CALNAME:${escIcal(calName)}`,
      "X-WR-TIMEZONE:Europe/Brussels",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
    ];

    for (const task of tasks) {
      const dateStr = toIcalDate(task.date);
      const uid = `task-${task.id}@famitask.famiflora`;
      lines.push(
        "BEGIN:VEVENT",
        `UID:${uid}`,
        `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
        `DTSTART;VALUE=DATE:${dateStr}`,
        `DTEND;VALUE=DATE:${dateStr}`,
        `SUMMARY:${escIcal(task.title)}`,
        task.description ? `DESCRIPTION:${escIcal(task.description)}` : "",
        `STATUS:${task.status === "termine" ? "COMPLETED" : "CONFIRMED"}`,
        "END:VEVENT"
      );
    }

    for (const ticket of tickets) {
      const dateStr = toIcalDate(ticket.plannedDate || ticket.desiredDate);
      const uid = `ticket-${ticket.id}@famitask.famiflora`;
      lines.push(
        "BEGIN:VEVENT",
        `UID:${uid}`,
        `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
        `DTSTART;VALUE=DATE:${dateStr}`,
        `DTEND;VALUE=DATE:${dateStr}`,
        `SUMMARY:🎫 ${escIcal(ticket.title)}`,
        ticket.description ? `DESCRIPTION:${escIcal(ticket.description)}` : "",
        `STATUS:${ticket.status === "termine" ? "COMPLETED" : "CONFIRMED"}`,
        "END:VEVENT"
      );
    }

    lines.push("END:VCALENDAR");

    const ical = lines.filter(Boolean).join("\r\n");
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="famitask-${collabId}.ics"`);
    res.send(ical);
  } catch (err) {
    console.error("iCal error:", err.message);
    res.status(500).send("Error generating calendar");
  }
});

// ── SPA fallback ────────────────────────────────────────────────────────────
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ── Start ───────────────────────────────────────────────────────────────────
initSchema()
  .then(initVapid)
  .then(() => {
    app.listen(PORT, () => console.log(`FamiTask server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("Server init failed:", err.message);
    process.exit(1);
  });
