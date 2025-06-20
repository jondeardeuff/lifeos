import { ApiResponse } from './common';
import { User } from './user';

/**
 * Authentication related types
 */

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  tokenType: 'Bearer';
}

export interface AuthSession {
  user: User;
  tokens: AuthTokens;
  sessionId: string;
  createdAt: Date;
  lastAccessedAt: Date;
  expiresAt: Date;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  timezone?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  timezone: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  roles: string[];
  settings: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface PasswordResetRequest {
  email: string;
  callbackUrl?: string;
}

export interface PasswordResetConfirm {
  token: string;
  password: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface EmailVerificationRequest {
  email: string;
  callbackUrl?: string;
}

export interface EmailVerificationConfirm {
  token: string;
}

export interface PhoneVerificationRequest {
  phone: string;
}

export interface PhoneVerificationConfirm {
  phone: string;
  code: string;
}

export interface AuthError {
  code: string;
  message: string;
  field?: string;
}

/**
 * JWT Token payload structure
 */
export interface JWTPayload {
  sub: string; // User ID
  email: string;
  roles: string[];
  sessionId: string;
  iat: number; // Issued at
  exp: number; // Expires at
  iss: string; // Issuer
  aud: string; // Audience
}

/**
 * JWT Refresh Token payload structure
 */
export interface JWTRefreshPayload {
  sub: string; // User ID
  sessionId: string;
  tokenFamily: string; // For token rotation security
  iat: number; // Issued at
  exp: number; // Expires at
  iss: string; // Issuer
  aud: string; // Audience
}

/**
 * Authentication context for middleware
 */
export interface AuthContext {
  user: AuthUser;
  sessionId: string;
  roles: string[];
  isAuthenticated: true;
}

export interface UnauthenticatedContext {
  isAuthenticated: false;
}

export type RequestAuthContext = AuthContext | UnauthenticatedContext;

/**
 * API Response types for authentication endpoints
 */
export type LoginResponse = ApiResponse<{
  user: AuthUser;
  tokens: AuthTokens;
  session: AuthSession;
}>;

export type RegisterResponse = ApiResponse<{
  user: AuthUser;
  requiresEmailVerification: boolean;
}>;

export type RefreshTokenResponse = ApiResponse<{
  tokens: AuthTokens;
}>;

export type LogoutResponse = ApiResponse<{
  success: boolean;
}>;

export type PasswordResetResponse = ApiResponse<{
  success: boolean;
  message: string;
}>;

export type EmailVerificationResponse = ApiResponse<{
  success: boolean;
  message: string;
}>;

export type ProfileResponse = ApiResponse<{
  user: AuthUser;
}>;

/**
 * Session storage interface for different storage backends
 */
export interface SessionStorage {
  set(sessionId: string, session: AuthSession): Promise<void>;
  get(sessionId: string): Promise<AuthSession | null>;
  delete(sessionId: string): Promise<void>;
  deleteByUserId(userId: string): Promise<void>;
  extend(sessionId: string, expiresAt: Date): Promise<void>;
  cleanup(): Promise<void>; // Remove expired sessions
}

/**
 * Refresh token storage interface
 */
export interface RefreshTokenStorage {
  set(tokenFamily: string, token: string, userId: string, expiresAt: Date): Promise<void>;
  get(tokenFamily: string): Promise<{
    token: string;
    userId: string;
    expiresAt: Date;
  } | null>;
  delete(tokenFamily: string): Promise<void>;
  deleteByUserId(userId: string): Promise<void>;
  cleanup(): Promise<void>; // Remove expired tokens
}

/**
 * Password requirements configuration
 */
export interface PasswordRequirements {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  forbidCommonPasswords: boolean;
}

/**
 * Authentication configuration
 */
export interface AuthConfig {
  jwt: {
    secret: string;
    accessTokenExpiresIn: string; // e.g., '15m'
    refreshTokenExpiresIn: string; // e.g., '7d'
    issuer: string;
    audience: string;
  };
  session: {
    maxAge: number; // in milliseconds
    extendOnUse: boolean;
  };
  passwords: PasswordRequirements;
  registration: {
    requireEmailVerification: boolean;
    allowedDomains?: string[];
    blockedDomains?: string[];
  };
  rateLimit: {
    login: {
      windowMs: number;
      maxAttempts: number;
    };
    registration: {
      windowMs: number;
      maxAttempts: number;
    };
    passwordReset: {
      windowMs: number;
      maxAttempts: number;
    };
  };
}