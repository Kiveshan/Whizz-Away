import express from "express";
import {
  getFuelExpensesHandler,
  getTurnoverPerMonthHandler,
  getAgingAnalysisHandler,
  getTurnoverVsDieselCostHandler,
  getAllExpensesHandler,
  getTurnoverPerTruckHandler,
  getWagesPerMonthHandler,
} from "../../controllers/analytics/analyticsController.js";
import { verifyToken } from "../../middleware/auth.js";

const router = express.Router();

router.get("/api/fuel-expenses", verifyToken, getFuelExpensesHandler);
router.get("/api/turnover-per-month", verifyToken, getTurnoverPerMonthHandler);
router.get("/api/aging-analysis", verifyToken, getAgingAnalysisHandler);
router.get(
  "/api/turnover-vs-diesel-cost",
  verifyToken,
  getTurnoverVsDieselCostHandler
);
router.get("/api/all-expenses", verifyToken, getAllExpensesHandler);
router.get("/api/turnover-per-truck", verifyToken, getTurnoverPerTruckHandler);
router.get("/api/wages-per-month", verifyToken, getWagesPerMonthHandler);

export default router;
