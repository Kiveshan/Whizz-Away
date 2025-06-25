import express from "express"
import {
  getAllTrucksHandler,
  getTruckByIdHandler,
  createTruckHandler,
  updateTruckHandler,
  deleteTruckDocumentHandler,
  deleteTruckHandler,
  getTrucksWithExpiringLicensesHandler,
  getTrucksWithExpiredLicensesHandler,
} from "../../controllers/manage/truckController.js"
import { verifyToken } from "../../middleware/auth.js"
import { uploadTruckDocs } from "../../utils/s3Config.js"

const router = express.Router()

// Existing routes
router.get("/api/trucks", verifyToken, getAllTrucksHandler)
router.get("/api/trucks/:id", verifyToken, getTruckByIdHandler)
router.post("/api/trucks", verifyToken, uploadTruckDocs.array("documents", 3), createTruckHandler)
router.put("/api/trucks/:id", verifyToken, uploadTruckDocs.array("documents", 3), updateTruckHandler)
router.post("/api/trucks/delete-doc", verifyToken, deleteTruckDocumentHandler)
router.delete("/api/trucks/:id", verifyToken, deleteTruckHandler)

// New notification routes - these need to be BEFORE the /:id route to avoid conflicts
router.get("/api/trucks/notifications/expiring", verifyToken, getTrucksWithExpiringLicensesHandler)
router.get("/api/trucks/notifications/expired", verifyToken, getTrucksWithExpiredLicensesHandler)

export default router
