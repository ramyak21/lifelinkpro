# LifeLink Pro — Phase 1 audit and migration plan

Date: 26 October 2026. Source of truth: the repository as found on this date (backup:
`D:\Ramya\lifepro-backups\lifepro-before-portal-split-2026-10-26.tar.gz`, taken before any change).

## 1. Current architecture (before this work)

```text
client/   one React 19 + Vite 8 SPA: public site, member area AND admin area (/admin/*, lazy-loaded)
server/   Express 5 REST API (CommonJS), mysql2/promise pool, JWT + bcrypt, no ORM
database/ 001_initial_schema.sql (8 tables) + 001_initial_seed.sql (demo data)
```

* No Git repository, no CI/CD, no Docker, no hosting configuration.
* Two separate npm projects (`client/`, `server/`), no root `package.json`.
* MySQL is the only database. No MongoDB/Mongoose code or dependency remains (removed in the earlier migration).

### Frontend (client/)

| Area | Implementation |
|---|---|
| Stack | React 19.2, React Router 7.18, Axios 1.20, react-icons 5.7, Vite 8.1, CSS Modules + design tokens, oxlint |
| Public pages | Home, Help, Emergency, Blood, Food, Volunteer, Events, Create event, Hospitals (+register), Ambulances (+register), NotFound |
| Member pages | Login, Register, Dashboard, Profile (read-only) |
| Admin pages | AdminLogin, AdminLayout (sidebar), AdminDashboard (`GET /api/admin/all`), AdminManage (8 screens, client-side search/filter/paging, delete only) |
| Shared code | ~30 UI components, form components, hooks (useForm, useAsync…), AuthProvider (localStorage `token`/`user`), Axios client with 401 → session-expired |

### Backend (server/)

| Area | Implementation |
|---|---|
| Entry | `server.js`: env checks, CORS allowlist (`CLIENT_URL`), `express.json()`, flat-body check, routers, 404, error handler |
| Routers | auth, emergency, blood, food, volunteer, events, hospital, ambulance, admin, manage (35 endpoints) |
| Pattern | Some controllers (auth, blood, emergency, admin, manage); food/volunteer/events/hospital/ambulance have SQL inline in route files. No services/repositories layer. |
| Auth | JWT `{id, role}` 7 days; `protectAdmin` verifies token and re-checks role in MySQL. No middleware for normal signed-in users. |
| Validation | Required-field checks only; MySQL errors mapped to 400. No format/enum/length validation on most fields. |
| Tests | `tests/api.test.mjs` (78 checks), `tests/security.test.mjs` (71 checks) — run against a live API + MySQL |

### Database

8 tables (`users`, `emergencies`, `blood_donors`, `food_donations`, `volunteers`, `events`, `hospitals`,
`ambulances`) + `schema_migrations`. Only foreign key: `emergencies.user_id → users.id` (never set by the API).
`emergencies.status` ENUM(Pending, Accepted, Resolved) with no endpoint to change it.

## 2. Baseline results (26 October 2026, before changes)

| Check | Result |
|---|---|
| `server: npm run test:api` | 78/78 PASS |
| `server: npm run test:security` | 71/71 PASS |
| `client: npm run build` | PASS (225 modules, 403 kB JS) |
| `client: npm run lint` | PASS (0 warnings) |
| `npm run sql:migrate` / `sql:seed` | PASS (up to date / idempotent) |
| `npm audit` | server: 1 critical (proxy-addr), 1 high (body-parser); client: 3 high (vite, follow-redirects, source-map-js) |

## 3. Problems found in the source code

| # | Problem | Severity |
|---|---|---|
| 1 | Admin UI ships inside the public app bundle/route tree (lazy-loaded, but same app and origin) | Architecture |
| 2 | `GET /api/blood`, `/api/emergency`, `/api/volunteer`, `/api/food` are public and return names, phones and emergency details | High (privacy) |
| 3 | No rate limiting on login/registration | High |
| 4 | Dependency advisories (critical/high) | High |
| 5 | `PUT /api/events/join/:id` is anonymous and repeatable (count can be inflated; nobody knows who joined) | Medium |
| 6 | `DELETE /api/manage/users/:id` lets an admin delete their own account / the last admin (UI-only guard) | Medium |
| 7 | Emergency duplicate check blocks any future request with the same name+phone+location forever, even after it is resolved | Medium (bug) |
| 8 | Emergency status never changes; no assignment, no history, user cannot see their requests | Feature gap |
| 9 | Submissions are never linked to the signed-in user (`user_id` unused) | Feature gap |
| 10 | All list endpoints are unbounded; admin search/filter/paging runs in the browser over whole tables | Scalability |
| 11 | Admin can only delete; no create/edit/details; ambulances read-only (no endpoints) | Feature gap |
| 12 | Server validation is minimal (no phone/email/enum/length/whitespace checks) | Medium |
| 13 | No security headers besides `X-Powered-By` removal; no request logging | Low/Medium |
| 14 | No profile editing or password change | Feature gap |
| 15 | Inline SQL in route files; no service/repository separation | Maintainability |
| 16 | `server/.env` with real local credentials sits in the delivered folder | Operational |

