const STORAGE_KEY = "famiflora-flow-desk-v3";

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
  resetDemoButton: document.querySelector("#resetDemoButton"),
  ticketCardTemplate: document.querySelector("#ticketCardTemplate"),
  navLinks: document.querySelectorAll("[data-nav-page]"),
  profileForm: document.querySelector("#profileForm"),
  profileTeam: document.querySelector("#profileTeam"),
  profileList: document.querySelector("#profileList"),
};

bootstrap();

function bootstrap() {
  loadState();
  enforcePageUserRole();
  bindGlobalEvents();
  configureProfileTeamField();
  renderUserSelector();
  render();
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

  refs.resetDemoButton.addEventListener("click", () => {
    state.users = [];
    state.tickets = [];
    state.currentUserId = "";
    state.currentUserByRole = {
      employee: "",
      manager: "",
      collaborator: "",
    };
    persistState();
    renderUserSelector();
    render();
    toast("Toutes les donnees locales ont ete effacees.");
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

function renderEmployeePage() {
  const currentUser = getCurrentUser();
  const tickets = state.tickets
    .filter((ticket) => ticket.createdBy === currentUser.id)
    .sort(sortByUpdatedDesc);

  refs.mainView.innerHTML = `
    <section class="card">
      <div class="section-head">
        <div>
          <h2>Creer une demande</h2>
          <p class="subtle">Technique pour une panne, Decoration pour une inspiration ou une mise en scene.</p>
        </div>
      </div>
      <form id="ticketForm" class="form-grid">
        <div class="field">
          <label for="department">Service concerne</label>
          <select id="department" name="department" required>
            <option value="technique">Technique</option>
            <option value="decoration">Decoration</option>
          </select>
        </div>
        <div class="field">
          <label for="desiredDate">Date souhaitee</label>
          <input id="desiredDate" name="desiredDate" type="date" required />
        </div>
        <div class="field full">
          <label for="title">Titre court</label>
          <input id="title" name="title" type="text" maxlength="80" placeholder="Exemple: Remplacer un spot dans le rayon plantes" required />
        </div>
        <div class="field full">
          <label for="description">Description</label>
          <textarea id="description" name="description" placeholder="Decris le besoin, l'emplacement, l'impact et le rendu attendu." required></textarea>
        </div>
        <div class="field full">
          <label for="photo">Photo optionnelle</label>
          <input id="photo" name="photo" type="file" accept="image/*" />
        </div>
        <div class="field full">
          <button class="button" type="submit">Envoyer la demande</button>
        </div>
      </form>
    </section>

    <section class="card">
      <div class="section-head">
        <div>
          <h2>Mes demandes</h2>
          <p class="subtle">Suivi des demandes creees depuis ce profil.</p>
        </div>
      </div>
      <div class="ticket-list" id="employeeTicketList"></div>
    </section>
  `;

  const form = refs.mainView.querySelector("#ticketForm");
  form.desiredDate.value = today();
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const photo = formData.get("photo");
    const photoDataUrl = photo instanceof File && photo.size > 0 ? await toDataUrl(photo) : "";

    state.tickets.unshift({
      id: nextTicketId(),
      title: String(formData.get("title")).trim(),
      description: String(formData.get("description")).trim(),
      department: String(formData.get("department")),
      createdBy: currentUser.id,
      desiredDate: String(formData.get("desiredDate")),
      plannedDate: String(formData.get("desiredDate")),
      assignedTo: "",
      managerId: managerIdForDepartment(String(formData.get("department"))),
      priority: "moyenne",
      status: "nouveau",
      photoDataUrl,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    form.reset();
    form.desiredDate.value = today();
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
  `;

  renderManagerLanes(refs.mainView.querySelector("#managerLanes"), tickets);
  renderTicketCards(refs.mainView.querySelector("#managerTicketList"), tickets, {
    mode: "manage",
    collaborators,
  });
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
