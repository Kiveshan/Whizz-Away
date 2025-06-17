import express from "express";
import {
  getAllTrucksHandler,
  getTruckByIdHandler,
  createTruckHandler,
  updateTruckHandler,
  deleteTruckDocumentHandler,
  deleteTruckHandler,
} from "../../controllers/manage/truckController.js";
import { verifyToken } from "../../middleware/auth.js";
import { uploadTruckDocs } from "../../utils/s3Config.js";

const router = express.Router();

router.get("/api/trucks", verifyToken, getAllTrucksHandler);
router.get("/api/trucks/:id", verifyToken, getTruckByIdHandler);
router.post(
  "/api/trucks",
  verifyToken,
  uploadTruckDocs.array("documents", 3),
  createTruckHandler
);
router.put(
  "/api/trucks/:id",
  verifyToken,
  uploadTruckDocs.array("documents", 3),
  updateTruckHandler
);
router.post("/api/trucks/delete-doc", verifyToken, deleteTruckDocumentHandler);
router.delete("/api/trucks/:id", verifyToken, deleteTruckHandler);

export default router;
