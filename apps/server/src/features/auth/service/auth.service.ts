import crypto from 'crypto';
import { authRepository } from '../repository/auth.repository';
import { emailQueue } from '../../../queues/email.queue';
import { getRedisClient, redisKeys } from '../../../config/redis';
import {
  generateTokenPair,
  verifyRefreshToken,
  getExpiryDate,
} from '../../../shared/utils/jwt';
import { AppError } from '../../../shared/utils/asyncHandler';
import { env } from '../../../config/env';
import { RegisterInput, LoginInput } from '../validators/auth.validator';
import { IUserDocument } from '../../../models/User';
import { logger } from '../../../config/logger';

// ─── Auth Service ─────────────────────────────────────────────────────────────
// Service Layer: contains ALL business logic.
// Controllers are thin — they only parse request and call service methods.
// Interview: "Why separate service from controller?"
// → Reusability (WebSocket can call service directly)
// → Testability (test business logic without HTTP)
// → Single Responsibility Principle

export class AuthService {
  // ─── Register ───────────────────────────────────────────────────
  async register(data: RegisterInput): Promise<{ message: string }> {
    // Check duplicate email
    const existing = await authRepository.findByEmail(data.email);
    if (existing) {
      throw new AppError('Email already registered', 409);
    }

    const user = await authRepository.createUser(data);

    if (env.DEV_AUTO_VERIFY_EMAIL) {
      await authRepository.verifyEmail(user._id.toString());
      logger.warn(`DEV_AUTO_VERIFY_EMAIL=true: auto-verified ${user.email}`);
      return {
        message:
          'Registration successful. Development mode auto-verified this email, so you can log in now.',
      };
    }

    // Generate email verification token (stored in Redis with TTL)
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const redis = getRedisClient();
    await redis.setEx(
      redisKeys.emailVerification(verifyToken),
      24 * 60 * 60, // 24 hours
      user._id.toString()
    );

    // Queue welcome + verification email (non-blocking)
    await emailQueue.add('send-verification', {
      to: user.email,
      firstName: user.profile.firstName,
      verifyUrl: `${env.CLIENT_URL}/verify-email?token=${verifyToken}`,
    });

    logger.info(`New user registered: ${user.email}`);
    return { message: 'Registration successful. Please check your email to verify your account.' };
  }

