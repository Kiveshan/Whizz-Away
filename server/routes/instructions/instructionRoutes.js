import express from "express"
import {
  getShipmentTypesHandler,
  getContainersHandler,
  saveInstructionHandler,
  getClientInstructionStatsHandler,
  getInstructionsHandler,
  searchInstructionsHandler,
  getInstructionByIdHandler,
  updateContainersHandler,
  getActiveClientsHandler,
  getClientStartingPointsHandler,
  getClientDestinationsHandler,
  checkClientRatesHandler,
  getClientRatesHandler,
  getClientSetRateHandler,
  // FC Handlers
  getFCContainersHandler,
  saveFCInstructionHandler,
  getFCInstructionByIdHandler,
  updateFCContainersHandler,
  updateFCInstructionAndContainersHandler,
  checkFCContainerLegsHandler,
  deleteFCContainerAndLegsHandler,
  deleteInstructionHandler,
} from "../../controllers/instructions/instructionController.js"
import { verifyToken } from "../../middleware/auth.js"
import { validate } from "../../middleware/validate.js"
import { instructionSaveSchema } from "../../validation/financialSchemas.js"

const router = express.Router()

// ========== Original Controller Instructions Endpoints ==========
router.get("/shipment-types", getShipmentTypesHandler)

// Test route - should work
router.get('/test-containers/:id', (req, res) => {
  console.log(`[${new Date().toISOString()}] Test route hit with ID:`, req.params.id);
  res.json({ success: true, message: 'Test route works!', id: req.params.id });
});

// Containers routes
router.get('/containers/:instructionId', verifyToken, getContainersHandler);
router.post("/save-instruction", verifyToken, validate(instructionSaveSchema), saveInstructionHandler)
router.get("/client-instruction-stats", verifyToken, getClientInstructionStatsHandler)
router.get("/instructions", verifyToken, getInstructionsHandler)
router.get("/search", verifyToken, searchInstructionsHandler)
router.get("/instruction/:id", verifyToken, getInstructionByIdHandler)
router.post("/containers/:instructionId", verifyToken, updateContainersHandler)

// ========== FC Controller Instructions Endpoints ==========
router.get("/fc/containers/:instructionId", verifyToken, getFCContainersHandler);
router.post("/fc/save-instruction", verifyToken, saveFCInstructionHandler)
router.get("/fc/instruction/:id", verifyToken, getFCInstructionByIdHandler)
router.put("/fc/containers/:instructionId", verifyToken, updateFCContainersHandler)
// New unified endpoint for updating both instruction and containers
router.put("/fc/update/:id", verifyToken, updateFCInstructionAndContainersHandler)
// Delete instruction and its containers
router.delete("/fc/instruction/:id", verifyToken, deleteInstructionHandler)
// Check and delete specific containers (and their legs) for FC
router.get(
  "/fc/container/:instructionId/:containerNum/legs-exists",
  verifyToken,
  checkFCContainerLegsHandler,
)
router.delete(
  "/fc/container/:instructionId/:containerNum",
  verifyToken,
  deleteFCContainerAndLegsHandler,
)

// Shared routes
router.get("/active-clients", verifyToken, getActiveClientsHandler)
router.get("/client/:clientId/starting-points", verifyToken, getClientStartingPointsHandler)
router.get("/client/:clientId/destinations/:startingPoint", verifyToken, getClientDestinationsHandler)
router.get("/client/:clientId/check-rates", verifyToken, checkClientRatesHandler)
router.get("/client/:clientId/rates", verifyToken, getClientRatesHandler)
router.get("/client/:clientId/set-rate/:starting_point/:destination", verifyToken, getClientSetRateHandler)

export default router
