// Clés conservées pour la compatibilité (migration localStorage → API)
const STORAGE_KEY          = "famiflora-flow-desk-v4";
const PREST_KEY            = "famiflora-prestataires-v1";
const SPECIALTY_CATALOG_KEY = "famiflora-specialties-v1";
const TREE_CONFIG_KEY      = "famiflora-tree-config-v1";

function loadPrestataires() {
  return window.FlowDeskApi?.getPrestataires() ?? [];
}
function savePrestataires(list) {
  window.FlowDeskApi?.savePrestataires(list);
}
function nextPrestId() {
  const list = loadPrestataires();
  const last = list.map((p) => Number(p.id.replace("p-", ""))).filter((n) => !isNaN(n)).sort((a, b) => b - a)[0] || 0;
  return `p-${last + 1}`;
}
function findPrestataire(id) {
  return loadPrestataires().find((p) => p.id === id) || null;
}

// ── Sites (lieux de prestation) ──────────────────────────────────────────
function loadSites() {
  return window.FlowDeskApi?.getSites() ?? [];
}
function saveSites(list) {
  window.FlowDeskApi?.saveSites(list);
}
function nextSiteId() {
  const list = loadSites();
  const last = list
    .map((s) => Number(String(s.id || "").replace("s-", "")))
    .filter((n) => !Number.isNaN(n))
    .sort((a, b) => b - a)[0] || 0;
  return `s-${last + 1}`;
}
function findSite(id) {
  return loadSites().find((s) => s.id === id) || null;
}
function findZone(siteId, zoneId) {
  if (!siteId || !zoneId) return null;
  return findSite(siteId)?.zones?.find((z) => z.id === zoneId) || null;
}

// ── Responsable de garde ─────────────────────────────────────────────
function loadOnCall() {
  return window.FlowDeskApi?.getOnCall() ?? null;
}
function saveOnCall(payload) {
  window.FlowDeskApi?.saveOnCall(payload);
}
function teamsCallUrl(email) {
  return `https://teams.microsoft.com/l/call/0/0?users=${encodeURIComponent(email)}`;
}

const DEFAULT_TREE = [
  {
    label: "Technique",
    value: "technique",
    team: "technique",
    suggestedSpecialty: "general",
    estimatedHours: 2,
    children: [
      { label: "Electricite", value: "electricite", team: "technique", suggestedSpecialty: "electricite", estimatedHours: 2, children: [
        { label: "Eclairage defaillant", value: "eclairage_defaillant", team: "technique", suggestedSpecialty: "electricite", estimatedHours: 1.5 },
        { label: "Prise ou disjoncteur", value: "prise_disjoncteur", team: "technique", suggestedSpecialty: "electricite", estimatedHours: 2 },
      ]},
      { label: "Plomberie", value: "plomberie", team: "technique", suggestedSpecialty: "plomberie", estimatedHours: 2.5, children: [
        { label: "Fuite", value: "fuite", team: "technique", suggestedSpecialty: "plomberie", estimatedHours: 2 },
        { label: "Bouchon / evacuation", value: "bouchon", team: "technique", suggestedSpecialty: "plomberie", estimatedHours: 2.5 },
      ]},
      { label: "Materiel / equipement", value: "materiel", team: "technique", suggestedSpecialty: "equipement", estimatedHours: 2, children: [
        { label: "Panne machine", value: "panne_machine", team: "technique", suggestedSpecialty: "equipement", estimatedHours: 3 },
        { label: "Remplacement piece", value: "remplacement_piece", team: "technique", suggestedSpecialty: "equipement", estimatedHours: 1.5 },
      ]},
    ],
  },
  {
    label: "Decoration",
    value: "decoration",
    team: "decoration",
    suggestedSpecialty: "mise_en_scene",
    estimatedHours: 2.5,
    children: [
      { label: "Mise en scene", value: "mise_en_scene", team: "decoration", suggestedSpecialty: "mise_en_scene", estimatedHours: 3, children: [
        { label: "Nouvelle vitrine", value: "vitrine", team: "decoration", suggestedSpecialty: "mise_en_scene", estimatedHours: 4 },
        { label: "Reamenagement rayon", value: "rayon", team: "decoration", suggestedSpecialty: "mise_en_scene", estimatedHours: 3 },
      ]},
      { label: "Signalisation", value: "signalisation", team: "decoration", suggestedSpecialty: "signalisation", estimatedHours: 1.5, children: [
        { label: "Affiche / panneau", value: "affiche", team: "decoration", suggestedSpecialty: "signalisation", estimatedHours: 1 },
        { label: "Etiquetage", value: "etiquetage", team: "decoration", suggestedSpecialty: "signalisation", estimatedHours: 1 },
      ]},
    ],
  },
];

const STATUS_KEYS  = ["nouveau", "en_attente", "planifie", "en_cours", "termine"];
const PRIORITY_KEYS = ["basse", "moyenne", "haute"];
const BUILTIN_TARGET_TEAMS = ["technique", "decoration"];
const TEAM_KEYS     = ["magasin", ...BUILTIN_TARGET_TEAMS];
const INTERVENTION_DELAY_KEYS = ["asap", "h48", "week", "month"];

function loadCustomTeams() {
  try {
    const raw = window.FlowDeskApi?.getTeams() ?? [];
    return Array.isArray(raw) ? raw.filter((t) => t.key && t.label) : [];
  } catch { return []; }
}

function saveCustomTeams(teams) {
  window.FlowDeskApi?.saveTeams(teams);
}

function getAllTargetTeamKeys() {
  return [...BUILTIN_TARGET_TEAMS, ...loadCustomTeams().map((t) => t.key)];
}

function getAllTeamKeys() {
  return ["magasin", ...getAllTargetTeamKeys()];
}

function teamKeyToLabel(key) {
  if (key === "magasin") return t("team.magasin");
  if (key === "technique") return t("team.technique");
  if (key === "decoration") return t("team.decoration");
  const custom = loadCustomTeams().find((ct) => ct.key === key);
  return custom ? custom.label : key;
}
const DEFAULT_SPECIALTIES = [
  { key: "general", i18nKey: "skill.general", teams: ["technique", "decoration"] },
  { key: "electricite", i18nKey: "skill.electricite", teams: ["technique"] },
  { key: "plomberie", i18nKey: "skill.plomberie", teams: ["technique"] },
  { key: "equipement", i18nKey: "skill.equipement", teams: ["technique"] },
  { key: "mise_en_scene", i18nKey: "skill.mise_en_scene", teams: ["decoration"] },
  { key: "signalisation", i18nKey: "skill.signalisation", teams: ["decoration"] },
];

function loadCustomSpecialties() {
  try {
    const raw = window.FlowDeskApi?.getSpecialties() ?? [];
    if (!Array.isArray(raw)) return [];
    return raw
      .map((item) => ({
        key: String(item.key || "").trim(),
        label: String(item.label || "").trim(),
        teams: Array.isArray(item.teams) ? item.teams.filter((team) => ["technique", "decoration"].includes(team)) : ["technique"],
      }))
      .filter((item) => item.key && item.label);
  } catch {
    return [];
  }
}

function saveCustomSpecialties(list) {
  window.FlowDeskApi?.saveSpecialties(list);
}

function loadDeletedDefaultKeys() {
  try { return JSON.parse(localStorage.getItem("flowdesk-deleted-defaults") || "[]"); } catch { return []; }
}

function saveDeletedDefaultKeys(keys) {
  localStorage.setItem("flowdesk-deleted-defaults", JSON.stringify(keys));
}

function getSpecialtyDefinitions() {
  const custom = loadCustomSpecialties();
  const deletedKeys = new Set(loadDeletedDefaultKeys());
  const used = new Set(DEFAULT_SPECIALTIES.map((item) => item.key));
  const merged = DEFAULT_SPECIALTIES.filter((item) => !deletedKeys.has(item.key));
  custom.forEach((item) => {
    if (!used.has(item.key)) {
      merged.push(item);
      used.add(item.key);
    }
  });
  return merged;
}

function getSpecialtyKeys() {
  return getSpecialtyDefinitions().map((item) => item.key);
}

function getSpecialtyDefinition(key) {
  return getSpecialtyDefinitions().find((item) => item.key === key) || null;
}

function STATUS_LABELS() { return { nouveau: t("status.nouveau"), en_attente: t("status.en_attente"), planifie: t("status.planifie"), en_cours: t("status.en_cours"), termine: t("status.termine") }; }
function PRIORITY_LABELS() { return { basse: t("priority.basse"), moyenne: t("priority.moyenne"), haute: t("priority.haute") }; }
function TEAM_LABELS_MAP() {
  const map = { magasin: t("team.magasin"), technique: t("team.technique"), decoration: t("team.decoration") };
  loadCustomTeams().forEach((ct) => { map[ct.key] = ct.label; });
  return map;
}

const PAGE_CONFIG = {
  employee: {
    title: "page.employee.title",
    subtitle: "page.employee.subtitle",
    role: "employee",
  },
  manager: {
    title: "page.manager.title",
    subtitle: "page.manager.subtitle",
    role: "manager",
  },
  collaborator: {
    title: "page.collab.title",
    subtitle: "page.collab.subtitle",
    role: "collaborator",
  },
};

const state = {
  users: [],
  tickets: [],
  planningTasks: [],
  currentUserByRole: {
    employee: "",
    manager: "",
    collaborator: "",
  },
  currentUserId: "",
};

let managerSubPage = "dashboard";
let planningWeekOffset = 0;
let agendaWeekOffset = 0;
let agendaMonthOffset = 0;
let agendaViewMode = "week";
let _stateLoaded = false;
let planningFilterCollab = "";
let planningFilterPrestataire = "";
let planningViewMode = "week";
let planningMonthOffset = 0;
let employeeExpandedTicketId = "";
let managerExpandedTicketId = "";
let collaboratorWeekOffset = 0;
let collaboratorMonthOffset = 0;
let collaboratorViewMode = "week";

function escHtml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function normalizeTeamKey(team) {
  if (getAllTeamKeys().includes(team)) return team;
  return "technique";
}

function normalizeHours(value, fallback = 2) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    return fallback;
  }
  return Math.round(num * 2) / 2;
}

function normalizeInterventionDelay(value) {
  const key = String(value || "").trim();
  return INTERVENTION_DELAY_KEYS.includes(key) ? key : "asap";
}

function defaultHoursForSpecialty() {
  // La durée dépend de la tâche/catégorie, pas de la compétence.
  return 2;
}

function inferSpecialtyFromValue(value) {
  const source = String(value || "").toLowerCase();
  if (source.includes("electric")) return "electricite";
  if (source.includes("plomb") || source.includes("fuite") || source.includes("bouchon")) return "plomberie";
  if (source.includes("materiel") || source.includes("machine") || source.includes("piece") || source.includes("equip")) return "equipement";
  if (source.includes("signal") || source.includes("affiche") || source.includes("etiquet")) return "signalisation";
  if (source.includes("decor") || source.includes("scene") || source.includes("vitrine") || source.includes("rayon")) return "mise_en_scene";
  return "general";
}

function specialtyOptionsForTeam(team) {
  const isCustom = !BUILTIN_TARGET_TEAMS.includes(team) && team !== "magasin";
  const allowedTeams = isCustom ? [] : (team === "decoration" ? ["decoration"] : ["technique"]);
  const options = getSpecialtyDefinitions()
    .filter((item) => item.key === "general" || (!isCustom && item.teams.some((itemTeam) => allowedTeams.includes(itemTeam))))
    .map((item) => item.key);
  return options.length > 0 ? options : ["general"];
}

function normalizeSpecialties(specialties, team) {
  const allowed = specialtyOptionsForTeam(team);
  const input = Array.isArray(specialties)
    ? specialties
    : String(specialties || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  const normalized = [...new Set(input.filter((item) => allowed.includes(item)))];
  return normalized.length > 0 ? normalized : ["general"];
}

function specialtyLabel(specialty) {
  const definition = getSpecialtyDefinition(specialty);
  if (!definition) {
    return t("skill.general");
  }
  if (definition.i18nKey) {
    return t(definition.i18nKey);
  }
  return definition.label || definition.key;
}

function specialtiesSummary(user) {
  const specialties = normalizeSpecialties(user.specialties, user.team);
  return specialties.map((item) => specialtyLabel(item)).join(" · ");
}

function formatHours(value) {
  const hours = normalizeHours(value, 0);
  return hours % 1 === 0 ? `${hours}h` : `${String(hours).replace(".", ",")}h`;
}

function buildNodeValue(label, fallbackPrefix = "item") {
  const normalized = String(label || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized || `${fallbackPrefix}_${Date.now()}`;
}

function createTreeNode(seed = {}) {
  const team = normalizeTeamKey(seed.team || "technique");
  const specialty = seed.suggestedSpecialty && getSpecialtyKeys().includes(seed.suggestedSpecialty)
    ? seed.suggestedSpecialty
    : specialtyOptionsForTeam(team).find((item) => item !== "general") || "general";
  return {
    label: seed.label || t("tree.new.node"),
    value: seed.value || buildNodeValue(seed.label || t("tree.new.node"), "cat"),
    team,
    suggestedSpecialty: specialty,
    linkedExternalId: typeof seed.linkedExternalId === "string" ? seed.linkedExternalId : "",
    estimatedHours: normalizeHours(seed.estimatedHours, defaultHoursForSpecialty(specialty)),
    children: Array.isArray(seed.children) ? seed.children : [],
  };
}

function normalizeTreeNode(node, inherited = {}) {
  const team = normalizeTeamKey(node.team || inherited.team || (node.value === "decoration" ? "decoration" : "technique"));
  const inferredSpecialty = inferSpecialtyFromValue(node.value || node.label);
  const specialty = getSpecialtyKeys().includes(node.suggestedSpecialty)
    ? node.suggestedSpecialty
    : (inferredSpecialty !== "general" ? inferredSpecialty : (inherited.suggestedSpecialty || "general"));
  const children = Array.isArray(node.children)
    ? node.children.map((child) => normalizeTreeNode(child, { team, suggestedSpecialty: specialty, estimatedHours: node.estimatedHours }))
    : [];

  return {
    label: String(node.label || t("tree.new.node")).trim() || t("tree.new.node"),
    value: String(node.value || buildNodeValue(node.label || t("tree.new.node"), "cat")).trim() || buildNodeValue(node.label || t("tree.new.node"), "cat"),
    team,
    suggestedSpecialty: specialty,
    linkedExternalId: typeof node.linkedExternalId === "string" ? node.linkedExternalId : "",
    estimatedHours: normalizeHours(node.estimatedHours, inherited.estimatedHours || defaultHoursForSpecialty(specialty)),
    children,
  };
}

function normalizeTree(tree) {
  if (!Array.isArray(tree) || tree.length === 0) {
    return DEFAULT_TREE.map((node) => normalizeTreeNode(node));
  }
  return tree.map((node) => normalizeTreeNode(node));
}

function normalizeUser(user) {
  const role = ["employee", "manager", "collaborator"].includes(user.role) ? user.role : "employee";
  const team = role === "employee" ? "magasin" : normalizeTeamKey(user.team);
  return {
    ...user,
    name: String(user.name || "").trim() || t("users.name.ph"),
    role,
    team,
    specialties: role === "collaborator" ? normalizeSpecialties(user.specialties, team) : [],
    login: typeof user.login === "string" ? user.login.trim() : "",
    password: typeof user.password === "string" ? user.password : "",
  };
}

function normalizePlanningTask(task) {
  return {
    id: String(task.id || ""),
    title: String(task.title || ""),
    description: String(task.description || ""),
    collaboratorId: String(task.collaboratorId || ""),
    prestataireId: String(task.prestataireId || ""),
    date: String(task.date || today()),
    estimatedHours: normalizeHours(task.estimatedHours, 1),
    actualHours: task.actualHours != null && task.actualHours !== "" ? normalizeHours(task.actualHours, 0) : null,
    status: ["planifie", "en_cours", "termine"].includes(task.status) ? task.status : "planifie",
    createdAt: String(task.createdAt || new Date().toISOString()),
    photoDataUrl: typeof task.photoDataUrl === "string" ? task.photoDataUrl : "",
  };
}

function normalizeTicket(ticket) {
  const suggestedSpecialty = getSpecialtyKeys().includes(ticket.suggestedSpecialty)
    ? ticket.suggestedSpecialty
    : inferSpecialtyFromValue(ticket.categoryValue || ticket.title);
  const rawCreatedAt = ticket.createdAt;
  const createdAt = rawCreatedAt && !isNaN(new Date(rawCreatedAt).getTime())
    ? rawCreatedAt
    : new Date().toISOString();
  return {
    ...ticket,
    createdAt,
    estimatedHours: normalizeHours(ticket.estimatedHours, defaultHoursForSpecialty(suggestedSpecialty)),
    suggestedSpecialty,
    suggestedAssigneeId: typeof ticket.suggestedAssigneeId === "string" ? ticket.suggestedAssigneeId : "",
    assignedToExternal: typeof ticket.assignedToExternal === "string" ? ticket.assignedToExternal : "",
    suggestedExternalId: typeof ticket.suggestedExternalId === "string" ? ticket.suggestedExternalId : "",
    interventionDelay: normalizeInterventionDelay(ticket.interventionDelay),
    employeeReply: typeof ticket.employeeReply === "string" ? ticket.employeeReply : "",
    employeeReplyAt: typeof ticket.employeeReplyAt === "string" ? ticket.employeeReplyAt : "",
    infoThread: normalizeInfoThread(ticket.infoThread),
    categoryValue: String(ticket.categoryValue || ""),
    categoryPath: Array.isArray(ticket.categoryPath) ? ticket.categoryPath : [],
    photos: Array.isArray(ticket.photos) ? ticket.photos : (ticket.photoDataUrl ? [ticket.photoDataUrl] : []),
  };
}

const page = document.body.dataset.page || "employee";
const pageConfig = PAGE_CONFIG[page] || PAGE_CONFIG.employee;

const refs = {
  currentUser: document.querySelector("#currentUser"),
  currentRoleBadge: document.querySelector("#currentRoleBadge"),
  currentTeamBadge: document.querySelector("#currentTeamBadge"),
  statsGrid: document.querySelector("#statsGrid"),
  pageTitle: document.querySelector("#pageTitle"),
  pageSubtitle: document.querySelector("#pageSubtitle"),
  mainView: document.querySelector("#mainView"),
  ticketCardTemplate: document.querySelector("#ticketCardTemplate"),
  navLinks: document.querySelectorAll("[data-nav-page]"),
  profileForm: document.querySelector("#profileForm"),
  profileTeam: document.querySelector("#profileTeam"),
  profileList: document.querySelector("#profileList"),
};

bootstrap().catch(console.error);

async function bootstrap() {
  showLoadingOverlay(true);
  try {
    await window.FlowDeskApi.ready();
  } finally {
    showLoadingOverlay(false);
  }
  if (window.FlowDeskApi?.isReadOnly?.()) {
    toast("Serveur indisponible: mode lecture seule actif.");
  }
  loadState();
  enforcePageUserRole();
  bindGlobalEvents();
  configureProfileTeamField();
  renderUserSelector();
  render();
}

function showLoadingOverlay(visible) {
  let overlay = document.getElementById("flowdesk-loading");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "flowdesk-loading";
    overlay.innerHTML = `<div class="flowdesk-spinner"></div>`;
    document.body.appendChild(overlay);
  }
  overlay.hidden = !visible;
}

function safeMap(arr, fn) {
  if (!Array.isArray(arr)) return [];
  const result = [];
  for (const item of arr) {
    try { result.push(fn(item)); } catch { /* skip corrupt item */ }
  }
  return result;
}

function loadState() {
  const saved = window.FlowDeskApi?.getCachedState();
  if (!saved) return;

  state.users         = safeMap(saved.users,         normalizeUser);
  state.tickets       = safeMap(saved.tickets,       normalizeTicket);
  state.planningTasks = safeMap(saved.planningTasks, normalizePlanningTask);

  try {
    const savedByRole = saved.currentUserByRole || {};
    state.currentUserByRole = {
      employee:     typeof savedByRole.employee     === "string" ? savedByRole.employee     : "",
      manager:      typeof savedByRole.manager      === "string" ? savedByRole.manager      : "",
      collaborator: typeof savedByRole.collaborator === "string" ? savedByRole.collaborator : "",
    };
  } catch {
    /* currentUserByRole stays at default */
  }

  _stateLoaded = true;
}

function enforcePageUserRole() {
  const users = usersForCurrentPage();

  // Si un utilisateur est authentifié via login individuel, on le fixe comme actif
  const authUserId = window.FlowDeskAuth?.getAuthenticatedUserId(pageConfig.role) || "";
  if (authUserId) {
    const authUser = users.find((u) => u.id === authUserId);
    if (authUser) {
      state.currentUserId = authUser.id;
      state.currentUserByRole[pageConfig.role] = authUser.id;
      return;
    }
  }

  const preferredId = state.currentUserByRole[pageConfig.role];
  const preferred = users.find((user) => user.id === preferredId);
  state.currentUserId = preferred ? preferred.id : users[0]?.id || "";

  // Auto-créer un profil générique si aucun n'existe pour ce rôle
  if (!state.currentUserId) {
    const defaults = {
      employee:     { name: "Employé", role: "employee", team: "magasin", specialties: [] },
      manager:      { name: "Responsable Tech", role: "manager", team: "technique", specialties: [] },
      collaborator: { name: "Collaborateur", role: "collaborator", team: "technique", specialties: ["general"] },
    };
    const def = defaults[pageConfig.role];
    if (def) {
      const autoUser = normalizeUser({ id: nextUserId(), ...def });
      state.users.push(autoUser);
      state.currentUserId = autoUser.id;
    }
  }
}

function persistState() {
  if (window.FlowDeskApi?.isReadOnly?.()) {
    return;
  }
  // Ne sauvegarder que si le state a bien été chargé depuis le serveur.
  // Évite d'écraser les données serveur avec un état vide si loadState() n'a pas tourné.
  if (!_stateLoaded) {
    console.warn("persistState: skipped — state not loaded yet");
    return;
  }
  state.currentUserByRole[pageConfig.role] = state.currentUserId || "";
  window.FlowDeskApi?.saveState({
    users: state.users,
    tickets: state.tickets,
    planningTasks: state.planningTasks,
    currentUserByRole: state.currentUserByRole,
  });
}

function bindGlobalEvents() {
  refs.currentUser.addEventListener("change", (event) => {
    state.currentUserId = event.target.value;
    persistState();
    render();
  });

  if (refs.profileForm) {
    refs.profileForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const formData = new FormData(refs.profileForm);
      const name = String(formData.get("profileName") || "").trim();
      const team = normalizeTeam(String(formData.get("profileTeam") || ""));
      if (!name) {
        return;
      }

      const user = {
        id: nextUserId(),
        name,
        role: pageConfig.role,
        team,
        specialties: pageConfig.role === "collaborator" ? ["general"] : [],
      };

      state.users.push(normalizeUser(user));
      state.currentUserId = user.id;
      refs.profileForm.reset();
      if (pageConfig.role === "employee" && refs.profileTeam) {
        refs.profileTeam.value = "magasin";
      }

      persistState();
      renderUserSelector();
      render();
    toast(t("misc.profile.added"));
    });
  }
}

function configureProfileTeamField() {
  if (!refs.profileTeam) {
    return;
  }

  if (pageConfig.role === "employee") {
    refs.profileTeam.value = "magasin";
  }
}

function render() {
  const user = getCurrentUser();

  if (refs.pageTitle) {
    const titleKeys = { employee: "emp.myrequests", manager: "role.manager", collaborator: "collab.planning" };
    refs.pageTitle.textContent = t(titleKeys[page] || "app.name");
  }
  if (refs.pageSubtitle) {
    const subKeys = { employee: "emp.myrequests.sub", manager: "page.manager.hero", collaborator: "collab.planning.sub" };
    refs.pageSubtitle.textContent = t(subKeys[page] || "app.name");
  }

  if (!user) {
    refs.currentRoleBadge.textContent = t("misc.no.profile");
    refs.currentTeamBadge.textContent = "";
  } else {
    refs.currentUser.value = user.id;
    refs.currentRoleBadge.textContent = roleLabel(user.role);
    refs.currentTeamBadge.textContent = teamLabel(user.team);
  }

  renderStats();
  renderActiveNavigation();
  renderProfileList();
  renderCurrentPage();
  persistState();
  if (user) initPushNotifications(user);
}

function renderUserSelector() {
  const users = usersForCurrentPage();

  if (users.length === 0) {
    refs.currentUser.innerHTML = `<option value="">${t("misc.no.profile")}</option>`;
    refs.currentUser.disabled = true;
    state.currentUserId = "";
    return;
  }

  refs.currentUser.disabled = false;
  refs.currentUser.innerHTML = users.map(
    (user) => `<option value="${user.id}">${user.name}</option>`,
  ).join("");

  if (!users.some((user) => user.id === state.currentUserId)) {
    state.currentUserId = users[0].id;
  }
  refs.currentUser.value = state.currentUserId;
}

function usersForCurrentPage() {
  return state.users.filter((user) => user.role === pageConfig.role);
}

function renderProfileList() {
  if (!refs.profileList) {
    return;
  }

  const users = usersForCurrentPage();
  if (users.length === 0) {
    refs.profileList.innerHTML = `<div class="empty-state">${t("misc.no.profile")}</div>`;
    return;
  }

  refs.profileList.innerHTML = users
    .map((user) => `
      <div class="profile-item">
        <div>
          <strong>${user.name}</strong>
          <p class="subtle">${teamLabel(user.team)}</p>
        </div>
        <button class="button ghost" type="button" data-action="delete-profile" data-user-id="${user.id}">${t("users.delete")}</button>
      </div>
    `)
    .join("");

  refs.profileList.querySelectorAll("[data-action='delete-profile']").forEach((button) => {
    button.addEventListener("click", () => {
      removeUser(button.dataset.userId);
    });
  });
}

function removeUser(userId) {
  const user = findUser(userId);
  if (!user) {
    return;
  }

  state.users = state.users.filter((item) => item.id !== userId);

  state.tickets = state.tickets.map((ticket) => {
    const nextTicket = { ...ticket };
    if (nextTicket.assignedTo === userId) {
      nextTicket.assignedTo = "";
    }
    if (nextTicket.managerId === userId) {
      nextTicket.managerId = managerIdForDepartment(nextTicket.department);
    }
    if (nextTicket.createdBy === userId) {
      nextTicket.createdBy = "";
    }
    return nextTicket;
  });

  const pageUsers = usersForCurrentPage();
  if (state.currentUserId === userId) {
    state.currentUserId = pageUsers[0]?.id || "";
  }

  persistState();
  renderUserSelector();
  render();
  toast(t("users.deleted"));
}

