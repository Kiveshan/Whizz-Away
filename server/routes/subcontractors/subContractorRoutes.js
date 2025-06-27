import express from "express";
import {
  getAllSubContractorsHandler,
  getSubContractorStatementsHandler,
} from "../../controllers/subcontractors/subContractorController.js";

const router = express.Router();

router.get("/subcontractor", getAllSubContractorsHandler);
router.get("/subcontractor/statements", getSubContractorStatementsHandler);

export default router;
