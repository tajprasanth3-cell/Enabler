import { Router } from 'express';
import { getAttendance, punchIn, punchOut, modifyAttendance } from '../controllers/attendance.controller';

const router = Router();

router.get('/', getAttendance);
router.post('/punch-in', punchIn);
router.post('/punch-out', punchOut);
router.patch('/:id/modify', modifyAttendance);

export default router;
