import express from "express";
import {
  getAllSubcontractorsHandler,
  getSubcontractorByIdHandler,
  createSubcontractorHandler,
  updateSubcontractorHandler,
  toggleSubcontractorStatusHandler,
} from "../../controllers/manage/subbieController.js";
import { verifyToken } from "../../middleware/auth.js";

const router = express.Router();

router.get("/api/subcontractors", verifyToken, getAllSubcontractorsHandler);
router.get("/api/subcontractors/:id", verifyToken, getSubcontractorByIdHandler);
router.post("/api/subcontractors", verifyToken, createSubcontractorHandler);
router.put("/api/subcontractors/:id", verifyToken, updateSubcontractorHandler);
router.put(
  "/api/subcontractors/:id/toggle-status",
  verifyToken,
  toggleSubcontractorStatusHandler
);

export default router;
