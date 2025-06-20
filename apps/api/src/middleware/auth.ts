import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { 
  RequestAuthContext, 
  AuthContext, 
  UnauthenticatedContext,
  AuthConfig,
  SessionStorage 
} from '@lifeos/types';
import { 
  verifyAccessToken, 
  extractTokenFromHeader, 
  JWTError, 
  isTokenNearExpiry 
} from '../utils/jwt.js';

/**
 * Authentication middleware for Fastify
 */

export interface AuthMiddlewareOptions {
  config: AuthConfig;
  sessionStorage: SessionStorage;
  userRepository: any; // Replace with actual user repository type
  optional?: boolean; // If true, doesn't throw error when no auth provided
}

/**
 * Declare module to extend Fastify request with auth context
 */
declare module 'fastify' {
  interface FastifyRequest {
    auth: RequestAuthContext;
  }
}

/**
 * Authentication middleware plugin for Fastify
 */
export async function authMiddleware(
  fastify: FastifyInstance,
  options: AuthMiddlewareOptions
): Promise<void> {
  const { config, sessionStorage, userRepository, optional = false } = options;

  fastify.decorateRequest('auth', null);

  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authHeader = request.headers.authorization;
      const token = extractTokenFromHeader(authHeader);

      if (!token) {
        if (optional) {
          request.auth = { isAuthenticated: false } as UnauthenticatedContext;
          return;
        }
        
        throw new AuthenticationMiddlewareError('Missing authorization token', 'MISSING_TOKEN');
      }

      // Verify JWT token
      const payload = verifyAccessToken(token, config.jwt.secret);

      // Get session to verify it's still valid
      const session = await sessionStorage.get(payload.sessionId);
      if (!session) {
        throw new AuthenticationMiddlewareError('Session not found or expired', 'SESSION_EXPIRED');
      }

      // Check if session is expired
      if (session.expiresAt < new Date()) {
        await sessionStorage.delete(payload.sessionId);
        throw new AuthenticationMiddlewareError('Session expired', 'SESSION_EXPIRED');
      }

      // Get fresh user data to ensure user is still active
      const user = await userRepository.findById(payload.sub);
      if (!user) {
        throw new AuthenticationMiddlewareError('User not found', 'USER_NOT_FOUND');
      }

      if (user.deletedAt) {
        throw new AuthenticationMiddlewareError('User account is deactivated', 'USER_DEACTIVATED');
      }

      // Update last accessed time if session extension is enabled
      if (config.session.extendOnUse) {
        session.lastAccessedAt = new Date();
        await sessionStorage.set(payload.sessionId, session);
      }

      // Check if token is near expiry and log warning
      if (isTokenNearExpiry(payload.exp)) {
        fastify.log.info({ userId: payload.sub, sessionId: payload.sessionId }, 'Access token near expiry');
      }

      // Create auth context
      const authContext: AuthContext = {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          avatarUrl: user.avatarUrl,
          timezone: user.timezone || 'UTC',
          emailVerified: user.emailVerified || false,
          phoneVerified: user.phoneVerified || false,
          roles: payload.roles,
          settings: user.settings || {},
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        sessionId: payload.sessionId,
        roles: payload.roles,
        isAuthenticated: true,
      };

      request.auth = authContext;

    } catch (error) {
      if (error instanceof JWTError) {
        throw new AuthenticationMiddlewareError(error.message, error.code);
      }
      
      if (error instanceof AuthenticationMiddlewareError) {
        throw error;
      }

      fastify.log.error(error, 'Authentication middleware error');
      throw new AuthenticationMiddlewareError('Authentication failed', 'AUTH_ERROR');
    }
  });

  // Error handler for authentication errors
  fastify.setErrorHandler(async (error, request, reply) => {
    if (error instanceof AuthenticationMiddlewareError) {
      reply.status(401).send({
        error: {
          code: error.code,
          message: error.message,
        },
      });
      return;
    }

    // Re-throw other errors to be handled by global error handler
    throw error;
  });
}