function renderStats() {
  if (!refs.statsGrid) return;
  const currentUser = getCurrentUser();

  const sectorRows = ["technique", "decoration"].map((dept) => {
    const deptTickets = state.tickets.filter((tk) => tk.department === dept);
    const planned  = deptTickets.filter((tk) => tk.status === "planifie").length;
    const ongoing  = deptTickets.filter((tk) => tk.status === "en_cours").length;
    const done     = deptTickets.filter((tk) => tk.status === "termine").length;
    const label    = t(`dept.${dept}`);
    return `<tr><td class="sector-name">${label}</td><td>${planned}</td><td>${ongoing}</td><td>${done}</td></tr>`;
  }).join("");

  const sectorTable = `
    <h3 class="sector-table-title">${t("stats.sector.title")}</h3>
    <table class="sector-table">
      <thead><tr><th></th><th>${t("stats.sector.planned")}</th><th>${t("stats.sector.ongoing")}</th><th>${t("stats.sector.done")}</th></tr></thead>
      <tbody>${sectorRows}</tbody>
    </table>`;

  if (!currentUser) {
    refs.statsGrid.innerHTML = `
      <article class="stat-card"><span class="stat-value">0</span><span class="stat-label">${t("stats.total")}</span></article>
      <article class="stat-card"><span class="stat-value">0</span><span class="stat-label">${t("stats.pending")}</span></article>
      ${sectorTable}`;
    return;
  }

  const ticketsForTeam = currentUser.team === "magasin"
    ? state.tickets
    : state.tickets.filter((ticket) => ticket.department === currentUser.team);
  const toComplete = ticketsForTeam.filter((ticket) => {
    if (ticket.status !== "en_attente" || ticket.createdBy !== currentUser.id) return false;
    const thread = ticketInfoThread(ticket);
    return thread.length > 0 && thread[thread.length - 1].authorRole === "manager";
  });

  refs.statsGrid.innerHTML = `
    <article class="stat-card"><span class="stat-value">${ticketsForTeam.length}</span><span class="stat-label">${t("stats.total")}</span></article>
    <article class="stat-card"><span class="stat-value">${toComplete.length}</span><span class="stat-label">${t("stats.pending")}</span></article>
    ${sectorTable}`;
}

function renderActiveNavigation() {
  refs.navLinks.forEach((link) => {
    link.classList.toggle("active", link.dataset.navPage === page);
  });
}

function renderCurrentPage() {
  const user = getCurrentUser();
  if (!user) {
    refs.mainView.innerHTML = `<div class="empty-state">${t("misc.add.profile")}</div>`;
    return;
  }

  if (page === "manager") {
    renderManagerPage();
    return;
  }

  if (page === "collaborator") {
    renderCollaboratorPage();
    return;
  }

  renderEmployeePage();
}

function loadTree() {
  try {
    const parsed = window.FlowDeskApi?.getTree();
    if (Array.isArray(parsed) && parsed.length > 0) {
      return normalizeTree(parsed);
    }
  } catch {}
  return normalizeTree(DEFAULT_TREE);
}

function saveTree(tree) {
  window.FlowDeskApi?.saveTree(normalizeTree(tree));
}

function renderEmployeePage() {
  const currentUser = getCurrentUser();
  const tickets = currentUser
    ? state.tickets.filter((t) => t.createdBy === currentUser.id || !t.createdBy).sort(sortByUpdatedDesc)
    : [];
  const enAttenteTickets = tickets.filter((t) => {
    if (t.status !== "en_attente") return false;
    const thread = ticketInfoThread(t);
    if (thread.length === 0) return false;
    return thread[thread.length - 1].authorRole === "manager";
  });

  refs.mainView.innerHTML = `
    ${(() => {
      const oncall = loadOnCall();
      const hasOnCall = oncall && oncall.email;
      return `
      <section class="card emergency-card">
        <div class="emergency-info">
          <h2>${t("emp.urgent.title")}</h2>
          <p class="subtle">${hasOnCall
            ? `${t("emp.urgent.oncall")} <strong>${escHtml(oncall.name || oncall.email)}</strong>${oncall.phone ? ` · <a href="tel:${escHtml(oncall.phone)}">${escHtml(oncall.phone)}</a>` : ""}`
            : t("emp.urgent.none")}</p>
        </div>
        <button id="urgentCallBtn" class="button button-danger emergency-btn" type="button" ${hasOnCall ? "" : "disabled"}>
          📞 ${t("emp.urgent.btn")}
        </button>
      </section>
      `;
    })()}
    ${enAttenteTickets.length > 0 ? `
    <section class="card alert-card">
      <div class="section-head">
        <div>
          <h2>${t("emp.waiting.title")}</h2>
          <p class="subtle">${t("emp.waiting.sub")}</p>
        </div>
      </div>
      <div class="ticket-list" id="waitingTicketList"></div>
    </section>
    ` : ""}
    <section class="card">
      <div class="section-head">
        <div>
          <h2>${t("emp.newrequest")}</h2>
          <p class="subtle">${t("emp.newrequest.sub")}</p>
        </div>
      </div>
      <form id="ticketForm" class="form-grid">
        <div class="field full" id="siteField">
          <label for="ticketSite">${t("emp.site")} <span style="color:#c0392b">*</span></label>
          <select id="ticketSite" name="siteId" required>
            <option value="">${t("emp.choose")}</option>
            ${loadSites().map((s) => `<option value="${escHtml(s.id)}">${escHtml(s.name)}${s.address ? ` — ${escHtml(s.address)}` : ""}</option>`).join("")}
          </select>
          ${loadSites().length === 0 ? `<p class="subtle" style="margin-top:6px">${t("emp.site.empty")}</p>` : ""}
        </div>
        <div class="field full hidden" id="zoneField">
          <label for="ticketZone">Zone</label>
          <select id="ticketZone" name="zoneId">
            <option value="">— Toute la zone —</option>
          </select>
        </div>
        <div class="field full" id="treeStepsContainer"></div>
        <div class="field full hidden" id="titleField">
          <label for="ticketTitle">${t("emp.title")} <span style="color:#c0392b">*</span></label>
          <input id="ticketTitle" name="ticketTitle" type="text" placeholder="${t("emp.title.ph")}" maxlength="120" autocomplete="off" />
        </div>
        <div class="field full hidden" id="delayField">
          <label for="ticketInterventionDelay">${t("emp.delay.label")}</label>
          <select id="ticketInterventionDelay" name="interventionDelay">
            ${INTERVENTION_DELAY_KEYS.map((key) => `<option value="${key}" ${key === "h48" ? "selected" : ""}>${interventionDelayLabel(key)}</option>`).join("")}
          </select>
        </div>
        <div class="field full hidden" id="commentField">
          <label for="ticketComment">${t("emp.comment")}</label>
          <textarea id="ticketComment" name="comment" placeholder="${t("emp.comment.ph")}"></textarea>
        </div>
        <div class="field full hidden" id="photoField">
          <label>${t("emp.photo")}</label>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button type="button" id="empPhotoCameraBtn" class="button button-outline" style="flex:1;min-width:130px">📷 Prendre une photo</button>
            <button type="button" id="empPhotoGalleryBtn" class="button button-outline" style="flex:1;min-width:130px">🖼 Galerie</button>
          </div>
          <div id="empPhotoGrid" class="emp-photo-grid"></div>
        </div>
        <div class="field full hidden" id="submitField">
          <button class="button" type="submit">${t("emp.submit")}</button>
        </div>
      </form>
    </section>
    <section class="card">
      <div class="section-head"><div>
        <h2>${t("emp.myrequests")}</h2>
        <p class="subtle">${t("emp.myrequests.sub")}</p>
      </div></div>
      <div id="employeeTicketTable"></div>
    </section>
  `;

  const form = refs.mainView.querySelector("#ticketForm");
  const stepsContainer = form.querySelector("#treeStepsContainer");
  const titleField = form.querySelector("#titleField");
  const delayField = form.querySelector("#delayField");
  const commentField = form.querySelector("#commentField");
  const photoField = form.querySelector("#photoField");
  const submitField = form.querySelector("#submitField");

  if (!form._capturedPhotos) form._capturedPhotos = [];

  function renderPhotoGrid() {
    const grid = form.querySelector("#empPhotoGrid");
    if (!grid) return;
    const photos = form._capturedPhotos;
    if (photos.length === 0) { grid.innerHTML = ""; return; }
    grid.innerHTML = photos.map((f, i) => `
      <div class="emp-photo-thumb">
        <img src="${URL.createObjectURL(f)}" alt="Photo ${i + 1}" />
        <button type="button" class="emp-photo-remove" data-remove-idx="${i}" title="Supprimer">×</button>
      </div>`).join("");
    grid.querySelectorAll("[data-remove-idx]").forEach((btn) => {
      btn.addEventListener("click", () => {
        form._capturedPhotos.splice(Number(btn.dataset.removeIdx), 1);
        renderPhotoGrid();
      });
    });
  }

  function _empPickPhoto(withCapture) {
    const inp = document.createElement("input");
    inp.type = "file";
    inp.accept = "image/*";
    if (!withCapture) inp.multiple = true;
    if (withCapture) inp.capture = "environment";
    inp.addEventListener("change", () => {
      Array.from(inp.files).forEach((f) => { if (f) form._capturedPhotos.push(f); });
      renderPhotoGrid();
    });
    inp.click();
  }
  form.querySelector("#empPhotoCameraBtn").addEventListener("click", () => _empPickPhoto(true));
  form.querySelector("#empPhotoGalleryBtn").addEventListener("click", () => _empPickPhoto(false));

  const zoneField  = form.querySelector("#zoneField");
  const zoneSelect = form.querySelector("#ticketZone");
  const siteSelect = form.querySelector("#ticketSite");

  function updateZoneOptions() {
    const site = loadSites().find((s) => s.id === siteSelect.value);
    const zones = site?.zones || [];
    if (zones.length > 0) {
      zoneSelect.innerHTML = `<option value="">— Toute la zone —</option>` +
        zones.map((z) => `<option value="${escHtml(z.id)}">${escHtml(z.name)}</option>`).join("");
      zoneField.classList.remove("hidden");
    } else {
      zoneField.classList.add("hidden");
      zoneSelect.value = "";
    }
  }
  siteSelect.addEventListener("change", updateZoneOptions);

  const tree = loadTree();
  let selections = [];

  function getCurrentLevel() {
    let nodes = tree;
    for (const sel of selections) {
      const found = nodes.find((n) => n.value === sel);
      if (!found || !found.children || found.children.length === 0) {
        return null;
      }
      nodes = found.children;
    }
    return nodes;
  }

  function rebuildSelects() {
    stepsContainer.innerHTML = "";
    selections.forEach((selValue, depth) => {
      let nodes = tree;
      for (let i = 0; i < depth; i++) {
        const found = nodes.find((n) => n.value === selections[i]);
        nodes = found?.children || [];
      }
      appendSelect(nodes, depth, selValue);
    });

    const nextLevel = getCurrentLevel();
    if (nextLevel && nextLevel.length > 0) {
      appendSelect(nextLevel, selections.length, "");
    }

    const isComplete = selections.length > 0 && (!getCurrentLevel() || getCurrentLevel() === null || getCurrentLevel()?.every === undefined);
    const leafReached = selections.length > 0 && (getCurrentLevel() === null || !getCurrentLevel() || getCurrentLevel().length === 0);
    if (leafReached) {
      titleField.classList.remove("hidden");
      delayField.classList.remove("hidden");
      commentField.classList.remove("hidden");
      photoField.classList.remove("hidden");
      submitField.classList.remove("hidden");
    } else {
      titleField.classList.add("hidden");
      delayField.classList.add("hidden");
      commentField.classList.add("hidden");
      photoField.classList.add("hidden");
      submitField.classList.add("hidden");
    }
  }

  function appendSelect(nodes, depth, selectedValue) {
    const label = depth === 0 ? t("emp.cat") : depth === 1 ? t("emp.subcat") : `${t("emp.precision")} ${depth}`;
    const wrapper = document.createElement("div");
    wrapper.className = "field full tree-step";
    wrapper.dataset.depth = depth;
    wrapper.innerHTML = `
      <label>${label}</label>
      <select data-tree-depth="${depth}">
        <option value="">${t("emp.choose")}</option>
        ${nodes.map((n) => `<option value="${n.value}" ${n.value === selectedValue ? "selected" : ""}>${n.label}</option>`).join("")}
      </select>
    `;
    wrapper.querySelector("select").addEventListener("change", (e) => {
      const val = e.target.value;
      selections = selections.slice(0, depth);
      if (val) {
        selections.push(val);
      }
      rebuildSelects();
    });
    stepsContainer.appendChild(wrapper);
  }

  rebuildSelects();

  function buildTitle() {
    let nodes = tree;
    const labels = [];
    for (const sel of selections) {
      const found = nodes.find((n) => n.value === sel);
      if (found) {
        labels.push(found.label);
        nodes = found.children || [];
      }
    }
    return labels.join(" > ");
  }

  function buildDepartment() {
    const root = tree.find((n) => n.value === selections[0]);
    return root?.team || "technique";
  }

  function findSelectedNode() {
    let nodes = tree;
    let current = null;
    for (const sel of selections) {
      current = nodes.find((node) => node.value === sel) || null;
      if (!current) {
        break;
      }
      nodes = current.children || [];
    }
    return current;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (selections.length === 0) {
      return;
    }
    const formData = new FormData(form);
    const siteId = String(formData.get("siteId") || "").trim();
    if (!siteId) {
      toast(t("emp.site.required"));
      form.querySelector("#ticketSite")?.focus();
      return;
    }
    const capturedPhotos = form._capturedPhotos || [];
    if (capturedPhotos.length === 0) {
      toast(t("emp.photo.required"));
      form.querySelector("#empPhotoCameraBtn")?.focus();
      return;
    }
    const allPhotoUrls = await Promise.all(capturedPhotos.map((f) => toDataUrl(f)));
    const photoDataUrl = allPhotoUrls[0] || "";
    const comment = String(formData.get("comment") || "").trim();
    const interventionDelay = normalizeInterventionDelay(formData.get("interventionDelay"));
    const title = String(formData.get("ticketTitle") || "").trim();
    if (!title) {
      toast(t("emp.title.required"));
      form.querySelector("#ticketTitle")?.focus();
      return;
    }
    const department = buildDepartment();
    const selectedNode = findSelectedNode();
    const suggestedSpecialty = selectedNode?.suggestedSpecialty || inferSpecialtyFromValue(title);
    const estimatedHours = normalizeHours(selectedNode?.estimatedHours, defaultHoursForSpecialty(suggestedSpecialty));

    state.tickets.unshift({
      id: nextTicketId(),
      title,
      description: comment,
      department,
      siteId,
      zoneId: String(formData.get("zoneId") || "").trim(),
      categoryValue: selectedNode?.value || "",
      categoryPath: [...selections],
      createdBy: currentUser?.id || "",
      desiredDate: today(),
      plannedDate: today(),
      assignedTo: "",
      assignedToExternal: "",
      suggestedExternalId: selectedNode?.linkedExternalId || "",
      suggestedAssigneeId: "",
      interventionDelay,
      managerId: managerIdForDepartment(department),
      priority: "moyenne",
      suggestedSpecialty,
      estimatedHours,
      status: "nouveau",
      seenByManager: false,
      infoThread: [],
      photoDataUrl,
      photos: allPhotoUrls,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    selections = [];
    form.reset();
    form._capturedPhotos = [];
    renderPhotoGrid();
    rebuildSelects();
    render();
    toast(t("emp.sent"));
  });

  if (enAttenteTickets.length > 0) {
    renderWaitingTicketsCompact(refs.mainView.querySelector("#waitingTicketList"), enAttenteTickets);
  }
  renderEmployeeTicketTable(refs.mainView.querySelector("#employeeTicketTable"), tickets);

  const urgentBtn = refs.mainView.querySelector("#urgentCallBtn");
  if (urgentBtn) {
    urgentBtn.addEventListener("click", () => {
      const oncall = loadOnCall();
      if (!oncall || !oncall.email) {
        toast(t("emp.urgent.none"));
        return;
      }
      window.open(teamsCallUrl(oncall.email), "_blank", "noopener");
    });
  }
}

function renderEmployeeTicketTable(container, tickets) {
  if (!container) {
    return;
  }
  if (!Array.isArray(tickets) || tickets.length === 0) {
    container.innerHTML = `<div class="empty-state">${t("ticket.empty")}</div>`;
    return;
  }

  container.innerHTML = `
    <div class="employee-requests-wrap">
      <table class="employee-requests-table">
        <thead>
          <tr>
            <th>${t("emp.table.title")}</th>
            <th>${t("emp.table.by")}</th>
            <th>${t("emp.table.created")}</th>
            <th>${t("emp.table.delay")}</th>
            <th>${t("emp.table.status")}</th>
          </tr>
        </thead>
        <tbody>
          ${tickets.map((ticket) => {
            const createdBy = findUser(ticket.createdBy)?.name || t("ticket.unknown");
            const isOpen = employeeExpandedTicketId === ticket.id;
            return `
              <tr class="employee-request-row${isOpen ? " is-open" : ""}" data-ticket-row="${ticket.id}">
                <td data-label="${escHtml(t("emp.table.title"))}"><strong>${escHtml(ticket.id)}</strong> · ${escHtml(ticket.title)}</td>
                <td data-label="${escHtml(t("emp.table.by"))}">${escHtml(createdBy)}</td>
                <td data-label="${escHtml(t("emp.table.created"))}">${formatDate(ticket.createdAt)}</td>
                <td data-label="${escHtml(t("emp.table.delay"))}">${interventionDelayLabel(ticket.interventionDelay)}</td>
                <td data-label="${escHtml(t("emp.table.status"))}"><span class="badge badge-status" data-status="${ticket.status}">${statusLabel(ticket.status)}</span></td>
              </tr>
              <tr class="employee-request-detail${isOpen ? "" : " hidden"}" data-ticket-detail="${ticket.id}">
                <td colspan="5">
                  <div class="employee-request-detail-grid">
                    <p><strong>${escHtml(ticket.title)}</strong></p>
                    <p>${escHtml(ticket.description || "-")}</p>
                    <p>${t("ticket.desired")}: ${formatDate(ticket.desiredDate)}</p>
                    <p>${t("ticket.validated")}: ${formatDate(ticket.plannedDate)}</p>
                    <div class="info-thread-box">
                      <h4>${t("chat.history")}</h4>
                      ${renderInfoThreadHtml(ticket)}
                    </div>
                    ${ticket.status !== "termine" ? `
                      <form class="employee-reply-form" data-action="employee-reply" data-ticket-id="${ticket.id}">
                        <label>${t("emp.reply.label")}</label>
                        <textarea name="employeeReply" placeholder="${t("emp.reply.ph")}"></textarea>
                        <button class="button" type="submit">${t("emp.reply.send")}</button>
                      </form>
                    ` : ""}
                  </div>
                </td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;

  container.querySelectorAll("[data-ticket-row]").forEach((row) => {
    row.addEventListener("click", () => {
      const ticketId = row.dataset.ticketRow;
      employeeExpandedTicketId = employeeExpandedTicketId === ticketId ? "" : ticketId;
      renderEmployeeTicketTable(container, tickets);
    });
  });

  container.querySelectorAll("form[data-action='employee-reply']").forEach((formEl) => {
    formEl.addEventListener("submit", (event) => {
      event.preventDefault();
      const ticketId = formEl.dataset.ticketId;
      const reply = String(formEl.querySelector("textarea[name='employeeReply']")?.value || "").trim();
      if (!reply) {
        return;
      }

      const ticket = tickets.find((item) => item.id === ticketId) || {};
      updateTicket(ticketId, {
        infoThread: appendInfoMessage(ticket, "employee", reply),
        employeeReply: reply,
        employeeReplyAt: new Date().toISOString(),
        status: "nouveau",
        seenByManager: false,
      });
      toast(t("emp.reply.sent"));
    });
  });
}

function renderManagerPage() {
  const currentUser = getCurrentUser();
  const teamTickets = state.tickets
    .slice()
    .sort(sortByPlannedDate);
  const collaborators = state.users.filter(
    (u) => u.role === "collaborator",
  );
  const alertCount = teamTickets.filter((t_) => t_.seenByManager === false).length;

  refs.mainView.innerHTML = `
    <nav class="manager-tabs">
      <button class="manager-tab ${managerSubPage === "dashboard"    ? "active" : ""}" data-subpage="dashboard">${t("tab.dashboard")}</button>
      <button class="manager-tab ${managerSubPage === "sites"        ? "active" : ""}" data-subpage="sites">${t("tab.sites")}</button>
      <button class="manager-tab ${managerSubPage === "demandes"     ? "active" : ""}" data-subpage="demandes">${t("tab.requests")}${alertCount > 0 ? ` <span class="tab-badge">${alertCount}</span>` : ""}</button>
      <button class="manager-tab ${managerSubPage === "utilisateurs" ? "active" : ""}" data-subpage="utilisateurs">${t("tab.users")}</button>
      <button class="manager-tab ${managerSubPage === "categories"   ? "active" : ""}" data-subpage="categories">${t("tab.categories")}</button>
      <button class="manager-tab ${managerSubPage === "planning"     ? "active" : ""}" data-subpage="planning">${t("tab.planning")}</button>
      <button class="manager-tab ${managerSubPage === "prestataires" ? "active" : ""}" data-subpage="prestataires">${t("tab.prestataires")}</button>
      <button class="manager-tab ${managerSubPage === "agenda"       ? "active" : ""}" data-subpage="agenda">${t("tab.agenda")}</button>
    </nav>
    <div id="managerContent" class="manager-content"></div>
  `;

  refs.mainView.querySelectorAll(".manager-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      managerSubPage = btn.dataset.subpage;
      renderManagerPage();
    });
  });

  const content = refs.mainView.querySelector("#managerContent");
  switch (managerSubPage) {
    case "dashboard":    return renderManagerDashboard(content, teamTickets);
    case "sites":        return renderManagerSites(content);
    case "demandes":     return renderManagerDemandes(content, teamTickets, collaborators);
    case "utilisateurs": return renderManagerUtilisateurs(content);
    case "categories":   return renderTreeEditor(content);
    case "planning":     return renderManagerPlanning(content, collaborators);
    case "prestataires": return renderManagerPrestataires(content);
    case "agenda":       return renderGlobalAgenda(content, collaborators);
  }
}

function renderManagerSites(container) {
  function renderContent() {
    const list = loadSites();

    const listHtml = list.length === 0
      ? `<p class="subtle" style="padding:6px 0">${t("sites.none")}</p>`
      : list.map((s) => {
          const zoneCount = (s.zones || []).length;
          return `
          <div class="user-item user-item-clickable" data-sid="${escHtml(s.id)}" role="button" tabindex="0">
            <div class="user-item-row1">
              <span class="user-item-name">${escHtml(s.name)}</span>
              ${zoneCount > 0 ? `<span class="badge badge-muted">${zoneCount} zone${zoneCount > 1 ? "s" : ""}</span>` : `<span class="badge badge-warn">Aucune zone</span>`}
            </div>
            <div class="user-item-info">
              ${s.address ? `<span class="badge badge-muted">${escHtml(s.address)}</span>` : ""}
              ${s.notes   ? `<span class="badge badge-muted">${escHtml(s.notes)}</span>`   : ""}
            </div>
          </div>`;
        }).join("");

    container.innerHTML = `
      <section class="card">
        <div class="section-head">
          <div>
            <h2>${t("sites.title")}</h2>
            <p class="subtle">${t("sites.sub")}</p>
          </div>
        </div>
        <div class="add-user-block">
          <h3>${t("sites.new")}</h3>
          <form id="addSiteForm" class="form-grid">
            <div class="field">
              <label for="sName">${t("sites.name")}</label>
              <input id="sName" name="name" type="text" placeholder="${t("sites.name")}" required />
            </div>
            <div class="field">
              <label for="sAddress">${t("sites.address")}</label>
              <input id="sAddress" name="address" type="text" placeholder="${t("sites.address")}" />
            </div>
            <div class="field full">
              <label for="sNotes">${t("sites.notes")}</label>
              <textarea id="sNotes" name="notes" placeholder="${t("sites.notes")}"></textarea>
            </div>
            <div class="field full">
              <button class="button" type="submit">${t("sites.create")}</button>
            </div>
          </form>
        </div>
        <div class="user-group">
          <h3>${t("sites.list")} <span class="badge badge-muted">${list.length}</span></h3>
          <div class="user-group-list" id="siteList">${listHtml}</div>
        </div>
      </section>
    `;

    container.querySelector("#addSiteForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const name = String(fd.get("name") || "").trim();
      const address = String(fd.get("address") || "").trim();
      const notes = String(fd.get("notes") || "").trim();
      if (!name) return;
      const updated = loadSites();
      updated.push({ id: nextSiteId(), name, address, notes, zones: [] });
      saveSites(updated);
      toast(t("sites.created"));
      renderContent();
    });

    container.querySelectorAll(".user-item-clickable[data-sid]").forEach((card) => {
      const open = () => {
        const sites = loadSites();
        const site = sites.find((s) => s.id === card.dataset.sid);
        if (!site) return;
        showSiteModal(site, {
          onSave: () => {
            saveSites(loadSites().map((s) => s.id === site.id ? site : s));
            renderContent();
          },
          onDelete: () => {
            saveSites(loadSites().filter((s) => s.id !== site.id));
            toast(t("sites.deleted"));
            renderContent();
          },
        });
      };
      card.addEventListener("click", open);
      card.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
    });
  }

  renderContent();
}

