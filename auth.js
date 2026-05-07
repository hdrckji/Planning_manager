const AUTH_CONFIG = {
  employee: {
    password: "employe123",
    label: "Espace employe",
    path: "employee.html",
  },
  manager: {
    password: "manager123",
    label: "Espace manager",
    path: "manager.html",
  },
  collaborator: {
    password: "collab123",
    label: "Espace collaborateur",
    path: "collaborator.html",
  },
};

const AUTH_SESSION_PREFIX = "flowdesk-auth-session:";

function authSessionKey(role) {
  return `${AUTH_SESSION_PREFIX}${role}`;
}

function isAuthenticated(role) {
  return sessionStorage.getItem(authSessionKey(role)) === "1";
}

function login(role, password) {
  const config = AUTH_CONFIG[role];
  if (!config || password !== config.password) {
    return false;
  }

  sessionStorage.setItem(authSessionKey(role), "1");
  return true;
}

function logout(role) {
  sessionStorage.removeItem(authSessionKey(role));
}

function protectCurrentPage() {
  const currentRole = document.body?.dataset?.page;
  if (!currentRole || !AUTH_CONFIG[currentRole]) {
    return true;
  }

  if (isAuthenticated(currentRole)) {
    injectLogoutButton(currentRole);
    return true;
  }

  const redirectUrl = `index.html?auth=${encodeURIComponent(currentRole)}`;
  window.location.replace(redirectUrl);
  return false;
}

function injectLogoutButton(role) {
  const panel = document.querySelector(".hero-panel");
  if (!panel || panel.querySelector("[data-auth-logout]")) {
    return;
  }

  const info = document.createElement("p");
  info.className = "hint auth-note";
  info.textContent = "Acces protege par mot de passe. Session active pour cet espace.";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "button ghost auth-logout-button";
  button.dataset.authLogout = "true";
  button.textContent = "Se deconnecter";
  button.addEventListener("click", () => {
    logout(role);
    window.location.replace("index.html");
  });

  panel.append(info, button);
}

function setupPortalLogin() {
  const cards = Array.from(document.querySelectorAll("[data-role-card]"));
  if (cards.length === 0) {
    return;
  }

  const modal = document.querySelector("#authModal");
  const form = document.querySelector("#authForm");
  const title = document.querySelector("#authTitle");
  const message = document.querySelector("#authMessage");
  const passwordInput = document.querySelector("#authPassword");
  const cancel = document.querySelector("#authCancel");
  const roleInput = document.querySelector("#authRole");
  const openRole = new URLSearchParams(window.location.search).get("auth");

  function showModal(role) {
    const config = AUTH_CONFIG[role];
    if (!config) {
      return;
    }

    roleInput.value = role;
    title.textContent = config.label;
    message.textContent = `Entrez le mot de passe pour acceder a ${config.label.toLowerCase()}.`;
    passwordInput.value = "";
    passwordInput.setCustomValidity("");
    modal.hidden = false;
    document.body.classList.add("auth-modal-open");
    passwordInput.focus();
  }

  function hideModal() {
    modal.hidden = true;
    document.body.classList.remove("auth-modal-open");
  }

  cards.forEach((card) => {
    card.addEventListener("click", (event) => {
      const role = card.dataset.roleCard;
      if (!AUTH_CONFIG[role]) {
        return;
      }

      event.preventDefault();
      if (isAuthenticated(role)) {
        window.location.href = AUTH_CONFIG[role].path;
        return;
      }

      showModal(role);
    });
  });

  cancel?.addEventListener("click", hideModal);
  modal?.addEventListener("click", (event) => {
    if (event.target === modal) {
      hideModal();
    }
  });

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const role = roleInput.value;
    const password = passwordInput.value;
    if (!login(role, password)) {
      passwordInput.setCustomValidity("Mot de passe incorrect.");
      passwordInput.reportValidity();
      return;
    }

    passwordInput.setCustomValidity("");
    window.location.href = AUTH_CONFIG[role].path;
  });

  if (openRole && AUTH_CONFIG[openRole] && !isAuthenticated(openRole)) {
    showModal(openRole);
  }
}

window.FlowDeskAuth = {
  protectCurrentPage,
  isAuthenticated,
  login,
  logout,
  setupPortalLogin,
};

if (document.body?.dataset?.page) {
  protectCurrentPage();
} else {
  setupPortalLogin();
}
