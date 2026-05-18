import express from "express"
import {
  getPurchaseOrdersHandler,
  getExpenseTypesHandler,
  getStatementsHandler,
  getSupplierSummaryHandler,
  getSuppliersByExpenseTypeHandler,
  calculatePurchaseOrderHandler,
  createPurchaseOrderHandler,
  createMultiplePurchaseOrdersHandler, // New handler
  getPurchaseOrderListHandler,
  getCompanyOwnedTrucksHandler,
  getPurchaseOrderByPonumHandler,
  deletePurchaseOrderByPonumHandler
} from "../../controllers/purchaseOrder/purchaseOrderController.js"
import { uploadPurchaseOrderSlipHandler,checkSlipStatusHandler,viewSlipHandler } from "../../controllers/purchaseOrder/purchaseOrderController.js"
import { uploadPurchaseOrder } from '../../utils/s3-config.js'
import { verifyToken } from "../../middleware/auth.js"

const router = express.Router()

router.get("/api/purchase-orders", verifyToken, getPurchaseOrdersHandler)
router.delete("/api/purchase-orders/:ponum", verifyToken, deletePurchaseOrderByPonumHandler)
router.get("/api/po-form/details/:ponum", verifyToken, getPurchaseOrderByPonumHandler)
router.get("/api/po/expense-types", verifyToken, getExpenseTypesHandler)
router.get("/api/statements", verifyToken, getStatementsHandler)
router.get("/api/supplier-summary", verifyToken, getSupplierSummaryHandler)
router.get("/api/po-form/suppliers/:expenseTypeId", verifyToken, getSuppliersByExpenseTypeHandler)
router.post("/api/po-form/calculate", verifyToken, calculatePurchaseOrderHandler)
router.post("/api/po-form/create", verifyToken, createPurchaseOrderHandler)
router.post("/api/po-form/create-multiple", verifyToken, createMultiplePurchaseOrdersHandler)
router.get("/api/po-form/list", verifyToken, getPurchaseOrderListHandler)
router.get("/api/po-form/trucks", verifyToken, getCompanyOwnedTrucksHandler)
router.post(
  "/api/po-form/upload-slip",
  verifyToken,
  uploadPurchaseOrder.single("slip"),
  uploadPurchaseOrderSlipHandler
)
router.get("/api/po-form/slip-status/:ponum", verifyToken, checkSlipStatusHandler)
router.get("/api/po-form/view-slip/:ponum", verifyToken, viewSlipHandler)

export default router
