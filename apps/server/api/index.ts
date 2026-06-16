import mongoose from 'mongoose';
import { createApp } from '../src/app';
import { env } from '../src/config/env';
import { logger } from '../src/config/logger';

const app = createApp();
let connectionPromise: Promise<typeof mongoose> | null = null;

async function ensureDatabaseConnection() {
  if (mongoose.connection.readyState === 1) return;

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(env.MONGODB_URI, {
      maxPoolSize: 5,
      minPoolSize: 0,
      serverSelectionTimeoutMS: 5000,
    });
  }

  await connectionPromise;
  logger.info('MongoDB connected for Vercel function');
}

export default async function handler(req: any, res: any) {
  try {
    await ensureDatabaseConnection();
    return app(req, res);
  } catch (error) {
    logger.error('Vercel API bootstrap failed:', error);
    return res.status(500).json({
      success: false,
      message: 'API bootstrap failed',
    });
  }
}
