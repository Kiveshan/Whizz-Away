import express from "express";
import { verifyToken } from "../../middleware/auth.js";
import {
  createPaymentHandler,
  getPaymentHandler,
  getClientPaymentsHandler,
} from "../../controllers/payments/paymentController.js";

const router = express.Router();

router.post(
  "/api/payments/:clientId/upload",
  verifyToken,
  createPaymentHandler
);
router.get(
  "/api/payments/:clientId/:paymentId",
  verifyToken,
  getPaymentHandler
);
router.get("/api/payments/:clientId", verifyToken, getClientPaymentsHandler);

export default router;
