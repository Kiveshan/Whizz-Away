import express from "express";
import {
  getAllDriverRatesHandler,
  getDriverRateByIdHandler,
  createDriverRateHandler,
  updateDriverRateHandler,
  deleteDriverRateHandler,
  getDriverRateUsageHandler,
} from "../../controllers/manage/driverRatesController.js";
import { verifyToken } from "../../middleware/auth.js";

const router = express.Router();

router.get("/api/driver-rates", verifyToken, getAllDriverRatesHandler);
router.get("/api/driver-rates/:id", verifyToken, getDriverRateByIdHandler);
router.get("/api/driver-rates/:id/usage", verifyToken, getDriverRateUsageHandler);
router.post("/api/driver-rates", verifyToken, createDriverRateHandler);
router.put("/api/driver-rates/:id", verifyToken, updateDriverRateHandler);
router.delete("/api/driver-rates/:id", verifyToken, deleteDriverRateHandler);

export default router;
