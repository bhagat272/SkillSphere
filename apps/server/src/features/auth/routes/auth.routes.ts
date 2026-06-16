import { Router } from 'express';
import { authController } from '../controller/auth.controller';
import { authenticate } from '../../../shared/middleware/auth.middleware';
import { validate } from '../../../shared/middleware/validate.middleware';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validators/auth.validator';
import {
  authRateLimiter,
  passwordResetRateLimiter,
} from '../../../shared/middleware/rateLimit.middleware';

const router = Router();

// ─── Public Routes ────────────────────────────────────────────────────────────
router.post('/register', authRateLimiter, validate(registerSchema), authController.register);
router.post('/login', authRateLimiter, validate(loginSchema), authController.login);
router.post('/refresh-token', authController.refreshToken);
router.get('/verify-email/:token', authController.verifyEmail);
router.post(
  '/forgot-password',
  passwordResetRateLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword
);
router.post('/reset-password/:token', validate(resetPasswordSchema), authController.resetPassword);

// ─── Protected Routes ─────────────────────────────────────────────────────────
router.use(authenticate);
router.get('/me', authController.getMe);
router.post('/logout', authController.logout);
router.post('/logout-all', authController.logoutAll);

export default router;
