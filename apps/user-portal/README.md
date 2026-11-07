# LifeLink Pro — User portal

The public website and the member area: emergency requests, blood and food donations,
volunteering, events, the hospital and ambulance directories, and for signed-in people
**Dashboard**, **My requests**, **My assignments** (volunteers) and **Profile**.
Administration is not part of this app; it lives in [`apps/admin-portal`](../admin-portal/README.md).

## Commands (from the repository root)

```bash
npm run dev:user
```

Dev server on <http://localhost:5173> (fixed port). The API must be running (`npm run dev:server`).

```bash
npm run build:user
```

Production build in `apps/user-portal/dist/`. Preview it with
`npm run preview -w @lifelink/user-portal` (port 4173).

```bash
npm run lint -w @lifelink/user-portal
```

## Configuration

Optional `apps/user-portal/.env` (copy `.env.example`). Values are **public** (compiled
into the bundle), so never put secrets here.

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_URL` | `http://localhost:5000/api` | API base URL |
| `VITE_ADMIN_PORTAL_URL` | `http://localhost:5174` in `npm run dev`; none in production builds | "Admin portal" link shown to administrators |

## Structure

```text
src/
├── main.jsx            configureSession({ tokenKey: "token", userKey: "user" }), providers
├── App.jsx             routes: public pages + RequireAuth group (dashboard, profile, requests, assignments)
├── config/             portals.js (admin portal URL), services.js (navigation, emergency numbers)
├── components/
│   ├── layout/         PublicLayout, Navbar, Footer, RequireAuth, MemberAuthLayout, SplitLayout
│   ├── events/         EventCard (join/leave), UpcomingEvents
│   └── requests/       RequestsSummary (dashboard card)
└── pages/              one folder per route
```

Shared components, hooks, the API client and styles come from
[`@lifelink/shared`](../../packages/shared/README.md).

## Routes

| Route | Access |
|---|---|
| `/`, `/contact`, `/emergency`, `/blood`, `/food`, `/volunteer`, `/events`, `/events/new`, `/hospitals`, `/hospitals/register`, `/ambulance`, `/ambulance/register` | Anyone (forms link the record to the account when signed in) |
| `/login`, `/register` | Anyone |
| `/dashboard`, `/profile`, `/requests`, `/assignments` | Signed-in members (redirect to `/login`, then back) |

Page-by-page details: [docs/use-cases.md](../../docs/use-cases.md).

## Sessions

The session is stored in `localStorage` under `token` and `user` (the same keys as the
original single app, so existing sessions keep working). A 401 from the API on a request
that carried a token signs the person out and shows a "session expired" message.

My requests and My assignments refresh every 30 seconds while the tab is visible
(polling; there are no push updates).