function showSiteModal(site, { onSave, onDelete }) {
  const INPUT_STYLE = "border-radius:10px;border:1px solid rgba(0,0,0,.14);padding:8px 12px;font:inherit;width:100%;box-sizing:border-box";

  function nextZoneId() {
    return "z-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  }

  function zonesHtml() {
    const zones = site.zones || [];
    if (zones.length === 0) return `<p class="subtle" style="padding:4px 0">Aucune zone définie.</p>`;
    return `<div class="user-group-list" style="margin-bottom:10px">${zones.map((z) => `
      <div class="user-item" style="padding:8px 12px">
        <div class="user-item-info"><strong>${escHtml(z.name)}</strong></div>
        <button class="button danger-ghost tree-btn" type="button" data-del-zone="${escHtml(z.id)}">Supprimer</button>
      </div>`).join("")}</div>`;
  }

  function refreshZones() {
    overlay.querySelector("#zonesList").innerHTML = zonesHtml();
    bindZoneDeleters();
  }

  function bindZoneDeleters() {
    overlay.querySelectorAll("[data-del-zone]").forEach((btn) => {
      btn.addEventListener("click", () => {
        site.zones = (site.zones || []).filter((z) => z.id !== btn.dataset.delZone);
        onSave();
        refreshZones();
        toast("Zone supprimée.");
      });
    });
  }

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal-box card user-edit-modal" role="dialog" aria-modal="true">
      <div class="modal-head">
        <div>
          <h3 id="siteModalTitle">${escHtml(site.name)}</h3>
          ${site.address ? `<p class="subtle" style="margin:2px 0 0">${escHtml(site.address)}</p>` : ""}
        </div>
        <button class="modal-close" type="button" aria-label="Fermer">&#x2715;</button>
      </div>
      <div class="user-modal-body">

        <div class="user-modal-section">
          <h4 class="user-modal-section-title">Informations</h4>
          <form data-modal-action="save-info" class="form-grid">
            <div class="field">
              <label>Nom</label>
              <input type="text" name="siteName" value="${escHtml(site.name)}" required style="${INPUT_STYLE}" />
            </div>
            <div class="field">
              <label>Adresse</label>
              <input type="text" name="siteAddress" value="${escHtml(site.address || "")}" style="${INPUT_STYLE}" />
            </div>
            <div class="field full">
              <label>Notes</label>
              <textarea name="siteNotes" rows="2" style="${INPUT_STYLE}">${escHtml(site.notes || "")}</textarea>
            </div>
            <div class="field full">
              <button class="button" type="submit">Enregistrer</button>
            </div>
          </form>
        </div>

        <div class="user-modal-section">
          <h4 class="user-modal-section-title">Zones <span class="badge badge-muted" id="zoneCount">${(site.zones || []).length}</span></h4>
          <div id="zonesList">${zonesHtml()}</div>
          <form data-modal-action="add-zone" style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap;margin-top:4px">
            <input type="text" name="zoneName" placeholder="Nom de la zone (ex: Hall A, Parking…)" required style="${INPUT_STYLE};max-width:280px" />
            <button class="button" type="submit">Ajouter</button>
          </form>
        </div>

        <div class="user-modal-section user-modal-danger">
          <button class="button danger-ghost" type="button" data-modal-action="del-site">Supprimer ce lieu</button>
        </div>

      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add("visible"));
  const close = () => { overlay.classList.remove("visible"); setTimeout(() => overlay.remove(), 200); };
  overlay.querySelector(".modal-close").addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

  bindZoneDeleters();

  overlay.querySelector("[data-modal-action='save-info']").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    site.name    = String(fd.get("siteName")    || "").trim() || site.name;
    site.address = String(fd.get("siteAddress") || "").trim();
    site.notes   = String(fd.get("siteNotes")   || "").trim();
    overlay.querySelector("#siteModalTitle").textContent = site.name;
    onSave();
    toast("Lieu modifié.");
  });

  overlay.querySelector("[data-modal-action='add-zone']").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = String(new FormData(e.target).get("zoneName") || "").trim();
    if (!name) return;
    if (!Array.isArray(site.zones)) site.zones = [];
    site.zones.push({ id: nextZoneId(), name });
    e.target.reset();
    overlay.querySelector("#zoneCount").textContent = site.zones.length;
    onSave();
    refreshZones();
    toast("Zone ajoutée.");
  });

  overlay.querySelector("[data-modal-action='del-site']").addEventListener("click", () => {
    if (!confirm(`Supprimer le lieu "${site.name}" ?`)) return;
    onDelete();
    close();
  });
}

function renderManagerPrestataires(container) {
  function renderContent() {
    const list = loadPrestataires();

    const listHtml = list.length === 0
      ? `<p class="subtle" style="padding:6px 0">${t("prest.none")}</p>`
      : list.map((p) => `
          <div class="user-item">
            <div class="user-item-info">
              <strong>${escHtml(p.name)}</strong>
              ${p.company ? `<span class="badge badge-muted">${escHtml(p.company)}</span>` : ""}
              <span class="badge badge-muted">${escHtml(p.email)}</span>
              ${p.phone ? `<span class="badge badge-muted">${escHtml(p.phone)}</span>` : ""}
              ${p.specialties && p.specialties.length > 0 ? `<span class="badge badge-muted">${p.specialties.map(specialtyLabel).join(", ")}</span>` : ""}
            </div>
            <button class="button danger-ghost tree-btn" type="button" data-action="del-prest" data-pid="${p.id}">${t("prest.delete")}</button>
          </div>`).join("");

    container.innerHTML = `
      <section class="card">
        <div class="section-head">
          <div>
            <h2>${t("prest.title")}</h2>
            <p class="subtle">${t("prest.sub")}</p>
          </div>
        </div>
        <div class="add-user-block">
          <h3>${t("prest.new")}</h3>
          <form id="addPrestForm" class="form-grid">
            <div class="field">
              <label for="pName">${t("prest.name")}</label>
              <input id="pName" name="name" type="text" placeholder="${t("prest.name")}" required />
            </div>
            <div class="field">
              <label for="pCompany">${t("prest.company")}</label>
              <input id="pCompany" name="company" type="text" placeholder="${t("prest.company")}" />
            </div>
            <div class="field">
              <label for="pEmail">${t("prest.email")}</label>
              <input id="pEmail" name="email" type="email" placeholder="contact@exemple.be" required />
            </div>
            <div class="field">
              <label for="pPhone">${t("prest.phone")}</label>
              <input id="pPhone" name="phone" type="tel" placeholder="+32 4xx xx xx xx" />
            </div>
            <div class="field full">
              <label>${t("prest.skills")}</label>
              <div id="pSkills" class="specialty-checks">
                ${getSpecialtyKeys().map((opt) => `
                  <label class="skill-chip">
                    <input type="checkbox" name="pSkill" value="${opt}" />
                    <span>${specialtyLabel(opt)}</span>
                  </label>`).join("")}
              </div>
            </div>
            <div class="field full">
              <button class="button" type="submit">${t("prest.create")}</button>
            </div>
          </form>
        </div>
        <div class="user-group">
          <h3>${t("prest.list")} <span class="badge badge-muted">${list.length}</span></h3>
          <div class="user-group-list" id="prestList">${listHtml}</div>
        </div>
      </section>
    `;

    container.querySelector("#addPrestForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const name = String(fd.get("name") || "").trim();
      const company = String(fd.get("company") || "").trim();
      const email = String(fd.get("email") || "").trim();
      const phone = String(fd.get("phone") || "").trim();
      const pickedSkills = Array.from(container.querySelectorAll("input[name='pSkill']:checked")).map((i) => i.value);
      if (!name || !email) return;
      const updated = loadPrestataires();
      updated.push({ id: nextPrestId(), name, company, email, phone, specialties: pickedSkills });
      savePrestataires(updated);
      toast(t("prest.created"));
      renderContent();
    });

    container.querySelectorAll("[data-action='del-prest']").forEach((btn) => {
      btn.addEventListener("click", () => {
        const updated = loadPrestataires().filter((p) => p.id !== btn.dataset.pid);
        savePrestataires(updated);
        toast(t("prest.deleted"));
        renderContent();
      });
    });
  }

  renderContent();
}

function renderManagerDashboard(container, tickets) {
  const currentUser = getCurrentUser();
  const byStatus = (s) => tickets.filter((t_) => t_.status === s).length;
  const oncall = loadOnCall() || { name: "", email: "", phone: "" };

  container.innerHTML = `
    <section class="card oncall-card">
      <div class="section-head">
        <div>
          <h2>${t("oncall.title")}</h2>
          <p class="subtle">${t("oncall.sub")}</p>
        </div>
      </div>
      <form id="oncallForm" class="form-grid">
        <div class="field">
          <label for="oncallName">${t("oncall.name")}</label>
          <input id="oncallName" name="name" type="text" value="${escHtml(oncall.name || "")}" placeholder="Prénom Nom" />
        </div>
        <div class="field">
          <label for="oncallEmail">${t("oncall.email")}</label>
          <input id="oncallEmail" name="email" type="email" value="${escHtml(oncall.email || "")}" placeholder="prenom.nom@famiflora.be" required />
        </div>
        <div class="field">
          <label for="oncallPhone">${t("oncall.phone")}</label>
          <input id="oncallPhone" name="phone" type="tel" value="${escHtml(oncall.phone || "")}" placeholder="+32 4xx xx xx xx" />
        </div>
        <div class="field full" style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="button" type="submit">${t("oncall.save")}</button>
          ${oncall.email ? `<button class="button ghost" type="button" id="oncallClearBtn">${t("oncall.clear")}</button>` : ""}
        </div>
      </form>
    </section>
    <section class="card">
      <div class="section-head">
        <div>
          <h2>${t("dash.title")}</h2>
          <p class="subtle">${t("dash.subtitle")}</p>
        </div>
      </div>
      <div class="kpi-row">
        <div class="kpi-card"><span class="kpi-value">${tickets.length}</span><span class="kpi-label">${t("stats.total")}</span></div>
        <div class="kpi-card kpi-warn"><span class="kpi-value">${byStatus("nouveau")}</span><span class="kpi-label">${t("status.nouveau")}</span></div>
        <div class="kpi-card kpi-wait"><span class="kpi-value">${byStatus("en_attente")}</span><span class="kpi-label">${t("status.en_attente")}</span></div>
        <div class="kpi-card kpi-info"><span class="kpi-value">${byStatus("planifie")}</span><span class="kpi-label">${t("status.planifie")}</span></div>
        <div class="kpi-card kpi-progress"><span class="kpi-value">${byStatus("en_cours")}</span><span class="kpi-label">${t("status.en_cours")}</span></div>
        <div class="kpi-card kpi-ok"><span class="kpi-value">${byStatus("termine")}</span><span class="kpi-label">${t("status.termine")}</span></div>
      </div>
    </section>
    <section class="card">
      <div class="section-head"><div>
        <h2>${t("dash.oldest.title")}</h2>
        <p class="subtle">${t("dash.oldest.subtitle")}</p>
      </div></div>
      <div class="oldest-grid" id="dashOldest"></div>
    </section>
  `;

  renderManagerOldestByStatus(container.querySelector("#dashOldest"), tickets);

  const oncallForm = container.querySelector("#oncallForm");
  oncallForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(oncallForm);
    const name = String(fd.get("name") || "").trim();
    const email = String(fd.get("email") || "").trim();
    const phone = String(fd.get("phone") || "").trim();
    if (!email) {
      toast(t("oncall.email.required"));
      return;
    }
    saveOnCall({ name, email, phone, updatedAt: new Date().toISOString() });
    toast(t("oncall.saved"));
    renderManagerPage();
  });
  const clearBtn = container.querySelector("#oncallClearBtn");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      saveOnCall(null);
      toast(t("oncall.cleared"));
      renderManagerPage();
    });
  }
}

function renderManagerOldestByStatus(container, tickets) {
  const STATUSES = ["nouveau", "en_attente", "planifie", "en_cours"];

  const cardsHtml = STATUSES.map((status) => {
    const oldest = tickets
      .filter((tk) => tk.status === status)
      .slice()
      .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0))[0];

    if (!oldest) {
      return `
        <article class="oldest-card card" data-status="${status}">
          <header class="oldest-card-head">
            <span class="badge badge-status" data-status="${status}">${statusLabel(status)}</span>
          </header>
          <p class="subtle" style="margin:8px 0 0">${t("dash.oldest.none")}</p>
        </article>
      `;
    }

    const createdBy = findUser(oldest.createdBy)?.name || t("ticket.unknown");
    const site = oldest.siteId ? findSite(oldest.siteId) : null;
    const siteLabel = site ? site.name : "";
    const ageDays = Math.max(0, Math.floor((Date.now() - new Date(oldest.createdAt || Date.now()).getTime()) / 86400000));

    return `
      <article class="oldest-card card is-clickable" data-status="${status}" data-ticket-id="${escHtml(oldest.id)}" role="button" tabindex="0">
        <header class="oldest-card-head">
          <span class="badge badge-status" data-status="${status}">${statusLabel(status)}</span>
          <span class="ticket-code">${escHtml(oldest.id)}</span>
        </header>
        <h3 class="oldest-card-title">${escHtml(oldest.title || "")}</h3>
        <dl class="oldest-card-meta">
          <div><dt>${t("ticket.by")}</dt><dd>${escHtml(createdBy)}</dd></div>
          ${siteLabel ? `<div><dt>${t("ticket.site")}</dt><dd>${escHtml(siteLabel)}</dd></div>` : ""}
          <div><dt>${t("dash.oldest.created")}</dt><dd>${formatDate(oldest.createdAt)} <span class="badge badge-muted">${t("dash.oldest.age").replace("{n}", String(ageDays))}</span></dd></div>
        </dl>
      </article>
    `;
  }).join("");

  container.innerHTML = cardsHtml;

  container.querySelectorAll(".oldest-card.is-clickable").forEach((card) => {
    const openTicket = () => {
      const ticketId = card.getAttribute("data-ticket-id") || "";
      if (!ticketId) return;
      managerSubPage = "demandes";
      managerExpandedTicketId = ticketId;
      const target = state.tickets.find((tk) => tk.id === ticketId);
      if (target && target.seenByManager === false) {
        updateTicket(ticketId, { seenByManager: true });
        return;
      }
      renderManagerPage();
    };
    card.addEventListener("click", openTicket);
    card.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        openTicket();
      }
    });
  });
}

function renderManagerDemandes(container, tickets, collaborators) {
  let currentFilter = "";

  container.innerHTML = `
    <section class="card">
      <div class="section-head">
        <div>
          <h2>${t("mgr.requests.title")}</h2>
          <p class="subtle">${t("mgr.requests.sub")}</p>
        </div>
        <div class="filter-bar">
          <label for="statusFilter">${t("mgr.filter.label")}</label>
          <select id="statusFilter">
            <option value="">${t("mgr.filter.all")}</option>
            ${Object.entries(STATUS_LABELS()).map(([v, l]) => `<option value="${v}">${l}</option>`).join("")}
          </select>
        </div>
      </div>
      <div id="demandeList"></div>
    </section>
  `;

  const list = container.querySelector("#demandeList");
  const filterSel = container.querySelector("#statusFilter");

  function renderFiltered() {
    const filtered = currentFilter ? tickets.filter((t) => t.status === currentFilter) : tickets;
    renderManagerTicketTable(list, filtered, collaborators);
  }

  filterSel.addEventListener("change", () => {
    currentFilter = filterSel.value;
    renderFiltered();
  });

  renderFiltered();
}

function ticketRefNum(id) {
  return Number(String(id || "").replace(/^T-/i, "")) || 0;
}

function renderManagerTicketTable(container, tickets, collaborators) {
  if (!container) {
    return;
  }

  if (!Array.isArray(tickets) || tickets.length === 0) {
    container.innerHTML = `<div class="empty-state">${t("ticket.empty")}</div>`;
    return;
  }

  const sorted = [...tickets].sort((a, b) => ticketRefNum(b.id) - ticketRefNum(a.id));

  container.innerHTML = `
    <div class="employee-requests-wrap">
      <table class="employee-requests-table manager-requests-table">
        <thead>
          <tr>
            <th>Ref</th>
            <th>${t("emp.table.by")}</th>
            <th>${t("emp.table.delay")}</th>
            <th>${t("mgr.priority")}</th>
            <th>${t("emp.table.status")}</th>
          </tr>
        </thead>
        <tbody>
          ${sorted.map((ticket) => {
            const createdBy = findUser(ticket.createdBy)?.name || t("ticket.unknown");
            const isOpen = managerExpandedTicketId === ticket.id;
            return `
              <tr class="employee-request-row manager-request-row${isOpen ? " is-open" : ""}" data-manager-ticket-row="${ticket.id}">
                <td data-label="Réf"><strong>${ticket.id}</strong> · ${escHtml(ticket.title)}</td>
                <td data-label="${escHtml(t("emp.table.by"))}">${escHtml(createdBy)}</td>
                <td data-label="${escHtml(t("emp.table.delay"))}">${interventionDelayLabel(ticket.interventionDelay)}</td>
                <td data-label="${escHtml(t("mgr.priority"))}"><span class="badge badge-priority" data-priority="${ticket.priority}">${priorityLabel(ticket.priority)}</span></td>
                <td data-label="${escHtml(t("emp.table.status"))}"><span class="badge badge-status" data-status="${ticket.status}">${statusLabel(ticket.status)}</span></td>
              </tr>
              <tr class="employee-request-detail manager-request-detail${isOpen ? "" : " hidden"}" data-manager-ticket-detail="${ticket.id}">
                <td colspan="5">
                  <div class="manager-request-detail-grid">
                    <p><strong>${escHtml(ticket.title)}</strong></p>
                    <p>${escHtml(ticket.description || "-")}</p>
                    <dl class="ticket-details">${renderDetails(ticket)}</dl>
                    ${(ticket.photos?.length > 0 ? ticket.photos : (ticket.photoDataUrl ? [ticket.photoDataUrl] : [])).map((url, i, arr) =>
                      `<div class="ticket-photo-wrap"><p class="detail-label">Photo${arr.length > 1 ? ` ${i + 1}` : ""}</p><img class="ticket-photo" src="${url}" alt="Photo ${i + 1}" /></div>`
                    ).join("")}
                    <div data-manager-form-host="${ticket.id}"></div>
                  </div>
                </td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;

  if (managerExpandedTicketId) {
    const host = container.querySelector(`[data-manager-form-host="${managerExpandedTicketId}"]`);
    const ticket = tickets.find((item) => item.id === managerExpandedTicketId);
    if (host && ticket) host.appendChild(renderManagerForm(ticket, collaborators));
  }

  container.querySelectorAll("[data-manager-ticket-row]").forEach((row) => {
    row.addEventListener("click", () => {
      const ticketId = row.getAttribute("data-manager-ticket-row") || "";
      const ticket = tickets.find((item) => item.id === ticketId);
      if (!ticketId || !ticket) {
        return;
      }

      const opening = managerExpandedTicketId !== ticketId;
      managerExpandedTicketId = opening ? ticketId : "";

      if (opening) {
        const updates = { seenByManager: true };
        if (ticket.status === "nouveau") updates.status = "en_attente";
        updateTicket(ticketId, updates);
        return;
      }

      renderManagerTicketTable(container, tickets, collaborators);
    });
  });
}

const SCHED_DAYS   = ["mon","tue","wed","thu","fri","sat","sun"];
const SCHED_LABELS = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];

function scheduleDay(user, week, day) {
  return user.schedule?.[week]?.[day] || { active: false, start: "", end: "" };
}

function isoWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}
function weekTypeForDate(date) { return isoWeekNumber(date) % 2 === 0 ? "A" : "B"; }
function schedKeyForDate(date) {
  const jsDay = date.getDay();
  return SCHED_DAYS[jsDay === 0 ? 6 : jsDay - 1];
}

function scheduleSummary(user) {
  if (!user.schedule) return "";
  const fmt = (week) => SCHED_DAYS
    .filter((d) => user.schedule[week]?.[d]?.active)
    .map((d) => SCHED_LABELS[SCHED_DAYS.indexOf(d)])
    .join(" ");
  const a = fmt("A"); const b = fmt("B");
  if (!a && !b) return "";
  return `Paire: ${a || "—"} · Impaire: ${b || "—"}`;
}

