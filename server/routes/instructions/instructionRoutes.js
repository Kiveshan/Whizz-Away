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
  getActiveClientsHandler,
  getClientStartingPointsHandler,
  getClientDestinationsHandler,
  checkClientRatesHandler,
  getClientRatesHandler,
} from "../../controllers/instructions/instructionController.js"
import { verifyToken } from "../../middleware/auth.js"

const router = express.Router()

// Existing routes
router.get("/shipment-types", getShipmentTypesHandler)
router.get("/containers/:instructionId", getContainersHandler)
router.post("/save-instruction", verifyToken, saveInstructionHandler)
router.get("/client-instruction-stats", getClientInstructionStatsHandler)
router.get("/instructions", getInstructionsHandler)
router.get("/instruction/:id", getInstructionByIdHandler)
router.put("/instruction/:id", updateInstructionHandler)
router.post("/containers/:instructionId", updateContainersHandler)
router.get("/active-clients", getActiveClientsHandler)

// Client-specific routes
router.get("/client/:clientId/starting-points", getClientStartingPointsHandler)
router.get("/client/:clientId/destinations/:startingPoint", getClientDestinationsHandler)
router.get("/client/:clientId/check-rates", checkClientRatesHandler)
router.get("/client/:clientId/rates", getClientRatesHandler)

export default router



