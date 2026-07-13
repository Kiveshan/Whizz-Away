import express from "express";
import { verifyToken, verifyAdminAccess } from "../../middleware/auth.js";
import {
  getClientStatementsHandler,
  getStatementDetailsHandler,
  generateStatementsHandler,
  regenerateStatementHandler,
  authenticateScheduledJob, // Add this import
} from "../../controllers/statements/statementController.js";

const router = express.Router();

// Existing routes (keep these)
router.get(
  "/api/statements/:clientId",
  verifyToken,
  getClientStatementsHandler
);
router.get(
  "/api/statement/:statementId",
  verifyToken,
  getStatementDetailsHandler
);

// Update this route to use authenticateScheduledJob instead of verifyToken
router.post(
  "/api/statements/generate",
  authenticateScheduledJob,
  generateStatementsHandler
);

// Admin-only: regenerate a statement for a specific past month, to correct
// aging snapshots that have drifted from live invoice/add-on data.
router.post(
  "/api/statements/regenerate",
  verifyToken,
  verifyAdminAccess,
  regenerateStatementHandler
);

export default router;
