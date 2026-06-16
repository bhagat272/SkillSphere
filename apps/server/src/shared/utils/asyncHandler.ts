import { Request, Response, NextFunction, RequestHandler } from 'express';

// ─── Async Handler Wrapper ────────────────────────────────────────────────────
// Eliminates try-catch boilerplate in every controller.
// All async errors are forwarded to the Express error handler middleware.
// Interview topic: "How do you handle async errors in Express without try-catch everywhere?"

export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

// ─── Custom Application Error ─────────────────────────────────────────────────
// Typed error class allows the error handler to distinguish between
// operational errors (user-facing) and programming errors (log & crash).
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly errors?: Array<{ field: string; message: string }>;
  static badRequest: (msg: string) => AppError;
  static unauthorized: (msg?: string) => AppError;
  static forbidden: (msg?: string) => AppError;
  static notFound: (msg: string) => AppError;
  static conflict: (msg: string) => AppError;
  static tooManyRequests: (msg?: string) => AppError;

  constructor(
    message: string,
    statusCode: number,
    errors?: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // Operational = predictable user error
    this.errors = errors;
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

// Convenience factory methods
AppError.badRequest = (msg: string) => new AppError(msg, 400);
AppError.unauthorized = (msg = 'Unauthorized') => new AppError(msg, 401);
AppError.forbidden = (msg = 'Forbidden') => new AppError(msg, 403);
AppError.notFound = (msg: string) => new AppError(msg, 404);
AppError.conflict = (msg: string) => new AppError(msg, 409);
AppError.tooManyRequests = (msg = 'Too many requests') => new AppError(msg, 429);
