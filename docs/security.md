# LifeLink Pro — Security

Status as delivered on 2026-10-27. No secret values appear in this document.

## 1. Credentials that need rotation

| Credential | Where it exists | Why rotate | Action |
|---|---|---|---|
| MySQL password (`DB_PASSWORD`, user `root`) | `server/.env` in the delivered folder; also inside the backup archive `lifepro-backups/lifepro-before-portal-split-2026-10-26.tar.gz` (it contains `lifepro/server/.env`) | The project folder and the backup archive have been copied around with this file in them. Earlier versions of the code also had a MySQL root password hard-coded in source; it was removed from the code, but anyone with an old copy has it | Change the MySQL `root` password. Create a dedicated MySQL user with rights only on `lifepro` and use it in `server/.env`. Do not ship `server/.env` or the backup archive to anyone |
| `JWT_SECRET` | `server/.env` and the same backup archive | Anyone with it can forge sign-in tokens, including administrator tokens | Generate a new random value of 32+ characters (`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`). The current development value is shorter than 32 characters; the server refuses to start in production with it. Changing it signs everyone out |
| Demo accounts (`admin@lifelinkpro.test`, `user@lifelinkpro.test`) | Development seed `database/seeds/001_initial_seed.sql` (sign-in details in its header comment) | The passwords are public in the repository | Never load the seed into production (the seed refuses when `NODE_ENV=production`). If a database ever received it, delete those accounts |

Verified on 2026-10-27:

- `server/.env` is the only file with real credentials. It is listed in `.gitignore`
  (`.env`, `.env.*`, except `.env.example`).
- `server/.env.example`, `apps/user-portal/.env.example` and `apps/admin-portal/.env.example`
  contain placeholders only.
- No source file contains the old hard-coded database password.
- No `VITE_*` variable holds a secret, and the production bundles (`apps/*/dist`) contain
  neither `JWT_SECRET` nor `DB_PASSWORD`. `VITE_*` values are public by design: they are
  compiled into the browser bundle.

## 2. Controls in place

| Area | Control | Where |
|---|---|---|
| Passwords | bcrypt (cost 10); 8–72 bytes enforced by the API at registration and password change; never returned by any endpoint (23 automated checks) | `authController.js`, `userService.js` |
| Sign-in tokens | JWT HS256 (algorithm pinned on verify), 7-day expiry, `{ id, role }` only | `authController.js`, `middleware/auth.js` |
| Authorisation | Every protected request reloads the account from MySQL. Admin needs the role in token **and** database; demotion is immediate; deleted accounts are rejected | `middleware/auth.js` |
| Ownership | Members can only read and cancel their own requests; volunteers can only update requests assigned to them; history shown to members hides staff identities and account ids | `meController.js`, `emergencyService.js` |
| Personal data in lists | The emergency, blood, food and volunteer lists (names, phones, locations) are admin-only and paginated. Public lists are limited to the hospital and ambulance directories, which are meant to be public | `routes/*` |
| Admin safety | No self-delete, no self-demotion, at least one administrator always remains; volunteer delete blocked while assigned to active requests | `userService.js`, `manageController.js` |
| Concurrency | Emergency changes run in a transaction that locks the row | `emergencyService.js` |
| SQL injection | All values go through mysql2 placeholders. Table and column names in the generic admin queries come only from the whitelist in `services/resources.js`, never from the request; `?sort` is whitelisted; search uses an escaped `LIKE` pattern | `repositories/*`, `utils/listQuery.js` |
| Input validation | One rule set per record type shared by public and admin endpoints: required fields, max lengths, enumerations, phone/email/date formats, flat JSON bodies, numeric ids | `services/fields.js`, `utils/validate.js` |
| Brute force | Failed sign-ins limited per account+IP and per IP (15 min); registrations limited per IP (1 h); `Retry-After` header | `middleware/security.js` |
| Headers | `nosniff`, `X-Frame-Options: DENY`, `CSP default-src 'none'; frame-ancestors 'none'` (the API serves JSON only), `Referrer-Policy: no-referrer`, `COOP same-origin`, HSTS in production, no `X-Powered-By` | `middleware/security.js` |
| CORS | Only the origins in `CLIENT_URL` (both portals) | `server.js` |
| Errors | Clients get short messages; SQL errors and stack traces go only to the server log | `middleware/errorHandler.js` |
| Logging | One line per request: method, path **without query string**, status, duration. Bodies, tokens and passwords are never logged | `middleware/security.js` |
| Production start-up | Refuses to start without `CLIENT_URL` or with a `JWT_SECRET` under 32 characters; demo seed refuses to run | `server.js`, `scripts/seed.js` |
| Portal separation | Separate apps, separate session storage keys; the admin portal refuses member accounts; the admin build is marked `noindex` | `apps/admin-portal` |

## 3. Findings and their status

| # | Finding | Severity | Status |
|---|---|---|---|
| 1 | Real database password and JWT secret present in the delivered folder and backup archive | High | **Open: rotate** (section 1) |
| 2 | Public lists exposed donor, volunteer and emergency personal data | High | Fixed: admin-only and paginated |
| 3 | No limit on sign-in attempts or registrations | High | Fixed: in-memory rate limits. Per process and reset on restart; for several API instances use limits at the proxy as well |
| 4 | Password policy only in the browser; bcrypt ignores bytes after 72 | Medium | Fixed: 8–72 bytes enforced by the API |
| 5 | Admin role taken from the token alone | Medium | Fixed: checked in token and database on every request |
| 6 | Event join was anonymous and repeatable | Medium | Fixed: signed-in join, one per member (`event_participants`) |
| 7 | No security headers | Medium | Fixed (section 2) |
| 8 | Unbounded lists (whole tables returned) | Medium | Fixed for `/api/manage/*` and the legacy lists. **Open:** legacy `GET /api/admin/all` (admin-only, unused by the portals) still returns every table |
| 9 | JWT stored in `localStorage` (readable by any XSS) | Medium | **Open.** Mitigations: React escapes output, no `dangerouslySetInnerHTML`, no third-party scripts. A cookie-based session would need CSRF protection |
| 10 | Public creation of hospitals, ambulances and events without sign-in (spam/defacement of public directories) | Medium | **Open** (product decision; kept for compatibility). Admins can edit or delete entries. Consider requiring sign-in or admin approval |
| 11 | Rate limits are in memory | Low | Open (documented). Use a shared store or proxy limits when scaling out |
| 12 | Tokens cannot be revoked before expiry (7 days) except by deleting/demoting the account or rotating `JWT_SECRET` | Low | Open (documented) |
| 13 | No HTTPS in development | Info | Expected; production must use HTTPS (HSTS is sent when `NODE_ENV=production`) |

## 4. Production checklist

- [ ] Rotate the MySQL password and `JWT_SECRET` (section 1); use a dedicated MySQL user.
- [ ] `NODE_ENV=production`, `CLIENT_URL` = the two portal origins, `TRUST_PROXY` behind a proxy.
- [ ] HTTPS for both portals and the API.
- [ ] Never run `npm run sql:seed`; create the first administrator by registering and
      promoting the account with SQL (`UPDATE users SET role = 'admin' WHERE email = ...`).
- [ ] Consider serving the admin portal from a separate host name and restricting it
      (VPN, IP allow-list or single sign-on at the proxy). The API still enforces admin
      rights either way.
- [ ] Database backups enabled and a restore tested ([database.md](database.md#backup-and-recovery)).
