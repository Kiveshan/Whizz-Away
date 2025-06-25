import express from "express"
import {
  getAllSubcontractorsHandler,
  getSubcontractorByIdHandler,
  createSubcontractorHandler,
  updateSubcontractorHandler,
  toggleSubcontractorStatusHandler,
  deleteSubcontractorDriverHandler,
  deleteSubcontractorTruckHandler,
} from "../../controllers/manage/subbieController.js"
import { verifyToken } from "../../middleware/auth.js"

const router = express.Router()

// Existing subcontractor routes
router.get("/api/subcontractors", verifyToken, getAllSubcontractorsHandler)
router.get("/api/subcontractors/:id", verifyToken, getSubcontractorByIdHandler)
router.post("/api/subcontractors", verifyToken, createSubcontractorHandler)
router.put("/api/subcontractors/:id", verifyToken, updateSubcontractorHandler)
router.put("/api/subcontractors/:id/toggle-status", verifyToken, toggleSubcontractorStatusHandler)

// New routes for deleting individual drivers and trucks
router.delete("/api/subcontractors/drivers/:driverId", verifyToken, deleteSubcontractorDriverHandler)
router.delete("/api/subcontractors/trucks/:truckId", verifyToken, deleteSubcontractorTruckHandler)

export default router
