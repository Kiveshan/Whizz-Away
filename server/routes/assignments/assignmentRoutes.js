import express from "express";
import {
  getDriversHandler,
  getStartingPointsHandler,
  getDestinationsHandler,
  updateInstructionStatusHandler,
  getDriversSubHandler,
  getDriverRatesWithSubbieHandler,
  getControllersHandler,
  getManagersHandler,
  getInstructionByIdHandler,
  getShipmentTypeByInstructionIdHandler,
  getInstructionsHandler,
  getTruckRegNumsHandler,
  getTrucksHandler,
  getClientInstructionsHandler,
  getClientInstructionsDetailsHandler,
  getContainerDetailsHandler,
  getDriverRatesHandler,
  getContainerNumbersHandler,
  getContainerTypesHandler,
  saveLegHandler,
  getLegsByInstructionIdHandler,
  deleteLegHandler,
  getContainersByInstructionIdHandler,
  completeInstructionHandler,
  getInstructionDetailsHandler,
  getDriverByIdHandler,
  getDriverInstructionsHandler,
  getLegDetailsByInstructionAndDriverHandler,
  getCompletedDriverLegsHandler,
  getDriverLegsHandler,
  getDocumentsHandler,
  generateInvoiceHandler,
  updateLegNumberHandler
} from "../../controllers/assignments/assignmentController.js";
import { verifyToken } from "../../middleware/auth.js";

const router = express.Router();

router.get("/drivers", verifyToken, getDriversHandler);
router.get("/starting-points", verifyToken, getStartingPointsHandler);
router.get("/destinations", verifyToken, getDestinationsHandler);
router.put(
  "/instructions/:instructionId/status",
  verifyToken,
  updateInstructionStatusHandler
);
router.get("/employees/driverssub", verifyToken, getDriversSubHandler);
router.get("/api/driver-rates-with-subbie", verifyToken, getDriverRatesWithSubbieHandler);
router.get("/employees/controllers", verifyToken, getControllersHandler);
router.get("/employees/managers", verifyToken, getManagersHandler);
router.get("/instructions/:instructionId", verifyToken, getInstructionByIdHandler);
router.get(
  "/instructions/:instructionId/shipment-type",
  verifyToken,
  getShipmentTypeByInstructionIdHandler
);
// router.get("/instructions", getInstructionsHandler);
router.get("/trucks/regnums", verifyToken, getTruckRegNumsHandler);
router.get("/trucks", verifyToken, getTrucksHandler);
router.get("/client-instructions", verifyToken, getClientInstructionsHandler);
router.get(
  "/client-instructions-details/:clientId",
  verifyToken,
  getClientInstructionsDetailsHandler
);
router.get("/api/container-details/:containerNum", verifyToken, getContainerDetailsHandler);
router.get("/api/driver-rates", verifyToken, getDriverRatesHandler);
router.get("/containers/numbers", verifyToken, getContainerNumbersHandler);
router.get("/api/container-types", verifyToken, getContainerTypesHandler);
router.post("/legs/save", verifyToken, saveLegHandler);
router.get("/legs/:instructionId", verifyToken, getLegsByInstructionIdHandler);
router.delete("/legs/:legId", verifyToken, deleteLegHandler);
router.put("/legs/:legId/update-number", verifyToken, updateLegNumberHandler);
router.get(
  "/containers/instruction/:instructionId",
  verifyToken,
  getContainersByInstructionIdHandler
);
router.put("/instructions/:instructionId/complete", verifyToken, completeInstructionHandler);
router.get(
  "/instructions/:instructionId/details",
  verifyToken,
  getInstructionDetailsHandler
);
router.get("/driver/:driverId", verifyToken, getDriverByIdHandler);
router.get("/instructions/driver/:id", verifyToken, getDriverInstructionsHandler);
router.get(
  "/legs/instruction/:id/driver/:driverId",
  verifyToken,
  getLegDetailsByInstructionAndDriverHandler
);
router.get(
  "/api/completed-driver-legs/:driverId",
  verifyToken,
  getCompletedDriverLegsHandler
);
router.get("/api/driver-legs/:driverId", verifyToken, getDriverLegsHandler);
router.get("/documents/:instructionId", verifyToken, getDocumentsHandler);
router.post("/generate-invoice/:instructionId", verifyToken, generateInvoiceHandler);

export default router;
