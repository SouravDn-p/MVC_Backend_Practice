# Build this MVC API from an empty folder

This is a **step-by-step guide**. Start in an empty directory and type (or paste) each file in order. Do not skip a phase. Do not add extra modules until the checkpoint at the end of that phase passes.

You are building a small **starter API**, not an auction product:

- Express 5 + TypeScript ESM (`tsx` in development — no compile step)
- Cookie JWT auth (`accessToken` 15m, `refreshToken` 7d, HttpOnly — tokens never in JSON)
- Users module (own profile + admin list / status)
- PostgreSQL via Prisma 7
- Email via the **Brevo HTTP API** (no Redis, no BullMQ, no Mailpit)
- Profile photos via **Cloudinary**

When you finish, this works:

```text
register → OTP (Brevo or API logs) → verify-email (cookies set)
→ GET /users/me → refresh-token → logout
```

---

## How to use this document

1. Create an empty folder. Follow **Phase 0**, then **Phase 1**, and so on.
2. Each phase has **Install**, **Create this file**, **Why this exists**, and a **Checkpoint**.
3. Do not copy files from a later phase early. Imports will fail.
4. Canonical shared code lives in `src/app/common/`. Do **not** create a second `src/common/` tree.
5. All TypeScript imports use the `.ts` extension (`import { ENV } from './config/env.config.ts'`). That is required with `"type": "module"` + `NodeNext`.

If you already have this repository cloned, you can skip typing and use it as the answer key. The phases still explain **why** each file exists and **in what order** to add it.

---

## Table of contents

