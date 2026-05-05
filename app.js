const STORAGE_KEY = "famiflora-flow-desk-v1";

const USERS = [
  { id: "u-emp-1", name: "Camille - Vente", role: "employee", team: "magasin" },
  { id: "u-emp-2", name: "Noah - Caisse", role: "employee", team: "magasin" },
  { id: "u-man-tech", name: "Julien - Responsable technique", role: "manager", team: "technique" },
  { id: "u-col-tech-1", name: "Sophie - Technicienne", role: "collaborator", team: "technique" },
  { id: "u-col-tech-2", name: "Milan - Technicien", role: "collaborator", team: "technique" },
  { id: "u-man-deco", name: "Claire - Responsable déco", role: "manager", team: "decoration" },
  { id: "u-col-deco-1", name: "Emma - Décoratrice", role: "collaborator", team: "decoration" },
  { id: "u-col-deco-2", name: "Lucas - Décorateur", role: "collaborator", team: "decoration" },
];

const STATUS_LABELS = {
  nouveau: "Nouveau",
  planifie: "Planifié",
  en_cours: "En cours",
  termine: "Terminé",
};

const TEAM_LABELS = {
  technique: "Technique",
  decoration: "Décoration",
};

const PRIORITY_LABELS = {
  basse: "Basse",
  moyenne: "Moyenne",
  haute: "Haute",
};

const VIEW_BY_ROLE = {
  employee: ["employee"],
  manager: ["manager"],
  collaborator: ["collaborator"],
};

const INITIAL_TICKETS = [
  {
    id: "T-1001",
    title: "Éclairage panne rayon extérieur",
    description: "Les spots du rayon extérieur clignotent depuis ce matin. Vérifier l'alimentation et remplacer si besoin.",
    department: "technique",
    createdBy: "u-emp-1",
    desiredDate: addDays(2),
    plannedDate: addDays(2),
    assignedTo: "u-col-tech-1",
    managerId: "u-man-tech",
    priority: "haute",
    status: "planifie",
    photoDataUrl: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "T-1002",
    title: "Inspiration coin printemps entrée",
    description: "Créer une mise en avant plus fleurie et colorée à l'entrée principale avec un rendu photo-friendly.",
    department: "decoration",
    createdBy: "u-emp-2",
    desiredDate: addDays(4),
    plannedDate: addDays(5),
    assignedTo: "u-col-deco-1",
    managerId: "u-man-deco",
    priority: "moyenne",
    status: "en_cours",
    photoDataUrl: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const state = {
  tickets: [],
  currentUserId: USERS[0].id,
  currentView: "employee",
};

const refs = {
  currentUser: document.querySelector("#currentUser"),
  currentRoleBadge: document.querySelector("#currentRoleBadge"),
  currentTeamBadge: document.querySelector("#currentTeamBadge"),
  statsGrid: document.querySelector("#statsGrid"),
  viewTabs: document.querySelector("#viewTabs"),
  employeeView: document.querySelector("#employeeView"),
  managerView: document.querySelector("#managerView"),
  collaboratorView: document.querySelector("#collaboratorView"),
  resetDemoButton: document.querySelector("#resetDemoButton"),
  ticketCardTemplate: document.querySelector("#ticketCardTemplate"),
};

bootstrap();

function bootstrap() {
  loadState();
  bindGlobalEvents();
  renderUserSelector();
  render();
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    state.tickets = structuredClone(INITIAL_TICKETS);
    return;
  }

  try {
    const saved = JSON.parse(raw);
    state.tickets = Array.isArray(saved.tickets) ? saved.tickets : structuredClone(INITIAL_TICKETS);
    state.currentUserId = saved.currentUserId || USERS[0].id;
  } catch {
    state.tickets = structuredClone(INITIAL_TICKETS);
  }
}

function persistState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      tickets: state.tickets,
      currentUserId: state.currentUserId,
    }),
  );
}

function bindGlobalEvents() {
  refs.currentUser.addEventListener("change", (event) => {
    state.currentUserId = event.target.value;
    state.currentView = VIEW_BY_ROLE[getCurrentUser().role][0];
    persistState();
    render();
  });

  refs.resetDemoButton.addEventListener("click", () => {
    state.tickets = structuredClone(INITIAL_TICKETS);
    persistState();
    render();
    toast("Démo réinitialisée.");
  });
}

function render() {
  const user = getCurrentUser();
  refs.currentUser.value = user.id;
  refs.currentRoleBadge.textContent = roleLabel(user.role);
  refs.currentTeamBadge.textContent = teamLabel(user.team);

  renderStats();
  renderTabs();
  renderEmployeeView();
  renderManagerView();
  renderCollaboratorView();
  toggleViews();
  persistState();
}

