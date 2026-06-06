-- =============================================================================
-- CLIENT → SAAS MIGRATION
-- Company reg num: 2015/302583/07
--
-- Applies migrations 001-007 and backfills company_reg_num on every table.
-- Run this against the client's existing single-tenant PostgreSQL database.
--
-- Order of operations:
--   Phase 1 — Schema changes  (ADD COLUMN, new tables, triggers)
--   Phase 2 — Backfill        (set company_reg_num = '2015/302583/07')
--   Phase 3 — Verify          (every count must be 0 — review before Phase 4)
--   Phase 4 — NOT NULL        (enforce constraint now that nulls are gone)
--   Phase 5 — Grandfather     (set subscription to enterprise/active)
-- =============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 1 — SCHEMA CHANGES
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Migration 001: subscription fields on usertable ──────────────────────────
ALTER TABLE usertable
  ADD COLUMN IF NOT EXISTS subscription_tier      VARCHAR(20)  NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS subscription_status    VARCHAR(20)  NOT NULL DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS trial_ends_at          TIMESTAMP    NULL,
  ADD COLUMN IF NOT EXISTS setup_fee_paid         BOOLEAN      NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS monthly_billing_anchor SMALLINT     NULL,
  ADD COLUMN IF NOT EXISTS plan_approved_by       VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS plan_approved_at       TIMESTAMP    NULL,
  ADD COLUMN IF NOT EXISTS plan_notes             TEXT         NULL,
  ADD COLUMN IF NOT EXISTS created_at             TIMESTAMP    NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at             TIMESTAMP    NOT NULL DEFAULT NOW();

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

-- ── Migration 007: limit overrides (included here before NOT NULL phase) ──────
ALTER TABLE usertable
  ADD COLUMN IF NOT EXISTS max_users_override  SMALLINT NULL,
  ADD COLUMN IF NOT EXISTS max_trucks_override SMALLINT NULL;

-- ── Migration 002: company_reg_num on asset tables ───────────────────────────
ALTER TABLE m5_trucks   ADD COLUMN IF NOT EXISTS company_reg_num VARCHAR(20) NULL;
ALTER TABLE m5_trailers ADD COLUMN IF NOT EXISTS company_reg_num VARCHAR(20) NULL;
ALTER TABLE m5_client   ADD COLUMN IF NOT EXISTS company_reg_num VARCHAR(20) NULL;

CREATE INDEX IF NOT EXISTS idx_trucks_company_reg   ON m5_trucks(company_reg_num);
CREATE INDEX IF NOT EXISTS idx_trailers_company_reg ON m5_trailers(company_reg_num);
CREATE INDEX IF NOT EXISTS idx_client_company_reg   ON m5_client(company_reg_num);

