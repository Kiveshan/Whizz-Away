import {
  getClientStatements,
  getStatementDetails,
} from "../../models/statements/statementModel.js";
import { generateMonthlyStatements } from "../../utils/statementGenerator.js";
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

const getClientStatementsHandler = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { year, month } = req.query;

    console.log(
      `Fetching statements for client ${clientId} with query:`,
      req.query
    );

    const result = await getClientStatements(clientId, { year, month }, req.user.company_reg_num);
    console.log(
      `Query returned ${result.data.length} statements for client ${clientId}`
    );

    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error(
      `Error fetching statements for client ${req.params.clientId}:`,
      error
    );
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
};

const getStatementDetailsHandler = async (req, res) => {
  try {
    const { statementId } = req.params;
    console.log(`Fetching statement details for statement ${statementId}`);

    const result = await getStatementDetails(statementId, req.user.company_reg_num);
    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.message,
      });
    }

    const generationDate = new Date(result.data.generation_date);
    const statementMonth =
      generationDate.getMonth() === 0 ? 11 : generationDate.getMonth() - 1;
    const statementYear =
      generationDate.getMonth() === 0
        ? generationDate.getFullYear() - 1
        : generationDate.getFullYear();
    const statementStartDate = new Date(
      statementYear,
      statementMonth,
      1,
      12,
      0,
      0
    );
    const statementEndDate = new Date(
      statementYear,
      statementMonth + 1,
      0,
      12,
      0,
      0
    );
    const formattedStatementStartDate = statementStartDate
      .toISOString()
      .split("T")[0];
    const formattedStatementEndDate = statementEndDate
      .toISOString()
      .split("T")[0];

    console.log(
      `Statement period (invoices): ${formattedStatementStartDate} to ${formattedStatementEndDate}`
    );

    const paymentMonth = statementMonth === 0 ? 11 : statementMonth - 1;
    const paymentYear =
      statementMonth === 0 ? statementYear - 1 : statementYear;
    const paymentStartDate = new Date(paymentYear, paymentMonth, 1, 12, 0, 0);
    const paymentEndDate = new Date(paymentYear, paymentMonth + 1, 0, 12, 0, 0);
    const formattedPaymentStartDate = paymentStartDate
      .toISOString()
      .split("T")[0];
    const formattedPaymentEndDate = paymentEndDate.toISOString().split("T")[0];

    console.log(
      `Payment period: ${formattedPaymentStartDate} to ${formattedPaymentEndDate}`
    );

    console.log(
      `Fetched statement ${statementId} with opening balance R${result.data.opening_balance}, ${result.data.invoices.length} invoices, and ${result.data.payments.length} payments`
    );

    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error(`Error fetching statement ${req.params.statementId}:`, error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
};

const generateStatementsHandler = async (req, res) => {
  try {
    // ── Scheduled job path: loop every active tenant ──────────────────────
    if (req.isScheduledJob) {
      console.log("Scheduled statement generation: fetching all active companies...");

      const companies = await getAllActiveCompanies();
      console.log(`Found ${companies.length} active companies to process`);

      const companyResults = [];
      let totalProcessed = 0, totalCreated = 0, totalUpdated = 0;

      for (const { company_reg_num, companyname } of companies) {
        try {
          console.log(`Processing client statements for company: ${companyname} (${company_reg_num})`);
          const result = await generateMonthlyStatements(null, company_reg_num);
          companyResults.push({ company_reg_num, companyname, success: true, stats: result.stats });
          totalProcessed += result.stats.processed;
          totalCreated   += result.stats.created;
          totalUpdated   += result.stats.updated;
        } catch (companyError) {
          // Log failure but continue with remaining companies
          console.error(`Failed to generate statements for ${companyname} (${company_reg_num}):`, companyError.message);
          companyResults.push({ company_reg_num, companyname, success: false, error: companyError.message });
        }
      }

      const failures = companyResults.filter((r) => !r.success);
      console.log(
        `Scheduled statement generation complete. Companies: ${companies.length}, ` +
        `Failures: ${failures.length}, Processed: ${totalProcessed}, Created: ${totalCreated}, Updated: ${totalUpdated}`
      );

      return res.json({
        success: failures.length === 0,
        message: `Scheduled generation complete. ${companies.length} companies processed, ${failures.length} failed.`,
        stats: { processed: totalProcessed, created: totalCreated, updated: totalUpdated },
        companies: companyResults,
      });
    }

    // ── Manual / JWT path: single tenant ─────────────────────────────────
    const { clientId, specificClient } = req.body;

    console.log(
      `Manual statement generation requested${
        specificClient ? ` for client ${clientId}` : " for all clients"
      }`
    );

    if (specificClient && !clientId) {
      return res.status(400).json({
        success: false,
        message: "Client ID is required for specific client generation",
      });
    }

    const result = await generateMonthlyStatements(
      specificClient ? clientId : null,
      req.user.company_reg_num
    );

    console.log(`Statement generation completed: ${result.message}`);
    res.json(result);

  } catch (error) {
    console.error("Error in statement generation:", error);
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
  getClientStatementsHandler,
  getStatementDetailsHandler,
  generateStatementsHandler,
  authenticateScheduledJob,
};
