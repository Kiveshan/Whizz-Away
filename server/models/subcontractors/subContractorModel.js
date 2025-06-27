import { pool } from "../../config/database.js";

const getAllSubContractors = async () => {
  let client;
  try {
    client = await pool.connect();
    const query = `
      SELECT 
        companyname,
        location,
        contact_person,
        MIN(userid) as min_userid,
        cellnum,
        email,
        subei_reg_num
      FROM 
        m5_employee
      WHERE 
        companyname IS NOT NULL 
        AND companyname != ''
        AND location IS NOT NULL 
        AND location != ''
        AND contact_person IS NOT NULL 
        AND contact_person != ''
        AND status = true
      GROUP BY companyname, location, contact_person, cellnum, email, subei_reg_num
      ORDER BY companyname
    `;
    const result = await client.query(query);
    return result.rows;
  } catch (error) {
    throw error;
  } finally {
    if (client) client.release();
  }
};

const getSubContractorStatements = async (subei_reg_num, year, month) => {
  let client;
  try {
    client = await pool.connect();
    const query = `
      SELECT 
        sub_state_id,
        subbie_reg_num,
        date,
        amount,
        legids
      FROM 
        subcontractor_statements
      WHERE 
        subbie_reg_num = $1
        AND ($2::text IS NULL OR EXTRACT(YEAR FROM date) = $2::integer)
        AND ($3::text IS NULL OR EXTRACT(MONTH FROM date) = $3::integer)
      ORDER BY 
        date DESC
    `;
    const values = [subei_reg_num, year || null, month || null];
    const result = await client.query(query, values);
    return result.rows;
  } catch (error) {
    throw error;
  } finally {
    if (client) client.release();
  }
};

const getStatementLegIds = async (statementId, subei_reg_num) => {
  let client;
  try {
    client = await pool.connect();
    const query = `
      SELECT legids 
      FROM subcontractor_statements 
      WHERE subbie_reg_num = $1 AND sub_state_id = $2
    `;
    const values = [subei_reg_num, statementId];
    const result = await client.query(query, values);
    return result.rows.length > 0 ? result.rows[0].legids : null;
  } catch (error) {
    throw error;
  } finally {
    if (client) client.release();
  }
};

const getStatementDetails = async (statementId, legKeys, subei_reg_num) => {
  let client;
  try {
    client = await pool.connect();
    // Fetch legids to extract additional legkeys
    const legids = await getStatementLegIds(statementId, subei_reg_num);
    let allLegKeys = [...legKeys];

    if (legids && Array.isArray(legids)) {
      try {
        const additionalLegKeys = legids
          .map((item) => item.legkey)
          .filter((key) => !allLegKeys.includes(key));
        allLegKeys = [...allLegKeys, ...additionalLegKeys];
      } catch (e) {
        console.error("Failed to process legids array:", e, "legids:", legids);
      }
    } else if (legids) {
      console.warn("legids is not an array:", legids);
    }

    const query = `
      SELECT 
        l.legkey,
        l.date,
        l.startingpoint,
        l.destination,
        l.driverrate,
        m1.description AS m1_description
      FROM 
        legs_m2 l
      LEFT JOIN 
        m1_controller m1 ON l.m1key = m1.m1key
      WHERE l.legkey = ANY($1)
    `;
    console.log("Executing query with legKeys:", allLegKeys);
    const values = [allLegKeys];
    const result = await client.query(query, values);
    console.log(`Found ${result.rows.length} leg details`);
    return result.rows;
  } catch (error) {
    throw error;
  } finally {
    if (client) client.release();
  }
};

export {
  getAllSubContractors,
  getSubContractorStatements,
  getStatementDetails,
  getStatementLegIds,
};
