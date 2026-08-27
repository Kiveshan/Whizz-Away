import { pool } from "../../config/database.js";
import { AUDIT_ACTION_TYPES, AUDIT_ENTITY_TYPES } from "../../config/auditActions.js";

const getPendingUsers = async () => {
  let client;
  try {
    client = await pool.connect();
    const result = await client.query(`
      SELECT 
        u.userid, 
        e.name, 
        e.surname, 
        e.email, 
        u.companyname, 
        u.company_reg_num,
        u.roleid, 
        u.status, 
        u.dateofreg,
        e.status AS employee_status
      FROM usertable u
      INNER JOIN m5_employee e ON u.company_reg_num = e.company_reg_num
      WHERE u.status = 'pending' 
    `);
    return result.rows;
  } catch (err) {
    console.error("Error fetching pending users:", err);
    throw err;
  } finally {
    if (client) client.release();
  }
};

const approveUser = async (userid, roleid) => {
  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");

    // Get company_reg_num from usertable
    const userResult = await client.query(
      `SELECT company_reg_num FROM usertable WHERE userid = $1`,
      [userid]
    );

    if (userResult.rows.length === 0) {
      throw new Error("User not found");
    }

    const company_reg_num = userResult.rows[0].company_reg_num;

    // Update usertable
    await client.query(
      `UPDATE usertable SET status = 'active', roleid = $1 WHERE userid = $2`,
      [roleid, userid]
    );

    // Update m5_employee status to TRUE
    await client.query(
      `UPDATE m5_employee SET status = TRUE WHERE company_reg_num = $1`,
      [company_reg_num]
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error approving user:", err);
    throw err;
  } finally {
    if (client) client.release();
  }
};

const rejectUser = async (userid) => {
  let client;
  try {
    client = await pool.connect();
    await client.query(
      "UPDATE usertable SET status = 'rejected' WHERE userid = $1",
      [userid]
    );
  } catch (err) {
    console.error("Error rejecting user:", err);
    throw err;
  } finally {
    if (client) client.release();
  }
};

const updateUserStatus = async (userid, action, roleid) => {
  let client;
  try {
    client = await pool.connect();
    if (action === "approve") {
      await client.query(
        "UPDATE usertable SET roleid = $1, status = 'active', approved_at = NOW() WHERE userid = $2",
        [roleid, userid]
      );
    } else if (action === "reject") {
      await client.query(
        "UPDATE usertable SET status = 'rejected', rejected_at = NOW() WHERE userid = $1",
        [userid]
      );
    } else {
      throw new Error("Invalid action");
    }
  } catch (err) {
    console.error("Error updating user status:", err);
    throw err;
  } finally {
    if (client) client.release();
  }
};

const getCompanyList = async () => {
  let client;
  try {
    client = await pool.connect();
    const result = await client.query(`
      SELECT 
        u.userid, 
        e.name, 
        e.surname, 
        e.email, 
        u.companyname, 
        u.company_reg_num, 
        u.status, 
        u.dateofreg,
        e.status AS employee_status,
        (SELECT COUNT(*) FROM m5_employee WHERE company_reg_num = u.company_reg_num) as total_count
      FROM usertable u
      INNER JOIN m5_employee e ON u.company_reg_num = e.company_reg_num
      WHERE e.roleid = 1 
      ORDER BY u.companyname ASC
    `);
    return result.rows;
  } catch (err) {
    console.error("Error fetching companies:", err);
    throw err;
  } finally {
    if (client) client.release();
  }
};

const deactivateCompany = async (company_reg_num) => {
  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");

    const companyAdminResult = await client.query(
      "UPDATE usertable SET status = 'inactive' WHERE company_reg_num = $1 AND roleid = 1 RETURNING companyname",
      [company_reg_num]
    );

    if (companyAdminResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return { success: false, message: "Company not found" };
    }

    await client.query(
      "UPDATE usertable SET status = 'inactive' WHERE company_reg_num = $1",
      [company_reg_num]
    );

    await client.query(
      "UPDATE m5_employee SET status = FALSE WHERE company_reg_num = $1",
      [company_reg_num]
    );

    await client.query("COMMIT");
    return {
      success: true,
      companyname: companyAdminResult.rows[0].companyname,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error deactivating company:", err);
    throw err;
  } finally {
    if (client) client.release();
  }
};

const reactivateCompany = async (company_reg_num) => {
  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");

    const companyAdminResult = await client.query(
      "UPDATE usertable SET status = 'active' WHERE company_reg_num = $1 AND roleid = 1 RETURNING companyname",
      [company_reg_num]
    );

    if (companyAdminResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return {
        success: false,
        message: "Company not found or no admin associated with the company",
      };
    }

    await client.query(
      "UPDATE usertable SET status = 'active' WHERE company_reg_num = $1",
      [company_reg_num]
    );

    await client.query(
      "UPDATE m5_employee SET status = TRUE WHERE company_reg_num = $1",
      [company_reg_num]
    );

    await client.query("COMMIT");
    return {
      success: true,
      companyname: companyAdminResult.rows[0].companyname,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error reactivating company:", err);
    throw err;
  } finally {
    if (client) client.release();
  }
};

// The pager stops counting here. See the count query in getAuditLog.
const COUNT_CAP = 20000;

