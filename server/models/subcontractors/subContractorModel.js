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

export { getAllSubContractors, getSubContractorStatements };
