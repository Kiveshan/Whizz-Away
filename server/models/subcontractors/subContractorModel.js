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
        email
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
      GROUP BY companyname, location, contact_person, cellnum, email
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

export { getAllSubContractors };