## 4. Target structure

```text
lifepro/
  package.json            npm workspaces: apps/*, packages/*, server — one install, one lockfile
  apps/user-portal/       public site + member area (from client/, admin removed)
  apps/admin-portal/      new, separate Vite/React app for administrators
  packages/shared/        @lifelink/shared — UI kit, form kit, hooks, auth/session, API client factory, utils, design tokens
  server/                 ONE Express API (routes / controllers / services / repositories / middleware)
  database/               ONE schema: migrations 001 + 002, seeds
  docs/                   architecture/, api.md, database.md, testing/, screenshots/
```

Both portals call the same API over HTTP (configurable `VITE_API_URL`). Neither touches MySQL.
The backend enforces every permission; the admin portal gets no privilege from being deployed separately.

## 5. File migration plan

| From | To | Notes |
|---|---|---|
| `client/` (public + member pages, layouts, feature components, config) | `apps/user-portal/` | admin routes/pages removed |
| `client/src/pages/{AdminLogin,AdminDashboard,AdminManage}`, `components/admin/*` | `apps/admin-portal/src/` | rebuilt around server-side paging + CRUD + emergency workflow |
| `client/src/components/{ui,form}`, hooks, context, services/api, utils, styles, Logo, UserMenu, PageLoader, RouteEffects | `packages/shared/src/` | parametrised (storage keys, API client factory) |
| `client/package-lock.json`, `server/package-lock.json` | root `package-lock.json` | workspaces |
| `client/` | removed after the move is verified | backup exists |

## 6. Database changes (migration 002, forward-only, non-destructive)

* `emergencies`: status ENUM extended to `Pending, Accepted, In Progress, Resolved, Cancelled` (superset — existing rows keep their value); add `assigned_volunteer_id` (FK → volunteers, SET NULL), `assigned_at`, `resolved_at`.
* `emergency_updates` (new): status/assignment history with actor and timestamps; backfilled with one `created` row per existing request.
* `blood_donors.user_id`, `food_donations.user_id`, `volunteers.user_id` (nullable FK → users, SET NULL; volunteers.user_id UNIQUE): links submissions to the signed-in account.
* `event_participants` (new): who joined which event (PK event_id+user_id).
* Indexes for new filters (role, availability, ambulance status, emergency type).

## 7. API changes

| Change | Compatibility |
|---|---|
| New `/api/me/*` (profile, password, my requests, cancel, joined events, volunteer assignments) | additive |
| `/api/manage/:resource` lists gain `page`, `pageSize`, `q`, filters, `sort`; response adds `pagination` and `facets` | additive; same array key |
| New `GET/POST/PUT /api/manage/:resource[/:id]`, ambulances management, emergency `status` and `assignment` endpoints | additive |
| New `GET /api/admin/summary` (bounded dashboard data) | additive; `/admin/all`, `/admin/stats`, `/manage/dashboard` kept |
| `GET /api/blood`, `/api/food`, `/api/volunteer`, `/api/emergency` require an admin token | **breaking** — no frontend uses them; tests updated |
| `PUT /api/events/join/:id` requires a signed-in user and is idempotent per user (409 if already joined); new `PUT /api/events/leave/:id` | **breaking** — the user portal is updated; tests updated |
| Public POSTs: stricter normalisation (trim, lengths, phone/email/enum/date checks); optional token links the record to the user | required-field rules unchanged |
| Login/registration rate limits (429) | additive |

## 8. Risks

* Hoisted workspace dependencies: verify both portals and the server resolve the same React and that `bcrypt` (native) still loads.
* Contract changes above: every dependant (portals, tests, docs) updated in the same change.
* MySQL `ALTER TABLE ... MODIFY ENUM` on large tables locks the table: fine at current size; documented.
* Migration 002 is tested on a disposable database first, then the development database.

## 9. Verification plan

1. After each phase: build both portals, lint, run the API and security suites.
2. New `tests/workflow.test.mjs`: ownership, emergency state machine, assignment, pagination, CRUD, join/leave, rate limits.
3. Migration 002 on a throwaway database (fresh + upgrade from 001 with data), then on the dev database.
4. Browser end-to-end on both portals against the real API and MySQL, with screenshots saved under `docs/screenshots/`.
