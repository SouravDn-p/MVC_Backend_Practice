# MVC Starter API

A TypeScript Express 5 backend for product prototypes: cookie-based JWT authentication, a users module, PostgreSQL, transactional email (Brevo), and image uploads (Cloudinary).

The HTTP envelope is consistent across routes:

```json
{ "success": true, "message": "Logged in successfully", "data": {} }
```

Interactive documentation, including request and response examples for every operation, is available at `/api/docs`.

## Stack

| Layer | Choice |
| --- | --- |
| Runtime | Node.js 20+, TypeScript (ESM, `tsx`) |
| HTTP | Express 5, Helmet, CORS, rate limiting |
| Data | PostgreSQL 16, Prisma 7 |
| Auth | HttpOnly JWT cookies, optional Google OAuth |
| Mail | Brevo HTTP API |
| Media | Cloudinary |
| Docs | OpenAPI 3 / Swagger UI |

There is no Redis and no job queue. Email is sent in-process. Session state lives in PostgreSQL (`user_tokens`).

## Requirements

- [Docker](https://docs.docker.com/get-docker/) with Compose v2
- Node.js 20+ (only for host development: `make dev`)

## Getting started

```bash
make env
make up
```

`make env` creates `.env` from `.env.example` when the file is missing. `make up` builds the API image and starts PostgreSQL plus the API.

| Service | URL |
| --- | --- |
| API | http://localhost:5000 |
| Health | http://localhost:5000/health |
| OpenAPI | http://localhost:5000/api/docs |

Stop containers with `make down`. The named volume (`POSTGRES_VOLUME_NAME`, default `mvc_postgres_data`) is retained. Use `make down-v` to delete it.

### Host development

```bash
make dev
```

PostgreSQL runs in Docker; the API runs on the host with nodemon against `POSTGRES_HOST=localhost`.

## Configuration

All secrets and connection settings live in `.env`. Compose injects that file into both services. The only override in `docker-compose.yml` is `POSTGRES_HOST=postgres` inside the API container, so it can resolve the database on the Docker network.

| Variable | Purpose |
| --- | --- |
| `POSTGRES_*` | Database credentials, host, port, volume name |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Distinct signing keys (do not reuse) |
| `SESSION_SECRET` | Application secret |
| `BREVO_API_KEY` | Transactional email. If empty, OTPs are written to API logs |
| `CLOUDINARY_*` | Required for multipart photo uploads |
| `GOOGLE_CLIENT_*` | Optional. Leave blank to disable Google OAuth |
| `ALLOWED_ORIGINS` | CORS origins (comma-separated) |

Replace the placeholder JWT secrets before any shared or production use:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## Authentication

Sessions use two HttpOnly cookies: `accessToken` (15 minutes) and `refreshToken` (7 days). Tokens are never returned in JSON. The client must send `credentials: 'include'` (or `curl -b` / `-c`).

Typical flow:

1. `POST /api/v1/auth/register` — create the account; OTP is emailed (or logged)
2. `POST /api/v1/auth/verify-email` — verify OTP; cookies are set
3. `GET /api/v1/users/me` — authenticated profile
4. `PATCH /api/v1/users/me` — update name, location, or photo (JSON URL or `multipart/form-data`)
5. `POST /api/v1/auth/refresh-token` — rotate the refresh cookie when access expires

Roles are `USER` and `ADMIN`. Promote an account in SQL:

```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'you@example.com';
```

## Commands

| Target | Description |
| --- | --- |
| `make env` | Create `.env` from `.env.example` if it does not exist |
| `make up` | Build and start PostgreSQL and the API |
| `make down` | Stop containers; keep the data volume |
| `make down-v` | Stop containers and remove the data volume |
| `make logs` | Follow API logs |
| `make restart` | Rebuild and restart the API container |
| `make dev` | PostgreSQL in Docker; API on the host |
| `make push` | Apply the Prisma schema (`prisma db push`) |
| `make generate` | Generate the Prisma client |
| `make studio` | Open Prisma Studio |
| `make build` | Typecheck (`tsc`) |

## Project layout

```text
src/
  main.ts                 Process entry
  app.ts                  Middleware and route mounting
  config/                 Env, Prisma, Passport, Swagger, Cloudinary
  app/common/             Errors, guards, utilities
  app/modules/auth/
  app/modules/users/
```

Modules follow `routes → controller → service → dto → doc`. Controllers stay thin; services throw `AppError`.

Step-by-step from an empty folder: [docs/build-mvc-from-scratch.md](docs/build-mvc-from-scratch.md).

## License

ISC
