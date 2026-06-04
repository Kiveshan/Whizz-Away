import { pool } from "../../config/database.js";

const getCompanySubscription = async (company_reg_num) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT subscription_tier, subscription_status, trial_ends_at,
              setup_fee_paid, monthly_billing_anchor, plan_approved_by,
              plan_approved_at, plan_notes, companyname
       FROM usertable
       WHERE company_reg_num = $1 AND roleid = 1
       LIMIT 1`,
      [company_reg_num]
    );
    return result.rows[0] || null;
  } finally {
    client.release();
  }
};

const updateSubscriptionTier = async (client, company_reg_num, fields) => {
  const {
    subscription_tier,
    subscription_status,
    setup_fee_paid,
    monthly_billing_anchor,
    plan_approved_by,
    plan_approved_at,
    plan_notes,
    trial_ends_at,
  } = fields;

  await client.query(
    `UPDATE usertable SET
       subscription_tier        = COALESCE($2, subscription_tier),
       subscription_status      = COALESCE($3, subscription_status),
       setup_fee_paid           = COALESCE($4, setup_fee_paid),
       monthly_billing_anchor   = COALESCE($5, monthly_billing_anchor),
       plan_approved_by         = COALESCE($6, plan_approved_by),
       plan_approved_at         = COALESCE($7, plan_approved_at),
       plan_notes               = COALESCE($8, plan_notes),
       trial_ends_at            = $9
     WHERE company_reg_num = $1`,
    [
      company_reg_num,
      subscription_tier,
      subscription_status,
      setup_fee_paid,
      monthly_billing_anchor,
      plan_approved_by,
      plan_approved_at,
      plan_notes,
      trial_ends_at ?? null,
    ]
  );
};

const recordBillingEvent = async (client, event) => {
  const { company_reg_num, event_type, old_value, new_value, performed_by, notes } = event;
  await client.query(
    `INSERT INTO billing_events
       (company_reg_num, event_type, old_value, new_value, performed_by, notes)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [company_reg_num, event_type, old_value ?? null, new_value ?? null, performed_by ?? null, notes ?? null]
  );
};

const recordUsageSnapshot = async (company_reg_num, userCount, truckCount, plan) => {
  const client = await pool.connect();
  try {
    const snapshotMonth = new Date();
    snapshotMonth.setDate(1);
    snapshotMonth.setHours(0, 0, 0, 0);

    const overageUsers  = Math.max(0, userCount  - plan.max_users);
    const overageTrucks = Math.max(0, truckCount - plan.max_trucks);
    const overageAmount =
      overageUsers  * Number(plan.overage_user) +
      overageTrucks * Number(plan.overage_truck);

    await client.query(
      `INSERT INTO company_usage
         (company_reg_num, snapshot_month, user_count, truck_count,
          overage_users, overage_trucks, overage_amount)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (company_reg_num, snapshot_month) DO UPDATE SET
         user_count     = EXCLUDED.user_count,
         truck_count    = EXCLUDED.truck_count,
         overage_users  = EXCLUDED.overage_users,
         overage_trucks = EXCLUDED.overage_trucks,
         overage_amount = EXCLUDED.overage_amount`,
      [company_reg_num, snapshotMonth, userCount, truckCount, overageUsers, overageTrucks, overageAmount]
    );
  } finally {
    client.release();
  }
};

const getUsageHistory = async (company_reg_num, months = 6) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT snapshot_month, user_count, truck_count,
              overage_users, overage_trucks, overage_amount
       FROM company_usage
       WHERE company_reg_num = $1
       ORDER BY snapshot_month DESC
       LIMIT $2`,
      [company_reg_num, months]
    );
    return result.rows;
  } finally {
    client.release();
  }
};

const getCurrentUsage = async (company_reg_num) => {
  const client = await pool.connect();
  try {
    const [usersResult, trucksResult] = await Promise.all([
      client.query(
        `SELECT COUNT(*) AS count FROM m5_employee WHERE company_reg_num = $1 AND status = true AND roleid != 5 AND roleid != 6`,
        [company_reg_num]
      ),
      client.query(
        `SELECT COUNT(*) AS count FROM m5_trucks WHERE company_reg_num = $1 AND status = true`,
        [company_reg_num]
      ),
    ]);
    return {
      user_count:  parseInt(usersResult.rows[0].count, 10),
      truck_count: parseInt(trucksResult.rows[0].count, 10),
    };
  } finally {
    client.release();
  }
};

const getBillingEvents = async (company_reg_num, limit = 50) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT id, event_type, old_value, new_value, performed_by, notes, created_at
       FROM billing_events
       WHERE company_reg_num = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [company_reg_num, limit]
    );
    return result.rows;
  } finally {
    client.release();
  }
};

const getAllBillingEvents = async (page = 1, pageSize = 50) => {
  const client = await pool.connect();
  try {
    const offset = (page - 1) * pageSize;
    const [rows, count] = await Promise.all([
      client.query(
        `SELECT b.id, b.company_reg_num, u.companyname, b.event_type,
                b.old_value, b.new_value, b.performed_by, b.notes, b.created_at
         FROM billing_events b
         LEFT JOIN usertable u ON u.company_reg_num = b.company_reg_num AND u.roleid = 1
         ORDER BY b.created_at DESC
         LIMIT $1 OFFSET $2`,
        [pageSize, offset]
      ),
      client.query(`SELECT COUNT(*) FROM billing_events`),
    ]);
    return { events: rows.rows, total: parseInt(count.rows[0].count, 10) };
  } finally {
    client.release();
  }
};

/**
 * Returns all companies that should receive scheduled statement generation.
 * Excludes suspended/cancelled tenants so we don't waste cycles on inactive accounts.
 */
const getAllActiveCompanies = async () => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT DISTINCT ON (company_reg_num) company_reg_num, companyname
       FROM usertable
       WHERE roleid = 1
         AND subscription_status IN ('active', 'trial')
       ORDER BY company_reg_num`
    );
    return result.rows;
  } finally {
    client.release();
  }
};

export {
  getCompanySubscription,
  updateSubscriptionTier,
  recordBillingEvent,
  recordUsageSnapshot,
  getUsageHistory,
  getCurrentUsage,
  getBillingEvents,
  getAllBillingEvents,
  getAllActiveCompanies,
};
