import { Request, Response } from 'express';
import { authService } from '../service/auth.service';
import { sendResponse } from '../../../shared/utils/response';
import { asyncHandler } from '../../../shared/utils/asyncHandler';
import { env } from '../../../config/env';
import { verifyRefreshToken } from '../../../shared/utils/jwt';

// ─── Auth Controller ──────────────────────────────────────────────────────────
// Controllers are deliberately thin — they only:
//   1. Extract data from request
//   2. Call service methods
//   3. Format and send response
// ALL business logic lives in the service layer.

export class AuthController {
  // POST /api/v1/auth/register
  register = asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.register(req.body);
    sendResponse.created(res, result, result.message);
  });

  // POST /api/v1/auth/login
  login = asyncHandler(async (req: Request, res: Response) => {
    const deviceInfo = {
      ip: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      device: parseDevice(req.headers['user-agent'] || ''),
    };

    const { user, accessToken, refreshToken } = await authService.login(req.body, deviceInfo);

    // Set refresh token in HttpOnly cookie (prevents XSS access)
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: env.isProduction,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/api/v1/auth', // Only sent to auth routes
    });

    sendResponse.success(res, { user, accessToken }, 'Login successful');
  });

  // POST /api/v1/auth/refresh-token
  refreshToken = asyncHandler(async (req: Request, res: Response) => {
    // Accept token from cookie (preferred) or body (mobile fallback)
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!token) {
      sendResponse.unauthorized(res, 'Refresh token not provided');
      return;
    }

    const { accessToken, refreshToken: newRefreshToken } = await authService.refreshToken(token);

    // Rotate cookie
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: env.isProduction,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/v1/auth',
    });

    sendResponse.success(res, { accessToken }, 'Token refreshed');
  });

  // POST /api/v1/auth/logout
  logout = asyncHandler(async (req: Request, res: Response) => {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (token && req.user) {
      try {
        const payload = verifyRefreshToken(token);
        await authService.logout(req.user.userId, payload.tokenId);
      } catch {
        // Token may already be invalid — still clear cookie
      }
    }

    res.clearCookie('refreshToken', { path: '/api/v1/auth' });
    sendResponse.success(res, null, 'Logged out successfully');
  });

  // POST /api/v1/auth/logout-all
  logoutAll = asyncHandler(async (req: Request, res: Response) => {
    await authService.logoutAll(req.user!.userId);
    res.clearCookie('refreshToken', { path: '/api/v1/auth' });
    sendResponse.success(res, null, 'Logged out from all devices');
  });

  // GET /api/v1/auth/verify-email/:token
  verifyEmail = asyncHandler(async (req: Request, res: Response) => {
    await authService.verifyEmail(req.params.token);
    sendResponse.success(res, null, 'Email verified successfully. You can now log in.');
  });

  // POST /api/v1/auth/forgot-password
  forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.forgotPassword(req.body.email);
    sendResponse.success(res, null, result.message);
  });

  // POST /api/v1/auth/reset-password/:token
  resetPassword = asyncHandler(async (req: Request, res: Response) => {
    await authService.resetPassword(req.params.token, req.body.password);
    sendResponse.success(res, null, 'Password reset successful. Please log in with your new password.');
  });

  // GET /api/v1/auth/me
  getMe = asyncHandler(async (req: Request, res: Response) => {
    const user = await authService.getMe(req.user!.userId);
    sendResponse.success(res, { user }, 'User profile retrieved');
  });
}

// ─── Device Parser Helper ─────────────────────────────────────────────────────
function parseDevice(userAgent: string): string {
  if (/mobile/i.test(userAgent)) return 'Mobile';
  if (/tablet/i.test(userAgent)) return 'Tablet';
  if (/windows/i.test(userAgent)) return 'Windows PC';
  if (/macintosh/i.test(userAgent)) return 'Mac';
  if (/linux/i.test(userAgent)) return 'Linux';
  return 'Unknown';
}

export const authController = new AuthController();
