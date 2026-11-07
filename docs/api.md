# LifeLink Pro — API Reference

Base URL: `http://localhost:5000/api` in development (`VITE_API_URL` in each portal).
All bodies are JSON; request bodies must be flat objects (nested objects/arrays → 400).
The client for every endpoint the portals use is `packages/shared/src/services/lifelink.js`.

## Conventions

| Item | Rule |
|---|---|
| Authentication | `Authorization: Bearer <JWT>` from `POST /api/auth/login` (HS256, valid 7 days) |
| Permission levels | **Public** (no token), **Optional** (token links the record to the account; an invalid token → 401), **Member** (`requireUser`: any signed-in account), **Admin** (`requireAdmin`: admin role in the token *and* in the database) |
| Success | `{ "success": true, ... }` |
| Failure | `{ "success": false, "message": "..." }` with 400 validation, 401 no/invalid/expired token, 403 not allowed, 404 not found, 405 not supported, 409 conflicting state, 429 rate limited, 500 unexpected (generic message; details only in the server log) |
| `:id` | Must be a positive whole number, otherwise 400 |
| Phone numbers | 7–15 digits; spaces, `+`, `-`, `(`, `)` allowed |
| Lists with paging | `?page` (default 1), `?pageSize` (default 25, max 100), `?q` (search, max 100 chars, `%`/`_` matched literally), `?sort` (whitelisted column), `?order=asc|desc` (default desc). Response adds `pagination: { page, pageSize, total, totalPages }` |

## Health

| Method | Path | Permission | Response |
|---|---|---|---|
| GET | `/` (not under `/api`) | Public | `{ success, message: "🚀 Welcome to LifeLink Pro API" }` |

## Authentication — `/api/auth`

| Method | Path | Permission | Body | Response | Notes |
|---|---|---|---|---|---|
| POST | `/auth/register` | Public | `name` (≤150), `email`, `password` (8–72 bytes) | 201 `{ success, message, user: { id, name, email, role } }` | Always creates `role = "user"`. 400 `User already exists`. Rate limit: `RATE_LIMIT_REGISTER_PER_HOUR` per IP (default 30) → 429 |
| POST | `/auth/login` | Public | `email`, `password` | `{ success, message, token, user: { id, name, email, role } }` | Wrong email or password → 400 `Invalid email or password` (same message for both). Failed attempts limited per account+IP (default 10 / 15 min) and per IP (default 50 / 15 min) → 429 |

The password hash is never returned by any endpoint.

## Public services (user portal)

| Method | Path | Permission | Body / query | Response |
|---|---|---|---|---|
| POST | `/emergency` | Optional | `name`*, `phone`*, `location`*, `emergencyType` (Medical, Accident, Fire, Other), `description` (≤1000) | 201 `{ success, message, emergency }`. Signed in → linked to the account. 400 `Emergency request already exists.` while an identical (name+phone+location) request is still active |
| POST | `/blood/register` | Optional | `name`*, `phone`*, `bloodGroup`* (A+ … O-), `age` (18–65), `location`* | 201 `{ success, message, donor }`. 400 if the phone is already registered |
| POST | `/food/donate` | Optional | `donorName`*, `phone`*, `foodType`*, `quantity`*, `location`* | 201 `{ success, message, donation }`. 400 for an identical donation already on file |
| POST | `/volunteer/register` | Optional | `name`*, `email`, `phone`, `address`, `skills`, `location`, `availability` (Full Time, Part Time, Weekends) | 201 `{ success, message, volunteer }`. Signed in → becomes the account's volunteer profile (one per account; 400 `You are already registered as a volunteer.` if it already has one) |
| GET | `/events` | Optional | — | `{ success, events }`; with a token each event has `joined: true/false` |
| POST | `/events/create` | Public | `eventName`*, `description`, `date` (not in the past), `location`, `organizer` | 201 `{ success, message, event }` |
| PUT | `/events/join/:id` | Member | — | `{ success, message, event }`. 409 already joined; 400 the event has already taken place; 404 unknown event |
| PUT | `/events/leave/:id` | Member | — | `{ success, message, event }`. 404 if you haven't joined it |
| GET | `/hospital` | Public | — | `{ success, hospitals }` (public directory) |
| POST | `/hospital/register` | Public | `hospitalName`*, `phone`, `address`, `location`, `services`, `emergencyAvailable` (Available, Not Available) | 201 `{ success, message, hospital }` |
| GET | `/ambulance` | Public | — | `{ success, ambulances }` (public directory) |
| POST | `/ambulance/register` | Public | `driverName`*, `phone`*, `vehicleNumber`, `location`*, `availability` (available, busy; default available) | 201 `{ success, message, ambulance }` |

