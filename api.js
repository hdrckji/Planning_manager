/**
 * api.js — Couche de données partagée (remplace localStorage).
 * Toutes les données sont stockées dans PostgreSQL via /api/kv/:key.
 * Un cache mémoire évite les allers-retours réseau pour chaque render.
 */
(function () {
  "use strict";

  const BASE = (window.FLOW_DESK_API_BASE ?? "").replace(/\/$/, "");

  // ── Cache mémoire ────────────────────────────────────────────────────────
  let _cachedState       = null;
  let _cachedPrestataires = null;
  let _cachedSpecialties  = null;
  let _cachedTree         = null;

  // ── Primitives HTTP ──────────────────────────────────────────────────────
  async function kvGet(key) {
    try {
      const res = await fetch(`${BASE}/api/kv/${encodeURIComponent(key)}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.value ?? null;
    } catch {
      return null;
    }
  }

  function kvSet(key, value) {
    fetch(`${BASE}/api/kv/${encodeURIComponent(key)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    }).catch((err) => console.error("FlowDeskApi kvSet error:", err));
  }

  // ── Chargement initial (Promise partagée) ────────────────────────────────
  let _loadAllPromise = null;

  function loadAll() {
    if (_loadAllPromise) return _loadAllPromise;
    _loadAllPromise = Promise.all([
      kvGet("flowdesk-state"),
      kvGet("flowdesk-prestataires"),
      kvGet("flowdesk-specialties"),
      kvGet("flowdesk-tree"),
    ]).then(([state, prest, spec, tree]) => {
      _cachedState        = state;
      _cachedPrestataires = Array.isArray(prest) ? prest : [];
      _cachedSpecialties  = Array.isArray(spec)  ? spec  : [];
      _cachedTree         = tree;
      return { state, prestataires: _cachedPrestataires, specialties: _cachedSpecialties, tree: _cachedTree };
    }).catch(() => {
      _cachedState        = null;
      _cachedPrestataires = [];
      _cachedSpecialties  = [];
      _cachedTree         = null;
      return {};
    });
    return _loadAllPromise;
  }

  // Lancement immédiat pour que le cache soit prêt le plus tôt possible
  loadAll();

  // ── API publique ─────────────────────────────────────────────────────────
  window.FlowDeskApi = {
    /** Attend que le chargement initial soit terminé */
    ready: () => loadAll(),

    // ── State principal (users + tickets) ─────────────────────────────────
    getCachedState:  ()  => _cachedState,
    saveState:       (v) => { _cachedState = v; kvSet("flowdesk-state", v); },

    // ── Prestataires ───────────────────────────────────────────────────────
    getPrestataires:  ()  => _cachedPrestataires ?? [],
    savePrestataires: (v) => { _cachedPrestataires = v; kvSet("flowdesk-prestataires", v); },

    // ── Spécialités personnalisées ─────────────────────────────────────────
    getSpecialties:  ()  => _cachedSpecialties ?? [],
    saveSpecialties: (v) => { _cachedSpecialties = v; kvSet("flowdesk-specialties", v); },

    // ── Arbre de catégories ────────────────────────────────────────────────
    getTree:  ()  => _cachedTree,
    saveTree: (v) => { _cachedTree = v; kvSet("flowdesk-tree", v); },
  };
})();
