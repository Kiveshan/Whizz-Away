-- READ-ONLY reconciliation: stored subcontractor_statements vs. values derived
-- live from legs_m2 + m1_controller.vat.
--
-- Purpose: before replacing the subcontractor_statements table with a derived
-- view, prove that no stored row carries information the legs don't. A row that
-- does not tie up is either a manual adjustment made directly in the DB, or a
-- statement generated before a leg was edited, added, deleted or reassigned.
--
-- TWO COLUMN TYPES DRIVE EVERYTHING BELOW, AND NEITHER IS WHAT YOU'D EXPECT:
--   legs_m2.driverrate               is DOUBLE PRECISION, not numeric. It must
--                                    be cast before rounding -- ROUND(double
--                                    precision, integer) does not exist.
--   subcontractor_statements.amount  is unconstrained NUMERIC, not NUMERIC(12,2),
--                                    so it stores the full float residue of the
--                                    generator's JS sum (e.g. 545019.2125000088).
--
-- Rounding basis matters more than it looks. The generator sums unrounded
-- per-leg rates and rounds once at the end ("sum then round"). A document whose
-- line items must add up to its printed total has to round each leg first
-- ("round then sum"). The two differ by up to half a cent per leg -- ~R2.79 on
-- a 644-leg statement -- so this script reports both and only treats the
-- sum-then-round comparison as evidence of drift.
--
-- Usage:
--   psql -U <user> -d <db> -f server/scripts/reconcile_subcontractor_statements.sql
--
-- Run query 0 first. If it returns rows, everything below is unreliable (the
-- join to m1_controller fans out and double-counts legs) -- and so is the live
-- generator, which uses the same join.


-- ============================================================
-- 0. Fan-out guard: m1key must be unique in m1_controller
-- ============================================================
\echo '=== 0. Fan-out guard (expect ZERO rows) ==='

SELECT m1key, COUNT(*) AS row_count
FROM m1_controller
GROUP BY m1key
HAVING COUNT(*) > 1
ORDER BY row_count DESC;


-- ============================================================
-- Shared derivation
-- ============================================================
CREATE TEMP VIEW recon AS
WITH derived_legs AS (
  SELECT
    e.subei_reg_num                                          AS subbie_reg_num,
    (date_trunc('month', l.date) + INTERVAL '1 month')::date AS generation_date,
    CASE WHEN COALESCE(m1.vat, 0) > 0 THEN 'VAT' ELSE 'NON_VAT' END AS vat_status,
    l.legkey,
    -- cast to numeric BEFORE any arithmetic; see the header note on types
    COALESCE(l.driverrate, 0)::numeric * (1 + COALESCE(m1.vat, 0)::numeric / 100)
      AS leg_rate
  FROM m5_employee e
  JOIN legs_m2 l             ON l.driverid = e.userid
  LEFT JOIN m1_controller m1 ON m1.m1key = l.m1key
  WHERE e.subei_reg_num IS NOT NULL
    AND e.subei_reg_num <> ''
),
derived AS (
  SELECT
    subbie_reg_num,
    generation_date,
    vat_status,
    COUNT(legkey)                     AS derived_leg_count,
    ROUND(SUM(leg_rate), 2)           AS derived_sum_then_round,
    SUM(ROUND(leg_rate, 2))           AS derived_round_then_sum,
    ARRAY_AGG(legkey ORDER BY legkey) AS derived_legkeys
  FROM derived_legs
  GROUP BY 1, 2, 3
  -- the generator skips any bucket totalling <= 0, so a zero bucket is
  -- legitimately absent rather than missing
  HAVING SUM(leg_rate) > 0
),
stored_legs AS (
  SELECT
    s.sub_state_id,
    (leg->>'legkey')::bigint AS legkey
  FROM subcontractor_statements s
  CROSS JOIN LATERAL jsonb_array_elements(s.legids::jsonb) AS leg
),
stored AS (
  SELECT
    s.sub_state_id,
    s.subbie_reg_num,
    s.date                        AS generation_date,
    COALESCE(s.vat_status, 'VAT') AS vat_status,
    s.amount                      AS stored_amount_raw,
    ROUND(s.amount, 2)            AS stored_amount,
    COUNT(sl.legkey)              AS stored_leg_count,
    COALESCE(
      ARRAY_AGG(sl.legkey ORDER BY sl.legkey) FILTER (WHERE sl.legkey IS NOT NULL),
      '{}'
    ) AS stored_legkeys
  FROM subcontractor_statements s
  LEFT JOIN stored_legs sl ON sl.sub_state_id = s.sub_state_id
  GROUP BY s.sub_state_id, s.subbie_reg_num, s.date, s.vat_status, s.amount
)
SELECT
  COALESCE(st.subbie_reg_num, d.subbie_reg_num)   AS subbie_reg_num,
  to_char(COALESCE(st.generation_date, d.generation_date)
          - INTERVAL '1 month', 'YYYY-MM')        AS legs_period,
  COALESCE(st.vat_status, d.vat_status)           AS vat_status,
  st.sub_state_id,
  st.stored_amount,
  d.derived_sum_then_round,
  d.derived_round_then_sum,
  -- the drift test: same basis the generator used, so any non-zero value here
  -- is real -- a changed leg or a hand-edited amount
  ROUND(COALESCE(d.derived_sum_then_round, 0) - COALESCE(st.stored_amount, 0), 2)
    AS drift_delta,
  -- informational: what adopting the document-correct basis would change
  ROUND(COALESCE(d.derived_round_then_sum, 0) - COALESCE(d.derived_sum_then_round, 0), 2)
    AS rounding_basis_delta,
  st.stored_leg_count,
  d.derived_leg_count,
  ARRAY(SELECT unnest(COALESCE(st.stored_legkeys, '{}'))
        EXCEPT
        SELECT unnest(COALESCE(d.derived_legkeys, '{}'))) AS legs_only_in_stored,
  ARRAY(SELECT unnest(COALESCE(d.derived_legkeys, '{}'))
        EXCEPT
        SELECT unnest(COALESCE(st.stored_legkeys, '{}'))) AS legs_only_in_derived,
  CASE
    WHEN st.sub_state_id IS NULL                THEN 'MISSING_STATEMENT'
    WHEN d.derived_sum_then_round IS NULL       THEN 'ORPHAN_STATEMENT'
    WHEN ABS(d.derived_sum_then_round - st.stored_amount) <= 0.01 THEN 'OK'
    ELSE 'AMOUNT_MISMATCH'
  END AS verdict
