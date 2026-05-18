import { pool } from "../../config/database.js";

const getEmployeeById = async (id, company_reg_num) => {
  let client;
  try {
    client = await pool.connect();

    const queryText = `
      SELECT
        e.userid,
        e.name,
        e.surname,
        e.cellnum,
        e.base_salary,
        r.rolename
      FROM
        public.m5_employee e
      JOIN
        public.roles r ON e.roleid = r.roleid
      WHERE
        e.userid = $1
        AND e.company_reg_num = $2
    `;

    const result = await client.query(queryText, [id, company_reg_num]);

    if (result.rows.length === 0) {
      return { success: false, message: "Employee not found" };
    }

    return { success: true, data: result.rows[0] };
  } finally {
    if (client) client.release();
  }
};

export { getEmployeeById };
