import { type Response } from 'express';
import { ENV } from '../../../config/env.config.ts';

export const cookieOptions = {
  httpOnly: true,
  secure: ENV.IS_PRODUCTION,
  sameSite: 'lax' as const,
  path: '/',
};

export const setAuthCookies = (
  res: Response,
  tokens: { accessToken: string; refreshToken: string },
): void => {
  res.cookie('accessToken', tokens.accessToken, {
    ...cookieOptions,
    maxAge: ENV.ACCESS_TOKEN_TTL_MS,
  });

  res.cookie('refreshToken', tokens.refreshToken, {
    ...cookieOptions,
    maxAge: ENV.REFRESH_TOKEN_TTL_MS,
  });
};

export const clearAuthCookies = (res: Response): void => {
  res.clearCookie('accessToken', cookieOptions);
  res.clearCookie('refreshToken', cookieOptions);
};
