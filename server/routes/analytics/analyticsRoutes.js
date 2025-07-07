import express from "express";
import {
  getFuelExpensesController,
  getTurnoverPerMonthController,
  getAllClientsController,
  getAgingAnalysisController,
  getTurnoverVsDieselCostController,
  getAllExpensesController,
  getTurnoverPerTruckController,
  getWagesPerMonthController,
  getSubcontractorTurnoverPerMonthController,
  getSubcontractorVsTurnoverController,
} from "../../controllers/analytics/analyticsController.js";
import { verifyToken } from "../../middleware/auth.js";

const router = express.Router();

router.get("/api/fuel-expenses", verifyToken, getFuelExpensesController);
router.get("/api/turnover-per-month", verifyToken, getTurnoverPerMonthController);
router.get("/api/aging-analysis", verifyToken, getAgingAnalysisController);
router.get("/api/get-clients", verifyToken, getAllClientsController);
router.get(
  "/api/turnover-vs-diesel-cost",
  verifyToken,
  getTurnoverVsDieselCostController
);
router.get("/api/all-expenses", verifyToken, getAllExpensesController);
router.get("/api/turnover-per-truck", verifyToken, getTurnoverPerTruckController);
router.get("/api/wages-per-month", verifyToken, getWagesPerMonthController);
router.get("/api/subcontractor-turnover-per-month", verifyToken, 
  getSubcontractorTurnoverPerMonthController);
router.get("/api/subcontractor-vs-turnover", verifyToken, 
  getSubcontractorVsTurnoverController);

export default router;
