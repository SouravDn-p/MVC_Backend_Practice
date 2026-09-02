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
