import { createServer } from 'node:http';
import app, { createApp } from './app.ts';
import connectDatabase from './config/db/database.config.ts';
import { ENV } from './config/env.config.ts';
import { logger } from './app/utils/logger.util.ts';

const startServer = async (): Promise<void> => {
  try {
    await connectDatabase();

    const app = createApp();

    const server = createServer(app);
  
    server.listen(ENV.PORT, () => {
    logger.info(
      `Server running on http://localhost:${ENV.PORT}`
      );
    });

    const shutdown = (signal: string) => {
      logger.warn(`${signal} received. Shutting down gracefully...`);

      server.close(() => {
        logger.info('HTTP server closed.');

        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (error) {
    logger.error('Server startup failed:', error);
    process.exit(1);
  }
}

startServer();
