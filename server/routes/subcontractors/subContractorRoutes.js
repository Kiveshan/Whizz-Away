import express from "express";
import { getAllSubContractorsHandler } from "../../controllers/subcontractors/subContractorController.js";

const router = express.Router();

router.get("/api/subcontractor", getAllSubContractorsHandler);

export default router;
