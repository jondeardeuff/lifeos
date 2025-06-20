import { AuthConfig } from '@lifeos/types';

export const authConfig: AuthConfig = {
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    accessTokenExpiresIn: '15m',
    refreshTokenExpiresIn: '7d',
    issuer: 'lifeos-api',
    audience: 'lifeos-client',
  },
  session: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    extendOnUse: true,
  },
  passwords: {
    minLength: 8,
    requireUppercase: false,
    requireLowercase: false,
    requireNumbers: false,
    requireSpecialChars: false,
    forbidCommonPasswords: false,
  },
  registration: {
    requireEmailVerification: false,
    allowedDomains: undefined,
    blockedDomains: undefined,
  },
  rateLimit: {
    login: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxAttempts: 5,
    },
    registration: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxAttempts: 3,
    },
    passwordReset: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxAttempts: 3,
    },
  },
};