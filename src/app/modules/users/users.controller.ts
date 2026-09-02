import type { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../common/interceptors/response.util.ts';
import { HTTP_STATUS } from '../../common/constants/http-status.constants.ts';
import { MESSAGES } from '../../common/constants/messages.constants.ts';
import { UsersService } from './users.service.ts';
import { AppError } from '../../common/exceptions/app-error.exception.ts';
import { UserRole } from '@prisma/client';

const parsePositiveInt = (value: unknown, fallback: number): number => {
  const parsed = parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export class UsersController {
  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(MESSAGES.AUTH.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
      }
      const user = await UsersService.getUserProfile(req.user.userId);
      sendSuccess(res, HTTP_STATUS.OK, MESSAGES.USER.FETCHED, { user });
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(MESSAGES.AUTH.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
      }
      const user = await UsersService.updateUserProfile(req.user.userId, req.body, req.file);
      sendSuccess(res, HTTP_STATUS.OK, MESSAGES.USER.UPDATED, { user });
    } catch (error) {
      next(error);
    }
  }

  async adminGetAllUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = parsePositiveInt(req.query.limit, 20);
      const page = parsePositiveInt(req.query.page, 1);
      const search = req.query.search as string | undefined;
      const role = req.query.role as UserRole | undefined;

      if (role && !Object.values(UserRole).includes(role)) {
        throw new AppError('Invalid role filter', HTTP_STATUS.BAD_REQUEST);
      }

      const result = await UsersService.adminGetAllUsers(limit, page, search, role);
      sendSuccess(res, HTTP_STATUS.OK, 'All users retrieved successfully', result);
    } catch (error) {
      next(error);
    }
  }

  async adminUpdateUserStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(MESSAGES.AUTH.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
      }
      const targetUserId = req.params.userId as string;
      const { isActive } = req.body;
      const user = await UsersService.adminUpdateUserStatus(
        req.user.userId,
        targetUserId,
        isActive,
      );
      const message = isActive ? 'User activated successfully' : 'User deactivated successfully';
      sendSuccess(res, HTTP_STATUS.OK, message, { user });
    } catch (error) {
      next(error);
    }
  }
}
