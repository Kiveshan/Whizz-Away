import express from "express";
import { getAllClientsHandler } from "../../controllers/clients/clientController.js";
import { verifyToken } from "../../middleware/auth.js";

const router = express.Router();

router.get("/api/clients", verifyToken, getAllClientsHandler);

export default router;
