import express from "express";
import { verifyToken } from "../../middleware/auth.js";
import {
  getClientAddonsHandler,
  createAddonHandler,
  getAddonByIdHandler,
  updateAddonHandler,
  deleteAddonHandler,
} from "../../controllers/add-ons/addonController.js";

const router = express.Router();

// Get all add-ons for a specific client
router.get("/api/addons/client/:clientId", verifyToken, getClientAddonsHandler);

// Create a new add-on
router.post("/api/addons", verifyToken, createAddonHandler);

// Get a specific add-on by ID
router.get("/api/addons/:addonId", verifyToken, getAddonByIdHandler);

// Update an add-on
router.put("/api/addons/:addonId", verifyToken, updateAddonHandler);

// Delete an add-on
router.delete("/api/addons/:addonId", verifyToken, deleteAddonHandler);

export default router;
