import { pool } from "../config/database.js";

// Blocks mutating requests (POST/PUT/DELETE/PATCH) for suspended companies.
// GET requests always pass through.
// Admin users (roleid 7) bypass this check entirely.

const readOnlyMode = async (req, res, next) => {
  // GET requests are always allowed
  if (req.method === "GET") return next();

  // Super admins bypass suspension
  if (req.user?.roleid === 7) return next();

  const company_reg_num = req.user?.company_reg_num;
  if (!company_reg_num) return next();

  // Fast path: JWT already carries subscription_status
  const statusFromJwt = req.user?.subscription_status;
  if (statusFromJwt && statusFromJwt !== "suspended") return next();

  try {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT subscription_status, plan_notes
         FROM usertable
         WHERE company_reg_num = $1 AND roleid = 1
         LIMIT 1`,
        [company_reg_num]
      );

      const row = result.rows[0];
      if (!row) return next();

      if (row.subscription_status === "suspended") {
        return res.status(402).json({
          error: "ACCOUNT_SUSPENDED",
          message: "Your account has been suspended. You can view your data but cannot make changes.",
          reason: row.plan_notes || "Please contact your Whizz-Away account manager.",
          code: "ACCOUNT_SUSPENDED",
        });
      }

      next();
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("readOnlyMode error:", err);
    next(); // fail open
  }
};

export { readOnlyMode };
