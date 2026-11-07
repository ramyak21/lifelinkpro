# LifeLink Pro — Test Report

Date: 2026-10-27 · Environment: Windows 11, Node 22.19.0, npm 10.9.3, MySQL 8.0.43
(local development database `lifepro` with migrations 001–002 and the demo seeds).
Every result below comes from a run on this date; nothing is estimated.

Status values: **PASS**, **FAIL**, **PARTIALLY VERIFIED**, **NOT IMPLEMENTED**, **NOT TESTED**.

## 1. Summary

| Area | How | Result |
|---|---|---|
| Build — user portal | `npm run build:user` | PASS |
| Build — admin portal | `npm run build:admin` | PASS |
| Lint — shared, user, admin | `npm run lint` (oxlint 1.89) | PASS (0 warnings, 0 errors) |
| Dependencies | `npm audit` | PASS (0 vulnerabilities) |
| API end-to-end suite | `npm run test:api` | PASS — 91 / 91 |
| Security suite | `npm run test:security` | PASS — 73 / 73 |
| Workflow suite (new) | `npm run test:workflow` | PASS — 82 / 82 |
| Browser verification — user portal | Manual, real API + MySQL | PASS (every page and form; section 4) |
| Browser verification — admin portal | Manual, real API + MySQL | PASS (every screen and action; section 4) |
| Responsive (375 px) | Every route of both portals | PASS (no horizontal overflow) |
| Automated UI tests (Playwright etc.) | — | NOT IMPLEMENTED |

**One unexplained failure.** The very first run of `test:api` and `test:security` in this
session, started seconds after the API was launched, exited with an error. Its output was
not captured. Every later run passed: three full sequential runs, plus a run started
immediately after restarting the API to try to reproduce it. The server log showed no
errors. The cause is unknown; if it happens again, keep the full output.

## 2. Automated suites

All three suites run against a running API and a development database. They create their
own rows, delete them at the end, and refuse to run with `NODE_ENV=production`. The
registration rate limit is raised for development in `server/.env`
(`RATE_LIMIT_REGISTER_PER_HOUR`) because the suites create many accounts; the workflow
suite tests the default limit on its own server instance (port 5099).

### `server/tests/api.test.mjs` — 91 checks, PASS

Every endpoint the portals use, called with the portals' own payloads.

| Section | Checks | Section | Checks |
|---|---|---|---|
| Server | 2 | Event creation | 6 |
| Register | 5 | Event join | 8 |
| Login | 5 | Hospital | 5 |
| Blood donor | 9 | Ambulance | 5 |
| Food donation | 5 | Admin login | 2 |
| Volunteer | 7 | Admin auth | 3 |
| Emergency | 5 | Admin dashboard | 3 |
| Admin management | 7 | Delete | 13 |
| Cleanup | 1 | | |

### `server/tests/security.test.mjs` — 73 checks, PASS

| Section | Checks | What it proves |
|---|---|---|
| Setup | 1 | Test accounts created |
| Password exposure | 23 | No endpoint returns `users.password` (every list and record of every resource) |
| Authorization | 11 | Admin routes reject no token, bad tokens, member tokens; legacy lists are admin-only |
| Validation | 20 | Bad ids, nested bodies, lengths, enums, phone format, password policy |
| SQL injection | 3 | Injection strings are stored/handled as data |
| Error responses | 3 | JSON errors, no stack traces or SQL text |
| CORS | 3 | Only `CLIENT_URL` origins are allowed |
| Headers | 1 | `X-Powered-By` absent (the security headers themselves are checked in `test:workflow` → Security) |
| Startup config | 7 | Missing/weak production settings stop the server |
| Cleanup | 1 | Test rows removed |

### `server/tests/workflow.test.mjs` — 82 checks, PASS (new)

