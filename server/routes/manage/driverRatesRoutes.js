import express from "express";
import {
  getAllDriverRatesHandler,
  getDriverRateByIdHandler,
  createDriverRateHandler,
  updateDriverRateHandler,
  deleteDriverRateHandler,
  getDriverRateUsageHandler,
  refreshDriverRateLegsHandler,
  checkRateDateOverlapsHandler,
  getDistinctRoutesHandler,
  getPeriodsForRouteHandler,
  saveRoutePeriodsHandler,
  deleteRouteHandler,
  getRouteLegDatesHandler,
  getRouteUsageCheckHandler,
  getRouteOptionsHandler,
  auditDriverRatesHandler,
  applyDriverRateFixesHandler,
} from "../../controllers/manage/driverRatesController.js";
import { verifyToken, verifyAdminAccess, verifyDriverRateAuditAccess } from "../../middleware/auth.js";

const router = express.Router();

// ── Month driver-rate audit — read-only report, viewable by Manager/Director/Admin.
// The apply-fixes endpoint stays admin-only since it writes data.
router.get("/api/driver-rates/month-audit", verifyToken, verifyDriverRateAuditAccess, auditDriverRatesHandler);
router.post("/api/driver-rates/month-audit/apply", verifyToken, verifyAdminAccess, applyDriverRateFixesHandler);

// ── Route-grouped endpoints (must be before /:id to avoid param conflicts) ──
router.get("/api/driver-rates/routes", verifyToken, getDistinctRoutesHandler);
router.get("/api/driver-rates/route-periods", verifyToken, getPeriodsForRouteHandler);
router.post("/api/driver-rates/route-periods", verifyToken, saveRoutePeriodsHandler);
router.delete("/api/driver-rates/route", verifyToken, deleteRouteHandler);
router.get("/api/driver-rates/route-leg-dates", verifyToken, getRouteLegDatesHandler);
router.get("/api/driver-rates/route-usage", verifyToken, getRouteUsageCheckHandler);
router.get("/api/driver-rates/route-options", verifyToken, getRouteOptionsHandler);

// ── Existing endpoints ───────────────────────────────────────────────────────
router.get("/api/driver-rates", verifyToken, getAllDriverRatesHandler);
router.get("/api/driver-rates/check-overlaps", verifyToken, checkRateDateOverlapsHandler);
router.get("/api/driver-rates/:id", verifyToken, getDriverRateByIdHandler);
router.get("/api/driver-rates/:id/usage", verifyToken, getDriverRateUsageHandler);
router.post("/api/driver-rates", verifyToken, createDriverRateHandler);
router.put("/api/driver-rates/:id", verifyToken, updateDriverRateHandler);
router.post(
  "/api/driver-rates/:id/refresh-legs",
  verifyToken,
  refreshDriverRateLegsHandler
);
router.delete("/api/driver-rates/:id", verifyToken, deleteDriverRateHandler);

export default router;
