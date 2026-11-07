# LifeLink Pro — API (`@lifelink/server`)

Express 5 + mysql2. Serves both portals; enforces every permission. Endpoint reference:
[docs/api.md](../docs/api.md). Security controls: [docs/security.md](../docs/security.md).

## Commands (from the repository root)

| Command | What it does |
|---|---|
| `npm run dev:server` | Start with nodemon on `PORT` (default 5000) |
| `npm run start:server` | Start with node (production) |
| `npm run sql:migrate` | Create/upgrade the schema from `database/migrations` |
| `npm run sql:seed` | Development demo data (refuses in production) |
| `npm run test:api` · `test:security` · `test:workflow` · `npm test` | Test suites (API running, development database with the demo seed) |

## Configuration

`server/.env`, created from [`.env.example`](.env.example) (placeholders only). Never
commit `.env`. Variables are explained in [docs/deployment.md](../docs/deployment.md#1-configuration).

## Structure

```text
server.js              middleware order, route mounting, start-up checks
config/database.js     mysql2 pool
routes/                URL → middleware → controller
middleware/            auth.js (requireUser / requireAdmin / optionalAuth), security.js
                       (headers, request log, rate limits), validation.js (id parameters,
                       flat JSON bodies), errorHandler.js
controllers/           request → service → response (response shapes kept compatible)
services/              business rules: emergencyService (workflow), userService (accounts,
                       password policy), eventService (participation), fields.js (validation
                       rules), resources.js (what each /api/manage resource allows)
repositories/          SQL: resourceRepository (generic, whitelisted identifiers),
                       emergencyRepository, transaction.js
utils/                 HttpError helpers, validateFields, list query parsing
scripts/               migrate.js, seed.js
tests/                 api / security / workflow suites (plain Node, no framework)
```

Expected errors are thrown as `HttpError(status, message)` and turned into
`{ success: false, message }` by `errorHandler`; anything else is logged and answered with
a generic 500.
