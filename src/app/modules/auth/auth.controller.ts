import type { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service.ts';
import { sendSuccess } from '../../common/interceptors/response.util.ts';
import { HTTP_STATUS } from '../../common/constants/http-status.constants.ts';
import { MESSAGES } from '../../common/constants/messages.constants.ts';
import { ENV } from '../../../config/env.config.ts';

const authService = new AuthService();

const cookieOptions = {
  httpOnly: true,
  secure: ENV.IS_PRODUCTION,
  sameSite: 'strict' as const,
};

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { user, tokens } = await authService.register(req.body);

      res.cookie('accessToken', tokens.accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000, // 15 mins
      });

      res.cookie('refreshToken', tokens.refreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      sendSuccess(res, HTTP_STATUS.CREATED, MESSAGES.AUTH.REGISTER_SUCCESS, { user, tokens });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { user, tokens } = await authService.login(req.body);

      res.cookie('accessToken', tokens.accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000,
      });

      res.cookie('refreshToken', tokens.refreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      sendSuccess(res, HTTP_STATUS.OK, MESSAGES.AUTH.LOGIN_SUCCESS, { user, tokens });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (userId) {
        await authService.logout(userId);
      }

      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');

      sendSuccess(res, HTTP_STATUS.OK, MESSAGES.AUTH.LOGOUT_SUCCESS);
    } catch (error) {
      next(error);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = req.cookies?.refreshToken || req.body?.refreshToken;
      if (!token) {
        sendSuccess(res, HTTP_STATUS.UNAUTHORIZED, MESSAGES.AUTH.TOKEN_INVALID);
        return;
      }

      const tokens = await authService.refreshTokens(token);

      res.cookie('accessToken', tokens.accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000,
      });

      res.cookie('refreshToken', tokens.refreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      sendSuccess(res, HTTP_STATUS.OK, MESSAGES.AUTH.TOKEN_REFRESHED, tokens);
    } catch (error) {
      next(error);
    }
  }
}