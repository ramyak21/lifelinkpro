# LifeLink Pro — Database

LifeLink Pro uses **MySQL as its only database**. This folder holds the schema
and the demo data as plain SQL files. The Node scripts in `server/scripts/` only
*run* these files; they contain no table definitions.

```text
database/
├── migrations/
│   ├── 001_initial_schema.sql                      ← the original tables, indexes and foreign keys
│   └── 002_user_links_and_emergency_workflow.sql   ← account links, emergency workflow, history, event participants
├── seeds/
│   ├── 001_initial_seed.sql     ← development/demo data (incl. a demo admin login)
│   └── 002_workflow_demo.sql    ← links the demo volunteer to the demo member
└── README.md                    ← this file
```

The full table reference, relationships, backup/recovery and the MongoDB → MySQL field
mapping are in [docs/database.md](../docs/database.md).

---

## Commands

Run from the project root (or `server/`); connection settings come from `server/.env`:

| Command | What it does |
|---|---|
| `npm run sql:migrate` | Creates the database named in `DB_NAME` if it does not exist, then applies every file in `migrations/` that is not yet recorded in `schema_migrations`, in file-name order. Safe to run any number of times. |
| `npm run sql:seed` | Runs every file in `seeds/`. Each insert only runs when its demo row is missing, so re-running never creates duplicates. Refuses to run when `NODE_ENV=production`. |

## How migrations are tracked

`server/scripts/migrate.js` keeps one bookkeeping table, `schema_migrations`:

| Column | Meaning |
|---|---|
| `version` | migration file name, e.g. `001_initial_schema.sql` |
| `applied_at` | when it was applied |

A file listed there is never run again.

## Adding a schema change

1. **Never edit a migration that has already been applied** — it will not run again on
   databases that already have it.
2. Create the next numbered file, for example
   `database/migrations/003_add_hospital_beds.sql`:

   ```sql
   ALTER TABLE hospitals ADD COLUMN beds INT UNSIGNED NULL AFTER services;
   ```

3. Back up the database (see [docs/database.md](../docs/database.md#backup-and-recovery)), then run `npm run sql:migrate`.

Notes:

- MySQL commits DDL (`CREATE`/`ALTER`) immediately, so a migration that fails halfway can
  leave its earlier statements applied. Keep migrations small; fix the problem and re-run.
- Write plain SQL statements separated by `;`. `DELIMITER` blocks (procedures/triggers)
  are not supported, because the file is sent to MySQL as one multi-statement query.
- Keep the SQL compatible with MySQL 8.0 (for example, MySQL has no
  `ADD COLUMN IF NOT EXISTS`).

## Running the SQL without Node (optional)

The files are plain SQL. They do not contain `CREATE DATABASE` / `USE`, so select the
database first:

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS lifepro CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
mysql -u root -p lifepro < database/migrations/001_initial_schema.sql
mysql -u root -p lifepro < database/seeds/001_initial_seed.sql
```

In Windows PowerShell (where `<` is not supported), open `mysql -u root -p lifepro` and run
`source database/migrations/001_initial_schema.sql` instead.

Files run by hand are not recorded in `schema_migrations`. That is harmless for
`001_initial_schema.sql` (it only uses `CREATE TABLE IF NOT EXISTS`), but prefer
`npm run sql:migrate`.

## Demo data (seed)

`seeds/001_initial_seed.sql` is **development/demo data only**: a demo administrator, a
demo member (the sign-in details are in the comment at the top of that file) and one or
two rows marked "Demo …" in every other table (phone numbers `9000000001`–`9000000007`).
`seeds/002_workflow_demo.sql` links the demo volunteer to the demo member account so the
volunteer pages (My assignments) can be tried, and gives every emergency a "created"
history entry. Both seeds only insert what is missing, so they are safe to re-run.

The demo admin exists because `POST /api/auth/register` always creates `role = 'user'`,
so a fresh database has no other way to sign in to the admin portal.

**Never run the seed in production.** To create a real admin, register normally through
the app and promote that account:

```sql
UPDATE users SET role = 'admin' WHERE email = 'you@example.com';
```

## Old MongoDB data

**No MongoDB data migration was required because the project contains schema/model
definitions but no export/dump of actual MongoDB records.** In addition, every API route was
already reading and writing MySQL before the Mongoose models were removed.

If an old MongoDB database still holds records somewhere (the former `MONGO_URI` was
`mongodb://127.0.0.1:27017/lifelinkpro`), copy them without deleting anything:

1. **Export (read-only — MongoDB is not modified):**

   ```bash
   mongoexport --uri="mongodb://127.0.0.1:27017/lifelinkpro" --collection=users --jsonArray --out=users.json
   ```

   Repeat for `blooddonors`, `fooddonations`, `volunteers`, `events`, `hospitals`,
   `ambulances` and `emergencies` (Mongoose's default collection names).
2. **Run `npm run sql:migrate`** so the MySQL tables exist.
3. **Insert the records** using the field mapping in the main README
   (e.g. `donorName → name`, `bloodGroup → blood_group`, `createdAt → created_at`).
   Let MySQL assign new `id` values — MongoDB `_id` values are not reused.
4. **Users first.** Keep each user's bcrypt `password` hash unchanged (it is compatible, so
   users keep their passwords). Emails that differ only in letter case count as duplicates
   in MySQL — resolve those before importing.
5. **Then emergencies:** translate each `userId` (ObjectId) to the new `users.id` by matching
   the user's email; leave `user_id` as `NULL` when there is no match.
6. **Verify** row counts per collection/table and spot-check records in the Admin Management
   page. Retire MongoDB only after that check.