function renderManagerUtilisateurs(container) {
  let showSkillsCatalog = false;
  let showTeamsForm = false;
  let filterRole = "all";
  let showScheduleManager = false;
  let editingSchedId = "";

  function renderContent() {
    const managers  = state.users.filter((u) => u.role === "manager");
    const collabs   = state.users.filter((u) => u.role === "collaborator");
    const employees = state.users.filter((u) => u.role === "employee");
    const allUsers  = state.users;
    const filteredUsers = filterRole === "all" ? allUsers : allUsers.filter((u) => u.role === filterRole);
    const ROLE_LABEL = { manager: t("users.managers"), collaborator: t("users.collabs"), employee: t("users.employees") };

    // ── Vue Gestion des horaires ──────────────────────────────────────────
    if (showScheduleManager) {
      const TIME_STYLE = "width:88px;padding:3px 6px;border:1px solid rgba(0,0,0,.2);border-radius:6px;font:inherit";
      container.innerHTML = `
        <section class="card">
          <div class="section-head">
            <div>
              <h2>Gestion des horaires</h2>
              <p class="subtle">Configurez les horaires semaine paire / impaire pour chaque collaborateur</p>
            </div>
            <button class="button ghost" type="button" id="backFromSchedBtn">← Retour</button>
          </div>
          ${collabs.length === 0 ? `<p class="subtle" style="padding:8px 0">Aucun collaborateur.</p>` : `
          <div class="user-group-list">
            ${collabs.map((u) => {
              const open = editingSchedId === u.id;
              return `
              <div class="user-item">
                <div class="user-item-row1">
                  <span class="user-item-name">${escHtml(u.name)}</span>
                  <div style="display:flex;align-items:center;gap:8px">
                    <span class="badge badge-muted">${teamLabel(u.team)}</span>
                    ${scheduleSummary(u) ? `<span class="badge badge-muted" style="font-size:0.78em">${escHtml(scheduleSummary(u))}</span>` : `<span class="badge badge-warn">Pas d'horaire</span>`}
                    <button class="button ghost tree-btn" type="button" data-action="toggle-sched" data-uid="${u.id}">${open ? "Fermer" : "Modifier"}</button>
                  </div>
                </div>
                ${open ? `
                <form class="sched-form" data-action="save-sched" data-uid="${u.id}" style="margin-top:12px;overflow-x:auto">
                  <table style="border-collapse:collapse;font-size:0.85em;width:100%">
                    <thead>
                      <tr>
                        <th style="padding:4px 8px;text-align:left;width:44px"></th>
                        <th style="padding:4px 16px;text-align:center;font-weight:700;color:var(--primary,#2563eb)">Semaine paire</th>
                        <th style="padding:4px 16px;text-align:center;font-weight:700;color:var(--primary,#2563eb)">Semaine impaire</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${SCHED_DAYS.map((day, i) => {
                        const dA = scheduleDay(u, "A", day);
                        const dB = scheduleDay(u, "B", day);
                        return `
                        <tr style="border-top:1px solid rgba(0,0,0,.06)">
                          <td style="padding:7px 8px;font-weight:600">${SCHED_LABELS[i]}</td>
                          <td style="padding:7px 16px">
                            <label style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                              <input type="checkbox" name="sA_${day}_active" ${dA.active ? "checked" : ""} />
                              <input type="time" name="sA_${day}_start" value="${escHtml(dA.start)}" style="${TIME_STYLE}" />
                              <span style="color:#bbb">→</span>
                              <input type="time" name="sA_${day}_end" value="${escHtml(dA.end)}" style="${TIME_STYLE}" />
                            </label>
                          </td>
                          <td style="padding:7px 16px">
                            <label style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                              <input type="checkbox" name="sB_${day}_active" ${dB.active ? "checked" : ""} />
                              <input type="time" name="sB_${day}_start" value="${escHtml(dB.start)}" style="${TIME_STYLE}" />
                              <span style="color:#bbb">→</span>
                              <input type="time" name="sB_${day}_end" value="${escHtml(dB.end)}" style="${TIME_STYLE}" />
                            </label>
                          </td>
                        </tr>`;
                      }).join("")}
                    </tbody>
                  </table>
                  <button class="button" type="submit" style="margin-top:10px">Enregistrer l'horaire</button>
                </form>` : ""}
              </div>`;
            }).join("")}
          </div>`}
        </section>
      `;

      container.querySelector("#backFromSchedBtn").addEventListener("click", () => {
        showScheduleManager = false; editingSchedId = ""; renderContent();
      });
      container.querySelectorAll("[data-action='toggle-sched']").forEach((btn) => {
        btn.addEventListener("click", () => {
          editingSchedId = editingSchedId === btn.dataset.uid ? "" : btn.dataset.uid;
          renderContent();
        });
      });
      container.querySelectorAll(".sched-form[data-action='save-sched']").forEach((form) => {
        form.addEventListener("submit", (e) => {
          e.preventDefault();
          const user = state.users.find((u) => u.id === form.dataset.uid);
          if (!user) return;
          const fd = new FormData(form);
          const schedule = { A: {}, B: {} };
          SCHED_DAYS.forEach((day) => {
            ["A","B"].forEach((week) => {
              const active = fd.get(`s${week}_${day}_active`) === "on";
              schedule[week][day] = {
                active,
                start: active ? String(fd.get(`s${week}_${day}_start`) || "") : "",
                end:   active ? String(fd.get(`s${week}_${day}_end`)   || "") : "",
              };
            });
          });
          user.schedule = schedule;
          editingSchedId = "";
          persistState();
          renderContent();
          toast("Horaire enregistré.");
        });
      });
      return;
    }

    // ── Vue principale utilisateurs ──────────────────────────────────────
    const userListHtml = (users) => {
      if (users.length === 0) return `<p class="subtle" style="padding:6px 0">${t("users.none")}</p>`;
      return users.map((u) => {
        const sched = scheduleSummary(u);
        return `
        <div class="user-item user-item-clickable" data-uid="${escHtml(u.id)}" role="button" tabindex="0">
          <div class="user-item-row1">
            <span class="user-item-name">${escHtml(u.name)}</span>
            ${u.password ? `<span class="badge badge-ok" title="${t("users.password.is.defined")}">🔑</span>` : `<span class="badge badge-warn">${t("users.password.none")}</span>`}
          </div>
          <div class="user-item-info">
            <span class="badge badge-muted">${ROLE_LABEL[u.role] || u.role}</span>
            <span class="badge badge-muted">${teamLabel(u.team)}</span>
            ${u.role === "collaborator" && specialtiesSummary(u) ? `<span class="badge badge-muted">${escHtml(specialtiesSummary(u))}</span>` : ""}
            ${sched ? `<span class="badge badge-muted">${escHtml(sched)}</span>` : ""}
          </div>
        </div>
      `}).join("");
    };

    container.innerHTML = `
      <section class="card">
        <div class="section-head">
          <div>
            <h2>${t("users.title")}</h2>
            <p class="subtle">${t("users.sub")}</p>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="button ghost" type="button" id="openScheduleMgrBtn">Gestion des horaires</button>
            <button class="button ghost" type="button" id="toggleSkillsCatalogBtn">${showSkillsCatalog ? t("users.skills.hide") : t("users.skills.show")}</button>
          </div>
        </div>
        ${showSkillsCatalog ? `
        <div class="add-user-block">
          <h3>${t("users.skills.catalog")}</h3>
          <form id="addSkillForm" class="form-grid">
            <div class="field">
              <label for="nsLabel">${t("users.skills.label")}</label>
              <input id="nsLabel" name="label" type="text" placeholder="${t("users.skills.label.ph")}" required />
            </div>
            <div class="field full">
              <label>${t("users.skills.teams")}</label>
              <div class="specialty-checks">
                <label class="skill-chip">
                  <input type="checkbox" name="skillTeam" value="technique" checked />
                  <span>${t("dept.technique")}</span>
                </label>
                <label class="skill-chip">
                  <input type="checkbox" name="skillTeam" value="decoration" />
                  <span>${t("dept.decoration")}</span>
                </label>
              </div>
            </div>
            <div class="field full">
              <button class="button" type="submit">${t("users.skills.create")}</button>
            </div>
          </form>
          <div class="user-group-list">
            ${getSpecialtyDefinitions().map((spec) => {
              const canDelete = true;
              const teamBadges = (spec.teams || []).map((team) => `<span class="badge badge-muted">${teamLabel(team)}</span>`).join("");
              return `
                <div class="user-item">
                  <div class="user-item-info">
                    <strong>${escHtml(specialtyLabel(spec.key))}</strong>
                    <span class="badge badge-muted">${escHtml(spec.key)}</span>
                    ${teamBadges}
                  </div>
                  ${canDelete ? `<button class="button danger-ghost tree-btn" type="button" data-action="del-skill" data-skill="${spec.key}">${t("users.delete")}</button>` : ""}
                </div>
              `;
            }).join("")}
          </div>
        </div>
        ` : ""}
        <div class="add-user-block">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <h3 style="margin:0">Équipes cibles</h3>
            <button class="button ghost tree-btn" type="button" id="toggleTeamsFormBtn">${showTeamsForm ? "Fermer" : "Gérer les équipes"}</button>
          </div>
          ${showTeamsForm ? `
          <form id="addTeamForm" class="form-grid">
            <div class="field">
              <label for="ntLabel">Nom de l'équipe</label>
              <input id="ntLabel" name="label" type="text" placeholder="Ex: Jardinerie" required autocomplete="off" />
            </div>
            <div class="field full">
              <button class="button" type="submit">Créer l'équipe</button>
            </div>
          </form>
          <div class="user-group-list" style="margin-top:8px">
            ${[
              ...BUILTIN_TARGET_TEAMS.map((key) => `
                <div class="user-item">
                  <div class="user-item-info">
                    <strong>${escHtml(teamKeyToLabel(key))}</strong>
                    <span class="badge badge-muted">Intégrée</span>
                  </div>
                </div>`),
              ...loadCustomTeams().map((ct) => `
                <div class="user-item">
                  <div class="user-item-info">
                    <strong>${escHtml(ct.label)}</strong>
                    <span class="badge badge-muted">${escHtml(ct.key)}</span>
                  </div>
                  <button class="button danger-ghost tree-btn" type="button" data-action="del-team" data-team-key="${escHtml(ct.key)}">${t("users.delete")}</button>
                </div>`)
            ].join("")}
          </div>
          ` : ""}
        </div>

        <div class="add-user-block">
          <h3>${t("users.new")}</h3>
          <form id="addUserForm" class="form-grid">
            <div class="field">
              <label for="nuName">${t("users.name")}</label>
              <input id="nuName" name="name" type="text" placeholder="${t("users.name.ph")}" required />
            </div>
            <div class="field">
              <label for="nuRole">${t("users.role")}</label>
              <select id="nuRole" name="role">
                <option value="employee">${t("role.employee.opt")}</option>
                <option value="collaborator">${t("role.collab.opt")}</option>
                <option value="manager">${t("role.manager.opt")}</option>
              </select>
            </div>
            <div class="field">
              <label for="nuTeam">${t("users.dept")}</label>
              <select id="nuTeam" name="team">
                <option value="magasin">${t("dept.magasin")}</option>
                ${getAllTargetTeamKeys().map((key) => `<option value="${escHtml(key)}">${escHtml(teamKeyToLabel(key))}</option>`).join("")}
              </select>
            </div>
            <div class="field full" id="nuSkillsField">
              <label>${t("users.skills")}</label>
              <div id="nuSkills" class="specialty-checks"></div>
            </div>
            <div class="field full">
              <button class="button" type="submit">${t("users.create")}</button>
            </div>
          </form>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
          ${[
            { key: "all",          label: `Tous (${allUsers.length})` },
            { key: "manager",      label: `${t("users.managers")} (${managers.length})` },
            { key: "collaborator", label: `${t("users.collabs")} (${collabs.length})` },
            { key: "employee",     label: `${t("users.employees")} (${employees.length})` },
          ].map((f) => `<button class="button ${filterRole === f.key ? "" : "ghost"} tree-btn" type="button" data-filter="${f.key}">${f.label}</button>`).join("")}
        </div>
        <div class="user-group-list">${userListHtml(filteredUsers)}</div>
      </section>
    `;

    const roleSelect = container.querySelector("#nuRole");
    const teamSelect = container.querySelector("#nuTeam");
    const skillsWrap = container.querySelector("#nuSkills");
    const skillsField = container.querySelector("#nuSkillsField");

    function renderSpecialtyChecks() {
      const role = roleSelect.value;
      const team = teamSelect.value;
      if (role !== "collaborator") {
        skillsField.classList.add("hidden");
        skillsWrap.innerHTML = "";
        return;
      }
      skillsField.classList.remove("hidden");
      const options = specialtyOptionsForTeam(team);
      skillsWrap.innerHTML = options.map((opt, index) => `
        <label class="skill-chip">
          <input type="checkbox" name="nuSkill" value="${opt}" ${index === 0 ? "checked" : ""} />
          <span>${specialtyLabel(opt)}</span>
        </label>
      `).join("");
    }

    function syncTeamOptions() {
      const r = roleSelect.value;
      if (r === "employee") {
        teamSelect.innerHTML = `<option value="magasin">${t("dept.magasin")}</option>`;
      } else {
        teamSelect.innerHTML = `
          <option value="technique">${t("dept.technique")}</option>
          <option value="decoration">${t("dept.decoration")}</option>
        `;
      }
      renderSpecialtyChecks();
    }

    roleSelect.addEventListener("change", syncTeamOptions);
    teamSelect.addEventListener("change", renderSpecialtyChecks);
    syncTeamOptions();

    container.querySelector("#toggleTeamsFormBtn")?.addEventListener("click", () => {
      showTeamsForm = !showTeamsForm;
      renderContent();
    });

    container.querySelector("#addTeamForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const label = String(fd.get("label") || "").trim();
      if (!label) return;
      const key = buildNodeValue(label, "team");
      const existing = loadCustomTeams();
      if (getAllTeamKeys().includes(key) || existing.some((ct) => ct.key === key)) {
        toast("Cette équipe existe déjà.");
        return;
      }
      saveCustomTeams([...existing, { key, label }]);
      toast(`Équipe "${label}" créée.`);
      renderContent();
    });

    container.querySelectorAll("[data-action='del-team']").forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.dataset.teamKey;
        const inUse = state.users.some((u) => u.team === key);
        if (inUse) {
          toast("Cette équipe est utilisée par des utilisateurs. Réassignez-les d'abord.");
          return;
        }
        saveCustomTeams(loadCustomTeams().filter((ct) => ct.key !== key));
        toast("Équipe supprimée.");
        renderContent();
      });
    });

    container.querySelector("#addUserForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const name = String(fd.get("name") || "").trim();
      const role = String(fd.get("role"));
      const team = String(fd.get("team"));
      const pickedSkills = Array.from(container.querySelectorAll("input[name='nuSkill']:checked")).map((input) => input.value);
      if (!name) return;
      state.users.push(normalizeUser({ id: nextUserId(), name, role, team, specialties: pickedSkills }));
      persistState();
      renderUserSelector();
      renderContent();
      toast(t("users.created"));
    });

    container.querySelector("#openScheduleMgrBtn")?.addEventListener("click", () => {
      showScheduleManager = true; editingSchedId = ""; renderContent();
    });

    container.querySelector("#toggleSkillsCatalogBtn")?.addEventListener("click", () => {
      showSkillsCatalog = !showSkillsCatalog;
      renderContent();
    });

    container.querySelector("#addSkillForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const label = String(fd.get("label") || "").trim();
      const key = buildNodeValue(label, "skill");
      const teams = Array.from(container.querySelectorAll("input[name='skillTeam']:checked")).map((input) => input.value);
      if (!label) {
        return;
      }
      if (getSpecialtyKeys().includes(key)) {
        toast(t("users.skills.exists"));
        return;
      }
      if (teams.length === 0) {
        toast(t("users.skills.team.required"));
        return;
      }

      const custom = loadCustomSpecialties();
      custom.push({ key, label, teams });
      saveCustomSpecialties(custom);
      renderContent();
      toast(t("users.skills.created"));
    });

    container.querySelectorAll(".user-item-clickable").forEach((card) => {
      const open = () => {
        const user = state.users.find((u) => u.id === card.dataset.uid);
        if (!user) return;
        showUserEditModal(user, {
          onSave: () => { persistState(); renderUserSelector(); renderContent(); },
          onDelete: () => { removeUser(user.id); renderContent(); },
        });
      };
      card.addEventListener("click", open);
      card.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
    });

    container.querySelectorAll("[data-action='del-skill']").forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.dataset.skill;
        const usedByUsers = state.users.some((user) => Array.isArray(user.specialties) && user.specialties.includes(key));
        const tree = loadTree();
        const stack = [...tree];
        let usedByTree = false;
        while (stack.length > 0) {
          const node = stack.pop();
          if (!node) continue;
          if (node.suggestedSpecialty === key) {
            usedByTree = true;
            break;
          }
          if (Array.isArray(node.children)) {
            stack.push(...node.children);
          }
        }
        if (usedByUsers || usedByTree) {
          toast(t("users.skills.in.use"));
          return;
        }
        const isDefault = DEFAULT_SPECIALTIES.some((def) => def.key === key);
        if (isDefault) {
          saveDeletedDefaultKeys([...loadDeletedDefaultKeys(), key]);
        } else {
          saveCustomSpecialties(loadCustomSpecialties().filter((item) => item.key !== key));
        }
        renderContent();
        toast(t("users.skills.deleted"));
      });
    });

    container.querySelectorAll("[data-filter]").forEach((btn) => {
      btn.addEventListener("click", () => { filterRole = btn.dataset.filter; renderContent(); });
    });
  }

  renderContent();
}

function showUserEditModal(user, { onSave, onDelete }) {
  const ROLE_LABEL = { manager: t("users.managers"), collaborator: t("users.collabs"), employee: t("users.employees") };
  const INPUT_STYLE = "border-radius:10px;border:1px solid rgba(0,0,0,.14);padding:8px 12px;font:inherit;width:100%;box-sizing:border-box";
  const TIME_STYLE  = "width:90px;padding:3px 6px;border:1px solid rgba(0,0,0,.2);border-radius:6px;font:inherit";

  const skillsSection = user.role === "collaborator" ? `
    <div class="user-modal-section">
      <h4 class="user-modal-section-title">Compétences</h4>
      <form data-modal-action="save-skills">
        <div class="specialty-checks" style="margin-bottom:10px">
          ${specialtyOptionsForTeam(user.team).map((opt) => `
            <label class="skill-chip">
              <input type="checkbox" name="editSkill" value="${opt}" ${normalizeSpecialties(user.specialties, user.team).includes(opt) ? "checked" : ""} />
              <span>${specialtyLabel(opt)}</span>
            </label>
          `).join("")}
        </div>
        <button class="button" type="submit">Enregistrer</button>
      </form>
    </div>` : "";

  const schedSection = "";

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal-box card user-edit-modal" role="dialog" aria-modal="true">
      <div class="modal-head">
        <div>
          <h3 id="uem-title">${escHtml(user.name)}</h3>
          <p class="subtle" style="margin:2px 0 0">${ROLE_LABEL[user.role] || user.role} · ${escHtml(teamLabel(user.team))}</p>
        </div>
        <button class="modal-close" type="button" aria-label="Fermer">&#x2715;</button>
      </div>
      <div class="user-modal-body">

        <div class="user-modal-section">
          <h4 class="user-modal-section-title">Nom</h4>
          <form data-modal-action="save-name" style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap">
            <input type="text" name="newName" value="${escHtml(user.name)}" required style="${INPUT_STYLE};max-width:280px" />
            <button class="button" type="submit">Enregistrer</button>
          </form>
        </div>

        ${skillsSection}
        ${schedSection}

        <div class="user-modal-section">
          <h4 class="user-modal-section-title">Mot de passe</h4>
          <p class="subtle" style="margin:0 0 8px">
            ${user.password
              ? `✓ ${t("users.password.is.defined")}`
              : `⚠ ${t("users.password.none")} — accès libre`}
          </p>
          <form data-modal-action="save-password" style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap">
            <input type="password" name="newPassword" placeholder="${t("users.password.ph")}" minlength="4" autocomplete="new-password" style="${INPUT_STYLE};max-width:280px" />
            <button class="button" type="submit">${user.password ? t("users.password.change") : t("users.password.set")}</button>
          </form>
        </div>

        <div class="user-modal-section user-modal-danger">
          <button class="button danger-ghost" type="button" data-modal-action="del-user">Supprimer cet utilisateur</button>
        </div>

      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add("visible"));

  const close = () => { overlay.classList.remove("visible"); setTimeout(() => overlay.remove(), 200); };
  overlay.querySelector(".modal-close").addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  setTimeout(() => overlay.querySelector("input[name='newName']")?.focus(), 60);

  overlay.querySelector("[data-modal-action='save-name']").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = String(new FormData(e.target).get("newName") || "").trim();
    if (!name) return;
    user.name = name;
    overlay.querySelector("#uem-title").textContent = name;
    onSave();
    toast("Nom modifié.");
  });

  overlay.querySelector("[data-modal-action='save-password']").addEventListener("submit", (e) => {
    e.preventDefault();
    const pwd = String(new FormData(e.target).get("newPassword") || "").trim();
    if (!pwd) return;
    user.password = pwd;
    e.target.reset();
    onSave();
    toast(t("users.password.saved"));
  });

  overlay.querySelector("[data-modal-action='save-skills']")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const picked = Array.from(e.target.querySelectorAll("input[name='editSkill']:checked")).map((i) => i.value);
    user.specialties = normalizeSpecialties(picked, user.team);
    onSave();
    toast(t("users.skills.saved"));
  });

  overlay.querySelector("[data-modal-action='del-user']").addEventListener("click", () => {
    if (!confirm(`Supprimer ${user.name} ?`)) return;
    onDelete();
    close();
  });
}

function showPlanningTaskModal({ date, collaborators, task = null, onSave }) {
  const isEdit = !!task;
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal-box card" role="dialog" aria-modal="true">
      <div class="modal-head">
        <h3>${isEdit ? t("plan.task.edit") : t("plan.task.new")}</h3>
        <button class="modal-close" type="button" aria-label="Fermer">&#x2715;</button>
      </div>
      <form class="modal-form form-grid" id="taskModalForm">
        <div class="field full">
          <label for="tm-title">${t("plan.task.title.label")} <span style="color:#c0392b">*</span></label>
          <input id="tm-title" name="title" type="text" value="${escHtml(task?.title || "")}" required autocomplete="off" />
        </div>
        <div class="field">
          <label for="tm-date">${t("plan.task.date.label")}</label>
          <input id="tm-date" name="date" type="date" value="${escHtml(task?.date || date || today())}" required />
        </div>
        <div class="field">
          <label for="tm-collab">${t("plan.task.collab.label")}</label>
          <select id="tm-collab" name="collaboratorId">
            <option value="">${t("plan.task.none")}</option>
          </select>
          <p id="tm-rest-warn" class="cal-rest-warning" style="margin-top:6px;display:none;"></p>
        </div>
        <div class="field">
          <label for="tm-hours">${t("plan.task.hours.label")}</label>
          <input id="tm-hours" name="estimatedHours" type="number" min="0.25" max="24" step="0.25" value="${task?.estimatedHours ?? 1}" />
        </div>
        <div class="field full">
          <label for="tm-desc">${t("plan.task.notes.label")}</label>
          <textarea id="tm-desc" name="description" rows="2" placeholder="${escHtml(t("plan.task.notes.ph"))}">${escHtml(task?.description || "")}</textarea>
        </div>
        <div class="field full">
          <label for="tm-photo">${t("plan.task.photo.label")}</label>
          ${task?.photoDataUrl ? `<div style="margin-bottom:8px"><img src="${task.photoDataUrl}" alt="Photo actuelle" class="ticket-photo" style="max-width:100%;border-radius:8px;border:1px solid #ddd;" /></div>` : ""}
          <input id="tm-photo" name="taskPhoto" type="file" accept="image/*" />
        </div>
        <div class="field full modal-actions">
          ${isEdit ? `<button type="button" class="button button-danger" id="tm-delete">${t("plan.task.delete")}</button>` : ""}
          <button type="submit" class="button">${isEdit ? t("plan.task.save") : t("plan.task.create")}</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add("visible"));

  const close = (cb) => { overlay.classList.remove("visible"); setTimeout(() => { overlay.remove(); cb?.(); }, 210); };
  overlay.querySelector(".modal-close").addEventListener("click", () => close());
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  setTimeout(() => overlay.querySelector("#tm-title")?.focus(), 50);

  // ── Schedule-aware collaborator select ────────────────────────────────────
  function restSetForDate(dateStr) {
    if (!dateStr) return new Set();
    const d = new Date(dateStr + "T00:00:00");
    const wt = weekTypeForDate(d);
    const dk = schedKeyForDate(d);
    return new Set(
      collaborators
        .filter((c) => c.schedule && !scheduleDay(c, wt, dk).active)
        .map((c) => c.id)
    );
  }

  function refreshCollabSelect() {
    const dateStr = overlay.querySelector("#tm-date").value;
    const restSet = restSetForDate(dateStr);
    const sel = overlay.querySelector("#tm-collab");
    const currentVal = sel.value || (task?.collaboratorId ?? "");

    sel.innerHTML = `<option value="">${t("plan.task.none")}</option>` +
      collaborators.map((c) => {
        const isRest = restSet.has(c.id);
        const label = isRest ? `${escHtml(c.name)} (Repos)` : escHtml(c.name);
        return `<option value="${escHtml(c.id)}" ${currentVal === c.id ? "selected" : ""} data-rest="${isRest ? "1" : "0"}">${label}</option>`;
      }).join("");

    refreshRestWarn(restSet);
  }

  function refreshRestWarn(restSet) {
    const warn   = overlay.querySelector("#tm-rest-warn");
    const submit = overlay.querySelector("[type='submit']");
    const collabId = overlay.querySelector("#tm-collab").value;
    if (collabId && restSet.has(collabId)) {
      warn.textContent = "⚠ Ce collaborateur est en repos ce jour-là. Choisissez un autre collaborateur.";
      warn.style.display = "block";
      submit.disabled = true;
    } else {
      warn.style.display = "none";
      submit.disabled = false;
    }
  }

  refreshCollabSelect();
  overlay.querySelector("#tm-date").addEventListener("change", refreshCollabSelect);
  overlay.querySelector("#tm-collab").addEventListener("change", () => {
    refreshRestWarn(restSetForDate(overlay.querySelector("#tm-date").value));
  });
  // ─────────────────────────────────────────────────────────────────────────

  if (isEdit) {
    overlay.querySelector("#tm-delete").addEventListener("click", () => {
      if (!confirm(t("plan.task.delete.confirm"))) return;
      state.planningTasks = (state.planningTasks || []).filter((pt) => pt.id !== task.id);
      persistState();
      close(onSave);
    });
  }

  overlay.querySelector("#taskModalForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const collabId = fd.get("collaboratorId");
    const dateStr  = fd.get("date");
    if (collabId && restSetForDate(dateStr).has(collabId)) return;
    const photoFile = fd.get("taskPhoto");
    const photoDataUrl = photoFile instanceof File && photoFile.size > 0
      ? await toDataUrl(photoFile)
      : (isEdit ? (task?.photoDataUrl || "") : "");
    const saved = normalizePlanningTask({
      id: isEdit ? task.id : nextPlanningTaskId(),
      title: fd.get("title"),
      description: fd.get("description"),
      collaboratorId: fd.get("collaboratorId"),
      date: fd.get("date"),
      estimatedHours: fd.get("estimatedHours"),
      status: isEdit ? task.status : "planifie",
      createdAt: isEdit ? task.createdAt : new Date().toISOString(),
      photoDataUrl,
    });
    if (isEdit) {
      state.planningTasks = (state.planningTasks || []).map((pt) => pt.id === saved.id ? saved : pt);
    } else {
      if (!Array.isArray(state.planningTasks)) state.planningTasks = [];
      state.planningTasks.push(saved);
    }
    persistState();
    close(onSave);
  });
}

function showPlanningExtTaskModal({ date, prestataires, task = null, onSave }) {
  const isEdit = !!task;
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal-box card" role="dialog" aria-modal="true">
      <div class="modal-head">
        <h3>${isEdit ? t("plan.ext.task.edit") : t("plan.ext.task.new")}</h3>
        <button class="modal-close" type="button" aria-label="Fermer">&#x2715;</button>
      </div>
      <form class="modal-form form-grid" id="extTaskModalForm">
        <div class="field full">
          <label for="etm-title">${t("plan.task.title.label")} <span style="color:#c0392b">*</span></label>
          <input id="etm-title" name="title" type="text" value="${escHtml(task?.title || "")}" required autocomplete="off" />
        </div>
        <div class="field">
          <label for="etm-date">${t("plan.task.date.label")}</label>
          <input id="etm-date" name="date" type="date" value="${escHtml(task?.date || date || today())}" required />
        </div>
        <div class="field">
          <label for="etm-prest">${t("plan.ext.partner")}</label>
          <select id="etm-prest" name="prestataireId" required>
            <option value="">${t("plan.ext.task.partner.none")}</option>
            ${prestataires.map((p) => `<option value="${escHtml(p.id)}" ${task?.prestataireId === p.id ? "selected" : ""}>${escHtml(p.name)}${p.company ? ` — ${escHtml(p.company)}` : ""}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label for="etm-hours">${t("plan.task.hours.label")}</label>
          <input id="etm-hours" name="estimatedHours" type="number" min="0.25" max="24" step="0.25" value="${task?.estimatedHours ?? 1}" />
        </div>
        <div class="field full">
          <label for="etm-desc">${t("plan.task.notes.label")}</label>
          <textarea id="etm-desc" name="description" rows="2" placeholder="${escHtml(t("plan.task.notes.ph"))}">${escHtml(task?.description || "")}</textarea>
        </div>
        <div class="field full">
          <label for="etm-photo">${t("plan.task.photo.label")}</label>
          ${task?.photoDataUrl ? `<div style="margin-bottom:8px"><img src="${task.photoDataUrl}" alt="Photo actuelle" class="ticket-photo" style="max-width:100%;border-radius:8px;border:1px solid #ddd;" /></div>` : ""}
          <input id="etm-photo" name="taskPhoto" type="file" accept="image/*" />
        </div>
        <div class="field full modal-actions">
          ${isEdit ? `<button type="button" class="button button-danger" id="etm-delete">${t("plan.task.delete")}</button>` : ""}
          <button type="submit" class="button">${isEdit ? t("plan.task.save") : t("plan.task.create")}</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add("visible"));

  const close = (cb) => { overlay.classList.remove("visible"); setTimeout(() => { overlay.remove(); cb?.(); }, 210); };
  overlay.querySelector(".modal-close").addEventListener("click", () => close());
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  setTimeout(() => overlay.querySelector("#etm-title")?.focus(), 50);

  if (isEdit) {
    overlay.querySelector("#etm-delete").addEventListener("click", () => {
      if (!confirm(t("plan.task.delete.confirm"))) return;
      state.planningTasks = (state.planningTasks || []).filter((pt) => pt.id !== task.id);
      persistState();
      close(onSave);
    });
  }

  overlay.querySelector("#extTaskModalForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const photoFile = fd.get("taskPhoto");
    const photoDataUrl = photoFile instanceof File && photoFile.size > 0
      ? await toDataUrl(photoFile)
      : (isEdit ? (task?.photoDataUrl || "") : "");
    const saved = normalizePlanningTask({
      id: isEdit ? task.id : nextPlanningTaskId(),
      title: fd.get("title"),
      description: fd.get("description"),
      collaboratorId: "",
      prestataireId: fd.get("prestataireId"),
      date: fd.get("date"),
      estimatedHours: fd.get("estimatedHours"),
      status: isEdit ? task.status : "planifie",
      createdAt: isEdit ? task.createdAt : new Date().toISOString(),
      photoDataUrl,
    });
    if (isEdit) {
      state.planningTasks = (state.planningTasks || []).map((pt) => pt.id === saved.id ? saved : pt);
    } else {
      if (!Array.isArray(state.planningTasks)) state.planningTasks = [];
      state.planningTasks.push(saved);
    }
    persistState();
    close(onSave);
  });
}

function showPlanningTaskCollabModal(task) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal-box card" role="dialog" aria-modal="true">
      <div class="modal-head">
        <h3>${escHtml(task.title)}</h3>
        <button class="modal-close" type="button" aria-label="Fermer">&#x2715;</button>
      </div>
      <div style="padding:16px 20px;display:flex;flex-direction:column;gap:14px;">
        ${task.description ? `<p style="margin:0">${escHtml(task.description)}</p>` : ""}
        <dl class="ticket-details">
          <div><dt>${t("plan.task.date.label")}</dt><dd>${formatDate(task.date)}</dd></div>
          <div><dt>${t("ticket.estimated")}</dt><dd>${formatHours(task.estimatedHours || 0)}</dd></div>
          <div><dt>${t("emp.table.status")}</dt><dd><span class="badge badge-status" data-status="${task.status}">${statusLabel(task.status)}</span></dd></div>
        </dl>
        ${task.photoDataUrl ? `<div class="ticket-photo-wrap"><p class="detail-label">Photo</p><img class="ticket-photo" src="${task.photoDataUrl}" alt="Photo de la tâche" /></div>` : ""}
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${task.status === "planifie" ? `<button class="button" type="button" id="ptcm-start">${t("collab.start")}</button>` : ""}
          ${task.status === "en_cours" ? `<button class="button" type="button" id="ptcm-finish">${t("collab.finish")}</button>` : ""}
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add("visible"));

  const close = () => { overlay.classList.remove("visible"); setTimeout(() => overlay.remove(), 200); };
  overlay.querySelector(".modal-close").addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

  overlay.querySelector("#ptcm-start")?.addEventListener("click", () => {
    updatePlanningTask(task.id, { status: "en_cours" });
    toast(t("collab.started"));
    close();
  });
  overlay.querySelector("#ptcm-finish")?.addEventListener("click", () => {
    updatePlanningTask(task.id, { status: "termine" });
    toast(t("collab.finished"));
    close();
  });
}

