import { pool } from "../../config/database.js";

const getAllPlans = async () => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT plan_key, display_name, setup_fee_zar, monthly_fee_zar,
              max_users, max_trucks, overage_user, overage_truck, sort_order
       FROM subscription_plans
       WHERE is_active = true
       ORDER BY sort_order ASC`
    );
    return result.rows;
  } finally {
    client.release();
  }
};

const getPlanByKey = async (plan_key) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT plan_key, display_name, setup_fee_zar, monthly_fee_zar,
              max_users, max_trucks, overage_user, overage_truck
       FROM subscription_plans
       WHERE plan_key = $1 AND is_active = true`,
      [plan_key]
    );
    return result.rows[0] || null;
  } finally {
    client.release();
  }
};

const getPlanFeatures = async (plan_key) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT feature_key FROM plan_features WHERE plan_key = $1`,
      [plan_key]
    );
    return result.rows.map((r) => r.feature_key);
  } finally {
    client.release();
  }
};

const checkFeatureAccess = async (plan_key, feature_key) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT 1 FROM plan_features WHERE plan_key = $1 AND feature_key = $2`,
      [plan_key, feature_key]
    );
    return result.rows.length > 0;
  } finally {
    client.release();
  }
};

const VALID_PLAN_KEYS = new Set(["lite", "professional", "growth", "enterprise"]);

const isValidPlanKey = (key) => VALID_PLAN_KEYS.has(key);

export { getAllPlans, getPlanByKey, getPlanFeatures, checkFeatureAccess, isValidPlanKey };
