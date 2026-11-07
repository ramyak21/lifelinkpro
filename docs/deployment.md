# LifeLink Pro — Deployment

Three deployable parts, one database:

| Part | Output | Hosting |
|---|---|---|
| User portal | `apps/user-portal/dist/` (static files) | Any static host or web server, e.g. `https://lifelink.example.com` |
| Admin portal | `apps/admin-portal/dist/` (static files) | A separate host name, e.g. `https://admin.lifelink.example.com` |
| API | `server/` (Node.js process) | Node 20.19+ behind HTTPS, e.g. `https://api.lifelink.example.com` |
| Database | MySQL 8 | Managed or self-hosted; reachable only from the API |

## 1. Configuration

### API (`server/.env` on the server, or real environment variables)

| Variable | Production value |
|---|---|
| `NODE_ENV` | `production` (enables start-up checks, HSTS, blocks the demo seed) |
| `PORT` | Port the process listens on (default 5000) |
| `CLIENT_URL` | **Both** portal origins, comma-separated, exactly as the browser shows them: `https://lifelink.example.com,https://admin.lifelink.example.com` (required; no trailing slash) |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | A dedicated MySQL user with rights only on the app database (not `root`) |
| `DB_SSL`, `DB_SSL_CA` | `true` and the provider's CA file when the database is reached over a network |
| `JWT_SECRET` | Random, 32+ characters (the server refuses shorter values in production) |
| `TRUST_PROXY` | Number of proxies in front of the API (usually `1`), so rate limits see the client's IP |
| `LOG_REQUESTS` | `true` (default) for one line per request; logs never contain bodies, tokens or query strings |
| `RATE_LIMIT_*` | Leave the defaults unless you have a reason (see [api.md](api.md#rate-limits-and-headers)) |

### Portals (build time)

Vite reads these when you **build**; they are compiled into the JavaScript and are
therefore public. Never put a secret in a `VITE_*` variable.

| Portal | Variable | Value |
|---|---|---|
| User portal | `VITE_API_URL` | `https://api.lifelink.example.com/api` |
| User portal | `VITE_ADMIN_PORTAL_URL` | Optional: `https://admin.lifelink.example.com` (shows an "Admin portal" link to administrators). Without it, production builds show no link |
| Admin portal | `VITE_API_URL` | `https://api.lifelink.example.com/api` |
| Admin portal | `VITE_USER_PORTAL_URL` | Optional: `https://lifelink.example.com` ("View site" link) |

Put them in `apps/<portal>/.env.production` (git-ignored) or set them in the shell or CI
before building.

## 2. Build

```bash
npm ci
```

```bash
npm run build
```

`npm run build` builds both portals (`build:user`, `build:admin` individually). Check them
locally with `npm run preview -w @lifelink/user-portal` (port 4173) and
`npm run preview -w @lifelink/admin-portal` (port 4174). To use the previews against a
local API, add `http://localhost:4173,http://localhost:4174` to `CLIENT_URL` in
`server/.env` (the default lists only the dev ports 5173/5174).

## 3. Database

On every deploy, **after a backup**:

```bash
npm run sql:migrate
```

Never run `npm run sql:seed` in production. Create the first administrator by registering
in the user portal and promoting that account once:

```sql
UPDATE users SET role = 'admin' WHERE email = 'coordinator@example.com';
```

Further administrators are promoted from the admin portal's Users screen.

## 4. Run the API

```bash
npm run start:server
```

Run it under a process manager (systemd, pm2 or your platform's service) with
`NODE_ENV=production`, restart on failure, and collect stdout/stderr as logs. Use a single
instance unless you also move the rate limits to the proxy or a shared store (they are
kept in memory per process).

## 5. Serve the portals

Both portals are single-page apps that use real URLs (`/manage/users`, `/requests`).
The web server must return `index.html` for any path that is not a file (SPA fallback),
or reloading a deep link gives a 404.

Example (nginx), one server block per portal:

```nginx
server {
    listen 443 ssl;
    server_name admin.lifelink.example.com;
    root /var/www/lifelink/admin-portal;   # contents of apps/admin-portal/dist

    location /assets/ {
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
    location / {
        try_files $uri /index.html;
        add_header Cache-Control "no-cache";
    }
}
```

And the API behind the same proxy:

```nginx
server {
    listen 443 ssl;
    server_name api.lifelink.example.com;
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Static hosts (Netlify, Vercel, Cloudflare Pages, S3 + CloudFront…) need the equivalent
"rewrite all routes to /index.html" rule. Optionally restrict access to the admin host
(VPN, IP allow-list, or single sign-on at the proxy); the API enforces admin rights
regardless.

## 6. After deploying

- Open `https://api…/` → welcome message.
- Sign in to the admin portal with the administrator account; the dashboard figures load.
- In the browser console of each portal there must be no CORS errors (if there are, the
  origin is missing from `CLIENT_URL`).
- Send a test emergency from the user portal and check it appears in the admin portal,
  then delete it.

## Changes compared with the previous deployment

| Before | Now |
|---|---|
| One frontend (`client/`), `client/dist` | Two frontends: `apps/user-portal/dist` and `apps/admin-portal/dist` |
| `CLIENT_URL` = one origin | `CLIENT_URL` = both portal origins |
| Admin pages under `/admin` in the public site | Separate admin portal on its own origin; `/admin` no longer exists in the user portal |
| Install in `server/` and `client/` separately | One `npm ci` at the root (npm workspaces) |
| `npm run sql:migrate` brought the schema to 001 | Migration 002 must be applied (back up first) |
