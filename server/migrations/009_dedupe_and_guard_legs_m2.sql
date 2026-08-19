BEGIN;

-- The existing legs_m2_unique_assignment constraint
--   UNIQUE (m1key, legnumber, driverid, truckregnumber, containernumber, vgm, date)
-- does not prevent duplicate leg-assignment rows whenever any of those columns is
-- NULL, because Postgres treats NULL <> NULL for uniqueness purposes. vgm (and
-- sometimes driverid/date) is frequently NULL for container-based legs, so
-- concurrent duplicate saves (a client-side double-submit race in
-- UpdateInstruction's saveService.js) could insert byte-identical rows undetected.
-- Confirmed on instructions 2059, 2092, and 2139.

-- Step 1: remove existing exact-duplicate rows, keeping the lowest legkey in each
-- group (i.e. the original row).
DELETE FROM legs_m2 a
USING legs_m2 b
WHERE a.legkey > b.legkey
  AND a.m1key = b.m1key
  AND a.legnumber = b.legnumber
  AND a.driverid IS NOT DISTINCT FROM b.driverid
  AND a.truckregnumber IS NOT DISTINCT FROM b.truckregnumber
  AND a.containernumber IS NOT DISTINCT FROM b.containernumber
  AND a.vgm IS NOT DISTINCT FROM b.vgm
  AND a.date IS NOT DISTINCT FROM b.date;

-- Step 2: replace the leaky UNIQUE constraint with an equivalent index that treats
-- NULLs as equal (via COALESCE to sentinel values), so any future duplicate save
-- is rejected at the database level instead of silently succeeding.
ALTER TABLE legs_m2
  DROP CONSTRAINT IF EXISTS legs_m2_unique_assignment;

CREATE UNIQUE INDEX IF NOT EXISTS legs_m2_unique_assignment_idx
  ON legs_m2 (
    m1key,
    legnumber,
    COALESCE(driverid, -1),
    COALESCE(truckregnumber, ''),
    COALESCE(containernumber, ''),
    COALESCE(vgm, -1),
    COALESCE(date, 'epoch'::date)
  );

COMMIT;
