-- =====================================================================
-- LifeLink Pro — 001 Initial schema
-- ---------------------------------------------------------------------
-- Creates every table used by the Express API (server/).
--
-- Column names follow the SQL queries already used by the backend
-- (e.g. events.title, hospitals.name, ambulances.status). Fields that
-- existed in the old MongoDB/Mongoose models and are sent by the React
-- frontend (e.g. events.organizer, hospitals.services) are kept as
-- extra nullable columns so that no submitted data is lost.
--
-- NOT NULL is used for the fields the API validates as required; other
-- fields are nullable so existing API clients keep working.
--
-- Safe to re-run: every statement uses CREATE TABLE IF NOT EXISTS.
-- Tables are created in foreign-key order (users before emergencies).
--
-- Run with:  cd server && npm run sql:migrate
-- =====================================================================


-- ---------------------------------------------------------------------
-- users — accounts for login/registration (bcrypt-hashed passwords)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id          BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
    name        VARCHAR(150)     NOT NULL,
    email       VARCHAR(255)     NOT NULL,
    password    VARCHAR(255)     NOT NULL COMMENT 'bcrypt hash, never plain text',
    role        ENUM('user', 'admin') NOT NULL DEFAULT 'user',
    created_at  TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_users_email (email),
    KEY idx_users_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ---------------------------------------------------------------------
-- blood_donors — POST /api/blood/register
-- API field bloodGroup  <->  column blood_group
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS blood_donors (
    id           BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
    name         VARCHAR(150)     NOT NULL,
    phone        VARCHAR(30)      NOT NULL,
    age          TINYINT UNSIGNED NULL,
    blood_group  VARCHAR(5)       NOT NULL COMMENT 'A+, A-, B+, B-, AB+, AB-, O+, O-',
    location     VARCHAR(255)     NOT NULL,
    available    BOOLEAN          NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    -- The API already rejects a second registration with the same phone
    UNIQUE KEY uq_blood_donors_phone (phone),
    KEY idx_blood_donors_blood_group (blood_group),
    KEY idx_blood_donors_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ---------------------------------------------------------------------
-- food_donations — POST /api/food/donate
-- API fields donorName / foodType  <->  columns name / food_type
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS food_donations (
    id          BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
    name        VARCHAR(150)     NOT NULL COMMENT 'donor name (API: donorName)',
    phone       VARCHAR(30)      NOT NULL,
    food_type   VARCHAR(100)     NOT NULL COMMENT 'API: foodType',
    quantity    VARCHAR(100)     NOT NULL COMMENT 'free text, e.g. "20 plates"',
    location    VARCHAR(255)     NOT NULL COMMENT 'pickup location',
    available   BOOLEAN          NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_food_donations_phone (phone),
    KEY idx_food_donations_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ---------------------------------------------------------------------
-- volunteers — POST /api/volunteer/register
-- address is accepted by the API; skills/location/availability are
-- sent by the frontend form.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS volunteers (
    id            BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
    name          VARCHAR(150)     NOT NULL,
    email         VARCHAR(255)     NULL,
    phone         VARCHAR(30)      NULL,
    address       VARCHAR(255)     NULL,
    skills        VARCHAR(255)     NULL,
    location      VARCHAR(255)     NULL,
    availability  VARCHAR(50)      NULL COMMENT 'Full Time, Part Time, Weekends',
    created_at    TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_volunteers_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ---------------------------------------------------------------------
-- events — POST /api/events/create, PUT /api/events/join/:id
-- API field title (or eventName from the frontend)  <->  column title
-- participants is incremented by the join endpoint.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS events (
    id            BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
    title         VARCHAR(200)     NOT NULL COMMENT 'API: title or eventName',
    description   TEXT             NULL,
    `date`        DATE             NULL,
    location      VARCHAR(255)     NULL,
    organizer     VARCHAR(150)     NULL,
    participants  INT UNSIGNED     NOT NULL DEFAULT 0,
    status        VARCHAR(20)      NOT NULL DEFAULT 'Active',
    created_at    TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_events_date (`date`),
    KEY idx_events_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ---------------------------------------------------------------------
-- hospitals — POST /api/hospital/register
-- API field name (or hospitalName from the frontend)  <->  column name
-- location is accepted by the API; address/services/emergencyAvailable
-- are sent by the frontend form.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hospitals (
    id                   BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
    name                 VARCHAR(200)     NOT NULL COMMENT 'API: name or hospitalName',
    location             VARCHAR(255)     NULL,
    phone                VARCHAR(30)      NULL,
    address              VARCHAR(255)     NULL,
    services             TEXT             NULL,
    emergency_available  VARCHAR(30)      NULL COMMENT 'API: emergencyAvailable (Available / Not Available)',
    created_at           TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_hospitals_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ---------------------------------------------------------------------
-- ambulances — POST /api/ambulance/register
-- API fields name (or driverName) and status (or availability)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ambulances (
    id              BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
    name            VARCHAR(150)     NOT NULL COMMENT 'driver name (API: name or driverName)',
    phone           VARCHAR(30)      NOT NULL,
    vehicle_number  VARCHAR(30)      NULL COMMENT 'API: vehicleNumber',
    location        VARCHAR(255)     NOT NULL,
    status          VARCHAR(20)      NOT NULL DEFAULT 'available' COMMENT 'API: status or availability',
    created_at      TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_ambulances_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ---------------------------------------------------------------------
-- emergencies — POST /api/emergency
-- user_id replaces the Mongoose userId reference to User. It is
-- optional: the current emergency endpoint is public and does not set
-- it. Deleting a user keeps their emergencies (user_id becomes NULL).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS emergencies (
    id              BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
    user_id         BIGINT UNSIGNED  NULL,
    name            VARCHAR(150)     NOT NULL,
    emergency_type  VARCHAR(50)      NULL COMMENT 'API: emergencyType (Medical, Accident, Fire, Other)',
    location        VARCHAR(255)     NOT NULL,
    phone           VARCHAR(30)      NOT NULL,
    description     TEXT             NULL,
    status          ENUM('Pending', 'Accepted', 'Resolved') NOT NULL DEFAULT 'Pending',
    created_at      TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_emergencies_user_id (user_id),
    KEY idx_emergencies_phone (phone),
    KEY idx_emergencies_status (status),
    KEY idx_emergencies_created_at (created_at),

    CONSTRAINT fk_emergencies_user
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
