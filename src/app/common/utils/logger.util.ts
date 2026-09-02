import winston from 'winston';
import { ENV } from '../../../config/env.config.ts';

const { combine, timestamp, printf, json, colorize, errors } = winston.format;

const devFormat = combine(
  colorize(),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, stack, ...meta }) => {
    const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    const body = stack ? `${message}\n${stack}` : message;
    return `${timestamp} ${level} : ${body}${extra}`;
  }),
);

const prodFormat = combine(timestamp(), errors({ stack: true }), json());

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