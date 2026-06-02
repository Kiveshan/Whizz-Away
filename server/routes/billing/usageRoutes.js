import express from "express";
import { getSubscriptionUsage } from "../../controllers/billing/usageController.js";
import { verifyToken } from "../../middleware/auth.js";

const router = express.Router();

router.get("/api/subscription/usage", verifyToken, getSubscriptionUsage);

export default router;
