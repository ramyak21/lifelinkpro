# LifeLink Pro — Database

MySQL 8, database `lifepro`, InnoDB, `utf8mb4` / `utf8mb4_unicode_ci`. One database is
shared by both portals through the one API. The SQL files in `database/migrations/` are
the source of truth; `npm run sql:migrate` applies the ones not yet recorded in
`schema_migrations`. How to add a migration and how the runner works:
[database/README.md](../database/README.md).

| Migration | What it does |
|---|---|
| `001_initial_schema.sql` | The nine original tables (from the MongoDB → MySQL migration) |
| `002_user_links_and_emergency_workflow.sql` | Links records to accounts, extends the emergency workflow (assignment, *In Progress*, *Cancelled*), adds `emergency_updates` and `event_participants`, and indexes for the admin filters |

## Relationships

```text
users ─┬─< emergencies.user_id               ON DELETE SET NULL   (requester)
       ├─< blood_donors.user_id              ON DELETE SET NULL
       ├─< food_donations.user_id            ON DELETE SET NULL
       ├─── volunteers.user_id (UNIQUE)      ON DELETE SET NULL   (one volunteer profile per account)
       ├─< event_participants.user_id        ON DELETE CASCADE
       └─< emergency_updates.actor_user_id   ON DELETE SET NULL
volunteers ─┬─< emergencies.assigned_volunteer_id    ON DELETE SET NULL
            └─< emergency_updates.volunteer_id       ON DELETE SET NULL
events ─< event_participants.event_id                ON DELETE CASCADE
emergencies ─< emergency_updates.emergency_id        ON DELETE CASCADE
hospitals, ambulances                                (independent)
```

All foreign keys use `ON UPDATE CASCADE`. Deleting an account therefore keeps the
person's requests and registrations (unlinked) and removes only their event
participations; the API also corrects `events.participants` in the same transaction.

## Tables

Every main table has `id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY`,
`created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP` and
`updated_at TIMESTAMP ... ON UPDATE CURRENT_TIMESTAMP`, with an index on `created_at`.

| Table | Columns (besides id / timestamps) | Constraints and notes |
|---|---|---|
| `users` | `name`, `email`, `password`, `role` | `email` UNIQUE; `password` is a bcrypt hash (cost 10), never returned by the API; `role` ENUM(`user`, `admin`) default `user`; index on `role` |
| `emergencies` | `user_id`, `assigned_volunteer_id`, `name`, `emergency_type`, `location`, `phone`, `description`, `status`, `assigned_at`, `resolved_at` | `status` ENUM(`Pending`, `Accepted`, `In Progress`, `Resolved`, `Cancelled`) default `Pending`; `resolved_at` is set when the request is marked Resolved (cancellations are dated by their `emergency_updates` row); indexes on `phone`, `status`, `(status, created_at)`, `emergency_type`, `assigned_volunteer_id` |
| `emergency_updates` | `emergency_id`, `action`, `from_status`, `to_status`, `volunteer_id`, `volunteer_name`, `actor_user_id`, `actor_name`, `actor_role`, `note`, `created_at` | Audit trail. `action` ∈ created, status_changed, volunteer_assigned, volunteer_unassigned; `actor_role` ∈ admin, volunteer, requester, public. Names are snapshots, so history stays readable after deletions |
| `volunteers` | `user_id`, `name`, `email`, `phone`, `address`, `skills`, `location`, `availability` | `user_id` UNIQUE (NULLs allowed for signed-out registrations); index on `availability` |
| `blood_donors` | `user_id`, `name`, `phone`, `age`, `blood_group`, `location`, `available` | `phone` UNIQUE; index on `blood_group` |
| `food_donations` | `user_id`, `name` (donor), `phone`, `food_type`, `quantity`, `location`, `available` | `quantity` is free text ("20 plates") |
| `events` | `title`, `description`, `date`, `location`, `organizer`, `participants`, `status` | `date` is `DATE` (returned as `YYYY-MM-DD`); `participants` is the displayed total |
| `event_participants` | `event_id`, `user_id`, `joined_at` | PRIMARY KEY (`event_id`, `user_id`): a member can join an event once |
| `hospitals` | `name`, `location`, `phone`, `address`, `services`, `emergency_available` | index on `emergency_available` |
| `ambulances` | `name` (driver), `phone`, `vehicle_number`, `location`, `status` | `status` default `available`; index on `status` |
| `schema_migrations` | `version`, `applied_at` | Bookkeeping for the migration runner |

