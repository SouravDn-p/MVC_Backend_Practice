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