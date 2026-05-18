-- Migration 005: Add company_reg_num to all remaining business tables
-- Extends the pattern established in Migration 002 to every table that
-- holds tenant-specific data but was missing the column.
--
-- Safe to re-run: all ALTER TABLE statements use IF NOT EXISTS.
--
-- DEPLOY CHECKLIST:
--   1. Run Step 1 (add nullable columns) + Step 2 (indexes) — safe on any live DB.
--   2. Run the SINGLE-TENANT BACKFILL section if this DB has only one active company.
--      For multi-tenant DBs, supply explicit UPDATE statements per company.
--   3. Run the VERIFY query — every table must return 0 before proceeding to Step 3.
--   4. Run Step 3 (NOT NULL constraints) only after VERIFY passes completely.

-- ─── Step 1: Add nullable columns ────────────────────────────────────────────

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

-- ─── Step 2: Indexes ──────────────────────────────────────────────────────────

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

-- ─── SINGLE-TENANT BACKFILL ───────────────────────────────────────────────────
-- Only use when exactly one active company exists on this database.
-- Uncomment and run each UPDATE individually, then verify before enabling NOT NULL.

-- DO $$
-- DECLARE crn VARCHAR(20);
-- BEGIN
--   SELECT company_reg_num INTO crn FROM usertable WHERE roleid = 1 AND status = 'active' LIMIT 1;
--
--   UPDATE m1_controller              SET company_reg_num = crn WHERE company_reg_num IS NULL;
--   UPDATE legs_m2                    SET company_reg_num = crn WHERE company_reg_num IS NULL;
--   UPDATE container                  SET company_reg_num = crn WHERE company_reg_num IS NULL;
--   UPDATE m1_controller_weight       SET company_reg_num = crn WHERE company_reg_num IS NULL;
--   UPDATE invoice                    SET company_reg_num = crn WHERE company_reg_num IS NULL;
--   UPDATE add_ons                    SET company_reg_num = crn WHERE company_reg_num IS NULL;
--   UPDATE credit_notes               SET company_reg_num = crn WHERE company_reg_num IS NULL;
--   UPDATE payment_m3                 SET company_reg_num = crn WHERE company_reg_num IS NULL;
--   UPDATE statements                 SET company_reg_num = crn WHERE company_reg_num IS NULL;
--   UPDATE wages                      SET company_reg_num = crn WHERE company_reg_num IS NULL;
--   UPDATE expenses_m2                SET company_reg_num = crn WHERE company_reg_num IS NULL;
--   UPDATE purchase_orders            SET company_reg_num = crn WHERE company_reg_num IS NULL;
--   UPDATE documents                  SET company_reg_num = crn WHERE company_reg_num IS NULL;
--   UPDATE suppliers                  SET company_reg_num = crn WHERE company_reg_num IS NULL;
--   UPDATE subcontractor_statements   SET company_reg_num = crn WHERE company_reg_num IS NULL;
--   UPDATE m5_client_rate             SET company_reg_num = crn WHERE company_reg_num IS NULL;
--   UPDATE m5_driver_rate             SET company_reg_num = crn WHERE company_reg_num IS NULL;
--   UPDATE aging_analysis             SET company_reg_num = crn WHERE company_reg_num IS NULL;
--   UPDATE audit_log                  SET company_reg_num = crn WHERE company_reg_num IS NULL;
--   UPDATE base_salary_history        SET company_reg_num = crn WHERE company_reg_num IS NULL;
--   UPDATE employee_deduction_history SET company_reg_num = crn WHERE company_reg_num IS NULL;
-- END $$;

-- ─── VERIFY (run before Step 3 — every count must be 0) ──────────────────────
-- SELECT 'm1_controller'              AS tbl, COUNT(*) AS nulls FROM m1_controller              WHERE company_reg_num IS NULL
-- UNION ALL SELECT 'legs_m2',                              COUNT(*) FROM legs_m2                    WHERE company_reg_num IS NULL
-- UNION ALL SELECT 'container',                            COUNT(*) FROM container                  WHERE company_reg_num IS NULL
-- UNION ALL SELECT 'm1_controller_weight',                 COUNT(*) FROM m1_controller_weight       WHERE company_reg_num IS NULL
-- UNION ALL SELECT 'invoice',                              COUNT(*) FROM invoice                    WHERE company_reg_num IS NULL
-- UNION ALL SELECT 'add_ons',                              COUNT(*) FROM add_ons                    WHERE company_reg_num IS NULL
-- UNION ALL SELECT 'credit_notes',                         COUNT(*) FROM credit_notes               WHERE company_reg_num IS NULL
-- UNION ALL SELECT 'payment_m3',                           COUNT(*) FROM payment_m3                 WHERE company_reg_num IS NULL
-- UNION ALL SELECT 'statements',                           COUNT(*) FROM statements                 WHERE company_reg_num IS NULL
-- UNION ALL SELECT 'wages',                                COUNT(*) FROM wages                      WHERE company_reg_num IS NULL
-- UNION ALL SELECT 'expenses_m2',                          COUNT(*) FROM expenses_m2                WHERE company_reg_num IS NULL
-- UNION ALL SELECT 'purchase_orders',                      COUNT(*) FROM purchase_orders            WHERE company_reg_num IS NULL
-- UNION ALL SELECT 'documents',                            COUNT(*) FROM documents                  WHERE company_reg_num IS NULL
-- UNION ALL SELECT 'suppliers',                            COUNT(*) FROM suppliers                  WHERE company_reg_num IS NULL
-- UNION ALL SELECT 'subcontractor_statements',             COUNT(*) FROM subcontractor_statements   WHERE company_reg_num IS NULL
-- UNION ALL SELECT 'm5_client_rate',                       COUNT(*) FROM m5_client_rate             WHERE company_reg_num IS NULL
-- UNION ALL SELECT 'm5_driver_rate',                       COUNT(*) FROM m5_driver_rate             WHERE company_reg_num IS NULL
-- UNION ALL SELECT 'aging_analysis',                       COUNT(*) FROM aging_analysis             WHERE company_reg_num IS NULL
-- UNION ALL SELECT 'audit_log',                            COUNT(*) FROM audit_log                  WHERE company_reg_num IS NULL
-- UNION ALL SELECT 'base_salary_history',                  COUNT(*) FROM base_salary_history        WHERE company_reg_num IS NULL
-- UNION ALL SELECT 'employee_deduction_history',           COUNT(*) FROM employee_deduction_history WHERE company_reg_num IS NULL;

-- ─── Step 3: NOT NULL constraints — run ONLY after VERIFY returns 0 for all ──

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
