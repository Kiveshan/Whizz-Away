import express from "express";
import {
  getAllSubContractorsHandler,
  getSubContractorStatementsHandler,
  getStatementDetailsHandler,
  getCompanyInfoHandler,
  getSubcontractorInfoHandler,
  generateSubcontractorStatementHandler,
  authenticateScheduledJob, // Add this import
} from "../../controllers/subcontractors/subContractorController.js";
import { verifyToken } from "../../middleware/auth.js";

const router = express.Router();

// Existing routes (keep these)
router.get("/subcontractor", verifyToken, getAllSubContractorsHandler);
router.get("/subcontractor/statements", verifyToken, getSubContractorStatementsHandler);
router.get("/subcontractor/statement-details", verifyToken, getStatementDetailsHandler);
router.get("/subcontractor/company-info", verifyToken, getCompanyInfoHandler);
router.get("/subcontractor/info", verifyToken, getSubcontractorInfoHandler);

// Update this route to use authenticateScheduledJob
router.post(
  "/subcontractor/generate-statement",
  authenticateScheduledJob,
  generateSubcontractorStatementHandler
);

export default router;