function showTicketDetailModal(ticket) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";

  const ticketPhotos = ticket.photos?.length > 0 ? ticket.photos : (ticket.photoDataUrl ? [ticket.photoDataUrl] : []);
  const hasPhoto = ticketPhotos.length > 0;
  const thread   = ticketInfoThread(ticket);
  const site     = ticket.siteId ? findSite(ticket.siteId) : null;
  const zone     = ticket.zoneId ? findZone(ticket.siteId, ticket.zoneId) : null;
  const siteLabel = site ? `${site.name}${site.address ? ` — ${site.address}` : ""}${zone ? ` › ${zone.name}` : ""}` : null;

  const detailsHtml = [
    siteLabel                ? detailItem(t("ticket.site"),      siteLabel)                        : "",
    ticket.plannedDate       ? detailItem(t("ticket.validated"), formatDate(ticket.plannedDate))    : "",
    ticket.estimatedHours    ? detailItem(t("ticket.estimated"), formatHours(ticket.estimatedHours)): "",
  ].join("");

  const chatHtml = thread.length > 0 ? `
    <div class="tdm-chat-section">
      <button class="button ghost tdm-chat-toggle" type="button">
        💬 ${thread.length > 1 ? `${thread.length} messages` : "1 message"}
      </button>
      <div class="tdm-chat-panel" hidden>
        ${thread.map((msg) => `
          <div class="tdm-chat-msg tdm-chat-msg--${msg.authorRole}">
            <span class="tdm-chat-role">${msg.authorRole === "manager" ? "Manager" : "Employé"}</span>
            <p class="tdm-chat-text">${escHtml(msg.text)}</p>
            ${msg.at ? `<span class="tdm-chat-time">${formatDateTime(msg.at)}</span>` : ""}
          </div>
        `).join("")}
      </div>
    </div>
  ` : "";

  overlay.innerHTML = `
    <div class="modal-box card" role="dialog" aria-modal="true" style="max-width:560px">
      <div class="modal-head">
        <h3>${escHtml(ticket.title)}</h3>
        <button class="modal-close" type="button" aria-label="Fermer">&#x2715;</button>
      </div>
      <div style="padding:0 20px 20px;display:grid;gap:12px">
        <div class="ticket-meta-row">
          <span class="badge badge-status" data-status="${ticket.status}">${statusLabel(ticket.status)}</span>
          <span class="badge badge-priority" data-priority="${ticket.priority}">${priorityLabel(ticket.priority)}</span>
        </div>
        ${ticket.description ? `<p style="margin:0">${escHtml(ticket.description)}</p>` : ""}
        ${detailsHtml ? `<dl class="ticket-details">${detailsHtml}</dl>` : ""}
        ${hasPhoto ? `<div class="ticket-photo-wrap"><p class="detail-label">Photo${ticketPhotos.length > 1 ? "s" : ""}</p><div id="tdm-photo-host" class="tdm-photo-host"></div></div>` : ""}
        ${chatHtml}
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add("visible"));

  if (hasPhoto) {
    const host = overlay.querySelector("#tdm-photo-host");
    ticketPhotos.forEach((url, i) => {
      const img = document.createElement("img");
      img.className = "ticket-photo";
      img.alt = `Photo ${i + 1}`;
      img.src = url;
      host.appendChild(img);
    });
  }

  overlay.querySelector(".tdm-chat-toggle")?.addEventListener("click", () => {
    const panel  = overlay.querySelector(".tdm-chat-panel");
    const btn    = overlay.querySelector(".tdm-chat-toggle");
    const open   = panel.hidden;
    panel.hidden = !open;
    btn.textContent = open ? "🔼 Fermer les messages" : `💬 ${thread.length > 1 ? `${thread.length} messages` : "1 message"}`;
  });

  const close = () => { overlay.classList.remove("visible"); setTimeout(() => overlay.remove(), 200); };
  overlay.querySelector(".modal-close").addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
}

function showIcalModal(url) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal-box card" role="dialog" aria-modal="true" style="max-width:480px">
      <div class="modal-head">
        <h3>Synchronisation Calendrier</h3>
        <button class="modal-close" type="button" aria-label="Fermer">&#x2715;</button>
      </div>
      <div style="padding:0 20px 20px;display:grid;gap:14px">
        <p>Copiez ce lien et ajoutez-le à Google Calendar, Outlook ou tout autre agenda compatible iCal&nbsp;:</p>
        <div style="display:flex;gap:8px;align-items:center">
          <input id="icalUrlInput" type="text" value="${escHtml(url)}" readonly
            style="flex:1;border-radius:10px;border:1px solid rgba(0,0,0,.14);padding:8px 12px;font:inherit;font-size:0.78rem;background:#f9f9f9" />
          <button class="button" type="button" id="icalCopyBtn">Copier</button>
        </div>
        <p class="subtle" style="font-size:0.8rem">
          Dans Google Calendar : &laquo;&nbsp;Autres agendas → Depuis l'URL&nbsp;&raquo;<br>
          Dans Outlook : &laquo;&nbsp;Ajouter un calendrier → Abonnement&nbsp;&raquo;
        </p>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add("visible"));

  const close = () => { overlay.classList.remove("visible"); setTimeout(() => overlay.remove(), 200); };
  overlay.querySelector(".modal-close").addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

  overlay.querySelector("#icalCopyBtn").addEventListener("click", () => {
    navigator.clipboard.writeText(url).then(() => {
      const btn = overlay.querySelector("#icalCopyBtn");
      btn.textContent = "Copié !";
      setTimeout(() => { btn.textContent = "Copier"; }, 2000);
    });
  });

  overlay.querySelector("#icalUrlInput").addEventListener("click", (e) => { e.target.select(); });
}

function exportPlanningExcel(collaborators, weekDays) {
  if (typeof XLSX === "undefined") {
    toast(t("plan.export.unavail"));
    return;
  }
  const startDate = localDateStr(weekDays[0]);
  const endDate = localDateStr(weekDays[weekDays.length - 1]);

  const allRows = [];

  state.tickets
    .filter((tk) => {
      const d = tk.plannedDate || tk.desiredDate;
      return d && d >= startDate && d <= endDate && ["planifie", "en_cours", "termine"].includes(tk.status);
    })
    .forEach((tk) => {
      const assignee = findUser(tk.assignedTo);
      allRows.push({
        Date: tk.plannedDate || tk.desiredDate || "",
        Titre: tk.title || "",
        Type: "Ticket",
        Référence: tk.id,
        Collaborateur: assignee ? assignee.name : "—",
        "Heures estimées": tk.estimatedHours || 0,
        "Heures réelles": tk.actualHours != null ? tk.actualHours : "—",
        Statut: statusLabel(tk.status),
        Catégorie: Array.isArray(tk.categoryPath) ? tk.categoryPath.join(" › ") : (tk.categoryValue || ""),
      });
    });

  (state.planningTasks || [])
    .filter((pt) => pt.date >= startDate && pt.date <= endDate)
    .forEach((pt) => {
      const assignee = collaborators.find((c) => c.id === pt.collaboratorId);
      allRows.push({
        Date: pt.date,
        Titre: pt.title,
        Type: "Tâche planning",
        Référence: pt.id,
        Collaborateur: assignee ? assignee.name : "—",
        "Heures estimées": pt.estimatedHours || 0,
        "Heures réelles": pt.actualHours != null ? pt.actualHours : "—",
        Statut: statusLabel(pt.status),
        Catégorie: pt.description || "",
      });
    });

  if (allRows.length === 0) {
    toast(t("plan.export.empty"));
    return;
  }

  allRows.sort((a, b) => {
    if (a.Date < b.Date) return -1;
    if (a.Date > b.Date) return 1;
    return a.Collaborateur.localeCompare(b.Collaborateur);
  });

  const wb = XLSX.utils.book_new();
  const wsAll = XLSX.utils.json_to_sheet(allRows);
  XLSX.utils.book_append_sheet(wb, wsAll, "Toutes les tâches");

  const byCollab = {};
  allRows.forEach((row) => {
    const key = row.Collaborateur || "Non assigné";
    if (!byCollab[key]) byCollab[key] = [];
    byCollab[key].push(row);
  });
  Object.entries(byCollab).forEach(([name, rows]) => {
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
  });

  const filename = `famitask_planning_${startDate}_${endDate}.xlsx`;
  XLSX.writeFile(wb, filename);
  toast(`${t("plan.export.done")} ${filename}`);
}

function renderManagerPlanning(container, collaborators) {
  function getWeekDays() {
    const now = new Date();
    const dow = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((dow === 0 ? 7 : dow) - 1) + planningWeekOffset * 7);
    monday.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  }

  function renderWeek() {
    const days = getWeekDays();
    const weekLabel = `${formatDate(localDateStr(days[0]))} – ${formatDate(localDateStr(days[6]))}`;
    const weekStart = localDateStr(days[0]);
    const weekEnd   = localDateStr(days[6]);

    // ── Planning interne (collaborateurs) ────────────────────────────────────
    let calTickets = state.tickets.filter((tk) => ["planifie", "en_cours", "termine"].includes(tk.status) && tk.assignedTo);
    let calTasks   = (state.planningTasks || []).slice();
    if (planningFilterCollab) {
      calTickets = calTickets.filter((tk) => tk.assignedTo === planningFilterCollab);
      calTasks   = calTasks.filter((pt) => pt.collaboratorId === planningFilterCollab);
    }
    const weekTickets = calTickets.filter((tk) => { const d = tk.plannedDate || tk.desiredDate; return d && d >= weekStart && d <= weekEnd; });
    const weekTasks   = calTasks.filter((pt) => pt.date >= weekStart && pt.date <= weekEnd);
    const weekTotal   = [...weekTickets, ...weekTasks].reduce((s, x) => s + (x.estimatedHours || 0), 0);

    // ── Planning externe (prestataires) ──────────────────────────────────────
    const prestataires = loadPrestataires();
    let extTickets = state.tickets.filter((tk) =>
      ["planifie", "en_cours", "termine"].includes(tk.status) && tk.assignedToExternal
    );
    let extPlanningTasks = (state.planningTasks || []).filter((pt) => pt.prestataireId);
    if (planningFilterPrestataire) {
      extTickets = extTickets.filter((tk) => tk.assignedToExternal === planningFilterPrestataire);
      extPlanningTasks = extPlanningTasks.filter((pt) => pt.prestataireId === planningFilterPrestataire);
    }
    const weekExtTickets = extTickets.filter((tk) => { const d = tk.plannedDate || tk.desiredDate; return d && d >= weekStart && d <= weekEnd; });
    const weekExtTasks   = extPlanningTasks.filter((pt) => pt.date >= weekStart && pt.date <= weekEnd);
    const weekExtTotal   = [...weekExtTickets, ...weekExtTasks].reduce((s, x) => s + (x.estimatedHours || 0), 0);

    container.innerHTML = `
      <section class="card">
        <div class="section-head">
          <div>
            <h2>${t("plan.title")}</h2>
            <p class="subtle">${weekLabel} · ${t("plan.week.total")} <strong>${formatHours(weekTotal)}</strong></p>
          </div>
          <div class="planning-controls">
            <div class="plan-view-toggle">
              <button class="button ghost active" id="viewWeekBtn">${t("plan.view.week")}</button>
              <button class="button ghost" id="viewMonthBtn">${t("plan.view.month")}</button>
            </div>
            <button class="button ghost" id="prevWeekBtn">${t("plan.prev")}</button>
            <button class="button ghost" id="todayBtn">${t("plan.today")}</button>
            <button class="button ghost" id="nextWeekBtn">${t("plan.next")}</button>
            <button class="button" id="exportExcelBtn" style="background:var(--accent-strong);">${t("plan.export")}</button>
          </div>
        </div>
        <div class="planning-filter-bar">
          <label for="planCollab">${t("plan.collab.label")}</label>
          <select id="planCollab">
            <option value="">${t("plan.collab.all")}</option>
            ${collaborators.map((c) => `<option value="${escHtml(c.id)}" ${planningFilterCollab === c.id ? "selected" : ""}>${escHtml(c.name)}</option>`).join("")}
          </select>
        </div>
        <div class="cal-week">
          ${days.map((day) => {
            const dateStr   = localDateStr(day);
            const dayTickets = calTickets.filter((tk) => (tk.plannedDate || tk.desiredDate) === dateStr);
            const dayTasks   = calTasks.filter((pt) => pt.date === dateStr);
            const isToday    = dateStr === today();
            const dayName    = new Intl.DateTimeFormat("fr-BE", { weekday: "short" }).format(day);
            const dayNum     = new Intl.DateTimeFormat("fr-BE", { day: "numeric", month: "short" }).format(day);
            const dayTotal   = [...dayTickets, ...dayTasks].reduce((s, x) => s + (x.estimatedHours || 0), 0);
            const isEmpty    = dayTickets.length === 0 && dayTasks.length === 0;
            return `
              <div class="cal-day${isToday ? " cal-day--today" : ""}">
                <div class="cal-day-head">
                  <div class="cal-day-head-left">
                    <span class="cal-weekday">${dayName}</span>
                    <span class="cal-daynum">${dayNum}</span>
                  </div>
                  <button class="cal-add-btn" data-add-date="${escHtml(dateStr)}" title="${escHtml(t("plan.task.new"))}">+</button>
                </div>
                ${dayTotal > 0 ? `<div class="cal-day-total">${formatHours(dayTotal)}</div>` : ""}
                <div class="cal-day-body">
                  ${isEmpty ? '<span class="cal-empty">—</span>' : ""}
                  ${dayTickets.map((tk) => {
                    const assignee = findUser(tk.assignedTo);
                    return `
                      <div class="cal-ticket" data-status="${tk.status}" data-priority="${tk.priority}">
                        <span class="cal-ticket-title">${escHtml(tk.title)}</span>
                        ${assignee ? `<span class="cal-ticket-who">${escHtml(assignee.name)}</span>` : ""}
                        <span class="cal-ticket-hours">${formatHours(tk.estimatedHours || 0)}</span>
                        <span class="badge badge-status" data-status="${tk.status}">${statusLabel(tk.status)}</span>
                      </div>
                    `;
                  }).join("")}
                  ${dayTasks.map((pt) => {
                    const assignee = collaborators.find((c) => c.id === pt.collaboratorId);
                    return `
                      <button class="cal-task-item" data-task-id="${escHtml(pt.id)}" data-status="${pt.status}" title="${escHtml(t("plan.task.edit"))}">
                        <span class="cal-task-title">${escHtml(pt.title)}</span>
                        ${assignee ? `<span class="cal-task-who">${escHtml(assignee.name)}</span>` : ""}
                        <span class="cal-task-hours">${formatHours(pt.estimatedHours || 0)}${pt.actualHours != null ? ` / ${formatHours(pt.actualHours)}` : ""}</span>
                        <span class="badge badge-status" data-status="${pt.status}">${statusLabel(pt.status)}</span>
                      </button>
                    `;
                  }).join("")}
                </div>
              </div>
            `;
          }).join("")}
        </div>
      </section>

      <section class="card" style="margin-top:20px;">
        <div class="section-head">
          <div>
            <h2>🏢 ${t("plan.ext.title")}</h2>
            <p class="subtle">${weekLabel} · ${t("plan.week.total")} <strong>${formatHours(weekExtTotal)}</strong></p>
          </div>
        </div>
        ${prestataires.length === 0 ? `<div class="empty-state">${t("plan.ext.none")}</div>` : `
        <div class="planning-filter-bar">
          <label for="planPrestataire">${t("plan.ext.partner")}</label>
          <select id="planPrestataire">
            <option value="">${t("plan.ext.all")}</option>
            ${prestataires.map((p) => `<option value="${escHtml(p.id)}" ${planningFilterPrestataire === p.id ? "selected" : ""}>${escHtml(p.name)}${p.company ? ` — ${escHtml(p.company)}` : ""}</option>`).join("")}
          </select>
        </div>
        ${weekExtTickets.length === 0 && weekExtTasks.length === 0 ? `<div class="empty-state">${t("plan.ext.empty")}</div>` : ""}
        <div class="cal-week">
          ${days.map((day) => {
            const dateStr     = localDateStr(day);
            const dayExt      = extTickets.filter((tk) => (tk.plannedDate || tk.desiredDate) === dateStr);
            const dayExtTasks = extPlanningTasks.filter((pt) => pt.date === dateStr);
            const isToday     = dateStr === today();
            const dayName     = new Intl.DateTimeFormat("fr-BE", { weekday: "short" }).format(day);
            const dayNum      = new Intl.DateTimeFormat("fr-BE", { day: "numeric", month: "short" }).format(day);
            const dayTotal    = [...dayExt, ...dayExtTasks].reduce((s, x) => s + (x.estimatedHours || 0), 0);
            return `
              <div class="cal-day${isToday ? " cal-day--today" : ""}">
                <div class="cal-day-head">
                  <div class="cal-day-head-left">
                    <span class="cal-weekday">${dayName}</span>
                    <span class="cal-daynum">${dayNum}</span>
                  </div>
                  <button class="cal-add-btn" data-ext-add-date="${escHtml(dateStr)}" title="${escHtml(t("plan.ext.task.new"))}">+</button>
                </div>
                ${dayTotal > 0 ? `<div class="cal-day-total">${formatHours(dayTotal)}</div>` : ""}
                <div class="cal-day-body">
                  ${dayExt.length === 0 && dayExtTasks.length === 0 ? '<span class="cal-empty">—</span>' : ""}
                  ${dayExt.map((tk) => {
                    const prest = prestataires.find((p) => p.id === tk.assignedToExternal);
                    return `
                      <div class="cal-ticket cal-ticket--ext is-clickable" data-status="${tk.status}" data-priority="${tk.priority}" data-ext-ticket-id="${escHtml(tk.id)}" role="button" tabindex="0">
                        <span class="cal-ticket-title">${escHtml(tk.title)}</span>
                        ${prest ? `<span class="cal-ticket-who">🏢 ${escHtml(prest.name)}</span>` : ""}
                        <span class="cal-ticket-hours">${formatHours(tk.estimatedHours || 0)}</span>
                        <span class="badge badge-status" data-status="${tk.status}">${statusLabel(tk.status)}</span>
                      </div>
                    `;
                  }).join("")}
                  ${dayExtTasks.map((pt) => {
                    const prest = prestataires.find((p) => p.id === pt.prestataireId);
                    return `
                      <button class="cal-task-item" data-ext-task-id="${escHtml(pt.id)}" data-status="${pt.status}" title="${escHtml(t("plan.ext.task.edit"))}">
                        <span class="cal-task-title">${escHtml(pt.title)}</span>
                        ${prest ? `<span class="cal-task-who">🏢 ${escHtml(prest.name)}</span>` : ""}
                        <span class="cal-task-hours">${formatHours(pt.estimatedHours || 0)}</span>
                        <span class="badge badge-status" data-status="${pt.status}">${statusLabel(pt.status)}</span>
                      </button>
                    `;
                  }).join("")}
                </div>
              </div>
            `;
          }).join("")}
        </div>
        `}
      </section>
    `;

    container.querySelector("#prevWeekBtn").addEventListener("click", () => { planningWeekOffset--; renderWeek(); });
    container.querySelector("#todayBtn").addEventListener("click", () => { planningWeekOffset = 0; renderWeek(); });
    container.querySelector("#nextWeekBtn").addEventListener("click", () => { planningWeekOffset++; renderWeek(); });
    container.querySelector("#planCollab").addEventListener("change", (e) => { planningFilterCollab = e.target.value; renderWeek(); });
    container.querySelector("#exportExcelBtn").addEventListener("click", () => exportPlanningExcel(collaborators, days));
    container.querySelector("#planPrestataire")?.addEventListener("change", (e) => { planningFilterPrestataire = e.target.value; renderWeek(); });

    container.querySelectorAll(".cal-ticket--ext[data-ext-ticket-id]").forEach((card) => {
      const open = (e) => {
        if (e.target.closest("button")) return;
        const tk = state.tickets.find((t) => t.id === card.dataset.extTicketId);
        if (!tk) return;
        managerSubPage = "demandes";
        managerExpandedTicketId = tk.id;
        render();
      };
      card.addEventListener("click", open);
      card.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(e); } });
    });

    container.querySelectorAll(".cal-add-btn[data-add-date]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        showPlanningTaskModal({ date: e.currentTarget.dataset.addDate, collaborators, onSave: renderWeek });
      });
    });

    container.querySelectorAll(".cal-task-item[data-task-id]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const taskId = btn.dataset.taskId;
        const found = (state.planningTasks || []).find((pt) => pt.id === taskId);
        if (found) showPlanningTaskModal({ date: found.date, collaborators, task: found, onSave: renderWeek });
      });
    });

    container.querySelectorAll(".cal-add-btn[data-ext-add-date]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        showPlanningExtTaskModal({ date: e.currentTarget.dataset.extAddDate, prestataires, onSave: renderWeek });
      });
    });

    container.querySelectorAll(".cal-task-item[data-ext-task-id]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const taskId = btn.dataset.extTaskId;
        const found = (state.planningTasks || []).find((pt) => pt.id === taskId);
        if (found) showPlanningExtTaskModal({ date: found.date, prestataires, task: found, onSave: renderWeek });
      });
    });

    container.querySelector("#viewWeekBtn").addEventListener("click", () => { planningViewMode = "week"; renderWeek(); });
    container.querySelector("#viewMonthBtn").addEventListener("click", () => { planningViewMode = "month"; renderMonth(); });
  }

  function renderMonth() {
    const now = new Date();
    const baseMonth = new Date(now.getFullYear(), now.getMonth() + planningMonthOffset, 1);
    const year = baseMonth.getFullYear();
    const month = baseMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const langCode = getLang() === "nl" ? "nl-BE" : "fr-BE";
    const monthLabel = new Intl.DateTimeFormat(langCode, { month: "long", year: "numeric" }).format(firstDay);
    const monthStart = localDateStr(firstDay);
    const monthEnd = localDateStr(lastDay);

    const startDow = firstDay.getDay();
    const paddingDays = startDow === 0 ? 6 : startDow - 1;
    const gridDays = [];
    for (let i = paddingDays; i > 0; i--) {
      gridDays.push({ date: new Date(year, month, 1 - i), isCurrentMonth: false });
    }
    for (let i = 1; i <= lastDay.getDate(); i++) {
      gridDays.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    const tail = gridDays.length % 7;
    if (tail !== 0) {
      for (let i = 1; i <= 7 - tail; i++) {
        gridDays.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
      }
    }

    let calTickets = state.tickets.filter((tk) => ["planifie", "en_cours", "termine"].includes(tk.status) && tk.assignedTo);
    let calTasks = (state.planningTasks || []).slice();
    if (planningFilterCollab) {
      calTickets = calTickets.filter((tk) => tk.assignedTo === planningFilterCollab);
      calTasks = calTasks.filter((pt) => pt.collaboratorId === planningFilterCollab);
    }
    const monthTickets = calTickets.filter((tk) => { const d = tk.plannedDate || tk.desiredDate; return d && d >= monthStart && d <= monthEnd; });
    const monthTasks = calTasks.filter((pt) => pt.date >= monthStart && pt.date <= monthEnd);
    const monthTotal = [...monthTickets, ...monthTasks].reduce((s, x) => s + (x.estimatedHours || 0), 0);

    const prestataires = loadPrestataires();
    let extTickets = state.tickets.filter((tk) => ["planifie", "en_cours", "termine"].includes(tk.status) && tk.assignedToExternal);
    let extPlanningTasks = (state.planningTasks || []).filter((pt) => pt.prestataireId);
    if (planningFilterPrestataire) {
      extTickets = extTickets.filter((tk) => tk.assignedToExternal === planningFilterPrestataire);
      extPlanningTasks = extPlanningTasks.filter((pt) => pt.prestataireId === planningFilterPrestataire);
    }
    const monthExtTickets = extTickets.filter((tk) => { const d = tk.plannedDate || tk.desiredDate; return d && d >= monthStart && d <= monthEnd; });
    const monthExtTasks   = extPlanningTasks.filter((pt) => pt.date >= monthStart && pt.date <= monthEnd);
    const monthExtTotal   = [...monthExtTickets, ...monthExtTasks].reduce((s, x) => s + (x.estimatedHours || 0), 0);

    const weekdays = getLang() === "nl"
      ? ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"]
      : ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

    function buildMonthGrid(dayTicketsFn, dayTasksFn, showAddBtn) {
      return gridDays.map(({ date, isCurrentMonth }) => {
        const dateStr = localDateStr(date);
        const isToday = dateStr === today();
        const dayTk = dayTicketsFn(dateStr);
        const dayPt = dayTasksFn(dateStr);
        const dayTotal = [...dayTk, ...dayPt].reduce((s, x) => s + (x.estimatedHours || 0), 0);
        return `
          <div class="cal-month-day${isToday ? " cal-month-day--today" : ""}${!isCurrentMonth ? " cal-month-day--other" : ""}">
            <div class="cal-month-day-head">
              <span class="cal-month-daynum">${date.getDate()}</span>
              ${dayTotal > 0 ? `<span class="cal-month-total">${formatHours(dayTotal)}</span>` : ""}
              ${showAddBtn && isCurrentMonth ? `<button class="cal-add-btn" data-add-date="${escHtml(dateStr)}" title="${escHtml(t("plan.task.new"))}">+</button>` : ""}
            </div>
            <div class="cal-month-body">
              ${dayTk.map((tk) => `<div class="cal-month-item" data-status="${tk.status}" title="${escHtml(tk.title)}">${escHtml(tk.title)}</div>`).join("")}
              ${dayPt.map((pt) => `<div class="cal-month-item cal-month-item--task" data-status="${pt.status}" title="${escHtml(pt.title)}">${escHtml(pt.title)}</div>`).join("")}
            </div>
          </div>
        `;
      }).join("");
    }

    function buildMonthGridExt(dayExtFn, dayExtTasksFn) {
      return gridDays.map(({ date, isCurrentMonth }) => {
        const dateStr    = localDateStr(date);
        const isToday    = dateStr === today();
        const dayExt     = dayExtFn(dateStr);
        const dayExtTasks = dayExtTasksFn ? dayExtTasksFn(dateStr) : [];
        const dayTotal   = [...dayExt, ...dayExtTasks].reduce((s, x) => s + (x.estimatedHours || 0), 0);
        return `
          <div class="cal-month-day${isToday ? " cal-month-day--today" : ""}${!isCurrentMonth ? " cal-month-day--other" : ""}">
            <div class="cal-month-day-head">
              <span class="cal-month-daynum">${date.getDate()}</span>
              ${dayTotal > 0 ? `<span class="cal-month-total">${formatHours(dayTotal)}</span>` : ""}
              ${isCurrentMonth ? `<button class="cal-add-btn" data-ext-add-date="${escHtml(dateStr)}" title="${escHtml(t("plan.ext.task.new"))}">+</button>` : ""}
            </div>
            <div class="cal-month-body">
              ${dayExt.map((tk) => {
                const prest = prestataires.find((p) => p.id === tk.assignedToExternal);
                return `<div class="cal-month-item cal-month-item--ext" data-status="${tk.status}" data-ext-ticket-id="${escHtml(tk.id)}" title="${escHtml(tk.title)}">${escHtml(tk.title)}${prest ? ` (${escHtml(prest.name)})` : ""}</div>`;
              }).join("")}
              ${dayExtTasks.map((pt) => {
                const prest = prestataires.find((p) => p.id === pt.prestataireId);
                return `<div class="cal-month-item cal-month-item--ext-task" data-ext-task-id="${escHtml(pt.id)}" data-status="${pt.status}" title="${escHtml(pt.title)}">${escHtml(pt.title)}${prest ? ` (${escHtml(prest.name)})` : ""}</div>`;
              }).join("")}
            </div>
          </div>
        `;
      }).join("");
    }

    container.innerHTML = `
      <section class="card">
        <div class="section-head">
          <div>
            <h2>${t("plan.title")}</h2>
            <p class="subtle">${monthLabel} · ${t("plan.month.total")} <strong>${formatHours(monthTotal)}</strong></p>
          </div>
          <div class="planning-controls">
            <div class="plan-view-toggle">
              <button class="button ghost" id="viewWeekBtn">${t("plan.view.week")}</button>
              <button class="button ghost active" id="viewMonthBtn">${t("plan.view.month")}</button>
            </div>
            <button class="button ghost" id="prevMonthBtn">${t("plan.prev")}</button>
            <button class="button ghost" id="todayMonthBtn">${t("plan.today")}</button>
            <button class="button ghost" id="nextMonthBtn">${t("plan.next")}</button>
            <button class="button" id="exportExcelBtn" style="background:var(--accent-strong);">${t("plan.export")}</button>
          </div>
        </div>
        <div class="planning-filter-bar">
          <label for="planCollab">${t("plan.collab.label")}</label>
          <select id="planCollab">
            <option value="">${t("plan.collab.all")}</option>
            ${collaborators.map((c) => `<option value="${escHtml(c.id)}" ${planningFilterCollab === c.id ? "selected" : ""}>${escHtml(c.name)}</option>`).join("")}
          </select>
        </div>
        <div class="cal-month">
          ${weekdays.map((d) => `<div class="cal-month-weekday">${d}</div>`).join("")}
          ${buildMonthGrid(
            (dateStr) => calTickets.filter((tk) => (tk.plannedDate || tk.desiredDate) === dateStr),
            (dateStr) => calTasks.filter((pt) => pt.date === dateStr),
            true
          )}
        </div>
      </section>

      <section class="card" style="margin-top:20px;">
        <div class="section-head">
          <div>
            <h2>🏢 ${t("plan.ext.title")}</h2>
            <p class="subtle">${monthLabel} · ${t("plan.month.total")} <strong>${formatHours(monthExtTotal)}</strong></p>
          </div>
        </div>
        ${prestataires.length === 0 ? `<div class="empty-state">${t("plan.ext.none")}</div>` : `
        <div class="planning-filter-bar">
          <label for="planPrestataire">${t("plan.ext.partner")}</label>
          <select id="planPrestataire">
            <option value="">${t("plan.ext.all")}</option>
            ${prestataires.map((p) => `<option value="${escHtml(p.id)}" ${planningFilterPrestataire === p.id ? "selected" : ""}>${escHtml(p.name)}${p.company ? ` — ${escHtml(p.company)}` : ""}</option>`).join("")}
          </select>
        </div>
        ${monthExtTickets.length === 0 && monthExtTasks.length === 0 ? `<div class="empty-state">${t("plan.ext.empty")}</div>` : ""}
        <div class="cal-month">
          ${weekdays.map((d) => `<div class="cal-month-weekday">${d}</div>`).join("")}
          ${buildMonthGridExt(
            (dateStr) => extTickets.filter((tk) => (tk.plannedDate || tk.desiredDate) === dateStr),
            (dateStr) => extPlanningTasks.filter((pt) => pt.date === dateStr)
          )}
        </div>
        `}
      </section>
    `;

    container.querySelector("#viewWeekBtn").addEventListener("click", () => { planningViewMode = "week"; renderWeek(); });
    container.querySelector("#viewMonthBtn").addEventListener("click", () => { planningViewMode = "month"; renderMonth(); });
    container.querySelector("#prevMonthBtn").addEventListener("click", () => { planningMonthOffset--; renderMonth(); });
    container.querySelector("#todayMonthBtn").addEventListener("click", () => { planningMonthOffset = 0; renderMonth(); });
    container.querySelector("#nextMonthBtn").addEventListener("click", () => { planningMonthOffset++; renderMonth(); });
    container.querySelector("#planCollab").addEventListener("change", (e) => { planningFilterCollab = e.target.value; renderMonth(); });
    container.querySelector("#exportExcelBtn").addEventListener("click", () => {
      const exportDays = gridDays.filter((d) => d.isCurrentMonth).map((d) => d.date);
      exportPlanningExcel(collaborators, exportDays);
    });
    container.querySelector("#planPrestataire")?.addEventListener("change", (e) => { planningFilterPrestataire = e.target.value; renderMonth(); });

    container.querySelectorAll(".cal-month-item--ext[data-ext-ticket-id]").forEach((item) => {
      item.addEventListener("click", () => {
        const tk = state.tickets.find((t) => t.id === item.dataset.extTicketId);
        if (!tk) return;
        managerSubPage = "demandes";
        managerExpandedTicketId = tk.id;
        render();
      });
    });

    container.querySelectorAll(".cal-add-btn[data-add-date]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        showPlanningTaskModal({ date: e.currentTarget.dataset.addDate, collaborators, onSave: renderMonth });
      });
    });

    container.querySelectorAll(".cal-add-btn[data-ext-add-date]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        showPlanningExtTaskModal({ date: e.currentTarget.dataset.extAddDate, prestataires, onSave: renderMonth });
      });
    });

    container.querySelectorAll(".cal-month-item--ext-task[data-ext-task-id]").forEach((item) => {
      item.addEventListener("click", () => {
        const taskId = item.dataset.extTaskId;
        const found = (state.planningTasks || []).find((pt) => pt.id === taskId);
        if (found) showPlanningExtTaskModal({ date: found.date, prestataires, task: found, onSave: renderMonth });
      });
    });
  }

  if (planningViewMode === "month") renderMonth(); else renderWeek();
}

function renderGlobalAgenda(container, collaborators) {
  const COLORS = [
    "#4A90D9", "#E67E22", "#2ECC71", "#9B59B6", "#E74C3C",
    "#1ABC9C", "#F39C12", "#27AE60", "#8E44AD", "#D35400",
    "#16A085", "#C0392B", "#2980B9", "#F1C40F", "#95A5A6"
  ];

  const collabColor = {};
  collaborators.forEach((c, i) => { collabColor[c.id] = COLORS[i % COLORS.length]; });

  const prestataires = loadPrestataires();
  const prestColor = {};
  prestataires.forEach((p, i) => { prestColor[p.id] = COLORS[(collaborators.length + i) % COLORS.length]; });

  function renderLegend() {
    const all = [
      ...collaborators.map((c) => ({ name: c.name, color: collabColor[c.id], icon: "" })),
      ...prestataires.map((p) => ({ name: p.name, color: prestColor[p.id], icon: "🏢 " })),
    ];
    if (all.length === 0) return "";
    return `<div class="agenda-legend">${all.map((item) =>
      `<span class="agenda-legend-item">
        <span class="agenda-legend-dot" style="background:${item.color}"></span>
        <span>${item.icon}${escHtml(item.name)}</span>
      </span>`
    ).join("")}</div>`;
  }

  function taskCard(title, who, color, hours, actualHours, status, attrs) {
    return `<button class="cal-task-item agenda-card" ${attrs} data-status="${status}"
        style="border-left:3px solid ${color};background:${color}1a;">
      <span class="cal-task-title">${escHtml(title)}</span>
      ${who ? `<span class="cal-task-who" style="color:${color}">${who}</span>` : ""}
      <span class="cal-task-hours">${formatHours(hours)}${actualHours != null ? ` / ${formatHours(actualHours)}` : ""}</span>
      <span class="badge badge-status" data-status="${status}">${statusLabel(status)}</span>
    </button>`;
  }

  function getWeekDays() {
    const now = new Date();
    const dow = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((dow === 0 ? 7 : dow) - 1) + agendaWeekOffset * 7);
    monday.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  }

  function bindWeekTasks(onSave) {
    container.querySelectorAll(".cal-task-item[data-agenda-task-id]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const found = (state.planningTasks || []).find((pt) => pt.id === btn.dataset.agendaTaskId);
        if (found) showPlanningTaskModal({ date: found.date, collaborators, task: found, onSave });
      });
    });
    container.querySelectorAll(".cal-task-item[data-agenda-ext-task-id]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const found = (state.planningTasks || []).find((pt) => pt.id === btn.dataset.agendaExtTaskId);
        if (found) showPlanningExtTaskModal({ date: found.date, prestataires, task: found, onSave });
      });
    });
  }

  function renderWeek() {
    const days = getWeekDays();
    const weekStart = localDateStr(days[0]);
    const weekEnd   = localDateStr(days[6]);
    const weekLabel = `${formatDate(weekStart)} – ${formatDate(weekEnd)}`;
    const langCode  = getLang() === "nl" ? "nl-BE" : "fr-BE";

    const allTasks   = (state.planningTasks || []).filter((pt) => pt.date >= weekStart && pt.date <= weekEnd);
    const allTickets = state.tickets.filter((tk) => {
      if (!["planifie", "en_cours", "termine"].includes(tk.status)) return false;
      const d = tk.plannedDate || tk.desiredDate;
      return d && d >= weekStart && d <= weekEnd;
    });
    const weekTotal = [...allTasks, ...allTickets].reduce((s, x) => s + (x.estimatedHours || 0), 0);

    container.innerHTML = `
      <section class="card">
        <div class="section-head">
          <div>
            <h2>📅 ${t("tab.agenda")}</h2>
            <p class="subtle">${weekLabel} · ${t("plan.week.total")} <strong>${formatHours(weekTotal)}</strong></p>
          </div>
          <div class="planning-controls">
            <div class="plan-view-toggle">
              <button class="button ghost active" id="agendaWeekBtn">${t("plan.view.week")}</button>
              <button class="button ghost" id="agendaMonthBtn">${t("plan.view.month")}</button>
            </div>
            <button class="button ghost" id="prevAgendaBtn">${t("plan.prev")}</button>
            <button class="button ghost" id="todayAgendaBtn">${t("plan.today")}</button>
            <button class="button ghost" id="nextAgendaBtn">${t("plan.next")}</button>
          </div>
        </div>
        ${renderLegend()}
        <div class="cal-week">
          ${days.map((day) => {
            const dateStr    = localDateStr(day);
            const isToday    = dateStr === today();
            const dayName    = new Intl.DateTimeFormat(langCode, { weekday: "short" }).format(day);
            const dayNum     = new Intl.DateTimeFormat(langCode, { day: "numeric", month: "short" }).format(day);
            const dayTasks   = allTasks.filter((pt) => pt.date === dateStr);
            const dayTickets = allTickets.filter((tk) => (tk.plannedDate || tk.desiredDate) === dateStr);
            const dayTotal   = [...dayTasks, ...dayTickets].reduce((s, x) => s + (x.estimatedHours || 0), 0);
            const isEmpty    = dayTasks.length === 0 && dayTickets.length === 0;

            return `
              <div class="cal-day${isToday ? " cal-day--today" : ""}">
                <div class="cal-day-head">
                  <div class="cal-day-head-left">
                    <span class="cal-weekday">${dayName}</span>
                    <span class="cal-daynum">${dayNum}</span>
                  </div>
                </div>
                ${dayTotal > 0 ? `<div class="cal-day-total">${formatHours(dayTotal)}</div>` : ""}
                <div class="cal-day-body">
                  ${isEmpty ? '<span class="cal-empty">—</span>' : ""}
                  ${dayTickets.map((tk) => {
                    const col  = collaborators.find((c) => c.id === tk.assignedTo);
                    const pres = prestataires.find((p) => p.id === tk.assignedToExternal);
                    const color = col ? collabColor[tk.assignedTo] : (pres ? prestColor[tk.assignedToExternal] : "#999");
                    const who  = col ? escHtml(col.name) : (pres ? `🏢 ${escHtml(pres.name)}` : "");
                    return taskCard(tk.title, who, color, tk.estimatedHours || 0, null, tk.status, `data-status="${tk.status}"`);
                  }).join("")}
                  ${dayTasks.filter((pt) => pt.collaboratorId).map((pt) => {
                    const col   = collaborators.find((c) => c.id === pt.collaboratorId);
                    const color = col ? collabColor[pt.collaboratorId] : "#999";
                    const who   = col ? escHtml(col.name) : "";
                    return taskCard(pt.title, who, color, pt.estimatedHours || 0, pt.actualHours, pt.status, `data-agenda-task-id="${escHtml(pt.id)}"`);
                  }).join("")}
                  ${dayTasks.filter((pt) => pt.prestataireId).map((pt) => {
                    const pres  = prestataires.find((p) => p.id === pt.prestataireId);
                    const color = pres ? prestColor[pt.prestataireId] : "#999";
                    const who   = pres ? `🏢 ${escHtml(pres.name)}` : "";
                    return taskCard(pt.title, who, color, pt.estimatedHours || 0, pt.actualHours, pt.status, `data-agenda-ext-task-id="${escHtml(pt.id)}"`);
                  }).join("")}
                </div>
              </div>`;
          }).join("")}
        </div>
      </section>`;

    container.querySelector("#prevAgendaBtn").addEventListener("click", () => { agendaWeekOffset--; renderWeek(); });
    container.querySelector("#todayAgendaBtn").addEventListener("click", () => { agendaWeekOffset = 0; renderWeek(); });
    container.querySelector("#nextAgendaBtn").addEventListener("click", () => { agendaWeekOffset++; renderWeek(); });
    container.querySelector("#agendaWeekBtn").addEventListener("click", () => { agendaViewMode = "week"; renderWeek(); });
    container.querySelector("#agendaMonthBtn").addEventListener("click", () => { agendaViewMode = "month"; renderMonth(); });
    bindWeekTasks(renderWeek);
  }

  function renderMonth() {
    const now       = new Date();
    const baseMonth = new Date(now.getFullYear(), now.getMonth() + agendaMonthOffset, 1);
    const year      = baseMonth.getFullYear();
    const month     = baseMonth.getMonth();
    const firstDay  = new Date(year, month, 1);
    const lastDay   = new Date(year, month + 1, 0);
    const langCode  = getLang() === "nl" ? "nl-BE" : "fr-BE";
    const monthLabel = new Intl.DateTimeFormat(langCode, { month: "long", year: "numeric" }).format(firstDay);
    const monthStart = localDateStr(firstDay);
    const monthEnd   = localDateStr(lastDay);

    const startDow = firstDay.getDay();
    const paddingDays = startDow === 0 ? 6 : startDow - 1;
    const gridDays = [];
    for (let i = paddingDays; i > 0; i--) gridDays.push({ date: new Date(year, month, 1 - i), isCurrentMonth: false });
    for (let i = 1; i <= lastDay.getDate(); i++) gridDays.push({ date: new Date(year, month, i), isCurrentMonth: true });
    const tail = gridDays.length % 7;
    if (tail !== 0) for (let i = 1; i <= 7 - tail; i++) gridDays.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });

    const allTasks   = (state.planningTasks || []).filter((pt) => pt.date >= monthStart && pt.date <= monthEnd);
    const allTickets = state.tickets.filter((tk) => {
      if (!["planifie", "en_cours", "termine"].includes(tk.status)) return false;
      const d = tk.plannedDate || tk.desiredDate;
      return d && d >= monthStart && d <= monthEnd;
    });
    const monthTotal = [...allTasks, ...allTickets].reduce((s, x) => s + (x.estimatedHours || 0), 0);

    const weekdays = getLang() === "nl"
      ? ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"]
      : ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

    container.innerHTML = `
      <section class="card">
        <div class="section-head">
          <div>
            <h2>📅 ${t("tab.agenda")}</h2>
            <p class="subtle">${monthLabel} · ${t("plan.month.total")} <strong>${formatHours(monthTotal)}</strong></p>
          </div>
          <div class="planning-controls">
            <div class="plan-view-toggle">
              <button class="button ghost" id="agendaWeekBtn">${t("plan.view.week")}</button>
              <button class="button ghost active" id="agendaMonthBtn">${t("plan.view.month")}</button>
            </div>
            <button class="button ghost" id="prevAgendaMonthBtn">${t("plan.prev")}</button>
            <button class="button ghost" id="todayAgendaMonthBtn">${t("plan.today")}</button>
            <button class="button ghost" id="nextAgendaMonthBtn">${t("plan.next")}</button>
          </div>
        </div>
        ${renderLegend()}
        <div class="cal-month">
          ${weekdays.map((d) => `<div class="cal-month-weekday">${d}</div>`).join("")}
          ${gridDays.map(({ date, isCurrentMonth }) => {
            const dateStr    = localDateStr(date);
            const isToday    = dateStr === today();
            const dayTasks   = allTasks.filter((pt) => pt.date === dateStr);
            const dayTickets = allTickets.filter((tk) => (tk.plannedDate || tk.desiredDate) === dateStr);
            const dayTotal   = [...dayTasks, ...dayTickets].reduce((s, x) => s + (x.estimatedHours || 0), 0);
            return `
              <div class="cal-month-day${isToday ? " cal-month-day--today" : ""}${!isCurrentMonth ? " cal-month-day--other" : ""}">
                <div class="cal-month-day-head">
                  <span class="cal-month-daynum">${date.getDate()}</span>
                  ${dayTotal > 0 ? `<span class="cal-month-total">${formatHours(dayTotal)}</span>` : ""}
                </div>
                <div class="cal-month-body">
                  ${dayTickets.map((tk) => {
                    const col  = collaborators.find((c) => c.id === tk.assignedTo);
                    const pres = prestataires.find((p) => p.id === tk.assignedToExternal);
                    const color = col ? collabColor[tk.assignedTo] : (pres ? prestColor[tk.assignedToExternal] : "#999");
                    const who  = col ? col.name : (pres ? `🏢 ${pres.name}` : "");
                    return `<div class="cal-month-item" data-status="${tk.status}"
                      style="border-left:2px solid ${color};background:${color}22;"
                      title="${escHtml(tk.title)}${who ? ` — ${escHtml(who)}` : ""}">${escHtml(tk.title)}</div>`;
                  }).join("")}
                  ${dayTasks.map((pt) => {
                    const col  = collaborators.find((c) => c.id === pt.collaboratorId);
                    const pres = prestataires.find((p) => p.id === pt.prestataireId);
                    const color = col ? collabColor[pt.collaboratorId] : (pres ? prestColor[pt.prestataireId] : "#999");
                    const who  = col ? col.name : (pres ? `🏢 ${pres.name}` : "");
                    return `<div class="cal-month-item cal-month-item--task" data-status="${pt.status}"
                      style="border-left:2px solid ${color};background:${color}22;"
                      title="${escHtml(pt.title)}${who ? ` — ${escHtml(who)}` : ""}">${escHtml(pt.title)}</div>`;
                  }).join("")}
                </div>
              </div>`;
          }).join("")}
        </div>
      </section>`;

    container.querySelector("#agendaWeekBtn").addEventListener("click", () => { agendaViewMode = "week"; agendaWeekOffset = 0; renderWeek(); });
    container.querySelector("#agendaMonthBtn").addEventListener("click", () => { agendaViewMode = "month"; renderMonth(); });
    container.querySelector("#prevAgendaMonthBtn").addEventListener("click", () => { agendaMonthOffset--; renderMonth(); });
    container.querySelector("#todayAgendaMonthBtn").addEventListener("click", () => { agendaMonthOffset = 0; renderMonth(); });
    container.querySelector("#nextAgendaMonthBtn").addEventListener("click", () => { agendaMonthOffset++; renderMonth(); });
  }

  if (agendaViewMode === "month") renderMonth(); else renderWeek();
}

function renderTreeEditor(container) {
  const tree = loadTree();
  let selectedPath = [0];

  function parsePath(path) {
    return String(path || "").split(".").filter(Boolean).map((value) => Number(value));
  }

  function pathToKey(path) {
    return path.join(".");
  }

  function getNodeAtPath(path) {
    let nodes = tree;
    let current = null;
    for (const index of path) {
      current = nodes[index];
      if (!current) {
        return null;
      }
      nodes = current.children || [];
    }
    return current;
  }

  function getParentArray(path) {
    if (path.length <= 1) {
      return tree;
    }
    const parent = getNodeAtPath(path.slice(0, -1));
    return parent?.children || [];
  }

  function ensureSelectionExists() {
    const current = getNodeAtPath(selectedPath);
    if (current) {
      return;
    }
    if (tree.length > 0) {
      selectedPath = [0];
      return;
    }
    tree.push(createTreeNode({ label: t("tree.new.root"), team: "technique" }));
    selectedPath = [0];
  }

  function renderTreeList(nodes, basePath = [], depth = 0) {
    return nodes.map((node, index) => {
      const path = [...basePath, index];
      const key = pathToKey(path);
      const isSelected = key === pathToKey(selectedPath);
      const isLeaf = !node.children || node.children.length === 0;
      return `
        <div class="cat-item-wrap" style="--depth:${depth}">
          <button type="button" class="cat-item ${isSelected ? "active" : ""}" data-action="select-cat" data-path="${key}">
            <span class="cat-item-title">${escHtml(node.label)}</span>
            <span class="cat-item-meta">${teamLabel(node.team)} · ${specialtyLabel(node.suggestedSpecialty)} · ${formatHours(node.estimatedHours)}</span>
            ${isLeaf ? `<span class="badge badge-muted">${t("tree.leaf")}</span>` : ""}
          </button>
          ${(node.children && node.children.length > 0) ? `<div class="cat-children">${renderTreeList(node.children, path, depth + 1)}</div>` : ""}
        </div>
      `;
    }).join("");
  }

  function saveAndRefresh() {
    saveTree(tree);
    renderEditor();
  }

  function renderEditor() {
    ensureSelectionExists();
    const selectedNode = getNodeAtPath(selectedPath);
    if (!selectedNode) {
      return;
    }
    const specialtyOptions = specialtyOptionsForTeam(selectedNode.team);
    const prestataires = loadPrestataires();

    container.innerHTML = `
      <div class="tree-editor-wrap tree-editor-v2">
        <div class="section-head compact">
          <div>
            <h2>${t("tree.title")}</h2>
            <p class="subtle">${t("tree.sub")}</p>
          </div>
          <div class="tree-editor-actions">
            <button class="button ghost" type="button" id="addRootNode">${t("tree.add.root")}</button>
            <button class="button ghost" type="button" id="resetTree">${t("tree.restore")}</button>
          </div>
        </div>

        <div class="category-editor-grid">
          <aside class="category-tree-pane">
            <div id="categoryTreeList" class="category-tree-list">${renderTreeList(tree)}</div>
          </aside>

          <section class="category-detail-pane card">
            <h3>${t("tree.details")}</h3>
            <form id="categoryDetailForm" class="form-grid">
              <div class="field full">
                <label for="catLabel">${t("tree.label")}</label>
                <input id="catLabel" name="label" type="text" value="${escHtml(selectedNode.label)}" required />
              </div>
              <input type="hidden" name="value" value="${escHtml(selectedNode.value)}" />
              <div class="field">
                <label for="catTeam">${t("tree.team")}</label>
                <select id="catTeam" name="team">
                  ${getAllTargetTeamKeys().map((key) => `<option value="${key}" ${selectedNode.team === key ? "selected" : ""}>${teamLabel(key)}</option>`).join("")}
                </select>
              </div>
              <div class="field">
                <label for="catSpecialty">${t("tree.specialty")}</label>
                <select id="catSpecialty" name="suggestedSpecialty">
                  ${specialtyOptions.map((key) => `<option value="${key}" ${selectedNode.suggestedSpecialty === key ? "selected" : ""}>${specialtyLabel(key)}</option>`).join("")}
                </select>
              </div>
              <div class="field">
                <label for="catHours">${t("tree.estimated")}</label>
                <input id="catHours" name="estimatedHours" type="number" min="0.5" step="0.5" value="${normalizeHours(selectedNode.estimatedHours, 2)}" />
              </div>
              <div class="field full">
                <label for="catExternal">${t("tree.external")}</label>
                <select id="catExternal" name="linkedExternalId">
                  <option value="">${t("tree.external.none")}</option>
                  ${prestataires.map((p) => `<option value="${p.id}" ${selectedNode.linkedExternalId === p.id ? "selected" : ""}>${escHtml(p.name)}${p.company ? ` — ${escHtml(p.company)}` : ""}</option>`).join("")}
                </select>
              </div>
              <div class="field full category-detail-actions">
                <button class="button ghost" type="button" data-action="add-child">${t("tree.add.child")}</button>
                <button class="button danger-ghost" type="button" data-action="delete-node">${t("tree.delete")}</button>
                <button class="button" type="submit">${t("tree.save")}</button>
              </div>
            </form>
          </section>
        </div>
      </div>
    `;

    container.querySelectorAll("[data-action='select-cat']").forEach((button) => {
      button.addEventListener("click", () => {
        selectedPath = parsePath(button.dataset.path);
        renderEditor();
      });
    });

    container.querySelector("#addRootNode").addEventListener("click", () => {
      tree.push(createTreeNode({ label: t("tree.new.root"), team: "technique" }));
      selectedPath = [tree.length - 1];
      saveAndRefresh();
    });

    container.querySelector("#resetTree").addEventListener("click", () => {
      const restored = normalizeTree(DEFAULT_TREE);
      tree.splice(0, tree.length, ...restored);
      selectedPath = [0];
      saveAndRefresh();
      toast(t("tree.restored"));
    });

    const form = container.querySelector("#categoryDetailForm");
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const current = getNodeAtPath(selectedPath);
      if (!current) {
        return;
      }
      const data = new FormData(form);
      const label = String(data.get("label") || "").trim() || t("tree.new.node");
      const team = normalizeTeamKey(String(data.get("team") || "technique"));
      const valueInput = String(data.get("value") || "").trim();
      const suggestedSpecialty = String(data.get("suggestedSpecialty") || "general");
      const linkedExternalId = String(data.get("linkedExternalId") || "");
      current.label = label;
      current.value = valueInput || buildNodeValue(label, "cat");
      current.team = team;
      current.suggestedSpecialty = getSpecialtyKeys().includes(suggestedSpecialty) ? suggestedSpecialty : "general";
      current.linkedExternalId = linkedExternalId;
      current.estimatedHours = normalizeHours(data.get("estimatedHours"), defaultHoursForSpecialty(current.suggestedSpecialty));
      saveAndRefresh();
      toast(t("tree.saved"));
    });

    container.querySelector("[data-action='add-child']")?.addEventListener("click", () => {
      const current = getNodeAtPath(selectedPath);
      if (!current) {
        return;
      }
      current.children ||= [];
      const child = createTreeNode({
        label: t("tree.new.child"),
        team: current.team,
        suggestedSpecialty: current.suggestedSpecialty,
        linkedExternalId: current.linkedExternalId,
        estimatedHours: current.estimatedHours,
      });
      current.children.push(child);
      selectedPath = [...selectedPath, current.children.length - 1];
      saveAndRefresh();
    });

    container.querySelector("[data-action='delete-node']")?.addEventListener("click", () => {
      const parentArray = getParentArray(selectedPath);
      const index = selectedPath[selectedPath.length - 1];
      if (!parentArray || index == null) {
        return;
      }
      if (selectedPath.length === 1 && tree.length === 1) {
        toast(t("tree.keep.one"));
        return;
      }
      parentArray.splice(index, 1);
      if (selectedPath.length > 1) {
        const parentPath = selectedPath.slice(0, -1);
        const nextIndex = Math.max(0, Math.min(index - 1, parentArray.length - 1));
        selectedPath = [...parentPath, nextIndex >= 0 ? nextIndex : 0];
      } else {
        selectedPath = [Math.max(0, Math.min(index - 1, tree.length - 1))];
      }
      ensureSelectionExists();
      saveAndRefresh();
    });
  }

  renderEditor();
}

function renderCollaboratorPage() {
  const currentUser = getCurrentUser();
  const tickets = state.tickets
    .filter((ticket) => ticket.assignedTo === currentUser.id)
    .sort(sortByPlannedDate);

  const myPlanningTasks = (state.planningTasks || [])
    .filter((pt) => pt.collaboratorId === currentUser.id)
    .sort((a, b) => a.date.localeCompare(b.date));

  function mondayForOffset(offset) {
    const now = new Date();
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((day === 0 ? 7 : day) - 1) + offset * 7);
    monday.setHours(0, 0, 0, 0);
    return monday;
  }

  function renderWeek() {
    const monday = mondayForOffset(collaboratorWeekOffset);
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      return date;
    });
    const weekStart = localDateStr(days[0]);
    const weekEnd = localDateStr(days[6]);
    const todayStr = today();
    const weekTickets = tickets.filter((ticket) => {
      const dateStr = ticket.plannedDate || ticket.desiredDate || "";
      return dateStr >= weekStart && dateStr <= weekEnd;
    });
    const weekPlanTasks = myPlanningTasks.filter((pt) => pt.date >= weekStart && pt.date <= weekEnd);
    const weekTasks = [
      ...weekTickets.map((t) => ({ ...t, _type: "ticket" })),
      ...weekPlanTasks.map((t) => ({ ...t, _type: "planning" })),
    ];
    const todayTasks = weekTasks.filter((item) => (item.plannedDate || item.desiredDate || item.date) === todayStr);
    const weekHours = weekTasks.reduce((sum, item) => sum + normalizeHours(item.estimatedHours, 0), 0);
    const weekPlanned = weekTasks.filter((item) => item.status === "planifie").length;
    const weekInProgress = weekTasks.filter((item) => item.status === "en_cours").length;
    const totalAllTasks = myPlanningTasks.length + tickets.length;

    // Find nearest task date outside current week (for empty-week hint)
    let nearestFutureDate = null;
    let nearestPastDate = null;
    for (const item of [...myPlanningTasks, ...tickets]) {
      const d = item.date || item.plannedDate || item.desiredDate || "";
      if (!d) continue;
      if (d > weekEnd && (!nearestFutureDate || d < nearestFutureDate)) nearestFutureDate = d;
      if (d < weekStart && (!nearestPastDate || d > nearestPastDate)) nearestPastDate = d;
    }

    const weekLabel = `${formatDate(weekStart)} – ${formatDate(weekEnd)}`;
    const wType  = weekTypeForDate(monday);
    const wLabel = wType === "A" ? "Semaine paire" : "Semaine impaire";
    const hasSchedule = !!(currentUser.schedule?.A || currentUser.schedule?.B);

    refs.mainView.innerHTML = `
      <div class="collab-planning">
        <div class="section-head collab-planning-head">
          <div>
            <h2>${t("collab.planning")}</h2>
            <p class="subtle">${t("collab.planning.sub")}</p>
          </div>
          <div class="planning-controls">
            <div class="plan-view-toggle">
              <button class="button ghost active" type="button" id="collabViewWeek">${t("plan.view.week")}</button>
              <button class="button ghost" type="button" id="collabViewMonth">${t("plan.view.month")}</button>
            </div>
            <button class="button ghost" type="button" id="collabPrevWeek">${t("plan.prev")}</button>
            <button class="button ghost" type="button" id="collabToday">${t("plan.today")}</button>
            <button class="button ghost" type="button" id="collabNextWeek">${t("plan.next")}</button>
            <button class="button ghost" type="button" id="collabIcalBtn" title="Synchroniser avec Google Calendar / Outlook">📅 iCal</button>
          </div>
        </div>

        <div class="collab-week-banner">
          <span class="collab-week-label">${weekLabel}</span>
          <span class="badge ${wType === "A" ? "badge-ok" : "badge-muted"}">${wLabel}</span>
          ${!hasSchedule ? `<span class="badge badge-warn">Aucun horaire configuré</span>` : ""}
        </div>

        <div class="collab-kpi-row">
          <article class="collab-kpi-card">
            <span class="collab-kpi-value">${totalAllTasks}</span>
            <span class="collab-kpi-label">Total tâches</span>
          </article>
          <article class="collab-kpi-card">
            <span class="collab-kpi-value">${weekTasks.length}</span>
            <span class="collab-kpi-label">${t("collab.task.count")} (semaine)</span>
          </article>
          <article class="collab-kpi-card">
            <span class="collab-kpi-value">${todayTasks.length}</span>
            <span class="collab-kpi-label">${t("plan.today")}</span>
          </article>
          <article class="collab-kpi-card">
            <span class="collab-kpi-value">${weekPlanned}</span>
            <span class="collab-kpi-label">${statusLabel("planifie")}</span>
          </article>
          <article class="collab-kpi-card collab-kpi-card--hours">
            <span class="collab-kpi-value">${formatHours(weekHours)}</span>
            <span class="collab-kpi-label">${t("ticket.estimated")}</span>
          </article>
        </div>

        <section class="card collab-today-panel">
          <div class="section-head compact">
            <div>
              <h3>${t("plan.today")}</h3>
              <p class="subtle">${todayTasks.length > 0 ? `${todayTasks.length} ${t("collab.task.count")}` : t("collab.task.none")}</p>
            </div>
          </div>
          ${todayTasks.length === 0 ? `
            <div class="empty-state">${t("collab.task.none")}</div>
          ` : `
            <div class="collab-today-list">
              ${todayTasks.map((ticket) => {
                const taskType = ticket._type || "ticket";
                const actionButton = ticket.status === "planifie"
                  ? `<button class="button" type="button" data-action="collab-start" data-ticket-id="${ticket.id}" data-task-type="${taskType}">${t("collab.start")}</button>`
                  : ticket.status === "en_cours"
                    ? `<button class="button" type="button" data-action="collab-finish" data-ticket-id="${ticket.id}" data-task-type="${taskType}">${t("collab.finish")}</button>`
                    : "";
                return `
                  <article class="collab-today-item is-clickable" data-priority="${ticket.priority}" data-ticket-id="${escHtml(ticket.id)}" data-task-type="${taskType}" role="button" tabindex="0">
                    <div class="collab-today-item__main">
                      <strong>${escHtml(ticket.title)}</strong>
                      <div class="collab-today-item__meta">
                        <span class="badge badge-status" data-status="${ticket.status}">${statusLabel(ticket.status)}</span>
                        <span class="collab-today-item__hours">${formatHours(ticket.estimatedHours || 0)}</span>
                      </div>
                    </div>
                    ${actionButton}
                  </article>
                `;
              }).join("")}
            </div>
          `}
        </section>

        ${weekTasks.length === 0 ? `
          <div class="collab-empty-week">
            ${totalAllTasks === 0
              ? `<p class="subtle">Aucune tâche assignée pour l'instant.</p>`
              : `<p class="subtle">Pas de tâche cette semaine.
                  ${nearestFutureDate ? `Prochaine tâche : <strong>${formatDate(nearestFutureDate)}</strong>.` : ""}
                  ${nearestPastDate && !nearestFutureDate ? `Dernière tâche : <strong>${formatDate(nearestPastDate)}</strong>.` : ""}
                  Utilisez les boutons de navigation pour consulter les autres semaines.
                </p>`
            }
          </div>
        ` : ""}
        <div class="cal-week">
          ${days.map((day) => {
            const dateStr = localDateStr(day);
            const dayTickets = tickets.filter((ticket) => (ticket.plannedDate || ticket.desiredDate) === dateStr);
            const dayPlanTasks = myPlanningTasks.filter((pt) => pt.date === dateStr);
            const isEmpty = dayTickets.length === 0 && dayPlanTasks.length === 0;
            const isToday = dateStr === todayStr;
            const dayName = new Intl.DateTimeFormat("fr-BE", { weekday: "short" }).format(day);
            const dayNum = new Intl.DateTimeFormat("fr-BE", { day: "numeric", month: "short" }).format(day);
            const dayKey  = schedKeyForDate(day);
            const daySched = currentUser.schedule?.[wType]?.[dayKey];
            const isWorking = daySched?.active === true;
            const hasTasksOnRestDay = !isWorking && !isEmpty && hasSchedule;
            return `
              <div class="cal-day${isToday ? " cal-day--today" : ""}${hasTasksOnRestDay ? " cal-day--rest-warn" : ""}">
                <div class="cal-day-head">
                  <span class="cal-weekday">${dayName}</span>
                  <span class="cal-daynum">${dayNum}</span>
                  ${hasSchedule
                    ? (isWorking
                        ? `<span class="cal-day-hours">${daySched.start}–${daySched.end}</span>`
                        : `<span class="cal-day-rest">Repos</span>`)
                    : ""}
                </div>
                <div class="cal-day-body">
                  ${hasTasksOnRestDay ? `<span class="cal-rest-warning" title="Tâche planifiée un jour de repos">⚠ Jour de repos</span>` : ""}
                  ${isEmpty && !hasTasksOnRestDay ? `<span class="cal-empty">—</span>` : ""}
                  ${dayTickets.map((ticket) => {
                    const actionButton = ticket.status === "planifie"
                      ? `<button class="button" type="button" data-action="collab-start" data-ticket-id="${ticket.id}">${t("collab.start")}</button>`
                      : ticket.status === "en_cours"
                        ? `<button class="button" type="button" data-action="collab-finish" data-ticket-id="${ticket.id}">${t("collab.finish")}</button>`
                        : "";
                    return `
                      <article class="cal-ticket is-clickable" data-priority="${ticket.priority}" data-ticket-id="${escHtml(ticket.id)}" role="button" tabindex="0">
                        <span class="cal-ticket-title">${escHtml(ticket.title)}</span>
                        <span class="badge badge-status" data-status="${ticket.status}">${statusLabel(ticket.status)}</span>
                        <span class="cal-ticket-hours">${formatHours(ticket.estimatedHours || 0)}</span>
                        ${actionButton}
                      </article>
                    `;
                  }).join("")}
                  ${dayPlanTasks.map((pt) => {
                    const ptAction = pt.status === "planifie"
                      ? `<button class="button" type="button" data-action="collab-start" data-ticket-id="${escHtml(pt.id)}" data-task-type="planning">${t("collab.start")}</button>`
                      : pt.status === "en_cours"
                        ? `<button class="button" type="button" data-action="collab-finish" data-ticket-id="${escHtml(pt.id)}" data-task-type="planning">${t("collab.finish")}</button>`
                        : "";
                    return `
                      <article class="cal-ticket is-clickable" data-status="${pt.status}" data-task-id="${escHtml(pt.id)}" data-task-type="planning" role="button" tabindex="0">
                        <span class="cal-ticket-title">${escHtml(pt.title)}</span>
                        <span class="badge badge-status" data-status="${pt.status}">${statusLabel(pt.status)}</span>
                        <span class="cal-ticket-hours">${formatHours(pt.estimatedHours || 0)}</span>
                        ${ptAction}
                      </article>
                    `;
                  }).join("")}
                </div>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;

    refs.mainView.querySelector("#collabViewWeek")?.addEventListener("click", () => {
      collaboratorViewMode = "week";
      renderWeek();
    });
    refs.mainView.querySelector("#collabViewMonth")?.addEventListener("click", () => {
      collaboratorViewMode = "month";
      renderMonth();
    });
    refs.mainView.querySelector("#collabPrevWeek")?.addEventListener("click", () => {
      collaboratorWeekOffset -= 1;
      renderWeek();
    });
    refs.mainView.querySelector("#collabToday")?.addEventListener("click", () => {
      collaboratorWeekOffset = 0;
      renderWeek();
    });
    refs.mainView.querySelector("#collabNextWeek")?.addEventListener("click", () => {
      collaboratorWeekOffset += 1;
      renderWeek();
    });

    refs.mainView.querySelector("#collabIcalBtn")?.addEventListener("click", () => {
      const url = getIcalUrl(currentUser.id);
      if (!url) { toast("Lien iCal disponible uniquement en ligne (pas en mode fichier local)."); return; }
      showIcalModal(url);
    });

    refs.mainView.querySelectorAll("[data-action='collab-start']").forEach((button) => {
      button.addEventListener("click", () => {
        if (button.dataset.taskType === "planning") {
          updatePlanningTask(button.dataset.ticketId, { status: "en_cours" });
        } else {
          updateTicket(button.dataset.ticketId, { status: "en_cours" });
        }
        toast(t("collab.started"));
      });
    });

    refs.mainView.querySelectorAll("[data-action='collab-finish']").forEach((button) => {
      button.addEventListener("click", () => {
        if (button.dataset.taskType === "planning") {
          updatePlanningTask(button.dataset.ticketId, { status: "termine" });
        } else {
          updateTicket(button.dataset.ticketId, { status: "termine" });
        }
        toast(t("collab.finished"));
      });
    });

    refs.mainView.querySelectorAll(".cal-ticket[data-ticket-id]").forEach((article) => {
      const openDetail = (e) => {
        if (e.target.closest("button")) return;
        const ticketId = article.dataset.ticketId;
        const ticket = state.tickets.find((tk) => tk.id === ticketId);
        if (ticket) showTicketDetailModal(ticket);
      };
      article.addEventListener("click", openDetail);
      article.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDetail(e); } });
    });

    refs.mainView.querySelectorAll(".cal-ticket[data-task-id]").forEach((article) => {
      const openDetail = (e) => {
        if (e.target.closest("button")) return;
        const taskId = article.dataset.taskId;
        const task = (state.planningTasks || []).find((pt) => pt.id === taskId);
        if (task) showPlanningTaskCollabModal(task);
      };
      article.addEventListener("click", openDetail);
      article.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDetail(e); } });
    });

    refs.mainView.querySelectorAll(".collab-today-item[data-ticket-id]").forEach((article) => {
      article.addEventListener("click", (e) => {
        if (e.target.closest("button")) return;
        const type = article.dataset.taskType;
        const id = article.dataset.ticketId;
        if (type === "planning") {
          const task = (state.planningTasks || []).find((pt) => pt.id === id);
          if (task) showPlanningTaskCollabModal(task);
        } else {
          const ticket = state.tickets.find((tk) => tk.id === id);
          if (ticket) showTicketDetailModal(ticket);
        }
      });
    });
  }

  function renderMonth() {
    const now = new Date();
    const baseYear  = now.getFullYear();
    const baseMonth = now.getMonth();
    const year  = baseYear  + Math.floor((baseMonth + collaboratorMonthOffset) / 12);
    const month = ((baseMonth + collaboratorMonthOffset) % 12 + 12) % 12;
    const firstDay = new Date(year, month, 1);
    const lastDay  = new Date(year, month + 1, 0);
    const monthLabel = new Intl.DateTimeFormat("fr-BE", { month: "long", year: "numeric" }).format(firstDay);
    const todayStr = today();

    // Grid: fill week from Monday
    const startOffset = (firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1);
    const gridStart = new Date(firstDay);
    gridStart.setDate(firstDay.getDate() - startOffset);
    const totalCells = Math.ceil((startOffset + lastDay.getDate()) / 7) * 7;
    const gridDays = Array.from({ length: totalCells }, (_, i) => {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      return { date: d, isCurrentMonth: d.getMonth() === month };
    });

    const monthStart = localDateStr(firstDay);
    const monthEnd   = localDateStr(lastDay);
    const monthTickets = tickets.filter((t) => {
      const d = t.plannedDate || t.desiredDate || "";
      return d >= monthStart && d <= monthEnd;
    });
    const monthPlanTasks = myPlanningTasks.filter((pt) => pt.date >= monthStart && pt.date <= monthEnd);
    const monthHours = [...monthTickets, ...monthPlanTasks].reduce((s, x) => s + normalizeHours(x.estimatedHours, 0), 0);

    const weekdays = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];

    refs.mainView.innerHTML = `
      <div class="collab-planning">
        <div class="section-head collab-planning-head">
          <div>
            <h2>${t("collab.planning")}</h2>
            <p class="subtle">${monthLabel} · ${formatHours(monthHours)}</p>
          </div>
          <div class="planning-controls">
            <div class="plan-view-toggle">
              <button class="button ghost" type="button" id="collabViewWeek">${t("plan.view.week")}</button>
              <button class="button ghost active" type="button" id="collabViewMonth">${t("plan.view.month")}</button>
            </div>
            <button class="button ghost" type="button" id="collabPrevMonth">${t("plan.prev")}</button>
            <button class="button ghost" type="button" id="collabTodayMonth">${t("plan.today")}</button>
            <button class="button ghost" type="button" id="collabNextMonth">${t("plan.next")}</button>
            <button class="button ghost" type="button" id="collabIcalBtn" title="Synchroniser avec Google Calendar / Outlook">📅 iCal</button>
          </div>
        </div>

        <div class="cal-month" style="margin-top:16px;">
          ${weekdays.map((d) => `<div class="cal-month-weekday">${d}</div>`).join("")}
          ${gridDays.map(({ date, isCurrentMonth }) => {
            const dateStr = localDateStr(date);
            const isToday = dateStr === todayStr;
            const dayTk = tickets.filter((t) => (t.plannedDate || t.desiredDate) === dateStr);
            const dayPt = myPlanningTasks.filter((pt) => pt.date === dateStr);
            const dayTotal = [...dayTk, ...dayPt].reduce((s, x) => s + normalizeHours(x.estimatedHours, 0), 0);
            return `
              <div class="cal-month-day${isToday ? " cal-month-day--today" : ""}${!isCurrentMonth ? " cal-month-day--other" : ""}">
                <div class="cal-month-day-head">
                  <span class="cal-month-daynum">${date.getDate()}</span>
                  ${dayTotal > 0 ? `<span class="cal-month-total">${formatHours(dayTotal)}</span>` : ""}
                </div>
                <div class="cal-month-body">
                  ${dayTk.map((tk) => `<div class="cal-month-item" data-status="${tk.status}" data-ticket-id="${escHtml(tk.id)}" title="${escHtml(tk.title)}">${escHtml(tk.title)}</div>`).join("")}
                  ${dayPt.map((pt) => `<div class="cal-month-item cal-month-item--task" data-status="${pt.status}" data-task-id="${escHtml(pt.id)}" title="${escHtml(pt.title)}">${escHtml(pt.title)}</div>`).join("")}
                </div>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;

    refs.mainView.querySelector("#collabViewWeek")?.addEventListener("click", () => {
      collaboratorViewMode = "week";
      renderWeek();
    });
    refs.mainView.querySelector("#collabViewMonth")?.addEventListener("click", () => {
      collaboratorViewMode = "month";
      renderMonth();
    });
    refs.mainView.querySelector("#collabPrevMonth")?.addEventListener("click", () => {
      collaboratorMonthOffset -= 1;
      renderMonth();
    });
    refs.mainView.querySelector("#collabTodayMonth")?.addEventListener("click", () => {
      collaboratorMonthOffset = 0;
      renderMonth();
    });
    refs.mainView.querySelector("#collabNextMonth")?.addEventListener("click", () => {
      collaboratorMonthOffset += 1;
      renderMonth();
    });
    refs.mainView.querySelector("#collabIcalBtn")?.addEventListener("click", () => {
      const url = getIcalUrl(currentUser.id);
      if (!url) { toast("Lien iCal disponible uniquement en ligne (pas en mode fichier local)."); return; }
      showIcalModal(url);
    });

    refs.mainView.querySelectorAll(".cal-month-item[data-ticket-id]").forEach((el) => {
      el.addEventListener("click", () => {
        const ticket = state.tickets.find((tk) => tk.id === el.dataset.ticketId);
        if (ticket) showTicketDetailModal(ticket);
      });
    });
    refs.mainView.querySelectorAll(".cal-month-item[data-task-id]").forEach((el) => {
      el.addEventListener("click", () => {
        const task = (state.planningTasks || []).find((pt) => pt.id === el.dataset.taskId);
        if (task) showPlanningTaskCollabModal(task);
      });
    });
  }

  if (collaboratorViewMode === "month") renderMonth(); else renderWeek();
}

