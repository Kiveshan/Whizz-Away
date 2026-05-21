import { pool } from "../config/database.js";
import { getPlanFeatures } from "../models/billing/planModel.js";

// ─── Constants ───────────────────────────────────────────────────────────────

const PLAN_RANK = { lite: 1, professional: 2, growth: 3, enterprise: 4 };

// Minimum plan required to create an employee with a given role name
const ROLE_PLAN_MAP = {
  "Finance Clerk":    "lite",
  "Business Manager": "professional",
  "Director":         "professional",
  "Controller":       "professional",
  "Debtors Clerk":    "growth",
  "Creditors Clerk":  "enterprise",
};

// roleid → role name (matches roles table + EmployeeForm.jsx options)
const ROLEID_NAME_MAP = {
  1: "Business Manager",
  2: "Controller",
  3: "Finance Clerk",
  4: "Director",
  5: "Driver",
  8: "Creditors Clerk",
  9: "Yard Staff",
};

// ─── isSuperAdmin ─────────────────────────────────────────────────────────────

const isSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required", code: "NO_USER" });
  }
  if (req.user.roleid !== 7) {
    return res.status(403).json({
      error: "Forbidden",
      message: "This endpoint requires Whizz-Away admin access.",
      code: "NOT_SUPER_ADMIN",
    });
  }
  next();
};

// ─── loadCompany ──────────────────────────────────────────────────────────────
// Attaches req.company = { subscription_tier, subscription_status, ... }
// Uses req.user.company_reg_num from the JWT.

