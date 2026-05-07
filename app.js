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

const STATUS_LABELS = {
  nouveau: "Nouveau",
  planifie: "Planifie",
  en_cours: "En cours",
  termine: "Termine",
};

const TEAM_LABELS = {
  magasin: "Magasin",
  technique: "Technique",
  decoration: "Decoration",
};

const PRIORITY_LABELS = {
  basse: "Basse",
  moyenne: "Moyenne",
  haute: "Haute",
};

const PAGE_CONFIG = {
  employee: {
    title: "Espace employe magasin",
    subtitle: "Creation et suivi des demandes d'intervention.",
    role: "employee",
  },
  manager: {
    title: "Espace responsable",
    subtitle: "Validation, attribution et planification des demandes.",
    role: "manager",
  },
  collaborator: {
    title: "Espace collaborateur",
    subtitle: "Planning personnel des taches attribuees.",
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

  // Pour la page employe, creer un profil generique si aucun n'existe
  if (pageConfig.role === "employee" && !state.currentUserId) {
    const autoUser = { id: nextUserId(), name: "Employe", role: "employee", team: "magasin" };
    state.users.push(autoUser);
    state.currentUserId = autoUser.id;
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
      toast("Profil ajoute.");
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
    refs.pageTitle.textContent = pageConfig.title;
  }
  if (refs.pageSubtitle) {
    refs.pageSubtitle.textContent = pageConfig.subtitle;
  }

  if (!user) {
    refs.currentRoleBadge.textContent = "Aucun profil";
    refs.currentTeamBadge.textContent = "Aucune equipe";
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
    refs.currentUser.innerHTML = '<option value="">Aucun profil cree</option>';
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
    refs.profileList.innerHTML = '<div class="empty-state">Aucun profil pour ce role.</div>';
    return;
  }

  refs.profileList.innerHTML = users
    .map((user) => `
      <div class="profile-item">
        <div>
          <strong>${user.name}</strong>
          <p class="subtle">${teamLabel(user.team)}</p>
        </div>
        <button class="button ghost" type="button" data-action="delete-profile" data-user-id="${user.id}">Supprimer</button>
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
  toast("Profil supprime.");
}

function renderStats() {
  const currentUser = getCurrentUser();

  if (!currentUser) {
    const zeroStats = [
      { label: "Demandes totales", value: 0 },
      { label: "A traiter", value: 0 },
      { label: "Haute priorite", value: 0 },
      { label: "Mon planning", value: 0 },
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
    { label: "Demandes totales", value: ticketsForTeam.length },
    { label: "A traiter", value: pending.length },
    { label: "Haute priorite", value: ticketsForTeam.filter((ticket) => ticket.priority === "haute").length },
    { label: "Mon planning", value: assignedTickets.length },
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
    refs.mainView.innerHTML = '<div class="empty-state">Ajoute d\'abord un profil dans le panneau de gauche.</div>';
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

  refs.mainView.innerHTML = `
    <section class="card">
      <div class="section-head">
        <div>
          <h2>Nouvelle demande</h2>
          <p class="subtle">Suivez les etapes pour qualifier votre demande d'intervention.</p>
        </div>
      </div>
      <form id="ticketForm" class="form-grid">
        <div class="field full" id="treeStepsContainer"></div>
        <div class="field full hidden" id="commentField">
          <label for="ticketComment">Commentaire (optionnel)</label>
          <textarea id="ticketComment" name="comment" placeholder="Decris l'emplacement, le contexte, l'urgence..."></textarea>
        </div>
        <div class="field full hidden" id="photoField">
          <label for="ticketPhoto">Photo (optionnelle)</label>
          <input id="ticketPhoto" name="photo" type="file" accept="image/*" />
        </div>
        <div class="field full hidden" id="submitField">
          <button class="button" type="submit">Envoyer la demande</button>
        </div>
      </form>
    </section>
    <section class="card">
      <div class="section-head"><div>
        <h2>Mes demandes</h2>
        <p class="subtle">Suivi des demandes creees depuis ce profil.</p>
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
    const label = depth === 0 ? "Categorie" : depth === 1 ? "Sous-categorie" : `Precision ${depth}`;
    const wrapper = document.createElement("div");
    wrapper.className = "field full tree-step";
    wrapper.dataset.depth = depth;
    wrapper.innerHTML = `
      <label>${label}</label>
      <select data-tree-depth="${depth}">
        <option value="">-- Choisir --</option>
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
    toast("Demande envoyee.");
  });

  renderTicketCards(refs.mainView.querySelector("#employeeTicketList"), tickets, { mode: "read" });
}

function renderManagerPage() {
  const currentUser = getCurrentUser();
  const tickets = state.tickets
    .filter((ticket) => ticket.department === currentUser.team)
    .sort(sortByPlannedDate);
  const collaborators = state.users.filter((user) => user.role === "collaborator" && user.team === currentUser.team);

  refs.mainView.innerHTML = `
    <section class="card">
      <div class="section-head">
        <div>
          <h2>Pilotage ${teamLabel(currentUser.team)}</h2>
          <p class="subtle">Affecte, priorise et confirme les dates de realisation.</p>
        </div>
      </div>
      <div class="lane-list" id="managerLanes"></div>
    </section>
    <section class="card">
      <div class="section-head">
        <div>
          <h2>File detaillee</h2>
          <p class="subtle">Chaque fiche reste editable rapidement.</p>
        </div>
      </div>
      <div class="ticket-list" id="managerTicketList"></div>
    </section>
    <section class="card">
      <div class="section-head">
        <div>
          <h2>Parametrer les categories</h2>
          <p class="subtle">Definissez l'arbre decisionnel affiche aux employes lors de la creation d'une demande.</p>
        </div>
      </div>
      <div id="treeEditor"></div>
    </section>
  `;

  renderManagerLanes(refs.mainView.querySelector("#managerLanes"), tickets);
  renderTicketCards(refs.mainView.querySelector("#managerTicketList"), tickets, {
    mode: "manage",
    collaborators,
  });
  renderTreeEditor(refs.mainView.querySelector("#treeEditor"));
}

function renderTreeEditor(container) {
  const tree = loadTree();

  function nodeToHtml(node, path) {
    const pathKey = path.join(".");
    const hasChildren = node.children && node.children.length > 0;
    return `
      <div class="tree-node" data-path="${pathKey}">
        <div class="tree-node-row">
          <input class="tree-node-label" type="text" value="${escHtml(node.label)}" data-path="${pathKey}" data-field="label" placeholder="Libelle" />
          <input class="tree-node-value" type="text" value="${escHtml(node.value)}" data-path="${pathKey}" data-field="value" placeholder="Valeur (sans espace)" />
          <button class="button ghost tree-btn" type="button" data-action="add-child" data-path="${pathKey}">+ Sous-niveau</button>
          <button class="button danger-ghost tree-btn" type="button" data-action="delete-node" data-path="${pathKey}">Supprimer</button>
        </div>
        ${hasChildren ? `<div class="tree-children">${node.children.map((child, i) => nodeToHtml(child, [...path, "children", i])).join("")}</div>` : ""}
      </div>
    `;
  }

  function escHtml(str) {
    return String(str).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
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
          <button class="button ghost" type="button" id="addRootNode">+ Ajouter une categorie racine</button>
          <button class="button" type="button" id="saveTree">Enregistrer</button>
          <button class="button ghost" type="button" id="resetTree">Restaurer par defaut</button>
        </div>
      </div>
    `;

    container.querySelector("#addRootNode").addEventListener("click", () => {
      const t = loadTree();
      t.push({ label: "Nouvelle categorie", value: `cat_${Date.now()}`, children: [] });
      saveTree(t);
      renderEditor();
    });

    container.querySelector("#resetTree").addEventListener("click", () => {
      saveTree(DEFAULT_TREE);
      renderEditor();
      toast("Arbre restaure par defaut.");
    });

    container.querySelector("#saveTree").addEventListener("click", () => {
      const t = loadTree();
      container.querySelectorAll("[data-path][data-field]").forEach((input) => {
        const pathParts = input.dataset.path.split(".").map((p) => isNaN(p) ? p : Number(p));
        const field = input.dataset.field;
        const node = getNodeAtPath(t, pathParts);
        if (node && typeof node === "object") {
          node[field] = input.value.trim();
        }
      });
      saveTree(t);
      renderEditor();
      toast("Categories enregistrees.");
    });

    container.querySelectorAll("[data-action='add-child']").forEach((btn) => {
      btn.addEventListener("click", () => {
        const t = loadTree();
        const pathParts = btn.dataset.path.split(".").map((p) => isNaN(p) ? p : Number(p));
        const node = getNodeAtPath(t, pathParts);
        if (node) {
          node.children = node.children || [];
          node.children.push({ label: "Nouveau", value: `item_${Date.now()}`, children: [] });
          saveTree(t);
          renderEditor();
        }
      });
    });

    container.querySelectorAll("[data-action='delete-node']").forEach((btn) => {
      btn.addEventListener("click", () => {
        const t = loadTree();
        const pathParts = btn.dataset.path.split(".").map((p) => isNaN(p) ? p : Number(p));
        const parentPath = pathParts.slice(0, -1);
        const index = pathParts[pathParts.length - 1];
        const parent = parentPath.length === 0 ? { children: t } : getNodeAtPath(t, parentPath);
        if (parent && Array.isArray(parent.children || parent)) {
          const arr = parentPath.length === 0 ? t : parent.children || parent;
          arr.splice(index, 1);
          saveTree(t);
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
          <h2>Mon planning</h2>
          <p class="subtle">Vue chronologique des taches affectees a ce collaborateur.</p>
        </div>
      </div>
      <div class="planning-list" id="planningList"></div>
    </section>
  `;

  const planningList = refs.mainView.querySelector("#planningList");
  if (tickets.length === 0) {
    planningList.innerHTML = '<div class="empty-state">Aucune tache affectee pour le moment.</div>';
    return;
  }

  planningList.innerHTML = Object.entries(grouped)
    .map(([date, dayTickets]) => {
      return `
        <section class="planning-day">
          <div class="timeline-meta">
            <h3>${formatDate(date)}</h3>
            <span class="badge badge-muted">${dayTickets.length} tache(s)</span>
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
                    ${ticket.status !== "termine" ? `<button class="button" type="button" data-action="mark-done" data-ticket-id="${ticket.id}">Marquer termine</button>` : ""}
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
      toast("Tache marquee comme terminee.");
    });
  });
}

function renderManagerLanes(container, tickets) {
  const laneMap = [
    { key: "nouveau", label: "Nouveau" },
    { key: "planifie", label: "Planifie" },
    { key: "en_cours", label: "En cours" },
    { key: "termine", label: "Termine" },
  ];

  container.innerHTML = laneMap
    .map((lane) => {
      const items = tickets.filter((ticket) => ticket.status === lane.key);
      return `
        <section class="lane-card">
          <h3>${lane.label}</h3>
          ${items.length === 0 ? '<div class="empty-state">Aucune demande.</div>' : items
            .map(
              (ticket) => `
                <article class="ticket-mini">
                  <strong>${ticket.title}</strong>
                  <p class="subtle">${ticket.plannedDate ? formatDate(ticket.plannedDate) : "Date a confirmer"}</p>
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
    container.innerHTML = '<div class="empty-state">Aucune demande a afficher.</div>';
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
  wrapper.innerHTML = `
    <div class="field">
      <label>Affecter a</label>
      <select name="assignedTo">
        <option value="">Non attribue</option>
        ${collaborators
          .map(
            (user) => `<option value="${user.id}" ${ticket.assignedTo === user.id ? "selected" : ""}>${user.name}</option>`,
          )
          .join("")}
      </select>
    </div>
    <div class="field">
      <label>Priorite</label>
      <select name="priority">
        ${Object.entries(PRIORITY_LABELS)
          .map(
            ([value, label]) => `<option value="${value}" ${ticket.priority === value ? "selected" : ""}>${label}</option>`,
          )
          .join("")}
      </select>
    </div>
    <div class="field">
      <label>Date validee</label>
      <input name="plannedDate" type="date" value="${ticket.plannedDate || ticket.desiredDate || today()}" />
    </div>
    <div class="field">
      <label>Statut</label>
      <select name="status">
        ${Object.entries(STATUS_LABELS)
          .map(
            ([value, label]) => `<option value="${value}" ${ticket.status === value ? "selected" : ""}>${label}</option>`,
          )
          .join("")}
      </select>
    </div>
    <div class="field full">
      <button class="button secondary" type="submit">Enregistrer</button>
    </div>
  `;

  wrapper.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(wrapper);
    updateTicket(ticket.id, {
      assignedTo: String(formData.get("assignedTo")),
      priority: String(formData.get("priority")),
      plannedDate: String(formData.get("plannedDate")),
      status: String(formData.get("status")),
    });
    toast("Demande mise a jour.");
  });

  return wrapper;
}

function renderDetails(ticket) {
  const createdBy = findUser(ticket.createdBy)?.name || "Inconnu";
  const assignedTo = findUser(ticket.assignedTo)?.name || "Non attribue";
  const manager = findUser(ticket.managerId)?.name || "Responsable non defini";

  return [
    detailItem("Demande par", createdBy),
    detailItem("Date souhaitee", formatDate(ticket.desiredDate)),
    detailItem("Date validee", formatDate(ticket.plannedDate)),
    detailItem("Attribue a", assignedTo),
    detailItem("Responsable", manager),
    detailItem("Mis a jour", formatDateTime(ticket.updatedAt)),
  ].join("");
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
  return TEAM_LABELS[team] || "Magasin";
}

function roleLabel(role) {
  const labels = {
    employee: "Employe magasin",
    manager: "Responsable",
    collaborator: "Collaborateur",
  };
  return labels[role] || role;
}

function priorityLabel(priority) {
  return PRIORITY_LABELS[priority] || "Moyenne";
}

function statusLabel(status) {
  return STATUS_LABELS[status] || "Nouveau";
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
