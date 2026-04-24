-- Migration 003: Create subscription catalogue, feature gate, usage, and audit tables
-- Safe to re-run: all statements use IF NOT EXISTS.

-- Plan catalogue
CREATE TABLE IF NOT EXISTS subscription_plans (
  plan_key        VARCHAR(20)    PRIMARY KEY,
  display_name    VARCHAR(50)    NOT NULL,
  setup_fee_zar   NUMERIC(10,2)  NOT NULL,
  monthly_fee_zar NUMERIC(10,2)  NOT NULL,
  max_users       SMALLINT       NOT NULL,  -- 999 = unlimited
  max_trucks      SMALLINT       NOT NULL,  -- 999 = unlimited
  overage_user    NUMERIC(10,2)  NOT NULL DEFAULT 300,
  overage_truck   NUMERIC(10,2)  NOT NULL DEFAULT 250,
  sort_order      SMALLINT       NOT NULL DEFAULT 0,
  is_active       BOOLEAN        NOT NULL DEFAULT TRUE
);

-- Feature gating per plan
CREATE TABLE IF NOT EXISTS plan_features (
  id          SERIAL       PRIMARY KEY,
  plan_key    VARCHAR(20)  NOT NULL REFERENCES subscription_plans(plan_key),
  feature_key VARCHAR(50)  NOT NULL,
  UNIQUE(plan_key, feature_key)
);

-- Monthly usage snapshot per company
CREATE TABLE IF NOT EXISTS company_usage (
  id               SERIAL       PRIMARY KEY,
  company_reg_num  VARCHAR(20)  NOT NULL,
  snapshot_month   DATE         NOT NULL,  -- first day of month
  user_count       SMALLINT     NOT NULL DEFAULT 0,
  truck_count      SMALLINT     NOT NULL DEFAULT 0,
  overage_users    SMALLINT     NOT NULL DEFAULT 0,
  overage_trucks   SMALLINT     NOT NULL DEFAULT 0,
  overage_amount   NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at       TIMESTAMP    NOT NULL DEFAULT NOW(),
  UNIQUE(company_reg_num, snapshot_month)
);

-- Full audit log of all billing actions
-- event_type values:
--   plan_assigned, plan_upgraded, plan_downgraded, trial_started, trial_expired,
--   account_suspended, account_reactivated, setup_fee_recorded, monthly_fee_recorded
CREATE TABLE IF NOT EXISTS billing_events (
  id               SERIAL        PRIMARY KEY,
  company_reg_num  VARCHAR(20)   NOT NULL,
  event_type       VARCHAR(50)   NOT NULL,
  old_value        VARCHAR(100)  NULL,
  new_value        VARCHAR(100)  NULL,
  performed_by     VARCHAR(100)  NULL,  -- admin email or 'system'
  notes            TEXT          NULL,
  created_at       TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_events_company ON billing_events(company_reg_num);
CREATE INDEX IF NOT EXISTS idx_billing_events_type    ON billing_events(event_type);

-- VERIFY:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
--   AND table_name IN ('subscription_plans','plan_features','company_usage','billing_events');
-- Expected: 4 rows
