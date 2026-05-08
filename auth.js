const AUTH_CONFIG = {
  employee:     { label: "Espace employe",     path: "employee.html" },
  manager:      { label: "Espace manager",      path: "manager.html" },
  collaborator: { label: "Espace collaborateur", path: "collaborator.html" },
};

const AUTH_SESSION_PREFIX = "flowdesk-auth-session:";
const AUTH_STORAGE_KEY    = "famiflora-flow-desk-v4";

function authSessionKey(role) {
  return `${AUTH_SESSION_PREFIX}${role}`;
}

function _authLoadUsers() {
  try {
    const raw = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || "{}");
    return Array.isArray(raw.users) ? raw.users : [];
  } catch { return []; }
}

function _roleHasPasswords(role) {
  return _authLoadUsers().some((u) => u.role === role && typeof u.password === "string" && u.password.length > 0);
}

function isAuthenticated(role) {
  // Mode migration : si aucun utilisateur du rôle n'a de mot de passe, l'accès est libre
  if (!_roleHasPasswords(role)) return true;
  const val = sessionStorage.getItem(authSessionKey(role));
  return !!val && val !== "" && val !== "1";
}

function getAuthenticatedUserId(role) {
  const val = sessionStorage.getItem(authSessionKey(role));
  return (!val || val === "1") ? "" : val;
}

function login(role, loginInput, passwordInput) {
  if (!AUTH_CONFIG[role]) return false;
  const users = _authLoadUsers().filter((u) => u.role === role);
  const needle = String(loginInput || "").trim().toLowerCase();
  const user = users.find((u) => {
    const identifier = String(u.login || u.name || "").trim().toLowerCase();
    return identifier === needle;
  });
  // N'accepter que les utilisateurs qui ont un mot de passe défini
  if (!user || !user.password || user.password !== String(passwordInput)) return false;
  sessionStorage.setItem(authSessionKey(role), user.id);
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
  const heroCopy = document.querySelector(".hero-copy");
  if (!heroCopy || heroCopy.querySelector("[data-auth-logout]")) {
    return;
  }

  const userId = getAuthenticatedUserId(role);
  const users = _authLoadUsers().filter((u) => u.role === role);
  const user = users.find((u) => u.id === userId);
  const userName = user ? (user.name || "") : "";

  const wrap = document.createElement("div");
  wrap.className = "auth-bar";

  if (userName) {
    const info = document.createElement("span");
    info.className = "auth-bar__name";
    info.textContent = userName;
    wrap.append(info);
  }

  const button = document.createElement("button");
  button.type = "button";
  button.className = "button ghost auth-logout-button";
  button.dataset.authLogout = "true";
  button.textContent = typeof t === "function" ? t("misc.logout") : "Se déconnecter";
  button.addEventListener("click", () => {
    logout(role);
    window.location.replace("index.html");
  });

  wrap.append(button);
  heroCopy.append(wrap);
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
  const loginInput = document.querySelector("#authLogin");
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
    title.textContent = typeof t === "function" ? t("auth.protected") : config.label;
    message.textContent = config.label;
    if (loginInput) { loginInput.value = ""; loginInput.setCustomValidity(""); }
    passwordInput.value = "";
    passwordInput.setCustomValidity("");
    modal.hidden = false;
    document.body.classList.add("auth-modal-open");
    (loginInput || passwordInput).focus();
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

      // Mode migration : accès direct si aucun mot de passe configuré pour ce rôle
      if (!_roleHasPasswords(role)) {
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
    const nameVal = loginInput ? loginInput.value : "";
    const passVal = passwordInput.value;
    if (!login(role, nameVal, passVal)) {
      const errMsg = typeof t === "function" ? t("auth.no.account") : "Identifiant ou mot de passe incorrect.";
      passwordInput.setCustomValidity(errMsg);
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
  getAuthenticatedUserId,
  login,
  logout,
  setupPortalLogin,
};

if (document.body?.dataset?.page) {
  protectCurrentPage();
} else {
  setupPortalLogin();
}
