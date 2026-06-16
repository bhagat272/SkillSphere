import { Queue } from 'bullmq';
import { env } from '../config/env';
import { logger } from '../config/logger';

// ─── Email Queue ──────────────────────────────────────────────────────────────
// BullMQ uses Redis as backing store. Jobs are persisted — survive server restarts.
// Interview: "Why use a queue for emails?"
// 1. HTTP request returns immediately (non-blocking UX)
// 2. Retry on failure (email SMTP timeouts are common)
// 3. Rate limiting to avoid SMTP abuse flags
// 4. Visibility into job status, failures, retries

export const emailQueue =
  env.DEV_DISABLE_REDIS || env.DEV_SKIP_EMAIL_QUEUE
    ? {
        async add(name: string, data: unknown) {
          logger.info(`Email queue skipped in development: ${name}`, data);
          return null;
        },
      }
    : new Queue('email', {
        connection: { url: env.REDIS_URL },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: { count: 100 }, // Keep last 100 completed for debugging
          removeOnFail: { count: 200 },
        },
      });
