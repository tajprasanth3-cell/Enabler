import { Router } from 'express';
import {
  getTransactions,
  calculateSplit,
  calculateProfit,
  createTransaction,
  verifyTransaction,
  getFinancialSummary,
  getCalculationLogs,
  createCalculationLog,
} from '../controllers/finance.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

const router = Router();

// Strictly isolated to Admin access as per enterprise specification
router.use(authenticateToken);
router.use(requireRole(['ADMIN']));

// Transactions
router.get('/transactions', getTransactions);
router.post('/transactions', createTransaction);
router.patch('/transactions/:id/verify', verifyTransaction);
router.patch('/transactions/:id/status', verifyTransaction);

// Revenue and Profit sharing calculation engine
router.post('/calculate', calculateSplit);
router.post('/calculate-split', calculateSplit);
router.post('/calculate-profit', calculateProfit);

// Calculation history ledger
router.get('/calculations', getCalculationLogs);
router.post('/calculations', createCalculationLog);

// Executive financial KPIs summary
router.get('/summary', getFinancialSummary);

export default router;