| Section | Checks | What it proves |
|---|---|---|
| Setup | 2 | Accounts and a volunteer profile linked to a member |
| Me | 9 | Own profile (no password), name change, password change rules, old password stops working |
| Ownership | 12 | Submissions while signed in are linked; members see only their own records; history hides staff identities; cancel only own *Pending* request |
| Workflow | 20 | Every allowed and forbidden transition for admin, volunteer and owner; In Progress needs a volunteer; assignment rules (Pending → Accepted, no removal while In Progress, same volunteer twice → 409); volunteer delete blocked while assigned |
| Integration | 7 | An admin change is visible to the requester and the volunteer |
| Admin lists | 8 | Paging, search (with `%`/`_` literal), filters, facets, sort whitelist, page-size limit |
| Admin CRUD | 11 | Create/update/delete for the resources; users cannot be created (405) |
| Accounts | 6 | No self-delete/self-demotion; last admin protected; promotion needs a new sign-in; demotion is immediate; deleting a user unlinks records and fixes event counts |
| Dashboard | 2 | `/admin/summary` counts match the database |
| Security | 4 | Security headers; login rate limit (429); registration rate limit (429, separate server) |
| Cleanup | 1 | Test rows removed |

## 3. Database migration verification

| Check | Result |
|---|---|
| 001 + 002 on a fresh throwaway database | PASS |
| 001, data, then 002 on a throwaway database: rows preserved, history back-filled | PASS |
| Foreign keys: SET NULL on user/volunteer delete, CASCADE for participants and history | PASS |
| Invalid status value rejected by the ENUM | PASS |
| Development database backed up (`mysqldump`) before applying 002 | PASS |
| `npm run sql:migrate` re-run → "up to date" | PASS |
| Seeds re-run → no duplicates | PASS |

## 4. Browser verification (manual, real data)

Both portals ran with `npm run dev:*` against the API and the development database.
Screenshots: [../screenshots](../screenshots).

### Cross-portal emergency workflow — PASS

| Step | Portal | Result |
|---|---|---|
| Signed-in member submits SOS (name, phone, location, Medical) | User | PASS — confirmation, reference #46 |
| Request appears with linked account, status Pending, actions Accept/Cancel only | Admin | PASS |
| Volunteer picker: search box, availability, "Free"/active count | Admin | PASS |
| Assign volunteer → Accepted, two history entries | Admin | PASS |
| My requests shows Accepted + volunteer name, no volunteer contact details | User | PASS |
| My assignments shows the request; "Start helping" with a note → In Progress | User | PASS |
| Admin view shows In Progress, the note, no "Remove" button, "Mark resolved" | Admin | PASS |
| Mark resolved → actions disappear, resolved time shown, toast | Admin | PASS |
| My requests shows Resolved and 5 history entries attributed to roles only | User | PASS |

### Admin portal

