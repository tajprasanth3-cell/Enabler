import { Router } from 'express';
import {
  getTransactions,
  calculateSplit,
  createTransaction,
  getFinancialSummary,
} from '../controllers/finance.controller';

const router = Router();

router.get('/transactions', getTransactions);
router.post('/calculate-split', calculateSplit);
router.post('/transactions', createTransaction);
router.get('/summary', getFinancialSummary);

export default router;
