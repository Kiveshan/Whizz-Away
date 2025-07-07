import express from "express";
import {
  getFuelExpensesHandler,
  getTurnoverPerMonthHandler,
  getAllClientsHandler,
  getAgingAnalysisHandler,
  getTurnoverVsDieselCostHandler,
  getAllExpensesHandler,
  getTurnoverPerTruckHandler,
  getWagesPerMonthHandler,
  getSubcontractorTurnoverPerMonthHandler,
  getSubcontractorVsTurnoverHandler,
} from "../../controllers/analytics/analyticsController.js";
import { verifyToken } from "../../middleware/auth.js";

const router = express.Router();

router.get("/api/fuel-expenses", verifyToken, getFuelExpensesHandler);
router.get("/api/turnover-per-month", verifyToken, getTurnoverPerMonthHandler);
router.get("/api/aging-analysis", verifyToken, getAgingAnalysisHandler);
router.get("/api/get-clients", verifyToken, getAllClientsHandler);
router.get(
  "/api/turnover-vs-diesel-cost",
  verifyToken,
  getTurnoverVsDieselCostHandler
);
router.get("/api/all-expenses", verifyToken, getAllExpensesHandler);
router.get("/api/turnover-per-truck", verifyToken, getTurnoverPerTruckHandler);
router.get("/api/wages-per-month", verifyToken, getWagesPerMonthHandler);
router.get("/api/subcontractor-turnover-per-month", verifyToken, 
  getSubcontractorTurnoverPerMonthHandler);
router.get("/api/subcontractor-vs-turnover", verifyToken, 
  getSubcontractorVsTurnoverHandler);

export default router;
