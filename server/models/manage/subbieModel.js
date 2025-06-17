import { pool } from "../../config/database.js";

const getAllSubcontractors = async () => {
  let client;
  try {
    client = await pool.connect();
    const result = await client.query(
      "SELECT * FROM m5_employee WHERE roleid = 6 ORDER BY userid"
    );
    return result.rows;
  } catch (err) {
    console.error("Error fetching subcontractors:", err);
    throw err;
  } finally {
    if (client) client.release();
  }
};

const getSubcontractorById = async (id) => {
  let client;
  try {
    client = await pool.connect();
    const result = await client.query(
      "SELECT * FROM m5_employee WHERE userid = $1 AND roleid = 6",
      [id]
    );
    if (!result.rows.length) {
      return { success: false, message: "Subcontractor not found" };
    }
    return { success: true, data: result.rows[0] };
  } catch (err) {
    console.error(`Error fetching subcontractor ${id}:`, err);
    throw err;
  } finally {
    if (client) client.release();
  }
};

const checkSubcontractorEmailExists = async (email, excludeId = null) => {
  let client;
  try {
    client = await pool.connect();
    let query = "SELECT 1 FROM m5_employee WHERE email = $1 AND roleid = 6";
    let params = [email];
    if (excludeId) {
      query += " AND userid != $2";
      params.push(excludeId);
    }
    const result = await client.query(query, params);
    return result.rows.length > 0;
  } catch (err) {
    console.error("Error checking subcontractor email existence:", err);
    throw err;
  } finally {
    if (client) client.release();
  }
};

const createSubcontractor = async (subcontractorData) => {
  let client;
  try {
    client = await pool.connect();
    const {
      cellnum,
      email,
      companyname,
      location,
      truckregnum,
      contact_person,
      subei_reg_num,
      no_of_trucks,
      subdrivername,
    } = subcontractorData;

    // Validate email uniqueness
    const emailExists = await checkSubcontractorEmailExists(email);
    if (emailExists) {
      return { success: false, message: "Email already exists" };
    }

    // Ensure subdrivername is an array
    const subdriverArray = Array.isArray(subdrivername)
      ? subdrivername
      : typeof subdrivername === "string"
      ? subdrivername
          .split(",")
          .map((name) => name.trim())
          .filter(Boolean)
      : [];
    if (!subdriverArray.length) {
      return {
        success: false,
        message: "At least one driver name is required",
      };
    }

    const result = await client.query(
      `INSERT INTO m5_employee (
        cellnum, email, companyname, location, truckregnum,
        contact_person, subei_reg_num, no_of_trucks, roleid, status, subdrivername
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        cellnum,
        email,
        companyname,
        location,
        truckregnum,
        contact_person,
        subei_reg_num,
        no_of_trucks,
        6,
        true,
        `{${subdriverArray
          .map((name) => `"${name.replace(/"/g, '""')}"`)
          .join(",")}}`,
      ]
    );
    return { success: true, data: result.rows[0] };
  } catch (err) {
    console.error("Error creating subcontractor:", err);
    throw err;
  } finally {
    if (client) client.release();
  }
};

const updateSubcontractor = async (id, subcontractorData) => {
  let client;
  try {
    client = await pool.connect();
    const {
      cellnum,
      email,
      companyname,
      location,
      truckregnum,
      contact_person,
      subei_reg_num,
      no_of_trucks,
      subdrivername,
    } = subcontractorData;

    // Validate email uniqueness (excluding current subcontractor)
    const emailExists = await checkSubcontractorEmailExists(email, id);
    if (emailExists) {
      return { success: false, message: "Email already exists" };
    }

    // Ensure subdrivername is an array
    const subdriverArray = Array.isArray(subdrivername)
      ? subdrivername
      : typeof subdrivername === "string"
      ? subdrivername
          .split(",")
          .map((name) => name.trim())
          .filter(Boolean)
      : [];
    if (!subdriverArray.length) {
      return {
        success: false,
        message: "At least one driver name is required",
      };
    }

    const result = await client.query(
      `UPDATE m5_employee
       SET cellnum = $1, email = $2, companyname = $3, location = $4,
           truckregnum = $5, contact_person = $6, subei_reg_num = $7,
           no_of_trucks = $8, subdrivername = $9
       WHERE userid = $10 AND roleid = 6
       RETURNING *`,
      [
        cellnum,
        email,
        companyname,
        location,
        truckregnum,
        contact_person,
        subei_reg_num,
        no_of_trucks,
        `{${subdriverArray
          .map((name) => `"${name.replace(/"/g, '""')}"`)
          .join(",")}}`,
        id,
      ]
    );
    if (!result.rowCount) {
      return { success: false, message: "Subcontractor not found" };
    }
    return { success: true, data: result.rows[0] };
  } catch (err) {
    console.error(`Error updating subcontractor ${id}:`, err);
    throw err;
  } finally {
    if (client) client.release();
  }
};

const toggleSubcontractorStatus = async (id, status) => {
  let client;
  try {
    client = await pool.connect();
    const result = await client.query(
      `UPDATE m5_employee
       SET status = $1
       WHERE userid = $2 AND roleid = 6
       RETURNING *`,
      [status, id]
    );
    if (!result.rowCount) {
      return { success: false, message: "Subcontractor not found" };
    }
    return { success: true, data: result.rows[0] };
  } catch (err) {
    console.error(`Error toggling subcontractor ${id} status:`, err);
    throw err;
  } finally {
    if (client) client.release();
  }
};

export {
  getAllSubcontractors,
  getSubcontractorById,
  checkSubcontractorEmailExists,
  createSubcontractor,
  updateSubcontractor,
  toggleSubcontractorStatus,
};
