import express from "express";
import {
  getAllSubContractorsHandler,
  getSubContractorStatementsHandler,
  getStatementDetailsHandler,
  getCompanyInfoHandler,
  getSubcontractorInfoHandler,
  generateSubcontractorStatementHandler,
  backfillSubcontractorStatementsHandler,
  authenticateScheduledJob,
} from "../../controllers/subcontractors/subContractorController.js";
import {
  createStatementExportHandler,
  attachStatementExportDocumentHandler,
  listStatementExportsHandler,
  getStatementExportHandler,
} from "../../controllers/subcontractors/statementExportController.js";
import { verifySubcontractorStatementAccess } from "../../middleware/auth.js";
import { uploadStatementDocument } from "../../utils/s3-config.js";

const router = express.Router();

// Existing routes (keep these)
router.get("/subcontractor", getAllSubContractorsHandler);
router.get("/subcontractor/statements", getSubContractorStatementsHandler);
router.get("/subcontractor/statement-details", getStatementDetailsHandler);
router.get("/subcontractor/company-info", getCompanyInfoHandler);
router.get("/subcontractor/info", getSubcontractorInfoHandler);

// Update this route to use authenticateScheduledJob
router.post(
  "/subcontractor/generate-statement",
  authenticateScheduledJob,
  generateSubcontractorStatementHandler
);

router.post(
  "/subcontractor/backfill-statements",
  authenticateScheduledJob,
  backfillSubcontractorStatementsHandler
);

// --- Statement export snapshots -------------------------------------------
// This router is mounted below the global verifyToken guard in routes/index.js,
// so these are authenticated already; the extra guard narrows them to the roles
// that own the Creditors section (mirrors routeRoles.js: 8, 1, 4).
//
// Two-step by design: the export route derives and freezes the figures
// server-side, then the client uploads the document it rendered from them.
router.post(
  "/subcontractor/statements/export",
  verifySubcontractorStatementAccess,
  createStatementExportHandler
);

router.post(
  "/subcontractor/statements/exports/:exportId/document",
  verifySubcontractorStatementAccess,
  uploadStatementDocument.single("document"),
  attachStatementExportDocumentHandler
);

router.get(
  "/subcontractor/statements/exports",
  verifySubcontractorStatementAccess,
  listStatementExportsHandler
);

router.get(
  "/subcontractor/statements/exports/:exportId",
  verifySubcontractorStatementAccess,
  getStatementExportHandler
);

export default router;
