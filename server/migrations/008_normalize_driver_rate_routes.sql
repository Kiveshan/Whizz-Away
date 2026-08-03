-- Migration 008: normalize driver-rate route names and repair the duplicates
--
-- WHY
-- ---
-- getDistinctRoutes grouped by the RAW startingpoint/destination columns while
-- every other query matched with LOWER(TRIM(...)). SQL TRIM strips only leading
-- and trailing spaces -- it does NOT collapse internal runs of whitespace and it
-- does not touch NBSP (U+00A0), which is what you get when route names are pasted
-- out of Excel or Outlook. So 'Cape  Town' and 'Cape Town' rendered as two routes
-- that no lookup could tell apart.
--
-- saveRoutePeriods then normalized its own DELETE key before matching on TRIM, so
-- the delete matched zero rows and the follow-up INSERT re-created the duplicate
-- on every save.
--
-- IMPORTANT: legs_m2 carries the same route text and is matched against
-- m5_driver_rate on the normalized route, so it MUST be normalized in the same
-- transaction. Normalizing only the rate table would leave legs still holding
-- 'Cape  Town' unable to resolve a rate now stored as 'Cape Town' -- they would
-- silently fall into ROUTE_MISSING and lose their driver rate.
--
-- m5_client_rate / m1_controller.pickup+dropoff are matched by exact equality on
-- a different axis (client rates, not driver rates) and are deliberately NOT
-- touched here.

BEGIN;

-- ─── Single definition of route identity ────────────────────────────────────
-- Maps every whitespace variant we have actually seen to a plain space, collapses
-- runs, and trims. IMMUTABLE so it can back an index. Non-strict: NULL -> ''.
CREATE OR REPLACE FUNCTION public.norm_route(s text) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT btrim(
    regexp_replace(
      translate(
        coalesce(s, ''),
        U&'\00a0\2007\202f\2009\200a\3000\feff' || E'\t\n\r',
        '          '
      ),
      ' +', ' ', 'g'
    )
  )
$$;

COMMENT ON FUNCTION public.norm_route(text) IS
  'Canonical route-name form: unicode spaces -> space, runs collapsed, trimmed. '
  'Must stay in sync with normalizeName() in server/models/manage/driverRatesModel.js.';

-- ─── 1. Normalize the stored text in both tables ────────────────────────────
UPDATE public.m5_driver_rate
SET startingpoint = public.norm_route(startingpoint),
    destination   = public.norm_route(destination)
WHERE startingpoint IS DISTINCT FROM public.norm_route(startingpoint)
   OR destination   IS DISTINCT FROM public.norm_route(destination);

UPDATE public.legs_m2
SET startingpoint = public.norm_route(startingpoint),
    destination   = public.norm_route(destination)
WHERE startingpoint IS DISTINCT FROM public.norm_route(startingpoint)
   OR destination   IS DISTINCT FROM public.norm_route(destination);

-- ─── 2. Collapse rate rows that are now duplicates ──────────────────────────
-- Two rows collide only when they share a normalized route AND the same
-- effective_from. Rows differing in effective_from are legitimately separate
-- periods and are left alone.
--
-- Survivor = the row carrying the most populated rate fields, then the highest
-- m5ratekey (most recently created).
CREATE TEMP TABLE _dedup_map ON COMMIT DROP AS
WITH ranked AS (
  SELECT
    m5ratekey,
    lower(public.norm_route(startingpoint)) AS sp,
    lower(public.norm_route(destination))   AS dest,
    effective_from,
    row_number() OVER (
      PARTITION BY lower(public.norm_route(startingpoint)),
                   lower(public.norm_route(destination)),
                   effective_from
      ORDER BY
        ( (driver_six_meter_rate    IS NOT NULL)::int
        + (driver_twelve_meter_rate IS NOT NULL)::int
        + (subie_six_meter_rate     IS NOT NULL)::int
        + (subie_twelve_meter_rate  IS NOT NULL)::int ) DESC,
        m5ratekey DESC
    ) AS rn
  FROM public.m5_driver_rate
)
SELECT
  loser.m5ratekey    AS loser_key,
  winner.m5ratekey   AS winner_key,
  loser.sp,
  loser.dest,
  loser.effective_from
FROM ranked loser
JOIN ranked winner
  ON winner.sp = loser.sp
 AND winner.dest = loser.dest
 AND winner.effective_from = loser.effective_from
 AND winner.rn = 1
WHERE loser.rn > 1;

-- Repoint legs at the survivor BEFORE deleting: migration 007 put an
-- ON DELETE RESTRICT FK on legs_m2.m5ratekey, so an unrepointed delete would abort.
UPDATE public.legs_m2 l
SET m5ratekey = m.winner_key
FROM _dedup_map m
WHERE l.m5ratekey = m.loser_key;

