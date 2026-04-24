-- Migration 001: Add subscription fields to usertable
-- Safe to re-run: all statements use IF NOT EXISTS / OR REPLACE

ALTER TABLE usertable
  ADD COLUMN IF NOT EXISTS subscription_tier    VARCHAR(20)  NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS subscription_status  VARCHAR(20)  NOT NULL DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS trial_ends_at        TIMESTAMP    NULL,
  ADD COLUMN IF NOT EXISTS setup_fee_paid       BOOLEAN      NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS monthly_billing_anchor SMALLINT   NULL,        -- day-of-month 1-28
  ADD COLUMN IF NOT EXISTS plan_approved_by     VARCHAR(100) NULL,        -- admin email
  ADD COLUMN IF NOT EXISTS plan_approved_at     TIMESTAMP    NULL,
  ADD COLUMN IF NOT EXISTS plan_notes           TEXT         NULL,        -- admin free-text / requested plan from signup
  ADD COLUMN IF NOT EXISTS created_at           TIMESTAMP    NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at           TIMESTAMP    NOT NULL DEFAULT NOW();

-- Keep updated_at current on every UPDATE
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS update_usertable_updated_at ON usertable;
CREATE TRIGGER update_usertable_updated_at
  BEFORE UPDATE ON usertable
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- VERIFY:
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'usertable'
--   AND column_name IN (
--     'subscription_tier','subscription_status','trial_ends_at',
--     'setup_fee_paid','monthly_billing_anchor','plan_approved_by',
--     'plan_approved_at','plan_notes','created_at','updated_at'
--   );
-- Expected: 10 rows
