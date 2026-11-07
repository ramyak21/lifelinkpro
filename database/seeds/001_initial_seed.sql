-- =====================================================================
-- LifeLink Pro — 001 Initial seed
-- ---------------------------------------------------------------------
-- !!! DEVELOPMENT / DEMO DATA ONLY — DO NOT RUN IN PRODUCTION !!!
--
-- Every record below is fake and clearly marked "Demo". The main reason
-- this seed exists is the admin account: the API's /register endpoint
-- always creates role = 'user', so there is no other way to get an
-- admin login for the Admin Dashboard on a fresh database.
--
-- Demo logins (passwords are stored as bcrypt hashes, cost 10):
--   Admin : admin@lifelinkpro.test / Admin@123   (role = admin)
--   User  : user@lifelinkpro.test  / User@123    (role = user)
--
-- Safe to re-run: each INSERT only runs when the demo row is missing,
-- so running the seed twice never creates duplicates.
--
-- Run with:  cd server && npm run sql:seed   (after npm run sql:migrate)
-- =====================================================================


-- ---------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------
INSERT INTO users (name, email, password, role)
SELECT 'Demo Admin', 'admin@lifelinkpro.test',
       '$2b$10$2oXVKmTDHMABWcTH7tsSH.1.EoMb6dksiXj6czs5qS3R9Jg6sYs3y', 'admin'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@lifelinkpro.test');

INSERT INTO users (name, email, password, role)
SELECT 'Demo User', 'user@lifelinkpro.test',
       '$2b$10$E8vVcAcAzzXuijx7DGp4HOf/b4ZUqPwiBykpq4HXPd/pijNyuGdKG', 'user'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'user@lifelinkpro.test');


-- ---------------------------------------------------------------------
-- blood_donors
-- ---------------------------------------------------------------------
INSERT INTO blood_donors (name, phone, age, blood_group, location)
SELECT 'Demo Donor A', '9000000001', 28, 'O+', 'Demo City'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM blood_donors WHERE phone = '9000000001');

INSERT INTO blood_donors (name, phone, age, blood_group, location)
SELECT 'Demo Donor B', '9000000002', 35, 'AB-', 'Demo City'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM blood_donors WHERE phone = '9000000002');


-- ---------------------------------------------------------------------
-- food_donations
-- ---------------------------------------------------------------------
INSERT INTO food_donations (name, phone, food_type, quantity, location)
SELECT 'Demo Food Donor', '9000000003', 'Cooked meals', '20 plates', 'Demo Community Hall'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM food_donations WHERE name = 'Demo Food Donor' AND phone = '9000000003'
);


-- ---------------------------------------------------------------------
-- volunteers
-- ---------------------------------------------------------------------
INSERT INTO volunteers (name, email, phone, skills, location, availability)
SELECT 'Demo Volunteer', 'volunteer@lifelinkpro.test', '9000000004',
       'First aid', 'Demo City', 'Weekends'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM volunteers WHERE email = 'volunteer@lifelinkpro.test');


-- ---------------------------------------------------------------------
-- events
-- ---------------------------------------------------------------------
INSERT INTO events (title, description, `date`, location, organizer)
SELECT 'Demo Blood Donation Camp', 'Demo community blood donation drive.',
       '2026-11-15', 'Demo Community Hall', 'LifeLink Pro Demo Team'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM events WHERE title = 'Demo Blood Donation Camp');


-- ---------------------------------------------------------------------
-- hospitals
-- ---------------------------------------------------------------------
INSERT INTO hospitals (name, location, phone, address, services, emergency_available)
SELECT 'Demo City Hospital', 'Demo City', '9000000005', '1 Demo Street, Demo City',
       'Emergency, Cardiology, Blood bank', 'Available'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM hospitals WHERE name = 'Demo City Hospital');


-- ---------------------------------------------------------------------
-- ambulances
-- ---------------------------------------------------------------------
INSERT INTO ambulances (name, phone, vehicle_number, location, status)
SELECT 'Demo Driver', '9000000006', 'DEMO-0001', 'Demo City', 'available'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM ambulances WHERE vehicle_number = 'DEMO-0001');


-- ---------------------------------------------------------------------
-- emergencies
-- ---------------------------------------------------------------------
INSERT INTO emergencies (name, emergency_type, location, phone, description, status)
SELECT 'Demo Requester', 'Medical', 'Demo City', '9000000007',
       'Demo emergency request for testing.', 'Pending'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM emergencies WHERE name = 'Demo Requester' AND phone = '9000000007'
);
