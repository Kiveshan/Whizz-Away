import { pool } from "../../config/database.js";

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

export {
  getPendingUsers,
  approveUser,
  rejectUser,
  updateUserStatus,
  getCompanyList,
  deactivateCompany,
  reactivateCompany,
};
