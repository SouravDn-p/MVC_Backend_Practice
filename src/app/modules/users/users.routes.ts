import { Router } from 'express';
import { UsersController } from './users.controller.ts';
import { protect, restrictTo } from '../../common/middlewares/auth.middleware.ts';
import { validate } from '../../common/guards/validate.middleware.ts';
import { updateUserDto } from './dto/update-user.dto.ts';

const router = Router();
const usersController = new UsersController();

// User Profile (Self) Endpoints
router.get('/me', protect, (req, res, next) => usersController.getMe(req, res, next));
router.patch('/me', protect, validate(updateUserDto), (req, res, next) => usersController.updateMe(req, res, next));

// Administrative User Management Endpoints
router.get('/', protect, restrictTo('admin'), (req, res, next) => usersController.getAllUsers(req, res, next));
router.get('/:id', protect, restrictTo('admin'), (req, res, next) => usersController.getUserById(req, res, next));
router.patch('/:id', protect, restrictTo('admin'), validate(updateUserDto), (req, res, next) => usersController.updateUser(req, res, next));
router.delete('/:id', protect, restrictTo('admin'), (req, res, next) => usersController.deleteUser(req, res, next));

export default router;