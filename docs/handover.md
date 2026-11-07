# LifeLink Pro — Handover (portal split)

Date: 2026-10-27. This document closes the "separate user and admin portals" work.
Earlier work (MongoDB → MySQL migration, audit, UI redesign) is summarised in
[database.md](database.md#history-mongodb--mysql) and
[architecture/01-audit-and-migration-plan.md](architecture/01-audit-and-migration-plan.md).

## 1. Summary

**Before:** one React app (`client/`) served both the public site and the admin pages
(`/admin/*`), sharing one session. The Express + MySQL API had public lists that exposed
personal data, no rate limits, no pagination, an emergency status that nothing could change,
anonymous repeatable event joins, and no link between submissions and accounts.

**Now:**

- Two independent frontends, built and hosted separately: the **user portal**
  (`apps/user-portal`) and the **admin portal** (`apps/admin-portal`), with shared UI and
  the single API client in `packages/shared`, in one npm workspace.
- **One** Express backend and **one** MySQL database for both. The admin portal has no
  backend of its own.
- A real emergency workflow: volunteer assignment, *Pending → Accepted → In Progress →
  Resolved* (or *Cancelled*), enforced on the server, with a full history; requesters
  follow their requests, volunteers work their assignments, administrators run it all.
- Submissions made while signed in are linked to the account (**My requests**); event
  participation is recorded per member.
- Admin lists are paginated, searched, filtered and sorted by the server, with full
  create/edit/delete for every record type (users: role changes and delete).
- Security fixes: personal-data lists made admin-only, rate limits, password policy,
  role checks against the database, security headers, request logging without secrets.

**How the parts talk to each other:** each portal is a static single-page app that calls
the API over HTTP(S) with JSON and an `Authorization: Bearer <JWT>` header, using
`packages/shared/src/services/lifelink.js`. CORS (`CLIENT_URL`) allows exactly the two
portal origins. The API talks to MySQL through a mysql2 connection pool with
parameterised queries; multi-step changes run in transactions. Diagram:
[architecture/02-architecture.md](architecture/02-architecture.md).

## 2. Implemented features

| Feature | Portal | Status |
|---|---|---|
| Public site, service forms (emergency, blood, food, volunteer, event, hospital, ambulance), directories | User | Implemented |
| Registration, sign-in, sign-out, protected member pages | User | Implemented |
| My requests (status, progress, volunteer name, history, cancel while Pending, contributions, joined events) | User | Implemented |
| My assignments for volunteers (Start helping, Mark resolved, notes) | User | Implemented |
| Profile: change name and password | User | Implemented |
| Event join/leave per member | User | Implemented |
| Administrator-only sign-in, separate session | Admin | Implemented |
| Dashboard from server-side counts, auto-refresh | Admin | Implemented |
| Management screens for 8 record types: server paging/search/filter/sort, create, edit, delete with confirmation | Admin | Implemented (users: no create — people register themselves) |
| Emergency detail: workflow actions with notes, assign/reassign/remove volunteer, edit, history with names | Admin | Implemented |
| User roles (promote/demote) with safety rules | Admin | Implemented |
| Own account page | Admin | Implemented |
| Live updates | Both | Polling every 30–60 s (no WebSocket/SSE) |
| Notifications (SMS/e-mail) to volunteers or requesters | — | Not implemented |
| Password reset ("forgot password") | — | Not implemented |

## 3. Files created, modified, moved and removed

Counted by comparing the pre-split backup (`lifepro-backups/lifepro-before-portal-split-2026-10-26.tar.gz`)
with the delivered tree, excluding `node_modules`, `dist`, the lockfile and `.env`.

### Moved (151 files)

| From | To | Files | Reason |
|---|---|---|---|
| `client/` (public pages, member pages, public layout) | `apps/user-portal/` | 62 | The user portal is the original app minus administration |
| `client/src/components/{ui,form,auth,…}`, `hooks`, `context`, `services`, `utils`, `styles`, shared layout pieces | `packages/shared/src/` | 76 | Used by both portals; one copy |
| `client/src/pages/Admin*`, `client/src/components/admin` | `apps/admin-portal/src/` | 13 | Administration becomes its own app |

88 moved files are unchanged; 63 were also edited, mostly import paths
(`@lifelink/shared/...`), plus the functional changes listed below.

### Removed (4 files)

| File | Reason |
|---|---|
| `client/src/pages/AdminLogin/AdminLogin.jsx` | Replaced by `apps/admin-portal/src/pages/Login/Login.jsx` |
| `client/src/hooks/useJoinedEvents.js` | Joined events were remembered per browser; the API now records participation (`event_participants`) |
| `server/controllers/bloodController.js` | Merged into `publicController.js` (one validation path for all public forms) |
| `server/controllers/emergencyController.js` | Merged into `publicController.js` / `emergencyService.js` |

The `client/` folder no longer exists.

### Created (main files; 68 in total, including documentation)

| Area | Files | Purpose |
|---|---|---|
| Workspace | `package.json` (root), `packages/shared/package.json`, `apps/admin-portal/package.json`, `.oxlintrc.json` files | npm workspaces, scripts, lint config |
| Admin portal | `index.html`, `vite.config.js`, `.env.example`, `main.jsx`, `App.jsx`, `config/portals.js`, `components/layout/RequireAdmin.jsx`, `components/admin/RecordForm.jsx`, `pages/Login`, `pages/EmergencyDetail` (+ `VolunteerPicker.jsx`), `pages/Account`, `pages/NotFound` | The new app |
| User portal | `pages/MyRequests`, `pages/MyAssignments`, `components/requests/RequestsSummary.jsx`, `components/layout/MemberAuthLayout.jsx`, `config/portals.js` | Member area |
| Shared | `services/session.js`, `hooks/usePolling.js`, `components/emergency/EmergencyProgress.jsx`, `EmergencyTimeline.jsx`, `components/account/AccountForms.jsx` | Per-portal sessions, polling, workflow UI, account forms |
| API | `middleware/auth.js`, `middleware/security.js`, `controllers/publicController.js`, `controllers/meController.js`, `routes/meRoutes.js`, `services/{emergencyService,userService,eventService,fields,resources}.js`, `repositories/{resourceRepository,emergencyRepository,transaction}.js`, `utils/{httpError,validate,listQuery}.js`, `tests/workflow.test.mjs` | Layered backend, workflow, security, tests |
| Database | `migrations/002_user_links_and_emergency_workflow.sql`, `seeds/002_workflow_demo.sql` | Schema changes (non-destructive) and demo link |
| Docs | `docs/**`, `apps/admin-portal/README.md`, `packages/shared/README.md`, `server/README.md`, `docs/screenshots/**` | Handover documentation and real screenshots |

### Modified in place (same path)

| File(s) | Change |
|---|---|
| `server/server.js` | Security headers, request log, `TRUST_PROXY`, `/api/me`, CORS for both portals |
| `server/routes/*.js` (10; `meRoutes.js` is new) | New middleware chains (auth levels, rate limits, id validation); legacy lists admin-only |
| `server/controllers/{auth,admin,manage}Controller.js` | Password policy and rate-limit hooks; `/admin/summary`; paginated generic CRUD, user rules, emergency workflow endpoints |
| `server/middleware/{authMiddleware,errorHandler}.js` | Re-export of the new `requireAdmin`; `HttpError` handling |
| `server/package.json`, `server/.env.example` | `test:workflow`; both portal origins and optional hardening settings |
| `server/tests/api.test.mjs`, `security.test.mjs` | Updated to the new contracts (admin-only lists, member-only join, valid phone numbers); **no test was removed** |
| `README.md`, `database/README.md`, `POST_MIGRATION_TODO.md` | Rewritten for the new structure; demo passwords no longer printed |
| `.claude/launch.json` | Dev server definitions for `server`, `user-portal`, `admin-portal` |
| `server/.env` (not delivered, git-ignored) | `CLIENT_URL` lists both portals; development registration limit raised for the test suites. No credential was changed |

## 4. Deployment and environment changes

| Change | Action needed |
|---|---|
| Two frontends instead of one | Host `apps/user-portal/dist` and `apps/admin-portal/dist` separately, both with SPA fallback |
| `CLIENT_URL` | Must list **both** portal origins |
| Portal build variables | `VITE_API_URL` for each portal; optional `VITE_ADMIN_PORTAL_URL` / `VITE_USER_PORTAL_URL` |
| Migration 002 | Back up, then `npm run sql:migrate` |
| New optional server settings | `TRUST_PROXY`, `LOG_REQUESTS`, `RATE_LIMIT_*` |
| Installation | One `npm ci` at the repository root |
| Credentials | Rotate the database password and `JWT_SECRET` ([security.md](security.md#1-credentials-that-need-rotation)) |

Full guide: [deployment.md](deployment.md).

## 5. Commands

Development:

| Step | Command |
|---|---|
| Install | `npm install` |
| Configure | `cp server/.env.example server/.env`, then set `DB_PASSWORD` and `JWT_SECRET` |
| Migrate | `npm run sql:migrate` |
| Seed (development only) | `npm run sql:seed` |
| API | `npm run dev:server` → http://localhost:5000 |
| User portal | `npm run dev:user` → http://localhost:5173 |
| Admin portal | `npm run dev:admin` → http://localhost:5174 |
| Lint | `npm run lint` |
| Tests (API running) | `npm test` (or `test:api`, `test:security`, `test:workflow`) |

Production:

| Step | Command |
|---|---|
| Install | `npm ci` |
| Build both portals | `npm run build` (or `build:user`, `build:admin`) with the `VITE_*` variables set |
| Migrate (after a backup) | `npm run sql:migrate` |
| API | `npm run start:server` with `NODE_ENV=production` |

## 6. Acceptance criteria

From section 13 of the request. Evidence: [testing/test-report.md](testing/test-report.md).

| Criterion | Result | Evidence |
|---|---|---|
| Install dependencies with the documented package manager | PASS | npm workspaces, one lockfile, `npm audit` 0 vulnerabilities |
| Build the user portal independently | PASS | `npm run build:user` |
| Build the admin portal independently | PASS | `npm run build:admin` |
| Start the backend; MySQL connectivity | PASS | API started and served all browser and automated tests |
| Migrations on a disposable database | PASS | 001+002 fresh and upgrade-with-data on throwaway databases |
| Run the test suite | PASS | 91 + 73 + 82 checks (one unexplained first-run failure, not reproducible; see report) |
| User registration | PASS | Browser + `test:api` |
| User login and logout | PASS | Browser (both portals) |
| Protected route access | PASS | Browser redirects; API 401/403 suites |
| Service form submission | PASS | Every public form submitted in the browser (emergency, blood, food, volunteer, event, hospital, ambulance) |
| Volunteer registration | PASS | Browser: submitted while signed in, My assignments enabled, duplicate refused |
| Emergency request submission | PASS | Browser |
| User request history and status visibility | PASS | Browser (Accepted → Resolved with history) |
| Event participation | PASS | Browser join/leave + `test:api` |
| Admin login | PASS | Browser |
| Rejection of non-admin access | PASS | Browser (member refused) + security suite |
| Admin dashboard data | PASS | Browser + `test:workflow` (counts match the database) |
| Listing and filtering records | PASS | Browser (search, facets, sort, paging) + `test:workflow` |
| Creating and editing records | PASS | Browser: add/edit on all 7 editable admin screens, including emergencies + `test:workflow` |
| Safe deletion | PASS | Browser confirm dialogs; guards (self, last admin, assigned volunteer) in `test:workflow` |
| Emergency review, assignment, status changes | PASS | Browser + `test:workflow` |
| Admin changes persist in MySQL | PASS | Re-fetched through the public API and checked with SQL queries |
| Unauthenticated requests to protected endpoints | PASS | `test:security` |
| Normal-user requests to admin endpoints | PASS | `test:security` |
| Access to another user's private record | PASS | `test:workflow` → Ownership |
| Invalid inputs and invalid status transitions | PASS | `test:security` → Validation, `test:workflow` → Workflow |
| Sensitive-field exposure | PASS | `test:security` → Password exposure (23 checks) |
| Changes in one portal visible in the other | PASS | Browser cross-portal scenario |
| Real screenshots grouped by portal | PASS | `docs/screenshots/` (22 images, index in its README) |
| Page-by-page use-case table | PASS | [use-cases.md](use-cases.md) |
| Responsive behaviour | PASS | All routes at 375 px; cards below 768 px |
| Automated browser (UI) tests | NOT IMPLEMENTED | Manual browser verification only |

## 7. Known limitations and unfinished work

| Item | Notes |
|---|---|
| Credentials must be rotated | Database password and `JWT_SECRET` exist in the delivered folder's `server/.env` and in the backup archive ([security.md](security.md)) |
| `GET /api/admin/all` is not paginated | Admin-only and unused by the portals; kept for compatibility. Remove it or page it |
| JWT in `localStorage` | Readable by any XSS; cookie sessions would need CSRF protection |
| Public creation of hospitals, ambulances and events | No sign-in required (unchanged behaviour); administrators clean up |
| Rate limits in memory | Per process; reset on restart |
| Updates are polled | 30–60 s delay; no push |
| No automated UI tests | Playwright (or similar) recommended for the cross-portal scenario |
| No delete for emergency requests in the admin portal | By design the screen offers Cancel; `DELETE /api/manage/emergencies/:id` exists in the API (history is deleted with it) |
| Old handover PDF is out of date | `LifeLink-Pro-Complete-Project-Documentation.pdf` describes the single-app version |
| `TIMESTAMP` columns end in 2038 | Future migration to `DATETIME` |
| Emergency numbers are for India (112/108) | `apps/user-portal/src/config/services.js` |
| `events.participants` includes anonymous joins from before migration 002 | Can exceed the number of `event_participants` rows |

## 8. Future improvements

1. Playwright tests for sign-in, the emergency workflow across both portals and admin CRUD.
2. Notifications to volunteers and requesters (e-mail/SMS) when a request changes.
3. Password reset by e-mail.
4. Push updates (Server-Sent Events) instead of polling for the emergency screens.
5. History/audit log for administrator changes to other record types (emergencies already have one).
6. Remove or paginate the legacy `/api/admin/all`, `/api/admin/stats` and `/api/manage/dashboard`.
7. Require sign-in (or admin approval) for new hospitals, ambulances and events.
8. Regenerate the PDF handover from these Markdown documents if a PDF is still needed.

## 9. Run and verify locally

1. MySQL 8 running; `npm install`; create `server/.env` from the example.
2. `npm run sql:migrate`, then `npm run sql:seed`.
3. Start `npm run dev:server`, `npm run dev:user`, `npm run dev:admin` in three terminals.
4. `npm test` (91 + 73 + 82 checks should pass), `npm run lint`, `npm run build`.
5. In the browser, repeat the cross-portal scenario in [use-cases.md](use-cases.md#cross-portal-scenario-pass)
   with the demo accounts (sign-in details in the header of
   `database/seeds/001_initial_seed.sql`). The admin portal has no delete button for
   emergency requests (administrators cancel them); remove a test request with
   `DELETE /api/manage/emergencies/:id` using an administrator token.