function renderManagerLanes(container, tickets) {
  const laneKeys = ["nouveau", "en_attente", "planifie", "en_cours", "termine"];

  container.innerHTML = laneKeys
    .map((key) => {
      const items = tickets.filter((ticket) => ticket.status === key);
      return `
        <section class="lane-card">
          <h3>${t("status." + key)}</h3>
          ${items.length === 0 ? `<div class="empty-state">${t("misc.empty")}</div>` : items
            .map(
              (ticket) => `
                <article class="ticket-mini">
                  <strong>${ticket.title}</strong>
                  <p class="subtle">${ticket.plannedDate ? formatDate(ticket.plannedDate) : t("ticket.date.confirm")}</p>
                </article>
              `,
            )
            .join("")}
        </section>
      `;
    })
    .join("");
}

function renderWaitingTicketsCompact(container, tickets) {
  if (!container) return;
  if (!Array.isArray(tickets) || tickets.length === 0) {
    container.innerHTML = "";
    return;
  }
  container.innerHTML = `
    <ul class="waiting-compact-list">
      ${tickets.map((ticket) => {
        const category = (Array.isArray(ticket.categoryPath) && ticket.categoryPath.length > 0)
          ? ticket.categoryPath.join(" › ")
          : (ticket.categoryValue || "-");
        return `
          <li class="waiting-compact-item" data-ticket-id="${escHtml(ticket.id)}">
            <span class="waiting-compact-title">${escHtml(ticket.title)}</span>
            <span class="waiting-compact-cat">${escHtml(category)}</span>
          </li>
        `;
      }).join("")}
    </ul>
  `;

  container.querySelectorAll("[data-ticket-id]").forEach((item) => {
    item.addEventListener("click", () => {
      const ticketId = item.dataset.ticketId;
      employeeExpandedTicketId = ticketId;
      const table = refs.mainView.querySelector("#employeeTicketTable");
      const tickets = state.tickets
        .filter((t) => t.createdBy === getCurrentUser()?.id)
        .sort(sortByUpdatedDesc);
      renderEmployeeTicketTable(table, tickets);
      const row = table?.querySelector(`[data-ticket-row="${ticketId}"]`);
      row?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });
}

function renderTicketCards(container, tickets, options) {
  if (tickets.length === 0) {
    container.innerHTML = `<div class="empty-state">${t("ticket.empty")}</div>`;
    return;
  }

  container.innerHTML = "";
  tickets.forEach((ticket) => {
    const fragment = refs.ticketCardTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".ticket-card");
    const details = fragment.querySelector(".ticket-details");
    const actions = fragment.querySelector(".ticket-actions");
    const photoWrap = fragment.querySelector(".ticket-photo-wrap");
    const photo = fragment.querySelector(".ticket-photo");

    fragment.querySelector(".badge-team").textContent = teamLabel(ticket.department);

    const priorityBadge = fragment.querySelector(".badge-priority");
    priorityBadge.textContent = priorityLabel(ticket.priority);
    priorityBadge.dataset.priority = ticket.priority;

    const statusBadge = fragment.querySelector(".badge-status");
    statusBadge.textContent = statusLabel(ticket.status);
    statusBadge.dataset.status = ticket.status;

    fragment.querySelector(".ticket-title").textContent = ticket.title;
    fragment.querySelector(".ticket-code").textContent = ticket.id;
    fragment.querySelector(".ticket-description").textContent = ticket.description;

    details.innerHTML = renderDetails(ticket);

    // Garde-fou anti-doublon: en mode manager, l'historique doit rester
    // uniquement dans le formulaire d'action, jamais dans le résumé détails.
    if (options.mode === "manage") {
      const detailRows = Array.from(details.querySelectorAll("div"));
      detailRows.forEach((row) => {
        const dt = row.querySelector("dt");
        if (!dt) {
          return;
        }
        const label = dt.textContent?.trim().toLowerCase() || "";
        if (label === t("chat.history").trim().toLowerCase() || row.querySelector(".info-thread-list")) {
          row.remove();
        }
      });
    }

    if (ticket.photoDataUrl) {
      photoWrap.classList.remove("hidden");
      photo.src = ticket.photoDataUrl;
    }

    if (options.mode === "manage") {
      actions.appendChild(renderManagerForm(ticket, options.collaborators));
    }

    card.dataset.ticketId = ticket.id;
    container.appendChild(fragment);
  });
}

function renderManagerForm(ticket, collaborators) {
  const wrapper = document.createElement("div");
  wrapper.className = "manager-grid";
  const suggested = suggestAssignee(ticket, collaborators);
  const suggestedLabel = suggested
    ? `${escHtml(suggested.name)} (${specialtyLabel(ticket.suggestedSpecialty || "general")})`
    : t("mgr.suggest.none");
  const selectedAssignee = ticket.assignedTo || ticket.suggestedAssigneeId || suggested?.id || "";
  const categoryLinkedExternalId = ticket.suggestedExternalId || linkedExternalForTicket(ticket);
  const initMode = (ticket.assignedToExternal || categoryLinkedExternalId) ? "externe" : "interne";
  const prestataires = loadPrestataires();
  const selectedPrest = ticket.assignedToExternal || categoryLinkedExternalId || "";
  let assignWeekOffset = 0;

  wrapper.innerHTML = `
    <div class="field manager-assign-type-field">
      <label>${t("mgr.assign.type")}</label>
      <div class="assign-toggle">
        <label class="assign-toggle-opt">
          <input type="radio" name="assignMode" value="interne" ${initMode === "interne" ? "checked" : ""} />
          <span>${t("mgr.assign.internal")}</span>
        </label>
        <label class="assign-toggle-opt">
          <input type="radio" name="assignMode" value="externe" ${initMode === "externe" ? "checked" : ""} />
          <span>${t("mgr.assign.external")}</span>
        </label>
      </div>
    </div>
    <div class="field manager-suggestion-field">
      <div class="suggestion-box">
        <strong>${t("mgr.suggest.title")}</strong>
        <p class="subtle">${t("mgr.suggest.for")}: ${specialtyLabel(ticket.suggestedSpecialty || "general")} · ${formatHours(ticket.estimatedHours || 0)}</p>
        <p>${t("mgr.suggest.proposal")}: ${suggestedLabel}</p>
        <p>${t("ticket.intervention.delay")}: ${interventionDelayLabel(ticket.interventionDelay)}</p>
      </div>
    </div>
    <div class="field assign-interne-block${initMode === "externe" ? " hidden" : ""}">
      <label>${t("mgr.assign")}</label>
      <select name="assignedTo">
        <option value="">${t("mgr.unassigned")}</option>
        ${collaborators.map((u) => `<option value="${u.id}" ${selectedAssignee === u.id ? "selected" : ""}>${escHtml(u.name)} - ${escHtml(specialtiesSummary(u))}</option>`).join("")}
      </select>
    </div>
    <div class="field assign-externe-block${initMode === "interne" ? " hidden" : ""}">
      <label>${t("mgr.assign.external")}</label>
      <select name="assignedToExternal">
        <option value="">${t("mgr.unassigned")}</option>
        ${prestataires.map((p) => `<option value="${p.id}" ${selectedPrest === p.id ? "selected" : ""}>${escHtml(p.name)}${p.company ? ` — ${escHtml(p.company)}` : ""}</option>`).join("")}
      </select>
    </div>
    <div class="field assign-externe-block${initMode === "interne" ? " hidden" : ""}">
      <label>${t("mgr.mail.btn")}</label>
      <a id="mailtoBtn" class="button ghost" href="#" target="_blank">${t("mgr.mail.btn")}</a>
    </div>
    <div class="field">
      <label>${t("mgr.priority")}</label>
      <select name="priority">
        ${Object.entries(PRIORITY_LABELS()).map(([v, l]) => `<option value="${v}" ${ticket.priority === v ? "selected" : ""}>${l}</option>`).join("")}
      </select>
    </div>
    <div class="field">
      <label>${t("mgr.estimated")}</label>
      <input name="estimatedHours" type="number" min="0.5" step="0.5" value="${normalizeHours(ticket.estimatedHours, 2)}" />
    </div>
    <div class="field">
      <label>${t("mgr.date.validated")}</label>
      <input name="plannedDate" type="date" value="${ticket.plannedDate || ticket.desiredDate || today()}" />
    </div>
    <div class="field full assign-interne-block${initMode === "externe" ? " hidden" : ""}">
      <label>${t("mgr.assign.week")}</label>
      <div id="assignWeekPicker" class="assign-week-picker"></div>
    </div>
    <div class="field full return-note-field">
      <label>${t("mgr.return.msg")}</label>
      <textarea name="returnNote" placeholder="${t("mgr.return.ph")}">${escHtml(ticket.returnNote || "")}</textarea>
    </div>
    <div class="field full info-thread-box">
      <h4>${t("chat.history")}</h4>
      ${renderInfoThreadHtml(ticket)}
    </div>
    <div class="field full">
      <button class="button secondary" type="button" id="mgrSaveBtn">${t("mgr.save")}</button>
      <button class="button ghost" type="button" data-action="ask-info">${t("mgr.ask.info")}</button>
    </div>
    <div class="field full ticket-delete-zone">
      <hr style="border:none;border-top:1px solid rgba(68,53,36,0.12);margin:8px 0 12px;" />
      <p class="subtle" style="font-size:0.82rem;color:#b03a2e;margin-bottom:8px;">
        ⚠ La suppression est irréversible. Elle ne doit servir qu'à corriger une erreur de saisie ou un doublon — pas à clôturer une demande.
      </p>
      <button class="button danger-ghost" type="button" id="mgrDeleteBtn" style="font-size:0.85rem;">
        🗑 Supprimer définitivement cette demande
      </button>
    </div>
  `;

  const interneBlock = wrapper.querySelectorAll(".assign-interne-block");
  const externeBlocks = wrapper.querySelectorAll(".assign-externe-block");
  const mailtoBtn = wrapper.querySelector("#mailtoBtn");
  const prestSelect = wrapper.querySelector("[name='assignedToExternal']");
  const plannedDateInput = wrapper.querySelector("[name='plannedDate']");
  const assigneeSelect = wrapper.querySelector("[name='assignedTo']");
  const assignWeekPicker = wrapper.querySelector("#assignWeekPicker");

  function buildMailtoHref(prestId) {
    const p = prestataires.find((x) => x.id === prestId);
    if (!p || !p.email) return "#";
    const subject = encodeURIComponent(`[FamiTask] ${ticket.id} - ${ticket.title}`);
    const body = encodeURIComponent([
      `Référence : ${ticket.id}`,
      `Catégorie : ${(Array.isArray(ticket.categoryPath) ? ticket.categoryPath.join(" > ") : "") || ticket.categoryValue || "-"}`,
      `Description : ${ticket.description}`,
      `Date souhaitée : ${ticket.desiredDate || "-"}`,
      `Délai demandé : ${interventionDelayLabel(ticket.interventionDelay)}`,
      `Date planifiée : ${ticket.plannedDate || "-"}`,
      `Durée estimée : ${formatHours(ticket.estimatedHours || 0)}`,
      `Compétence requise : ${specialtyLabel(ticket.suggestedSpecialty || "general")}`,
      "",
      "Merci de prendre contact pour confirmer l'intervention.",
      "— FamiTask / Famiflora",
    ].join("\n"));
    return `mailto:${p.email}?subject=${subject}&body=${body}`;
  }

  function refreshMailto() {
    if (mailtoBtn) mailtoBtn.href = buildMailtoHref(prestSelect?.value || "");
  }

  function mondayForOffset(offset) {
    const now = new Date();
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((day === 0 ? 7 : day) - 1) + offset * 7);
    monday.setHours(0, 0, 0, 0);
    return monday;
  }

  function renderAssignWeekPicker() {
    if (!assignWeekPicker) {
      return;
    }
    const isExterne = (wrapper.querySelector("[name='assignMode']:checked")?.value || "interne") === "externe";
    const assigneeId = assigneeSelect?.value || "";

    if (isExterne) {
      assignWeekPicker.innerHTML = "";
      return;
    }
    if (!assigneeId) {
      assignWeekPicker.innerHTML = `<p class="subtle">${t("mgr.assign.week.none")}</p>`;
      return;
    }

    const monday = mondayForOffset(assignWeekOffset);
    const days = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      return day;
    });
    const weekLabel = `${formatDate(localDateStr(days[0]))} – ${formatDate(localDateStr(days[6]))}`;

    assignWeekPicker.innerHTML = `
      <div class="assign-week-controls">
        <button type="button" class="button ghost tree-btn" data-week-nav="prev">${t("plan.prev")}</button>
        <span class="subtle">${weekLabel}</span>
        <button type="button" class="button ghost tree-btn" data-week-nav="next">${t("plan.next")}</button>
      </div>
      <div class="assign-week-grid">
        ${days.map((day) => {
          const dateStr = localDateStr(day);
          const load = state.tickets
            .filter((t_) => t_.id !== ticket.id && t_.assignedTo === assigneeId && (t_.plannedDate || t_.desiredDate) === dateStr && t_.status !== "termine")
            .reduce((sum, t_) => sum + normalizeHours(t_.estimatedHours, 0), 0);
          const selected = plannedDateInput?.value === dateStr;
          const dayName = new Intl.DateTimeFormat("fr-BE", { weekday: "short" }).format(day);
          const dayNum = new Intl.DateTimeFormat("fr-BE", { day: "numeric", month: "short" }).format(day);
          return `
            <button type="button" class="assign-week-day${selected ? " is-selected" : ""}" data-day="${dateStr}">
              <span>${dayName} ${dayNum}</span>
              <strong>${load > 0 ? `${String(load).replace(".", ",")}h` : "Libre"}</strong>
            </button>
          `;
        }).join("")}
      </div>
    `;

    assignWeekPicker.querySelector("[data-week-nav='prev']")?.addEventListener("click", () => {
      assignWeekOffset -= 1;
      renderAssignWeekPicker();
    });
    assignWeekPicker.querySelector("[data-week-nav='next']")?.addEventListener("click", () => {
      assignWeekOffset += 1;
      renderAssignWeekPicker();
    });
    assignWeekPicker.querySelectorAll("[data-day]").forEach((button) => {
      button.addEventListener("click", () => {
        if (plannedDateInput) {
          plannedDateInput.value = button.dataset.day;
        }
        renderAssignWeekPicker();
      });
    });
  }

  wrapper.querySelectorAll("[name='assignMode']").forEach((radio) => {
    radio.addEventListener("change", () => {
      const isExterne = radio.value === "externe";
      interneBlock.forEach((el) => el.classList.toggle("hidden", isExterne));
      externeBlocks.forEach((el) => el.classList.toggle("hidden", !isExterne));
      renderAssignWeekPicker();
    });
  });

  assigneeSelect?.addEventListener("change", () => {
    renderAssignWeekPicker();
  });

  if (prestSelect) {
    prestSelect.addEventListener("change", refreshMailto);
    refreshMailto();
  }

  wrapper.querySelector("[data-action='ask-info']")?.addEventListener("click", () => {
    const note = String(wrapper.querySelector("[name='returnNote']")?.value || "").trim();
    if (!note) {
      toast(t("mgr.ask.info.note.required"));
      wrapper.querySelector("[name='returnNote']")?.focus();
      return;
    }

    const modeVal = wrapper.querySelector("[name='assignMode']:checked")?.value || "interne";
    const isExterne = modeVal === "externe";
    updateTicket(ticket.id, {
      infoThread: appendInfoMessage(ticket, "manager", note),
      assignedTo: isExterne ? "" : String(wrapper.querySelector("[name='assignedTo']")?.value || ""),
      assignedToExternal: isExterne ? String(prestSelect?.value || "") : "",
      suggestedAssigneeId: suggested?.id || "",
      priority: String(wrapper.querySelector("[name='priority']")?.value || "basse"),
      estimatedHours: normalizeHours(wrapper.querySelector("[name='estimatedHours']")?.value, normalizeHours(ticket.estimatedHours, 2)),
      plannedDate: String(wrapper.querySelector("[name='plannedDate']")?.value || ""),
      status: "en_attente",
      seenByManager: true,
      returnNote: note,
    });
    toast(t("mgr.ask.info.sent"));
  });

  wrapper.querySelector("#mgrSaveBtn").addEventListener("click", () => {
    const modeVal = wrapper.querySelector("[name='assignMode']:checked")?.value || "interne";
    const isExterne = modeVal === "externe";
    const assignedTo = isExterne ? "" : String(wrapper.querySelector("[name='assignedTo']")?.value || "");
    const assignedToExternal = isExterne ? String(prestSelect?.value || "") : "";
    const nextStatus = assignedTo
      ? "planifie"
      : (ticket.status === "nouveau" ? "en_attente" : ticket.status);

    updateTicket(ticket.id, {
      assignedTo,
      assignedToExternal,
      suggestedAssigneeId: suggested?.id || "",
      priority: String(wrapper.querySelector("[name='priority']")?.value || "basse"),
      estimatedHours: normalizeHours(wrapper.querySelector("[name='estimatedHours']")?.value, normalizeHours(ticket.estimatedHours, 2)),
      plannedDate: String(wrapper.querySelector("[name='plannedDate']")?.value || ""),
      status: nextStatus,
      seenByManager: true,
      returnNote: String(wrapper.querySelector("[name='returnNote']")?.value || ""),
    });
    toast(t("mgr.saved"));
  });

  wrapper.querySelector("#mgrDeleteBtn").addEventListener("click", () => {
    const step1 = confirm(
      "⚠ ATTENTION — Suppression irréversible\n\n" +
      "Toutes les données de cette demande (historique, échanges, photo) seront définitivement effacées.\n\n" +
      "Cette option ne doit être utilisée que pour corriger une erreur de saisie ou supprimer un doublon.\n" +
      "Pour clôturer une demande traitée, utilisez le statut « Terminé ».\n\n" +
      "Voulez-vous continuer ?"
    );
    if (!step1) return;
    const step2 = confirm(
      `Confirmer la suppression définitive de la demande ${ticket.id} — « ${ticket.title} » ?\n\nCette action ne peut pas être annulée.`
    );
    if (!step2) return;
    state.tickets = state.tickets.filter((tk) => tk.id !== ticket.id);
    managerExpandedTicketId = "";
    persistState();
    render();
    toast(`Demande ${ticket.id} supprimée.`);
  });

  renderAssignWeekPicker();

  return wrapper;
}