FROM stored st
FULL OUTER JOIN derived d
  ON  d.subbie_reg_num  = st.subbie_reg_num
  AND d.generation_date = st.generation_date
  AND d.vat_status      = st.vat_status;


-- ============================================================
-- 1. Headline: how many rows tie up?
-- ============================================================
-- OK                -> stored amount reproduces exactly from current legs
-- AMOUNT_MISMATCH   -> real difference: manual adjustment, or a leg changed
--                      after generation
-- ORPHAN_STATEMENT  -> a stored statement with no live legs behind it
-- MISSING_STATEMENT -> live legs never generated into a statement (expect the
--                      current month here -- the cron has not run for it yet)
\echo ''
\echo '=== 1. Verdict summary ==='

SELECT
  verdict,
  COUNT(*)                                             AS rows,
  ROUND(SUM(COALESCE(stored_amount, 0)), 2)            AS total_stored,
  ROUND(SUM(COALESCE(derived_sum_then_round, 0)), 2)   AS total_derived,
  ROUND(SUM(drift_delta), 2)                           AS net_drift
FROM recon
GROUP BY verdict
ORDER BY
  CASE verdict
    WHEN 'AMOUNT_MISMATCH'   THEN 1
    WHEN 'ORPHAN_STATEMENT'  THEN 2
    WHEN 'MISSING_STATEMENT' THEN 3
    ELSE 4
  END;


-- ============================================================
-- 2. Every row that does NOT tie up, worst first
-- ============================================================
-- The question for each: deliberate manual adjustment, or drift?
-- Identical leg sets with a delta  => a rate was edited after generation.
-- Different leg sets               => a leg was added, deleted or reassigned.
\echo ''
\echo '=== 2. Discrepancies (worst first) ==='

SELECT
  verdict,
  subbie_reg_num,
  legs_period,
  vat_status,
  sub_state_id,
  stored_amount,
  derived_sum_then_round,
  drift_delta,
  stored_leg_count,
  derived_leg_count,
  legs_only_in_stored,
  legs_only_in_derived
FROM recon
WHERE verdict <> 'OK'
ORDER BY ABS(drift_delta) DESC, legs_period DESC;


-- ============================================================
-- 3. Impact of the document rounding basis
-- ============================================================
-- Not a fault -- this is what changes if exported documents round each leg to
-- cents so their line items add up to the printed total. Sub-rand per statement
-- and proportional to leg count. Review before adopting it as the paid figure.
\echo ''
\echo '=== 3. Rounding-basis impact (largest first) ==='

SELECT
  subbie_reg_num,
  legs_period,
  vat_status,
  derived_leg_count,
  derived_sum_then_round AS current_basis,
  derived_round_then_sum AS document_basis,
  rounding_basis_delta
FROM recon
WHERE derived_sum_then_round IS NOT NULL
  AND rounding_basis_delta <> 0
ORDER BY ABS(rounding_basis_delta) DESC
LIMIT 25;

DROP VIEW recon;
