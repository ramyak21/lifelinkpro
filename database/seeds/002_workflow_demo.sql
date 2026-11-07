-- =====================================================================
-- LifeLink Pro — 002 demo data for the workflow added in migration 002
-- DEVELOPMENT / DEMO ONLY (npm run sql:seed refuses when NODE_ENV=production)
-- Idempotent: every statement only changes rows that still need it.
-- =====================================================================

-- The demo member (user@lifelinkpro.test) owns the demo volunteer profile,
-- so "My assignments" in the user portal can be tried with the demo login.
UPDATE volunteers
SET user_id = (SELECT id FROM users WHERE email = 'user@lifelinkpro.test')
WHERE email = 'volunteer@lifelinkpro.test'
  AND user_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM (SELECT user_id FROM volunteers) v
                  WHERE v.user_id = (SELECT id FROM users WHERE email = 'user@lifelinkpro.test'));

-- Every request has a "created" history entry (seeded requests are inserted
-- after migration 002 on a fresh install, so they would otherwise have none)
INSERT INTO emergency_updates (emergency_id, action, to_status, actor_role, note, created_at)
SELECT e.id, 'created', 'Pending', 'public', 'Demo request', e.created_at
FROM emergencies e
WHERE NOT EXISTS (SELECT 1 FROM emergency_updates u WHERE u.emergency_id = e.id);