function renderDetails(ticket) {
  const createdBy = findUser(ticket.createdBy)?.name || t("ticket.unknown");
  const assignedTo = ticket.assignedToExternal
    ? (findPrestataire(ticket.assignedToExternal)?.name || t("mgr.unassigned"))
    : (findUser(ticket.assignedTo)?.name || t("mgr.unassigned"));
  const site = ticket.siteId ? findSite(ticket.siteId) : null;
  const zone = ticket.zoneId ? findZone(ticket.siteId, ticket.zoneId) : null;
  const siteLabel = site
    ? `${site.name}${site.address ? ` — ${site.address}` : ""}${zone ? ` › ${zone.name}` : ""}`
    : t("ticket.unknown");

  const items = [
    detailItem(t("ticket.by"),        createdBy),
    detailItem(t("ticket.site"),      siteLabel),
    detailItem(t("ticket.desired"),   formatDate(ticket.desiredDate)),
    detailItem(t("ticket.intervention.delay"), interventionDelayLabel(ticket.interventionDelay)),
    detailItem(t("ticket.validated"), formatDate(ticket.plannedDate)),
    detailItem(t("ticket.estimated"), formatHours(ticket.estimatedHours || 0)),
    detailItem(t("ticket.assigned"),  assignedTo),
    detailItem(t("ticket.updated"),   formatDateTime(ticket.updatedAt)),
  ];

  return items.join("");
}

