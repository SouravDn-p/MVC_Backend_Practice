import express, { type Application, type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import hpp from 'hpp';
import swaggerUi from 'swagger-ui-express';
import { ENV } from './config/env.config.ts';
import { swaggerSpec } from './config/swagger.config.ts';
import { errorHandler } from './app/common/exceptions/error-handler.exeption.ts';
import { AppError } from './app/common/exceptions/app-error.exception.ts';
import { HTTP_STATUS } from './app/common/constants/http-status.constants.ts';
import { MESSAGES } from './app/common/constants/messages.constants.ts';
import { sendSuccess } from './app/common/interceptors/response.util.ts';
import { prisma } from './config/db/database.config.ts';
import passport from './config/passport.config.ts';
import authRouter from './app/modules/auth/auth.modules.ts';
import usersRouter from './app/modules/users/users.modules.ts';

export const CreateApp = (): Application => {
  const app: Application = express();

  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: ENV.IS_PRODUCTION
        ? {
            directives: {
              defaultSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              scriptSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
            },
          }
        : false,
    }),
  );

  app.use(
    cors({
      origin: ENV.ALLOWED_ORIGINS,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type'],
    }),
  );

  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, message: 'Too many requests, please try again later' },
      skip: (req) => req.path === '/health' || req.path === '/',
    }),
  );

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: ENV.IS_PRODUCTION ? 10 : 100,
    message: { success: false, message: 'Too many auth attempts, please try again later' },
  });

  app.use(passport.initialize());

  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));
  app.use(cookieParser());
  app.use(hpp());

  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customSiteTitle: 'MVC API Docs',
      swaggerOptions: { withCredentials: true, filter: true, persistAuthorization: true },
    }),
  );

  app.use('/api/v1/auth', authLimiter, authRouter);
  app.use('/api/v1/users', usersRouter);

  app.get('/', (_req: Request, res: Response) => {
    res.send('Welcome to the MVC API');
  });

  app.get('/health', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      sendSuccess(res, HTTP_STATUS.OK, MESSAGES.HEALTH.OK, {
        database: 'up',
        mail: ENV.BREVO_API_KEY ? 'brevo' : 'unconfigured',
      });
    } catch (error) {
      next(error);
    }
  });

  app.use((req: Request, _res: Response, next: NextFunction) => {
    next(new AppError(`Cannot ${req.method} ${req.originalUrl}`, HTTP_STATUS.NOT_FOUND));
  });

  app.use(errorHandler);
  return app;
};
