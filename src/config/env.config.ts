import dotenv from 'dotenv';
dotenv.config();

const required = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
};

const POSTGRES_USER = required('POSTGRES_USER');
const POSTGRES_PASSWORD = required('POSTGRES_PASSWORD');
const POSTGRES_DB = required('POSTGRES_DB');
const POSTGRES_HOST = process.env.POSTGRES_HOST || 'localhost';
const POSTGRES_PORT = process.env.POSTGRES_PORT || '5432';

const builtDatabaseUrl = `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}`;

if (process.env.NODE_ENV === 'production') {
  required('BREVO_API_KEY');
}

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  PORT: Number(process.env.PORT) || 5000,

  POSTGRES_USER,
  POSTGRES_PASSWORD,
  POSTGRES_DB,
  POSTGRES_HOST,
  POSTGRES_PORT: Number(POSTGRES_PORT),
  DATABASE_URL: process.env.DATABASE_URL || builtDatabaseUrl,

  FRONTEND_URL: required('FRONTEND_URL'),
  BACKEND_URL: required('BACKEND_URL'),
  ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),

  JWT_ACCESS_SECRET: required('JWT_ACCESS_SECRET'),
  JWT_REFRESH_SECRET: required('JWT_REFRESH_SECRET'),
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  ACCESS_TOKEN_TTL_MS: 15 * 60 * 1000,
  REFRESH_TOKEN_TTL_MS: 7 * 24 * 60 * 60 * 1000,

  SESSION_SECRET: required('SESSION_SECRET'),

  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL || '',

  BREVO_API_KEY: process.env.BREVO_API_KEY || '',
  MAIL_FROM: required('MAIL_FROM'),
  MAIL_FROM_NAME: process.env.MAIL_FROM_NAME || 'MVC API',

  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',

  OTP_EXPIRES_MIN: Number(process.env.OTP_EXPIRES_MIN) || 10,
};

export const isCloudinaryConfigured = (): boolean =>
  Boolean(ENV.CLOUDINARY_CLOUD_NAME && ENV.CLOUDINARY_API_KEY && ENV.CLOUDINARY_API_SECRET);
