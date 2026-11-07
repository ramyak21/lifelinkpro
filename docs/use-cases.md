# LifeLink Pro — Page-by-page use cases

Status values: **PASS** (done in a real browser against the real API and MySQL on
2026-10-27, after the portal split; every page below has now been exercised this way), **PARTIALLY VERIFIED** (some actions done in the
browser, the rest covered only by the automated API suites), **NOT TESTED**,
**NOT IMPLEMENTED**. Details of every run: [testing/test-report.md](testing/test-report.md).
Screenshots are in [screenshots/](screenshots) (`user-portal/…`, `admin-portal/…`).

Validation is enforced twice: in the browser (`packages/shared/src/utils/validation.js`,
shown inline after leaving a field or on submit) and on the server
(`server/services/fields.js`, the authority). "Phone" means 7–15 digits.

## User portal (`apps/user-portal`, dev http://localhost:5173)

| Page | Route | User | Purpose | Main actions | API endpoints | Tables | Validation | Expected result | Screenshot | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| Home | `/` | Anyone | Introduce the services; emergency numbers | Go to services, SOS, dashboard | `GET /events` (upcoming events block) | events | — | Page loads; SOS always reachable | `user-portal/01-home.jpg` | PASS (desktop and 375 px) |
| Help & contact | `/contact` | Anyone | FAQ and how to get help | Read; follow links | — | — | — | Page loads | — | PASS (load check) |
| Emergency SOS | `/emergency` | Anyone; linked when signed in | Send an emergency request | Fill and submit; "Track this request" when signed in | `POST /emergency` | emergencies, emergency_updates | Name, phone, location required; type from 4 values; details ≤1000 | Confirmation with reference number; request appears for admins as *Pending* | `user-portal/11-emergency-sent.jpg` | PASS |
| Blood donation | `/blood` | Anyone; linked when signed in | Join the donor registry | Fill and submit | `POST /blood/register` | blood_donors | Name, phone, blood group, location required; age 18–65; phone unique | Confirmation; listed under My requests → contributions when signed in | `user-portal/05-blood-donation-form.jpg` | PASS |
| Food donation | `/food` | Anyone; linked when signed in | Offer food for pickup | Fill and submit | `POST /food/donate` | food_donations | All five fields required | Confirmation | — | PASS (submitted signed out; confirmation shown) |
| Volunteer | `/volunteer` | Anyone; linked when signed in | Register as a volunteer | Fill and submit | `POST /volunteer/register` | volunteers | Name required; email/phone format; availability from 3 values; one profile per account | Confirmation; signed-in account gets **My assignments** | `user-portal/06-volunteer-form.jpg` | PASS (submitted while signed in → My assignments enabled; second registration refused with the API's message, form values kept) |
| Events | `/events` | Anyone; join needs sign-in | Browse and join community events | Search, filter Upcoming/Past/All, Join, Leave | `GET /events`, `PUT /events/join/:id`, `PUT /events/leave/:id` | events, event_participants | Join: signed in, event not past, not already joined | Count updates; card shows "You're going" + Leave; signed-out users see "Sign in to join" | `user-portal/03-events.jpg` | PASS |
| Create event | `/events/new` | Anyone | Announce an event | Fill and submit | `POST /events/create` | events | Name required (≤200); date not in the past | Confirmation; event listed | — | PASS (submitted; listed by `GET /events`; past date blocked in the browser) |
| Hospitals | `/hospitals` | Anyone | Find hospitals | Search, filter emergency services, call | `GET /hospital` | hospitals | — | Directory from the database | `user-portal/07-hospitals-directory.jpg` | PASS (load + data; admin-created hospital appeared in this list's API) |
| Register hospital | `/hospitals/register` | Anyone | Add a hospital to the directory | Fill and submit | `POST /hospital/register` | hospitals | Name required; phone format | Confirmation | — | PASS (submitted; listed in the public directory) |
| Ambulances | `/ambulance` | Anyone | Find an available ambulance | Search, filter, call | `GET /ambulance` | ambulances | — | Directory from the database | — | PASS (load + data) |
| Register ambulance | `/ambulance/register` | Anyone | Add an ambulance | Fill and submit | `POST /ambulance/register` | ambulances | Driver, phone, location required | Confirmation | — | PASS (submitted; listed in the public directory) |
| Sign in | `/login` | Anyone | Sign in | Submit; link to admin portal | `POST /auth/login` | users | Email format, password required; rate limited | Goes to the page the user came from, or `/dashboard` | `user-portal/10-login.jpg` | PASS |
| Create account | `/register` | Anyone | Create a member account | Submit | `POST /auth/register` | users | Name, email, password 8–72 bytes, confirmation matches | Account created (role *user*); sign-in page | `user-portal/09-register.jpg` | PASS |
| Dashboard | `/dashboard` | Member | Starting point for a signed-in person | Quick actions; open requests summary; admin portal link for admins | `GET /me/requests`, `GET /events` | emergencies, events, … | — | Greeting; up to 3 open requests | `user-portal/02-dashboard.jpg` | PASS |
| My requests | `/requests` | Member | Follow own requests and contributions | Refresh (auto every 30 s), view history, **cancel a Pending request** | `GET /me/requests`, `PUT /me/emergencies/:id/cancel` | emergencies, emergency_updates, blood_donors, food_donations, volunteers, event_participants | Cancel only own + Pending | Status, progress, volunteer name, history with roles only | `user-portal/12-my-requests-accepted.jpg`, `user-portal/13-my-requests-resolved-history.jpg` | PASS (status, history, contributions; cancel a Pending request with confirmation) |
| My assignments | `/assignments` | Member with a volunteer profile | Work on requests assigned by coordinators | Call requester, **Start helping**, **Mark resolved** with optional note | `GET /me/assignments`, `PUT /me/assignments/:id/status` | emergencies, emergency_updates | Only the assigned volunteer; only the next step | Status advances; coordinators see it with the note | — | PASS |
| Profile | `/profile` | Member | Own account details | Change name, change password, sign out | `PATCH /me`, `PUT /me/password` | users | Name required; current password; new 8–72 bytes, confirmed, different | Saved; header name updates | `user-portal/04-profile.jpg` | PASS (password change: wrong current password and mismatch errors, success, old password then refused; sign out) |
| Not found | any other path | Anyone | Unknown address | Go home | — | — | — | "Page not found" | — | PASS |

## Admin portal (`apps/admin-portal`, dev http://localhost:5174)

Every route except `/login` requires an administrator session; the API re-checks the
role on every request.

| Page | Route | User | Purpose | Main actions | API endpoints | Tables | Validation | Expected result | Screenshot | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| Administrator sign in | `/login` | Administrators | Sign in to the admin portal | Submit; link back to the site | `POST /auth/login` | users | Member accounts are refused | Goes to the requested page (deep links kept); members see "This account doesn't have administrator access." and no session is stored | `admin-portal/01-login.jpg` | PASS |
| Dashboard | `/` | Admin | Overview of activity | Stat cards → screens; status rows → filtered list; latest requests → detail; refresh (auto every 60 s) | `GET /admin/summary` | all | — | Real counts from MySQL | `admin-portal/02-dashboard.jpg` | PASS |
| Emergency requests | `/manage/emergencies` | Admin | Triage SOS requests | Search, filter by status (with counts), sort, page, open, add a request taken by phone | `GET /manage/emergencies`, `POST /manage/emergencies` | emergencies, volunteers | As the public form | Server-side paging/search/filter/sort; state kept in the URL | `admin-portal/03-emergencies-list.jpg`, `admin-portal/10-mobile-emergencies.jpg` | PASS (list, search, filter, sort, mobile; request added through the form) |
| Emergency detail | `/emergencies/:id` | Admin | Work one request | Accept, Mark in progress, Mark resolved, Cancel (with note); assign / reassign / remove volunteer; edit details; call | `GET /manage/emergencies/:id`, `PUT …/status`, `PUT …/assignment`, `PUT /manage/emergencies/:id` | emergencies, emergency_updates, volunteers, users | Workflow rules (see architecture §4); edit uses the form rules | Only valid next steps shown; history with names; updates every 30 s | `admin-portal/04-emergency-detail-pending.jpg`, `05-volunteer-picker.jpg`, `06-emergency-detail-in-progress.jpg` | PASS (assign, volunteer progress, resolve, remove volunteer with note, edit details, cancel) |
| Blood donors | `/manage/blood-donors` | Admin | Donor registry | Search, filter by group, sort, page, add, edit, delete | `GET/POST/PUT/DELETE /manage/blood-donors` | blood_donors | As the public form; phone unique (409) | CRUD with confirmation and toasts | — | PASS (add, edit with pre-filled form, delete) |
| Food donations | `/manage/food-donations` | Admin | Food offers | Search, sort, page, add, edit, delete | `…/food-donations` | food_donations | As the public form | — | `admin-portal/08-food-donations-paging.jpg` | PASS (paging across 28 rows, stale-page redirect; add, edit, delete) |
| Volunteers | `/manage/volunteers` | Admin | Volunteer list with workload | Search, filter by availability, sort, add, edit, delete | `…/volunteers` | volunteers, emergencies | Delete blocked while assigned to active requests (409) | "Active" column shows current assignments | — | PASS (add, edit, delete; delete refused with a toast while the volunteer had an active request) |
| Events | `/manage/events` | Admin | Community events | Filter Upcoming/Past, sort by date/participants, add, edit, delete | `…/events` | events, event_participants | Name required; date | — | — | PASS (add, edit, delete) |
| Hospitals | `/manage/hospitals` | Admin | Public hospital directory | Search, filter, add, edit, delete | `…/hospitals` | hospitals | Name required; phone format | Changes appear in the public directory | — | PASS (add with inline validation, edit, delete; checked in the public API) |
| Ambulances | `/manage/ambulances` | Admin | Public ambulance directory | Filter available/busy, add, edit (availability), delete | `…/ambulances` | ambulances | Driver, phone, location required | — | — | PASS (add with lowercase vehicle number saved in uppercase, edit availability, delete) |
| Users | `/manage/users` | Admin | Accounts and roles | Search, filter by role, sort, Make admin / Make member, delete | `GET /manage/users`, `PUT /manage/users/:id`, `DELETE /manage/users/:id` | users (+ unlinking) | No self-demotion/self-delete; one admin must remain (409) | Own row shows "You"; promoted users sign in again | `admin-portal/07-users.jpg` | PASS (promote, demote, delete a registered test account) |
| Your account | `/account` | Admin | Own name and password | Save name, change password | `PATCH /me`, `PUT /me/password` | users | As Profile | Name updates in the header | `admin-portal/09-account.jpg` | PASS (name change and revert); password via `test:workflow` |
| Not found | any other path | Admin | Unknown address | Back to dashboard | — | — | — | Not-found message | — | PASS |

## Cross-portal scenario (PASS)

1. Member (also a registered volunteer) sends an emergency from the user portal → #46 *Pending*.
2. Admin opens #46 → linked account shown → assigns the volunteer → *Accepted*, two
   history rows.
3. Requester's **My requests** shows *Accepted* and the volunteer's name only.
4. Volunteer's **My assignments** → *Start helping* with a note → *In Progress*.
5. Admin sees *In Progress* with the note; *Remove* is hidden; marks *Resolved*.
6. Requester sees *Resolved* and five history entries attributed to "a coordinator" /
   "the volunteer".

The test request was deleted afterwards (its history rows cascaded).
