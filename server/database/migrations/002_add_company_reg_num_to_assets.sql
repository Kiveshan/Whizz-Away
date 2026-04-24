-- Migration 002: Add company_reg_num to asset tables (m5_trucks, m5_trailers, m5_client)
-- Safe to re-run: all statements use IF NOT EXISTS.
--
-- IMPORTANT — BACKFILL NOTE:
-- The spec's backfill SQL assumed an employee_id FK on each asset table, which does
-- not exist in this schema. There is no reliable automatic path to determine which
-- company owns which truck, trailer, or client record.
--
-- ACTION REQUIRED AFTER RUNNING THIS MIGRATION:
--   1. Run the VERIFY query at the bottom to see how many rows have NULL.
--   2. If staging is single-tenant (one active company), use the SINGLE-TENANT
--      backfill below (uncomment + substitute the real company_reg_num).
--   3. If staging is multi-tenant, update each table manually using known data:
--        UPDATE m5_trucks    SET company_reg_num = 'YOUR_REG' WHERE m5truckskey IN (...);
--        UPDATE m5_trailers  SET company_reg_num = 'YOUR_REG' WHERE m5trailerskey IN (...);
--        UPDATE m5_client    SET company_reg_num = 'YOUR_REG' WHERE m5clientkey IN (...);
--   4. Only uncomment the NOT NULL constraints AFTER the verify query returns 0 NULLs.

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

-- Step 3: NOT NULL constraints — only uncomment AFTER verify returns 0 NULLs
-- ALTER TABLE m5_trucks   ALTER COLUMN company_reg_num SET NOT NULL;
-- ALTER TABLE m5_trailers ALTER COLUMN company_reg_num SET NOT NULL;
-- ALTER TABLE m5_client   ALTER COLUMN company_reg_num SET NOT NULL;

-- VERIFY (run this before uncommenting NOT NULL above):
-- SELECT 'trucks'   AS tbl, COUNT(*) AS nulls FROM m5_trucks   WHERE company_reg_num IS NULL
-- UNION ALL
-- SELECT 'trailers' AS tbl, COUNT(*) AS nulls FROM m5_trailers WHERE company_reg_num IS NULL
-- UNION ALL
-- SELECT 'clients'  AS tbl, COUNT(*) AS nulls FROM m5_client   WHERE company_reg_num IS NULL;
-- Expected: all three rows return 0 before enabling NOT NULL.
