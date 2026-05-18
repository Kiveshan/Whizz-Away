import express from "express"
import { getVatReconHandler } from "../../controllers/vat-recon/vat-reconController.js"
import { verifyToken } from "../../middleware/auth.js"

const router = express.Router()

router.get("/api/vat-recon", verifyToken, getVatReconHandler)

export default router
