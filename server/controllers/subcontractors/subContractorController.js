import {
  getAllSubContractors,
  getSubContractorStatements,
  getStatementDetails,
  getCompanyInfo,
  getSubcontractorInfo,
} from "../../models/subcontractors/subContractorModel.js";
import { generateCurrentMonthStatements } from "../../utils/subcontractorStatementGeneration.js";
import { verifyToken } from "../../middleware/auth.js";

const authenticateScheduledJob = (req, res, next) => {
  // Check if it's a scheduled job first (API_SECRET)
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (token === process.env.API_SECRET) {
    console.log("Authenticated scheduled job request");
    req.isScheduledJob = true;
    return next();
  }

  // If not API_SECRET, use existing verifyToken middleware
  req.isScheduledJob = false;
  return verifyToken(req, res, next);
};

const getAllSubContractorsHandler = async (req, res) => {
  try {
    console.log("Fetching subcontractors from database...");
    const subcontractors = await getAllSubContractors(req.user.company_reg_num);
    console.log(`Found ${subcontractors.length} subcontractors`);
    res.json(subcontractors);
  } catch (error) {
    console.error("Error fetching subcontractors:", error);
    res.status(500).json({ error: error.message });
  }
};

const getSubContractorStatementsHandler = async (req, res) => {
  try {
    const { subei_reg_num, year, month } = req.query;

    if (!subei_reg_num) {
      return res
        .status(400)
        .json({ error: "Subcontractor registration number is required" });
    }

    console.log(
      `Fetching statements for subei_reg_num: ${subei_reg_num}, year: ${year}, month: ${month}...`
    );
    const statements = await getSubContractorStatements(
      subei_reg_num,
      year,
      month,
      req.user.company_reg_num
    );
    console.log(`Found ${statements.length} statements`);
    res.json(statements);
  } catch (error) {
    console.error("Error fetching statements:", error);
    res.status(500).json({ error: error.message });
  }
};

const getStatementDetailsHandler = async (req, res) => {
  try {
    const { statementId, legKeys, subei_reg_num } = req.query;

    if (!statementId || !legKeys || !subei_reg_num) {
      return res.status(400).json({
        error: "Statement ID, leg keys, and registration number are required",
      });
    }

    console.log("Query params:", req.query); // Debug log
    const legKeysArray = legKeys.split(",").map(Number);
    const details = await getStatementDetails(
      statementId,
      legKeysArray,
      subei_reg_num,
      req.user.company_reg_num
    );
    console.log(`Found ${details.length} leg details`);
    res.json(details);
  } catch (error) {
    console.error("Error fetching statement details:", error);
    res.status(500).json({ error: error.message });
  }
};

const getCompanyInfoHandler = async (req, res) => {
  try {
    const { roleid, status } = req.query;
    const companyInfo = await getCompanyInfo(roleid, status, req.user.company_reg_num);
    res.json(companyInfo);
  } catch (error) {
    console.error("Error fetching company info:", error);
    res.status(500).json({ error: error.message });
  }
};

const getSubcontractorInfoHandler = async (req, res) => {
  try {
    const { subei_reg_num } = req.query;
    if (!subei_reg_num) {
      return res
        .status(400)
        .json({ error: "Subcontractor registration number is required" });
    }
    const subInfo = await getSubcontractorInfo(subei_reg_num, req.user.company_reg_num);
    res.json(subInfo);
  } catch (error) {
    console.error("Error fetching subcontractor info:", error);
    res.status(500).json({ error: error.message });
  }
};

const generateSubcontractorStatementHandler = async (req, res) => {
  try {
    const { subei_reg_num, specificSubcontractor } = req.body;

    console.log(
      `Manual subcontractor statement generation requested${
        specificSubcontractor
          ? ` for subcontractor ${subei_reg_num}`
          : " for all subcontractors"
      }`
    );

    // Validate input for specific subcontractor generation
    if (specificSubcontractor && !subei_reg_num) {
      return res.status(400).json({
        success: false,
        message:
          "Subcontractor registration number is required for specific subcontractor generation",
      });
    }

    // Call the statement generation function
    const result = await generateCurrentMonthStatements(
      specificSubcontractor ? subei_reg_num : null
    );

    console.log(
      `Subcontractor statement generation completed: ${result.message}`
    );

    res.json(result);
  } catch (error) {
    console.error("Error in manual subcontractor statement generation:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during statement generation",
      error:
        process.env.NODE_ENV === "production"
          ? "Internal server error"
          : error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
};

export {
  getAllSubContractorsHandler,
  getSubContractorStatementsHandler,
  getStatementDetailsHandler,
  getCompanyInfoHandler,
  getSubcontractorInfoHandler,
  generateSubcontractorStatementHandler,
  authenticateScheduledJob,
};
