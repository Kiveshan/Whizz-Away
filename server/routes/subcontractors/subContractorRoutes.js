import express from "express";
import {
  getAllSubContractorsHandler,
  getSubContractorStatementsHandler,
  getStatementDetailsHandler,
} from "../../controllers/subcontractors/subContractorController.js";

const router = express.Router();

router.get("/subcontractor", getAllSubContractorsHandler);
router.get("/subcontractor/statements", getSubContractorStatementsHandler);
router.get("/subcontractor/statement-details", getStatementDetailsHandler);

export default router;
