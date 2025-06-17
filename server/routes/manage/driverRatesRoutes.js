import express from "express";
import {
  getAllDriverRatesHandler,
  getDriverRateByIdHandler,
  createDriverRateHandler,
  updateDriverRateHandler,
  deleteDriverRateHandler,
} from "../../controllers/manage/driverRatesController.js";
import { verifyToken } from "../../middleware/auth.js";

const router = express.Router();

router.get("/api/driver-rates", verifyToken, getAllDriverRatesHandler);
router.get("/api/driver-rates/:id", verifyToken, getDriverRateByIdHandler);
router.post("/api/driver-rates", verifyToken, createDriverRateHandler);
router.put("/api/driver-rates/:id", verifyToken, updateDriverRateHandler);
router.delete("/api/driver-rates/:id", verifyToken, deleteDriverRateHandler);

export default router;