// Filter dropdowns are served from the action/entity registry, which is exact
// for anything written by the current code and costs nothing. Older rows can
// still hold action types the registry no longer lists (renamed or retired
// actions), so the table is scanned for those too — but at most once every
// FILTER_CACHE_MS, because DISTINCT over an audit table is a full scan.
const FILTER_CACHE_MS = 15 * 60 * 1000;
let filterCache = { expiresAt: 0, actionTypes: [], entityTypes: [] };

const getAuditFilterValues = async () => {
  if (Date.now() < filterCache.expiresAt) return filterCache;

  let historicActions = [];
  let historicEntities = [];
  try {
    const [actions, entities] = await Promise.all([
      pool.query(`SELECT DISTINCT action_type FROM audit_log ORDER BY action_type`),
      pool.query(
        `SELECT DISTINCT entity_type FROM audit_log
          WHERE entity_type IS NOT NULL ORDER BY entity_type`
      ),
    ]);
    historicActions = actions.rows.map((r) => r.action_type);
    historicEntities = entities.rows.map((r) => r.entity_type);
  } catch (err) {
    // A slow or failed scan must not take the viewer down — the registry
    // values alone are enough to filter everything written by current code.
    console.error("Audit filter scan failed, falling back to registry:", err.message);
  }

  filterCache = {
    expiresAt: Date.now() + FILTER_CACHE_MS,
    actionTypes: [...new Set([...AUDIT_ACTION_TYPES, ...historicActions])].sort(),
    entityTypes: [...new Set([...AUDIT_ENTITY_TYPES, ...historicEntities])].sort(),
  };
  return filterCache;
};

// Paginated, filterable read of the audit trail. Filters are all optional:
// actionType/entityType/outcome/actorId exact-match, search does a
// case-insensitive scan over target name, actor, details and request path,
// from/to bound the timestamp.
const getAuditLog = async ({
  page = 1,
  limit = 25,
  actionType,
  entityType,
  outcome,
  actorId,
  search,
  from,
  to,
}) => {
  const conditions = [];
  const params = [];

  // Conditions are written against the "a" alias so the same WHERE clause can
  // be reused by the count query and the joined page query.
  if (actionType) {
    params.push(actionType);
    conditions.push(`a.action_type = $${params.length}`);
  }
  if (entityType) {
    params.push(entityType);
    conditions.push(`a.entity_type = $${params.length}`);
  }
  if (outcome) {
    params.push(outcome);
    conditions.push(`a.outcome = $${params.length}`);
  }
  if (actorId) {
    params.push(Number(actorId));
    conditions.push(`a.admin_id = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(
      `(a.target_employee_name ILIKE $${params.length}
        OR a.details ILIKE $${params.length}
        OR a.actor_name ILIKE $${params.length}
        OR a.request_path ILIKE $${params.length}
        OR a.action_type ILIKE $${params.length})`
    );
  }
  if (from) {
    params.push(from);
    conditions.push(`a.timestamp >= $${params.length}`);
  }
  if (to) {
    params.push(to);
    conditions.push(`a.timestamp < ($${params.length}::date + INTERVAL '1 day')`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  // The pager needs a total, but an exact COUNT(*) over an audit table is a
  // full scan that gets slower every day and is the same cost on page 1 as on
  // page 400. Stop counting at COUNT_CAP rows: below the cap the number is
  // exact, above it the UI shows "20 000+". Callers narrow the window with the
  // date filters when they need to know precisely how many.
  const countResult = await pool.query(
    `SELECT COUNT(*) AS total
       FROM (SELECT 1 FROM audit_log a ${whereClause} LIMIT ${COUNT_CAP + 1}) capped`,
    params
  );
  const rawCount = Number(countResult.rows[0].total);
  const countIsCapped = rawCount > COUNT_CAP;
  const totalItems = countIsCapped ? COUNT_CAP : rawCount;

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 25));
  params.push(limitNum, (pageNum - 1) * limitNum);

  const result = await pool.query(
    `SELECT
       a.id AS audit_id,
       a.action_type,
       a.entity_type,
       a.admin_id,
       a.target_employee_id AS target_id,
       a.target_employee_name AS target_name,
       a.timestamp,
       a.details,
       a.metadata,
       a.http_method,
       a.request_path,
       a.status_code,
       a.outcome,
       a.duration_ms,
       a.actor_role,
       a.ip_address,
       a.user_agent,
       -- Prefer the name captured at the time of the action; fall back to the
       -- current user record for rows written before actor_name existed.
       COALESCE(
         a.actor_name,
         u.name || ' ' || u.surname,
         e.name || ' ' || e.surname
       ) AS actor_name
     FROM audit_log a
     LEFT JOIN usertable u ON u.userid = a.admin_id
     LEFT JOIN m5_employee e ON e.userid = a.admin_id
     ${whereClause}
     ORDER BY a.timestamp DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  // Filter values come from the (cached) legacy scan plus the static registry —
  // see getAuditFilterValues.
  const { actionTypes, entityTypes } = await getAuditFilterValues();

  return {
    items: result.rows,
    totalItems,
    countIsCapped,
    countCap: COUNT_CAP,
    totalPages: Math.max(1, Math.ceil(totalItems / limitNum)),
    currentPage: pageNum,
    actionTypes,
    entityTypes,
  };
};

export {
  getPendingUsers,
  approveUser,
  rejectUser,
  updateUserStatus,
  getCompanyList,
  deactivateCompany,
  reactivateCompany,
  getAuditLog,
};
