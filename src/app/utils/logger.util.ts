import winston from 'winston';
import { ENV } from '../../config/env.config.ts';

const { combine, timestamp, colorize, printf, json } = winston.format;

const devFormat = combine(
  colorize(),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  printf(({ level, message, timestamp, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${level}: ${message}${metaStr}`;
  })
);

const prodFormat = combine(timestamp(), json());

export const logger = winston.createLogger({
  level: ENV.IS_PRODUCTION ? 'warn' : 'debug',
  format: ENV.IS_PRODUCTION ? prodFormat : devFormat,
  transports: [
    new winston.transports.Console(),
    ...(ENV.IS_PRODUCTION
      ? [
          new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
          new winston.transports.File({ filename: 'logs/combined.log' }),
        ]
      : []),
  ],
});