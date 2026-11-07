-- =====================================================================
-- LifeLink Pro — 002 User links, event participation, emergency workflow
-- ---------------------------------------------------------------------
-- Forward-only and non-destructive:
--   * every new column is NULLable, so existing rows stay valid
--   * the emergencies.status ENUM is a SUPERSET of the old one
--     (Pending, Accepted, Resolved keep their meaning and their rows)
--   * no column or table is dropped, no data is deleted
--
-- Recovery: MySQL commits DDL immediately, so this file cannot be rolled
-- back as a unit. Take a backup first (mysqldump, see README). To undo
-- by hand: drop event_participants and emergency_updates, drop the added
-- foreign keys/columns, and restore the 3-value ENUM only if no row uses
-- 'In Progress' or 'Cancelled'.
--
-- Run with:  npm run sql:migrate
-- =====================================================================


-- ---------------------------------------------------------------------
-- Link submissions to the signed-in account that made them (optional)
-- Deleting the account keeps the record and sets user_id to NULL.
-- ---------------------------------------------------------------------
ALTER TABLE blood_donors
    ADD COLUMN user_id BIGINT UNSIGNED NULL AFTER id,
    ADD KEY idx_blood_donors_user_id (user_id),
    ADD CONSTRAINT fk_blood_donors_user
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE food_donations
    ADD COLUMN user_id BIGINT UNSIGNED NULL AFTER id,
    ADD KEY idx_food_donations_user_id (user_id),
    ADD CONSTRAINT fk_food_donations_user
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE SET NULL ON UPDATE CASCADE;

-- One volunteer profile per account (NULLs — anonymous registrations — are not limited)
ALTER TABLE volunteers
    ADD COLUMN user_id BIGINT UNSIGNED NULL AFTER id,
    ADD UNIQUE KEY uq_volunteers_user_id (user_id),
    ADD KEY idx_volunteers_availability (availability),
    ADD CONSTRAINT fk_volunteers_user
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE SET NULL ON UPDATE CASCADE;


-- ---------------------------------------------------------------------
-- Emergency workflow: extended status model + volunteer assignment
--   Pending -> Accepted -> In Progress -> Resolved
--   Pending / Accepted / In Progress -> Cancelled
-- ---------------------------------------------------------------------
ALTER TABLE emergencies
    MODIFY status ENUM('Pending', 'Accepted', 'In Progress', 'Resolved', 'Cancelled') NOT NULL DEFAULT 'Pending',
    ADD COLUMN assigned_volunteer_id BIGINT UNSIGNED NULL AFTER user_id,
    ADD COLUMN assigned_at TIMESTAMP NULL DEFAULT NULL AFTER status,
    ADD COLUMN resolved_at TIMESTAMP NULL DEFAULT NULL AFTER assigned_at,
    ADD KEY idx_emergencies_assigned_volunteer (assigned_volunteer_id),
    ADD KEY idx_emergencies_type (emergency_type),
    ADD KEY idx_emergencies_status_created (status, created_at),
    ADD CONSTRAINT fk_emergencies_volunteer
        FOREIGN KEY (assigned_volunteer_id) REFERENCES volunteers (id)
        ON DELETE SET NULL ON UPDATE CASCADE;


-- ---------------------------------------------------------------------
-- emergency_updates — audit trail of every status change and assignment
-- actor_name / volunteer_name are snapshots, so the history still reads
-- correctly after the account or volunteer record is deleted.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS emergency_updates (
    id              BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
    emergency_id    BIGINT UNSIGNED  NOT NULL,
    action          VARCHAR(30)      NOT NULL COMMENT 'created, status_changed, volunteer_assigned, volunteer_unassigned',
    from_status     VARCHAR(20)      NULL,
    to_status       VARCHAR(20)      NULL,
    volunteer_id    BIGINT UNSIGNED  NULL,
    volunteer_name  VARCHAR(150)     NULL,
    actor_user_id   BIGINT UNSIGNED  NULL,
    actor_name      VARCHAR(150)     NULL,
    actor_role      VARCHAR(20)      NULL COMMENT 'admin, volunteer, requester, public',
    note            VARCHAR(500)     NULL,
    created_at      TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_emergency_updates_emergency (emergency_id, created_at),
    KEY idx_emergency_updates_actor (actor_user_id),
    KEY idx_emergency_updates_volunteer (volunteer_id),

    -- history belongs to its request: deleting the request deletes its history
    CONSTRAINT fk_emergency_updates_emergency
        FOREIGN KEY (emergency_id) REFERENCES emergencies (id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_emergency_updates_actor
        FOREIGN KEY (actor_user_id) REFERENCES users (id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_emergency_updates_volunteer
        FOREIGN KEY (volunteer_id) REFERENCES volunteers (id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Existing requests get a "created" history entry (safe to run once; the
-- migration runner records this file so it is never applied twice)
INSERT INTO emergency_updates (emergency_id, action, to_status, actor_role, note, created_at)
SELECT id, 'created', status, 'public', 'Recorded before the workflow was introduced', created_at
FROM emergencies;


-- ---------------------------------------------------------------------
-- event_participants — who joined which event (signed-in users)
-- events.participants stays the displayed total; it also includes the
-- anonymous joins recorded before this migration.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS event_participants (
    event_id    BIGINT UNSIGNED  NOT NULL,
    user_id     BIGINT UNSIGNED  NOT NULL,
    joined_at   TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (event_id, user_id),
    KEY idx_event_participants_user (user_id),

    CONSTRAINT fk_event_participants_event
        FOREIGN KEY (event_id) REFERENCES events (id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_event_participants_user
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ---------------------------------------------------------------------
-- Indexes for the new admin filters
-- ---------------------------------------------------------------------
ALTER TABLE users ADD KEY idx_users_role (role);
ALTER TABLE ambulances ADD KEY idx_ambulances_status (status);
ALTER TABLE hospitals ADD KEY idx_hospitals_emergency (emergency_available);
