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
} from "../../controllers/purchaseOrder/purchaseOrderController.js"

const router = express.Router()

router.get("/api/purchase-orders", getPurchaseOrdersHandler)
router.get("/api/po/expense-types", getExpenseTypesHandler)
router.get("/api/statements", getStatementsHandler)
router.get("/api/supplier-summary", getSupplierSummaryHandler)
router.get("/api/po-form/suppliers/:expenseTypeId", getSuppliersByExpenseTypeHandler)
router.post("/api/po-form/calculate", calculatePurchaseOrderHandler)
router.post("/api/po-form/create", createPurchaseOrderHandler)
router.post("/api/po-form/create-multiple", createMultiplePurchaseOrdersHandler) 
router.get("/api/po-form/list", getPurchaseOrderListHandler)

export default router
