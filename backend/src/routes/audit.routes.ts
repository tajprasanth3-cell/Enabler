import { Router } from 'express';
import { getAuditLogs, getAuditSummary } from '../controllers/audit.controller';

const router = Router();

router.get('/', getAuditLogs);
router.get('/summary', getAuditSummary);

export default router;
