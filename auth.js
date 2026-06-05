const AUTH_CONFIG = {
  employee:     { label: "Espace employe",     path: "employee.html" },
  manager:      { label: "Espace manager",      path: "manager.html" },
  collaborator: { label: "Espace collaborateur", path: "collaborator.html" },
};

const AUTH_SESSION_PREFIX = "flowdesk-auth-session:";

function authSessionKey(role) {
  return `${AUTH_SESSION_PREFIX}${role}`;
}

function _authLoadUsers() {
  // Priorité : cache FlowDeskApi (chargé depuis PostgreSQL)
  const apiState = window.FlowDeskApi?.getCachedState?.();
  if (apiState && Array.isArray(apiState.users)) return apiState.users;
  return [];
}

function _roleHasPasswords(role) {
  return _authLoadUsers().some((u) => u.role === role && (
    u.hasPassword === true ||
    (typeof u.password === "string" && u.password.length > 0)
  ));
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

async function login(role, loginInput, passwordInput) {
  if (!AUTH_CONFIG[role]) return false;
  try {
    const BASE = (window.FLOW_DESK_API_BASE ?? "").replace(/\/$/, "");
    const res = await fetch(`${BASE}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, login: loginInput, password: passwordInput }),
    });
    if (!res.ok) return false;
    const { userId, token } = await res.json();
    sessionStorage.setItem(authSessionKey(role), userId);
    sessionStorage.setItem(authSessionKey(role) + ":token", token);
    return true;
  } catch {
    return false;
  }
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

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    // Attendre que FlowDeskApi ait chargé les utilisateurs
    await window.FlowDeskApi?.ready?.();
    const role    = roleInput.value;
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

function getToken() {
  for (const role of Object.keys(AUTH_CONFIG)) {
    const token = sessionStorage.getItem(authSessionKey(role) + ":token");
    if (token) return token;
  }
  return null;
}

window.FlowDeskAuth = {
  protectCurrentPage,
  isAuthenticated,
  getAuthenticatedUserId,
  getToken,
  login,
  logout,
  setupPortalLogin,
};

if (document.body?.dataset?.page) {
  protectCurrentPage();
} else {
  setupPortalLogin();
}
