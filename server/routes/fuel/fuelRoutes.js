import express from "express";
import {
  // getTrucksWithFuelExpensesHandler,
  getAllCompanyOwnedTrucksHandler,
  getTruckExpensesHandler,
  getAllExpensesHandler,
} from "../../controllers/fuel/fuelController.js";
import { verifyToken } from "../../middleware/auth.js";

const router = express.Router();

// router.get("/trucks/fuel-expenses", getTrucksWithFuelExpensesHandler);
router.get("/expenses/truck/:truckId", verifyToken, getTruckExpensesHandler);
router.get("/expenses", verifyToken, getAllExpensesHandler);
router.get("/trucks/company-owned", verifyToken, getAllCompanyOwnedTrucksHandler);

export default router;
