import { type Request, type Response, type NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { logger } from '../utils/logger.util.ts';
import { AppError } from './app-error.exception.ts';
import { HTTP_STATUS } from '../constants/http-status.constants.ts';
import { ENV } from '../../../config/env.config.ts';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (err instanceof AppError) {
    logger.warn(`[AppError] ${err.statusCode} - ${err.message}`);
    res.status(err.statusCode).json({ success: false, message: err.message });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const field = (err.meta?.target as string[])?.[0] ?? 'field';
      res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        message: `${field} already exists`,
      });
      return;
    }

    if (err.code === 'P2025') {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'Record not found',
      });
      return;
    }

    if (err.code === 'P2003') {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Related record not found',
      });
      return;
    }

    logger.error(`[PrismaKnownError] ${err.code}:`, err.message);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: ENV.IS_PRODUCTION ? 'Database error' : err.message,
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: ENV.IS_PRODUCTION ? 'Invalid data provided' : err.message,
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientInitializationError) {
    logger.error('[PrismaInitError]', err.message);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Database connection failed',
    });
    return;
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: 'Invalid or expired token',
    });
    return;
  }

  logger.error('[UnhandledError]', { message: err.message, stack: err.stack });
  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    success: false,
    message: ENV.IS_PRODUCTION ? 'Something went wrong' : err.message,
    ...(ENV.IS_PRODUCTION ? {} : { stack: err.stack }),
  });
};