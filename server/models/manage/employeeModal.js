import { pool } from "../../config/database.js";
import bcrypt from "bcrypt";

const getEmployeeBasic = async (id) => {
  let client;
  try {
    client = await pool.connect();
    const checkQuery = `
      SELECT COUNT(*) as count
      FROM public.m5_employee
      WHERE userid = $1
    `;
    const checkResult = await client.query(checkQuery, [id]);
    if (checkResult.rows[0].count == 0) {
      return { success: false, message: `No employee found with ID ${id}` };
    }

    const query = `
      SELECT 
        e.userid, 
        e.name, 
        e.surname, 
        e.cellnum, 
        e.base_salary,
        r.rolename
      FROM 
        public.m5_employee e
      LEFT JOIN 
        public.roles r ON e.roleid = r.roleid
      WHERE 
        e.userid = $1
    `;
    const result = await client.query(query, [id]);
    return { success: true, data: result.rows[0] };
  } catch (error) {
    console.error(`Error fetching employee data for ID ${id}:`, error);
    throw error;
  } finally {
    if (client) client.release();
  }
};

const getAllEmployees = async () => {
  let client;
  try {
    client = await pool.connect();
    const query = `
      SELECT
        e.*,
        r.rolename,
        edh.income_tax_rate,
        edh.deduction_other_deductions,
        edh.deduction_uif,
        edh.deduction_bonus,
        edh.deduction_savings,
        edh.deduction_loan,
        edh.deduction_damage,
        edh.effective_date
      FROM m5_employee e
      JOIN roles r ON e.roleid = r.roleid
      LEFT JOIN employee_deduction_history edh ON e.userid = edh.employeeid
      WHERE e.roleid != 6
      ORDER BY e.userid
    `;
    const result = await client.query(query);
    return result.rows;
  } catch (err) {
    console.error("Error fetching employees:", err);
    throw err;
  } finally {
    if (client) client.release();
  }
};

const checkEmployeeEmailExists = async (email) => {
  let client;
  try {
    client = await pool.connect();
    const result = await client.query(
      "SELECT 1 FROM m5_employee WHERE email = $1",
      [email]
    );
    return result.rows.length > 0;
  } catch (err) {
    console.error("Error checking email existence:", err);
    throw err;
  } finally {
    if (client) client.release();
  }
};

