import { Router } from 'express';
import { getTransactions, calculateSplit, createTransaction } from '../controllers/finance.controller';

const router = Router();

router.get('/transactions', getTransactions);
router.post('/calculate-split', calculateSplit);
router.post('/transactions', createTransaction);

export default router;
