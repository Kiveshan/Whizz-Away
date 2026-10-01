import express from "express";
import { verifyClientStatementAccess } from "../../middleware/auth.js";
import { uploadStatementDocument } from "../../utils/s3-config.js";
import {
  getClientStatementsHandler,
  getStatementDetailsHandler,
} from "../../controllers/statements/statementController.js";
import {
  createStatementExportHandler,
  attachStatementExportDocumentHandler,
  listStatementExportsHandler,
  getStatementExportHandler,
} from "../../controllers/statements/statementExportController.js";

// Mounted below the global verifyToken guard (routes/index.js), so every route
// here is authenticated already. Client statements are derived on demand, so
// there is no generate/regenerate endpoint any more.
const router = express.Router();

router.get("/api/statements/:clientId", getClientStatementsHandler);
router.get("/api/statement/:statementId", getStatementDetailsHandler);

// --- Statement export snapshots -------------------------------------------
// The extra role check narrows these to the roles that own the debtors section
// (routeRoles.js: 3,1,4).
//
// Two-step by design: the export route derives and freezes the figures
// server-side, then the client uploads the document it rendered from them.
//
// The listing routes deliberately live under /api/statement-exports rather than
// /api/statements/... — the existing GET /api/statements/:clientId would
// otherwise swallow them, matching "exports" as a client id.
router.post(
  "/api/statements/:statementId/export",
  verifyClientStatementAccess,
  createStatementExportHandler
);

router.post(
  "/api/statement-exports/:exportId/document",
  verifyClientStatementAccess,
  uploadStatementDocument.single("document"),
  attachStatementExportDocumentHandler
);

router.get(
  "/api/statement-exports",
  verifyClientStatementAccess,
  listStatementExportsHandler
);

router.get(
  "/api/statement-exports/:exportId",
  verifyClientStatementAccess,
  getStatementExportHandler
);

export default router;