  // ─── Login ───────────────────────────────────────────────────────
  async login(
    data: LoginInput,
    deviceInfo: { ip: string; userAgent: string; device: string }
  ): Promise<{ user: Partial<IUserDocument>; accessToken: string; refreshToken: string }> {
    // Always fetch password for comparison
    const user = await authRepository.findByEmail(data.email, true);
    if (!user) {
      // Use generic message to prevent user enumeration attacks
      throw new AppError('Invalid email or password', 401);
    }

    const isPasswordValid = await user.comparePassword(data.password);
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401);
    }

    if (!user.isEmailVerified) {
      throw new AppError('Please verify your email before logging in', 403);
    }

    if (!user.isActive) {
      throw new AppError('Your account has been deactivated. Contact support.', 403);
    }

    // Generate token pair
    const { accessToken, refreshToken, tokenId } = generateTokenPair({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    // Store refresh token in DB (max 5 sessions — enforce by removing oldest)
    const expiresAt = getExpiryDate(env.JWT_REFRESH_EXPIRES_IN);
    const newToken = {
      tokenId,
      token: refreshToken,
      device: deviceInfo.device,
      ip: deviceInfo.ip,
      userAgent: deviceInfo.userAgent,
      expiresAt,
      createdAt: new Date(),
    };

    // Keep only 5 most recent sessions
    const updatedTokens = [...user.refreshTokens, newToken].slice(-5);
    await authRepository.updateRefreshTokens(user._id.toString(), updatedTokens);
    await authRepository.updateLastSeen(user._id.toString());

    return {
      user: user.getPublicProfile(),
      accessToken,
      refreshToken,
    };
  }

  // ─── Refresh Token ───────────────────────────────────────────────
  // Implements Refresh Token Rotation:
  // Each refresh invalidates the old token and issues a new pair.
  // Prevents token theft — if a stolen refresh token is used after rotation,
  // the old one won't match → automatic session revocation.
  async refreshToken(
    token: string
  ): Promise<{ accessToken: string; refreshToken: string }> {
    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    const user = await authRepository.findById(payload.userId);
    if (!user) throw new AppError('User not found', 401);

    // Find matching token in DB
    const storedToken = user.refreshTokens.find(
      (t) => t.tokenId === payload.tokenId && t.token === token
    );
    if (!storedToken) {
      // Token reuse detected — revoke ALL sessions (possible token theft)
      logger.warn(`Refresh token reuse detected for user ${user._id}. Revoking all sessions.`);
      await authRepository.updateRefreshTokens(user._id.toString(), []);
      throw new AppError('Session invalidated due to suspicious activity. Please log in again.', 401);
    }

    // Issue new token pair (rotation)
    const { accessToken, refreshToken: newRefreshToken, tokenId } = generateTokenPair({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    // Replace old token with new one
    const updatedTokens = user.refreshTokens
      .filter((t) => t.tokenId !== payload.tokenId)
      .concat({
        tokenId,
        token: newRefreshToken,
        device: storedToken.device,
        ip: storedToken.ip,
        userAgent: storedToken.userAgent,
        expiresAt: getExpiryDate(env.JWT_REFRESH_EXPIRES_IN),
        createdAt: new Date(),
      });

    await authRepository.updateRefreshTokens(user._id.toString(), updatedTokens);

    return { accessToken, refreshToken: newRefreshToken };
  }

  // ─── Logout ──────────────────────────────────────────────────────
  async logout(userId: string, tokenId: string): Promise<void> {
    const user = await authRepository.findById(userId);
    if (!user) return;

    // Remove specific session token
    const updatedTokens = user.refreshTokens.filter((t) => t.tokenId !== tokenId);
    await authRepository.updateRefreshTokens(userId, updatedTokens);
  }

  // ─── Logout All Devices ──────────────────────────────────────────
  async logoutAll(userId: string): Promise<void> {
    await authRepository.updateRefreshTokens(userId, []);
  }

  // ─── Verify Email ────────────────────────────────────────────────
  async verifyEmail(token: string): Promise<void> {
    const redis = getRedisClient();
    const userId = await redis.get(redisKeys.emailVerification(token));
    if (!userId) {
      throw new AppError('Invalid or expired verification token', 400);
    }

    await authRepository.verifyEmail(userId);
    await redis.del(redisKeys.emailVerification(token));

    // Send welcome email
    const user = await authRepository.findById(userId);
    if (user) {
      await emailQueue.add('send-welcome', {
        to: user.email,
        firstName: user.profile.firstName,
      });
    }
  }

  // ─── Forgot Password ─────────────────────────────────────────────
  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await authRepository.findByEmail(email);
    // Always return success to prevent email enumeration
    if (!user) {
      return { message: 'If an account exists, a password reset email has been sent.' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const redis = getRedisClient();

    // Store in Redis with 1-hour TTL
    await redis.setEx(
      redisKeys.passwordReset(resetToken),
      60 * 60,
      user._id.toString()
    );

    await emailQueue.add('send-password-reset', {
      to: user.email,
      firstName: user.profile.firstName,
      resetUrl: `${env.CLIENT_URL}/reset-password?token=${resetToken}`,
    });

    return { message: 'If an account exists, a password reset email has been sent.' };
  }

  // ─── Reset Password ──────────────────────────────────────────────
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const redis = getRedisClient();
    const userId = await redis.get(redisKeys.passwordReset(token));
    if (!userId) {
      throw new AppError('Invalid or expired reset token', 400);
    }

    // Hash password via bcrypt (done in User model pre-save)
    const user = await authRepository.findById(userId, true);
    if (!user) throw new AppError('User not found', 404);

    user.password = newPassword; // Model pre-save will hash it
    await user.save();

    // Invalidate token + revoke all sessions for security
    await redis.del(redisKeys.passwordReset(token));
    await authRepository.updateRefreshTokens(userId, []);
  }

  // ─── Google OAuth ─────────────────────────────────────────────────
  async googleOAuth(googleProfile: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  }): Promise<{ user: Partial<IUserDocument>; accessToken: string; refreshToken: string }> {
    let user = await authRepository.findByGoogleId(googleProfile.id);

    if (!user) {
      // Check if email already registered → link account
      user = await authRepository.findByEmail(googleProfile.email);
      if (user) {
        await authRepository.linkGoogleAccount(user._id.toString(), googleProfile.id);
        user.googleId = googleProfile.id;
      } else {
        // Create new user via Google
        user = await authRepository.createUser({
          email: googleProfile.email,
          firstName: googleProfile.firstName,
          lastName: googleProfile.lastName,
          password: crypto.randomBytes(32).toString('hex'), // Random password
          role: 'user',
        });
        user.googleId = googleProfile.id;
        user.isEmailVerified = true; // Google-verified email
        if (googleProfile.avatar) user.profile.avatar = googleProfile.avatar;
        await user.save();
      }
    }

    const { accessToken, refreshToken, tokenId } = generateTokenPair({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    const updatedTokens = [
      ...user.refreshTokens,
      {
        tokenId,
        token: refreshToken,
        device: 'google-oauth',
        ip: '',
        userAgent: 'Google OAuth',
        expiresAt: getExpiryDate(env.JWT_REFRESH_EXPIRES_IN),
        createdAt: new Date(),
      },
    ].slice(-5);

    await authRepository.updateRefreshTokens(user._id.toString(), updatedTokens);

    return { user: user.getPublicProfile(), accessToken, refreshToken };
  }

  // ─── Get Me ──────────────────────────────────────────────────────
  async getMe(userId: string): Promise<Partial<IUserDocument>> {
    const user = await authRepository.findById(userId);
    if (!user) throw new AppError('User not found', 404);
    return user.getPublicProfile();
  }
}

export const authService = new AuthService();
