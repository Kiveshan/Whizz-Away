-- Migration 004: Seed plan catalogue and feature gates
-- Safe to re-run: ON CONFLICT DO NOTHING on both inserts.

INSERT INTO subscription_plans (plan_key, display_name, setup_fee_zar, monthly_fee_zar, max_users, max_trucks, sort_order)
VALUES
  ('lite',         'Lite',         2500,  2000,   2,   5, 1),
  ('professional', 'Professional', 7500,  4500,   5,  15, 2),
  ('growth',       'Growth',      15000,  7500,  15,  40, 3),
  ('enterprise',   'Enterprise',  25000, 10500, 999, 999, 4)
ON CONFLICT (plan_key) DO NOTHING;

INSERT INTO plan_features (plan_key, feature_key) VALUES
  -- Lite
  ('lite', 'instructions'),
  ('lite', 'assignment'),
  ('lite', 'invoice'),
  ('lite', 'statements'),
  ('lite', 'manage'),
  -- Professional (all Lite + addons, analytics, reports)
  ('professional', 'instructions'),
  ('professional', 'assignment'),
  ('professional', 'invoice'),
  ('professional', 'statements'),
  ('professional', 'manage'),
  ('professional', 'addons'),
  ('professional', 'analytics'),
  ('professional', 'reports'),
  -- Growth (all Professional + payroll, biometric, vat)
  ('growth', 'instructions'),
  ('growth', 'assignment'),
  ('growth', 'invoice'),
  ('growth', 'statements'),
  ('growth', 'manage'),
  ('growth', 'addons'),
  ('growth', 'analytics'),
  ('growth', 'reports'),
  ('growth', 'payroll'),
  ('growth', 'biometric'),
  ('growth', 'vat'),
  -- Enterprise (all Growth + creditors, priority_support)
  ('enterprise', 'instructions'),
  ('enterprise', 'assignment'),
  ('enterprise', 'invoice'),
  ('enterprise', 'statements'),
  ('enterprise', 'manage'),
  ('enterprise', 'addons'),
  ('enterprise', 'analytics'),
  ('enterprise', 'reports'),
  ('enterprise', 'payroll'),
  ('enterprise', 'biometric'),
  ('enterprise', 'vat'),
  ('enterprise', 'creditors'),
  ('enterprise', 'priority_support')
ON CONFLICT (plan_key, feature_key) DO NOTHING;

-- VERIFY:
-- SELECT plan_key, COUNT(*) AS features FROM plan_features GROUP BY plan_key ORDER BY plan_key;
-- Expected:
--   enterprise   | 13
--   growth       | 11
--   lite         |  5
--   professional |  8

-- GRANDFATHER EXISTING COMPANIES (run AFTER migrations 001-004 are confirmed on staging):
-- BEGIN;
--   UPDATE usertable
--     SET subscription_tier   = 'enterprise',
--         subscription_status = 'active',
--         setup_fee_paid      = TRUE,
--         trial_ends_at       = NULL,
--         plan_approved_by    = 'system_migration',
--         plan_approved_at    = NOW(),
--         plan_notes          = 'Grandfathered to Enterprise at SaaS launch'
--   WHERE status = 'active';
--
--   INSERT INTO billing_events (company_reg_num, event_type, new_value, performed_by, notes)
--   SELECT company_reg_num, 'plan_assigned', 'enterprise', 'system_migration',
--          'Grandfathered at SaaS v1 launch'
--   FROM usertable WHERE status = 'active';
-- COMMIT;
--
-- VERIFY grandfather:
-- SELECT subscription_tier, subscription_status, COUNT(*)
-- FROM usertable WHERE status = 'active'
-- GROUP BY 1, 2;
-- Expected: one row — enterprise | active | <total active companies>