-- ── Migration 003: subscription catalogue + usage tables ─────────────────────
CREATE TABLE IF NOT EXISTS subscription_plans (
  plan_key        VARCHAR(20)    PRIMARY KEY,
  display_name    VARCHAR(50)    NOT NULL,
  setup_fee_zar   NUMERIC(10,2)  NOT NULL,
  monthly_fee_zar NUMERIC(10,2)  NOT NULL,
  max_users       SMALLINT       NOT NULL,
  max_trucks      SMALLINT       NOT NULL,
  overage_user    NUMERIC(10,2)  NOT NULL DEFAULT 300,
  overage_truck   NUMERIC(10,2)  NOT NULL DEFAULT 250,
  sort_order      SMALLINT       NOT NULL DEFAULT 0,
  is_active       BOOLEAN        NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS plan_features (
  id          SERIAL       PRIMARY KEY,
  plan_key    VARCHAR(20)  NOT NULL REFERENCES subscription_plans(plan_key),
  feature_key VARCHAR(50)  NOT NULL,
  UNIQUE(plan_key, feature_key)
);

CREATE TABLE IF NOT EXISTS company_usage (
  id               SERIAL        PRIMARY KEY,
  company_reg_num  VARCHAR(20)   NOT NULL,
  snapshot_month   DATE          NOT NULL,
  user_count       SMALLINT      NOT NULL DEFAULT 0,
  truck_count      SMALLINT      NOT NULL DEFAULT 0,
  overage_users    SMALLINT      NOT NULL DEFAULT 0,
  overage_trucks   SMALLINT      NOT NULL DEFAULT 0,
  overage_amount   NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at       TIMESTAMP     NOT NULL DEFAULT NOW(),
  UNIQUE(company_reg_num, snapshot_month)
);

CREATE TABLE IF NOT EXISTS billing_events (
  id               SERIAL        PRIMARY KEY,
  company_reg_num  VARCHAR(20)   NOT NULL,
  event_type       VARCHAR(50)   NOT NULL,
  old_value        VARCHAR(100)  NULL,
  new_value        VARCHAR(100)  NULL,
  performed_by     VARCHAR(100)  NULL,
  notes            TEXT          NULL,
  created_at       TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_events_company ON billing_events(company_reg_num);
CREATE INDEX IF NOT EXISTS idx_billing_events_type    ON billing_events(event_type);

-- ── Migration 004: seed plan catalogue ───────────────────────────────────────
INSERT INTO subscription_plans (plan_key, display_name, setup_fee_zar, monthly_fee_zar, max_users, max_trucks, sort_order)
VALUES
  ('lite',         'Lite',         2500,  2000,   2,   5, 1),
  ('professional', 'Professional', 7500,  4500,   5,  15, 2),
  ('growth',       'Growth',      15000,  7500,  15,  40, 3),
  ('enterprise',   'Enterprise',  25000, 10500, 999, 999, 4)
ON CONFLICT (plan_key) DO NOTHING;

INSERT INTO plan_features (plan_key, feature_key) VALUES
  ('lite', 'instructions'), ('lite', 'assignment'), ('lite', 'invoice'),
  ('lite', 'statements'),   ('lite', 'manage'),
  ('professional', 'instructions'), ('professional', 'assignment'), ('professional', 'invoice'),
  ('professional', 'statements'),   ('professional', 'manage'),    ('professional', 'addons'),
  ('professional', 'analytics'),    ('professional', 'reports'),
  ('growth', 'instructions'), ('growth', 'assignment'), ('growth', 'invoice'),
  ('growth', 'statements'),   ('growth', 'manage'),    ('growth', 'addons'),
  ('growth', 'analytics'),    ('growth', 'reports'),   ('growth', 'payroll'),
  ('growth', 'biometric'),    ('growth', 'vat'),
  ('enterprise', 'instructions'), ('enterprise', 'assignment'), ('enterprise', 'invoice'),
  ('enterprise', 'statements'),   ('enterprise', 'manage'),    ('enterprise', 'addons'),
  ('enterprise', 'analytics'),    ('enterprise', 'reports'),   ('enterprise', 'payroll'),
  ('enterprise', 'biometric'),    ('enterprise', 'vat'),       ('enterprise', 'creditors'),
  ('enterprise', 'priority_support')
ON CONFLICT (plan_key, feature_key) DO NOTHING;

-- ── Migration 005: company_reg_num on all remaining business tables ───────────
ALTER TABLE m1_controller              ADD COLUMN IF NOT EXISTS company_reg_num VARCHAR(20) NULL;
ALTER TABLE legs_m2                    ADD COLUMN IF NOT EXISTS company_reg_num VARCHAR(20) NULL;
ALTER TABLE container                  ADD COLUMN IF NOT EXISTS company_reg_num VARCHAR(20) NULL;
ALTER TABLE m1_controller_weight       ADD COLUMN IF NOT EXISTS company_reg_num VARCHAR(20) NULL;
ALTER TABLE invoice                    ADD COLUMN IF NOT EXISTS company_reg_num VARCHAR(20) NULL;
ALTER TABLE add_ons                    ADD COLUMN IF NOT EXISTS company_reg_num VARCHAR(20) NULL;
ALTER TABLE credit_notes               ADD COLUMN IF NOT EXISTS company_reg_num VARCHAR(20) NULL;
ALTER TABLE payment_m3                 ADD COLUMN IF NOT EXISTS company_reg_num VARCHAR(20) NULL;
ALTER TABLE statements                 ADD COLUMN IF NOT EXISTS company_reg_num VARCHAR(20) NULL;
ALTER TABLE wages                      ADD COLUMN IF NOT EXISTS company_reg_num VARCHAR(20) NULL;
ALTER TABLE expenses_m2                ADD COLUMN IF NOT EXISTS company_reg_num VARCHAR(20) NULL;
ALTER TABLE purchase_orders            ADD COLUMN IF NOT EXISTS company_reg_num VARCHAR(20) NULL;
ALTER TABLE documents                  ADD COLUMN IF NOT EXISTS company_reg_num VARCHAR(20) NULL;
ALTER TABLE suppliers                  ADD COLUMN IF NOT EXISTS company_reg_num VARCHAR(20) NULL;
ALTER TABLE subcontractor_statements   ADD COLUMN IF NOT EXISTS company_reg_num VARCHAR(20) NULL;
ALTER TABLE m5_client_rate             ADD COLUMN IF NOT EXISTS company_reg_num VARCHAR(20) NULL;
ALTER TABLE m5_driver_rate             ADD COLUMN IF NOT EXISTS company_reg_num VARCHAR(20) NULL;
ALTER TABLE aging_analysis             ADD COLUMN IF NOT EXISTS company_reg_num VARCHAR(20) NULL;
ALTER TABLE audit_log                  ADD COLUMN IF NOT EXISTS company_reg_num VARCHAR(20) NULL;
ALTER TABLE base_salary_history        ADD COLUMN IF NOT EXISTS company_reg_num VARCHAR(20) NULL;
ALTER TABLE employee_deduction_history ADD COLUMN IF NOT EXISTS company_reg_num VARCHAR(20) NULL;

CREATE INDEX IF NOT EXISTS idx_m1_controller_company         ON m1_controller(company_reg_num);
CREATE INDEX IF NOT EXISTS idx_legs_m2_company               ON legs_m2(company_reg_num);
CREATE INDEX IF NOT EXISTS idx_container_company             ON container(company_reg_num);
CREATE INDEX IF NOT EXISTS idx_m1_weight_company             ON m1_controller_weight(company_reg_num);
CREATE INDEX IF NOT EXISTS idx_invoice_company               ON invoice(company_reg_num);
CREATE INDEX IF NOT EXISTS idx_add_ons_company               ON add_ons(company_reg_num);
CREATE INDEX IF NOT EXISTS idx_credit_notes_company          ON credit_notes(company_reg_num);
CREATE INDEX IF NOT EXISTS idx_payment_m3_company            ON payment_m3(company_reg_num);
CREATE INDEX IF NOT EXISTS idx_statements_company            ON statements(company_reg_num);
CREATE INDEX IF NOT EXISTS idx_wages_company                 ON wages(company_reg_num);
CREATE INDEX IF NOT EXISTS idx_expenses_m2_company           ON expenses_m2(company_reg_num);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_company       ON purchase_orders(company_reg_num);
CREATE INDEX IF NOT EXISTS idx_documents_company             ON documents(company_reg_num);
CREATE INDEX IF NOT EXISTS idx_suppliers_company             ON suppliers(company_reg_num);
CREATE INDEX IF NOT EXISTS idx_subcontractor_stmts_company   ON subcontractor_statements(company_reg_num);
CREATE INDEX IF NOT EXISTS idx_m5_client_rate_company        ON m5_client_rate(company_reg_num);
CREATE INDEX IF NOT EXISTS idx_m5_driver_rate_company        ON m5_driver_rate(company_reg_num);
CREATE INDEX IF NOT EXISTS idx_aging_analysis_company        ON aging_analysis(company_reg_num);
CREATE INDEX IF NOT EXISTS idx_audit_log_company             ON audit_log(company_reg_num);
CREATE INDEX IF NOT EXISTS idx_base_salary_history_company   ON base_salary_history(company_reg_num);
CREATE INDEX IF NOT EXISTS idx_emp_deduction_history_company ON employee_deduction_history(company_reg_num);

-- ── Migration 006: add + fix expense_types.company_reg_num ───────────────────
-- ADD only if the column doesn't exist yet (original schema had no company_reg_num here)
ALTER TABLE expense_types ADD COLUMN IF NOT EXISTS company_reg_num VARCHAR(20) NULL;
-- If it was accidentally created as INTEGER, cast it:
ALTER TABLE expense_types
  ALTER COLUMN company_reg_num TYPE VARCHAR(20)
  USING company_reg_num::VARCHAR(20);


-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 2 — BACKFILL company_reg_num = '2015/302583/07'
-- ─────────────────────────────────────────────────────────────────────────────

-- usertable: ensure the company admin row is correctly tagged
UPDATE usertable
  SET company_reg_num = '2015/302583/07'
  WHERE company_reg_num IS NULL OR company_reg_num = '';

-- m5_employee: already has this column in original schema;
--   set all employees belonging to this tenant (NULL or empty means untagged)
UPDATE m5_employee
  SET company_reg_num = '2015/302583/07'
  WHERE company_reg_num IS NULL OR company_reg_num = '';

-- Asset tables (migration 002)
UPDATE m5_trucks   SET company_reg_num = '2015/302583/07' WHERE company_reg_num IS NULL;
UPDATE m5_trailers SET company_reg_num = '2015/302583/07' WHERE company_reg_num IS NULL;
UPDATE m5_client   SET company_reg_num = '2015/302583/07' WHERE company_reg_num IS NULL;

-- Business tables (migration 005)
UPDATE m1_controller              SET company_reg_num = '2015/302583/07' WHERE company_reg_num IS NULL;
UPDATE legs_m2                    SET company_reg_num = '2015/302583/07' WHERE company_reg_num IS NULL;
UPDATE container                  SET company_reg_num = '2015/302583/07' WHERE company_reg_num IS NULL;
UPDATE m1_controller_weight       SET company_reg_num = '2015/302583/07' WHERE company_reg_num IS NULL;
UPDATE invoice                    SET company_reg_num = '2015/302583/07' WHERE company_reg_num IS NULL;
UPDATE add_ons                    SET company_reg_num = '2015/302583/07' WHERE company_reg_num IS NULL;
UPDATE credit_notes               SET company_reg_num = '2015/302583/07' WHERE company_reg_num IS NULL;
UPDATE payment_m3                 SET company_reg_num = '2015/302583/07' WHERE company_reg_num IS NULL;
UPDATE statements                 SET company_reg_num = '2015/302583/07' WHERE company_reg_num IS NULL;
UPDATE wages                      SET company_reg_num = '2015/302583/07' WHERE company_reg_num IS NULL;
UPDATE expenses_m2                SET company_reg_num = '2015/302583/07' WHERE company_reg_num IS NULL;
UPDATE purchase_orders            SET company_reg_num = '2015/302583/07' WHERE company_reg_num IS NULL;
UPDATE documents                  SET company_reg_num = '2015/302583/07' WHERE company_reg_num IS NULL;
UPDATE suppliers                  SET company_reg_num = '2015/302583/07' WHERE company_reg_num IS NULL;
UPDATE subcontractor_statements   SET company_reg_num = '2015/302583/07' WHERE company_reg_num IS NULL;
UPDATE m5_client_rate             SET company_reg_num = '2015/302583/07' WHERE company_reg_num IS NULL;
UPDATE m5_driver_rate             SET company_reg_num = '2015/302583/07' WHERE company_reg_num IS NULL;
UPDATE aging_analysis             SET company_reg_num = '2015/302583/07' WHERE company_reg_num IS NULL;
UPDATE audit_log                  SET company_reg_num = '2015/302583/07' WHERE company_reg_num IS NULL;
UPDATE base_salary_history        SET company_reg_num = '2015/302583/07' WHERE company_reg_num IS NULL;
UPDATE employee_deduction_history SET company_reg_num = '2015/302583/07' WHERE company_reg_num IS NULL;

-- Expense types (migration 006)
UPDATE expense_types SET company_reg_num = '2015/302583/07' WHERE company_reg_num IS NULL;


-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 3 — VERIFY (all counts must be 0 before proceeding)
-- Run this SELECT and confirm every row shows 0:
-- ─────────────────────────────────────────────────────────────────────────────

-- SELECT 'usertable'                  AS tbl, COUNT(*) AS nulls FROM usertable                  WHERE company_reg_num IS NULL
-- UNION ALL SELECT 'm5_employee',             COUNT(*) FROM m5_employee             WHERE company_reg_num IS NULL
-- UNION ALL SELECT 'm5_trucks',               COUNT(*) FROM m5_trucks               WHERE company_reg_num IS NULL
-- UNION ALL SELECT 'm5_trailers',             COUNT(*) FROM m5_trailers             WHERE company_reg_num IS NULL
-- UNION ALL SELECT 'm5_client',               COUNT(*) FROM m5_client               WHERE company_reg_num IS NULL
-- UNION ALL SELECT 'm1_controller',           COUNT(*) FROM m1_controller           WHERE company_reg_num IS NULL
-- UNION ALL SELECT 'legs_m2',                 COUNT(*) FROM legs_m2                 WHERE company_reg_num IS NULL
-- UNION ALL SELECT 'container',               COUNT(*) FROM container               WHERE company_reg_num IS NULL
-- UNION ALL SELECT 'm1_controller_weight',    COUNT(*) FROM m1_controller_weight    WHERE company_reg_num IS NULL
-- UNION ALL SELECT 'invoice',                 COUNT(*) FROM invoice                 WHERE company_reg_num IS NULL
-- UNION ALL SELECT 'add_ons',                 COUNT(*) FROM add_ons                 WHERE company_reg_num IS NULL
-- UNION ALL SELECT 'credit_notes',            COUNT(*) FROM credit_notes            WHERE company_reg_num IS NULL
-- UNION ALL SELECT 'payment_m3',              COUNT(*) FROM payment_m3              WHERE company_reg_num IS NULL
-- UNION ALL SELECT 'statements',              COUNT(*) FROM statements              WHERE company_reg_num IS NULL
-- UNION ALL SELECT 'wages',                   COUNT(*) FROM wages                   WHERE company_reg_num IS NULL
-- UNION ALL SELECT 'expenses_m2',             COUNT(*) FROM expenses_m2             WHERE company_reg_num IS NULL
-- UNION ALL SELECT 'purchase_orders',         COUNT(*) FROM purchase_orders         WHERE company_reg_num IS NULL
-- UNION ALL SELECT 'documents',               COUNT(*) FROM documents               WHERE company_reg_num IS NULL
-- UNION ALL SELECT 'suppliers',               COUNT(*) FROM suppliers               WHERE company_reg_num IS NULL
-- UNION ALL SELECT 'subcontractor_stmts',     COUNT(*) FROM subcontractor_statements WHERE company_reg_num IS NULL
-- UNION ALL SELECT 'm5_client_rate',          COUNT(*) FROM m5_client_rate          WHERE company_reg_num IS NULL
-- UNION ALL SELECT 'm5_driver_rate',          COUNT(*) FROM m5_driver_rate          WHERE company_reg_num IS NULL
-- UNION ALL SELECT 'aging_analysis',          COUNT(*) FROM aging_analysis          WHERE company_reg_num IS NULL
-- UNION ALL SELECT 'audit_log',               COUNT(*) FROM audit_log               WHERE company_reg_num IS NULL
-- UNION ALL SELECT 'base_salary_history',     COUNT(*) FROM base_salary_history     WHERE company_reg_num IS NULL
-- UNION ALL SELECT 'emp_deduction_history',   COUNT(*) FROM employee_deduction_history WHERE company_reg_num IS NULL
-- UNION ALL SELECT 'expense_types',           COUNT(*) FROM expense_types           WHERE company_reg_num IS NULL;


-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 4 — NOT NULL CONSTRAINTS
-- Only run after Phase 3 verify shows 0 for every table.
-- ─────────────────────────────────────────────────────────────────────────────

-- Migration 002
ALTER TABLE m5_trucks   ALTER COLUMN company_reg_num SET NOT NULL;
ALTER TABLE m5_trailers ALTER COLUMN company_reg_num SET NOT NULL;
ALTER TABLE m5_client   ALTER COLUMN company_reg_num SET NOT NULL;

-- Migration 005
ALTER TABLE m1_controller              ALTER COLUMN company_reg_num SET NOT NULL;
ALTER TABLE legs_m2                    ALTER COLUMN company_reg_num SET NOT NULL;
ALTER TABLE container                  ALTER COLUMN company_reg_num SET NOT NULL;
ALTER TABLE m1_controller_weight       ALTER COLUMN company_reg_num SET NOT NULL;
ALTER TABLE invoice                    ALTER COLUMN company_reg_num SET NOT NULL;
ALTER TABLE add_ons                    ALTER COLUMN company_reg_num SET NOT NULL;
ALTER TABLE credit_notes               ALTER COLUMN company_reg_num SET NOT NULL;
ALTER TABLE payment_m3                 ALTER COLUMN company_reg_num SET NOT NULL;
ALTER TABLE statements                 ALTER COLUMN company_reg_num SET NOT NULL;
ALTER TABLE wages                      ALTER COLUMN company_reg_num SET NOT NULL;
ALTER TABLE expenses_m2                ALTER COLUMN company_reg_num SET NOT NULL;
ALTER TABLE purchase_orders            ALTER COLUMN company_reg_num SET NOT NULL;
ALTER TABLE documents                  ALTER COLUMN company_reg_num SET NOT NULL;
ALTER TABLE suppliers                  ALTER COLUMN company_reg_num SET NOT NULL;
ALTER TABLE subcontractor_statements   ALTER COLUMN company_reg_num SET NOT NULL;
ALTER TABLE m5_client_rate             ALTER COLUMN company_reg_num SET NOT NULL;
ALTER TABLE m5_driver_rate             ALTER COLUMN company_reg_num SET NOT NULL;
ALTER TABLE aging_analysis             ALTER COLUMN company_reg_num SET NOT NULL;
ALTER TABLE audit_log                  ALTER COLUMN company_reg_num SET NOT NULL;
ALTER TABLE base_salary_history        ALTER COLUMN company_reg_num SET NOT NULL;
ALTER TABLE employee_deduction_history ALTER COLUMN company_reg_num SET NOT NULL;

-- Migration 006
ALTER TABLE expense_types ALTER COLUMN company_reg_num SET NOT NULL;


-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 5 — GRANDFATHER TO ENTERPRISE PLAN
-- Sets this company's subscription to enterprise/active.
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE usertable
  SET subscription_tier   = 'enterprise',
      subscription_status = 'active',
      setup_fee_paid      = TRUE,
      trial_ends_at       = NULL,
      plan_approved_by    = 'system_migration',
      plan_approved_at    = NOW(),
      plan_notes          = 'Migrated from single-tenant to SaaS — grandfathered Enterprise'
  WHERE company_reg_num = '2015/302583/07';

INSERT INTO billing_events (company_reg_num, event_type, new_value, performed_by, notes)
VALUES (
  '2015/302583/07',
  'plan_assigned',
  'enterprise',
  'system_migration',
  'Single-tenant DB migrated to SaaS platform — grandfathered at Enterprise'
);

COMMIT;