1. [What you are building](#1-what-you-are-building)
2. [Prerequisites](#2-prerequisites)
3. [Phase 0 — Empty project](#phase-0--empty-project)
4. [Phase 1 — TypeScript](#phase-1--typescript)
5. [Phase 2 — Folder skeleton](#phase-2--folder-skeleton)
6. [Phase 3 — Environment config](#phase-3--environment-config)
7. [Phase 4 — Common layer](#phase-4--common-layer)
8. [Phase 5 — First HTTP server](#phase-5--first-http-server)
9. [Phase 6 — Prisma + PostgreSQL](#phase-6--prisma--postgresql)
10. [Phase 7 — Mail (Brevo) and email templates](#phase-7--mail-brevo-and-email-templates)
11. [Phase 8 — JWT, cookies, OTP](#phase-8--jwt-cookies-otp)
12. [Phase 9 — Cloudinary and file upload](#phase-9--cloudinary-and-file-upload)
13. [Phase 10 — Auth guards](#phase-10--auth-guards)
14. [Phase 11 — Auth module](#phase-11--auth-module)
15. [Phase 12 — Users module](#phase-12--users-module)
16. [Phase 13 — Wire `app.ts`, Passport, Swagger](#phase-13--wire-appts-passport-swagger)
17. [Phase 14 — Docker and Makefile](#phase-14--docker-and-makefile)
18. [How authentication works](#how-authentication-works)
19. [How a request moves through the layers](#how-a-request-moves-through-the-layers)
20. [Verify the finished API](#verify-the-finished-api)
21. [Adding a later module](#adding-a-later-module)
22. [Finished `package.json`](#finished-packagejson)
23. [Common mistakes](#common-mistakes)

---

## 1. What you are building

```text
Client
  │  credentials: 'include'  (cookies)
  ▼
Express  (helmet, cors, rate limit, cookie-parser)
  │
  ├─ /api/docs          Swagger UI
  ├─ /health            Prisma SELECT 1
  ├─ /api/v1/auth/*     register, OTP, login, refresh, sessions, Google
  └─ /api/v1/users/*    me, admin users
        │
        ▼
  AuthService / UsersService
        │
        ├─ PostgreSQL  (User, UserToken)
        ├─ Brevo       (OTP + welcome mail, in-process)
        └─ Cloudinary  (optional photo upload)
```

Feature folders always look like this:

```text
src/app/modules/<name>/
  <name>.routes.ts
  <name>.controller.ts
  <name>.service.ts
  <name>.modules.ts      re-exports the router
  dto/
  interfaces/
  doc/                   OpenAPI paths
```

Controllers stay thin: parse the request, call the service, `sendSuccess`. Services throw `AppError`. Routes attach `validateDto`, `protect`, `restrictTo`.

---

## 2. Prerequisites

- Node.js 20+
- npm
- Docker Desktop (or Engine + Compose v2) for PostgreSQL
- A code editor

Optional later:

- A [Brevo](https://www.brevo.com/) API key (without it, OTPs are printed in API logs)
- A [Cloudinary](https://cloudinary.com/) cloud (required only for multipart photo upload)
- Google OAuth credentials (leave blank to disable)

You do **not** need Redis. You do **not** need a local Postgres install if you use Docker.

---

## Phase 0 — Empty project

**Install.** Create the folder and initialise git and npm:

```bash
mkdir mvc-api && cd mvc-api
git init
npm init -y
```

Open `package.json` and set `"type": "module"`. Without that, Node treats files as CommonJS and the `.ts` ESM imports in this guide will not work.

**Create this file:** `.gitignore`

```gitignore
node_modules/
.env
.env.*
!.env.example
dist/
build/
logs/
*.log
.DS_Store
cookies.txt
```

**Why this exists.** `.env` holds secrets. `node_modules` is regenerated. `cookies.txt` is created by the curl checks at the end.

**Checkpoint.** `ls -a` shows `.gitignore` and `package.json`. `"type"` in `package.json` is `"module"`.

---

## Phase 1 — TypeScript

**Install.**

```bash
npm install -D typescript tsx nodemon prettier @types/node
```

**Create this file:** `tsconfig.json`

```json
{
    "compilerOptions": {
      "rootDir": "./src",
      "outDir": "./dist",
      "allowImportingTsExtensions": true,
      "noEmit": true,
      "module": "NodeNext",
      "moduleResolution": "NodeNext",
      "target": "ES2022",
      "types": ["node"],
      "strict": true,
      "verbatimModuleSyntax": true,
      "isolatedModules": true,
      "esModuleInterop": true,
      "skipLibCheck": true,
      "forceConsistentCasingInFileNames": true,
      "noUncheckedIndexedAccess": true
    },
    "include": ["src/**/*"],
    "exclude": ["node_modules", "dist"]
  }
```

Important flags:

| Flag | Why |
| --- | --- |
| `"module": "NodeNext"` | ESM resolution like Node |
| `"allowImportingTsExtensions": true` | Imports end in `.ts` |
| `"noEmit": true` | `tsx` runs TypeScript directly; `tsc` is a typecheck |

**Create this file:** `.prettierrc`

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

**Create this file:** `.prettierignore`

```gitignore
node_modules
dist
build
logs
package-lock.json
*.md
```

Add these scripts to `package.json` (keep `"type": "module"`):

```json
{
  "scripts": {
    "dev": "nodemon --watch src -e ts --exec tsx src/main.ts",
    "start": "tsx src/main.ts",
    "build": "tsc",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:studio": "prisma studio"
  }
}
```

Do **not** install Express, Prisma, or Swagger yet. Each later phase has an **Install** block.

**Checkpoint.** `npx tsc --noEmit` fails because `src/` does not exist yet. That is expected. `node -e "console.log(require('./package.json').type)"` prints `module`.

---

## Phase 2 — Folder skeleton

Create empty directories only. Do not invent extra folders.

```bash
mkdir -p \
  src/app/common/constants \
  src/app/common/exceptions \
  src/app/common/guards \
  src/app/common/interceptors \
  src/app/common/utils \
  src/app/common/docs \
  src/app/modules/auth/dto \
  src/app/modules/auth/interfaces \
  src/app/modules/auth/doc \
  src/app/modules/users/dto \
  src/app/modules/users/interfaces \
  src/app/modules/users/doc \
  src/config/db \
  src/config/cloudinary \
  src/services/templates \
  src/types \
  prisma \
  docs
```

Target layout:

```text
src/
  main.ts                         process entry (Phase 5)
  app.ts                          middleware + route mount (Phase 5, then 13)
  types/express.d.ts              req.user
  config/
    env.config.ts
    passport.config.ts
    swagger.config.ts
    db/database.config.ts
    cloudinary/cloudinary.config.ts
  app/common/
    constants/
    exceptions/
    guards/
    interceptors/
    utils/
    docs/
  app/modules/auth/
  app/modules/users/
  services/templates/email-templates.ts
prisma/schema.prisma
prisma.config.ts
```

**Why this exists.** Shared code is not a second app. It sits under `src/app/common/` so a module import is always `../../common/...`. Config (env, Prisma, Passport, Cloudinary, Swagger) stays out of modules.

**Checkpoint.** `find src prisma -type d | sort` matches the tree above.

---

## Phase 3 — Environment config

**Install.**

```bash
npm install dotenv
```

Nothing else should read `process.env` directly. One file validates and exports `ENV`.

**Create this file:** `.env.example`

```dotenv
# Copy to `.env` then start:
#   make env && make up
#
# POSTGRES_HOST=localhost  — host `npm run dev` / `make dev` (published Postgres port)
# The API container sets POSTGRES_HOST=postgres (the only compose override).

NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

POSTGRES_USER=mvc
POSTGRES_PASSWORD=mvcsecret
POSTGRES_DB=mvc_api
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_VOLUME_NAME=mvc_postgres_data
COMPOSE_NETWORK_NAME=mvc_network

# Local-only placeholders. Generate real values before production:
#   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
SESSION_SECRET=local-dev-session-secret-change-me-please-32ch
JWT_ACCESS_SECRET=local-dev-access-secret-change-me-please-32chars
JWT_REFRESH_SECRET=local-dev-refresh-secret-change-me-please-32
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
OTP_EXPIRES_MIN=10

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:5000/api/v1/auth/google/callback

MAIL_FROM=no-reply@example.com
MAIL_FROM_NAME=MVC API
BREVO_API_KEY=

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

```bash
cp .env.example .env
```

Generate real JWT secrets before you share the project:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Use three different values for `SESSION_SECRET`, `JWT_ACCESS_SECRET`, and `JWT_REFRESH_SECRET`.

**Create this file:** `src/config/env.config.ts`

```ts
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
```


**Why this exists.**

- `required()` crashes at startup if a secret is missing, instead of failing on the first request.
- `DATABASE_URL` is built from `POSTGRES_*` so Compose only has to override `POSTGRES_HOST`.
- Production refuses to start without `BREVO_API_KEY`. Locally a missing key is allowed so you can still register and read the OTP from logs.
- `isCloudinaryConfigured()` lets photo upload fail with a clear 400 instead of a Cloudinary SDK error.

**Checkpoint.** This file cannot run alone yet (`logger` is later). Confirm `.env` exists and JWT secrets are at least 32 characters.

---

## Phase 4 — Common layer

**Install.**

```bash
npm install winston joi
npm install -D @types/express
```

`@types/express` is needed because the error handler and Joi middleware type `Request` / `Response`. You install Express itself in the next phase.

Build the pieces every module will import: HTTP status numbers, user-facing messages, `AppError`, the Express error handler, Joi validation, the JSON envelope, and Winston.

**Create this file:** `src/app/common/constants/http-status.constants.ts`

```ts
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
} as const;
```


**Why this exists.** Magic numbers like `401` scatter through services. Named constants keep controllers readable.

**Create this file:** `src/app/common/constants/messages.constants.ts`

```ts
export const MESSAGES = {
  AUTH: {
    EMAIL_EXISTS: 'An account with this email already exists',
    INVALID_CREDENTIALS: 'Invalid email or password',
    TOKEN_INVALID: 'Invalid or expired token',
    UNAUTHORIZED: 'You are not authorized to access this resource',
    FORBIDDEN: 'You do not have permission to perform this action',
    REGISTER_SUCCESS: 'Registration successful. Please verify your email.',
    LOGIN_SUCCESS: 'Logged in successfully',
    LOGOUT_SUCCESS: 'Logged out successfully',
    LOGOUT_ALL_SUCCESS: 'Logged out from all devices successfully',
    TOKEN_REFRESHED: 'Token refreshed successfully',
    EMAIL_NOT_VERIFIED: 'Please verify your email before logging in',
    EMAIL_ALREADY_VERIFIED: 'This email is already verified',
    OTP_SENT: 'A verification code has been sent to your email',
    OTP_INVALID: 'Invalid or expired verification code',
    OTP_VERIFIED: 'Email verified successfully',
    PASSWORD_RESET_SENT: 'If an account exists with this email, a reset code has been sent',
    PASSWORD_RESET_SUCCESS: 'Password reset successfully',
    ACCOUNT_DEACTIVATED: 'Your account has been deactivated',
    GOOGLE_NOT_CONFIGURED: 'Google OAuth is not configured on this server',
  },
  USER: {
    FETCHED: 'User fetched successfully',
    UPDATED: 'User updated successfully',
    DELETED: 'User deleted successfully',
    NOT_FOUND: 'User not found',
    NOTHING_TO_UPDATE: 'Provide at least one field or an image to update',
  },
  HEALTH: {
    OK: 'Service is healthy',
    DEGRADED: 'Service is degraded',
  },
} as const;
```


**Why this exists.** Swagger examples and `sendSuccess` share the same strings. Change a message once.

**Create this file:** `src/app/common/exceptions/app-error.exception.ts`

```ts
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this);
  }
}
```


**Why this exists.** Services throw `new AppError(message, statusCode)`. The error handler turns that into `{ success: false, message }` and does not leak a stack in production.

**Create this file:** `src/app/common/utils/logger.util.ts`

```ts
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
```


**Create this file:** `src/app/common/exceptions/error-handler.exeption.ts`

(The filename keeps the original spelling `exeption`.) Prisma is not installed yet, so this first version only handles `AppError` and unknown errors. You will **replace** it in Phase 6.

```ts
import { type Request, type Response, type NextFunction } from 'express';
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

  logger.error('[UnhandledError]', { message: err.message, stack: err.stack });
  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    success: false,
    message: ENV.IS_PRODUCTION ? 'Something went wrong' : err.message,
    ...(ENV.IS_PRODUCTION ? {} : { stack: err.stack }),
  });
};
```

**Why this exists.** Controllers never send 500 themselves. They `next(error)`. This middleware is the last `app.use`.

**Create this file:** `src/app/common/interceptors/response.util.ts`

```ts
import { type Response } from 'express';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  meta?: Record<string, unknown>;
  errors?: unknown;
}

export const sendSuccess = <T>(
  res: Response,
  statusCode: number,
  message: string,
  data?: T,
  meta?: Record<string, unknown>,
): Response => {
  const response: ApiResponse<T> = {
    success: true,
    message,
    ...(data !== undefined ? { data } : {}),
    ...(meta ? { meta } : {}),
  };
  return res.status(statusCode).json(response);
};

export const sendError = (
  res: Response,
  statusCode: number,
  message: string,
  errors?: unknown,
): Response => {
  const response: ApiResponse<never> = {
    success: false,
    message,
    ...(errors !== undefined ? { errors } : {}),
  };
  return res.status(statusCode).json(response);
};
```


**Why this exists.** Every success response is `{ success: true, message, data? }`. Tokens never go in this object.

**Create this file:** `src/app/common/guards/validate-dto.middleware.ts`

```ts
import type { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { AppError } from '../exceptions/app-error.exception.ts';
import { HTTP_STATUS } from '../constants/http-status.constants.ts';

const parseFormFields = (body: Record<string, unknown>): Record<string, unknown> => {
  const parsed = { ...body };

  if (typeof parsed.tags === 'string') {
    const tagsValue = parsed.tags;
    try {
      parsed.tags = JSON.parse(tagsValue) as string[];
    } catch {
      parsed.tags = tagsValue
        .split(',')
        .map((tag: string) => tag.trim())
        .filter(Boolean);
    }
  }

  if (parsed.isActive !== undefined) {
    parsed.isActive = parsed.isActive === 'true' || parsed.isActive === true;
  }

  if (parsed.excerpt === '') {
    parsed.excerpt = null;
  }

  return parsed;
};

const runValidation = (req: Request, schema: Joi.ObjectSchema, next: NextFunction): void => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const message = error.details.map((d) => d.message.replace(/"/g, '')).join(', ');
    return next(new AppError(message, HTTP_STATUS.BAD_REQUEST));
  }

  req.body = value;
  next();
};

export const validateDto = (schema: Joi.ObjectSchema) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    runValidation(req, schema, next);
  };
};

export const validateFormDto = (schema: Joi.ObjectSchema) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    req.body = parseFormFields(req.body);
    runValidation(req, schema, next);
  };
};
```


**Why this exists.** Joi runs before the controller. `stripUnknown: true` drops extra fields. `validateFormDto` exists for multipart bodies (`isActive` arrives as the string `"true"`).

**Checkpoint.** You now have a reusable common layer and zero HTTP routes. Next phase boots Express.

---

## Phase 5 — First HTTP server

**Install.**

```bash
npm install express
```

**Create this file:** `src/types/express.d.ts`

```ts
/// <reference types="express" />

declare global {
  namespace Express {
    interface User {
      userId: string;
      email: string;
      role: string;
    }

    interface Request {
      user?: User;
    }
  }
}

export {};
```


**Why this exists.** After `protect` runs, TypeScript knows `req.user.userId`.

For this phase only, create a **minimal** `src/app.ts` so the process can listen. You will **replace** this file in Phase 13 with helmet, CORS, rate limits, Swagger, and mounted routers.

```ts
import express, { type Application, type NextFunction, type Request, type Response } from 'express';
import { errorHandler } from './app/common/exceptions/error-handler.exeption.ts';
import { AppError } from './app/common/exceptions/app-error.exception.ts';
import { HTTP_STATUS } from './app/common/constants/http-status.constants.ts';

export const CreateApp = (): Application => {
  const app: Application = express();
  app.use(express.json({ limit: '10kb' }));

  app.get('/', (_req: Request, res: Response) => {
    res.send('Welcome to the MVC API');
  });

  app.use((req: Request, _res: Response, next: NextFunction) => {
    next(new AppError(`Cannot ${req.method} ${req.originalUrl}`, HTTP_STATUS.NOT_FOUND));
  });

  app.use(errorHandler);
  return app;
};
```

**Create this file:** `src/main.ts`

```ts
import { CreateApp } from './app.ts';
import { logger } from './app/common/utils/logger.util.ts';
import { connectDatabase, disconnectDatabase } from './config/db/database.config.ts';
import { ENV } from './config/env.config.ts';

const startServer = async (): Promise<void> => {
  await connectDatabase();

  const app = CreateApp();
  const server = app.listen(ENV.PORT, () => {
    logger.info(`Server running in ${ENV.NODE_ENV} mode on http://localhost:${ENV.PORT}`);
    logger.info(`Swagger UI available at: http://localhost:${ENV.PORT}/api/docs`);
  });

  let shuttingDown = false;

  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;

    logger.warn(`${signal} received — shutting down gracefully`);
    server.close(async () => {
      await disconnectDatabase();
      logger.info('Server and database connections closed');
      process.exit(0);
    });
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection:', reason);
    void shutdown('unhandledRejection');
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
  });
};

startServer().catch((error: unknown) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});
```


`main.ts` already calls `connectDatabase`. That function does not exist yet. Comment those two lines until Phase 6:

```ts
// await connectDatabase();
// ...
// await disconnectDatabase();
```

Put them back as soon as Prisma is wired.

**Checkpoint.**

```bash
npx tsx src/main.ts
```

Visit http://localhost:5000 — you should see `Welcome to the MVC API`. `curl -s http://localhost:5000/missing` should return `{ "success": false, "message": "Cannot GET /missing" }`. Stop the process (`Ctrl+C`) before the next phase.

---

## Phase 6 — Prisma + PostgreSQL

**Install.**

```bash
npm install @prisma/client @prisma/adapter-pg pg
npm install -D prisma @types/pg
```

Prisma 7 does **not** put `url` in `schema.prisma`. Connection string lives in `prisma.config.ts`. The Node client uses the `pg` adapter.

**Create this file:** `prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}

enum UserRole {
  USER
  ADMIN
}

enum AuthProvider {
  local
  google
}

enum TokenType {
  refresh
  emailVerification
  passwordReset
}

model User {
  id            String       @id @default(uuid(7)) @db.Uuid
  name          String       @db.VarChar(150)
  email         String       @unique @db.VarChar(255)
  photo         String?
  imagePublicId String?
  role          UserRole     @default(USER)
  location      String?
  isActive      Boolean      @default(true)
  emailVerified Boolean      @default(false)
  provider      AuthProvider @default(local)
  providerId    String?      @db.VarChar(255)
  password      String
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  tokens UserToken[]

  @@unique([provider, providerId])
  @@index([role])
  @@index([isActive])
  @@map("users")
}

model UserToken {
  id         String    @id @default(uuid(7)) @db.Uuid
  userId     String    @db.Uuid
  tokenType  TokenType @default(refresh)
  tokenHash  String    @unique @db.VarChar(255)
  deviceInfo Json?
  ipAddress  String?   @db.VarChar(45)
  userAgent  String?
  expiresAt  DateTime
  lastUsedAt DateTime  @default(now())
  createdAt  DateTime  @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, tokenType])
  @@index([expiresAt])
  @@map("user_tokens")
}
```


**Why this exists.**

- Two tables only: `User` and `UserToken`.
- Roles are `USER` | `ADMIN`.
- Token types: `refresh`, `emailVerification`, `passwordReset`.
- `userId` is `String @db.Uuid` so Postgres uuid columns match. Text FKs against uuid PKs fail at `db push`.
- `onDelete: Cascade` removes tokens when a user is deleted.

**Create this file:** `prisma.config.ts`

```ts
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

const user = process.env['POSTGRES_USER'] ?? 'mvc';
const password = process.env['POSTGRES_PASSWORD'] ?? 'mvcsecret';
const host = process.env['POSTGRES_HOST'] ?? 'localhost';
const port = process.env['POSTGRES_PORT'] ?? '5432';
const db = process.env['POSTGRES_DB'] ?? 'mvc_api';

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    url: process.env['DATABASE_URL'] ?? `postgresql://${user}:${password}@${host}:${port}/${db}`,
  },
});
```


**Create this file:** `src/config/db/database.config.ts`

```ts
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { ENV } from '../env.config.ts';
import { logger } from '../../app/common/utils/logger.util.ts';

declare global {
  var __prisma: PrismaClient | undefined;
}

const createPrismaClient = (): PrismaClient => {
  const pool = new pg.Pool({
    connectionString: ENV.DATABASE_URL,
  });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log: ENV.IS_PRODUCTION
      ? ['error']
      : [
          { emit: 'event', level: 'query' },
          { emit: 'event', level: 'error' },
          { emit: 'event', level: 'warn' },
        ],
    errorFormat: ENV.IS_PRODUCTION ? 'minimal' : 'pretty',
  });
};

export const prisma: PrismaClient = global.__prisma ?? createPrismaClient();

if (!ENV.IS_PRODUCTION) {
  global.__prisma = prisma;

  prisma.$on('query' as never, (e: { query: string; duration: number }) => {
    logger.debug(`Prisma Query: ${e.query} | Duration: ${e.duration}ms`);
  });
}

export const connectDatabase = async (): Promise<void> => {
  try {
    await prisma.$connect();
    logger.info('PostgreSQL connected via Prisma');
  } catch (error) {
    logger.error('Failed to connect to PostgreSQL:', error);
    process.exit(1);
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  await prisma.$disconnect();
  logger.info('PostgreSQL disconnected');
};
```


**Why this exists.** Prisma 7 requires a driver adapter (`PrismaPg`). The `global.__prisma` pattern avoids creating a new pool on every nodemon reload.

**Replace** `src/app/common/exceptions/error-handler.exeption.ts` with the Prisma-aware handler (unique email → 409, missing row → 404, JWT errors → 401):

```ts
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
```


Uncomment `connectDatabase` / `disconnectDatabase` in `src/main.ts`.

Start Postgres (Phase 14 adds Compose; until then you can run):

```bash
docker run --name mvc-postgres -e POSTGRES_USER=mvc -e POSTGRES_PASSWORD=mvcsecret \
  -e POSTGRES_DB=mvc_api -p 5432:5432 -d postgres:16-alpine
```

Or skip this container if you will use `docker compose` from Phase 14 next and come back to `db push`.

```bash
npx prisma generate
npx prisma db push
```

**Checkpoint.** `npx prisma studio` shows `users` and `user_tokens`. `npx tsx src/main.ts` logs `PostgreSQL connected via Prisma`.

---

## Phase 7 — Mail (Brevo) and email templates

Mail is sent **during the request**. There is no queue.

**Create this file:** `src/services/templates/email-templates.ts`

```ts
export const otpVerificationTemplate = (
  name: string,
  otp: string,
  expiresInMin: number,
): string => `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background: #f4f4f5; padding: 24px;">
  <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 8px; padding: 32px;">
    <h2 style="color: #1a1a1a; margin-top: 0;">Verify your email</h2>
    <p style="color: #444;">Hi ${name},</p>
    <p style="color: #444;">Use the code below to verify your account. This code expires in ${expiresInMin} minutes.</p>
    <div style="text-align: center; margin: 24px 0;">
      <span style="display: inline-block; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1a1a1a; background: #f0f0f0; padding: 16px 24px; border-radius: 8px;">${otp}</span>
    </div>
    <p style="color: #888; font-size: 13px;">If you didn't create an account, you can safely ignore this email.</p>
  </div>
</body>
</html>
`;

export const passwordResetTemplate = (
  name: string,
  otp: string,
  expiresInMin: number,
): string => `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background: #f4f4f5; padding: 24px;">
  <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 8px; padding: 32px;">
    <h2 style="color: #1a1a1a; margin-top: 0;">Reset your password</h2>
    <p style="color: #444;">Hi ${name},</p>
    <p style="color: #444;">Use the code below to reset your password. This code expires in ${expiresInMin} minutes.</p>
    <div style="text-align: center; margin: 24px 0;">
      <span style="display: inline-block; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1a1a1a; background: #f0f0f0; padding: 16px 24px; border-radius: 8px;">${otp}</span>
    </div>
    <p style="color: #888; font-size: 13px;">If you didn't request this, please ignore this email or contact support.</p>
  </div>
</body>
</html>
`;

export const welcomeEmailTemplate = (name: string): string => `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background: #f4f4f5; padding: 24px;">
  <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 8px; padding: 32px;">
    <h2 style="color: #1a1a1a; margin-top: 0;">Welcome, ${name}!</h2>
    <p style="color: #444;">Your account is verified and ready to go.</p>
  </div>
</body>
</html>
`;
```


The OTP is wrapped in `letter-spacing: 8px`. The mailer scrapes that to print the code in logs when Brevo is skipped.

**Create this file:** `src/app/common/utils/mailer.util.ts`

```ts
import { ENV } from '../../../config/env.config.ts';
import { logger } from './logger.util.ts';

interface SendEmailParams {
  to: string;
  toName?: string;
  subject: string;
  htmlContent: string;
}

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

const extractOtp = (html: string): string | undefined => {
  const match = html.match(/letter-spacing:\s*8px[^>]*>(\d{6})</);
  return match?.[1];
};

export const sendTransactionalEmail = async ({
  to,
  toName,
  subject,
  htmlContent,
}: SendEmailParams): Promise<void> => {
  if (!ENV.BREVO_API_KEY) {
    const otp = extractOtp(htmlContent);
    logger.warn(
      `[Brevo skipped] no BREVO_API_KEY. to=${to} subject=${subject}${otp ? ` OTP=${otp}` : ''}`,
    );
    return;
  }

  const response = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'api-key': ENV.BREVO_API_KEY,
    },
    body: JSON.stringify({
      sender: { name: ENV.MAIL_FROM_NAME, email: ENV.MAIL_FROM },
      to: [{ email: to, name: toName || to }],
      subject,
      htmlContent,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    logger.error(`Brevo send failed (${response.status}): ${errorBody}`);
    if (!ENV.IS_PRODUCTION) {
      const otp = extractOtp(htmlContent);
      if (otp) logger.warn(`[Brevo failed — local OTP] ${otp}`);
    }
    throw new Error(`Failed to send email: ${response.status}`);
  }
};
```


**Why this exists.**

- Production: POST to Brevo. Failures throw.
- Local, no `BREVO_API_KEY`: log `[Brevo skipped] ... OTP=123456` and return. Register still works.
- Local, bad key: log the OTP so you are not stuck.

**Checkpoint.** You cannot send mail until auth exists. Confirm `MAIL_FROM` is set in `.env`.

---

## Phase 8 — JWT, cookies, OTP

**Install.**

```bash
npm install jsonwebtoken bcryptjs cookie-parser
npm install -D @types/jsonwebtoken @types/bcryptjs @types/cookie-parser
```

**Create this file:** `src/app/common/utils/jwt.util.ts`

```ts
import jwt, { type SignOptions, type JwtPayload } from 'jsonwebtoken';
import { ENV } from '../../../config/env.config.ts';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export interface DecodedToken extends TokenPayload, JwtPayload {}

export const generateAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, ENV.JWT_ACCESS_SECRET, {
    expiresIn: ENV.JWT_ACCESS_EXPIRES_IN,
  } as SignOptions);
};

export const generateRefreshToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, ENV.JWT_REFRESH_SECRET, {
    expiresIn: ENV.JWT_REFRESH_EXPIRES_IN,
  } as SignOptions);
};

export const verifyAccessToken = (token: string): DecodedToken => {
  return jwt.verify(token, ENV.JWT_ACCESS_SECRET) as DecodedToken;
};

export const verifyRefreshToken = (token: string): DecodedToken => {
  return jwt.verify(token, ENV.JWT_REFRESH_SECRET) as DecodedToken;
};
```


**Why this exists.** Access and refresh use **different** secrets. Reusing one secret means a stolen refresh cookie can mint access tokens forever.

**Create this file:** `src/app/common/utils/cookie.util.ts`

```ts
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
```


**Why this exists.** `httpOnly: true` blocks `document.cookie`. `secure` is on in production (HTTPS). `sameSite: 'lax'` is the default for this starter.

**Create this file:** `src/app/common/utils/otp.util.ts`

```ts
import crypto from 'crypto';

export const generateOtp = (length = 6): string => {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[crypto.randomInt(0, digits.length)];
  }
  return otp;
};

export const hashOtp = (otp: string): string => {
  return crypto.createHash('sha256').update(otp).digest('hex');
};
```


**Why this exists.** The database stores `sha256(otp)`, never the raw 6 digits. `crypto.randomInt` is used instead of `Math.random`.

**Checkpoint.** No HTTP yet. Next: uploads, then guards, then the auth module that ties these together.

---

## Phase 9 — Cloudinary and file upload

**Install.**

```bash
npm install cloudinary multer
npm install -D @types/multer
```

**Create this file:** `src/config/cloudinary/cloudinary.config.ts`

```ts
import { v2 as cloudinary } from 'cloudinary';
import { ENV } from '../env.config.ts';

cloudinary.config({
  cloud_name: ENV.CLOUDINARY_CLOUD_NAME,
  api_key: ENV.CLOUDINARY_API_KEY,
  api_secret: ENV.CLOUDINARY_API_SECRET,
});

export { cloudinary };
```


**Create this file:** `src/app/common/utils/cloudinary.util.ts`

```ts
import { isCloudinaryConfigured } from '../../../config/env.config.ts';
import { cloudinary } from '../../../config/cloudinary/cloudinary.config.ts';
import { AppError } from '../exceptions/app-error.exception.ts';
import { HTTP_STATUS } from '../constants/http-status.constants.ts';

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
}

export const uploadImageBuffer = async (
  buffer: Buffer,
  folder = 'avatars',
): Promise<CloudinaryUploadResult> => {
  if (!isCloudinaryConfigured()) {
    throw new AppError(
      'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.',
      HTTP_STATUS.BAD_REQUEST,
    );
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `mvc-api/${folder}`,
        resource_type: 'image',
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error('Cloudinary upload returned no result'));
          return;
        }
        resolve({ url: result.secure_url, publicId: result.public_id });
      },
    );
    stream.end(buffer);
  });
};

