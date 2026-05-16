import {type Request,type Response,type NextFunction } from 'express';
import { AppError } from './app-error.exception.ts';
import { logger } from '../../utils/logger.util.ts';
import { HTTP_STATUS } from '../constants/http-status.constants.ts';
import { ENV } from '../../../config/env.config.ts';


export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Known operational error
  if (err instanceof AppError) {
    logger.warn(`[AppError] ${err.statusCode} - ${err.message}`);
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  // Mongoose duplicate key
  if ((err as any).code === 11000) {
    const field = Object.keys((err as any).keyValue || {})[0] || 'field';
    res.status(HTTP_STATUS.CONFLICT).json({
      success: false,
      message: `${field} already exists`,
    });
    return;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    res.status(HTTP_STATUS.UNPROCESSABLE_ENTITY).json({
      success: false,
      message: err.message,
    });
    return;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: 'Invalid or expired token',
    });
    return;
  }

  // Unknown / programmer error — log it fully
  logger.error('[UnhandledError]', { message: err.message, stack: err.stack });

  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    success: false,
    message: ENV.IS_PRODUCTION ? 'Something went wrong' : err.message,
    ...(ENV.IS_PRODUCTION ? {} : { stack: err.stack }),
  });
};