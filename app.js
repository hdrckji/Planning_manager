const STORAGE_KEY = "famiflora-flow-desk-v4";
const RESET_MARKER_KEY = "__flowdesk_reset_done_v1";
const TREE_CONFIG_KEY = "famiflora-tree-config-v1";
const PREST_KEY = "famiflora-prestataires-v1";

function loadPrestataires() {
  try { return JSON.parse(localStorage.getItem(PREST_KEY) || "[]"); } catch { return []; }
}
function savePrestataires(list) {
  localStorage.setItem(PREST_KEY, JSON.stringify(list));
}
function nextPrestId() {
  const list = loadPrestataires();
  const last = list.map((p) => Number(p.id.replace("p-", ""))).filter((n) => !isNaN(n)).sort((a, b) => b - a)[0] || 0;
  return `p-${last + 1}`;
}
function findPrestataire(id) {
  return loadPrestataires().find((p) => p.id === id) || null;
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
const TEAM_KEYS     = ["magasin", "technique", "decoration"];
const SPECIALTY_KEYS = ["general", "electricite", "plomberie", "equipement", "mise_en_scene", "signalisation"];

function STATUS_LABELS() { return { nouveau: t("status.nouveau"), en_attente: t("status.en_attente"), planifie: t("status.planifie"), en_cours: t("status.en_cours"), termine: t("status.termine") }; }
function PRIORITY_LABELS() { return { basse: t("priority.basse"), moyenne: t("priority.moyenne"), haute: t("priority.haute") }; }
function TEAM_LABELS_MAP() { return { magasin: t("team.magasin"), technique: t("team.technique"), decoration: t("team.decoration") }; }
function SPECIALTY_LABELS() { return { general: t("skill.general"), electricite: t("skill.electricite"), plomberie: t("skill.plomberie"), equipement: t("skill.equipement"), mise_en_scene: t("skill.mise_en_scene"), signalisation: t("skill.signalisation") }; }

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
  currentUserByRole: {
    employee: "",
    manager: "",
    collaborator: "",
  },
  currentUserId: "",
};

let managerSubPage = "dashboard";
let planningWeekOffset = 0;
let planningFilterCollab = "";

function escHtml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function normalizeTeamKey(team) {
  return TEAM_KEYS.includes(team) ? team : "technique";
}

function normalizeHours(value, fallback = 2) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    return fallback;
  }
  return Math.round(num * 2) / 2;
}

function defaultHoursForSpecialty(specialty) {
  const defaults = {
    general: 2,
    electricite: 2,
    plomberie: 2.5,
    equipement: 2,
    mise_en_scene: 3,
    signalisation: 1.5,
  };
  return defaults[specialty] || 2;
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
  if (team === "decoration") {
    return ["general", "mise_en_scene", "signalisation"];
  }
  return ["general", "electricite", "plomberie", "equipement"];
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
  return SPECIALTY_LABELS()[specialty] || SPECIALTY_LABELS().general;
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
  const specialty = seed.suggestedSpecialty && SPECIALTY_KEYS.includes(seed.suggestedSpecialty)
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
  const specialty = SPECIALTY_KEYS.includes(node.suggestedSpecialty)
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
  };
}

