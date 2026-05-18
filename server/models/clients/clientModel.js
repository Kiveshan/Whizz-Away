import { pool } from "../../config/database.js";

const getAllClients = async (company_reg_num) => {
  let client;
  try {
    client = await pool.connect();
    const query = `
      SELECT m5clientkey, client AS companyname, representative, cellnum, email
      FROM public.m5_client
      WHERE company_reg_num = $1
      ORDER BY companyname
    `;
    const result = await client.query(query, [company_reg_num]);
    return result.rows;
  } catch (error) {
    throw error;
  } finally {
    if (client) client.release();
  }
};

export { getAllClients };