export const deleteImage = async (publicId: string): Promise<void> => {
  if (!isCloudinaryConfigured() || !publicId) return;
  await cloudinary.uploader.destroy(publicId);
};
```


**Create this file:** `src/app/common/guards/upload.middleware.ts`

```ts
import multer from 'multer';
import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../exceptions/app-error.exception.ts';
import { HTTP_STATUS } from '../constants/http-status.constants.ts';

const storage = multer.memoryStorage();

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (!file.mimetype.startsWith('image/')) {
    cb(new AppError('Only image files are allowed', HTTP_STATUS.BAD_REQUEST));
    return;
  }
  cb(null, true);
};

const uploader = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
});

export const optionalImageUpload = (fieldName: string) => {
  const handler = uploader.single(fieldName);

  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.is('multipart/form-data')) {
      next();
      return;
    }

    handler(req, res, (err: unknown) => {
      if (err instanceof multer.MulterError) {
        next(new AppError(err.message, HTTP_STATUS.BAD_REQUEST));
        return;
      }
      next(err);
    });
  };
};
```


**Why this exists.** `PATCH /users/me` accepts JSON **or** `multipart/form-data`. If the request is not multipart, multer is skipped. Images only, 2 MB max, memory storage (buffer goes straight to Cloudinary).

**Checkpoint.** Leave `CLOUDINARY_*` empty until you try a file upload. JSON `photo` URLs still work.

---

## Phase 10 — Auth guards

**Create this file:** `src/app/common/guards/auth.middleware.ts`

```ts
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
```


**Why this exists.**

- `protect` reads `accessToken` from cookies, verifies JWT, loads the user from Postgres (no cache), rejects inactive accounts, sets `req.user`.
- `restrictTo('ADMIN')` runs **after** `protect`.
- `optionalProtect` never fails; used if you later add public routes that behave differently when logged in.

**Checkpoint.** Guards are unused until routes exist. Confirm `loadUser` selects only `id`, `email`, `role`, `isActive`.

---

## Phase 11 — Auth module

Build **bottom up**: interfaces → DTOs → service → controller → routes → module barrel.

**Create this file:** `src/app/modules/auth/interfaces/auth.interface.ts`

```ts
import type { User } from '@prisma/client';

