import express from "express";
import {
  getFuelExpensesController,
  getTurnoverPerMonthController,
  getAllClientsController,
  getAgingAnalysisController,
  getTurnoverVsDieselCostController,
  getAllExpensesController,
  getTurnoverPerTruckController,
  getSubcontractorTurnoverPerMonthController,
  getSubcontractorVsTurnoverController,
  getAllSubcontractorsController,
  getWagesVsExpensesController,
} from "../../controllers/analytics/analyticsController.js";
import { verifyToken } from "../../middleware/auth.js";

const router = express.Router();

router.get("/api/fuel-expenses", verifyToken, getFuelExpensesController);
router.get("/api/turnover-per-month", verifyToken, getTurnoverPerMonthController);
router.get("/api/aging-analysis", verifyToken, getAgingAnalysisController);
router.get("/api/get-clients", verifyToken, getAllClientsController);
router.get("/get-subcontractors", verifyToken, getAllSubcontractorsController);
router.get(
  "/api/turnover-vs-diesel-cost",
  verifyToken,
  getTurnoverVsDieselCostController
);
router.get("/api/all-expenses", verifyToken, getAllExpensesController);
router.get("/api/turnover-per-truck", verifyToken, getTurnoverPerTruckController);
router.get("/api/subcontractor-turnover-per-month", verifyToken, 
  getSubcontractorTurnoverPerMonthController);
router.get("/api/subcontractor-vs-turnover", verifyToken, 
  getSubcontractorVsTurnoverController);
router.get("/api/wages-vs-expenses", verifyToken, 
  getWagesVsExpensesController);

export default router;