`*` = required. Older field names are still accepted for compatibility (`title` for
`eventName`, `name` for `hospitalName`/`driverName`/`donorName`, `status` for
`availability`, snake_case column names).

### Legacy list endpoints (admin only)

These four lists used to be public; they return personal data, so they now require an
administrator and are paginated (same query parameters as above). The portals do not use
them (the admin portal uses `/api/manage`).

| Method | Path | Response key |
|---|---|---|
| GET | `/emergency` | `emergencies` |
| GET | `/blood` | `donors` |
| GET | `/food` | `donations` |
| GET | `/volunteer` | `volunteers` |

## Signed-in account — `/api/me` (Member)

| Method | Path | Body | Response | Rules |
|---|---|---|---|---|
| GET | `/me` | — | `{ success, user, volunteerProfile }` | |
| PATCH | `/me` | `name` | `{ success, message, user }` | Email and role cannot be changed here |
| PUT | `/me/password` | `currentPassword`, `newPassword` | `{ success, message }` | Current password must match (400); new password 8–72 bytes and different from the current one (400) |
| GET | `/me/requests` | — | `{ success, emergencies, bloodDonations, foodDonations, volunteerProfile, events }` | Only records linked to this account. Each emergency includes `updates` (history with roles only) and the assigned volunteer's **name** (no volunteer phone/email) |
| PUT | `/me/emergencies/:id/cancel` | — | `{ success, message }` | Own request only (404 otherwise); only while **Pending** (409 otherwise) |
| GET | `/me/assignments` | — | `{ success, volunteerProfile, assignments }` | Requests assigned to this account's volunteer profile, with requester phone and location and history |
| PUT | `/me/assignments/:id/status` | `status`, `note` (≤500, optional) | `{ success, message }` | 403 if the account has no volunteer profile; 404 if the request isn't assigned to them; only Accepted → In Progress and In Progress → Resolved (409 otherwise) |

## Administration — `/api/admin` and `/api/manage` (Admin)

### Dashboard

| Method | Path | Response |
|---|---|---|
| GET | `/admin/summary` | `{ success, summary }` — totals per table, `emergencies: { total, open, byStatus }`, `bloodDonors.byGroup`, `foodDonations.available`, `events.upcoming`, `hospitals.withEmergency`, `ambulances.available`, `users.admins`, `latestEmergencies` (5), `upcomingEvents` (5). Used by the admin dashboard |
| GET | `/admin/stats` | Legacy: 7 counts. Not used by the portals |
| GET | `/admin/all` | Legacy: every row of every table, **not paginated**. Not used by the portals (see limitations) |
| GET | `/manage/dashboard` | Legacy: 7 counts. Not used by the portals |

### Generic resources

