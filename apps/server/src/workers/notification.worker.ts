import { Worker, Job } from 'bullmq';
import { Notification } from '../models/Notification';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { Server as SocketIOServer } from 'socket.io';

let ioInstance: SocketIOServer | null = null;

export function setSocketIO(io: SocketIOServer) {
  ioInstance = io;
}

export function startNotificationWorker() {
  if (env.DEV_DISABLE_REDIS) {
    logger.warn('Notification worker skipped in development because Redis is disabled.');
    return null;
  }

  const worker = new Worker(
    'notifications',
    async (job: Job) => {
      const { data } = job;

      // Persist notification in DB
      const notification = await Notification.create({
        recipient: data.recipientId,
        sender: data.senderId,
        type: data.type,
        title: data.title,
        message: data.message,
        data: data.data || {},
      });

      // Emit real-time notification via Socket.io if user is online
      if (ioInstance) {
        ioInstance
          .to(`user:${data.recipientId}`)
          .emit('notification:new', {
            notification: await notification.populate('sender', 'profile.firstName profile.lastName profile.avatar'),
          });
      }

      logger.debug(`Notification sent to user ${data.recipientId}: ${data.type}`);
    },
    {
      connection: { url: env.REDIS_URL },
      concurrency: 10,
    }
  );

  worker.on('failed', (job, err) => {
    logger.error(`Notification job failed: ${job?.id}`, { error: err.message });
  });

  logger.info('✅ Notification worker started');
  return worker;
}
