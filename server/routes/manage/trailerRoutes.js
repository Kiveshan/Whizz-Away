import express from "express"
import {
  getAllTrailersHandler,
  getTrailerByIdHandler,
  createTrailerHandler,
  updateTrailerHandler,
  deleteTrailerDocumentHandler,
  deleteTrailerHandler,
  getTrailersWithExpiringLicensesHandler,
  getTrailersWithExpiredLicensesHandler,
} from "../../controllers/manage/trailerController.js"
import { verifyToken } from "../../middleware/auth.js"
import { uploadTrailerDocs } from "../../utils/s3Config.js"

const router = express.Router()

// Main CRUD routes
router.get("/api/trailers", verifyToken, getAllTrailersHandler)
router.get("/api/trailers/:id", verifyToken, getTrailerByIdHandler)
router.post("/api/trailers", verifyToken, uploadTrailerDocs.array("documents", 3), createTrailerHandler)
router.put("/api/trailers/:id", verifyToken, uploadTrailerDocs.array("documents", 3), updateTrailerHandler)
router.post("/api/trailers/delete-doc", verifyToken, deleteTrailerDocumentHandler)
router.delete("/api/trailers/:id", verifyToken, deleteTrailerHandler)

// Notification routes (must come after main routes to avoid conflicts)
router.get("/api/trailers/notifications/expiring", verifyToken, getTrailersWithExpiringLicensesHandler)
router.get("/api/trailers/notifications/expired", verifyToken, getTrailersWithExpiredLicensesHandler)

export default router
