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
  // FC Handlers
  getFCContainersHandler,
  saveFCInstructionHandler,
  getFCInstructionByIdHandler,
  updateFCInstructionHandler,
  updateFCContainersHandler,
  updateFCInstructionAndContainersHandler,
} from "../../controllers/instructions/instructionController.js"
import { verifyToken } from "../../middleware/auth.js"

const router = express.Router()

// ========== Original Controller Instructions Endpoints ==========
router.get("/shipment-types", getShipmentTypesHandler)

// Test route - should work
router.get('/test-containers/:id', (req, res) => {
  console.log(`[${new Date().toISOString()}] Test route hit with ID:`, req.params.id);
  res.json({ success: true, message: 'Test route works!', id: req.params.id });
});

// Containers routes
router.get('/containers/:instructionId', getContainersHandler);
router.post("/save-instruction", verifyToken, saveInstructionHandler)
router.get("/client-instruction-stats", getClientInstructionStatsHandler)
router.get("/instructions", getInstructionsHandler)
router.get("/instruction/:id", getInstructionByIdHandler)
router.put("/instruction/:id", updateInstructionHandler)
router.post("/containers/:instructionId", updateContainersHandler)

// ========== FC Controller Instructions Endpoints ==========
router.get("/fc/containers/:instructionId", getFCContainersHandler);
router.post("/fc/save-instruction", verifyToken, saveFCInstructionHandler)
router.get("/fc/instruction/:id", getFCInstructionByIdHandler)
router.put("/fc/instruction/:id", updateFCInstructionHandler)
router.put("/fc/containers/:instructionId", updateFCContainersHandler)
// New unified endpoint for updating both instruction and containers
router.put("/fc/update/:id", updateFCInstructionAndContainersHandler)

// Shared routes
router.get("/active-clients", getActiveClientsHandler)
router.get("/client/:clientId/starting-points", getClientStartingPointsHandler)
router.get("/client/:clientId/destinations/:startingPoint", getClientDestinationsHandler)
router.get("/client/:clientId/check-rates", checkClientRatesHandler)
router.get("/client/:clientId/rates", getClientRatesHandler)

export default router
