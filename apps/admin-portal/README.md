# LifeLink Pro — Admin portal

A separate app for administrators: dashboard, management screens for every record type,
the emergency workflow (status changes and volunteer assignment), user roles and the
administrator's own account. It uses the **same API and database** as the user portal;
there is no admin backend of its own.

Only accounts with the `admin` role can sign in. The API checks the role again on every
request, so hiding or showing screens here is a convenience, not the protection.

## Commands (from the repository root)

```bash
npm run dev:admin
```

Dev server on <http://localhost:5174> (fixed port). The API must be running and
`CLIENT_URL` in `server/.env` must include this origin (it does by default).

```bash
npm run build:admin
```

Production build in `apps/admin-portal/dist/`. Preview with
`npm run preview -w @lifelink/admin-portal` (port 4174).

```bash
npm run lint -w @lifelink/admin-portal
```

## Configuration

Optional `apps/admin-portal/.env` (copy `.env.example`). Values are **public**.

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_URL` | `http://localhost:5000/api` | API base URL |
| `VITE_USER_PORTAL_URL` | `http://localhost:5173` in `npm run dev`; none in production builds | "View site" link |

## Structure

```text
src/
├── main.jsx                      configureSession({ tokenKey: "lifelink.admin.token", userKey: "lifelink.admin.user" })
├── App.jsx                       /login; everything else inside RequireAdmin + AdminLayout
├── config/portals.js             user portal URL
├── components/
│   ├── layout/RequireAdmin.jsx   redirects to /login unless signed in as an administrator
│   └── admin/
│       ├── AdminLayout, AdminNav sidebar (drawer below 1024 px), top bar, account menu
│       ├── adminResources.jsx    one description per record type: columns, filter, sort keys, form fields
│       ├── RecordForm.jsx        create/edit form generated from those field descriptions
│       ├── Cells.jsx, StatCard   table cells and dashboard cards
└── pages/
    ├── Login/                    refuses non-admin accounts
    ├── AdminDashboard/           GET /api/admin/summary, refreshes every minute
    ├── AdminManage/              /manage/:resource — server-side paging, search, filter, sort, CRUD
    ├── EmergencyDetail/          /emergencies/:id — workflow, volunteer picker, history
    ├── Account/                  own name and password
    └── NotFound/
```

## Adding a field or a record type

1. Make sure the API accepts it: `server/services/fields.js` (validation) and
   `server/services/resources.js` (list columns, search, filters, sort whitelist).
2. Describe it in `src/components/admin/adminResources.jsx`: a column (with `sortKey` if the
   API can sort by it), a `fields` entry for the form, and `toForm(row)` for editing.

The list state lives in the URL (`?page=2&q=…&status=Pending&sort=name&order=asc`), so
any view can be reloaded or shared with another administrator.

Page-by-page details: [docs/use-cases.md](../../docs/use-cases.md).