function normalizeTicket(ticket) {
  const suggestedSpecialty = SPECIALTY_KEYS.includes(ticket.suggestedSpecialty)
    ? ticket.suggestedSpecialty
    : inferSpecialtyFromValue(ticket.categoryValue || ticket.title);
  return {
    ...ticket,
    estimatedHours: normalizeHours(ticket.estimatedHours, defaultHoursForSpecialty(suggestedSpecialty)),
    suggestedSpecialty,
    suggestedAssigneeId: typeof ticket.suggestedAssigneeId === "string" ? ticket.suggestedAssigneeId : "",
    assignedToExternal: typeof ticket.assignedToExternal === "string" ? ticket.assignedToExternal : "",
    suggestedExternalId: typeof ticket.suggestedExternalId === "string" ? ticket.suggestedExternalId : "",
    categoryValue: String(ticket.categoryValue || ""),
    categoryPath: Array.isArray(ticket.categoryPath) ? ticket.categoryPath : [],
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

bootstrap();

function bootstrap() {
  hardResetDataOnce();
  loadState();
  enforcePageUserRole();
  bindGlobalEvents();
  configureProfileTeamField();
  renderUserSelector();
  render();
}

function hardResetDataOnce() {
  if (localStorage.getItem(RESET_MARKER_KEY) === "1") {
    return;
  }

  Object.keys(localStorage)
    .filter((key) => key.startsWith("famiflora-"))
    .forEach((key) => localStorage.removeItem(key));

  localStorage.setItem(RESET_MARKER_KEY, "1");
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return;
  }

  try {
    const saved = JSON.parse(raw);
    state.users = Array.isArray(saved.users) ? saved.users.map((user) => normalizeUser(user)) : [];
    state.tickets = Array.isArray(saved.tickets) ? saved.tickets.map((ticket) => normalizeTicket(ticket)) : [];

    const savedByRole = saved.currentUserByRole || {};
    state.currentUserByRole = {
      employee: typeof savedByRole.employee === "string" ? savedByRole.employee : "",
      manager: typeof savedByRole.manager === "string" ? savedByRole.manager : "",
      collaborator: typeof savedByRole.collaborator === "string" ? savedByRole.collaborator : "",
    };
  } catch {
    state.users = [];
    state.tickets = [];
  }
}

function enforcePageUserRole() {
  const users = usersForCurrentPage();
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
  state.currentUserByRole[pageConfig.role] = state.currentUserId || "";
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      users: state.users,
      tickets: state.tickets,
      currentUserByRole: state.currentUserByRole,
    }),
  );
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
  const currentUser = getCurrentUser();

  if (!currentUser) {
    const zeroStats = [
      { label: t("stats.total"),    value: 0 },
      { label: t("stats.pending"),  value: 0 },
      { label: t("stats.high"),     value: 0 },
      { label: t("stats.planning"), value: 0 },
    ];

    refs.statsGrid.innerHTML = zeroStats
      .map(
        (stat) => `
          <article class="stat-card">
            <span class="stat-value">${stat.value}</span>
            <span class="stat-label">${stat.label}</span>
          </article>
        `,
      )
      .join("");
    return;
  }

  const ticketsForTeam = currentUser.team === "magasin"
    ? state.tickets
    : state.tickets.filter((ticket) => ticket.department === currentUser.team);
  const assignedTickets = state.tickets.filter((ticket) => ticket.assignedTo === currentUser.id);
  const pending = ticketsForTeam.filter((ticket) => ticket.status !== "termine");

  const stats = [
    { label: t("stats.total"),    value: ticketsForTeam.length },
    { label: t("stats.pending"),  value: pending.length },
    { label: t("stats.high"),     value: ticketsForTeam.filter((ticket) => ticket.priority === "haute").length },
    { label: t("stats.planning"), value: assignedTickets.length },
  ];

  refs.statsGrid.innerHTML = stats
    .map(
      (stat) => `
        <article class="stat-card">
          <span class="stat-value">${stat.value}</span>
          <span class="stat-label">${stat.label}</span>
        </article>
      `,
    )
    .join("");
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
    const raw = localStorage.getItem(TREE_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return normalizeTree(parsed);
      }
    }
  } catch {}
  return normalizeTree(DEFAULT_TREE);
}

function saveTree(tree) {
  localStorage.setItem(TREE_CONFIG_KEY, JSON.stringify(normalizeTree(tree)));
}

