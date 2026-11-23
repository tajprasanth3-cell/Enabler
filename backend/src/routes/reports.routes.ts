import { Router } from 'express';
import {
  getKpis,
  getFunnel,
  getLeaderboard,
  getTeamPerformance,
} from '../controllers/reports.controller';

const router = Router();

router.get('/kpis', getKpis);
router.get('/funnel', getFunnel);
router.get('/leaderboard', getLeaderboard);
router.get('/team-performance', getTeamPerformance);

export default router;
