// Address of the separate admin portal, shown to administrators as an external link.
// Optional and public (it is compiled into the browser bundle) — see apps/user-portal/.env.example.
// `npm run dev` falls back to the local admin portal; production builds show no link unless it is set.
export const ADMIN_PORTAL_URL = import.meta.env.VITE_ADMIN_PORTAL_URL || (import.meta.env.DEV ? "http://localhost:5174" : "");
