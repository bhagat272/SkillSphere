import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { verifyAccessToken } from '../shared/utils/jwt';
import { getRedisClient, redisKeys } from '../config/redis';
import { Message, Conversation } from '../models/Chat';
import { Notification } from '../models/Notification';
import { logger } from '../config/logger';
import { env } from '../config/env';
import mongoose from 'mongoose';

// ─── Authenticated Socket Interface ──────────────────────────────────────────
interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

export function initializeSocketIO(httpServer: HTTPServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // ─── Auth Middleware ──────────────────────────────────────────────
  // Socket.io connections are authenticated via JWT in the handshake
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const payload = verifyAccessToken(token);
      socket.userId = payload.userId;
      socket.userRole = payload.role;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  // ─── Connection Handler ───────────────────────────────────────────
  io.on('connection', async (socket: AuthenticatedSocket) => {
    const userId = socket.userId!;
    logger.debug(`Socket connected: ${socket.id} (user: ${userId})`);

    // Join personal room for notifications
    socket.join(`user:${userId}`);

    // Set user online in Redis with TTL (presence tracking)
    const redis = env.DEV_DISABLE_REDIS ? null : getRedisClient();
    await redis?.setEx(redisKeys.userPresence(userId), 300, 'online'); // 5 min TTL
    io.emit('user:online', { userId }); // Broadcast presence

    // ─── Heartbeat: refresh presence TTL periodically ──────────────
    const presenceInterval = setInterval(async () => {
      await redis?.setEx(redisKeys.userPresence(userId), 300, 'online');
    }, 60 * 1000); // Every 60s

    // ─── Join Conversation Room ───────────────────────────────────
    socket.on('chat:join', async ({ conversationId }: { conversationId: string }) => {
      // Verify user is a participant
      const conversation = await Conversation.findOne({
        _id: new mongoose.Types.ObjectId(conversationId),
        participants: new mongoose.Types.ObjectId(userId),
      });
      if (conversation) {
        socket.join(`conversation:${conversationId}`);
        logger.debug(`User ${userId} joined conversation ${conversationId}`);
      }
    });

    // ─── Send Message ─────────────────────────────────────────────
    socket.on(
      'chat:message',
      async (data: { conversationId: string; content: string; type?: string }) => {
        try {
          const { conversationId, content, type = 'text' } = data;

          // Verify participant
          const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: new mongoose.Types.ObjectId(userId),
          });
          if (!conversation) return;

          // Save message to DB
          const message = await Message.create({
            conversation: new mongoose.Types.ObjectId(conversationId),
            sender: new mongoose.Types.ObjectId(userId),
            content,
            type,
            readBy: [{ user: new mongoose.Types.ObjectId(userId), readAt: new Date() }],
          });

          // Update conversation last message
          await Conversation.findByIdAndUpdate(conversationId, {
            lastMessage: message._id,
            lastMessageAt: new Date(),
          });

          const populatedMessage = await message.populate(
            'sender',
            'profile.firstName profile.lastName profile.avatar'
          );

          // Broadcast to conversation room
          io.to(`conversation:${conversationId}`).emit('chat:message', {
            message: populatedMessage,
          });
        } catch (err) {
          logger.error('Socket chat:message error:', err);
        }
      }
    );

    // ─── Typing Indicator ─────────────────────────────────────────
    socket.on('chat:typing', ({ conversationId, isTyping }: { conversationId: string; isTyping: boolean }) => {
      socket.to(`conversation:${conversationId}`).emit('chat:typing', {
        userId,
        conversationId,
        isTyping,
      });
    });

    // ─── Mark Messages Read ───────────────────────────────────────
    socket.on('chat:read', async ({ conversationId }: { conversationId: string }) => {
      await Message.updateMany(
        {
          conversation: new mongoose.Types.ObjectId(conversationId),
          'readBy.user': { $ne: new mongoose.Types.ObjectId(userId) },
        },
        {
          $push: { readBy: { user: new mongoose.Types.ObjectId(userId), readAt: new Date() } },
        }
      );
      socket.to(`conversation:${conversationId}`).emit('chat:read', { userId, conversationId });
    });

    // ─── Notification: Mark Read ──────────────────────────────────
    socket.on('notification:read', async ({ notificationId }: { notificationId: string }) => {
      await Notification.findOneAndUpdate(
        { _id: notificationId, recipient: new mongoose.Types.ObjectId(userId) },
        { isRead: true }
      );
    });

    // ─── Disconnect ───────────────────────────────────────────────
    socket.on('disconnect', async () => {
      clearInterval(presenceInterval);
      await redis?.del(redisKeys.userPresence(userId));
      io.emit('user:offline', { userId });
      logger.debug(`Socket disconnected: ${socket.id} (user: ${userId})`);
    });
  });

  logger.info('✅ Socket.io initialized');
  return io;
}
