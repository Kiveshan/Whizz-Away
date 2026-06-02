-- Migration 007: Add per-company user and truck limit overrides
-- NULL means "use the plan default from subscription_plans".
-- Safe to re-run: ADD COLUMN IF NOT EXISTS.

ALTER TABLE usertable
  ADD COLUMN IF NOT EXISTS max_users_override  SMALLINT NULL,
  ADD COLUMN IF NOT EXISTS max_trucks_override SMALLINT NULL;

-- VERIFY:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'usertable'
--   AND column_name IN ('max_users_override', 'max_trucks_override');
-- Expected: 2 rows, data_type = smallint, is_nullable = YES
