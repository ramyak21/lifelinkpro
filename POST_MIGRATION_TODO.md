# LifeLink Pro — Open items

Updated 2026-10-27 after the portal split. Items that were done are listed at the end.
Details: [docs/security.md](docs/security.md), [docs/handover.md](docs/handover.md#7-known-limitations-and-unfinished-work).

## Required before production

- [ ] **Rotate credentials.** Change the MySQL password and `JWT_SECRET` that are in the
      delivered `server/.env` and in the backup archive; use a dedicated MySQL user (not
      `root`). Never ship `server/.env`. See [docs/security.md](docs/security.md#1-credentials-that-need-rotation).
- [ ] **Production configuration.** `NODE_ENV=production`, both portal origins in
      `CLIENT_URL`, `TRUST_PROXY` behind a proxy, HTTPS everywhere, backups enabled.
- [ ] **Apply migration 002** on the production database after a backup.

## Recommended

- [ ] **Automated UI tests** (Playwright or similar) for sign-in, the cross-portal emergency
      workflow and admin CRUD. Today the UI is verified manually; the API has 246 automated checks.
- [ ] **Remove or paginate legacy endpoints** `GET /api/admin/all` (returns every table),
      `/api/admin/stats` and `/api/manage/dashboard`. The portals no longer use them.
- [ ] **Public creation of hospitals, ambulances and events** needs no sign-in. Require
      sign-in or admin approval if spam becomes a problem.
- [ ] **Token storage.** The JWT is in `localStorage`; consider an `HttpOnly` cookie with
      CSRF protection, or shorter-lived tokens with refresh.
- [ ] **Rate limits are in memory** (per process, reset on restart). Add proxy-level limits or
      a shared store before running more than one API instance.

## Optional / feature gaps

- [ ] Notifications (e-mail/SMS) when a request is assigned or changes status.
- [ ] Password reset by e-mail.
- [ ] Push updates (Server-Sent Events) instead of 30–60 s polling.
- [ ] History for administrator changes to records other than emergencies.
- [ ] `TIMESTAMP` columns end in 2038; migrate to `DATETIME` in a future migration.
- [ ] Emergency numbers (112/108) are for India: `apps/user-portal/src/config/services.js`.
- [ ] Regenerate or retire `LifeLink-Pro-Complete-Project-Documentation.pdf` (describes the
      pre-split single app).

## Done

- Separate user and admin portals; one backend; one database.
- Rate limits on sign-in and registration; password policy (8–72 bytes) on the server.
- Personal-data lists (emergency, blood, food, volunteer) made admin-only and paginated.
- Server-side pagination, search, filters and sorting for every admin list.
- Event participation recorded per member (`event_participants`); join requires sign-in.
- Security headers; request logging without bodies, tokens or query strings.
- Text trimmed and validated on the server (lengths, enumerations, phone/email/date).
- Ambulance editing and deletion; full CRUD for every record type in the admin portal.
- Emergency status workflow with volunteer assignment and history.
- Emergencies and other submissions linked to the signed-in account; **My requests**.
- Members can edit their name and password.
- Every page, form and admin action verified in a real browser against the real API and MySQL (see `docs/testing/test-report.md`).
- Dashboard counts run in parallel (`/api/admin/summary`).
