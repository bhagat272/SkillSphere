import winston from 'winston';
import { env } from './env';

// ─── Winston Logger Configuration ────────────────────────────────────────────
// Production logging strategy:
//   - Console: human-readable in dev, JSON in production (for log aggregators)
//   - File: error.log (errors only), combined.log (all levels)
//   - JSON format in production for tools like Datadog, CloudWatch, Papertrail

const { combine, timestamp, printf, colorize, errors, json } = winston.format;
const isServerless = process.env.VERCEL === '1';

// Custom dev format
const devFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
  return `${timestamp} [${level}]: ${stack || message}${metaStr}`;
});

export const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })
  ),
  transports: [
    // Console transport
    new winston.transports.Console({
      format:
        env.NODE_ENV === 'production'
          ? combine(timestamp(), json())
          : combine(colorize({ all: true }), timestamp({ format: 'HH:mm:ss' }), devFormat),
    }),
    // File transports for traditional production servers only.
    // Vercel functions have a read-only filesystem except /tmp, so console logs are used there.
    ...(env.NODE_ENV === 'production' && !isServerless
      ? [
          new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            format: combine(timestamp(), json()),
            maxsize: 10 * 1024 * 1024, // 10MB
            maxFiles: 5,
          }),
          new winston.transports.File({
            filename: 'logs/combined.log',
            format: combine(timestamp(), json()),
            maxsize: 10 * 1024 * 1024,
            maxFiles: 10,
          }),
        ]
      : []),
  ],
  // Don't exit on uncaught exceptions
  exitOnError: false,
});

// ─── Stream for Morgan HTTP logger ───────────────────────────────────────────
export const morganStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};
