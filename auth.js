const AUTH_CONFIG = {
  employee:     { label: "Espace employé",      path: "employee.html" },
  manager:      { label: "Espace manager",       path: "manager.html" },
  collaborator: { label: "Espace collaborateur", path: "collaborator.html" },
};

const SESSION_KEY = "flowdesk-session";

function _loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function _saveSession(data) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(data)); } catch {}
}

function _authLoadUsers() {
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
  const session = _loadSession();
  return !!(session && session.role === role && session.userId);
}

function getAuthenticatedUserId(role) {
  const session = _loadSession();
  return (session && session.role === role) ? (session.userId || "") : "";
}

async function login(loginInput, passwordInput) {
  try {
    const BASE = (window.FLOW_DESK_API_BASE ?? "").replace(/\/$/, "");
    const res = await fetch(`${BASE}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login: loginInput, password: passwordInput }),
    });
    if (!res.ok) return null;
    const { userId, role, token } = await res.json();
    _saveSession({ userId, role, token });
    return role;
  } catch {
    return null;
  }
}

function logout() {
  localStorage.removeItem(SESSION_KEY);
}

function getToken() {
  return _loadSession()?.token || null;
}

function protectCurrentPage() {
  const currentRole = document.body?.dataset?.page;
  if (!currentRole || !AUTH_CONFIG[currentRole]) return true;

  if (isAuthenticated(currentRole)) {
    injectLogoutButton(currentRole);
    return true;
  }

  window.location.replace("index.html");
  return false;
}

function injectLogoutButton(role) {
  const heroCopy = document.querySelector(".hero-copy");
  if (!heroCopy || heroCopy.querySelector("[data-auth-logout]")) return;

  const userId = getAuthenticatedUserId(role);
  const user   = _authLoadUsers().find((u) => u.id === userId);
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
    logout();
    window.location.replace("index.html");
  });

  wrap.append(button);
  heroCopy.append(wrap);
}

window.FlowDeskAuth = {
  protectCurrentPage,
  isAuthenticated,
  getAuthenticatedUserId,
  getToken,
  login,
  logout,
};

if (document.body?.dataset?.page) {
  protectCurrentPage();
}
