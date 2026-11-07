// Where a portal keeps its signed-in session in localStorage.
// Each portal calls configureSession() once in main.jsx, before rendering, so the
// user portal and the admin portal never share (or overwrite) each other's session
// even when they are served from the same origin.
const keys = { token: "token", user: "user" };

export function configureSession({ tokenKey, userKey }) {
  keys.token = tokenKey;
  keys.user = userKey;
}

export const sessionKeys = () => ({ ...keys });

export function getStoredToken() {
  try {
    return localStorage.getItem(keys.token);
  } catch {
    return null;
  }
}

export function readStoredSession() {
  try {
    const user = JSON.parse(localStorage.getItem(keys.user));
    return user && localStorage.getItem(keys.token) ? user : null;
  } catch {
    return null;
  }
}

export function storeSession(token, user) {
  localStorage.setItem(keys.token, token);
  localStorage.setItem(keys.user, JSON.stringify(user));
}

export function updateStoredUser(user) {
  localStorage.setItem(keys.user, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(keys.token);
  localStorage.removeItem(keys.user);
}
