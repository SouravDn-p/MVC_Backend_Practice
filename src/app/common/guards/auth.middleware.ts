import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../exceptions/app-error.exception.ts';
import { HTTP_STATUS } from '../constants/http-status.constants.ts';
import { MESSAGES } from '../constants/messages.constants.ts';
import { verifyAccessToken } from '../utils/jwt.util.ts';
import { prisma } from '../../../config/db/database.config.ts';

const loadUser = async (userId: string) => {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true, isActive: true },
  });
};

export const protect = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token = req.cookies?.accessToken;

    if (!token) {
      return next(new AppError(MESSAGES.AUTH.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED));
    }

    const decoded = verifyAccessToken(token);
    const user = await loadUser(decoded.userId);

    if (!user) {
      return next(new AppError(MESSAGES.USER.NOT_FOUND, HTTP_STATUS.UNAUTHORIZED));
    }

    if (!user.isActive) {
      return next(new AppError(MESSAGES.AUTH.ACCOUNT_DEACTIVATED, HTTP_STATUS.FORBIDDEN));
    }

    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch {
    next(new AppError(MESSAGES.AUTH.TOKEN_INVALID, HTTP_STATUS.UNAUTHORIZED));
  }
};

export const restrictTo = (...roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError(MESSAGES.AUTH.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError(MESSAGES.AUTH.FORBIDDEN, HTTP_STATUS.FORBIDDEN));
    }

    next();
  };
};

export const optionalProtect = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token = req.cookies?.accessToken;
    if (!token) return next();

    const decoded = verifyAccessToken(token);
    const user = await loadUser(decoded.userId);

    if (user?.isActive) {
      req.user = {
        userId: user.id,
        email: user.email,
        role: user.role,
      };
    }

    next();
  } catch {
    next();
  }
};
