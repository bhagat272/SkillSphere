import { Response } from 'express';

// ─── Centralized API Response System ─────────────────────────────────────────
// Using a centralized response helper ensures consistent response shape across
// ALL endpoints — critical for frontend teams and API consumers.
// Interview topic: "How do you standardize API responses?"

export interface ApiResponse<T = null> {
  success: boolean;
  message: string;
  data?: T;
  meta?: ResponseMeta;
  errors?: ValidationError[];
}

export interface ResponseMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
}

export interface ValidationError {
  field: string;
  message: string;
}

class ResponseHandler {
  success<T>(
    res: Response,
    data: T,
    message = 'Success',
    statusCode = 200,
    meta?: ResponseMeta
  ): Response {
    const response: ApiResponse<T> = { success: true, message, data };
    if (meta) response.meta = meta;
    return res.status(statusCode).json(response);
  }

  created<T>(res: Response, data: T, message = 'Resource created'): Response {
    return this.success(res, data, message, 201);
  }

  noContent(res: Response): Response {
    return res.status(204).send();
  }

  error(
    res: Response,
    message: string,
    statusCode = 500,
    errors?: ValidationError[]
  ): Response {
    const response: ApiResponse = { success: false, message };
    if (errors) response.errors = errors;
    return res.status(statusCode).json(response);
  }

  badRequest(res: Response, message: string, errors?: ValidationError[]): Response {
    return this.error(res, message, 400, errors);
  }

  unauthorized(res: Response, message = 'Authentication required'): Response {
    return this.error(res, message, 401);
  }

  forbidden(res: Response, message = 'Access denied'): Response {
    return this.error(res, message, 403);
  }

  notFound(res: Response, message = 'Resource not found'): Response {
    return this.error(res, message, 404);
  }

  conflict(res: Response, message: string): Response {
    return this.error(res, message, 409);
  }

  tooManyRequests(res: Response, message = 'Too many requests'): Response {
    return this.error(res, message, 429);
  }

  internalError(res: Response, message = 'Internal server error'): Response {
    return this.error(res, message, 500);
  }

  // Paginated response with metadata
  paginated<T>(
    res: Response,
    data: T[],
    total: number,
    page: number,
    limit: number,
    message = 'Success'
  ): Response {
    const totalPages = Math.ceil(total / limit);
    return this.success(res, data, message, 200, {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    });
  }
}

export const sendResponse = new ResponseHandler();
