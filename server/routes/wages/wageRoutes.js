import express from "express";
import {
  saveWageDataHandler,
  checkWageSlipHandler,
  getEmployeeDeductionsHandler,
  updateEmployeeDeductionsHandler,
  getDriverWageDetailsByInstructionHandler,
  getDriverWageDetailsHandler,
  getDriverInstructionsHandler,
  getDriverLegsByMonthHandler,
  getStoredWageDataHandler,
  getBaseSalaryHistoryHandler,
  getAllEmployeesHandler,
  getAllRolesHandler,getAllRolesExcludingSixHandler
} from "../../controllers/wages/wageController.js";
import { verifyToken } from "../../middleware/auth.js";

const router = express.Router();
router.get("/api/stored-wage-data/:employeeId", verifyToken, getStoredWageDataHandler);
router.get("/all-employees", verifyToken, getAllEmployeesHandler);
router.post("/api/save-wage-data", verifyToken, saveWageDataHandler);
router.get("/api/check-wage-slip", verifyToken, checkWageSlipHandler);
router.get(
  "/api/employee-deductions/:employeeId",
  verifyToken,
  getEmployeeDeductionsHandler
);
router.put(
  "/api/employee-deductions/:employeeId",
  verifyToken,
  updateEmployeeDeductionsHandler
);
router.get(
  "/wage-details/driver/:driverId/instruction/:instructionId",
  verifyToken,
  getDriverWageDetailsByInstructionHandler
);
router.get("/wage-details/driver/:driverId", verifyToken, getDriverWageDetailsHandler);
router.get("/api/driver-instructions/:driverId", verifyToken, getDriverInstructionsHandler);
router.get(
  "/api/all-driver-legs/:driverId/by-month",
  verifyToken,
  getDriverLegsByMonthHandler
);
router.get("/api/base-salary-history/:employeeId", verifyToken, getBaseSalaryHistoryHandler);
router.get("/api/roles", verifyToken, getAllRolesHandler);
router.get("/api/roles/exclude-six", verifyToken, getAllRolesExcludingSixHandler);

export default router;
