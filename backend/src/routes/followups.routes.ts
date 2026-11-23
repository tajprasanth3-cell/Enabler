import { Router } from 'express';
import {
  getFollowUps,
  createFollowUp,
  updateFollowUp,
  deleteFollowUp,
} from '../controllers/followups.controller';

const router = Router();

router.get('/', getFollowUps);
router.post('/', createFollowUp);
router.patch('/:id', updateFollowUp);
router.delete('/:id', deleteFollowUp);

export default router;