function renderUserSelector() {
  refs.currentUser.innerHTML = USERS.map(
    (user) => `<option value="${user.id}">${user.name}</option>`,
  ).join("");
}

function renderStats() {
  const currentUser = getCurrentUser();
  const ticketsForTeam = currentUser.team === "magasin"
    ? state.tickets
    : state.tickets.filter((ticket) => ticket.department === currentUser.team);
  const assignedTickets = state.tickets.filter((ticket) => ticket.assignedTo === currentUser.id);
  const pending = ticketsForTeam.filter((ticket) => ticket.status !== "termine");

  const stats = [
    { label: "Demandes totales", value: ticketsForTeam.length },
    { label: "À traiter", value: pending.length },
    { label: "Haute priorité", value: ticketsForTeam.filter((ticket) => ticket.priority === "haute").length },
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

function renderTabs() {
  const views = VIEW_BY_ROLE[getCurrentUser().role];
  refs.viewTabs.innerHTML = views
    .map((view) => {
      const labels = {
        employee: "Nouvelle demande",
        manager: "Pilotage d'équipe",
        collaborator: "Mon planning",
      };
      return `<button class="tab ${state.currentView === view ? "active" : ""}" type="button" data-view="${view}">${labels[view]}</button>`;
    })
    .join("");

  refs.viewTabs.querySelectorAll(".tab").forEach((button) => {
    button.addEventListener("click", () => {
      state.currentView = button.dataset.view;
      render();
    });
  });
}

function toggleViews() {
  refs.employeeView.classList.toggle("hidden", state.currentView !== "employee");
  refs.managerView.classList.toggle("hidden", state.currentView !== "manager");
  refs.collaboratorView.classList.toggle("hidden", state.currentView !== "collaborator");
}

function renderEmployeeView() {
  const currentUser = getCurrentUser();
  const tickets = state.tickets
    .filter((ticket) => ticket.createdBy === currentUser.id)
    .sort(sortByUpdatedDesc);

  refs.employeeView.innerHTML = `
    <section class="card">
      <div class="section-head">
        <div>
          <h2>Créer une demande</h2>
          <p class="subtle">Technique pour une panne, Décoration pour une inspiration ou une mise en scène.</p>
        </div>
      </div>
      <form id="ticketForm" class="form-grid">
        <div class="field">
          <label for="department">Service concerné</label>
          <select id="department" name="department" required>
            <option value="technique">Technique</option>
            <option value="decoration">Décoration</option>
          </select>
        </div>
        <div class="field">
          <label for="desiredDate">Date souhaitée</label>
          <input id="desiredDate" name="desiredDate" type="date" required />
        </div>
        <div class="field full">
          <label for="title">Titre court</label>
          <input id="title" name="title" type="text" maxlength="80" placeholder="Exemple: Remplacer un spot dans le rayon plantes" required />
        </div>
        <div class="field full">
          <label for="description">Description</label>
          <textarea id="description" name="description" placeholder="Décrivez le besoin, l'emplacement, l'impact et le rendu attendu." required></textarea>
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
          <p class="subtle">Suivi des demandes créées depuis ce profil.</p>
        </div>
      </div>
      <div class="ticket-list" id="employeeTicketList"></div>
    </section>
  `;

  const form = refs.employeeView.querySelector("#ticketForm");
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
    toast("Demande envoyée.");
  });

  renderTicketCards(refs.employeeView.querySelector("#employeeTicketList"), tickets, { mode: "read" });
}

function renderManagerView() {
  const currentUser = getCurrentUser();
  const tickets = state.tickets
    .filter((ticket) => ticket.department === currentUser.team)
    .sort(sortByPlannedDate);
  const collaborators = USERS.filter((user) => user.role === "collaborator" && user.team === currentUser.team);

  refs.managerView.innerHTML = `
    <section class="card">
      <div class="section-head">
        <div>
          <h2>Pilotage ${teamLabel(currentUser.team)}</h2>
          <p class="subtle">Affectez, priorisez et confirmez les dates de réalisation.</p>
        </div>
      </div>
      <div class="lane-list" id="managerLanes"></div>
    </section>
    <section class="card">
      <div class="section-head">
        <div>
          <h2>File détaillée</h2>
          <p class="subtle">Chaque fiche reste éditable rapidement.</p>
        </div>
      </div>
      <div class="ticket-list" id="managerTicketList"></div>
    </section>
  `;

  renderManagerLanes(refs.managerView.querySelector("#managerLanes"), tickets);
  renderTicketCards(refs.managerView.querySelector("#managerTicketList"), tickets, {
    mode: "manage",
    collaborators,
  });
}