export type SafeUser = Omit<User, 'password'>;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface RegisterDto {
  name: string;
  email: string;
  password: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface VerifyOtpDto {
  email: string;
  otp: string;
}

export interface ResendOtpDto {
  email: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  email: string;
  otp: string;
  newPassword: string;
}

export interface DeviceInfo {
  ipAddress?: string;
  userAgent?: string;
}

export interface GoogleProfile {
  googleId: string;
  name: string;
  email: string;
  avatar: string;
}
```


**Create this file:** `src/app/modules/auth/dto/register.dto.ts`

```ts
import Joi from 'joi';

export const registerDto = Joi.object({
  name: Joi.string().trim().min(2).max(50).required(),
  email: Joi.string().trim().email().lowercase().required(),
  password: Joi.string()
    .min(8)
    .max(72)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .required()
    .messages({
      'string.pattern.base':
        'Password must contain uppercase, lowercase, number, and special character',
    }),
});
```


**Create this file:** `src/app/modules/auth/dto/login.dto.ts`

```ts
import Joi from 'joi';

export const loginDto = Joi.object({
  email: Joi.string().trim().email().lowercase().required(),
  password: Joi.string().required(),
});
```


**Create this file:** `src/app/modules/auth/dto/verify-otp.dto.ts`

```ts
import Joi from 'joi';

export const verifyOtpDto = Joi.object({
  email: Joi.string().trim().email().lowercase().required(),
  otp: Joi.string().trim().length(6).pattern(/^\d+$/).required().messages({
    'string.pattern.base': 'OTP must be a 6-digit number',
  }),
});

export const resendOtpDto = Joi.object({
  email: Joi.string().trim().email().lowercase().required(),
});
```


**Create this file:** `src/app/modules/auth/dto/password-reset.dto.ts`

```ts
import Joi from 'joi';

export const forgotPasswordDto = Joi.object({
  email: Joi.string().trim().email().lowercase().required(),
});

export const resetPasswordDto = Joi.object({
  email: Joi.string().trim().email().lowercase().required(),
  otp: Joi.string().trim().length(6).pattern(/^\d+$/).required(),
  newPassword: Joi.string()
    .min(8)
    .max(72)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .required()
    .messages({
      'string.pattern.base':
        'Password must contain uppercase, lowercase, number, and special character',
    }),
});
```


**Create this file:** `src/app/modules/auth/auth.service.ts`

This is the core of the project. Read it slowly.

```ts
import type { User } from '@prisma/client';
import bcryptjs from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../../../config/db/database.config.ts';
import { HTTP_STATUS } from '../../common/constants/http-status.constants.ts';
import { MESSAGES } from '../../common/constants/messages.constants.ts';
import { AppError } from '../../common/exceptions/app-error.exception.ts';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../../common/utils/jwt.util.ts';
import { generateOtp, hashOtp } from '../../common/utils/otp.util.ts';
import { sendTransactionalEmail } from '../../common/utils/mailer.util.ts';
import { logger } from '../../common/utils/logger.util.ts';
import { ENV } from '../../../config/env.config.ts';
import {
  otpVerificationTemplate,
  passwordResetTemplate,
  welcomeEmailTemplate,
} from '../../../services/templates/email-templates.ts';
import type {
  RegisterDto,
  LoginDto,
  SafeUser,
  AuthTokens,
  VerifyOtpDto,
  ResendOtpDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  DeviceInfo,
  GoogleProfile,
} from './interfaces/auth.interface.ts';

const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

const sanitizeUser = (user: User): SafeUser => {
  const { password: _password, ...safeUser } = user;
  return safeUser;
};

const OTP_EXPIRES_MS = ENV.OTP_EXPIRES_MIN * 60 * 1000;
const REFRESH_EXPIRES_MS = ENV.REFRESH_TOKEN_TTL_MS;

const sessionDeviceFields = (device?: DeviceInfo) => ({
  ...(device?.ipAddress ? { ipAddress: device.ipAddress } : {}),
  ...(device?.userAgent ? { userAgent: device.userAgent } : {}),
  ...(device && (device.ipAddress || device.userAgent)
    ? {
        deviceInfo: {
          ...(device.ipAddress ? { ip: device.ipAddress } : {}),
          ...(device.userAgent ? { ua: device.userAgent } : {}),
        },
      }
    : {}),
});

export class AuthService {
  static async register(dto: RegisterDto): Promise<{ user: SafeUser }> {
    const exists = await prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) {
      throw new AppError(MESSAGES.AUTH.EMAIL_EXISTS, HTTP_STATUS.CONFLICT);
    }

    const hashedPassword = await bcryptjs.hash(dto.password, 12);

    const user = await prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashedPassword,
        emailVerified: false,
      },
    });

    await AuthService.issueAndSendOtp(user, 'emailVerification');
    return { user: sanitizeUser(user) };
  }

  private static async issueAndSendOtp(
    user: User,
    tokenType: 'emailVerification' | 'passwordReset',
  ): Promise<void> {
    const otp = generateOtp(6);
    const otpHash = hashOtp(otp);

    await prisma.userToken.deleteMany({
      where: { userId: user.id, tokenType },
    });

    await prisma.userToken.create({
      data: {
        userId: user.id,
        tokenType,
        tokenHash: otpHash,
        expiresAt: new Date(Date.now() + OTP_EXPIRES_MS),
      },
    });

    const subject =
      tokenType === 'emailVerification' ? 'Verify your email' : 'Reset your password';

    const htmlContent =
      tokenType === 'emailVerification'
        ? otpVerificationTemplate(user.name, otp, ENV.OTP_EXPIRES_MIN)
        : passwordResetTemplate(user.name, otp, ENV.OTP_EXPIRES_MIN);

    try {
      await sendTransactionalEmail({
        to: user.email,
        toName: user.name,
        subject,
        htmlContent,
      });
    } catch (error) {
      logger.error('Failed to send OTP email', error);
      if (ENV.IS_PRODUCTION) throw error;
    }
  }

  static async verifyEmailOtp(
    dto: VerifyOtpDto,
  ): Promise<{ user: SafeUser; tokens: AuthTokens }> {
    const user = await prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      throw new AppError(MESSAGES.AUTH.OTP_INVALID, HTTP_STATUS.BAD_REQUEST);
    }

    if (user.emailVerified) {
      throw new AppError(MESSAGES.AUTH.EMAIL_ALREADY_VERIFIED, HTTP_STATUS.CONFLICT);
    }

    const storedOtp = await prisma.userToken.findFirst({
      where: {
        userId: user.id,
        tokenType: 'emailVerification',
        tokenHash: hashOtp(dto.otp),
        expiresAt: { gt: new Date() },
      },
    });

    if (!storedOtp) {
      throw new AppError(MESSAGES.AUTH.OTP_INVALID, HTTP_STATUS.BAD_REQUEST);
    }

    const verifiedUser = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: user.id },
        data: { emailVerified: true },
      });
      await tx.userToken.deleteMany({
        where: { userId: user.id, tokenType: 'emailVerification' },
      });
      return updated;
    });

    try {
      await sendTransactionalEmail({
        to: verifiedUser.email,
        toName: verifiedUser.name,
        subject: 'Welcome',
        htmlContent: welcomeEmailTemplate(verifiedUser.name),
      });
    } catch (error) {
      logger.error('Failed to send welcome email', error);
    }

    const tokens = await AuthService.issueSession(verifiedUser);
    return { user: sanitizeUser(verifiedUser), tokens };
  }

  static async resendOtp(dto: ResendOtpDto): Promise<void> {
    const user = await prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) return;

    if (user.emailVerified) {
      throw new AppError(MESSAGES.AUTH.EMAIL_ALREADY_VERIFIED, HTTP_STATUS.CONFLICT);
    }

    const recentOtp = await prisma.userToken.findFirst({
      where: { userId: user.id, tokenType: 'emailVerification' },
      orderBy: { createdAt: 'desc' },
    });

    if (recentOtp) {
      const ageMs = Date.now() - recentOtp.createdAt.getTime();
      const minIntervalMs = 60 * 1000;
      if (ageMs < minIntervalMs) {
        throw new AppError(
          `Please wait ${Math.ceil((minIntervalMs - ageMs) / 1000)}s before requesting another code`,
          HTTP_STATUS.TOO_MANY_REQUESTS,
        );
      }
    }

    await AuthService.issueAndSendOtp(user, 'emailVerification');
  }

  static async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.isActive) return;
    await AuthService.issueAndSendOtp(user, 'passwordReset');
  }

  static async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const user = await prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      throw new AppError(MESSAGES.AUTH.OTP_INVALID, HTTP_STATUS.BAD_REQUEST);
    }

    const storedOtp = await prisma.userToken.findFirst({
      where: {
        userId: user.id,
        tokenType: 'passwordReset',
        tokenHash: hashOtp(dto.otp),
        expiresAt: { gt: new Date() },
      },
    });

    if (!storedOtp) {
      throw new AppError(MESSAGES.AUTH.OTP_INVALID, HTTP_STATUS.BAD_REQUEST);
    }

    const hashedPassword = await bcryptjs.hash(dto.newPassword, 12);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });
      await tx.userToken.deleteMany({
        where: { userId: user.id, tokenType: 'passwordReset' },
      });
      await tx.userToken.deleteMany({
        where: { userId: user.id, tokenType: 'refresh' },
      });
    });
  }

  private static async issueSession(user: User, device?: DeviceInfo): Promise<AuthTokens> {
    await prisma.userToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });

    const tokens = {
      accessToken: generateAccessToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      }),
      refreshToken: generateRefreshToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      }),
    };

    await prisma.userToken.create({
      data: {
        userId: user.id,
        tokenType: 'refresh',
        tokenHash: hashToken(tokens.refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_EXPIRES_MS),
        ...sessionDeviceFields(device),
      },
    });

    return tokens;
  }

  static async login(
    dto: LoginDto,
    device?: DeviceInfo,
  ): Promise<{ user: SafeUser; tokens: AuthTokens }> {
    const user = await prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      throw new AppError(MESSAGES.AUTH.INVALID_CREDENTIALS, HTTP_STATUS.UNAUTHORIZED);
    }

    if (!user.isActive) {
      throw new AppError(MESSAGES.AUTH.ACCOUNT_DEACTIVATED, HTTP_STATUS.FORBIDDEN);
    }

    const isMatch = await bcryptjs.compare(dto.password, user.password);
    if (!isMatch) {
      throw new AppError(MESSAGES.AUTH.INVALID_CREDENTIALS, HTTP_STATUS.UNAUTHORIZED);
    }

    if (!user.emailVerified) {
      await AuthService.issueAndSendOtp(user, 'emailVerification');
      throw new AppError(MESSAGES.AUTH.EMAIL_NOT_VERIFIED, HTTP_STATUS.FORBIDDEN);
    }

    const tokens = await AuthService.issueSession(user, device);
    return { user: sanitizeUser(user), tokens };
  }

  static async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      await prisma.userToken.deleteMany({
        where: {
          userId,
          tokenType: 'refresh',
          tokenHash: hashToken(refreshToken),
        },
      });
    }
  }

  static async logoutAll(userId: string): Promise<void> {
    await prisma.userToken.deleteMany({
      where: { userId, tokenType: 'refresh' },
    });
  }

  static async refreshToken(
    token: string,
    device?: DeviceInfo,
  ): Promise<{ user: SafeUser; tokens: AuthTokens }> {
    if (!token) {
      throw new AppError(MESSAGES.AUTH.TOKEN_INVALID, HTTP_STATUS.UNAUTHORIZED);
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch {
      throw new AppError(MESSAGES.AUTH.TOKEN_INVALID, HTTP_STATUS.UNAUTHORIZED);
    }

    const tokenHash = hashToken(token);
    const storedToken = await prisma.userToken.findFirst({
      where: {
        tokenHash,
        tokenType: 'refresh',
        userId: decoded.userId,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!storedToken) {
      const anyValidSession = await prisma.userToken.findFirst({
        where: {
          userId: decoded.userId,
          tokenType: 'refresh',
          expiresAt: { gt: new Date() },
        },
      });

      if (anyValidSession) {
        await prisma.userToken.deleteMany({
          where: { userId: decoded.userId, tokenType: 'refresh' },
        });
      }

      throw new AppError(MESSAGES.AUTH.TOKEN_INVALID, HTTP_STATUS.UNAUTHORIZED);
    }

    if (!storedToken.user.isActive) {
      throw new AppError(MESSAGES.AUTH.TOKEN_INVALID, HTTP_STATUS.UNAUTHORIZED);
    }

    const tokens = {
      accessToken: generateAccessToken({
        userId: storedToken.user.id,
        email: storedToken.user.email,
        role: storedToken.user.role,
      }),
      refreshToken: generateRefreshToken({
        userId: storedToken.user.id,
        email: storedToken.user.email,
        role: storedToken.user.role,
      }),
    };

    const ipAddress = device?.ipAddress ?? storedToken.ipAddress ?? undefined;
    const userAgent = device?.userAgent ?? storedToken.userAgent ?? undefined;

    await prisma.$transaction([
      prisma.userToken.delete({ where: { id: storedToken.id } }),
      prisma.userToken.create({
        data: {
          userId: storedToken.user.id,
          tokenType: 'refresh',
          tokenHash: hashToken(tokens.refreshToken),
          expiresAt: new Date(Date.now() + REFRESH_EXPIRES_MS),
          ...(ipAddress ? { ipAddress } : {}),
          ...(userAgent ? { userAgent } : {}),
          ...(storedToken.deviceInfo != null ? { deviceInfo: storedToken.deviceInfo } : {}),
          lastUsedAt: new Date(),
        },
      }),
    ]);

    return { user: sanitizeUser(storedToken.user), tokens };
  }

  static async getUserProfile(userId: string): Promise<SafeUser> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      throw new AppError(MESSAGES.USER.NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }
    return sanitizeUser(user);
  }

  static async getActiveSessions(userId: string) {
    return prisma.userToken.findMany({
      where: { userId, tokenType: 'refresh', expiresAt: { gt: new Date() } },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        lastUsedAt: true,
        createdAt: true,
      },
      orderBy: { lastUsedAt: 'desc' },
    });
  }

  static async revokeSession(userId: string, sessionId: string): Promise<void> {
    await prisma.userToken.deleteMany({
      where: { id: sessionId, userId, tokenType: 'refresh' },
    });
  }

  static async googleLogin(
    profile: GoogleProfile,
    device?: DeviceInfo,
  ): Promise<{ user: SafeUser; tokens: AuthTokens }> {
    const { googleId, name, email, avatar } = profile;

    let user = await prisma.user.findFirst({
      where: { provider: 'google', providerId: googleId },
    });

    if (!user) {
      const existingEmailUser = await prisma.user.findUnique({ where: { email } });

      if (existingEmailUser) {
        if (existingEmailUser.provider === 'local') {
          throw new AppError(
            'This email is registered with a password. Please log in using email and password.',
            HTTP_STATUS.CONFLICT,
          );
        }
        throw new AppError(
          'This email is already registered with a different provider.',
          HTTP_STATUS.CONFLICT,
        );
      }

      const hashedPassword = await bcryptjs.hash(crypto.randomBytes(16).toString('hex'), 12);

      user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          provider: 'google',
          providerId: googleId,
          photo: avatar,
          emailVerified: true,
        },
      });

      try {
        await sendTransactionalEmail({
          to: user.email,
          toName: user.name,
          subject: 'Welcome',
          htmlContent: welcomeEmailTemplate(user.name),
        });
      } catch (error) {
        logger.error('Failed to send welcome email', error);
      }
    }

    if (!user.isActive) {
      throw new AppError(MESSAGES.AUTH.ACCOUNT_DEACTIVATED, HTTP_STATUS.FORBIDDEN);
    }

    const tokens = await AuthService.issueSession(user, device);
    return { user: sanitizeUser(user), tokens };
  }
}
```


What the service is doing:

| Method | Behaviour |
| --- | --- |
| `register` | Hash password (cost 12), create unverified user, email OTP. **No cookies.** |
| `verifyEmailOtp` | Match hashed OTP, set `emailVerified`, welcome email, `issueSession`. |
| `login` | Same credentials error whether the email is missing or the password is wrong. Unverified users get a new OTP and 403. |
| `issueSession` | New JWT pair, store **hash** of refresh token, delete expired token rows. |
| `refreshToken` | Rotate refresh (delete old row, insert new). Reuse of an old refresh deletes **all** sessions (theft signal). |
| `forgotPassword` | Always looks successful to the client even if the email is unknown. |
| `resetPassword` | New password + delete all refresh rows. |
| `googleLogin` | Link by `providerId`, or create user. Refuse if the email already has a local password account. |

**Create this file:** `src/app/modules/auth/auth.controller.ts`

```ts
import { type NextFunction, type Request, type Response } from 'express';
import { sendSuccess } from '../../common/interceptors/response.util.ts';
import { HTTP_STATUS } from '../../common/constants/http-status.constants.ts';
import { MESSAGES } from '../../common/constants/messages.constants.ts';
import { AuthService } from './auth.service.ts';
import { setAuthCookies, clearAuthCookies } from '../../common/utils/cookie.util.ts';
import passport from '../../../config/passport.config.ts';
import type { DeviceInfo, GoogleProfile } from './interfaces/auth.interface.ts';
import { ENV } from '../../../config/env.config.ts';
import { AppError } from '../../common/exceptions/app-error.exception.ts';

