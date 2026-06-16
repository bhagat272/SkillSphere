import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { sendResponse } from '../utils/response';
import { User } from '../../models/User';
import { AppError } from '../utils/asyncHandler';

// ─── Extended Request Type ────────────────────────────────────────────────────
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: string;
      };
      currentUser?: Awaited<ReturnType<typeof User.findById>>;
    }
  }
}

// ─── Authentication Middleware ────────────────────────────────────────────────
// Verifies JWT access token from Authorization header.
// Does NOT fetch full user from DB — uses token claims for efficiency.
// Full user is only loaded when needed via requireUser middleware.

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      sendResponse.unauthorized(res, 'No token provided');
      return;
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.name === 'TokenExpiredError') {
        sendResponse.unauthorized(res, 'Token expired. Please refresh.');
        return;
      }
      if (error.name === 'JsonWebTokenError') {
        sendResponse.unauthorized(res, 'Invalid token');
        return;
      }
    }
    sendResponse.unauthorized(res, 'Authentication failed');
  }
};

// ─── RBAC Middleware ──────────────────────────────────────────────────────────
// Role-Based Access Control.
// Interview: "How does RBAC differ from ABAC?"
// RBAC: permission based on role (simpler, most apps use this)
// ABAC: permission based on attributes (user, resource, environment) — more flexible

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendResponse.unauthorized(res);
      return;
    }
    if (!roles.includes(req.user.role)) {
      sendResponse.forbidden(res, `Role '${req.user.role}' is not authorized for this action`);
      return;
    }
    next();
  };
};

// ─── Optional Auth ────────────────────────────────────────────────────────────
// Used on public routes that have enhanced behavior when authenticated
// (e.g., feed shows "liked" status for logged-in users)
export const optionalAuth = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      req.user = verifyAccessToken(token);
    }
  } catch {
    // Silently ignore — user is simply unauthenticated
  }
  next();
};

// ─── Load Full User ───────────────────────────────────────────────────────────
// Loads the full user document from DB when needed (e.g., profile update)
export const loadUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (!req.user) {
    next(new AppError('Authentication required', 401));
    return;
  }
  const user = await User.findById(req.user.userId);
  if (!user || !user.isActive) {
    sendResponse.unauthorized(res, 'User account not found or deactivated');
    return;
  }
  req.currentUser = user;
  next();
};
