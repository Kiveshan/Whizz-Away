import express from "express";
import {
  getAllSubContractorsHandler,
  getSubContractorStatementsHandler,
  getStatementDetailsHandler,
  getCompanyInfoHandler,
  getSubcontractorInfoHandler,
} from "../../controllers/subcontractors/subContractorController.js";

const router = express.Router();

router.get("/subcontractor", getAllSubContractorsHandler);
router.get("/subcontractor/statements", getSubContractorStatementsHandler);
router.get("/subcontractor/statement-details", getStatementDetailsHandler);
router.get("/subcontractor/company-info", getCompanyInfoHandler);
router.get("/subcontractor/info", getSubcontractorInfoHandler);

export default router;