const getDeviceInfo = (req: Request): DeviceInfo => ({
  ...(req.ip ? { ipAddress: req.ip } : {}),
  ...(req.headers['user-agent'] ? { userAgent: req.headers['user-agent'] } : {}),
});

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { user } = await AuthService.register(req.body);
      sendSuccess(res, HTTP_STATUS.CREATED, MESSAGES.AUTH.REGISTER_SUCCESS, {
        user: { id: user.id, email: user.email, name: user.name },
      });
    } catch (error) {
      next(error);
    }
  }

  async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { user, tokens } = await AuthService.verifyEmailOtp(req.body);
      setAuthCookies(res, tokens);
      sendSuccess(res, HTTP_STATUS.OK, MESSAGES.AUTH.OTP_VERIFIED, { user });
    } catch (error) {
      next(error);
    }
  }

  async resendOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await AuthService.resendOtp(req.body);
      sendSuccess(res, HTTP_STATUS.OK, MESSAGES.AUTH.OTP_SENT);
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await AuthService.forgotPassword(req.body);
      sendSuccess(res, HTTP_STATUS.OK, MESSAGES.AUTH.PASSWORD_RESET_SENT);
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await AuthService.resetPassword(req.body);
      sendSuccess(res, HTTP_STATUS.OK, MESSAGES.AUTH.PASSWORD_RESET_SUCCESS);
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { user, tokens } = await AuthService.login(req.body, getDeviceInfo(req));
      setAuthCookies(res, tokens);
      sendSuccess(res, HTTP_STATUS.OK, MESSAGES.AUTH.LOGIN_SUCCESS, { user });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.user) {
        await AuthService.logout(req.user.userId, req.cookies?.refreshToken);
      }
      clearAuthCookies(res);
      sendSuccess(res, HTTP_STATUS.OK, MESSAGES.AUTH.LOGOUT_SUCCESS);
    } catch (error) {
      next(error);
    }
  }

  async logoutAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.user) {
        await AuthService.logoutAll(req.user.userId);
      }
      clearAuthCookies(res);
      sendSuccess(res, HTTP_STATUS.OK, MESSAGES.AUTH.LOGOUT_ALL_SUCCESS);
    } catch (error) {
      next(error);
    }
  }

  async getSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessions = await AuthService.getActiveSessions(req.user!.userId);
      sendSuccess(res, HTTP_STATUS.OK, MESSAGES.USER.FETCHED, { sessions });
    } catch (error) {
      next(error);
    }
  }

  async revokeSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessionId = req.params.sessionId as string;
      await AuthService.revokeSession(req.user!.userId, sessionId);
      sendSuccess(res, HTTP_STATUS.OK, MESSAGES.AUTH.LOGOUT_SUCCESS);
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { user, tokens } = await AuthService.refreshToken(
        req.cookies?.refreshToken,
        getDeviceInfo(req),
      );
      setAuthCookies(res, tokens);
      sendSuccess(res, HTTP_STATUS.OK, MESSAGES.AUTH.TOKEN_REFRESHED, { user });
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(MESSAGES.AUTH.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
      }
      const userProfile = await AuthService.getUserProfile(req.user.userId);
      sendSuccess(res, HTTP_STATUS.OK, MESSAGES.USER.FETCHED, { user: userProfile });
    } catch (error) {
      next(error);
    }
  }

  async googleAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (!ENV.GOOGLE_CLIENT_ID || !ENV.GOOGLE_CLIENT_SECRET || !ENV.GOOGLE_CALLBACK_URL) {
      next(new AppError(MESSAGES.AUTH.GOOGLE_NOT_CONFIGURED, HTTP_STATUS.BAD_REQUEST));
      return;
    }

    passport.authenticate('google', { scope: ['profile', 'email'], session: false })(
      req,
      res,
      next,
    );
  }

  async googleCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (!ENV.GOOGLE_CLIENT_ID || !ENV.GOOGLE_CLIENT_SECRET || !ENV.GOOGLE_CALLBACK_URL) {
      res.redirect(`${ENV.FRONTEND_URL}/login?error=google_not_configured`);
      return;
    }

    passport.authenticate(
      'google',
      { session: false },
      async (err: unknown, profile: GoogleProfile | false) => {
        if (err || !profile) {
          return res.redirect(`${ENV.FRONTEND_URL}/login?error=auth_failed`);
        }
        try {
          const { tokens } = await AuthService.googleLogin(profile, getDeviceInfo(req));
          setAuthCookies(res, tokens);
          return res.redirect(`${ENV.FRONTEND_URL}?success=true`);
        } catch {
          return res.redirect(`${ENV.FRONTEND_URL}/login?error=auth_failed`);
        }
      },
    )(req, res, next);
  }
}
```


**Why this exists.** The controller is the only place that touches `res.cookie`. The service returns `{ user, tokens }`. JSON never includes `tokens`.

**Create this file:** `src/app/modules/auth/auth.routes.ts`

```ts
import { Router } from 'express';
import { AuthController } from './auth.controller.ts';
import { registerDto } from './dto/register.dto.ts';
import { loginDto } from './dto/login.dto.ts';
import { verifyOtpDto, resendOtpDto } from './dto/verify-otp.dto.ts';
import { forgotPasswordDto, resetPasswordDto } from './dto/password-reset.dto.ts';
import { validateDto } from '../../common/guards/validate-dto.middleware.ts';
import { protect } from '../../common/guards/auth.middleware.ts';

const router = Router();
const authController = new AuthController();

router.post('/register', validateDto(registerDto), (req, res, next) =>
  authController.register(req, res, next),
);
router.post('/verify-email', validateDto(verifyOtpDto), (req, res, next) =>
  authController.verifyEmail(req, res, next),
);
router.post('/resend-otp', validateDto(resendOtpDto), (req, res, next) =>
  authController.resendOtp(req, res, next),
);

router.post('/forgot-password', validateDto(forgotPasswordDto), (req, res, next) =>
  authController.forgotPassword(req, res, next),
);
router.post('/reset-password', validateDto(resetPasswordDto), (req, res, next) =>
  authController.resetPassword(req, res, next),
);

router.post('/login', validateDto(loginDto), (req, res, next) =>
  authController.login(req, res, next),
);
router.post('/logout', protect, (req, res, next) => authController.logout(req, res, next));
router.post('/logout-all', protect, (req, res, next) =>
  authController.logoutAll(req, res, next),
);

router.get('/sessions', protect, (req, res, next) =>
  authController.getSessions(req, res, next),
);
router.delete('/sessions/:sessionId', protect, (req, res, next) =>
  authController.revokeSession(req, res, next),
);

router.post('/refresh-token', (req, res, next) =>
  authController.refreshToken(req, res, next),
);

router.get('/me', protect, (req, res, next) => authController.getProfile(req, res, next));

router.get('/google', (req, res, next) => authController.googleAuth(req, res, next));
router.get('/google/callback', (req, res, next) =>
  authController.googleCallback(req, res, next),
);

export default router;
```


**Create this file:** `src/app/modules/auth/auth.modules.ts`

```ts
import authRouter from './auth.routes.ts';

export default authRouter;
```


**Why `*.modules.ts` exists.** `app.ts` imports one barrel per feature. Internally the barrel re-exports the router so you can later attach module-level middleware in one place.

**Checkpoint.** Do not start the server yet — `app.ts` still has no `/api/v1/auth` mount. That is Phase 13.

---

## Phase 12 — Users module

**Create this file:** `src/app/modules/users/interfaces/users.interface.ts`

```ts
export interface UpdateUserDto {
  name?: string;
  photo?: string | null;
  location?: string | null;
}

