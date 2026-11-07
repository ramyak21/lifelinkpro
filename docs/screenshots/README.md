# Screenshots

Captured on 2026-10-27 from the running application (both portals in `npm run dev`
against the real API and the development MySQL database). Viewport 1024 × 700 unless
noted; images are scaled to about 800 px wide. Only demo accounts and clearly labelled
test data ("E2E …", deleted afterwards) appear. No passwords, tokens or production data
are shown.

## User portal (`user-portal/`)

| File | Shows |
|---|---|
| `01-home.jpg` | Public home page, signed in as the demo member |
| `02-dashboard.jpg` | Member dashboard: quick actions, emergency callout, "Your requests" card |
| `03-events.jpg` | Community events with search, filters and Join |
| `04-profile.jpg` | Profile: identity, name form, read-only email, session card |
| `05-blood-donation-form.jpg` | Blood donor registration form (signed out) |
| `06-volunteer-form.jpg` | Volunteer registration form (signed out) |
| `07-hospitals-directory.jpg` | Public hospital directory |
| `09-register.jpg` | Create an account |
| `10-login.jpg` | Member sign-in |
| `11-emergency-sent.jpg` | Emergency request #46 sent while signed in (confirmation with reference) |
| `12-my-requests-accepted.jpg` | My requests: #46 Accepted after an administrator assigned a volunteer |
| `13-my-requests-resolved-history.jpg` | My requests: #46 Resolved, history attributed to roles only |

## Admin portal (`admin-portal/`)

| File | Shows |
|---|---|
| `01-login.jpg` | Administrator sign-in |
| `02-dashboard.jpg` | Dashboard figures from `GET /api/admin/summary` |
| `03-emergencies-list.jpg` | Emergency requests: search, status filter with counts, sortable columns |
| `04-emergency-detail-pending.jpg` | Request #46 Pending: next steps, details, volunteer card |
| `05-volunteer-picker.jpg` | Volunteer picker drawer with search and workload |
| `06-emergency-detail-in-progress.jpg` | #46 In Progress after the volunteer's "Start helping"; Remove hidden, Reassign available |
| `07-users.jpg` | Users: own row marked "You", role actions, role filter counts |
| `08-food-donations-paging.jpg` | Server-side paging: page 2 (rows 26–28 of 28 test rows) |
| `09-account.jpg` | Administrator's own account page |
| `10-mobile-emergencies.jpg` | Emergency requests at 375 px (cards instead of a table) |
