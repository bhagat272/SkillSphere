import { Queue } from 'bullmq';
import { env } from '../config/env';
import { logger } from '../config/logger';

export const notificationQueue = env.DEV_DISABLE_REDIS
  ? {
      async add(name: string, data: unknown) {
        logger.info(`Notification queue skipped in development: ${name}`, data);
        return null;
      },
    }
  : new Queue('notifications', {
      connection: { url: env.REDIS_URL },
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: { count: 200 },
        removeOnFail: { count: 500 },
      },
    });