export interface UpdateUserStatusDto {
  isActive: boolean;
}
```


**Create this file:** `src/app/modules/users/dto/users.dto.ts`

```ts
import Joi from 'joi';

export const updateUserDtoSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50),
  photo: Joi.string().uri().allow(null, ''),
  location: Joi.string().trim().max(255).allow(null, ''),
});

export const updateUserStatusDtoSchema = Joi.object({
  isActive: Joi.boolean().required(),
});
```


**Create this file:** `src/app/modules/users/users.service.ts`

```ts
import { prisma } from '../../../config/db/database.config.ts';
import { HTTP_STATUS } from '../../common/constants/http-status.constants.ts';
import { MESSAGES } from '../../common/constants/messages.constants.ts';
import { AppError } from '../../common/exceptions/app-error.exception.ts';
import { deleteImage, uploadImageBuffer } from '../../common/utils/cloudinary.util.ts';
import type { UpdateUserDto } from './interfaces/users.interface.ts';
import { Prisma, UserRole } from '@prisma/client';

export class UsersService {
  static async getUserProfile(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError(MESSAGES.USER.NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }
    const { password: _password, ...safeUser } = user;
    return safeUser;
  }

  static async updateUserProfile(
    userId: string,
    dto: UpdateUserDto,
    photoFile?: Express.Multer.File,
  ) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError(MESSAGES.USER.NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    const hasFile = Boolean(photoFile);
    const hasFields =
      dto.name !== undefined || dto.photo !== undefined || dto.location !== undefined;

    if (!hasFile && !hasFields) {
      throw new AppError(MESSAGES.USER.NOTHING_TO_UPDATE, HTTP_STATUS.BAD_REQUEST);
    }

    let photo = dto.photo !== undefined ? dto.photo || null : undefined;
    let imagePublicId: string | null | undefined;

    if (photoFile) {
      const uploaded = await uploadImageBuffer(photoFile.buffer);
      if (user.imagePublicId) {
        await deleteImage(user.imagePublicId);
      }
      photo = uploaded.url;
      imagePublicId = uploaded.publicId;
    } else if (dto.photo === null || dto.photo === '') {
      if (user.imagePublicId) {
        await deleteImage(user.imagePublicId);
      }
      photo = null;
      imagePublicId = null;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(photo !== undefined ? { photo } : {}),
        ...(imagePublicId !== undefined ? { imagePublicId } : {}),
        ...(dto.location !== undefined ? { location: dto.location || null } : {}),
      },
    });

    const { password: _password, ...safeUser } = updatedUser;
    return safeUser;
  }

  static async adminGetAllUsers(
    limit = 20,
    page = 1,
    search?: string,
    role?: UserRole,
  ) {
    const skip = (page - 1) * limit;
    const where: Prisma.UserWhereInput = {
      ...(role ? { role } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
          photo: true,
          location: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return { users, total, page, limit };
  }

  static async adminUpdateUserStatus(
    adminId: string,
    targetUserId: string,
    isActive: boolean,
  ) {
    if (adminId === targetUserId) {
      throw new AppError('You cannot update your own active status', HTTP_STATUS.BAD_REQUEST);
    }

    const user = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) {
      throw new AppError(MESSAGES.USER.NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    if (user.role === 'ADMIN') {
      throw new AppError(
        'Cannot change active status of an admin account',
        HTTP_STATUS.FORBIDDEN,
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: { isActive },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });

    if (!isActive) {
      await prisma.userToken.deleteMany({
        where: { userId: targetUserId, tokenType: 'refresh' },
      });
    }

    return updatedUser;
  }
}
```


**Why this exists.**

- Password is stripped before any response.
- File upload replaces `photo` + `imagePublicId` and destroys the previous Cloudinary asset.
- Admin cannot deactivate themselves or another `ADMIN`.
- Deactivating a user deletes their refresh tokens.

**Create this file:** `src/app/modules/users/users.controller.ts`

```ts
import type { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../common/interceptors/response.util.ts';
import { HTTP_STATUS } from '../../common/constants/http-status.constants.ts';
import { MESSAGES } from '../../common/constants/messages.constants.ts';
import { UsersService } from './users.service.ts';
import { AppError } from '../../common/exceptions/app-error.exception.ts';
import { UserRole } from '@prisma/client';

const parsePositiveInt = (value: unknown, fallback: number): number => {
  const parsed = parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export class UsersController {
  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(MESSAGES.AUTH.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
      }
      const user = await UsersService.getUserProfile(req.user.userId);
      sendSuccess(res, HTTP_STATUS.OK, MESSAGES.USER.FETCHED, { user });
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(MESSAGES.AUTH.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
      }
      const user = await UsersService.updateUserProfile(req.user.userId, req.body, req.file);
      sendSuccess(res, HTTP_STATUS.OK, MESSAGES.USER.UPDATED, { user });
    } catch (error) {
      next(error);
    }
  }

  async adminGetAllUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = parsePositiveInt(req.query.limit, 20);
      const page = parsePositiveInt(req.query.page, 1);
      const search = req.query.search as string | undefined;
      const role = req.query.role as UserRole | undefined;

      if (role && !Object.values(UserRole).includes(role)) {
        throw new AppError('Invalid role filter', HTTP_STATUS.BAD_REQUEST);
      }

      const result = await UsersService.adminGetAllUsers(limit, page, search, role);
      sendSuccess(res, HTTP_STATUS.OK, 'All users retrieved successfully', result);
    } catch (error) {
      next(error);
    }
  }

  async adminUpdateUserStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError(MESSAGES.AUTH.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
      }
      const targetUserId = req.params.userId as string;
      const { isActive } = req.body;
      const user = await UsersService.adminUpdateUserStatus(
        req.user.userId,
        targetUserId,
        isActive,
      );
      const message = isActive ? 'User activated successfully' : 'User deactivated successfully';
      sendSuccess(res, HTTP_STATUS.OK, message, { user });
    } catch (error) {
      next(error);
    }
  }
}
```


**Create this file:** `src/app/modules/users/users.routes.ts`

```ts
import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { UsersController } from './users.controller.ts';
import { protect, restrictTo } from '../../common/guards/auth.middleware.ts';
import { validateDto } from '../../common/guards/validate-dto.middleware.ts';
import { optionalImageUpload } from '../../common/guards/upload.middleware.ts';
import { updateUserDtoSchema, updateUserStatusDtoSchema } from './dto/users.dto.ts';

const router = Router();
const usersController = new UsersController();

router.get('/me', protect, (req, res, next) => usersController.getProfile(req, res, next));
router.patch(
  '/me',
  protect,
  optionalImageUpload('photo'),
  validateDto(updateUserDtoSchema),
  (req, res, next) => usersController.updateProfile(req, res, next),
);

router.get('/admin/users', protect, restrictTo(UserRole.ADMIN), (req, res, next) =>
  usersController.adminGetAllUsers(req, res, next),
);
router.patch(
  '/admin/users/:userId/status',
  protect,
  restrictTo(UserRole.ADMIN),
  validateDto(updateUserStatusDtoSchema),
  (req, res, next) => usersController.adminUpdateUserStatus(req, res, next),
);

export default router;
```


**Create this file:** `src/app/modules/users/users.modules.ts`

```ts
import usersRouter from './users.routes.ts';

export default usersRouter;
```


**Checkpoint.** Four routes: `GET/PATCH /me`, `GET /admin/users`, `PATCH /admin/users/:userId/status`. Admin routes use `protect` then `restrictTo(UserRole.ADMIN)`.

---

## Phase 13 — Wire `app.ts`, Passport, Swagger

**Install.**

```bash
npm install helmet cors express-rate-limit hpp passport passport-google-oauth20 swagger-jsdoc swagger-ui-express
npm install -D @types/cors @types/express-rate-limit @types/helmet @types/hpp @types/passport @types/passport-google-oauth20 @types/swagger-jsdoc @types/swagger-ui-express
```

**Create this file:** `src/config/passport.config.ts`

```ts
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { ENV } from './env.config.ts';

if (ENV.GOOGLE_CLIENT_ID && ENV.GOOGLE_CLIENT_SECRET && ENV.GOOGLE_CALLBACK_URL) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: ENV.GOOGLE_CLIENT_ID,
        clientSecret: ENV.GOOGLE_CLIENT_SECRET,
        callbackURL: ENV.GOOGLE_CALLBACK_URL,
      },
      (_accessToken, _refreshToken, profile, done) => {
        const user = {
          googleId: profile.id,
          name: profile.displayName,
          email: profile.emails?.[0]?.value || '',
          avatar: profile.photos?.[0]?.value || '',
        };
        return done(null, user as unknown as Express.User);
      },
    ),
  );
}

export default passport;
```


**Why this exists.** The Google strategy is registered only when all three env vars are set. Empty credentials → `GET /auth/google` returns 400 from the controller.

**Create this file:** `src/app/common/docs/swagger.examples.ts`

```ts
export const exampleUserId = '0193c0a1-8b2e-7d4f-9c11-4e6a2b8d1f03';
export const exampleSessionId = '0193c0a2-1d4a-7e8b-a012-9f3c6d7e8a11';

export const exampleUser = {
  id: exampleUserId,
  name: 'Saimor',
  email: 'saimor@example.com',
  photo: null,
  imagePublicId: null,
  role: 'USER',
  location: 'Dhaka',
  isActive: true,
  emailVerified: true,
  provider: 'local',
  providerId: null,
  createdAt: '2026-09-02T09:34:18.530Z',
  updatedAt: '2026-09-02T09:34:31.054Z',
};

export const successBody = (message: string, data?: unknown) => ({
  success: true,
  message,
  ...(data !== undefined ? { data } : {}),
});

export const errorBody = (message: string) => ({
  success: false,
  message,
});

export const jsonResponse = (description: string, example: unknown) => ({
  description,
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
          data: { type: 'object' },
        },
      },
      example,
    },
  },
});

export const jsonError = (description: string, message: string) =>
  jsonResponse(description, errorBody(message));

export const setCookieHeaders = {
  'Set-Cookie': {
    schema: { type: 'string' },
    description: 'HttpOnly accessToken and refreshToken cookies. Tokens are never in the JSON body.',
    example:
      'accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; Path=/; HttpOnly; SameSite=Lax',
  },
};
```


**Create this file:** `src/app/modules/auth/doc/auth.swagger.ts`

```ts
import { MESSAGES } from '../../../common/constants/messages.constants.ts';
import {
  exampleSessionId,
  exampleUser,
  exampleUserId,
  jsonError,
  jsonResponse,
  setCookieHeaders,
  successBody,
} from '../../../common/docs/swagger.examples.ts';

