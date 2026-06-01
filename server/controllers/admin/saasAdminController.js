import { pool } from "../../config/database.js";
import {
  updateSubscriptionTier,
  recordBillingEvent,
  getBillingEvents,
  getAllBillingEvents,
  getCurrentUsage,
} from "../../models/billing/subscriptionModel.js";
import { getPlanByKey, isValidPlanKey, getAllPlans } from "../../models/billing/planModel.js";
import { PLAN_RANK, ROLEID_NAME_MAP, ROLE_PLAN_MAP } from "../../middleware/planAuthorization.js";

// GET /api/admin/companies
// List all companies with plan, status, and current user/truck counts.
const listCompanies = async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT
          u.company_reg_num,
          u.companyname,
          u.status,
          u.subscription_tier,
          u.subscription_status,
          u.trial_ends_at,
          u.setup_fee_paid,
          u.monthly_billing_anchor,
          u.plan_approved_by,
          u.plan_approved_at,
          u.plan_notes,
          u.dateofreg,
          (SELECT COUNT(*) FROM m5_employee e WHERE e.company_reg_num = u.company_reg_num AND e.status = true) AS active_user_count,
          (SELECT COUNT(*) FROM m5_trucks  t WHERE t.company_reg_num = u.company_reg_num AND t.status = true) AS active_truck_count
        FROM usertable u
        WHERE u.roleid = 1
        ORDER BY u.companyname ASC
      `);
      return res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("listCompanies error:", err);
    return res.status(500).json({ error: "Failed to fetch companies." });
  }
};

// GET /api/admin/companies/:company_reg_num
// Full company profile including billing events log.
const getCompanyProfile = async (req, res) => {
  const { company_reg_num } = req.params;
  try {
    const client = await pool.connect();
    try {
      const companyResult = await client.query(
        `SELECT u.company_reg_num, u.companyname, u.email, u.status,
                u.subscription_tier, u.subscription_status, u.trial_ends_at,
                u.setup_fee_paid, u.monthly_billing_anchor,
                u.plan_approved_by, u.plan_approved_at, u.plan_notes, u.dateofreg
         FROM usertable u
         WHERE u.company_reg_num = $1 AND u.roleid = 1
         LIMIT 1`,
        [company_reg_num]
      );
      if (!companyResult.rows[0]) {
        return res.status(404).json({ error: "Company not found." });
      }

      const [events, usage] = await Promise.all([
        getBillingEvents(company_reg_num, 100),
        getCurrentUsage(company_reg_num),
      ]);

      return res.json({
        company: companyResult.rows[0],
        usage,
        billing_events: events,
      });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("getCompanyProfile error:", err);
    return res.status(500).json({ error: "Failed to fetch company profile." });
  }
};

// POST /api/admin/companies/:company_reg_num/assign-plan
// Assign initial plan to a company (first activation).
const assignPlan = async (req, res) => {
  const { company_reg_num } = req.params;
  const { plan, setup_fee_paid, billing_anchor_day, notes } = req.body;
  const adminEmail = req.user.email;

  if (!plan || !isValidPlanKey(plan)) {
    return res.status(400).json({ error: "Invalid or missing plan key." });
  }
  if (billing_anchor_day && (billing_anchor_day < 1 || billing_anchor_day > 28)) {
    return res.status(400).json({ error: "billing_anchor_day must be 1-28." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Verify company exists
    const companyCheck = await client.query(
      `SELECT subscription_tier FROM usertable WHERE company_reg_num = $1 AND roleid = 1 LIMIT 1`,
      [company_reg_num]
    );
    if (!companyCheck.rows[0]) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Company not found." });
    }

    const now = new Date().toISOString();
    await updateSubscriptionTier(client, company_reg_num, {
      subscription_tier:       plan,
      subscription_status:     "active",
      setup_fee_paid:          setup_fee_paid ?? false,
      monthly_billing_anchor:  billing_anchor_day || null,
      plan_approved_by:        adminEmail,
      plan_approved_at:        now,
      plan_notes:              notes || null,
      trial_ends_at:           null,
    });

    await recordBillingEvent(client, {
      company_reg_num,
      event_type:   "plan_assigned",
      new_value:    plan,
      performed_by: adminEmail,
      notes:        notes || null,
    });

    await client.query("COMMIT");

    return res.json({
      success:         true,
      company_reg_num,
      plan,
      status:          "active",
      approved_by:     adminEmail,
      approved_at:     now,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("assignPlan error:", err);
    return res.status(500).json({ error: "Failed to assign plan." });
  } finally {
    client.release();
  }
};

// PUT /api/admin/companies/:company_reg_num/upgrade-plan
// Change plan up or down. Returns warnings if downgrading affects employee roles.
const upgradePlan = async (req, res) => {
  const { company_reg_num } = req.params;
  const { plan, notes } = req.body;
  const adminEmail = req.user.email;

  if (!plan || !isValidPlanKey(plan)) {
    return res.status(400).json({ error: "Invalid or missing plan key." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const companyResult = await client.query(
      `SELECT subscription_tier FROM usertable WHERE company_reg_num = $1 AND roleid = 1 LIMIT 1`,
      [company_reg_num]
    );
    if (!companyResult.rows[0]) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Company not found." });
    }

    const oldTier = companyResult.rows[0].subscription_tier;
    const isDowngrade = (PLAN_RANK[plan] ?? 0) < (PLAN_RANK[oldTier] ?? 0);
    const eventType = isDowngrade ? "plan_downgraded" : "plan_upgraded";

    await updateSubscriptionTier(client, company_reg_num, {
      subscription_tier:  plan,
      plan_approved_by:   adminEmail,
      plan_approved_at:   new Date().toISOString(),
      plan_notes:         notes || null,
    });

    await recordBillingEvent(client, {
      company_reg_num,
      event_type:   eventType,
      old_value:    oldTier,
      new_value:    plan,
      performed_by: adminEmail,
      notes:        notes || null,
    });

    await client.query("COMMIT");

    const response = { success: true, old_plan: oldTier, new_plan: plan };

    // Check for affected employees on downgrade
    if (isDowngrade) {
      const newPlanRank = PLAN_RANK[plan] ?? 0;
      const employeesResult = await client.query(
        `SELECT userid, name, surname, roleid
         FROM m5_employee
         WHERE company_reg_num = $1 AND status = true`,
        [company_reg_num]
      );

      const warnings = employeesResult.rows.reduce((acc, emp) => {
        const roleName    = ROLEID_NAME_MAP[emp.roleid];
        const minPlan     = roleName ? (ROLE_PLAN_MAP[roleName] || "enterprise") : null;
        const minPlanRank = minPlan ? (PLAN_RANK[minPlan] ?? 99) : 0;
        if (minPlan && newPlanRank < minPlanRank) {
          acc.push({
            employee_id: emp.userid,
            name:        `${emp.name} ${emp.surname}`,
            role:        roleName,
            message:     `This role requires the ${minPlan} plan.`,
          });
        }
        return acc;
      }, []);

      if (warnings.length) response.warnings = warnings;
    }

    return res.json(response);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("upgradePlan error:", err);
    return res.status(500).json({ error: "Failed to change plan." });
  } finally {
    client.release();
  }
};

// PUT /api/admin/companies/:company_reg_num/suspend
const suspendCompany = async (req, res) => {
  const { company_reg_num } = req.params;
  const { reason } = req.body;
  const adminEmail = req.user.email;

  if (!reason) {
    return res.status(400).json({ error: "A suspension reason is required." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const check = await client.query(
      `SELECT subscription_status FROM usertable WHERE company_reg_num = $1 AND roleid = 1 LIMIT 1`,
      [company_reg_num]
    );
    if (!check.rows[0]) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Company not found." });
    }

    await client.query(
      `UPDATE usertable SET subscription_status = 'suspended', plan_notes = $2
       WHERE company_reg_num = $1`,
      [company_reg_num, reason]
    );

    await recordBillingEvent(client, {
      company_reg_num,
      event_type:   "account_suspended",
      performed_by: adminEmail,
      notes:        reason,
    });

    await client.query("COMMIT");
    return res.json({ success: true, company_reg_num, status: "suspended" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("suspendCompany error:", err);
    return res.status(500).json({ error: "Failed to suspend company." });
  } finally {
    client.release();
  }
};

// PUT /api/admin/companies/:company_reg_num/reactivate
const reactivateCompany = async (req, res) => {
  const { company_reg_num } = req.params;
  const adminEmail = req.user.email;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const check = await client.query(
      `SELECT subscription_tier FROM usertable WHERE company_reg_num = $1 AND roleid = 1 LIMIT 1`,
      [company_reg_num]
    );
    if (!check.rows[0]) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Company not found." });
    }

    await client.query(
      `UPDATE usertable SET subscription_status = 'active', plan_notes = NULL
       WHERE company_reg_num = $1`,
      [company_reg_num]
    );

    await recordBillingEvent(client, {
      company_reg_num,
      event_type:   "account_reactivated",
      performed_by: adminEmail,
    });

    await client.query("COMMIT");
    return res.json({ success: true, company_reg_num, status: "active" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("reactivateCompany error:", err);
    return res.status(500).json({ error: "Failed to reactivate company." });
  } finally {
    client.release();
  }
};

// POST /api/admin/companies/:company_reg_num/trial
// Start a 14-day trial on any plan tier.
// Body: { plan: "lite" | "professional" | "growth" | "enterprise" }  (defaults to "professional")
const VALID_TRIAL_PLANS = ["lite", "professional", "growth", "enterprise"];

const startTrial = async (req, res) => {
  const { company_reg_num } = req.params;
  const { plan = "professional" } = req.body;
  const adminEmail = req.user.email;

  if (!VALID_TRIAL_PLANS.includes(plan)) {
    return res.status(400).json({
      error: "INVALID_PLAN",
      message: `Plan must be one of: ${VALID_TRIAL_PLANS.join(", ")}.`,
    });
  }

  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 14);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Confirm company exists
    const check = await client.query(
      `SELECT subscription_status FROM usertable WHERE company_reg_num = $1 AND roleid = 1 LIMIT 1`,
      [company_reg_num]
    );
    if (!check.rows[0]) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Company not found." });
    }

    // Anti-abuse: block if this company has ever had a trial before
    const history = await client.query(
      `SELECT COUNT(*) FROM billing_events
       WHERE company_reg_num = $1 AND event_type = 'trial_started'`,
      [company_reg_num]
    );
    if (parseInt(history.rows[0].count) > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        error:   "TRIAL_ALREADY_USED",
        message: "This company has already used a trial and cannot receive another.",
      });
    }

    await updateSubscriptionTier(client, company_reg_num, {
      subscription_tier:   plan,
      subscription_status: "trial",
      trial_ends_at:       trialEndsAt.toISOString(),
      plan_approved_by:    adminEmail,
      plan_approved_at:    new Date().toISOString(),
    });

    await recordBillingEvent(client, {
      company_reg_num,
      event_type:   "trial_started",
      new_value:    plan,
      performed_by: adminEmail,
      notes:        `14-day ${plan} trial — ends ${trialEndsAt.toISOString().split("T")[0]}`,
    });

    await client.query("COMMIT");
    return res.json({
      success:       true,
      company_reg_num,
      status:        "trial",
      plan,
      trial_ends_at: trialEndsAt.toISOString(),
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("startTrial error:", err);
    return res.status(500).json({ error: "Failed to start trial." });
  } finally {
    client.release();
  }
};

// GET /api/admin/billing-events
// Paginated log of all billing events across all companies.
const listBillingEvents = async (req, res) => {
  const page     = Math.max(1, parseInt(req.query.page, 10)  || 1);
  const pageSize = Math.min(100, parseInt(req.query.limit, 10) || 50);
  try {
    const { events, total } = await getAllBillingEvents(page, pageSize);
    return res.json({ events, total, page, page_size: pageSize });
  } catch (err) {
    console.error("listBillingEvents error:", err);
    return res.status(500).json({ error: "Failed to fetch billing events." });
  }
};

// GET /api/admin/plans
// Return the plan catalogue (useful for admin UI selectors).
const listPlans = async (req, res) => {
  try {
    const plans = await getAllPlans();
    return res.json(plans);
  } catch (err) {
    console.error("listPlans error:", err);
    return res.status(500).json({ error: "Failed to fetch plans." });
  }
};

export {
  listCompanies,
  getCompanyProfile,
  assignPlan,
  upgradePlan,
  suspendCompany,
  reactivateCompany,
  startTrial,
  listBillingEvents,
  listPlans,
};