function updateTicket(ticketId, updates) {
  state.tickets = state.tickets.map((ticket) => {
    if (ticket.id !== ticketId) {
      return ticket;
    }
    return {
      ...ticket,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
  });
  render();
}

function updatePlanningTask(taskId, updates) {
  state.planningTasks = (state.planningTasks || []).map((pt) => {
    if (pt.id !== taskId) return pt;
    return { ...pt, ...updates };
  });
  render();
}

function nextTicketId() {
  const lastId = state.tickets
    .map((ticket) => Number(ticket.id.replace("T-", "")))
    .filter((value) => !Number.isNaN(value))
    .sort((left, right) => right - left)[0] || 1000;
  return `T-${lastId + 1}`;
}

function nextPlanningTaskId() {
  const last = (state.planningTasks || [])
    .map((pt) => Number(String(pt.id).replace("PT-", "")))
    .filter((n) => !isNaN(n))
    .sort((a, b) => b - a)[0] || 0;
  return `PT-${last + 1}`;
}

function nextUserId() {
  const lastId = state.users
    .map((user) => Number(user.id.replace("u-", "")))
    .filter((value) => !Number.isNaN(value))
    .sort((left, right) => right - left)[0] || 0;
  return `u-${lastId + 1}`;
}

function getCurrentUser() {
  if (!state.currentUserId) {
    return null;
  }
  return state.users.find((user) => user.id === state.currentUserId) || null;
}

function findUser(userId) {
  return state.users.find((user) => user.id === userId);
}

function managerIdForDepartment(department) {
  const manager = state.users.find((user) => user.role === "manager" && user.team === department);
  return manager ? manager.id : "";
}

function scoreAssigneeForTicket(user, ticket) {
  if (!user || user.role !== "collaborator" || user.team !== ticket.department) {
    return -1;
  }
  const specialties = normalizeSpecialties(user.specialties, user.team);
  const specialty = ticket.suggestedSpecialty || "general";
  const openTickets = state.tickets.filter((t) => t.assignedTo === user.id && t.status !== "termine").length;
  let score = 10;
  if (specialties.includes(specialty)) {
    score += 50;
  }
  if (specialties.includes("general")) {
    score += 10;
  }
  score -= openTickets * 5;
  return score;
}

function suggestAssignee(ticket, collaborators) {
  if (!Array.isArray(collaborators) || collaborators.length === 0) {
    return null;
  }
  const ranked = collaborators
    .map((user) => ({ user, score: scoreAssigneeForTicket(user, ticket) }))
    .filter((entry) => entry.score >= 0)
    .sort((left, right) => right.score - left.score);
  return ranked[0]?.user || null;
}

function linkedExternalForTicket(ticket) {
  const tree = loadTree();
  const path = Array.isArray(ticket.categoryPath) ? ticket.categoryPath : [];
  let nodes = tree;
  let current = null;
  let inheritedLinkedExternalId = "";

  for (const value of path) {
    current = nodes.find((n) => n.value === value) || null;
    if (!current) {
      break;
    }
    if (current.linkedExternalId) {
      inheritedLinkedExternalId = current.linkedExternalId;
    }
    nodes = current.children || [];
  }

  if (inheritedLinkedExternalId) {
    return inheritedLinkedExternalId;
  }

  if (ticket.categoryValue) {
    const stack = [...tree];
    while (stack.length > 0) {
      const node = stack.pop();
      if (!node) continue;
      if (node.value === ticket.categoryValue && node.linkedExternalId) {
        return node.linkedExternalId;
      }
      if (Array.isArray(node.children) && node.children.length > 0) {
        stack.push(...node.children);
      }
    }
  }

  const titleParts = String(ticket.title || "").split(" > ").map((part) => String(part || "").trim()).filter(Boolean);
  if (titleParts.length > 0) {
    const norm = (value) => String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    let titleNodes = tree;
    let titleInheritedLinked = "";
    for (const part of titleParts) {
      const found = titleNodes.find((node) => norm(node.label) === norm(part) || norm(node.value) === norm(part));
      if (!found) {
        break;
      }
      if (found.linkedExternalId) {
        titleInheritedLinked = found.linkedExternalId;
      }
      titleNodes = found.children || [];
    }
    if (titleInheritedLinked) {
      return titleInheritedLinked;
    }
  }

  return "";
}

function normalizeTeam(team) {
  if (pageConfig.role === "employee") {
    return "magasin";
  }
  return normalizeTeamKey(team);
}

function teamLabel(team) {
  return TEAM_LABELS_MAP()[team] || t("team.magasin");
}

function roleLabel(role) {
  return t("role." + role) || role;
}

function priorityLabel(priority) {
  return PRIORITY_LABELS()[priority] || t("priority.moyenne");
}

function statusLabel(status) {
  return STATUS_LABELS()[status] || t("status.nouveau");
}

function interventionDelayLabel(delayKey) {
  return t(`delay.${normalizeInterventionDelay(delayKey)}`);
}

function detailItem(label, value) {
  return `<div><dt>${label}</dt><dd>${value}</dd></div>`;
}

function normalizeInfoThread(messages) {
  if (!Array.isArray(messages)) {
    return [];
  }
  return messages
    .map((item, index) => ({
      id: String(item?.id || `m-${index + 1}`),
      authorRole: ["manager", "employee"].includes(item?.authorRole) ? item.authorRole : "manager",
      text: String(item?.text || "").trim(),
      at: String(item?.at || ""),
    }))
    .filter((item) => item.text);
}

function ticketInfoThread(ticket) {
  const normalized = normalizeInfoThread(ticket.infoThread);
  if (normalized.length > 0) {
    return normalized;
  }

  const legacy = [];
  if (ticket.returnNote) {
    legacy.push({
      id: `legacy-mgr-${ticket.id}`,
      authorRole: "manager",
      text: String(ticket.returnNote),
      at: ticket.updatedAt || ticket.createdAt || new Date().toISOString(),
    });
  }
  if (ticket.employeeReply) {
    legacy.push({
      id: `legacy-emp-${ticket.id}`,
      authorRole: "employee",
      text: String(ticket.employeeReply),
      at: ticket.employeeReplyAt || ticket.updatedAt || ticket.createdAt || new Date().toISOString(),
    });
  }
  return legacy;
}

function appendInfoMessage(ticket, authorRole, text) {
  const cleanText = String(text || "").trim();
  if (!cleanText) {
    return ticketInfoThread(ticket);
  }
  const current = ticketInfoThread(ticket);
  current.push({
    id: `m-${Date.now()}`,
    authorRole,
    text: cleanText,
    at: new Date().toISOString(),
  });
  return current;
}

function renderInfoThreadHtml(ticket) {
  const messages = ticketInfoThread(ticket);
  if (messages.length === 0) {
    return `<p class="subtle">${t("chat.empty")}</p>`;
  }
  return `
    <div class="info-thread-list">
      ${messages.map((message) => {
        const byManager = message.authorRole === "manager";
        return `
          <div class="info-thread-item ${byManager ? "from-manager" : "from-employee"}">
            <div class="info-thread-meta">${byManager ? t("chat.manager") : t("chat.employee")} · ${formatDateTime(message.at)}</div>
            <div class="info-thread-text">${escHtml(message.text)}</div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function groupBy(items, makeKey) {
  return items.reduce((accumulator, item) => {
    const key = makeKey(item);
    accumulator[key] ||= [];
    accumulator[key].push(item);
    return accumulator;
  }, {});
}

function sortByUpdatedDesc(left, right) {
  return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
}

function sortByPlannedDate(left, right) {
  return new Date(left.plannedDate || left.desiredDate).getTime() - new Date(right.plannedDate || right.desiredDate).getTime();
}

// Convertit un objet Date en "YYYY-MM-DD" en heure locale (évite le décalage UTC).
function localDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDate(value) {
  if (!value) return "—";
  // Extraire uniquement YYYY-MM-DD pour gérer aussi les chaînes ISO complètes
  const dateOnly = String(value).slice(0, 10);
  const [y, mo, d] = dateOnly.split("-").map(Number);
  const date = new Date(y, mo - 1, d);
  if (isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-BE", { dateStyle: "medium" }).format(date);
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-BE", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function today() {
  return localDateStr(new Date());
}

function toDataUrl(file) {
  return new Promise((resolve, reject) => {
    const MAX_W = 1200;
    const MAX_H = 900;
    const QUALITY = 0.75;
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (width > MAX_W || height > MAX_H) {
        const ratio = Math.min(MAX_W / width, MAX_H / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", QUALITY));
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("Impossible de lire la photo.")); };
    img.src = objectUrl;
  });
}

function toast(message) {
  const existing = document.querySelector(".toast");
  if (existing) {
    existing.remove();
  }

  const element = document.createElement("div");
  element.className = "toast";
  element.textContent = message;
  document.body.appendChild(element);

  window.setTimeout(() => {
    element.remove();
  }, 2200);
}

// Re-render when language changes
document.addEventListener("langchange", () => render());

// ── PWA : Service Worker ────────────────────────────────────────────────────
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

// ── Push notifications (managers only) ─────────────────────────────────────
let _pushSubscribed = false;

function urlBase64ToUint8Array(b64) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}

async function initPushNotifications(user) {
  if (_pushSubscribed) return;
  if (!user || user.role !== "manager") return;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
  try {
    const resp = await fetch("/api/push/vapid-public-key");
    if (!resp.ok) return;
    const { publicKey } = await resp.json();
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: sub.toJSON(), userId: user.id, role: "manager" }),
    });
    _pushSubscribed = true;
  } catch (err) {
    console.warn("Push init failed:", err.message);
  }
}

// ── iCal link (collaborators) ───────────────────────────────────────────────
function getIcalUrl(userId) {
  if (location.protocol === "file:") return null;
  return `${location.origin.replace(/\/+$/, "")}/api/ical/${encodeURIComponent(userId)}`;
}