function renderEmployeePage() {
  const currentUser = getCurrentUser();
  const tickets = currentUser
    ? state.tickets.filter((t) => t.createdBy === currentUser.id).sort(sortByUpdatedDesc)
    : [];
  const enAttenteTickets = tickets.filter((t) => t.status === "en_attente");

  refs.mainView.innerHTML = `
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
        <div class="field full" id="treeStepsContainer"></div>
        <div class="field full hidden" id="commentField">
          <label for="ticketComment">${t("emp.comment")}</label>
          <textarea id="ticketComment" name="comment" placeholder="${t("emp.comment.ph")}"></textarea>
        </div>
        <div class="field full hidden" id="photoField">
          <label for="ticketPhoto">${t("emp.photo")}</label>
          <input id="ticketPhoto" name="photo" type="file" accept="image/*" />
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
      <div class="ticket-list" id="employeeTicketList"></div>
    </section>
  `;

  const form = refs.mainView.querySelector("#ticketForm");
  const stepsContainer = form.querySelector("#treeStepsContainer");
  const commentField = form.querySelector("#commentField");
  const photoField = form.querySelector("#photoField");
  const submitField = form.querySelector("#submitField");

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
      commentField.classList.remove("hidden");
      photoField.classList.remove("hidden");
      submitField.classList.remove("hidden");
    } else {
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
    return root?.value || "technique";
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
    const photo = formData.get("photo");
    const photoDataUrl = photo instanceof File && photo.size > 0 ? await toDataUrl(photo) : "";
    const comment = String(formData.get("comment") || "").trim();
    const title = buildTitle();
    const department = buildDepartment();
    const selectedNode = findSelectedNode();
    const suggestedSpecialty = selectedNode?.suggestedSpecialty || inferSpecialtyFromValue(title);
    const estimatedHours = normalizeHours(selectedNode?.estimatedHours, defaultHoursForSpecialty(suggestedSpecialty));

    state.tickets.unshift({
      id: nextTicketId(),
      title,
      description: comment,
      department,
      categoryValue: selectedNode?.value || "",
      categoryPath: [...selections],
      createdBy: currentUser?.id || "",
      desiredDate: today(),
      plannedDate: today(),
      assignedTo: "",
      assignedToExternal: "",
      suggestedExternalId: selectedNode?.linkedExternalId || "",
      suggestedAssigneeId: "",
      managerId: managerIdForDepartment(department),
      priority: "moyenne",
      suggestedSpecialty,
      estimatedHours,
      status: "nouveau",
      photoDataUrl,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    selections = [];
    form.reset();
    rebuildSelects();
    render();
    toast(t("emp.sent"));
  });

  if (enAttenteTickets.length > 0) {
    renderTicketCards(refs.mainView.querySelector("#waitingTicketList"), enAttenteTickets, { mode: "read" });
  }
  renderTicketCards(refs.mainView.querySelector("#employeeTicketList"), tickets, { mode: "read" });
}

