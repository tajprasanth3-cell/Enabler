import { Router } from 'express';
import {
  getLeads,
  ingestLeads,
  allocateStage1,
  allocateStage2,
  updateLeadStatus,
  reassignLeads,
  requestReplenishment,
} from '../controllers/leads.controller';

const router = Router();

router.get('/', getLeads);
router.post('/ingest', ingestLeads);
router.post('/allocate/stage1', allocateStage1);
router.post('/allocate/stage2', allocateStage2);
router.patch('/:id/status', updateLeadStatus);
router.post('/reassign', reassignLeads);
router.post('/replenish', requestReplenishment);

export default router;
