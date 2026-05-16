import express, { type Application, type Request, type Response  , type NextFunction} from "express";
import cors from 'cors';
import { ENV } from "./config/env.config.ts";
import helmet from "helmet";
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import hpp from 'hpp';
import { AppError } from "./app/common/exceptions/app-error.exception.ts";
import { HTTP_STATUS } from "./app/common/constants/http-status.constants.ts";
import { errorHandler } from "./app/common/exceptions/error-handler.middleware.ts";



export const createApp = (): Application => {
  const app: Application = express();
  
  // ─── Security Headers ───────────────────────────────────────────────────────
  app.use(helmet());

  app.use(
    cors({
      origin: ENV.ALLOWED_ORIGINS,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // ─── Rate Limiting ───────────────────────────────────────────────────────────
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please try again later' },
  }));

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { success: false, message: 'Too many auth attempts, please try again later' },
  });

  // ─── Body Parsers ────────────────────────────────────────────────────────────
  app.use(express.json({ limit: '10kb' }));      
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));
  app.use(cookieParser());

  app.use(hpp());

  // ─── Routes ──────────────────────────────────────────────────────────────────
  // Example of how to apply your strict auth limiter to specific routes later:
  // app.use('/api/v1/auth', authLimiter, authRouter);

  app.get('/', (req: Request, res: Response) => {
    res.send('MVC BACKEND TEMPLATE!');
  });

   // ─── 404 Handler ──────────────────────────────────────────────────────────────
   app.use((req: Request, _res: Response, next: NextFunction) => {
    next(new AppError(`Route ${req.originalUrl} not found`, HTTP_STATUS.NOT_FOUND));
  })

  // ─── Global Error Handler ─────────────────────────────────────────────────────
  // Must be LAST — Express identifies error handlers by the 4-arg signature
  app.use(errorHandler);


  return app;
};

export default createApp;