const STORAGE_KEY = "famiflora-flow-desk-v4";
const RESET_MARKER_KEY = "__flowdesk_reset_done_v1";
const TREE_CONFIG_KEY = "famiflora-tree-config-v1";

const DEFAULT_TREE = [
  {
    label: "Technique",
    value: "technique",
    children: [
      { label: "Electricite", value: "electricite", children: [
        { label: "Eclairage defaillant", value: "eclairage_defaillant" },
        { label: "Prise ou disjoncteur", value: "prise_disjoncteur" },
      ]},
      { label: "Plomberie", value: "plomberie", children: [
        { label: "Fuite", value: "fuite" },
        { label: "Bouchon / evacuation", value: "bouchon" },
      ]},
      { label: "Materiel / equipement", value: "materiel", children: [
        { label: "Panne machine", value: "panne_machine" },
        { label: "Remplacement piece", value: "remplacement_piece" },
      ]},
    ],
  },
  {
    label: "Decoration",
    value: "decoration",
    children: [
      { label: "Mise en scene", value: "mise_en_scene", children: [
        { label: "Nouvelle vitrine", value: "vitrine" },
        { label: "Reamenagement rayon", value: "rayon" },
      ]},
      { label: "Signalisation", value: "signalisation", children: [
        { label: "Affiche / panneau", value: "affiche" },
        { label: "Etiquetage", value: "etiquetage" },
      ]},
    ],
  },
];

const STATUS_KEYS  = ["nouveau", "en_attente", "planifie", "en_cours", "termine"];
const PRIORITY_KEYS = ["basse", "moyenne", "haute"];
const TEAM_KEYS     = ["magasin", "technique", "decoration"];

function STATUS_LABELS() { return { nouveau: t("status.nouveau"), en_attente: t("status.en_attente"), planifie: t("status.planifie"), en_cours: t("status.en_cours"), termine: t("status.termine") }; }
function PRIORITY_LABELS() { return { basse: t("priority.basse"), moyenne: t("priority.moyenne"), haute: t("priority.haute") }; }
function TEAM_LABELS_MAP() { return { magasin: t("team.magasin"), technique: t("team.technique"), decoration: t("team.decoration") }; }

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
    state.users = Array.isArray(saved.users) ? saved.users : [];
    state.tickets = Array.isArray(saved.tickets) ? saved.tickets : [];

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
      employee:     { name: "Employé",        role: "employee",     team: "magasin" },
      manager:      { name: "Responsable Tech", role: "manager",    team: "technique" },
      collaborator: { name: "Collaborateur",   role: "collaborator", team: "technique" },
    };
    const def = defaults[pageConfig.role];
    if (def) {
      const autoUser = { id: nextUserId(), ...def };
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
      };

      state.users.push(user);
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
        return parsed;
      }
    }
  } catch {}
  return DEFAULT_TREE;
}

