import express from "express";
import {
  listCompanies,
  getCompanyProfile,
  assignPlan,
  upgradePlan,
  suspendCompany,
  reactivateCompany,
  startTrial,
  listBillingEvents,
  listPlans,
} from "../../controllers/admin/saasAdminController.js";
import { verifyToken } from "../../middleware/auth.js";
import { isSuperAdmin } from "../../middleware/planAuthorization.js";

const router = express.Router();

// All SaaS admin routes require a valid JWT + super-admin role (roleid 7)
const adminGuard = [verifyToken, isSuperAdmin];

router.get("/api/admin/companies",                                        ...adminGuard, listCompanies);
router.get("/api/admin/companies/:company_reg_num",                       ...adminGuard, getCompanyProfile);
router.post("/api/admin/companies/:company_reg_num/assign-plan",          ...adminGuard, assignPlan);
router.put("/api/admin/companies/:company_reg_num/upgrade-plan",          ...adminGuard, upgradePlan);
router.put("/api/admin/companies/:company_reg_num/suspend",               ...adminGuard, suspendCompany);
router.put("/api/admin/companies/:company_reg_num/reactivate",            ...adminGuard, reactivateCompany);
router.post("/api/admin/companies/:company_reg_num/trial",                ...adminGuard, startTrial);
router.get("/api/admin/billing-events",                                   ...adminGuard, listBillingEvents);
router.get("/api/admin/plans",                                            ...adminGuard, listPlans);

export default router;
