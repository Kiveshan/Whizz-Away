import {
  getAllSubContractors,
  getSubContractorStatements,
  getStatementDetails,
  getStatementLegIds,
} from "../../models/subcontractors/subContractorModel.js";

const getAllSubContractorsHandler = async (req, res) => {
  try {
    console.log("Fetching subcontractors from database...");
    const subcontractors = await getAllSubContractors();
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
      month
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
      subei_reg_num
    );
    console.log(`Found ${details.length} leg details`);
    res.json(details);
  } catch (error) {
    console.error("Error fetching statement details:", error);
    res.status(500).json({ error: error.message });
  }
};

export {
  getAllSubContractorsHandler,
  getSubContractorStatementsHandler,
  getStatementDetailsHandler,
};