function renderCollaboratorView() {
  const currentUser = getCurrentUser();
  const tickets = state.tickets
    .filter((ticket) => ticket.assignedTo === currentUser.id)
    .sort(sortByPlannedDate);
  const grouped = groupBy(tickets, (ticket) => ticket.plannedDate || "Sans date");

  refs.collaboratorView.innerHTML = `
    <section class="card">
      <div class="section-head">
        <div>
          <h2>Mon planning</h2>
          <p class="subtle">Vue chronologique des tâches affectées à ce collaborateur.</p>
        </div>
      </div>
      <div class="planning-list" id="planningList"></div>
    </section>
  `;

  const planningList = refs.collaboratorView.querySelector("#planningList");
  if (tickets.length === 0) {
    planningList.innerHTML = `<div class="empty-state">Aucune tâche affectée pour le moment.</div>`;
    return;
  }

  planningList.innerHTML = Object.entries(grouped)
    .map(([date, dayTickets]) => {
      return `
        <section class="planning-day">
          <div class="timeline-meta">
            <h3>${formatDate(date)}</h3>
            <span class="badge badge-muted">${dayTickets.length} tâche(s)</span>
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
                    ${ticket.status !== "termine" ? `<button class="button" type="button" data-action="mark-done" data-ticket-id="${ticket.id}">Marquer terminé</button>` : ""}
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
      toast("Tâche marquée comme terminée.");
    });
  });
}

function renderManagerLanes(container, tickets) {
  const laneMap = [
    { key: "nouveau", label: "Nouveau" },
    { key: "planifie", label: "Planifié" },
    { key: "en_cours", label: "En cours" },
    { key: "termine", label: "Terminé" },
  ];

  container.innerHTML = laneMap
    .map((lane) => {
      const items = tickets.filter((ticket) => ticket.status === lane.key);
      return `
        <section class="lane-card">
          <h3>${lane.label}</h3>
          ${items.length === 0 ? `<div class="empty-state">Aucune demande.</div>` : items
            .map(
              (ticket) => `
                <article class="ticket-mini">
                  <strong>${ticket.title}</strong>
                  <p class="subtle">${ticket.plannedDate ? formatDate(ticket.plannedDate) : "Date à confirmer"}</p>
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
    container.innerHTML = `<div class="empty-state">Aucune demande à afficher.</div>`;
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
      <label>Affecter à</label>
      <select name="assignedTo">
        <option value="">Non attribué</option>
        ${collaborators
          .map(
            (user) => `<option value="${user.id}" ${ticket.assignedTo === user.id ? "selected" : ""}>${user.name}</option>`,
          )
          .join("")}
      </select>
    </div>
    <div class="field">
      <label>Priorité</label>
      <select name="priority">
        ${Object.entries(PRIORITY_LABELS)
          .map(
            ([value, label]) => `<option value="${value}" ${ticket.priority === value ? "selected" : ""}>${label}</option>`,
          )
          .join("")}
      </select>
    </div>
    <div class="field">
      <label>Date validée</label>
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
    toast("Demande mise à jour.");
  });

  return wrapper;
}

function renderDetails(ticket) {
  const createdBy = findUser(ticket.createdBy)?.name || "Inconnu";
  const assignedTo = findUser(ticket.assignedTo)?.name || "Non attribué";
  const manager = findUser(ticket.managerId)?.name || "Responsable non défini";

  return [
    detailItem("Demandé par", createdBy),
    detailItem("Date souhaitée", formatDate(ticket.desiredDate)),
    detailItem("Date validée", formatDate(ticket.plannedDate)),
    detailItem("Attribué à", assignedTo),
    detailItem("Responsable", manager),
    detailItem("Mis à jour", formatDateTime(ticket.updatedAt)),
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

function getCurrentUser() {
  return USERS.find((user) => user.id === state.currentUserId) || USERS[0];
}

function findUser(userId) {
  return USERS.find((user) => user.id === userId);
}

function managerIdForDepartment(department) {
  return department === "technique" ? "u-man-tech" : "u-man-deco";
}

function teamLabel(team) {
  return TEAM_LABELS[team] || "Magasin";
}

function roleLabel(role) {
  const labels = {
    employee: "Employé magasin",
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
    return "À définir";
  }
  return new Intl.DateTimeFormat("fr-BE", { dateStyle: "medium" }).format(new Date(value));
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("fr-BE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
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