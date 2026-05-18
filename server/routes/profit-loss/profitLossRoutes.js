import express from 'express';
import { generateProfitLossReport, getCompanyDetailsHandler } from '../../controllers/profit-loss/profitLossController.js';
import { verifyToken } from '../../middleware/auth.js';

const router = express.Router();
router.get('/profit-loss-report', verifyToken, generateProfitLossReport);
router.get('/company-details', verifyToken, getCompanyDetailsHandler);

export default router;