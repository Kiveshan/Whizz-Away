import express from "express"
import {
  getAllSuppliersHandler,
  getSupplierByIdHandler,
  createSupplierHandler,
  updateSupplierHandler,
  deleteSupplierHandler,
  toggleSupplierStatusHandler,
} from "../../controllers/manage/supplierController.js"
import { verifyToken } from "../../middleware/auth.js"

const router = express.Router()

// Get all suppliers with pagination and search
router.get("/api/suppliers", verifyToken, getAllSuppliersHandler)

// Get supplier by ID with expense types
router.get("/api/suppliers/:id", verifyToken, getSupplierByIdHandler)

// Create new supplier with expense types
router.post("/api/suppliers", verifyToken, createSupplierHandler)

// Update supplier with expense types
router.put("/api/suppliers/:id", verifyToken, updateSupplierHandler)

// Delete supplier (will cascade delete expense type associations)
router.delete("/api/suppliers/:id", verifyToken, deleteSupplierHandler)

// Toggle supplier status - CHANGED FROM PATCH TO PUT
router.put("/api/suppliers/:id/toggle-status", verifyToken, toggleSupplierStatusHandler)

export default router
