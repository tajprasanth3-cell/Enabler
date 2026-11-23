import { Router } from 'express';
import authRoutes from './auth.routes';
import leadsRoutes from './leads.routes';
import teamsRoutes from './teams.routes';
import usersRoutes from './users.routes';
import attendanceRoutes from './attendance.routes';
import financeRoutes from './finance.routes';
import auditRoutes from './audit.routes';
import followupsRoutes from './followups.routes';
import reportsRoutes from './reports.routes';
import settingsRoutes from './settings.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/leads', leadsRoutes);
router.use('/teams', teamsRoutes);
router.use('/users', usersRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/finance', financeRoutes);
router.use('/audit', auditRoutes);
router.use('/followups', followupsRoutes);
router.use('/reports', reportsRoutes);
router.use('/settings', settingsRoutes);

export default router;