function renderManagerPage() {
  const currentUser = getCurrentUser();
  const teamTickets = state.tickets
    .filter((t) => t.department === currentUser.team)
    .sort(sortByPlannedDate);
  const collaborators = state.users.filter(
    (u) => u.role === "collaborator" && u.team === currentUser.team,
  );
  const alertCount = teamTickets.filter((t_) => t_.status === "nouveau" || t_.status === "en_attente").length;

  refs.mainView.innerHTML = `
    <nav class="manager-tabs">
      <button class="manager-tab ${managerSubPage === "dashboard"    ? "active" : ""}" data-subpage="dashboard">${t("tab.dashboard")}</button>
      <button class="manager-tab ${managerSubPage === "demandes"     ? "active" : ""}" data-subpage="demandes">${t("tab.requests")}${alertCount > 0 ? ` <span class="tab-badge">${alertCount}</span>` : ""}</button>
      <button class="manager-tab ${managerSubPage === "utilisateurs" ? "active" : ""}" data-subpage="utilisateurs">${t("tab.users")}</button>
      <button class="manager-tab ${managerSubPage === "categories"   ? "active" : ""}" data-subpage="categories">${t("tab.categories")}</button>
      <button class="manager-tab ${managerSubPage === "planning"     ? "active" : ""}" data-subpage="planning">${t("tab.planning")}</button>
      <button class="manager-tab ${managerSubPage === "prestataires" ? "active" : ""}" data-subpage="prestataires">${t("tab.prestataires")}</button>
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
    case "demandes":     return renderManagerDemandes(content, teamTickets, collaborators);
    case "utilisateurs": return renderManagerUtilisateurs(content);
    case "categories":   return renderTreeEditor(content);
    case "planning":     return renderManagerPlanning(content, collaborators);
    case "prestataires": return renderManagerPrestataires(content);
  }
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
                ${SPECIALTY_KEYS.map((opt) => `
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

  container.innerHTML = `
    <section class="card">
      <div class="section-head">
        <div>
          <h2>${t("dash.title")} — ${teamLabel(currentUser.team)}</h2>
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
        <h2>${t("dash.lanes.title")}</h2>
        <p class="subtle">${t("dash.lanes.subtitle")}</p>
      </div></div>
      <div class="lane-list" id="dashLanes"></div>
    </section>
  `;

  renderManagerLanes(container.querySelector("#dashLanes"), tickets);
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
      <div id="demandeList" class="ticket-list"></div>
    </section>
  `;

  const list = container.querySelector("#demandeList");
  const filterSel = container.querySelector("#statusFilter");

  function renderFiltered() {
    const filtered = currentFilter ? tickets.filter((t) => t.status === currentFilter) : tickets;
    renderTicketCards(list, filtered, { mode: "manage", collaborators });
  }

  filterSel.addEventListener("change", () => {
    currentFilter = filterSel.value;
    renderFiltered();
  });

  renderFiltered();
}

function renderManagerUtilisateurs(container) {
  function renderContent() {
    const managers = state.users.filter((u) => u.role === "manager");
    const collabs = state.users.filter((u) => u.role === "collaborator");
    const employees = state.users.filter((u) => u.role === "employee");

    const userListHtml = (users) => {
      if (users.length === 0) {
        return `<p class="subtle" style="padding:6px 0">${t("users.none")}</p>`;
      }
      return users.map((u) => `
        <div class="user-item">
          <div class="user-item-info">
            <strong>${escHtml(u.name)}</strong>
            <span class="badge badge-muted">${teamLabel(u.team)}</span>
            ${u.role === "collaborator" ? `<span class="badge badge-muted">${escHtml(specialtiesSummary(u))}</span>` : ""}
          </div>
          <button class="button danger-ghost tree-btn" type="button" data-action="del-user" data-uid="${u.id}">${t("users.delete")}</button>
        </div>
      `).join("");
    };

    container.innerHTML = `
      <section class="card">
        <div class="section-head">
          <div>
            <h2>${t("users.title")}</h2>
            <p class="subtle">${t("users.sub")}</p>
          </div>
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
                <option value="technique">${t("dept.technique")}</option>
                <option value="decoration">${t("dept.decoration")}</option>
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
        <div class="user-groups">
          <div class="user-group">
            <h3>${t("users.managers")} <span class="badge badge-muted">${managers.length}</span></h3>
            <div class="user-group-list">${userListHtml(managers)}</div>
          </div>
          <div class="user-group">
            <h3>${t("users.collabs")} <span class="badge badge-muted">${collabs.length}</span></h3>
            <div class="user-group-list">${userListHtml(collabs)}</div>
          </div>
          <div class="user-group">
            <h3>${t("users.employees")} <span class="badge badge-muted">${employees.length}</span></h3>
            <div class="user-group-list">${userListHtml(employees)}</div>
          </div>
        </div>
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

    container.querySelectorAll("[data-action='del-user']").forEach((btn) => {
      btn.addEventListener("click", () => {
        removeUser(btn.dataset.uid);
      });
    });
  }

  renderContent();
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
    const weekLabel = `${formatDate(days[0].toISOString().slice(0, 10))} – ${formatDate(days[6].toISOString().slice(0, 10))}`;
    let calTickets = state.tickets.filter((t_) => ["planifie", "en_cours", "termine"].includes(t_.status));
    if (planningFilterCollab) {
      calTickets = calTickets.filter((t_) => t_.assignedTo === planningFilterCollab);
    }

    container.innerHTML = `
      <section class="card">
        <div class="section-head">
          <div>
            <h2>${t("plan.title")}</h2>
            <p class="subtle">${weekLabel}</p>
          </div>
          <div class="planning-controls">
            <button class="button ghost" id="prevWeekBtn">${t("plan.prev")}</button>
            <button class="button ghost" id="todayBtn">${t("plan.today")}</button>
            <button class="button ghost" id="nextWeekBtn">${t("plan.next")}</button>
          </div>
        </div>
        <div class="planning-filter-bar">
          <label for="planCollab">${t("plan.collab.label")}</label>
          <select id="planCollab">
            <option value="">${t("plan.collab.all")}</option>
            ${collaborators.map((c) => `<option value="${c.id}" ${planningFilterCollab === c.id ? "selected" : ""}>${escHtml(c.name)}</option>`).join("")}
          </select>
        </div>
        <div class="cal-week">
          ${days.map((day) => {
            const dateStr = day.toISOString().slice(0, 10);
            const dayTickets = calTickets.filter((t) => (t.plannedDate || t.desiredDate) === dateStr);
            const isToday = dateStr === today();
            const dayName = new Intl.DateTimeFormat("fr-BE", { weekday: "short" }).format(day);
            const dayNum = new Intl.DateTimeFormat("fr-BE", { day: "numeric", month: "short" }).format(day);
            return `
              <div class="cal-day${isToday ? " cal-day--today" : ""}">
                <div class="cal-day-head">
                  <span class="cal-weekday">${dayName}</span>
                  <span class="cal-daynum">${dayNum}</span>
                </div>
                <div class="cal-day-body">
                  ${dayTickets.length === 0
                    ? '<span class="cal-empty">—</span>'
                    : dayTickets.map((t) => {
                        const assignee = findUser(t.assignedTo);
                        return `
                          <div class="cal-ticket" data-status="${t.status}" data-priority="${t.priority}">
                            <span class="cal-ticket-title">${escHtml(t.title)}</span>
                            ${assignee ? `<span class="cal-ticket-who">${escHtml(assignee.name)}</span>` : ""}
                            <span class="cal-ticket-hours">${formatHours(t.estimatedHours || 0)}</span>
                            <span class="badge badge-status" data-status="${t.status}">${statusLabel(t.status)}</span>
                          </div>
                        `;
                      }).join("")}
                </div>
              </div>
            `;
          }).join("")}
        </div>
      </section>
    `;

    container.querySelector("#prevWeekBtn").addEventListener("click", () => { planningWeekOffset--; renderWeek(); });
    container.querySelector("#todayBtn").addEventListener("click", () => { planningWeekOffset = 0; renderWeek(); });
    container.querySelector("#nextWeekBtn").addEventListener("click", () => { planningWeekOffset++; renderWeek(); });
    container.querySelector("#planCollab").addEventListener("change", (e) => { planningFilterCollab = e.target.value; renderWeek(); });
  }

  renderWeek();
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
                  ${TEAM_KEYS.filter((key) => key !== "magasin").map((key) => `<option value="${key}" ${selectedNode.team === key ? "selected" : ""}>${teamLabel(key)}</option>`).join("")}
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
      current.suggestedSpecialty = SPECIALTY_KEYS.includes(suggestedSpecialty) ? suggestedSpecialty : "general";
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
  const grouped = groupBy(tickets, (ticket) => ticket.plannedDate || "Sans date");

  refs.mainView.innerHTML = `
    <section class="card">
      <div class="section-head">
        <div>
          <h2>${t("collab.planning")}</h2>
          <p class="subtle">${t("collab.planning.sub")}</p>
        </div>
      </div>
      <div class="planning-list" id="planningList"></div>
    </section>
  `;

  const planningList = refs.mainView.querySelector("#planningList");
  if (tickets.length === 0) {
    planningList.innerHTML = `<div class="empty-state">${t("collab.task.none")}</div>`;
    return;
  }

  planningList.innerHTML = Object.entries(grouped)
    .map(([date, dayTickets]) => {
      return `
        <section class="planning-day">
          <div class="timeline-meta">
            <h3>${formatDate(date)}</h3>
            <span class="badge badge-muted">${dayTickets.length} ${t("collab.task.count")}</span>
          </div>
          ${dayTickets
            .map(
              (ticket) => `
                <article class="planning-ticket">
                  <div class="planning-head">
                    <strong>${ticket.title}</strong>
                    <span class="badge badge-priority" data-priority="${ticket.priority}">${priorityLabel(ticket.priority)}</span>
                    <span class="badge badge-status" data-status="${ticket.status}">${statusLabel(ticket.status)}</span>
                    <span class="badge badge-muted">${formatHours(ticket.estimatedHours || 0)}</span>
                  </div>
                  <p class="subtle">${ticket.description}</p>
                  <div class="ticket-actions">
                    ${ticket.status !== "termine" ? `<button class="button" type="button" data-action="mark-done" data-ticket-id="${ticket.id}">${t("collab.done")}</button>` : ""}
                  </div>
                </article>
              `,
            )
            .join("")}
        </section>
      `;
    })
    .join("");

  planningList.querySelectorAll("[data-action='mark-done']").forEach((button) => {
    button.addEventListener("click", () => {
      updateTicket(button.dataset.ticketId, { status: "termine" });
      toast(t("collab.marked"));
    });
  });
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
  const isWaiting = ticket.status === "en_attente";
  const suggested = suggestAssignee(ticket, collaborators);
  const suggestedLabel = suggested
    ? `${escHtml(suggested.name)} (${specialtyLabel(ticket.suggestedSpecialty || "general")})`
    : t("mgr.suggest.none");
  const selectedAssignee = ticket.assignedTo || ticket.suggestedAssigneeId || suggested?.id || "";
  const categoryLinkedExternalId = ticket.suggestedExternalId || linkedExternalForTicket(ticket);
  const initMode = (ticket.assignedToExternal || categoryLinkedExternalId) ? "externe" : "interne";
  const prestataires = loadPrestataires();
  const selectedPrest = ticket.assignedToExternal || categoryLinkedExternalId || "";

  wrapper.innerHTML = `
    <div class="field full">
      <div class="suggestion-box">
        <strong>${t("mgr.suggest.title")}</strong>
        <p class="subtle">${t("mgr.suggest.for")}: ${specialtyLabel(ticket.suggestedSpecialty || "general")} · ${formatHours(ticket.estimatedHours || 0)}</p>
        <p>${t("mgr.suggest.proposal")}: ${suggestedLabel}</p>
      </div>
    </div>
    <div class="field full">
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
    <div class="field">
      <label>${t("mgr.status")}</label>
      <select name="status" class="status-select">
        ${Object.entries(STATUS_LABELS()).map(([v, l]) => `<option value="${v}" ${ticket.status === v ? "selected" : ""}>${l}</option>`).join("")}
      </select>
    </div>
    <div class="field full return-note-field${isWaiting ? "" : " hidden"}">
      <label>${t("mgr.return.msg")}</label>
      <textarea name="returnNote" placeholder="${t("mgr.return.ph")}">${escHtml(ticket.returnNote || "")}</textarea>
    </div>
    <div class="field full">
      <button class="button secondary" type="button" id="mgrSaveBtn">${t("mgr.save")}</button>
      ${!isWaiting ? `<button class="button ghost" type="button" data-action="quick-return">${t("mgr.return.btn")}</button>` : ""}
    </div>
  `;

  const statusSel = wrapper.querySelector(".status-select");
  const noteField = wrapper.querySelector(".return-note-field");
  const interneBlock = wrapper.querySelectorAll(".assign-interne-block");
  const externeBlocks = wrapper.querySelectorAll(".assign-externe-block");
  const mailtoBtn = wrapper.querySelector("#mailtoBtn");
  const prestSelect = wrapper.querySelector("[name='assignedToExternal']");

  function buildMailtoHref(prestId) {
    const p = prestataires.find((x) => x.id === prestId);
    if (!p || !p.email) return "#";
    const subject = encodeURIComponent(`[Flow Desk] ${ticket.id} - ${ticket.title}`);
    const body = encodeURIComponent([
      `Référence : ${ticket.id}`,
      `Catégorie : ${ticket.categoryPath.join(" > ") || ticket.categoryValue || "-"}`,
      `Description : ${ticket.description}`,
      `Date souhaitée : ${ticket.desiredDate || "-"}`,
      `Date planifiée : ${ticket.plannedDate || "-"}`,
      `Durée estimée : ${formatHours(ticket.estimatedHours || 0)}`,
      `Compétence requise : ${specialtyLabel(ticket.suggestedSpecialty || "general")}`,
      "",
      "Merci de prendre contact pour confirmer l'intervention.",
      "— Flow Desk / Famiflora",
    ].join("\n"));
    return `mailto:${p.email}?subject=${subject}&body=${body}`;
  }

  function refreshMailto() {
    if (mailtoBtn) mailtoBtn.href = buildMailtoHref(prestSelect?.value || "");
  }

  statusSel.addEventListener("change", () => {
    noteField.classList.toggle("hidden", statusSel.value !== "en_attente");
  });

  wrapper.querySelectorAll("[name='assignMode']").forEach((radio) => {
    radio.addEventListener("change", () => {
      const isExterne = radio.value === "externe";
      interneBlock.forEach((el) => el.classList.toggle("hidden", isExterne));
      externeBlocks.forEach((el) => el.classList.toggle("hidden", !isExterne));
    });
  });

  if (prestSelect) {
    prestSelect.addEventListener("change", refreshMailto);
    refreshMailto();
  }

  wrapper.querySelector("[data-action='quick-return']")?.addEventListener("click", () => {
    statusSel.value = "en_attente";
    noteField.classList.remove("hidden");
    noteField.querySelector("textarea")?.focus();
  });

  wrapper.querySelector("#mgrSaveBtn").addEventListener("click", () => {
    const modeVal = wrapper.querySelector("[name='assignMode']:checked")?.value || "interne";
    const isExterne = modeVal === "externe";
    updateTicket(ticket.id, {
      assignedTo: isExterne ? "" : String(wrapper.querySelector("[name='assignedTo']")?.value || ""),
      assignedToExternal: isExterne ? String(prestSelect?.value || "") : "",
      suggestedAssigneeId: suggested?.id || "",
      priority: String(wrapper.querySelector("[name='priority']")?.value || "basse"),
      estimatedHours: normalizeHours(wrapper.querySelector("[name='estimatedHours']")?.value, normalizeHours(ticket.estimatedHours, 2)),
      plannedDate: String(wrapper.querySelector("[name='plannedDate']")?.value || ""),
      status: String(wrapper.querySelector("[name='status']")?.value || ticket.status),
      returnNote: String(wrapper.querySelector("[name='returnNote']")?.value || ""),
    });
    toast(t("mgr.saved"));
  });

  return wrapper;
}

