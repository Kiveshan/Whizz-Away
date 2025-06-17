import express from "express";
import { verifyToken } from "../../middleware/auth.js";
import {
  getClientStatementsHandler,
  getStatementDetailsHandler,
} from "../../controllers/statements/statementController.js";

const router = express.Router();

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

export default router;
