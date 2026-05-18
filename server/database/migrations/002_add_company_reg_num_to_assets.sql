-- Migration 002: Add company_reg_num to asset tables (m5_trucks, m5_trailers, m5_client)
-- Safe to re-run: all statements use IF NOT EXISTS.
--
-- DEPLOY CHECKLIST:
--   1. Run Steps 1 & 2 (columns + indexes) — safe on any environment.
--   2. Run the SINGLE-TENANT BACKFILL below if this DB has only one active company.
--      For multi-tenant DBs, supply explicit UPDATE statements per company instead.
--   3. Run the VERIFY query — all three counts must return 0 before proceeding.
--   4. Run Step 3 (NOT NULL constraints) only after VERIFY passes.
--
-- NOTE: Migration 005 extends this same pattern to all remaining business tables.

-- Step 1: Add nullable columns
ALTER TABLE m5_trucks   ADD COLUMN IF NOT EXISTS company_reg_num VARCHAR(20) NULL;
ALTER TABLE m5_trailers ADD COLUMN IF NOT EXISTS company_reg_num VARCHAR(20) NULL;
ALTER TABLE m5_client   ADD COLUMN IF NOT EXISTS company_reg_num VARCHAR(20) NULL;

-- Step 2: Indexes (safe to create before backfill)
CREATE INDEX IF NOT EXISTS idx_trucks_company_reg   ON m5_trucks(company_reg_num);
CREATE INDEX IF NOT EXISTS idx_trailers_company_reg ON m5_trailers(company_reg_num);
CREATE INDEX IF NOT EXISTS idx_client_company_reg   ON m5_client(company_reg_num);

-- ─── SINGLE-TENANT BACKFILL (uncomment if only one active company on this DB) ───
-- UPDATE m5_trucks
--   SET company_reg_num = (
--     SELECT company_reg_num FROM usertable WHERE status = 'active' AND roleid = 1 LIMIT 1
--   )
-- WHERE company_reg_num IS NULL;
--
-- UPDATE m5_trailers
--   SET company_reg_num = (
--     SELECT company_reg_num FROM usertable WHERE status = 'active' AND roleid = 1 LIMIT 1
--   )
-- WHERE company_reg_num IS NULL;
--
-- UPDATE m5_client
--   SET company_reg_num = (
--     SELECT company_reg_num FROM usertable WHERE status = 'active' AND roleid = 1 LIMIT 1
--   )
-- WHERE company_reg_num IS NULL;
-- ─────────────────────────────────────────────────────────────────────────────────

-- Step 3: NOT NULL constraints — run ONLY after VERIFY returns 0 NULLs for all three tables
ALTER TABLE m5_trucks   ALTER COLUMN company_reg_num SET NOT NULL;
ALTER TABLE m5_trailers ALTER COLUMN company_reg_num SET NOT NULL;
ALTER TABLE m5_client   ALTER COLUMN company_reg_num SET NOT NULL;

-- VERIFY (run this before uncommenting NOT NULL above):
-- SELECT 'trucks'   AS tbl, COUNT(*) AS nulls FROM m5_trucks   WHERE company_reg_num IS NULL
-- UNION ALL
-- SELECT 'trailers' AS tbl, COUNT(*) AS nulls FROM m5_trailers WHERE company_reg_num IS NULL
-- UNION ALL
-- SELECT 'clients'  AS tbl, COUNT(*) AS nulls FROM m5_client   WHERE company_reg_num IS NULL;
-- Expected: all three rows return 0 before enabling NOT NULL.
