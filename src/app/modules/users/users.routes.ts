import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { UsersController } from './users.controller.ts';
import { protect, restrictTo } from '../../common/guards/auth.middleware.ts';
import { validateDto } from '../../common/guards/validate-dto.middleware.ts';
import { optionalImageUpload } from '../../common/guards/upload.middleware.ts';
import { updateUserDtoSchema, updateUserStatusDtoSchema } from './dto/users.dto.ts';

const router = Router();
const usersController = new UsersController();

router.get('/me', protect, (req, res, next) => usersController.getProfile(req, res, next));
router.patch(
  '/me',
  protect,
  optionalImageUpload('photo'),
  validateDto(updateUserDtoSchema),
  (req, res, next) => usersController.updateProfile(req, res, next),
);

router.get('/admin/users', protect, restrictTo(UserRole.ADMIN), (req, res, next) =>
  usersController.adminGetAllUsers(req, res, next),
);
router.patch(
  '/admin/users/:userId/status',
  protect,
  restrictTo(UserRole.ADMIN),
  validateDto(updateUserStatusDtoSchema),
  (req, res, next) => usersController.adminUpdateUserStatus(req, res, next),
);

export default router;
