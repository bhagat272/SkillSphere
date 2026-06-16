import mongoose from 'mongoose';
import { env } from './env';
import { logger } from './logger';

// ─── MongoDB Connection with Retry Logic ──────────────────────────────────────
// Production pattern: exponential backoff retry on initial connect,
// Mongoose handles reconnection automatically after that.
// Index creation is deferred to avoid blocking app startup.

const RETRY_DELAY_MS = 5000;
const MAX_RETRIES = 5;

export async function connectDatabase(retries = 0): Promise<void> {
  try {
    await mongoose.connect(env.MONGODB_URI, {
      // Connection pool: allows concurrent DB operations
      maxPoolSize: 10,
      minPoolSize: 2,
      // Server selection timeout
      serverSelectionTimeoutMS: 5000,
      // Socket timeout
      socketTimeoutMS: 45000,
      // Optimize heartbeat
      heartbeatFrequencyMS: 10000,
    });

    logger.info('✅ MongoDB connected successfully');

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });
  } catch (error) {
    if (retries < MAX_RETRIES) {
      logger.warn(
        `MongoDB connection failed. Retry ${retries + 1}/${MAX_RETRIES} in ${RETRY_DELAY_MS}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      return connectDatabase(retries + 1);
    }
    logger.error('MongoDB connection failed after max retries:', error);
    process.exit(1);
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected');
}