| Feature | Result |
|---|---|
| Sign-in; deep link kept (`/manage/users` → login → back to `/manage/users`) | PASS |
| Member account refused at admin sign-in; no session stored | PASS |
| Signed-out access to a protected route redirects to `/login` | PASS |
| Sign-out clears only the admin session keys | PASS |
| Dashboard figures from `/admin/summary`; status rows link to filtered lists | PASS |
| Server search (`?q=`), empty state with "Clear search and filters" | PASS |
| Facet counts follow the search | PASS |
| Sort from the URL (`?sort=name&order=asc`) with `aria-sort` | PASS |
| Server paging across 28 rows (page 2 = rows 26–28) | PASS |
| Stale page in the URL (`?page=2` after rows were deleted) jumps to the last page | PASS (bug found and fixed during testing) |
| Hospital: add (inline phone validation), edit (pre-filled), delete (confirm dialog) | PASS |
| New hospital visible in the public directory API | PASS |
| Users: "You" on own row; Make admin → Make member → Delete a test account, with dialogs | PASS |
| Account page: change name (header updates) and revert | PASS |
| Add an emergency request through the admin form (#53, "Logged by Demo Admin") | PASS |
| Assign a volunteer found with the picker's search; the volunteer sees it in My assignments | PASS |
| Remove the volunteer with a note → stays Accepted, "Mark in progress" disabled until a volunteer is assigned | PASS |
| Edit request details (form pre-filled) | PASS |
| Cancel the request → all actions removed, full history with names | PASS |
| Delete a volunteer with an active assignment → refused with the API's message, row kept | PASS |
| Admin not-found page | PASS |
| Add → edit (pre-filled) → delete on blood donors, food donations, volunteers, events and ambulances | PASS (ambulance vehicle number typed in lowercase was saved in uppercase) |

### User portal

| Feature | Result |
|---|---|
| Home, dashboard, events, profile, my requests, my assignments | PASS |
| Contact, blood, food, volunteer, create event, hospitals, register hospital, ambulances, register ambulance, not found | PASS (each loaded with no script errors and no failed data loads) |
| Registration through the form, then redirect to sign-in | PASS |
| Sign out (Profile) clears `token`/`user`; a protected route then redirects to `/login` | PASS |
| Blood donor form while signed in → listed under My requests → contributions | PASS |
| Event join → "You're going", count 1 → leave → count 0 | PASS |
| Cancel a Pending request from My requests (confirmation dialog, then Cancelled, Cancel button gone) | PASS |
| Password change form: wrong current password and mismatched confirmation show errors; success clears the form; after sign-out the old password is refused and the new one works | PASS |
| Volunteer registration while signed in → My assignments enabled; second registration refused with the API's message | PASS |
| Food donation, create event, register hospital, register ambulance (signed out) → confirmations; records listed by the public API | PASS |
| Create event with a past date → blocked in the browser | PASS |
| Account deleted by an administrator while signed in → next refresh ends the session ("Your session has expired") | PASS |

### Responsive and accessibility checks

| Check | Result |
|---|---|
| 375 px: every user portal route checked (home, dashboard, requests, assignments, profile, events, emergency) | PASS — page width = viewport, no element past the edge |
| 375 px: every admin route (dashboard, 8 resource screens, emergency detail, account) | PASS |
| Admin tables become cards below 768 px | PASS |
| Wide dashboard (1280 px) panel layout | PASS |
| Dialogs and drawers have labelled close buttons and focus handling | PASS (checked by DOM inspection) |
| Screen-reader testing | NOT TESTED |

### Issues found during browser testing (all fixed and re-verified)

| Issue | Fix |
|---|---|
| Search box squeezed to ~60 px when a long filter sat next to it | Toolbar gives the search a minimum width and lets the filter wrap |
| Sort icon and button icons shrank to 0 px in narrow table columns | Icons no longer shrink (`flex: none`) |
| Non-destructive confirmations (Start helping, Make admin) showed a red warning icon | Neutral icon for `tone="primary"` dialogs |
| `?page=` beyond the last page showed "Showing 26–25 of 1 record" and an empty table | Redirect to the last existing page |
| Cross-portal links were hidden in development unless `.env` files existed | `npm run dev` defaults them to the local portal URLs |
| Dashboard panels left a gap on wide screens after adding the status card | Latest requests panel spans two rows |
| A cancelled request in My requests said it was cancelled twice | The status line is skipped when the step tracker already says it |
| A request logged by an administrator showed "Account: Sent without signing in" | Shows "Logged by <administrator>" (from the request's history) |
| "No volunteer was assigned." on a closed request whose volunteer had been removed | Changed to "No volunteer assigned." |

## 5. Test data

All rows created during browser testing were deleted afterwards: 3 emergency requests with
their history, 2 registered accounts and their volunteer profile, and every "E2E …" row
created in the donor, food, volunteer, event, hospital and ambulance tables (including the
27 rows used for the paging test). A final SQL check found no "E2E" rows, no orphaned
history and no event participations. The event participation and the
admin's name change were reverted. After the last round the three suites were re-run
(91/91, 73/73, 82/82). A final database check
found no remaining test rows.
