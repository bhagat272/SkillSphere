import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { sendResponse } from '../utils/response';

// ─── Zod Validation Middleware ────────────────────────────────────────────────
// Validates request body/params/query against a Zod schema.
// Returns structured validation errors matching our API response format.
// Interview: "Why Zod over Joi or express-validator?"
// Zod: TypeScript-first, infers types automatically, works with tRPC/React Hook Form.

type ValidateTarget = 'body' | 'params' | 'query';

export const validate = (schema: ZodSchema, target: ValidateTarget = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      const errors = formatZodErrors(result.error);
      sendResponse.badRequest(res, 'Validation failed', errors);
      return;
    }
    // Replace raw input with validated/transformed data
    req[target] = result.data;
    next();
  };
};

const formatZodErrors = (error: ZodError) => {
  return error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
  }));
};
