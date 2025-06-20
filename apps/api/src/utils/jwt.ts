import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { JWTPayload, JWTRefreshPayload, AuthTokens, AuthConfig } from '@lifeos/types';

/**
 * JWT Token utilities for authentication
 */

export class JWTError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'JWTError';
  }
}

export interface TokenGenerationOptions {
  userId: string;
  email: string;
  roles: string[];
  sessionId: string;
  config: AuthConfig['jwt'];
}

/**
 * Generates access and refresh tokens for a user
 */
export function generateTokens(options: TokenGenerationOptions): AuthTokens {
  const { userId, email, roles, sessionId, config } = options;
  const now = Date.now();
  const tokenFamily = generateTokenFamily();

  // Access token payload
  const accessPayload: JWTPayload = {
    sub: userId,
    email,
    roles,
    sessionId,
    iat: Math.floor(now / 1000),
    exp: Math.floor((now + parseTimeToMs(config.accessTokenExpiresIn)) / 1000),
    iss: config.issuer,
    aud: config.audience,
  };

  // Refresh token payload
  const refreshPayload: JWTRefreshPayload = {
    sub: userId,
    sessionId,
    tokenFamily,
    iat: Math.floor(now / 1000),
    exp: Math.floor((now + parseTimeToMs(config.refreshTokenExpiresIn)) / 1000),
    iss: config.issuer,
    aud: config.audience,
  };

  // Generate tokens
  const accessToken = jwt.sign(accessPayload, config.secret, { algorithm: 'HS256' });
  const refreshToken = jwt.sign(refreshPayload, config.secret, { algorithm: 'HS256' });

  return {
    accessToken,
    refreshToken,
    expiresAt: new Date(now + parseTimeToMs(config.accessTokenExpiresIn)),
    tokenType: 'Bearer',
  };
}

/**
 * Verifies and decodes an access token
 */
export function verifyAccessToken(token: string, secret: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] }) as JWTPayload;
    
    // Validate required fields
    if (!decoded.sub || !decoded.email || !decoded.sessionId) {
      throw new JWTError('Invalid token payload', 'INVALID_PAYLOAD');
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new JWTError('Invalid token', 'INVALID_TOKEN');
    }
    if (error instanceof jwt.TokenExpiredError) {
      throw new JWTError('Token expired', 'TOKEN_EXPIRED');
    }
    if (error instanceof jwt.NotBeforeError) {
      throw new JWTError('Token not active', 'TOKEN_NOT_ACTIVE');
    }
    throw error;
  }
}

/**
 * Verifies and decodes a refresh token
 */
export function verifyRefreshToken(token: string, secret: string): JWTRefreshPayload {
  try {
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] }) as JWTRefreshPayload;
    
    // Validate required fields
    if (!decoded.sub || !decoded.sessionId || !decoded.tokenFamily) {
      throw new JWTError('Invalid refresh token payload', 'INVALID_PAYLOAD');
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new JWTError('Invalid refresh token', 'INVALID_TOKEN');
    }
    if (error instanceof jwt.TokenExpiredError) {
      throw new JWTError('Refresh token expired', 'TOKEN_EXPIRED');
    }
    if (error instanceof jwt.NotBeforeError) {
      throw new JWTError('Refresh token not active', 'TOKEN_NOT_ACTIVE');
    }
    throw error;
  }
}

/**
 * Extracts token from Authorization header
 */
export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Generates a random token family ID for refresh token rotation
 */
export function generateTokenFamily(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Generates a secure session ID
 */
export function generateSessionId(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Parses time string to milliseconds
 * Supports: s (seconds), m (minutes), h (hours), d (days)
 */
export function parseTimeToMs(timeStr: string): number {
  const match = timeStr.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(`Invalid time format: ${timeStr}`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    default:
      throw new Error(`Invalid time unit: ${unit}`);
  }
}

/**
 * Checks if a token is close to expiry (within 5 minutes)
 */
export function isTokenNearExpiry(exp: number): boolean {
  const now = Math.floor(Date.now() / 1000);
  const fiveMinutes = 5 * 60;
  return (exp - now) <= fiveMinutes;
}

/**
 * Decodes token without verification (for debugging/logging)
 */
export function decodeTokenUnsafe(token: string): any {
  return jwt.decode(token);
}

/**
 * Token refresh rotation helper
 * Returns new tokens with a new token family
 */
export function rotateRefreshToken(
  oldRefreshPayload: JWTRefreshPayload,
  userInfo: Pick<TokenGenerationOptions, 'email' | 'roles'>,
  config: AuthConfig['jwt']
): AuthTokens {
  return generateTokens({
    userId: oldRefreshPayload.sub,
    email: userInfo.email,
    roles: userInfo.roles,
    sessionId: oldRefreshPayload.sessionId,
    config,
  });
}