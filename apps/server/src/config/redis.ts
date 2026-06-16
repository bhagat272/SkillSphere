import { createClient, RedisClientType } from 'redis';
import { env } from './env';
import { logger } from './logger';

// ─── Redis Client Singleton ───────────────────────────────────────────────────
// Redis serves three purposes in this app:
//   1. Session/token blacklisting (logout invalidation)
//   2. BullMQ job queue backing store
//   3. Presence tracking (online users, Socket.io)
// Using a single client with shared connection for efficiency.

let redisClient: RedisClientType;
const memoryStore = new Map<string, { value: string; expiresAt?: number }>();

function createMemoryRedisClient() {
  return {
    async connect() {
      return undefined;
    },
    async disconnect() {
      memoryStore.clear();
      return undefined;
    },
    async setEx(key: string, seconds: number, value: string) {
      memoryStore.set(key, { value, expiresAt: Date.now() + seconds * 1000 });
      return 'OK';
    },
    async get(key: string) {
      const entry = memoryStore.get(key);
      if (!entry) return null;
      if (entry.expiresAt && entry.expiresAt < Date.now()) {
        memoryStore.delete(key);
        return null;
      }
      return entry.value;
    },
    async del(key: string) {
      return memoryStore.delete(key) ? 1 : 0;
    },
  } as unknown as RedisClientType;
}

export async function connectRedis(): Promise<RedisClientType> {
  if (env.DEV_DISABLE_REDIS) {
    redisClient = createMemoryRedisClient();
    logger.warn('Redis disabled by DEV_DISABLE_REDIS=true. Using in-memory dev token store.');
    return redisClient;
  }

  redisClient = createClient({
    url: env.REDIS_URL,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          logger.error('Redis: Max reconnection attempts reached');
          return new Error('Redis max retries exceeded');
        }
        const delay = Math.min(retries * 100, 3000);
        logger.warn(`Redis reconnecting in ${delay}ms (attempt ${retries})`);
        return delay;
      },
    },
  });

  redisClient.on('error', (err) => logger.error('Redis client error:', err));
  redisClient.on('connect', () => logger.info('✅ Redis connected successfully'));
  redisClient.on('reconnecting', () => logger.warn('Redis reconnecting...'));

  await redisClient.connect();
  return redisClient;
}

export function getRedisClient(): RedisClientType {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call connectRedis() first.');
  }
  return redisClient;
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.disconnect();
    logger.info('Redis disconnected');
  }
}

// ─── Redis Utility Helpers ───────────────────────────────────────────────────
export const redisKeys = {
  refreshToken: (userId: string, tokenId: string) =>
    `refresh:${userId}:${tokenId}`,
  emailVerification: (token: string) => `email:verify:${token}`,
  passwordReset: (token: string) => `pwd:reset:${token}`,
  userPresence: (userId: string) => `presence:${userId}`,
  rateLimitIP: (ip: string) => `rateLimit:${ip}`,
  userCache: (userId: string) => `user:${userId}`,
  feedCache: (userId: string, page: number) => `feed:${userId}:${page}`,
};
