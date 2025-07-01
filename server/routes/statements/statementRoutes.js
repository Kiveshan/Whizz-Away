import express from "express";
import { verifyToken } from "../../middleware/auth.js";
import {
  getClientStatementsHandler,
  getStatementDetailsHandler,
  generateStatementsHandler,
} from "../../controllers/statements/statementController.js";

const router = express.Router();

// Get statements for a specific client
router.get(
  "/api/statements/:clientId",
  verifyToken,
  getClientStatementsHandler
);

// Get details for a specific statement
router.get(
  "/api/statement/:statementId",
  verifyToken,
  getStatementDetailsHandler
);

// Generate statements (manual trigger)
router.post("/api/statements/generate", verifyToken, generateStatementsHandler);

export default router;
