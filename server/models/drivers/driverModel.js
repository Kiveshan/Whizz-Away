import { pool, query } from "../../config/database.js";

const getAllDrivers = async (company_reg_num) => {
  const queryText = `
    SELECT userid, name, surname
    FROM m5_employee
    WHERE roleid = 5
      AND company_reg_num = $1
    ORDER BY name, surname
  `;

  const result = await query(queryText, [company_reg_num]);
  return result.rows;
};

export { getAllDrivers };
