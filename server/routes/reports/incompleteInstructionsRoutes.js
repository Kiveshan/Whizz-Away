import express from "express"
import { getIncompleteInstructionsHandler } from "../../controllers/reports/incompleteInstructionsController.js"
import { verifyReportsAccess } from "../../middleware/auth.js"

const router = express.Router()

router.get("/api/reports/incomplete-instructions", verifyReportsAccess, getIncompleteInstructionsHandler)

export default router