const loadCompany = async (req, res, next) => {
  const company_reg_num = req.user?.company_reg_num;
  if (!company_reg_num) {
    return res.status(400).json({ error: "No company associated with this user.", code: "NO_COMPANY" });
  }
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT subscription_tier, subscription_status, trial_ends_at,
                companyname, company_reg_num
         FROM usertable
         WHERE company_reg_num = $1 AND roleid = 1
         LIMIT 1`,
        [company_reg_num]
      );
      if (!result.rows[0]) {
        return res.status(404).json({ error: "Company not found.", code: "COMPANY_NOT_FOUND" });
      }
      req.company = result.rows[0];
      next();
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("loadCompany error:", err);
    return res.status(500).json({ error: "Failed to load company data." });
  }
};

// ─── requirePlan ─────────────────────────────────────────────────────────────
// Usage: requirePlan('professional')
// Blocks the request if the company's tier ranks below the required tier.

const requirePlan = (minimumPlan) => (req, res, next) => {
  const tier = req.user?.subscription_tier || "none";
  const rank = PLAN_RANK[tier] ?? 0;
  const required = PLAN_RANK[minimumPlan] ?? 99;
  if (rank >= required) return next();
  return res.status(403).json({
    error: "PLAN_UPGRADE_REQUIRED",
    message: `This feature requires the ${minimumPlan} plan or above.`,
    current_plan: tier,
    required_plan: minimumPlan,
  });
};

// ─── requireFeature ──────────────────────────────────────────────────────────
// Usage: requireFeature('analytics')
// Checks the plan_features table for the company's current tier.

const requireFeature = (feature_key) => async (req, res, next) => {
  const tier = req.user?.subscription_tier || "none";
  if (!PLAN_RANK[tier]) {
    return res.status(403).json({
      error: "PLAN_UPGRADE_REQUIRED",
      message: `This feature requires an active subscription.`,
      current_plan: tier,
      required_feature: feature_key,
    });
  }
  try {
    const features = await getPlanFeatures(tier);
    if (features.includes(feature_key)) return next();
    return res.status(403).json({
      error: "FEATURE_NOT_AVAILABLE",
      message: `The '${feature_key}' feature is not available on your current plan.`,
      current_plan: tier,
      required_feature: feature_key,
    });
  } catch (err) {
    console.error("requireFeature error:", err);
    return res.status(500).json({ error: "Failed to check feature access." });
  }
};

// ─── requireRolePermission ────────────────────────────────────────────────────
// Added to POST /api/employees.
// Checks that the role being assigned is permitted by the company's current plan.

const requireRolePermission = async (req, res, next) => {
  const company_reg_num = req.user?.company_reg_num;
  if (!company_reg_num) {
    return res.status(400).json({ error: "No company associated with this user.", code: "NO_COMPANY" });
  }

  try {
    const client = await pool.connect();
    let companyTier;
    try {
      const result = await client.query(
        `SELECT subscription_tier FROM usertable WHERE company_reg_num = $1 AND roleid = 1 LIMIT 1`,
        [company_reg_num]
      );
      companyTier = result.rows[0]?.subscription_tier || "none";
    } finally {
      client.release();
    }

    // Determine requested role name from either roleid or role field in body
    const requestedRoleId = parseInt(req.body.roleid, 10);
    const requestedRoleName = req.body.role || ROLEID_NAME_MAP[requestedRoleId];

    if (!requestedRoleName) return next(); // unknown role — let controller handle validation

    const minimumPlan = ROLE_PLAN_MAP[requestedRoleName] || "enterprise";
    const companyRank  = PLAN_RANK[companyTier] ?? 0;
    const requiredRank = PLAN_RANK[minimumPlan] ?? 99;

    if (companyRank >= requiredRank) return next();

    return res.status(403).json({
      error: "PLAN_UPGRADE_REQUIRED",
      message: `The role '${requestedRoleName}' requires the ${minimumPlan} plan or above.`,
      current_plan: companyTier,
      required_plan: minimumPlan,
    });
  } catch (err) {
    console.error("requireRolePermission error:", err);
    return res.status(500).json({ error: "Failed to verify plan permissions." });
  }
};

// ─── checkUsageLimits ────────────────────────────────────────────────────────
// Attaches req.usageWarning if the company is at or over its user cap.
// Does NOT block — creation is allowed with overage charges.

const checkUsageLimits = async (req, res, next) => {
  const company_reg_num = req.user?.company_reg_num;
  if (!company_reg_num) return next();

  try {
    const client = await pool.connect();
    try {
      const [planResult, countResult] = await Promise.all([
        client.query(
          `SELECT sp.max_users, sp.overage_user FROM subscription_plans sp
           JOIN usertable u ON u.subscription_tier = sp.plan_key
           WHERE u.company_reg_num = $1 AND u.roleid = 1 LIMIT 1`,
          [company_reg_num]
        ),
        client.query(
          `SELECT COUNT(*) FROM m5_employee WHERE company_reg_num = $1 AND status = true`,
          [company_reg_num]
        ),
      ]);

      const maxUsers    = planResult.rows[0]?.max_users ?? 999;
      const overageCost = Number(planResult.rows[0]?.overage_user ?? 300);
      const userCount   = parseInt(countResult.rows[0].count, 10);

      if (maxUsers !== 999 && userCount >= maxUsers) {
        req.usageWarning = {
          type:        "user_limit_exceeded",
          current:     userCount,
          max:         maxUsers,
          overageCost,
          message:     `You have reached your plan limit of ${maxUsers} users. Adding this employee will incur an overage charge of R${overageCost}/month.`,
        };
      }
      next();
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("checkUsageLimits error:", err);
    next(); // fail open — don't block on a usage check error
  }
};

// ─── checkTruckUsageLimits ───────────────────────────────────────────────────
// Attaches req.usageWarning if the company is at or over its truck cap.
// Excludes subcontractor trucks from the count.
// Does NOT block — creation is allowed with overage charges.

const checkTruckUsageLimits = async (req, res, next) => {
  const company_reg_num = req.user?.company_reg_num;
  if (!company_reg_num) return next();

  try {
    const client = await pool.connect();
    try {
      const [planResult, countResult] = await Promise.all([
        client.query(
          `SELECT sp.max_trucks, sp.overage_truck FROM subscription_plans sp
           JOIN usertable u ON u.subscription_tier = sp.plan_key
           WHERE u.company_reg_num = $1 AND u.roleid = 1 LIMIT 1`,
          [company_reg_num]
        ),
        client.query(
          `SELECT COUNT(*) FROM m5_trucks
           WHERE company_reg_num = $1
             AND status = true
             AND (is_subcontractor = false OR is_subcontractor IS NULL)`,
          [company_reg_num]
        ),
      ]);

      const maxTrucks   = planResult.rows[0]?.max_trucks ?? 999;
      const overageCost = Number(planResult.rows[0]?.overage_truck ?? 250);
      const truckCount  = parseInt(countResult.rows[0].count, 10);

      if (maxTrucks !== 999 && truckCount >= maxTrucks) {
        req.usageWarning = {
          type:        "truck_limit_exceeded",
          current:     truckCount,
          max:         maxTrucks,
          overageCost,
          message:     `You have reached your plan limit of ${maxTrucks} trucks. Adding this truck will incur an overage charge of R${overageCost}/month.`,
        };
      }
      next();
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("checkTruckUsageLimits error:", err);
    next(); // fail open — don't block on a usage check error
  }
};

export {
  isSuperAdmin,
  loadCompany,
  requirePlan,
  requireFeature,
  requireRolePermission,
  checkUsageLimits,
  checkTruckUsageLimits,
  PLAN_RANK,
  ROLE_PLAN_MAP,
  ROLEID_NAME_MAP,
};
