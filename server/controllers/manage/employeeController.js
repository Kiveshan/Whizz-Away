import {
  getEmployeeBasic,
  getAllEmployees,
  checkEmployeeEmailExists,
  createEmployee,
  updateEmployee,
  toggleEmployeeStatus,
  getEmployeeDetails,
  deleteEmployeeDocument,
} from "../../models/manage/employeeModal.js";
import { s3ClientEmployees } from "../../utils/s3Config.js";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const getEmployeeBasicHandler = async (req, res) => {
  try {
    // Remove the unnecessary split operation and validate the ID
    const id = req.params.id;

    // Validate that the ID is a number
    if (isNaN(Number.parseInt(id))) {
      return res.status(400).json({
        error: "Invalid employee ID",
        message: "Employee ID must be a number",
      });
    }

    console.log(`Fetching basic employee data for ID ${id}`);
    const result = await getEmployeeBasic(Number.parseInt(id));
    if (!result.success) {
      return res.status(404).json({
        error: "Employee not found",
        message: result.message,
      });
    }
    console.log(`Found employee data for ID ${id}:`, result.data);
    res.json(result.data);
  } catch (error) {
    console.error(
      `Error fetching employee data for ID ${req.params.id}:`,
      error
    );
    res.status(500).json({
      error: "An error occurred while fetching employee data",
      message: error.message,
    });
  }
};

const getAllEmployeesHandler = async (req, res) => {
  try {
    console.log("Fetching all employees");
    const employees = await getAllEmployees();
    res.json(employees);
  } catch (err) {
    console.error("Error fetching employees:", err);
    res.status(500).json({ error: "Failed to fetch employees" });
  }
};

const checkEmployeeEmailExistsHandler = async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ error: "Email parameter is required" });
    }
    const exists = await checkEmployeeEmailExists(email);
    res.json({ exists });
  } catch (err) {
    console.error("Error checking email existence:", err);
    res.status(500).json({ error: "Failed to check email existence" });
  }
};

const createEmployeeHandler = async (req, res) => {
  try {
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
    } = req.body;

    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }

    const company_reg_num = req.user.company_reg_num;
    if (!company_reg_num) {
      return res
        .status(400)
        .json({ error: "Missing company registration number" });
    }

    const urls = (req.files || []).map((f) => f.location);
    while (urls.length < 3) urls.push(null);

    console.log("Creating employee with data:", req.body);
    const newEmployee = await createEmployee(
      {
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
      },
      urls
    );
    res.status(201).json(newEmployee);
  } catch (err) {
    console.error("Error in /api/employees POST:", err);
    res.status(500).json({ error: "Failed to create employee" });
  }
};

const updateEmployeeHandler = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate that the ID is a number
    if (isNaN(Number.parseInt(id))) {
      return res.status(400).json({
        error: "Invalid employee ID",
        message: "Employee ID must be a number",
      });
    }

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
    } = req.body;

    const newFileUrls = (req.files || []).map((f) => f.location);

    console.log(`Updating employee ID ${id}`);
    const updatedEmployee = await updateEmployee(
      Number.parseInt(id),
      {
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
      },
      newFileUrls
    );
    res.json(updatedEmployee);
  } catch (err) {
    console.error("Error updating employee:", err);
    res.status(500).json({ error: err.message || "Failed to update employee" });
  }
};

const toggleEmployeeStatusHandler = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate that the ID is a number
    if (isNaN(Number.parseInt(id))) {
      return res.status(400).json({
        error: "Invalid employee ID",
        message: "Employee ID must be a number",
      });
    }

    const { status } = req.body;
    console.log(`Toggling status for employee ID ${id} to ${status}`);
    const result = await toggleEmployeeStatus(Number.parseInt(id), status);
    if (!result.success) {
      return res.status(404).json({ message: result.message });
    }
    res.json(result.data);
  } catch (err) {
    console.error(`Error toggling employee ${req.params.id} status:`, err);
    res.status(500).json({ error: "Failed to toggle employee status" });
  }
};

const getEmployeeDetailsHandler = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate that the ID is a number
    if (isNaN(Number.parseInt(id))) {
      return res.status(400).json({
        error: "Invalid employee ID",
        message: "Employee ID must be a number",
      });
    }

    console.log(`Fetching detailed employee data for ID ${id}`);
    const result = await getEmployeeDetails(Number.parseInt(id));
    if (!result.success) {
      return res.status(404).json({ error: result.message });
    }
    const employee = result.data;

    const extractKeyFromUrl = (url) => {
      if (!url) return null;
      try {
        return decodeURIComponent(new URL(url).pathname.substring(1));
      } catch (error) {
        return url;
      }
    };

    const signedUrls = await Promise.all(
      [
        employee.document_url1,
        employee.document_url2,
        employee.document_url3,
      ].map(async (url) => {
        if (!url) return null;
        const key = extractKeyFromUrl(url);
        const command = new GetObjectCommand({
          Bucket: process.env.Employee_AWS_BUCKET_NAME,
          Key: key,
        });
        return await getSignedUrl(s3ClientEmployees, command, {
          expiresIn: 3600,
        });
      })
    );

    employee.document_url1 = signedUrls[0];
    employee.document_url2 = signedUrls[1];
    employee.document_url3 = signedUrls[2];

    res.json(employee);
  } catch (err) {
    console.error("Error fetching employee details:", err);
    res.status(500).json({ error: "Failed to fetch employee details" });
  }
};

const deleteEmployeeDocumentHandler = async (req, res) => {
  try {
    const { employeeId, url } = req.body;
    if (!employeeId || !url) {
      return res
        .status(400)
        .json({ message: "Missing employee ID or document URL" });
    }

    // Validate that the employeeId is a number
    if (isNaN(Number.parseInt(employeeId))) {
      return res.status(400).json({
        error: "Invalid employee ID",
        message: "Employee ID must be a number",
      });
    }

    console.log(`Deleting document for employee ID ${employeeId}`);
    let s3Key;
    try {
      s3Key = decodeURIComponent(new URL(url).pathname.substring(1));
    } catch (error) {
      s3Key = url;
    }

    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    await s3ClientEmployees.send(
      new DeleteObjectCommand({
        Bucket: process.env.Employee_AWS_BUCKET_NAME,
        Key: s3Key,
      })
    );

    const result = await deleteEmployeeDocument(
      Number.parseInt(employeeId),
      s3Key
    );
    if (!result.success) {
      return res.status(404).json({ message: result.message });
    }
    res.json({ message: result.message });
  } catch (error) {
    console.error("Failed to delete employee document:", error);
    res.status(500).json({ message: "Server error during document deletion" });
  }
};

export {
  getEmployeeBasicHandler,
  getAllEmployeesHandler,
  checkEmployeeEmailExistsHandler,
  createEmployeeHandler,
  updateEmployeeHandler,
  toggleEmployeeStatusHandler,
  getEmployeeDetailsHandler,
  deleteEmployeeDocumentHandler,
};
