import express from "express";
import {
  getDocumentsByInstructionHandler,
  uploadDocumentHandler,
  getDocumentsByClientHandler,
  deleteDocumentHandler,
} from "../../controllers/assignments/documentController.js";
import { uploadInstruction } from "../../utils/s3-config.js";
import { verifyToken } from "../../middleware/auth.js";

const router = express.Router();

router.get("/:instructionId", verifyToken, getDocumentsByInstructionHandler);
router.post("/upload", verifyToken, uploadInstruction.single("file"), uploadDocumentHandler);
router.get("/client/:clientId", verifyToken, getDocumentsByClientHandler);
router.delete("/:documentId", verifyToken, deleteDocumentHandler);

console.log("Document routes loaded successfully");

export default router;