function saveTree(tree) {
  localStorage.setItem(TREE_CONFIG_KEY, JSON.stringify(tree));
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

    state.tickets.unshift({
      id: nextTicketId(),
      title,
      description: comment,
      department,
      createdBy: currentUser?.id || "",
      desiredDate: today(),
      plannedDate: today(),
      assignedTo: "",
      managerId: managerIdForDepartment(department),
      priority: "moyenne",
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
  }
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
    }

    roleSelect.addEventListener("change", syncTeamOptions);
    syncTeamOptions();

    container.querySelector("#addUserForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const name = String(fd.get("name") || "").trim();
      const role = String(fd.get("role"));
      const team = String(fd.get("team"));
      if (!name) return;
      state.users.push({ id: nextUserId(), name, role, team });
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

  function nodeToHtml(node, path) {
    const pathKey = path.join(".");
    const hasChildren = node.children && node.children.length > 0;
    return `
      <div class="tree-node" data-path="${pathKey}">
        <div class="tree-node-row">
          <input class="tree-node-label" type="text" value="${escHtml(node.label)}" data-path="${pathKey}" data-field="label" placeholder="${t("tree.label.ph")}" />
          <input class="tree-node-value" type="text" value="${escHtml(node.value)}" data-path="${pathKey}" data-field="value" placeholder="${t("tree.value.ph")}" />
          <button class="button ghost tree-btn" type="button" data-action="add-child" data-path="${pathKey}">${t("tree.add.child")}</button>
          <button class="button danger-ghost tree-btn" type="button" data-action="delete-node" data-path="${pathKey}">${t("tree.delete")}</button>
        </div>
        ${hasChildren ? `<div class="tree-children">${node.children.map((child, i) => nodeToHtml(child, [...path, "children", i])).join("")}</div>` : ""}
      </div>
    `;
  }

  function getNodeAtPath(treeData, pathParts) {
    let current = treeData;
    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i];
      if (typeof part === "number") {
        current = current[part];
      } else {
        current = current[part];
      }
    }
    return current;
  }

  function renderEditor() {
    const currentTree = loadTree();
    container.innerHTML = `
      <div class="tree-editor-wrap">
        <div id="treeNodes">${currentTree.map((node, i) => nodeToHtml(node, [i])).join("")}</div>
        <div class="tree-editor-actions">
          <button class="button ghost" type="button" id="addRootNode">${t("tree.add.root")}</button>
          <button class="button" type="button" id="saveTree">${t("tree.save")}</button>
          <button class="button ghost" type="button" id="resetTree">${t("tree.restore")}</button>
        </div>
      </div>
    `;

    container.querySelector("#addRootNode").addEventListener("click", () => {
      const tr = loadTree();
      tr.push({ label: t("tree.add.root"), value: `cat_${Date.now()}`, children: [] });
      saveTree(tr);
      renderEditor();
    });

    container.querySelector("#resetTree").addEventListener("click", () => {
      saveTree(DEFAULT_TREE);
      renderEditor();
      toast(t("tree.restored"));
    });

    container.querySelector("#saveTree").addEventListener("click", () => {
      const tr2 = loadTree();
      container.querySelectorAll("[data-path][data-field]").forEach((input) => {
        const pathParts = input.dataset.path.split(".").map((p) => isNaN(p) ? p : Number(p));
        const field = input.dataset.field;
        const node = getNodeAtPath(tr2, pathParts);
        if (node && typeof node === "object") {
          node[field] = input.value.trim();
        }
      });
      saveTree(tr2);
      renderEditor();
      toast(t("tree.saved"));
    });

    container.querySelectorAll("[data-action='add-child']").forEach((btn) => {
      btn.addEventListener("click", () => {
        const tr3 = loadTree();
        const pathParts = btn.dataset.path.split(".").map((p) => isNaN(p) ? p : Number(p));
        const node = getNodeAtPath(tr3, pathParts);
        if (node) {
          node.children = node.children || [];
          node.children.push({ label: t("tree.add.child"), value: `item_${Date.now()}`, children: [] });
          saveTree(tr3);
          renderEditor();
        }
      });
    });

    container.querySelectorAll("[data-action='delete-node']").forEach((btn) => {
      btn.addEventListener("click", () => {
        const tr4 = loadTree();
        const pathParts = btn.dataset.path.split(".").map((p) => isNaN(p) ? p : Number(p));
        const parentPath = pathParts.slice(0, -1);
        const index = pathParts[pathParts.length - 1];
        const parent = parentPath.length === 0 ? { children: tr4 } : getNodeAtPath(tr4, parentPath);
        if (parent && Array.isArray(parent.children || parent)) {
          const arr = parentPath.length === 0 ? tr4 : parent.children || parent;
          arr.splice(index, 1);
          saveTree(tr4);
          renderEditor();
        }
      });
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
  const wrapper = document.createElement("form");
  wrapper.className = "manager-grid";
  const isWaiting = ticket.status === "en_attente";
  wrapper.innerHTML = `
    <div class="field">
      <label>${t("mgr.assign")}</label>
      <select name="assignedTo">
        <option value="">${t("mgr.unassigned")}</option>
        ${collaborators.map((u) => `<option value="${u.id}" ${ticket.assignedTo === u.id ? "selected" : ""}>${escHtml(u.name)}</option>`).join("")}
      </select>
    </div>
    <div class="field">
      <label>${t("mgr.priority")}</label>
      <select name="priority">
        ${Object.entries(PRIORITY_LABELS()).map(([v, l]) => `<option value="${v}" ${ticket.priority === v ? "selected" : ""}>${l}</option>`).join("")}
      </select>
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
      <button class="button secondary" type="submit">${t("mgr.save")}</button>
      ${!isWaiting ? `<button class="button ghost" type="button" data-action="quick-return">${t("mgr.return.btn")}</button>` : ""}
    </div>
  `;

  const statusSel = wrapper.querySelector(".status-select");
  const noteField = wrapper.querySelector(".return-note-field");

  statusSel.addEventListener("change", () => {
    noteField.classList.toggle("hidden", statusSel.value !== "en_attente");
  });

  wrapper.querySelector("[data-action='quick-return']")?.addEventListener("click", () => {
    statusSel.value = "en_attente";
    noteField.classList.remove("hidden");
    noteField.querySelector("textarea")?.focus();
  });

  wrapper.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(wrapper);
    updateTicket(ticket.id, {
      assignedTo: String(formData.get("assignedTo")),
      priority: String(formData.get("priority")),
      plannedDate: String(formData.get("plannedDate")),
      status: String(formData.get("status")),
      returnNote: String(formData.get("returnNote") || ""),
    });
    toast(t("mgr.saved"));
  });

  return wrapper;
}

function renderDetails(ticket) {
  const createdBy = findUser(ticket.createdBy)?.name || t("ticket.unknown");
  const assignedTo = findUser(ticket.assignedTo)?.name || t("mgr.unassigned");
  const manager = findUser(ticket.managerId)?.name || t("ticket.no.manager");

  const items = [
    detailItem(t("ticket.by"),        createdBy),
    detailItem(t("ticket.desired"),   formatDate(ticket.desiredDate)),
    detailItem(t("ticket.validated"), formatDate(ticket.plannedDate)),
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

function normalizeTeam(team) {
  if (pageConfig.role === "employee") {
    return "magasin";
  }
  return team === "technique" || team === "decoration" ? team : "technique";
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

