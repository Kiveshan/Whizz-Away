import express from "express";
import { verifyToken } from "../../middleware/auth.js";
import {
  getCompletedInvoicesHandler,
  getInvoiceDetailsHandler,
  checkInvoiceExistsHandler,
  createInvoiceHandler,
  updateInstructionDetailsHandler,
} from "../../controllers/invoices/invoiceController.js";

const router = express.Router();

router.get("/api/invoices/completed", verifyToken, getCompletedInvoicesHandler);
router.get("/api/invoices/:id", verifyToken, getInvoiceDetailsHandler);

// New routes for invoice check and creation
router.get("/api/invoice/check/:m1key", checkInvoiceExistsHandler);
router.post("/api/invoice/create", verifyToken, createInvoiceHandler);

router.put(
  "/api/invoice/update-instruction",
  verifyToken,
  updateInstructionDetailsHandler
);

export default router;