function renderDetails(ticket) {
  const createdBy = findUser(ticket.createdBy)?.name || t("ticket.unknown");
  const assignedTo = ticket.assignedToExternal
    ? (findPrestataire(ticket.assignedToExternal)?.name || t("mgr.unassigned"))
    : (findUser(ticket.assignedTo)?.name || t("mgr.unassigned"));
  const manager = findUser(ticket.managerId)?.name || t("ticket.no.manager");

  const items = [
    detailItem(t("ticket.by"),        createdBy),
    detailItem(t("ticket.desired"),   formatDate(ticket.desiredDate)),
    detailItem(t("ticket.validated"), formatDate(ticket.plannedDate)),
    detailItem(t("ticket.estimated"), formatHours(ticket.estimatedHours || 0)),
    detailItem(t("ticket.specialty"), specialtyLabel(ticket.suggestedSpecialty || "general")),
    detailItem(t("ticket.assigned"),  assignedTo),
    detailItem(t("ticket.manager"),   manager),
    detailItem(t("ticket.updated"),   formatDateTime(ticket.updatedAt)),
  ];

  if (ticket.status === "en_attente" && ticket.returnNote) {
    items.push(`<div class="return-note-banner"><dt>${t("ticket.return.note")}</dt><dd>${escHtml(ticket.returnNote)}</dd></div>`);
  }

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

function nextTicketId() {
  const lastId = state.tickets
    .map((ticket) => Number(ticket.id.replace("T-", "")))
    .filter((value) => !Number.isNaN(value))
    .sort((left, right) => right - left)[0] || 1000;
  return `T-${lastId + 1}`;
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

function detailItem(label, value) {
  return `<div><dt>${label}</dt><dd>${value}</dd></div>`;
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

function formatDate(value) {
  if (!value) {
    return "A definir";
  }
  return new Intl.DateTimeFormat("fr-BE", { dateStyle: "medium" }).format(new Date(value));
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("fr-BE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function toDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Impossible de lire la photo."));
    reader.readAsDataURL(file);
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