DELETE FROM public.m5_driver_rate d
USING _dedup_map m
WHERE d.m5ratekey = m.loser_key;

-- ─── 3. Retire empty rate rows ──────────────────────────────────────────────
-- These come from POST /api/driver-rates, which (unlike the periods form) never
-- required at least one rate value. They are what surfaces in the UI as a period
-- with null rates. Deliberately conservative: skip anything a leg still points
-- at, and never remove the last remaining period for a route.
CREATE TEMP TABLE _empty_kept ON COMMIT DROP AS
SELECT d.m5ratekey, d.startingpoint, d.destination, d.effective_from,
       EXISTS (SELECT 1 FROM public.legs_m2 l WHERE l.m5ratekey = d.m5ratekey) AS referenced_by_legs
FROM public.m5_driver_rate d
WHERE d.driver_six_meter_rate    IS NULL
  AND d.driver_twelve_meter_rate IS NULL
  AND d.subie_six_meter_rate     IS NULL
  AND d.subie_twelve_meter_rate  IS NULL
  AND d.subie_rate               IS NULL;

DELETE FROM public.m5_driver_rate d
USING _empty_kept e
WHERE d.m5ratekey = e.m5ratekey
  AND e.referenced_by_legs = false
  AND EXISTS (
    SELECT 1
    FROM public.m5_driver_rate o
    WHERE o.m5ratekey <> d.m5ratekey
      AND lower(public.norm_route(o.startingpoint)) = lower(public.norm_route(d.startingpoint))
      AND lower(public.norm_route(o.destination))   = lower(public.norm_route(d.destination))
  );

-- ─── 4. Make the duplicate unrepresentable going forward ────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS ux_driver_rate_route_period
ON public.m5_driver_rate (
  lower(public.norm_route(startingpoint)),
  lower(public.norm_route(destination)),
  effective_from
);

-- Backs the per-leg rate lookup in getRateForLegDate and the month-audit LATERAL.
CREATE INDEX IF NOT EXISTS idx_legs_route_norm
ON public.legs_m2 (
  lower(public.norm_route(startingpoint)),
  lower(public.norm_route(destination))
);

-- The migration-001 index is on the raw columns and no longer matches any query.
DROP INDEX IF EXISTS public.idx_driver_rate_effective_dates;

COMMIT;

-- ─── Post-migration report ──────────────────────────────────────────────────
-- Anything returned by the first query is a genuine same-route/same-date
-- collision that survived (should be empty). The second lists empty rate rows
-- that were deliberately kept and need a human decision.

SELECT lower(public.norm_route(startingpoint)) AS sp_norm,
       lower(public.norm_route(destination))   AS dest_norm,
       effective_from,
       count(*)
FROM public.m5_driver_rate
GROUP BY 1, 2, 3
HAVING count(*) > 1;

SELECT m5ratekey, startingpoint, destination, effective_from,
       'kept: referenced by legs, or is the only period for this route' AS reason
FROM public.m5_driver_rate
WHERE driver_six_meter_rate    IS NULL
  AND driver_twelve_meter_rate IS NULL
  AND subie_six_meter_rate     IS NULL
  AND subie_twelve_meter_rate  IS NULL
  AND subie_rate               IS NULL
ORDER BY startingpoint, destination, effective_from;

-- Legs whose stored driverrate matches no rate field on any period covering their
-- route and date. Where two rate rows were merged above, the leg kept the value
-- from the row that lost -- which may now be stale.
--
-- This migration deliberately does NOT rewrite driverrate: that is what drivers
-- and subcontractors get paid, and changing it is a business decision, not a
-- schema one. Review this list and apply corrections through the existing
-- Admin -> Driver Rate Audit tool (GET/POST /api/driver-rates/month-audit),
-- which classifies each leg and requires an explicit apply step.
SELECT l.legkey, l.m1key, l.date, l.startingpoint, l.destination, l.driverrate
FROM public.legs_m2 l
WHERE l.date IS NOT NULL
  AND l.driverrate IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.m5_driver_rate d
    WHERE lower(public.norm_route(d.startingpoint)) = lower(public.norm_route(l.startingpoint))
      AND lower(public.norm_route(d.destination))   = lower(public.norm_route(l.destination))
      AND d.effective_from <= l.date
      AND (d.effective_to IS NULL OR d.effective_to >= l.date)
      AND l.driverrate IN (d.driver_six_meter_rate, d.driver_twelve_meter_rate,
                           d.subie_six_meter_rate,  d.subie_twelve_meter_rate)
  )
ORDER BY l.m1key, l.legkey;
