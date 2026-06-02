import { pool } from "../../config/database.js";

/**
 * GET /api/subscription/usage
 * Returns the effective user/truck limits for the calling company (plan default
 * overridden by any per-company override set by super admin) plus current live counts.
 * Drivers (roleid 5) and roleid 6 are excluded from the user count.
 */
const getSubscriptionUsage = async (req, res) => {
  const company_reg_num = req.user?.company_reg_num;
  if (!company_reg_num) {
    return res.status(400).json({ error: "No company associated with this user." });
  }

  try {
    const client = await pool.connect();
    try {
      const [limitsResult, userCountResult, truckCountResult] = await Promise.all([
        client.query(
          `SELECT
             COALESCE(u.max_users_override,  sp.max_users)  AS max_users,
             COALESCE(u.max_trucks_override, sp.max_trucks) AS max_trucks,
             u.max_users_override,
             u.max_trucks_override,
             sp.max_users  AS plan_max_users,
             sp.max_trucks AS plan_max_trucks
           FROM usertable u
           LEFT JOIN subscription_plans sp ON sp.plan_key = u.subscription_tier
           WHERE u.company_reg_num = $1 AND u.roleid = 1
           LIMIT 1`,
          [company_reg_num]
        ),
        client.query(
          `SELECT COUNT(*) AS count
           FROM m5_employee
           WHERE company_reg_num = $1 AND status = true AND roleid != 5 AND roleid != 6`,
          [company_reg_num]
        ),
        client.query(
          `SELECT COUNT(*) AS count
           FROM m5_trucks
           WHERE company_reg_num = $1 AND status = true
             AND (is_subcontractor = false OR is_subcontractor IS NULL)`,
          [company_reg_num]
        ),
      ]);

      const row = limitsResult.rows[0];
      return res.json({
        max_users:           row ? (parseInt(row.max_users,  10) || 999) : 999,
        max_trucks:          row ? (parseInt(row.max_trucks, 10) || 999) : 999,
        user_count:          parseInt(userCountResult.rows[0].count,  10),
        truck_count:         parseInt(truckCountResult.rows[0].count, 10),
        max_users_override:  row?.max_users_override  ?? null,
        max_trucks_override: row?.max_trucks_override ?? null,
        plan_max_users:      row?.plan_max_users  ?? null,
        plan_max_trucks:     row?.plan_max_trucks ?? null,
      });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("getSubscriptionUsage error:", err);
    return res.status(500).json({ error: "Failed to fetch subscription usage." });
  }
};

export { getSubscriptionUsage };
