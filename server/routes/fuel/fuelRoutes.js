import express from "express";
import {
  getTrucksWithFuelExpensesHandler,
  getTruckExpensesHandler,
  getAllExpensesHandler,
} from "../../controllers/fuel/fuelController.js";

const router = express.Router();

router.get("/trucks/fuel-expenses", getTrucksWithFuelExpensesHandler);
router.get("/expenses/truck/:truckId", getTruckExpensesHandler);
router.get("/expenses", getAllExpensesHandler);

export default router;
