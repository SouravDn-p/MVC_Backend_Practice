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
