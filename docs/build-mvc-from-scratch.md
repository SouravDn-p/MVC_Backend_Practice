# MVC Starter API

Build a small Express 5 API: cookie JWT auth, a users module, PostgreSQL (Prisma 7), Brevo for email, Cloudinary for photos.

This is **not** an auction product. There is no Redis and no BullMQ. Mail is sent in the request via Brevo. Photos go to Cloudinary.

When you finish you have:

- Node + TypeScript ESM (`tsx`, no compile step in development)
- Express 5 with helmet, cors, rate limit, cookies
- Prisma 7 + PostgreSQL
- Cookie-based JWT sessions with refresh rotation
- `/api/v1/auth/*` and `/api/v1/users/*`
- Swagger at `/api/docs`

---

## Quick start

```bash
make env
make up
```

That is `cp .env.example .env` (if needed) then `docker compose up -d --build`.

| URL | What |
| --- | --- |
| http://localhost:5000 | API |
| http://localhost:5000/health | Postgres check |
| http://localhost:5000/api/docs | Swagger |

`make down` keeps the named volume `POSTGRES_VOLUME_NAME`. `make down-v` deletes it.

Host nodemon:

```bash
make dev
```

---

## Layout

```text
src/
  main.ts
  app.ts
  config/          env, db, passport, swagger, cloudinary
  app/common/      errors, guards, utils
  app/modules/
    auth/
    users/
  services/templates/email-templates.ts
```

Feature folder: `routes` → `controller` → `service` → `dto` → `doc`. Controllers stay thin. Throw `AppError`. Protect with `protect`, then `restrictTo` if needed.

---

## Docker and `.env`

Compose does **not** list JWT / Brevo / Cloudinary keys. Both services use `env_file: .env`.

The API container only overrides `POSTGRES_HOST=postgres` so `DATABASE_URL` (built from `POSTGRES_*`) points at the Docker DNS name. On the host, `.env` has `POSTGRES_HOST=localhost`.

Postgres data:

```yaml
volumes:
  postgres_data:
    name: ${POSTGRES_VOLUME_NAME:-mvc_postgres_data}
```

Set `POSTGRES_VOLUME_NAME` in `.env` if you want a stable name across machines.

---

## Prisma

Identity only: `User` + `UserToken`. Roles are `USER` | `ADMIN`. Token types: `refresh`, `emailVerification`, `passwordReset`.

Foreign keys to `User.id` are `String @db.Uuid` with `onDelete: Cascade`.

```bash
make generate
make push
```

---

## Mail (Brevo only)

`sendTransactionalEmail` POSTs to the Brevo HTTP API. There is no queue.

- Production requires `BREVO_API_KEY`
- Locally, a missing key logs `[Brevo skipped] ... OTP=123456` so register → verify still works

---

## Cloudinary

`PATCH /api/v1/users/me` accepts JSON (`photo` as a URL) or `multipart/form-data` with a `photo` file (max 2 MB, images only). File uploads need:

```
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Replacing a file destroys the previous `imagePublicId`.

---

## Auth

Cookies: `accessToken` (15m) and `refreshToken` (7d), HttpOnly. Tokens are never in JSON.

`POST /auth/register` creates the user and emails an OTP. `POST /auth/verify-email` opens a session. `protect` reads the access cookie and loads the user from Postgres (no cache). Expired refresh rows are deleted when a new session is issued.

Google OAuth is optional; empty credentials make `GET /auth/google` return 400.

---

## Users

| Method | Path | Who |
| --- | --- | --- |
| GET | `/users/me` | logged in |
| PATCH | `/users/me` | logged in |
| GET | `/users/admin/users` | ADMIN |
| PATCH | `/users/admin/users/:userId/status` | ADMIN |

Promote an admin:

```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'you@example.com';
```

---

## Example responses

Every JSON endpoint uses `{ success, message, data? }` on success and `{ success: false, message }` on error. Tokens are never in the body — they are HttpOnly cookies.

Open **Swagger** at `/api/docs` and expand any operation: success and error examples are on each response.

Register (201):

```json
{
  "success": true,
  "message": "Registration successful. Please verify your email.",
  "data": {
    "user": {
      "id": "0193c0a1-8b2e-7d4f-9c11-4e6a2b8d1f03",
      "email": "saimor@example.com",
      "name": "Saimor"
    }
  }
}
```

Login / verify-email (200) — plus `Set-Cookie`:

```json
{
  "success": true,
  "message": "Logged in successfully",
  "data": { "user": { "id": "...", "name": "Saimor", "email": "saimor@example.com", "role": "USER" } }
}
```

Error (401):

```json
{ "success": false, "message": "Invalid email or password" }
```

---

## Verify

```bash
make up

curl -s http://localhost:5000/health

curl -s -X POST http://localhost:5000/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Saimor","email":"saimor@example.com","password":"StrongPass1!"}'

# OTP: Brevo inbox, or API logs if BREVO_API_KEY is empty

curl -s -c cookies.txt -X POST http://localhost:5000/api/v1/auth/verify-email \
  -H 'Content-Type: application/json' \
  -d '{"email":"saimor@example.com","otp":"123456"}'

curl -s -b cookies.txt http://localhost:5000/api/v1/users/me
```

---

## Make targets

| Target | Command |
| --- | --- |
| `make env` | `.env` from example |
| `make up` | compose up --build |
| `make down` | compose down (volume stays) |
| `make down-v` | compose down -v |
| `make logs` | API logs |
| `make dev` | Postgres + `npm run dev` |
| `make push` | `prisma db push` |
| `make build` | `tsc` |

A later module is the same five files under `src/app/modules/<name>/`, mount in `CreateApp`, spread swagger paths.
