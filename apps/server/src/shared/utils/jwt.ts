import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../../config/env';

// ─── JWT Token Utilities ──────────────────────────────────────────────────────
// Access tokens: short-lived (15m), stored in memory on client
// Refresh tokens: long-lived (7d), stored in HttpOnly cookie + DB
// tokenId (jti claim): uniquely identifies each refresh token for rotation

export interface AccessTokenPayload {
  userId: string;
  email: string;
  role: string;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenId: string; // JWT ID (jti) — used to identify token in DB
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  tokenId: string;
}

export const generateAccessToken = (payload: AccessTokenPayload): string => {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn'],
    algorithm: 'HS256',
    issuer: 'skillsphere-api',
    audience: 'skillsphere-client',
  });
};

export const generateRefreshToken = (userId: string): { token: string; tokenId: string } => {
  const tokenId = uuidv4();
  const token = jwt.sign(
    { userId, tokenId } as RefreshTokenPayload,
    env.JWT_REFRESH_SECRET,
    {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'],
      algorithm: 'HS256',
      jwtid: tokenId,
    }
  );
  return { token, tokenId };
};

export const generateTokenPair = (payload: AccessTokenPayload): TokenPair => {
  const accessToken = generateAccessToken(payload);
  const { token: refreshToken, tokenId } = generateRefreshToken(payload.userId);
  return { accessToken, refreshToken, tokenId };
};

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, {
    issuer: 'skillsphere-api',
    audience: 'skillsphere-client',
  }) as AccessTokenPayload;
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
};

// Decode without verification (used for extracting userId from expired tokens)
export const decodeToken = (token: string): jwt.JwtPayload | null => {
  const decoded = jwt.decode(token);
  return decoded as jwt.JwtPayload | null;
};

// Calculate expiry date from duration string (e.g., "7d" → Date)
export const getExpiryDate = (duration: string): Date => {
  const units: Record<string, number> = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) throw new Error(`Invalid duration format: ${duration}`);
  return new Date(Date.now() + parseInt(match[1]) * units[match[2]]);
};
