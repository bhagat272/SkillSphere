import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';

import { env } from './config/env';
import { morganStream } from './config/logger';
import { globalRateLimiter } from './shared/middleware/rateLimit.middleware';
import { errorHandler, notFoundHandler } from './shared/middleware/error.middleware';

// ─── Feature Routers ──────────────────────────────────────────────────────────
import authRoutes from './features/auth/routes/auth.routes';
import userRoutes from './features/users/routes/user.routes';
import postRoutes from './features/posts/routes/post.routes';
import notificationRoutes from './features/notifications/routes/notification.routes';
import chatRoutes from './features/chat/routes/chat.routes';
import jobRoutes from './features/jobs/routes/job.routes';
import paymentRoutes from './features/payments/routes/payment.routes';
import aiRoutes from './features/ai/routes/ai.routes';
import adminRoutes from './features/admin/routes/admin.routes';

// ─── Express App Factory ──────────────────────────────────────────────────────
export function createApp(): Application {
  const app = express();

  // ─── Security Middleware ────────────────────────────────────────
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: env.isProduction,
    })
  );

  app.use(
    cors({
      origin: env.CLIENT_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Prevent HTTP Parameter Pollution
  app.use(hpp());

  // Sanitize MongoDB query selectors from user input (prevents NoSQL injection)
  app.use(mongoSanitize());

  // ─── Request Parsing ────────────────────────────────────────────
  app.use(
    express.json({
      limit: '10mb',
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    })
  );
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // ─── Performance ────────────────────────────────────────────────
  app.use(compression());

  // ─── Logging ────────────────────────────────────────────────────
  app.use(morgan(env.isProduction ? 'combined' : 'dev', { stream: morganStream }));

  // ─── Global Rate Limiting ───────────────────────────────────────
  app.use(globalRateLimiter);

  // ─── Health Check ───────────────────────────────────────────────
  app.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: env.NODE_ENV,
    });
  });

  // ─── API Routes ─────────────────────────────────────────────────
  const apiPrefix = env.API_PREFIX;
  app.use(`${apiPrefix}/auth`, authRoutes);
  app.use(`${apiPrefix}/users`, userRoutes);
  app.use(`${apiPrefix}/posts`, postRoutes);
  app.use(`${apiPrefix}/notifications`, notificationRoutes);
  app.use(`${apiPrefix}/chat`, chatRoutes);
  app.use(`${apiPrefix}/jobs`, jobRoutes);
  app.use(`${apiPrefix}/payments`, paymentRoutes);
  app.use(`${apiPrefix}/ai`, aiRoutes);
  app.use(`${apiPrefix}/admin`, adminRoutes);

  // ─── 404 + Error Handlers (LAST) ───────────────────────────────
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
