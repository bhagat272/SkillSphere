import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/asyncHandler';
import { sendResponse } from '../utils/response';
import { logger } from '../../config/logger';
import { env } from '../../config/env';

// ─── Centralized Error Handler ────────────────────────────────────────────────
// Must be registered LAST in Express middleware chain (4 args).
// Distinguishes between operational errors (user-caused) and programming errors.
// Interview: "What is the difference between operational and programmer errors?"
// Operational: expected failures (invalid input, 404) — return user-facing message
// Programmer: unexpected bugs (null reference) — log & return generic 500

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  // Default to 500
  let statusCode = 500;
  let message = 'Internal server error';
  let errors: Array<{ field: string; message: string }> | undefined;

  // ─── Operational Error (our AppError) ───────────────────────────
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors;
    // Only log operational errors in debug mode
    logger.debug(`Operational error [${statusCode}]: ${message}`, {
      path: req.path,
      method: req.method,
    });
  }
  // ─── Mongoose Validation Error ───────────────────────────────────
  else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation error';
    const mongooseErr = err as unknown as { errors: Record<string, { message: string }> };
    errors = Object.values(mongooseErr.errors).map((e) => ({
      field: e.message,
      message: e.message,
    }));
  }
  // ─── Mongoose Duplicate Key Error ────────────────────────────────
  else if ((err as NodeJS.ErrnoException).code === '11000') {
    statusCode = 409;
    const keyErr = err as unknown as { keyValue: Record<string, unknown> };
    const field = Object.keys(keyErr.keyValue || {})[0] || 'field';
    message = `${field} already exists`;
  }
  // ─── Mongoose Cast Error (invalid ObjectId) ──────────────────────
  else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  }
  // ─── JWT Errors ───────────────────────────────────────────────────
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }
  // ─── Programming Error (unexpected) ──────────────────────────────
  else {
    logger.error('Unexpected error:', {
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      userId: req.user?.userId,
    });
    // In production, never expose stack traces
    message = env.isProduction ? 'Internal server error' : err.message;
  }

  sendResponse.error(res, message, statusCode, errors);
};

// ─── 404 Handler ─────────────────────────────────────────────────────────────
export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  next(new AppError(`Route ${req.method} ${req.path} not found`, 404));
};
