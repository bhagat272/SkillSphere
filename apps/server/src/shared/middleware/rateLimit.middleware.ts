import rateLimit from 'express-rate-limit';
import { env } from '../../config/env';
import { sendResponse } from '../utils/response';

// ─── Rate Limiting Middleware ─────────────────────────────────────────────────
// Interview: "How do you prevent brute force attacks?"
// 1. Rate limiting per IP (express-rate-limit)
// 2. Account lockout after N failures (implemented in auth service)
// 3. CAPTCHA on repeated failures
// 4. Redis-backed rate limiting for distributed systems (redis-rate-limit)
// Tradeoff: simple in-memory rate limit won't work behind multiple server instances
// — use Redis store for production horizontal scaling.

// General API rate limit
export const globalRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendResponse.tooManyRequests(res, 'Too many requests. Please try again later.');
  },
});

// Strict limit for auth endpoints (login, register, password reset)
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per 15 minutes
  skipSuccessfulRequests: true, // Don't count successful requests
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendResponse.tooManyRequests(
      res,
      'Too many authentication attempts. Please try again in 15 minutes.'
    );
  },
});

// Stricter limit for password reset/forgot password
export const passwordResetRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendResponse.tooManyRequests(
      res,
      'Too many password reset attempts. Please try again in 1 hour.'
    );
  },
});

// AI feature rate limit (expensive OpenAI calls)
export const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  keyGenerator: (req) => req.user?.userId || req.ip || 'unknown',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendResponse.tooManyRequests(
      res,
      'AI feature limit reached. Upgrade to Premium for unlimited AI access.'
    );
  },
});
