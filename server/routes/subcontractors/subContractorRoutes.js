import express from "express";
import {
  getAllSubContractorsHandler,
  getSubContractorStatementsHandler,
  getStatementDetailsHandler,
  getCompanyInfoHandler,
  getSubcontractorInfoHandler,
  generateSubcontractorStatementHandler,
} from "../../controllers/subcontractors/subContractorController.js";

const router = express.Router();

// Get all subcontractors
router.get("/subcontractor", getAllSubContractorsHandler);

// Get statements for a specific subcontractor
router.get("/subcontractor/statements", getSubContractorStatementsHandler);

// Get details for a specific statement
router.get("/subcontractor/statement-details", getStatementDetailsHandler);

// Get company information
router.get("/subcontractor/company-info", getCompanyInfoHandler);

// Get subcontractor information
router.get("/subcontractor/info", getSubcontractorInfoHandler);

// Generate subcontractor statements (manual trigger)
router.post(
  "/subcontractor/generate-statement",
  generateSubcontractorStatementHandler
);

export default router;
