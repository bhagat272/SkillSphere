import http from 'http';
import { createApp } from './app';
import { connectDatabase } from './config/database';
import { connectRedis } from './config/redis';
import { initCloudinary } from './config/cloudinary';
import { initializeSocketIO } from './sockets/socket';
import { startEmailWorker } from './workers/email.worker';
import { startNotificationWorker, setSocketIO } from './workers/notification.worker';
import { logger } from './config/logger';
import { env } from './config/env';

// ─── Bootstrap ────────────────────────────────────────────────────────────────
async function bootstrap(): Promise<void> {
  try {
    // 1. Connect to database
    await connectDatabase();

    // 2. Connect to Redis
    await connectRedis();

    // 3. Initialize external services
    initCloudinary();

    // 4. Create Express app
    const app = createApp();

    // 5. Create HTTP server (required for Socket.io)
    const httpServer = http.createServer(app);

    // 6. Initialize Socket.io
    const io = initializeSocketIO(httpServer);

    // 7. Pass Socket.io instance to notification worker
    setSocketIO(io);

    // 8. Start BullMQ workers
    startEmailWorker();
    startNotificationWorker();

    // 9. Start server
    httpServer.listen(env.PORT, () => {
      logger.info(`
╔════════════════════════════════════════════╗
║     SkillSphere AI Server Started          ║
╠════════════════════════════════════════════╣
║  Environment: ${env.NODE_ENV.padEnd(28)}║
║  Port:        ${String(env.PORT).padEnd(28)}║
║  API Prefix:  ${env.API_PREFIX.padEnd(28)}║
╚════════════════════════════════════════════╝
      `);
    });

    // 10. Graceful shutdown handlers
    const gracefulShutdown = async (signal: string) => {
      logger.info(`\n${signal} received. Shutting down gracefully...`);
      httpServer.close(async () => {
        logger.info('HTTP server closed');
        const { disconnectDatabase } = await import('./config/database');
        const { disconnectRedis } = await import('./config/redis');
        await disconnectDatabase();
        await disconnectRedis();
        logger.info('All connections closed. Exiting.');
        process.exit(0);
      });

      // Force exit after 10s if not closed
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: unknown) => {
      logger.error('Unhandled Rejection:', reason);
      // Don't crash — log and continue (in production, alert your monitoring)
    });

    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1); // Crash on uncaught exceptions (restart via PM2/Docker)
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();
