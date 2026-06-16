import { Worker, Job } from 'bullmq';
import { sendEmail, emailTemplates } from '../shared/utils/email';
import { env } from '../config/env';
import { logger } from '../config/logger';

// ─── Email Worker ─────────────────────────────────────────────────────────────
// Workers run in the same process (can be separate in production for scaling).
// BullMQ workers poll Redis for jobs, process them concurrently.
// Concurrency=5: process up to 5 emails simultaneously.

export function startEmailWorker() {
  if (env.DEV_DISABLE_REDIS || env.DEV_SKIP_EMAIL_QUEUE) {
    logger.warn('Email worker skipped in development because Redis/email queue is disabled.');
    return null;
  }

  const worker = new Worker(
    'email',
    async (job: Job) => {
      const { name, data } = job;
      logger.debug(`Processing email job: ${name}`, { jobId: job.id });

      switch (name) {
        case 'send-verification': {
          const template = emailTemplates.verifyEmail(data.firstName, data.verifyUrl);
          await sendEmail({ to: data.to, ...template });
          break;
        }
        case 'send-password-reset': {
          const template = emailTemplates.forgotPassword(data.firstName, data.resetUrl);
          await sendEmail({ to: data.to, ...template });
          break;
        }
        case 'send-welcome': {
          const template = emailTemplates.welcomeEmail(data.firstName);
          await sendEmail({ to: data.to, ...template });
          break;
        }
        default:
          logger.warn(`Unknown email job type: ${name}`);
      }
    },
    {
      connection: { url: env.REDIS_URL },
      concurrency: 5,
    }
  );

  worker.on('completed', (job) => {
    logger.debug(`Email job completed: ${job.id} (${job.name})`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`Email job failed: ${job?.id} (${job?.name})`, { error: err.message });
  });

  logger.info('✅ Email worker started');
  return worker;
}
