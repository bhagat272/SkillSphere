import { Request } from 'express';

// ─── Pagination Utility ───────────────────────────────────────────────────────
// Interview topic: "How do you implement cursor vs offset pagination?"
// We use offset pagination here for simplicity, but cursor-based is better
// for real-time feeds (avoids duplicate/missing items when data changes).

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginationResult {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export const getPagination = (req: Request, defaultLimit = 20): PaginationParams => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || defaultLimit));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

export const buildPaginationResult = (
  total: number,
  page: number,
  limit: number
): PaginationResult => {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};
