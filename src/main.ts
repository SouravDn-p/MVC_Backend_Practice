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
