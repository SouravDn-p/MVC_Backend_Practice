import type { Request, Response, NextFunction } from 'express';
import { UsersService } from './users.service.ts';
import { sendSuccess } from '../../common/interceptors/response.util.ts';
import { HTTP_STATUS } from '../../common/constants/http-status.constants.ts';
import { MESSAGES } from '../../common/constants/messages.constants.ts';

const usersService = new UsersService();

export class UsersController {
  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({ success: false, message: MESSAGES.AUTH.UNAUTHORIZED });
        return;
      }
      const user = await usersService.getUserProfile(userId);
      sendSuccess(res, HTTP_STATUS.OK, MESSAGES.USER.FETCHED, user);
    } catch (error) {
      next(error);
    }
  }

  async updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({ success: false, message: MESSAGES.AUTH.UNAUTHORIZED });
        return;
      }
      const user = await usersService.updateUserProfile(userId, req.body);
      sendSuccess(res, HTTP_STATUS.OK, MESSAGES.USER.UPDATED, user);
    } catch (error) {
      next(error);
    }
  }

  async getAllUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await usersService.getAllUsers();
      sendSuccess(res, HTTP_STATUS.OK, MESSAGES.USER.FETCHED, users);
    } catch (error) {
      next(error);
    }
  }

  async getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] || '' : req.params.id || '';
      const user = await usersService.getUserById(id);
      sendSuccess(res, HTTP_STATUS.OK, MESSAGES.USER.FETCHED, user);
    } catch (error) {
      next(error);
    }
  }

  async updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] || '' : req.params.id || '';
      const user = await usersService.updateUser(id, req.body);
      sendSuccess(res, HTTP_STATUS.OK, MESSAGES.USER.UPDATED, user);
    } catch (error) {
      next(error);
    }
  }

  async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] || '' : req.params.id || '';
      await usersService.deleteUser(id);
      sendSuccess(res, HTTP_STATUS.OK, MESSAGES.USER.DELETED);
    } catch (error) {
      next(error);
    }
  }
}
