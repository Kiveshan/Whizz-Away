import express from "express";
import { verifyToken } from "../../middleware/auth.js";
import {
  getCompletedInvoicesHandler,
  getInvoiceDetailsHandler,
} from "../../controllers/invoices/invoiceController.js";

const router = express.Router();

router.get("/api/invoices/completed", verifyToken, getCompletedInvoicesHandler);
router.get("/api/invoices/:id", verifyToken, getInvoiceDetailsHandler);

export default router;
