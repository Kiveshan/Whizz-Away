import express from "express";
import { getDriversHandler } from "../../controllers/drivers/driverController.js";
import { verifyToken } from "../../middleware/auth.js";

const router = express.Router();

router.get("/employees/drivers", verifyToken, getDriversHandler);

export default router;
