import express from 'express';
import { generateProfitLossReport } from '../../controllers/profit-loss/profitLossController.js';

const router = express.Router();
router.get('/profit-loss-report', generateProfitLossReport);

export default router;