import { Router } from 'express';
import { getUsers, createUser, toggleUserStatus } from '../controllers/users.controller';

const router = Router();

router.get('/', getUsers);
router.post('/', createUser);
router.patch('/:id/toggle-status', toggleUserStatus);

export default router;