Notes:

- `events.participants` also contains joins recorded before migration 002 (when joining
  was anonymous), so it can be higher than the number of rows in `event_participants`.
- `ambulances.status` keeps the case it was sent with (`Busy` or `busy`); filters compare
  it case-insensitively.
- `created_at`/`updated_at` are `TIMESTAMP` columns (range ends in 2038); see
  [POST_MIGRATION_TODO.md](../POST_MIGRATION_TODO.md).

## Migration 002 — how it was applied

Migration 002 is forward-only and non-destructive: every new column is nullable, the
status ENUM is a superset of the old one, and nothing is dropped or deleted. Existing
emergencies received a "created" history entry (note: *Recorded before the workflow was
introduced*).

It was verified before touching the development database:

1. on a fresh throwaway database (001 + 002 from scratch);
2. on a throwaway copy with existing data (001, data, then 002), checking that rows were
   preserved, the foreign-key behaviours (SET NULL / CASCADE) and that invalid ENUM values
   are rejected;
3. then the development database was backed up with `mysqldump` and migrated.

The development seed `002_workflow_demo.sql` links the demo volunteer to the demo member
account (so the volunteer pages can be tried) and makes sure every emergency has a
"created" history entry. It is idempotent.

## Backup and recovery

MySQL commits DDL immediately, so a migration cannot be rolled back as a unit. **Back up
before every migration**:

```bash
mysqldump -u <user> -p --single-transaction --routines lifepro > lifepro-backup.sql
```

Restore into an empty database:

```bash
mysql -u <user> -p lifepro < lifepro-backup.sql
```

To undo migration 002 by hand (only if really needed, after a backup): drop
`event_participants` and `emergency_updates`, drop the added foreign keys and columns,
and restore the three-value ENUM only if no row uses `In Progress` or `Cancelled`, then
delete its row from `schema_migrations`.

Production: enable automated backups at the database host and test a restore regularly.

## History: MongoDB → MySQL

Earlier versions stored data in MongoDB through Mongoose. The project was standardised on
MySQL only: the unused Mongoose models, the `mongoose` dependency and `MONGO_URI` were
removed, and SQL migrations and seeds were added. **No MongoDB data was migrated**: the
project contained model definitions but no export or dump of real MongoDB records. If an
old MongoDB instance still holds data, follow the non-destructive procedure in
[database/README.md → Old MongoDB data](../database/README.md#old-mongodb-data).

| MongoDB model | MySQL table | Renamed fields (API name → column) |
|---|---|---|
| `User` | `users` | — |
| `BloodDonor` | `blood_donors` | `bloodGroup` → `blood_group` |
| `FoodDonation` | `food_donations` | `donorName` → `name`, `foodType` → `food_type` |
| `Volunteer` | `volunteers` | — (adds `address`) |
| `Event` | `events` | `eventName` → `title`; `date` String → DATE |
| `Hospital` | `hospitals` | `hospitalName` → `name`, `emergencyAvailable` → `emergency_available` |
| `Ambulance` | `ambulances` | `driverName` → `name`, `vehicleNumber` → `vehicle_number`, `availability` → `status` |
| `Emergency` | `emergencies` | `userId` → `user_id`, `emergencyType` → `emergency_type` |

The API still accepts the old camelCase request field names.