/**
 * Authentication middleware error class
 */
export class AuthenticationMiddlewareError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'AuthenticationMiddlewareError';
  }
}

/**
 * Helper function to check if user has required role
 */
export function requireRole(role: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.auth.isAuthenticated) {
      throw new AuthenticationMiddlewareError('Authentication required', 'UNAUTHORIZED');
    }

    if (!request.auth.roles.includes(role)) {
      throw new AuthenticationMiddlewareError('Insufficient permissions', 'FORBIDDEN');
    }
  };
}

/**
 * Helper function to check if user has any of the required roles
 */
export function requireAnyRole(roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.auth.isAuthenticated) {
      throw new AuthenticationMiddlewareError('Authentication required', 'UNAUTHORIZED');
    }

    const hasRole = request.auth.isAuthenticated && roles.some(role => request.auth.roles.includes(role));
    if (!hasRole) {
      throw new AuthenticationMiddlewareError('Insufficient permissions', 'FORBIDDEN');
    }
  };
}

/**
 * Helper function to check if user has all required roles
 */
export function requireAllRoles(roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.auth.isAuthenticated) {
      throw new AuthenticationMiddlewareError('Authentication required', 'UNAUTHORIZED');
    }

    const hasAllRoles = request.auth.isAuthenticated && roles.every(role => request.auth.roles.includes(role));
    if (!hasAllRoles) {
      throw new AuthenticationMiddlewareError('Insufficient permissions', 'FORBIDDEN');
    }
  };
}

/**
 * Helper function to check if user owns the resource
 */
export function requireOwnership(getUserIdFromParams: (request: FastifyRequest) => string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.auth.isAuthenticated) {
      throw new AuthenticationMiddlewareError('Authentication required', 'UNAUTHORIZED');
    }

    const resourceUserId = getUserIdFromParams(request);
    const currentUserId = request.auth.user.id;

    if (resourceUserId !== currentUserId) {
      // Check if user has admin role as fallback
      if (!request.auth.roles.includes('admin')) {
        throw new AuthenticationMiddlewareError('Access denied', 'FORBIDDEN');
      }
    }
  };
}

/**
 * Optional authentication middleware - doesn't throw error if no auth provided
 */
export async function optionalAuthMiddleware(
  fastify: FastifyInstance,
  options: Omit<AuthMiddlewareOptions, 'optional'>
): Promise<void> {
  return authMiddleware(fastify, { ...options, optional: true });
}

/**
 * Rate limiting helpers for authentication endpoints
 */
export const authRateLimitConfig = {
  login: {
    max: 5, // 5 attempts
    timeWindow: '15 minutes',
    keyGenerator: (request: FastifyRequest) => request.ip,
  },
  register: {
    max: 3, // 3 attempts
    timeWindow: '60 minutes',
    keyGenerator: (request: FastifyRequest) => request.ip,
  },
  passwordReset: {
    max: 3, // 3 attempts
    timeWindow: '60 minutes',
    keyGenerator: (request: FastifyRequest) => request.ip,
  },
  refreshToken: {
    max: 10, // 10 attempts
    timeWindow: '15 minutes',
    keyGenerator: (request: FastifyRequest) => request.ip,
  },
};

/**
 * Type guard to check if auth context is authenticated
 */
export function isAuthenticated(auth: RequestAuthContext): auth is AuthContext {
  return auth.isAuthenticated === true;
}

/**
 * Helper to get current user ID from authenticated request
 */
export function getCurrentUserId(request: FastifyRequest): string {
  if (!isAuthenticated(request.auth)) {
    throw new AuthenticationMiddlewareError('Authentication required', 'UNAUTHORIZED');
  }
  return request.auth.user.id;
}

/**
 * Helper to get current user from authenticated request
 */
export function getCurrentUser(request: FastifyRequest) {
  if (!isAuthenticated(request.auth)) {
    throw new AuthenticationMiddlewareError('Authentication required', 'UNAUTHORIZED');
  }
  return request.auth.user;
}