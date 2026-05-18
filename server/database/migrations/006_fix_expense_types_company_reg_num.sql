-- Migration 006: Fix expense_types.company_reg_num column type
-- The column was created as INTEGER instead of VARCHAR(20).
-- This migration casts it to the correct type and enforces NOT NULL.
--
-- Safe to re-run: the ALTER TYPE uses USING to handle the cast cleanly.
--
-- DEPLOY CHECKLIST:
--   1. Run Step 1 (type change) — safe; PostgreSQL casts integer → varchar(20) cleanly.
--   2. Run the SINGLE-TENANT BACKFILL if any rows have a NULL value.
--   3. Run VERIFY — count must return 0 before proceeding to Step 2.
--   4. Run Step 2 (NOT NULL constraint) only after VERIFY passes.

-- ─── Step 1: Fix column type ─────────────────────────────────────────────────

ALTER TABLE expense_types
  ALTER COLUMN company_reg_num TYPE VARCHAR(20)
  USING company_reg_num::VARCHAR(20);

-- ─── SINGLE-TENANT BACKFILL ───────────────────────────────────────────────────
-- Only use when exactly one active company exists on this database.
-- Uncomment and run if any expense_types rows have a NULL company_reg_num.

-- DO $$
-- DECLARE crn VARCHAR(20);
-- BEGIN
--   SELECT company_reg_num INTO crn FROM usertable WHERE roleid = 1 AND status = 'active' LIMIT 1;
--   UPDATE expense_types SET company_reg_num = crn WHERE company_reg_num IS NULL;
-- END $$;

-- ─── VERIFY (count must be 0 before Step 2) ───────────────────────────────────
-- SELECT COUNT(*) AS nulls FROM expense_types WHERE company_reg_num IS NULL;

-- ─── Step 2: NOT NULL constraint — run ONLY after VERIFY returns 0 ────────────

ALTER TABLE expense_types
  ALTER COLUMN company_reg_num SET NOT NULL;
