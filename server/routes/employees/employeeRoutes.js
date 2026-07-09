import express from "express";
import { getEmployeeHandler } from "../../controllers/employees/employeeController.js";
import { verifyToken } from "../../middleware/auth.js";

const router = express.Router();

router.get("/api/employee/:id", verifyToken, getEmployeeHandler);

export default router;
