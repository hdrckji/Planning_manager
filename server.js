const path    = require("path");
const express = require("express");
const cors    = require("cors");
const { pool, initSchema } = require("./db");

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: "4mb" }));

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

// ── SPA fallback : renvoie index.html pour les routes inconnues ─────────────
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ── Start ───────────────────────────────────────────────────────────────────
initSchema()
  .then(() => {
    app.listen(PORT, () => console.log(`Flow Desk server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("DB init failed:", err.message);
    process.exit(1);
  });
