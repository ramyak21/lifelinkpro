import axios from "axios";
import { getStoredToken } from "./session";

// Fired when an authenticated request comes back 401 (token expired, account deleted)
export const SESSION_EXPIRED_EVENT = "lifelink:session-expired";

// Each portal sets VITE_API_URL at build time (apps/<portal>/.env); local default below.
// Never put secrets in VITE_* variables: they are compiled into public JavaScript.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api"
});

// Attach this portal's JWT (see session.js)
api.interceptors.request.use((config) => {
  const token = getStoredToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && error.config?.headers?.Authorization) {
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    return Promise.reject(error);
  }
);

export default api;
