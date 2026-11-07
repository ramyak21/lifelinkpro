// Address of the user portal, linked from the admin top bar ("View site").
// Optional and public (compiled into the browser bundle) — see apps/admin-portal/.env.example.
// `npm run dev` falls back to the local user portal; production builds show no link unless it is set.
export const USER_PORTAL_URL = import.meta.env.VITE_USER_PORTAL_URL || (import.meta.env.DEV ? "http://localhost:5173" : "");
