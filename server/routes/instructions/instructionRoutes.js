import express from "express";
import {
  getShipmentTypesHandler,
  getContainersHandler,
  saveInstructionHandler,
  getClientInstructionStatsHandler,
  getInstructionsHandler,
  getInstructionByIdHandler,
  updateInstructionHandler,
  updateContainersHandler,
} from "../../controllers/instructions/instructionController.js";
import { verifyToken } from "../../middleware/auth.js"; // Adjust path as needed

const router = express.Router();

router.get("/shipment-types", getShipmentTypesHandler);
router.get("/containers/:instructionId", getContainersHandler);
router.post("/save-instruction", verifyToken, saveInstructionHandler);
router.get("/client-instruction-stats", getClientInstructionStatsHandler);
router.get("/instructions", getInstructionsHandler);
router.get("/instruction/:id", getInstructionByIdHandler);
router.put("/instruction/:id", updateInstructionHandler);
router.post("/containers/:instructionId", updateContainersHandler);

export default router;
