const jwt = require('jsonwebtoken');
const { prisma } = require('../../prisma-client');
const { verifyToken } = require('../../auth');
// Use mock service until Prisma is properly generated
// const ApiKeyService = require('../services/apiKeyService');
const ApiKeyService = require('../services/apiKeyServiceMock');

/**
 * Authentication context
 * @typedef {Object} AuthContext
 * @property {Object} user - User object (for JWT auth)
 * @property {Object} apiKey - API key object (for API key auth)
 * @property {string[]} permissions - User/API key permissions
 * @property {Object} rateLimit - Rate limit configuration
 * @property {string} authType - Type of authentication used
 */

class AuthenticationMiddleware {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET;
    this.apiKeyService = new ApiKeyService();
  }

  /**
   * Authenticate using JWT token
   * @param {string} token - JWT token
   * @returns {Promise<AuthContext>}
   */
  async authenticateJWT(token) {
    try {
      const decoded = verifyToken(token);
      if (!decoded || !decoded.userId) {
        throw new Error('Invalid token payload');
      }
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          createdAt: true
        }
      });
      
      if (!user) {
        throw new Error('User not found');
      }
      
      return {
        user,
        permissions: await this.getUserPermissions(user.id),
        rateLimit: this.getRateLimitForUser(user),
        authType: 'jwt'
      };
    } catch (error) {
      throw new Error(`JWT authentication failed: ${error.message}`);
    }
  }

  /**
   * Authenticate using API key
   * @param {string} apiKey - API key string
   * @returns {Promise<AuthContext>}
   */
  async authenticateApiKey(apiKey) {
    try {
      const keyData = await this.apiKeyService.validateApiKey(apiKey);
      
      if (!keyData || !keyData.isActive) {
        throw new Error('Invalid or inactive API key');
      }
      
      // Update last used timestamp (fire and forget)
      this.apiKeyService.updateLastUsed(keyData.id).catch(err => {
        console.error('Failed to update API key last used:', err);
      });
      
      // Get user data
      const user = await prisma.user.findUnique({
        where: { id: keyData.userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          createdAt: true
        }
      });
      
      return {
        user,
        apiKey: keyData,
        permissions: keyData.permissions || [],
        rateLimit: this.apiKeyService.getRateLimitForApiKey(keyData),
        authType: 'api_key'
      };
    } catch (error) {
      throw new Error(`API key authentication failed: ${error.message}`);
    }
  }

  /**
   * Get user permissions (placeholder for future role-based system)
   * @param {string} userId - User ID
   * @returns {Promise<string[]>}
   */
  async getUserPermissions(userId) {
    // For now, return basic permissions for all authenticated users
    // This can be expanded with a role-based permission system
    return [
      'tasks:read',
      'tasks:write',
      'tasks:delete',
      'profile:read',
      'profile:write'
    ];
  }

  /**
   * Get rate limit configuration for a user
   * @param {Object} user - User object
   * @returns {Object}
   */
  getRateLimitForUser(user) {
    // Default rate limits for JWT authenticated users
    return {
      tier: 'standard',
      limits: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 200
      }
    };
  }

  /**
   * Check if path is public (doesn't require authentication)
   * @param {string} path - Request path
   * @returns {boolean}
   */
  isPublicEndpoint(path) {
    const publicPaths = [
      '/health',
      '/api-docs',
      '/api-docs.json',
      '/favicon.ico'
    ];
    
    const publicPatterns = [
      /^\/api-docs/, // Swagger UI assets
      /^\/graphql$/ // GraphQL introspection (handled separately)
    ];
    
    return publicPaths.includes(path) || 
           publicPatterns.some(pattern => pattern.test(path));
  }

  /**
   * Get public authentication context
   * @returns {AuthContext}
   */
  getPublicAuthContext() {
    return {
      user: null,
      apiKey: null,
      permissions: ['public:read'],
      rateLimit: {
        tier: 'public',
        limits: {
          windowMs: 60 * 1000, // 1 minute
          maxRequests: 50
        }
      },
      authType: 'public'
    };
  }

  /**
   * Express middleware for authentication
   * @returns {function} Express middleware
   */
  middleware() {
    return async (req, res, next) => {
      try {
        let authContext = null;
        
        // Check for JWT token in Authorization header
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          try {
            authContext = await this.authenticateJWT(token);
          } catch (error) {
            console.log('JWT authentication failed:', error.message);
            // Continue to check for API key
          }
        }
        
        // Check for API key in X-API-Key header
        if (!authContext && req.headers['x-api-key']) {
          const apiKey = req.headers['x-api-key'];
          try {
            authContext = await this.authenticateApiKey(apiKey);
          } catch (error) {
            console.log('API key authentication failed:', error.message);
            // Continue to check if it's a public endpoint
          }
        }
        
        // Check if it's a public endpoint
        if (!authContext && this.isPublicEndpoint(req.path)) {
          authContext = this.getPublicAuthContext();
        }
        
        // For GraphQL, we'll handle authentication in the context function
        if (!authContext && req.path === '/graphql') {
          authContext = this.getPublicAuthContext();
        }
        
        if (!authContext) {
          return res.status(401).json({
            error: 'Unauthorized',
            message: 'Authentication required. Provide a valid JWT token in Authorization header or API key in X-API-Key header.',
            code: 'AUTHENTICATION_REQUIRED'
          });
        }
        
        // Add auth context to request
        req.authContext = authContext;
        
        // Add user ID for backward compatibility
        req.userId = authContext.user?.id || null;
        
        next();
      } catch (error) {
        console.error('Authentication middleware error:', error);
        res.status(500).json({
          error: 'Internal Server Error',
          message: 'Authentication service temporarily unavailable',
          code: 'AUTHENTICATION_ERROR'
        });
      }
    };
  }

  /**
   * Middleware to require specific permissions
   * @param {string|string[]} requiredPermissions - Required permission(s)
   * @returns {function} Express middleware
   */
  requirePermissions(requiredPermissions) {
    const permissions = Array.isArray(requiredPermissions) 
      ? requiredPermissions 
      : [requiredPermissions];
    
    return (req, res, next) => {
      const authContext = req.authContext;
      
      if (!authContext || !authContext.user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED'
        });
      }
      
      // Check if user has any of the required permissions
      const hasPermission = permissions.some(permission => 
        authContext.permissions.includes(permission) ||
        authContext.permissions.includes('*') // wildcard permission
      );
      
      if (!hasPermission) {
        return res.status(403).json({
          error: 'Forbidden',
          message: `Insufficient permissions. Required: ${permissions.join(' or ')}`,
          code: 'INSUFFICIENT_PERMISSIONS',
          required: permissions,
          current: authContext.permissions
        });
      }
      
      next();
    };
  }

  /**
   * Middleware to require authentication (but not specific permissions)
   * @returns {function} Express middleware
   */
  requireAuth() {
    return (req, res, next) => {
      const authContext = req.authContext;
      
      if (!authContext || !authContext.user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED'
        });
      }
      
      next();
    };
  }
}

module.exports = AuthenticationMiddleware;