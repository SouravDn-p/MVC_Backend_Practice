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
