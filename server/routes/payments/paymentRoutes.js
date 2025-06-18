import express from "express";
import { verifyToken } from "../../middleware/auth.js";
import { uploadProofOfPayment } from "../../utils/s3-config.js";
import {
  createPaymentHandler,
  getPaymentHandler,
  getClientPaymentsHandler,
  getClientInvoicesHandler,
} from "../../controllers/payments/paymentController.js";

const router = express.Router();

// Upload proof of payment with specific multer configuration
router.post(
  "/api/payments/:clientId/upload",
  verifyToken,
  uploadProofOfPayment.single("proofFile"),
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