const createEmployee = async (employeeData, documentUrls) => {
  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");

    const {
      name,
      surname,
      telephonenum,
      cellnum,
      employeenum,
      roleid,
      email,
      password,
      base_salary,
      company_reg_num,
      income_tax_rate,
      deduction_other_deductions,
      deduction_uif,
      deduction_bonus,
      deduction_savings,
      deduction_loan,
      deduction_damage,
    } = employeeData;

    const hashedPassword = await bcrypt.hash(password, 10);
    const deductionDate = new Date();

    const insertEmployeeQuery = `
      INSERT INTO m5_employee (
        name, surname, telephonenum, cellnum, employeenum,
        roleid, email, password, base_salary, company_reg_num, status,
        document_url1, document_url2, document_url3
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true,
        $11, $12, $13
      ) RETURNING *
    `;
    const insertValues = [
      name,
      surname,
      telephonenum,
      cellnum,
      employeenum,
      roleid,
      email,
      hashedPassword,
      base_salary,
      company_reg_num,
      documentUrls[0],
      documentUrls[1],
      documentUrls[2],
    ];
    const result = await client.query(insertEmployeeQuery, insertValues);
    const newEmployee = result.rows[0];

    const insertHistoryQuery = `
      INSERT INTO employee_deduction_history (
        employeeid, effective_date, income_tax_rate,
        deduction_other_deductions, deduction_uif, deduction_bonus,
        deduction_savings, deduction_loan, deduction_damage
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;
    const historyValues = [
      newEmployee.userid,
      deductionDate,
      parseFloat(income_tax_rate || 0),
      parseFloat(deduction_other_deductions || 0),
      parseFloat(deduction_uif || 0),
      parseFloat(deduction_bonus || 0),
      parseFloat(deduction_savings || 0),
      parseFloat(deduction_loan || 0),
      parseFloat(deduction_damage || 0),
    ];
    await client.query(insertHistoryQuery, historyValues);

    await client.query("COMMIT");
    return newEmployee;
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error creating employee:", err);
    throw err;
  } finally {
    if (client) client.release();
  }
};

const updateEmployee = async (id, employeeData, documentUrls) => {
  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");

    const {
      name,
      surname,
      telephonenum,
      cellnum,
      employeenum,
      roleid,
      email,
      password,
      base_salary,
      income_tax_rate,
      deduction_other_deductions,
      deduction_uif,
      deduction_bonus,
      deduction_savings,
      deduction_loan,
      deduction_damage,
    } = employeeData;

    const existingResult = await client.query(
      "SELECT document_url1, document_url2, document_url3 FROM m5_employee WHERE userid = $1",
      [id]
    );
    if (!existingResult.rows.length) {
      throw new Error("Employee not found");
    }

    let { document_url1, document_url2, document_url3 } =
      existingResult.rows[0];
    let currentDocs = [document_url1, document_url2, document_url3];

    let newIndex = 0;
    for (
      let i = 0;
      i < currentDocs.length && newIndex < documentUrls.length;
      i++
    ) {
      if (!currentDocs[i]) {
        currentDocs[i] = documentUrls[newIndex];
        newIndex++;
      }
    }
    if (newIndex < documentUrls.length) {
      for (
        let i = 0;
        i < currentDocs.length && newIndex < documentUrls.length;
        i++
      ) {
        currentDocs[i] = documentUrls[newIndex];
        newIndex++;
      }
    }

    [document_url1, document_url2, document_url3] = currentDocs;

    let hashedPassword;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    } else {
      const { rows } = await client.query(
        "SELECT password FROM m5_employee WHERE userid = $1",
        [id]
      );
      if (!rows.length) throw new Error("Employee not found");
      hashedPassword = rows[0].password;
    }

    const updateEmpQuery = `
      UPDATE m5_employee SET
        name = $1, surname = $2, telephonenum = $3, cellnum = $4, employeenum = $5,
        roleid = $6, email = $7, password = $8, base_salary = $9,
        document_url1 = $10, document_url2 = $11, document_url3 = $12
      WHERE userid = $13
      RETURNING *
    `;
    const updateValues = [
      name,
      surname,
      telephonenum,
      cellnum,
      employeenum,
      roleid,
      email,
      hashedPassword,
      base_salary,
      document_url1,
      document_url2,
      document_url3,
      id,
    ];
    const result = await client.query(updateEmpQuery, updateValues);
    const updatedEmployee = result.rows[0];

    const newValues = {
      income_tax: parseFloat(income_tax_rate || 0),
      other: parseFloat(deduction_other_deductions || 0),
      uif: parseFloat(deduction_uif || 0),
      bonus: parseFloat(deduction_bonus || 0),
      savings: parseFloat(deduction_savings || 0),
      loan: parseFloat(deduction_loan || 0),
      damage: parseFloat(deduction_damage || 0),
    };

    const { rows: lastRows } = await client.query(
      `SELECT * FROM employee_deduction_history
       WHERE employeeid = $1
       ORDER BY effective_date DESC
       LIMIT 1`,
      [id]
    );
    const last = lastRows[0];
    const isDuplicate =
      last &&
      newValues.income_tax === parseFloat(last.income_tax_rate) &&
      newValues.other === parseFloat(last.deduction_other_deductions) &&
      newValues.uif === parseFloat(last.deduction_uif) &&
      newValues.bonus === parseFloat(last.deduction_bonus) &&
      newValues.savings === parseFloat(last.deduction_savings) &&
      newValues.loan === parseFloat(last.deduction_loan) &&
      newValues.damage === parseFloat(last.deduction_damage);

    if (!isDuplicate) {
      const insertHistoryQuery = `
        INSERT INTO employee_deduction_history (
          employeeid, effective_date, income_tax_rate, deduction_other_deductions,
          deduction_uif, deduction_bonus, deduction_savings,
          deduction_loan, deduction_damage
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `;
      const deductionDate = new Date();
      const historyValues = [
        updatedEmployee.userid,
        deductionDate,
        newValues.income_tax,
        newValues.other,
        newValues.uif,
        newValues.bonus,
        newValues.savings,
        newValues.loan,
        newValues.damage,
      ];
      await client.query(insertHistoryQuery, historyValues);
    }

    await client.query("COMMIT");
    return updatedEmployee;
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error updating employee:", err);
    throw err;
  } finally {
    if (client) client.release();
  }
};

const toggleEmployeeStatus = async (id, status) => {
  let client;
  try {
    client = await pool.connect();
    const checkResult = await client.query(
      "SELECT * FROM m5_employee WHERE userid = $1",
      [id]
    );
    if (!checkResult.rows.length) {
      return { success: false, message: "Employee not found" };
    }
    const updateResult = await client.query(
      "UPDATE m5_employee SET status = $1 WHERE userid = $2 RETURNING *",
      [status, id]
    );
    return { success: true, data: updateResult.rows[0] };
  } catch (err) {
    console.error(`Error toggling employee ${id} status:`, err);
    throw err;
  } finally {
    if (client) client.release();
  }
};

const getEmployeeDetails = async (id) => {
  let client;
  try {
    client = await pool.connect();
    const result = await client.query(
      "SELECT * FROM m5_employee WHERE userid = $1",
      [id]
    );
    if (!result.rows.length) {
      return { success: false, message: "Employee not found" };
    }
    const employee = result.rows[0];
    const historyResult = await client.query(
      "SELECT * FROM employee_deduction_history WHERE employeeid = $1 ORDER BY effective_date DESC, history_id DESC",
      [id]
    );
    employee.deductionHistory = historyResult.rows;
    return { success: true, data: employee };
  } catch (err) {
    console.error("Error fetching employee details:", err);
    throw err;
  } finally {
    if (client) client.release();
  }
};

const deleteEmployeeDocument = async (employeeId, url) => {
  let client;
  try {
    client = await pool.connect();
    const { rows } = await client.query(
      "SELECT document_url1, document_url2, document_url3 FROM m5_employee WHERE userid = $1",
      [employeeId]
    );
    if (!rows.length) {
      return { success: false, message: "Employee not found" };
    }

    let updateField = null;
    const storedUrls = [
      rows[0].document_url1,
      rows[0].document_url2,
      rows[0].document_url3,
    ];
    for (let i = 0; i < storedUrls.length; i++) {
      if (
        storedUrls[i] === url ||
        decodeURIComponent(new URL(storedUrls[i]).pathname.substring(1)) === url
      ) {
        updateField = `document_url${i + 1}`;
        break;
      }
    }

    if (updateField) {
      await client.query(
        `UPDATE m5_employee SET ${updateField} = NULL WHERE userid = $1`,
        [employeeId]
      );
      return { success: true, message: "Document deleted successfully" };
    }
    return { success: false, message: "No matching document URL found" };
  } catch (err) {
    console.error("Error deleting employee document:", err);
    throw err;
  } finally {
    if (client) client.release();
  }
};

export {
  getEmployeeBasic,
  getAllEmployees,
  checkEmployeeEmailExists,
  createEmployee,
  updateEmployee,
  toggleEmployeeStatus,
  getEmployeeDetails,
  deleteEmployeeDocument,
};
