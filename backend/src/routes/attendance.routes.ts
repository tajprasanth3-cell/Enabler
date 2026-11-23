import { Router } from 'express';
import { getAttendance, punchIn, punchOut } from '../controllers/attendance.controller';

const router = Router();

router.get('/', getAttendance);
router.post('/punch-in', punchIn);
router.post('/punch-out', punchOut);

export default router;