`:resource` is one of `users`, `hospitals`, `volunteers`, `blood-donors`,
`food-donations`, `events`, `ambulances`, `emergencies` (anything else → 404).

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/manage/:resource` | — (query: paging, `q`, `sort`, `order`, filters below) | `{ success, <key>: rows, pagination, facets }` |
| GET | `/manage/:resource/:id` | — | `{ success, record }` (emergencies: full detail with `updates`, volunteer contact and linked account) |
| POST | `/manage/:resource` | Same fields as the public form | 201 `{ success, message, record }`. `users` → 405 (people register themselves) |
| PUT | `/manage/:resource/:id` | Same fields as create; full replacement of the editable fields | `{ success, message, record }`. `users`: `{ name, role }` only |
| DELETE | `/manage/:resource/:id` | — | `{ success, message }` |

| Resource | Response key | Search (`q`) | Filters (`facets` returns counts per value) | Sort keys |
|---|---|---|---|---|
| `users` | `users` | name, email | `role` = user, admin | created_at, name, email, role |
| `hospitals` | `hospitals` | name, address, location, services, phone | `emergency` = Available, Not Available | created_at, name |
| `volunteers` | `volunteers` | name, email, phone, skills, location, address | `availability` = Full Time, Part Time, Weekends | created_at, name, availability |
| `blood-donors` | `donors` | name, phone, location, blood group | `bloodGroup` = A+ … O- | created_at, name, blood_group, age |
| `food-donations` | `foodDonations` | name, phone, food type, location | — | created_at, name, food_type |
| `events` | `events` | title, location, organizer, description | `when` = upcoming, past | created_at, date, title, participants |
| `ambulances` | `ambulances` | driver, phone, vehicle number, location | `status` = available, busy | created_at, name, status |
| `emergencies` | `emergencies` | name, phone, location, description, type | `status` (5 values), `type` (4 values) | created_at, status, name, updated_at |

Volunteer rows include `activeAssignments` (requests Accepted or In Progress assigned to
them). Emergency rows include `assignedVolunteerName`.

Special rules:

| Case | Result |
|---|---|
| `PUT /manage/users/:id` on yourself with `role: "user"` | 409 — you can't remove your own administrator role |
| Demoting or deleting the last administrator | 409 — at least one administrator must remain |
| `DELETE /manage/users/:id` on yourself | 409 |
| `DELETE /manage/users/:id` | Runs in a transaction: their records stay but are unlinked (`user_id` NULL); their event participations are removed and event counts corrected |
| `DELETE /manage/volunteers/:id` while the volunteer has Accepted/In Progress requests | 409 — reassign those requests first |
| `PUT /manage/blood-donors/:id` with another donor's phone | 409 |
| Creating an emergency as an admin | Not linked to the admin's account (`user_id` NULL); history records "admin" |

### Emergency workflow

| Method | Path | Body | Response | Rules |
|---|---|---|---|---|
| PUT | `/manage/emergencies/:id/status` | `status`, `note` (optional, ≤500) | `{ success, message, record }` (full detail) | Transitions: Pending → Accepted/Cancelled; Accepted → In Progress/Cancelled; In Progress → Resolved/Cancelled. In Progress needs an assigned volunteer. Anything else → 409 |
| PUT | `/manage/emergencies/:id/assignment` | `volunteerId` (number, or `null` to remove), `note` | `{ success, message, record }` | Only while Pending/Accepted/In Progress (409). Assigning to a Pending request moves it to Accepted. Removing while In Progress → 409 (reassign instead). Same volunteer again → 409. Unknown volunteer → 404 |

## Rate limits and headers

| Setting (`server/.env`) | Default | Applies to |
|---|---|---|
| `RATE_LIMIT_LOGIN_FAILURES` | 10 per 15 min | failed logins per account + IP |
| `RATE_LIMIT_LOGIN_FAILURES_PER_IP` | 50 per 15 min | failed logins per IP |
| `RATE_LIMIT_REGISTER_PER_HOUR` | 30 per hour | registrations per IP |

Limits are kept in memory (they reset when the API restarts and are per process). Behind
a proxy set `TRUST_PROXY` so the real client IP is used. Every response carries
`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
`Content-Security-Policy: default-src 'none'; frame-ancestors 'none'`,
`Referrer-Policy: no-referrer` and `Cross-Origin-Opener-Policy: same-origin`, plus
`Strict-Transport-Security` when `NODE_ENV=production`.

## Breaking changes compared with the original API

Clients other than the two portals must be updated for these:

1. `GET /api/emergency`, `/api/blood`, `/api/food`, `/api/volunteer` now require an
   administrator and are paginated (previously public, full table).
2. `PUT /api/events/join/:id` now requires a signed-in member and rejects a second join
   (previously anonymous counter increment).
3. `GET /api/manage/:resource` is paginated (25 per page by default) and returns
   `pagination` and `facets`.
4. Passwords must be 8–72 bytes at registration; sign-in and registration are rate limited.
5. Text fields now have maximum lengths and enumerations are validated (previously many
   values were passed straight to the database).
