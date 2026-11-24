import { Router } from 'express';
import { getUsers, createUser, toggleUserStatus, reassignUserTeam } from '../controllers/users.controller';

const router = Router();

router.get('/', getUsers);
router.post('/', createUser);
router.patch('/:id/toggle-status', toggleUserStatus);
router.patch('/:id/reassign-team', reassignUserTeam);

export default router;
