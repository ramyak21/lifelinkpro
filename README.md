# LifeLink Pro

LifeLink Pro is a community services platform. People send emergency (SOS) requests,
register as blood donors or volunteers, offer food, join community events, and look up
hospitals and ambulances. Coordinators run everything from a separate admin portal:
they review requests, assign volunteers, move requests through their workflow and
maintain every record.

```text
 User portal (React, :5173)  ──┐
                               ├──►  Express API (:5000)  ──►  MySQL 8 (database "lifepro")
 Admin portal (React, :5174) ──┘     one backend, one database
```

| Part | Folder | Who uses it |
|---|---|---|
| **User portal** | [`apps/user-portal`](apps/user-portal/README.md) | The public and signed-in members (requesters and volunteers) |
| **Admin portal** | [`apps/admin-portal`](apps/admin-portal/README.md) | Administrators only |
| **Shared UI and API client** | [`packages/shared`](packages/shared/README.md) | Both portals (components, hooks, session, the one API contract) |
| **API** | [`server`](server/README.md) | Both portals; enforces every permission |
| **Database** | [`database`](database/README.md) | SQL migrations and dev seed data |

## Documentation

| Document | Contents |
|---|---|
| [docs/architecture/02-architecture.md](docs/architecture/02-architecture.md) | Architecture diagram, request flow, sessions, emergency workflow |
| [docs/api.md](docs/api.md) | Every endpoint with its permission, inputs and responses |
| [docs/database.md](docs/database.md) | Tables, relationships, migrations, backup and recovery, MongoDB history |
| [docs/use-cases.md](docs/use-cases.md) | Page-by-page use cases for both portals, with verification status |
| [docs/testing/test-report.md](docs/testing/test-report.md) | What was tested, how, and the results |
| [docs/security.md](docs/security.md) | Security controls, findings and credential rotation |
| [docs/deployment.md](docs/deployment.md) | Production build, hosting, environment variables |
| [docs/handover.md](docs/handover.md) | Change log (files created/moved/removed), acceptance criteria, limitations |
| [docs/architecture/01-audit-and-migration-plan.md](docs/architecture/01-audit-and-migration-plan.md) | The audit and plan that preceded the portal split |
| [docs/screenshots](docs/screenshots) | Real screenshots of both portals, captured during verification |
| [POST_MIGRATION_TODO.md](POST_MIGRATION_TODO.md) | Open items and recommendations |

`LifeLink-Pro-Complete-Project-Documentation.pdf` describes the project **before** the
portal split (single React app in `client/`). It is kept for reference but is out of date;
the Markdown documents above describe the current system.

## Requirements

| Tool | Version |
|---|---|
| Node.js | 20.19+ or 22.12+ (Vite 8). Tested with 22.19. |
| npm | 10+ (workspaces) |
| MySQL | 8.0+ (tested with 8.0.43) |

## Project structure

```text
lifepro/
├── package.json            npm workspaces + root scripts (one package-lock.json)
├── apps/
│   ├── user-portal/        public site and member area (Vite + React 19)
│   └── admin-portal/       administrator app (Vite + React 19)
├── packages/
│   └── shared/             @lifelink/shared: UI components, hooks, session, API client, styles
├── server/                 Express 5 API (routes → middleware → controllers → services → repositories)
│   ├── scripts/            migrate.js, seed.js
│   └── tests/              api / security / workflow test suites
├── database/
│   ├── migrations/         001_initial_schema.sql, 002_user_links_and_emergency_workflow.sql
│   └── seeds/              development-only demo data
└── docs/                   architecture, API, database, tests, security, deployment, screenshots
```

## Setup (development)

```bash
npm install
```

One install at the root covers both portals, the shared package and the API.

Create the API configuration from its template, then set your MySQL password and a
`JWT_SECRET` in `server/.env` (never commit that file):

```bash
cp server/.env.example server/.env
```

Create or upgrade the schema (safe to repeat; MySQL must be running):

```bash
npm run sql:migrate
```

Optionally load the development demo data. It refuses to run when `NODE_ENV=production`.
The demo sign-ins are listed in the comment at the top of
`database/seeds/001_initial_seed.sql`.

```bash
npm run sql:seed
```

The portals need no configuration for local development. Each can be configured with a
`.env` copied from its `.env.example` (public values only, never secrets).

## Running in development

Use three terminals:

```bash
npm run dev:server
```

```bash
npm run dev:user
```

```bash
npm run dev:admin
```

| URL | What |
|---|---|
| <http://localhost:5173> | User portal |
| <http://localhost:5174> | Admin portal (sign in with an administrator account) |
| <http://localhost:5000> | API (`GET /` answers with a welcome message) |

Both portal ports are fixed (`strictPort`): if a port is busy, Vite stops instead of
picking another port that CORS would block. `CLIENT_URL` in `server/.env` must list both
portal origins (it does in `.env.example`).

## Building for production

```bash
npm run build
```

This builds `apps/user-portal/dist` and `apps/admin-portal/dist` (static files). Start the
API with:

```bash
npm run start:server
```

Set `VITE_API_URL` (and the optional cross-portal links) **before** building, and
`NODE_ENV=production`, `CLIENT_URL` and a strong `JWT_SECRET` on the server. Full
instructions: [docs/deployment.md](docs/deployment.md).

## Checks and tests

```bash
npm run lint
```

```bash
npm run build
```

With the API running against a **development** database that has the demo seed loaded:

```bash
npm test
```

`npm test` runs the three suites in order: `test:api` (91 checks), `test:security`
(73 checks) and `test:workflow` (82 checks). They create their own rows and delete them
again, and refuse to run when `NODE_ENV=production`. Results and the manual browser
verification are in [docs/testing/test-report.md](docs/testing/test-report.md).

## Roles and permissions (summary)

| Who | Can |
|---|---|
| Anyone | Send emergency requests and the public forms; browse events, hospitals and ambulances; register an account |
| Signed-in member | Everything above, linked to their account; join/leave events; see **My requests**; cancel their own *Pending* request; edit their name and password |
| Member who is a registered volunteer | **My assignments**: move an assigned request *Accepted → In Progress → Resolved* |
| Administrator | Admin portal: dashboard, every record type (list, search, filter, sort, create, edit, delete), emergency workflow and volunteer assignment, user roles |

The API checks every permission on every request; the portals only decide what to show.
Details: [docs/api.md](docs/api.md) and [docs/security.md](docs/security.md).

## Troubleshooting

| Problem | Fix |
|---|---|
| `ECONNREFUSED` from `sql:migrate`, or `MySQL Connection Failed` in the API log | Start MySQL and check `DB_HOST`/`DB_PORT` in `server/.env`. |
| `Access denied for user ...` | Fix `DB_USER`/`DB_PASSWORD` in `server/.env`. |
| `Unknown column ...` after updating the code | Run `npm run sql:migrate` (migration 002 adds columns and tables). |
| A portal says it can't reach the server | Start the API; check `VITE_API_URL` if the API is not on `http://localhost:5000/api`. |
| `blocked by CORS policy` in the browser console | Add the portal's exact origin to `CLIENT_URL` (comma-separated) and restart the API. |
| `Port 5173/5174 is already in use` | Another dev server is running; stop it (the ports are fixed on purpose). |
| Admin sign-in says the account has no administrator access | Only administrators can use the admin portal. Another administrator can promote the account on the Users screen; the person must then sign in again. |
| `Too many sign-in attempts` / `Too many new accounts` (429) | Wait for the window to pass (15 minutes / 1 hour), or raise the limits in `server/.env` for development. |
