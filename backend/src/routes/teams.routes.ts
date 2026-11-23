import { Router } from 'express';
import { getTeams, createTeam } from '../controllers/teams.controller';

const router = Router();

router.get('/', getTeams);
router.post('/', createTeam);

export default router;