export const authpaths = {
  '/auth/register': {
    post: {
      tags: ['Auth'],
      summary: 'Register — OTP emailed, no cookies yet',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name', 'email', 'password'],
              properties: {
                name: { type: 'string', example: 'Saimor' },
                email: { type: 'string', example: 'saimor@example.com' },
                password: { type: 'string', example: 'StrongPass1!' },
              },
            },
            example: {
              name: 'Saimor',
              email: 'saimor@example.com',
              password: 'StrongPass1!',
            },
          },
        },
      },
      responses: {
        201: jsonResponse(
          'Account created — verify email',
          successBody(MESSAGES.AUTH.REGISTER_SUCCESS, {
            user: {
              id: exampleUserId,
              email: 'saimor@example.com',
              name: 'Saimor',
            },
          }),
        ),
        400: jsonError(
          'Validation error',
          'name length must be at least 2 characters long, email must be a valid email, Password must contain uppercase, lowercase, number, and special character',
        ),
        409: jsonError('Email already exists', MESSAGES.AUTH.EMAIL_EXISTS),
      },
    },
  },
  '/auth/verify-email': {
    post: {
      tags: ['Auth'],
      summary: 'Verify OTP and open a session (sets cookies)',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email', 'otp'],
              properties: {
                email: { type: 'string', example: 'saimor@example.com' },
                otp: { type: 'string', example: '123456' },
              },
            },
            example: { email: 'saimor@example.com', otp: '123456' },
          },
        },
      },
      responses: {
        200: {
          ...jsonResponse(
            'Email verified. Sets accessToken + refreshToken cookies.',
            successBody(MESSAGES.AUTH.OTP_VERIFIED, { user: exampleUser }),
          ),
          headers: setCookieHeaders,
        },
        400: jsonError('Invalid OTP', MESSAGES.AUTH.OTP_INVALID),
        409: jsonError('Already verified', MESSAGES.AUTH.EMAIL_ALREADY_VERIFIED),
      },
    },
  },
  '/auth/resend-otp': {
    post: {
      tags: ['Auth'],
      summary: 'Resend verification OTP (60s throttle)',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email'],
              properties: { email: { type: 'string', example: 'saimor@example.com' } },
            },
            example: { email: 'saimor@example.com' },
          },
        },
      },
      responses: {
        200: jsonResponse('OTP sent', successBody(MESSAGES.AUTH.OTP_SENT)),
        409: jsonError('Already verified', MESSAGES.AUTH.EMAIL_ALREADY_VERIFIED),
        429: jsonError('Too soon', 'Please wait 42s before requesting another code'),
      },
    },
  },
  '/auth/forgot-password': {
    post: {
      tags: ['Auth'],
      summary: 'Always 200 — does not reveal whether the email exists',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email'],
              properties: { email: { type: 'string', example: 'saimor@example.com' } },
            },
            example: { email: 'saimor@example.com' },
          },
        },
      },
      responses: {
        200: jsonResponse(
          'If the account exists, a reset OTP was emailed',
          successBody(MESSAGES.AUTH.PASSWORD_RESET_SENT),
        ),
      },
    },
  },
  '/auth/reset-password': {
    post: {
      tags: ['Auth'],
      summary: 'Reset password and revoke every session',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email', 'otp', 'newPassword'],
              properties: {
                email: { type: 'string', example: 'saimor@example.com' },
                otp: { type: 'string', example: '123456' },
                newPassword: { type: 'string', example: 'NewStrong1!' },
              },
            },
            example: {
              email: 'saimor@example.com',
              otp: '123456',
              newPassword: 'NewStrong1!',
            },
          },
        },
      },
      responses: {
        200: jsonResponse(
          'Password updated',
          successBody(MESSAGES.AUTH.PASSWORD_RESET_SUCCESS),
        ),
        400: jsonError('Invalid OTP', MESSAGES.AUTH.OTP_INVALID),
      },
    },
  },
  '/auth/login': {
    post: {
      tags: ['Auth'],
      summary: 'Login — cookies only, tokens not in JSON',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email', 'password'],
              properties: {
                email: { type: 'string', example: 'saimor@example.com' },
                password: { type: 'string', example: 'StrongPass1!' },
              },
            },
            example: { email: 'saimor@example.com', password: 'StrongPass1!' },
          },
        },
      },
      responses: {
        200: {
          ...jsonResponse(
            'Logged in. Sets accessToken + refreshToken cookies.',
            successBody(MESSAGES.AUTH.LOGIN_SUCCESS, { user: exampleUser }),
          ),
          headers: setCookieHeaders,
        },
        401: jsonError('Invalid credentials', MESSAGES.AUTH.INVALID_CREDENTIALS),
        403: jsonError('Unverified or deactivated', MESSAGES.AUTH.EMAIL_NOT_VERIFIED),
      },
    },
  },
  '/auth/logout': {
    post: {
      tags: ['Auth'],
      summary: 'Logout this device',
      security: [{ cookieAuth: [] }],
      responses: {
        200: jsonResponse('Cookies cleared', successBody(MESSAGES.AUTH.LOGOUT_SUCCESS)),
        401: jsonError('Missing or invalid access cookie', MESSAGES.AUTH.UNAUTHORIZED),
      },
    },
  },
  '/auth/logout-all': {
    post: {
      tags: ['Auth'],
      summary: 'Logout every device',
      security: [{ cookieAuth: [] }],
      responses: {
        200: jsonResponse(
          'All refresh sessions deleted',
          successBody(MESSAGES.AUTH.LOGOUT_ALL_SUCCESS),
        ),
        401: jsonError('Missing or invalid access cookie', MESSAGES.AUTH.UNAUTHORIZED),
      },
    },
  },
  '/auth/sessions': {
    get: {
      tags: ['Auth'],
      summary: 'List active refresh sessions',
      security: [{ cookieAuth: [] }],
      responses: {
        200: jsonResponse(
          'Session list',
          successBody(MESSAGES.USER.FETCHED, {
            sessions: [
              {
                id: exampleSessionId,
                ipAddress: '127.0.0.1',
                userAgent: 'Mozilla/5.0',
                lastUsedAt: '2026-09-02T09:34:31.054Z',
                createdAt: '2026-09-02T09:34:31.054Z',
              },
            ],
          }),
        ),
        401: jsonError('Missing or invalid access cookie', MESSAGES.AUTH.UNAUTHORIZED),
      },
    },
  },
  '/auth/sessions/{sessionId}': {
    delete: {
      tags: ['Auth'],
      summary: 'Revoke one session',
      security: [{ cookieAuth: [] }],
      parameters: [
        {
          name: 'sessionId',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid', example: exampleSessionId },
        },
      ],
      responses: {
        200: jsonResponse('Session revoked', successBody(MESSAGES.AUTH.LOGOUT_SUCCESS)),
        401: jsonError('Missing or invalid access cookie', MESSAGES.AUTH.UNAUTHORIZED),
      },
    },
  },
  '/auth/refresh-token': {
    post: {
      tags: ['Auth'],
      summary: 'Rotate refresh cookie; no access cookie required',
      responses: {
        200: {
          ...jsonResponse(
            'New cookie pair',
            successBody(MESSAGES.AUTH.TOKEN_REFRESHED, { user: exampleUser }),
          ),
          headers: setCookieHeaders,
        },
        401: jsonError('Invalid refresh', MESSAGES.AUTH.TOKEN_INVALID),
      },
    },
  },
  '/auth/me': {
    get: {
      tags: ['Auth'],
      summary: 'Current user from access cookie',
      security: [{ cookieAuth: [] }],
      responses: {
        200: jsonResponse(
          'Profile',
          successBody(MESSAGES.USER.FETCHED, { user: exampleUser }),
        ),
        401: jsonError('Missing or invalid access cookie', MESSAGES.AUTH.UNAUTHORIZED),
      },
    },
  },
  '/auth/google': {
    get: {
      tags: ['Auth'],
      summary: 'Start Google OAuth',
      responses: {
        302: {
          description: 'Redirect to Google',
          headers: {
            Location: {
              schema: { type: 'string', example: 'https://accounts.google.com/o/oauth2/v2/auth' },
            },
          },
        },
        400: jsonError('Google OAuth is not configured', MESSAGES.AUTH.GOOGLE_NOT_CONFIGURED),
      },
    },
  },
  '/auth/google/callback': {
    get: {
      tags: ['Auth'],
      summary: 'Google callback — sets cookies, redirects to FRONTEND_URL',
      responses: {
        302: {
          description: 'Redirect to SPA. Success: FRONTEND_URL?success=true. Failure: FRONTEND_URL/login?error=auth_failed',
          headers: {
            Location: {
              schema: { type: 'string', example: 'http://localhost:3000?success=true' },
            },
          },
        },
      },
    },
  },
};
```


**Create this file:** `src/app/modules/users/doc/users.swagger.ts`

```ts
import { MESSAGES } from '../../../common/constants/messages.constants.ts';
import {
  exampleUser,
  exampleUserId,
  jsonError,
  jsonResponse,
  successBody,
} from '../../../common/docs/swagger.examples.ts';

export const usersPaths = {
  '/users/me': {
    get: {
      tags: ['Users'],
      summary: 'Own profile',
      security: [{ cookieAuth: [] }],
      responses: {
        200: jsonResponse(
          'Profile without password',
          successBody(MESSAGES.USER.FETCHED, { user: exampleUser }),
        ),
        401: jsonError('Missing or invalid access cookie', MESSAGES.AUTH.UNAUTHORIZED),
      },
    },
    patch: {
      tags: ['Users'],
      summary: 'Update name, location, or photo (JSON URL or multipart file via Cloudinary)',
      security: [{ cookieAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string', example: 'Saimor' },
                photo: {
                  type: 'string',
                  nullable: true,
                  example: 'https://res.cloudinary.com/demo/image/upload/avatar.jpg',
                  description: 'Image URL. Send null to clear.',
                },
                location: { type: 'string', example: 'Dhaka' },
              },
            },
            example: { name: 'Saimor', location: 'Dhaka' },
          },
          'multipart/form-data': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string', example: 'Saimor' },
                location: { type: 'string', example: 'Dhaka' },
                photo: { type: 'string', format: 'binary' },
              },
            },
          },
        },
      },
      responses: {
        200: jsonResponse(
          'Updated',
          successBody(MESSAGES.USER.UPDATED, {
            user: { ...exampleUser, location: 'Dhaka' },
          }),
        ),
        400: jsonError('Nothing to update', MESSAGES.USER.NOTHING_TO_UPDATE),
        401: jsonError('Missing or invalid access cookie', MESSAGES.AUTH.UNAUTHORIZED),
      },
    },
  },
  '/users/admin/users': {
    get: {
      tags: ['Users'],
      summary: 'Admin: list users',
      security: [{ cookieAuth: [] }],
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', example: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', example: 20 } },
        { name: 'search', in: 'query', schema: { type: 'string', example: 'saimor' } },
        {
          name: 'role',
          in: 'query',
          schema: { type: 'string', enum: ['USER', 'ADMIN'], example: 'USER' },
        },
      ],
      responses: {
        200: jsonResponse('Paginated users', {
          success: true,
          message: 'All users retrieved successfully',
          data: {
            users: [
              {
                id: exampleUserId,
                name: 'Saimor',
                email: 'saimor@example.com',
                role: 'USER',
                isActive: true,
                emailVerified: true,
                createdAt: '2026-09-02T09:34:18.530Z',
                updatedAt: '2026-09-02T09:34:31.054Z',
                photo: null,
                location: 'Dhaka',
              },
            ],
            total: 1,
            page: 1,
            limit: 20,
          },
        }),
        401: jsonError('Missing or invalid access cookie', MESSAGES.AUTH.UNAUTHORIZED),
        403: jsonError('Not admin', MESSAGES.AUTH.FORBIDDEN),
      },
    },
  },
  '/users/admin/users/{userId}/status': {
    patch: {
      tags: ['Users'],
      summary: 'Admin: activate / deactivate',
      security: [{ cookieAuth: [] }],
      parameters: [
        {
          name: 'userId',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid', example: exampleUserId },
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['isActive'],
              properties: { isActive: { type: 'boolean', example: false } },
            },
            example: { isActive: false },
          },
        },
      },
      responses: {
        200: jsonResponse('Status updated', {
          success: true,
          message: 'User deactivated successfully',
          data: {
            user: {
              id: exampleUserId,
              name: 'Saimor',
              email: 'saimor@example.com',
              role: 'USER',
              isActive: false,
            },
          },
        }),
        400: jsonError(
          'Cannot change your own status',
          'You cannot update your own active status',
        ),
        401: jsonError('Missing or invalid access cookie', MESSAGES.AUTH.UNAUTHORIZED),
        403: jsonError('Not admin, or target is an admin', MESSAGES.AUTH.FORBIDDEN),
        404: jsonError('User not found', MESSAGES.USER.NOT_FOUND),
      },
    },
  },
};
```


**Create this file:** `src/config/swagger.config.ts`

```ts
import swaggerJsdoc from 'swagger-jsdoc';
import { ENV } from './env.config.ts';
import { authpaths } from '../app/modules/auth/doc/auth.swagger.ts';
import { usersPaths } from '../app/modules/users/doc/users.swagger.ts';

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MVC Starter API',
      version: '1.0.0',
      description:
        'Auth uses HttpOnly cookies (accessToken, refreshToken). Tokens are never returned in JSON. Profile photos upload to Cloudinary. Mail is sent with Brevo.',
    },
    servers: [
      { url: `${ENV.BACKEND_URL}/api/v1`, description: ENV.NODE_ENV },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'accessToken',
          description: 'HttpOnly access token set on login / verify-email / refresh',
        },
      },
      schemas: {
        ApiSuccess: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Logged in successfully' },
            data: { type: 'object' },
          },
        },
        ApiError: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Invalid email or password' },
          },
        },
      },
    },
    paths: {
      ...authpaths,
      ...usersPaths,
    },
  },
  apis: [],
});
```


**Why this exists.** Paths are composed in TypeScript (`authpaths`, `usersPaths`) instead of JSDoc on controllers. Helpers keep every example in the `{ success, message, data }` envelope. Cookie auth is documented; tokens are not shown in JSON examples.

**Replace** `src/app.ts` with the full application:

```ts
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
```


Middleware order matters:

1. `trust proxy` — correct `req.ip` behind Docker / a reverse proxy
2. Helmet, CORS (`credentials: true`), general rate limit
3. Passport
4. JSON / urlencoded / cookies / HPP
5. Swagger
6. Auth rate limiter on `/api/v1/auth` only
7. Feature routers
8. `/` and `/health`
9. 404
10. `errorHandler` **last**

**Checkpoint.**

```bash
npx tsc --noEmit
npx tsx src/main.ts
```

http://localhost:5000/api/docs should load. `/health` should report `database: "up"` if Postgres is running.

---

## Phase 14 — Docker and Makefile

**Create this file:** `Dockerfile`

```dockerfile
FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl wget

COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
COPY tsconfig.json ./

RUN npm ci

COPY src ./src

ENV POSTGRES_USER=mvc
ENV POSTGRES_PASSWORD=mvcsecret
ENV POSTGRES_HOST=postgres
ENV POSTGRES_PORT=5432
ENV POSTGRES_DB=mvc_api
RUN npx prisma generate

EXPOSE 5000

CMD ["sh", "-c", "npx prisma db push && npm start"]
```


**Create this file:** `.dockerignore`

```gitignore
node_modules
dist
build
.git
.gitignore
.env
.env.*
!.env.example
logs
*.log
docs
Readme.md
README.md
.prettierrc
.prettierignore
```


**Create this file:** `docker-compose.yml`

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: mvc-postgres
    restart: unless-stopped
    env_file:
      - .env
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    ports:
      - "${POSTGRES_PORT}:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB"]
      interval: 5s
      timeout: 5s
      retries: 10
    networks:
      - mvc-network

  api:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: mvc-api
    restart: unless-stopped
    env_file:
      - .env
    environment:
      POSTGRES_HOST: postgres
    ports:
      - "${PORT}:5000"
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://127.0.0.1:5000/health"]
      interval: 15s
      timeout: 5s
      retries: 10
      start_period: 25s
    networks:
      - mvc-network

volumes:
  postgres_data:
    name: ${POSTGRES_VOLUME_NAME:-mvc_postgres_data}

networks:
  mvc-network:
    name: ${COMPOSE_NETWORK_NAME:-mvc_network}
    driver: bridge
```


**Why this exists.**

- Both services use `env_file: .env`. Compose does **not** duplicate JWT / Brevo / Cloudinary keys.
- The **only** override is `POSTGRES_HOST: postgres` on the API container (Docker DNS). On the host, `.env` keeps `POSTGRES_HOST=localhost`.
- Postgres data is a **named volume** (`POSTGRES_VOLUME_NAME`, default `mvc_postgres_data`) so `docker compose down` does not wipe the database. Use `down -v` when you intend to wipe it.

**Create this file:** `Makefile`

```makefile
.DEFAULT_GOAL := help

.PHONY: help env install up down down-v restart logs ps dev generate push studio build

help:
	@echo "MVC starter"
	@echo ""
	@echo "  make env        Create .env from .env.example if missing"
	@echo "  make up         Build and start Postgres + API"
	@echo "  make down       Stop containers (keeps postgres_data volume)"
	@echo "  make down-v     Stop containers and delete the Postgres volume"
	@echo "  make logs       Follow API logs"
	@echo "  make restart    Rebuild and restart the API container"
	@echo "  make dev        Start Postgres only, run the API on the host"
	@echo "  make generate   prisma generate"
	@echo "  make push       prisma db push"
	@echo "  make studio     prisma studio"
	@echo "  make build      Typecheck (tsc)"

env:
	@test -f .env || cp .env.example .env
	@echo ".env is ready"

install:
	npm ci

up: env
	docker compose up -d --build

down:
	docker compose down

down-v:
	docker compose down -v

restart: env
	docker compose up -d --build api

logs:
	docker compose logs -f api

ps:
	docker compose ps

dev: env
	docker compose up -d postgres
	npm run dev

generate:
	npx prisma generate

push:
	npx prisma db push

studio:
	npx prisma studio

build:
	npx tsc --noEmit
```


**Checkpoint.**

```bash
make env
make up
curl -s http://localhost:5000/health
```

If port 5000 is already taken, stop the host `tsx` / `npm run dev` process first.

---

## How authentication works

```text
POST /auth/register
  → User row (emailVerified=false)
  → UserToken emailVerification (sha256 of OTP)
  → Brevo (or log OTP)
  → JSON user id/email/name     ← no cookies

POST /auth/verify-email
  → match OTP hash, not expired
  → emailVerified=true, delete OTP rows
  → issueSession: access JWT + refresh JWT
  → store sha256(refresh) as UserToken refresh
  → Set-Cookie accessToken, refreshToken
  → JSON user                   ← still no tokens in body

POST /auth/login
  → same cookie pair
  → if email not verified: new OTP + 403

GET /users/me   (protect)
  → cookie accessToken → verifyAccessToken
  → load user from Postgres
  → req.user

POST /auth/refresh-token
  → cookie refreshToken only (access may be expired)
  → verify + lookup hash
  → rotate: delete old refresh row, insert new
  → new cookie pair

POST /auth/logout
  → delete this refresh hash, clear cookies
```

Rules to keep:

- Access token is short-lived and **not** stored in the database.
- Refresh token **is** stored, hashed.
- Response JSON never includes `accessToken` or `refreshToken`.
- Browser clients must use `credentials: 'include'`. `curl` must use `-c` / `-b` cookie jars.

---

## How a request moves through the layers

Example: `PATCH /api/v1/users/me` with `multipart/form-data`.

```text
CreateApp
  cors / helmet / rateLimit / cookieParser
  → usersRouter
       protect          cookie → JWT → req.user
       optionalImageUpload('photo')   req.file?
       validateDto(updateUserDtoSchema)
       UsersController.updateProfile
         UsersService.updateUserProfile
           prisma.user.update
           Cloudinary upload_stream (if file)
         sendSuccess(...)
  → errorHandler (only if something threw)
```

If Joi fails, the controller never runs. If the service throws `AppError`, the controller `next(error)` and the handler sends `{ success: false, message }`.

---

## Verify the finished API

```bash
make up

curl -s http://localhost:5000/health

curl -s -X POST http://localhost:5000/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Saimor","email":"saimor@example.com","password":"StrongPass1!"}'
```

Read the OTP from Brevo, or from API logs (`[Brevo skipped] ... OTP=`).

```bash
curl -s -c cookies.txt -X POST http://localhost:5000/api/v1/auth/verify-email \
  -H 'Content-Type: application/json' \
  -d '{"email":"saimor@example.com","otp":"123456"}'

curl -s -b cookies.txt http://localhost:5000/api/v1/users/me

curl -s -b cookies.txt -X POST http://localhost:5000/api/v1/auth/refresh-token

curl -s -b cookies.txt -X POST http://localhost:5000/api/v1/auth/logout
```

Promote an admin (SQL), then:

```bash
curl -s -b cookies.txt http://localhost:5000/api/v1/users/admin/users
```

```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'saimor@example.com';
```

Open http://localhost:5000/api/docs and expand each operation. Success and error examples are on every response.

Host development (Postgres in Docker, API on the host):

```bash
make down
make dev
```

---

## Adding a later module

Same five files under `src/app/modules/<name>/`:

1. `interfaces/` and `dto/`
2. `<name>.service.ts` — Prisma + `AppError`
3. `<name>.controller.ts` — `sendSuccess` / `next(error)`
4. `<name>.routes.ts` — `validateDto`, `protect`, `restrictTo`
5. `<name>.modules.ts` — `export default router`
6. `<name>/doc/<name>.swagger.ts` — path object
7. Mount in `CreateApp`: `app.use('/api/v1/<name>', router)`
8. Spread paths in `swagger.config.ts`

Do not put business logic in the controller. Do not return tokens in JSON. Do not add Redis unless you have a measured reason.

---

## Finished `package.json`

After every **Install** block, your `package.json` should match this file (your `repository` URL can differ):

```json
{
  "name": "mvc_backend_practice",
  "version": "1.0.0",
  "description": "MVC starter API — auth + users",
  "main": "src/main.ts",
  "scripts": {
    "dev": "nodemon --watch src -e ts --exec tsx src/main.ts",
    "start": "tsx src/main.ts",
    "build": "tsc",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:studio": "prisma studio",
    "docker:up": "docker compose up -d",
    "docker:down": "docker compose down"
  },
  "repository": {
    "type": "git",
    "url": "git@github-sourav:SouravDn-p/MVC_Backend_Practice.git"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "type": "module",
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/cookie-parser": "^1.4.10",
    "@types/cors": "^2.8.19",
    "@types/express": "^5.0.6",
    "@types/express-rate-limit": "^5.1.3",
    "@types/helmet": "^0.0.48",
    "@types/hpp": "^0.2.7",
    "@types/jsonwebtoken": "^9.0.10",
    "@types/multer": "^2.2.0",
    "@types/node": "^26.4.1",
    "@types/passport": "^1.0.17",
    "@types/passport-google-oauth20": "^2.0.17",
    "@types/pg": "^8.23.1",
    "@types/swagger-jsdoc": "^6.0.4",
    "@types/swagger-ui-express": "^4.1.8",
    "nodemon": "^3.1.14",
    "prettier": "^3.9.6",
    "prisma": "^7.10.0",
    "tsx": "^4.23.13",
    "typescript": "^7.0.2"
  },
  "dependencies": {
    "@prisma/adapter-pg": "^7.10.0",
    "@prisma/client": "^7.10.0",
    "bcryptjs": "^3.0.3",
    "cloudinary": "^2.11.0",
    "cookie-parser": "^1.4.7",
    "cors": "^2.8.6",
    "dotenv": "^17.4.2",
    "express": "^5.2.1",
    "express-rate-limit": "^8.7.0",
    "helmet": "^8.3.0",
    "hpp": "^0.2.3",
    "joi": "^18.2.5",
    "jsonwebtoken": "^9.0.3",
    "multer": "^2.3.0",
    "passport": "^0.7.0",
    "passport-google-oauth20": "^2.0.0",
    "pg": "^8.23.0",
    "swagger-jsdoc": "^6.3.0",
    "swagger-ui-express": "^5.0.1",
    "winston": "^3.19.0"
  }
}
```

---

## Common mistakes

| Symptom | Cause |
| --- | --- |
| `ERR_MODULE_NOT_FOUND` | Import missing `.ts` extension, or `"type"` is not `"module"` |
| Prisma `db push` uuid vs text | `userId` must be `String @db.Uuid` |
| Cookies not sent from a browser | CORS origin not in `ALLOWED_ORIGINS`, or `credentials: 'include'` missing |
| `EADDRINUSE :::5000` | Host `npm run dev` still running while `make up` binds the same port |
| OTP never arrives | Empty `BREVO_API_KEY` — read API logs |
| Photo upload 400 | Cloudinary env vars empty |
| `GET /auth/google` 400 | Google env vars empty (expected) |

You now have the same project this repository contains, built in order from an empty folder.
