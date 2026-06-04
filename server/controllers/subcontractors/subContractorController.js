import {
  getAllSubContractors,
  getSubContractorStatements,
  getStatementDetails,
  getCompanyInfo,
  getSubcontractorInfo,
} from "../../models/subcontractors/subContractorModel.js";
import { generateCurrentMonthStatements, generateStatementsForMonth } from "../../utils/subcontractorStatementGeneration.js";
import { getAllActiveCompanies } from "../../models/billing/subscriptionModel.js";
import { verifyToken } from "../../middleware/auth.js";

const authenticateScheduledJob = (req, res, next) => {
  // Check if it's a scheduled job first (API_SECRET)
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (process.env.API_SECRET && token === process.env.API_SECRET) {
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
    // ── Scheduled job path: loop every active tenant ──────────────────────
    if (req.isScheduledJob) {
      console.log("Scheduled subcontractor statement generation: fetching all active companies...");

      const companies = await getAllActiveCompanies();
      console.log(`Found ${companies.length} active companies to process`);

      const companyResults = [];
      let totalProcessed = 0, totalCreated = 0, totalUpdated = 0;

      for (const { company_reg_num, companyname } of companies) {
        try {
          console.log(`Processing subcontractor statements for company: ${companyname} (${company_reg_num})`);
          const result = await generateCurrentMonthStatements(null, company_reg_num);
          companyResults.push({ company_reg_num, companyname, success: true, stats: result.stats });
          totalProcessed += result.stats?.processed ?? 0;
          totalCreated   += result.stats?.created   ?? 0;
          totalUpdated   += result.stats?.updated   ?? 0;
        } catch (companyError) {
          // Log failure but continue with remaining companies
          console.error(`Failed to generate subcontractor statements for ${companyname} (${company_reg_num}):`, companyError.message);
          companyResults.push({ company_reg_num, companyname, success: false, error: companyError.message });
        }
      }

      const failures = companyResults.filter((r) => !r.success);
      console.log(
        `Scheduled subcontractor generation complete. Companies: ${companies.length}, ` +
        `Failures: ${failures.length}, Processed: ${totalProcessed}, Created: ${totalCreated}, Updated: ${totalUpdated}`
      );

      return res.json({
        success: failures.length === 0,
        message: `Scheduled subcontractor generation complete. ${companies.length} companies processed, ${failures.length} failed.`,
        stats: { processed: totalProcessed, created: totalCreated, updated: totalUpdated },
        companies: companyResults,
      });
    }

    // ── Manual / JWT path: single tenant ─────────────────────────────────
    const { subei_reg_num, specificSubcontractor } = req.body;

    console.log(
      `Manual subcontractor statement generation requested${
        specificSubcontractor
          ? ` for subcontractor ${subei_reg_num}`
          : " for all subcontractors"
      }`
    );

    if (specificSubcontractor && !subei_reg_num) {
      return res.status(400).json({
        success: false,
        message:
          "Subcontractor registration number is required for specific subcontractor generation",
      });
    }

    const result = await generateCurrentMonthStatements(
      specificSubcontractor ? subei_reg_num : null,
      req.user.company_reg_num
    );

    console.log(`Subcontractor statement generation completed: ${result.message}`);
    res.json(result);

  } catch (error) {
    console.error("Error in subcontractor statement generation:", error);
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

const backfillSubcontractorStatementsHandler = async (req, res) => {
  try {
    const { fromYear, fromMonth, toYear, toMonth, subei_reg_num } = req.body;

    if (!fromYear || !fromMonth || !toYear || !toMonth) {
      return res.status(400).json({
        success: false,
        message: "fromYear, fromMonth, toYear and toMonth are all required",
      });
    }

    const results = [];
    let y = parseInt(fromYear);
    let m = parseInt(fromMonth);
    const endYear = parseInt(toYear);
    const endMonth = parseInt(toMonth);

    while (y < endYear || (y === endYear && m <= endMonth)) {
      const label = `${y}-${String(m).padStart(2, "0")}`;
      try {
        const result = await generateStatementsForMonth(y, m, subei_reg_num || null);
        results.push({ month: label, success: true, stats: result.stats });
        console.log(`Backfill ${label}: ${result.message}`);
      } catch (err) {
        results.push({ month: label, success: false, error: err.message });
        console.error(`Backfill ${label} failed:`, err.message);
      }
      m++;
      if (m > 12) { m = 1; y++; }
    }

    const failed = results.filter((r) => !r.success);
    res.json({
      success: true,
      message: `Backfill complete. ${results.length - failed.length}/${results.length} months succeeded.`,
      results,
    });
  } catch (error) {
    console.error("Error in backfill handler:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during backfill",
      error: process.env.NODE_ENV === "production" ? "Internal server error" : error.message,
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
  backfillSubcontractorStatementsHandler,
  authenticateScheduledJob,
};
