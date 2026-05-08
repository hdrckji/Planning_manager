/**
 * api.js — Couche de données partagée (remplace localStorage).
 * Toutes les données sont stockées dans PostgreSQL via /api/kv/:key.
 * Un cache mémoire évite les allers-retours réseau pour chaque render.
 */
(function () {
  "use strict";

  const BASE = (window.FLOW_DESK_API_BASE ?? "").replace(/\/$/, "");
  const isFileProtocol = window.location.protocol === "file:";
  const STORAGE_KEYS = {
    state: "famiflora-flow-desk-v4",
    prestataires: "famiflora-prestataires-v1",
    specialties: "famiflora-specialties-v1",
    tree: "famiflora-tree-config-v1",
  };

  // ── Cache mémoire ────────────────────────────────────────────────────────
  let _cachedState       = null;
  let _cachedPrestataires = null;
  let _cachedSpecialties  = null;
  let _cachedTree         = null;

  function readLocalJson(key, fallbackValue) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallbackValue;
    } catch {
      return fallbackValue;
    }
  }

  function writeLocalJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }

  function loadLocalSnapshot() {
    return {
      state: readLocalJson(STORAGE_KEYS.state, null),
      prestataires: readLocalJson(STORAGE_KEYS.prestataires, []),
      specialties: readLocalJson(STORAGE_KEYS.specialties, []),
      tree: readLocalJson(STORAGE_KEYS.tree, null),
    };
  }

  function applySnapshot(snapshot) {
    _cachedState = snapshot.state ?? null;
    _cachedPrestataires = Array.isArray(snapshot.prestataires) ? snapshot.prestataires : [];
    _cachedSpecialties = Array.isArray(snapshot.specialties) ? snapshot.specialties : [];
    _cachedTree = snapshot.tree ?? null;
  }

  // ── Primitives HTTP ──────────────────────────────────────────────────────
  async function kvGet(key) {
    if (isFileProtocol) {
      return null;
    }
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
    if (isFileProtocol) {
      return;
    }
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
    if (isFileProtocol) {
      _loadAllPromise = Promise.resolve(loadLocalSnapshot()).then((snapshot) => {
        applySnapshot(snapshot);
        return snapshot;
      });
      return _loadAllPromise;
    }
    _loadAllPromise = Promise.all([
      kvGet("flowdesk-state"),
      kvGet("flowdesk-prestataires"),
      kvGet("flowdesk-specialties"),
      kvGet("flowdesk-tree"),
    ]).then(([state, prest, spec, tree]) => {
      const snapshot = {
        state,
        prestataires: Array.isArray(prest) ? prest : [],
        specialties: Array.isArray(spec) ? spec : [],
        tree,
      };
      const hasRemoteData = snapshot.state !== null || snapshot.prestataires.length > 0 || snapshot.specialties.length > 0 || snapshot.tree !== null;
      const finalSnapshot = hasRemoteData ? snapshot : loadLocalSnapshot();
      applySnapshot(finalSnapshot);
      return finalSnapshot;
    }).catch(() => {
      const snapshot = loadLocalSnapshot();
      applySnapshot(snapshot);
      return snapshot;
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
    saveState:       (v) => {
      _cachedState = v;
      writeLocalJson(STORAGE_KEYS.state, v);
      kvSet("flowdesk-state", v);
    },

    // ── Prestataires ───────────────────────────────────────────────────────
    getPrestataires:  ()  => _cachedPrestataires ?? [],
    savePrestataires: (v) => {
      _cachedPrestataires = v;
      writeLocalJson(STORAGE_KEYS.prestataires, v);
      kvSet("flowdesk-prestataires", v);
    },

    // ── Spécialités personnalisées ─────────────────────────────────────────
    getSpecialties:  ()  => _cachedSpecialties ?? [],
    saveSpecialties: (v) => {
      _cachedSpecialties = v;
      writeLocalJson(STORAGE_KEYS.specialties, v);
      kvSet("flowdesk-specialties", v);
    },

    // ── Arbre de catégories ────────────────────────────────────────────────
    getTree:  ()  => _cachedTree,
    saveTree: (v) => {
      _cachedTree = v;
      writeLocalJson(STORAGE_KEYS.tree, v);
      kvSet("flowdesk-tree", v);
    },
  };
})();
