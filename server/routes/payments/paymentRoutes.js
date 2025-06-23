import express from "express";
import { verifyToken } from "../../middleware/auth.js";
import { uploadPaymentProof } from "../../utils/s3-config.js";
import {
  createPaymentHandler,
  getPaymentHandler,
  getClientPaymentsHandler,
  getClientInvoicesHandler,
} from "../../controllers/payments/paymentController.js";

const router = express.Router();

router.post(
  "/api/payments/:clientId/upload",
  verifyToken,
  uploadPaymentProof.single("file"),
  createPaymentHandler
);
router.get(
  "/api/payments/:clientId/:paymentId",
  verifyToken,
  getPaymentHandler
);
router.get("/api/payments/:clientId", verifyToken, getClientPaymentsHandler);
router.get("/api/invoices/:clientId", verifyToken, getClientInvoicesHandler);

export default router;
