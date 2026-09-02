# MVC Starter API

Express 5 prototype: cookie JWT auth, Prisma 7 + PostgreSQL, Brevo mail, Cloudinary photos, Swagger.

Redis and BullMQ are **not** used. Mail is sent directly through Brevo. Postgres data lives in a named Docker volume (`POSTGRES_VOLUME_NAME` in `.env`).

## Quick start

```bash
make env    # copies .env.example → .env if needed
make up     # postgres + api
```

Or: `cp .env.example .env && docker compose up -d --build`

Fill `BREVO_API_KEY` and Cloudinary keys in `.env` when you want real mail and photo uploads. Without a Brevo key, OTPs are printed in the API logs so you can still verify locally.

| URL | What |
| --- | --- |
| http://localhost:5000 | API |
| http://localhost:5000/health | Database check |
| http://localhost:5000/api/docs | Swagger |

`make down` stops containers and **keeps** the `mvc_postgres_data` volume. `make down-v` wipes the database.

## What Compose reads from `.env`

App secrets (JWT, Brevo, Cloudinary, Google) are injected with `env_file: .env`. The only compose override is `POSTGRES_HOST=postgres` inside the API container so it can reach the database on the Docker network. On the host, `.env` uses `POSTGRES_HOST=localhost`.

Postgres itself is persisted as:

```yaml
volumes:
  postgres_data:
    name: ${POSTGRES_VOLUME_NAME:-mvc_postgres_data}
```

## Host `npm run dev`

```bash
make dev
```

Starts Postgres in Docker, then nodemon on the host against `localhost:5432`.

## Auth flow

1. `POST /api/v1/auth/register`
2. OTP via Brevo (or API logs if the key is empty)
3. `POST /api/v1/auth/verify-email` — sets HttpOnly cookies
4. `GET /api/v1/users/me`
5. `PATCH /api/v1/users/me` — JSON (`name`, `location`, `photo` URL) or `multipart/form-data` with a `photo` file (Cloudinary)

## Make targets

| Target | What it does |
| --- | --- |
| `make env` | Ensure `.env` exists |
| `make up` | `docker compose up -d --build` |
| `make down` | Stop, keep volume |
| `make down-v` | Stop and delete volume |
| `make logs` | `docker compose logs -f api` |
| `make dev` | Postgres in Docker + local API |
| `make push` | `prisma db push` |
| `make build` | `tsc` typecheck |

## Promote an admin

```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'you@example.com';
```

More detail: [docs/build-mvc-from-scratch.md](docs/build-mvc-from-scratch.md).
