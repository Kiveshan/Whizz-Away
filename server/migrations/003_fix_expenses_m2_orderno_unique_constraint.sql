-- Migration 003: Fix expenses_m2 orderno unique constraint to be tenant-scoped
--
-- The original UNIQUE (orderno) constraint is global across all companies,
-- which prevents multiple tenants from using the same PO number format.
-- Replace it with a composite UNIQUE (orderno, company_reg_num) so each
-- tenant can have their own orderno values independently.
--
-- Also enables ON CONFLICT (orderno, company_reg_num) DO UPDATE in the
-- upload-slip endpoint so re-uploading a slip is idempotent.

BEGIN;

-- Drop the old global unique constraint
ALTER TABLE expenses_m2
  DROP CONSTRAINT IF EXISTS expenses_m2_orderno_unique;

-- Add the new tenant-scoped unique constraint
ALTER TABLE expenses_m2
  ADD CONSTRAINT expenses_m2_orderno_company_unique UNIQUE (orderno, company_reg_num);

COMMIT;
