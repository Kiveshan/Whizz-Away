import express from "express"
import {
  getShipmentTypesHandler,
  getContainersHandler,
  saveInstructionHandler,
  getClientInstructionStatsHandler,
  getInstructionsHandler,
  getInstructionByIdHandler,
  updateInstructionHandler,
  updateContainersHandler,
  getStartingPointsHandler,
  getDestinationsHandler,
  getActiveClientsHandler,
} from "../../controllers/instructions/instructionController.js"
import { verifyToken } from "../../middleware/auth.js" // Adjust path as needed

const router = express.Router()

router.get("/shipment-types", getShipmentTypesHandler)
router.get("/containers/:instructionId", getContainersHandler)
router.post("/save-instruction", verifyToken, saveInstructionHandler)
router.get("/client-instruction-stats", getClientInstructionStatsHandler)
router.get("/instructions", getInstructionsHandler)
router.get("/instruction/:id", getInstructionByIdHandler)
router.put("/instruction/:id", updateInstructionHandler)
router.post("/containers/:instructionId", updateContainersHandler)
router.get("/starting-points", getStartingPointsHandler)
router.get("/destinations", getDestinationsHandler)
router.get("/active-clients", getActiveClientsHandler)

export default router
