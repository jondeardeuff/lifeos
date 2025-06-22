const crypto = require('crypto');

/**
 * CSRF Protection Service
 * Provides Cross-Site Request Forgery protection for state-changing operations
 */
class CSRFProtection {
  constructor(config = {}) {
    this.config = {
      secretLength: 32,
      tokenLength: 32,
      cookieName: '_csrf',
      headerName: 'x-csrf-token',
      sessionKey: 'csrfSecret',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 1000 * 60 * 60, // 1 hour
      ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
      ...config
    };
    
    // Track tokens to prevent replay attacks
    this.usedTokens = new Set();
    this.tokenCleanupInterval = setInterval(() => {
      this.cleanupTokens();
    }, 5 * 60 * 1000); // Cleanup every 5 minutes
  }
  
  /**
   * Generate CSRF token
   * @param {string} secret - Optional existing secret
   * @returns {Object} Object containing secret and token
   */
  generateToken(secret) {
    const csrfSecret = secret || crypto.randomBytes(this.config.secretLength).toString('hex');
    const salt = crypto.randomBytes(this.config.tokenLength).toString('hex');
    const timestamp = Date.now().toString(36);
    
    const token = this.hashToken(salt + timestamp, csrfSecret);
    
    return {
      secret: csrfSecret,
      token: `${salt}:${timestamp}:${token}`
    };
  }
  
  /**
   * Validate CSRF token
   * @param {string} token - Token to validate
   * @param {string} secret - Secret to validate against
   * @returns {boolean} True if token is valid
   */
  validateToken(token, secret) {
    if (!token || !secret) {
      return false;
    }
    
    try {
      const [salt, timestamp, hash] = token.split(':');
      if (!salt || !timestamp || !hash) {
        return false;
      }
      
      // Check token age (prevent old token reuse)
      const tokenTime = parseInt(timestamp, 36);
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours max age
      if (Date.now() - tokenTime > maxAge) {
        return false;
      }
      
      // Check if token was already used (prevent replay attacks)
      if (this.usedTokens.has(token)) {
        return false;
      }
      
      // Validate token hash
      const expectedHash = this.hashToken(salt + timestamp, secret);
      const isValid = crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expectedHash));
      
      if (isValid) {
        // Mark token as used
        this.usedTokens.add(token);
      }
      
      return isValid;
    } catch (error) {
      console.error('CSRF token validation error:', error);
      return false;
    }
  }
  
  /**
   * Express middleware for CSRF protection
   * @returns {Function} Express middleware function
   */
  middleware() {
    return (req, res, next) => {
      try {
        // Skip CSRF for certain conditions
        if (this.shouldSkipCSRF(req)) {
          return next();
        }
        
        // Get or create CSRF secret
        let secret = this.getSecretFromSession(req);
        if (!secret) {
          secret = crypto.randomBytes(this.config.secretLength).toString('hex');
          this.setSecretInSession(req, secret);
        }
        
        // Handle safe methods (provide token)
        if (this.config.ignoreMethods.includes(req.method)) {
          const { token } = this.generateToken(secret);
          
          // Set token in cookie for client access
          res.cookie(this.config.cookieName, token, {
            httpOnly: false, // Allow JavaScript access for AJAX
            secure: this.config.secure,
            sameSite: this.config.sameSite,
            maxAge: this.config.maxAge
          });
          
          // Also provide in response header for SPA convenience
          res.setHeader('X-CSRF-Token', token);
          
          return next();
        }
        
        // For state-changing requests, validate token
        const token = this.getTokenFromRequest(req);
        
        if (!this.validateToken(token, secret)) {
          // Log security violation
          if (req.auditLogger) {
            req.auditLogger.logSecurityViolation('CSRF_TOKEN_INVALID', req, {
              providedToken: token ? 'present' : 'missing',
              userAgent: req.headers['user-agent'],
              referer: req.headers.referer
            });
          }
          
          return res.status(403).json({
            error: 'Forbidden',
            message: 'Invalid or missing CSRF token',
            code: 'CSRF_TOKEN_INVALID',
            statusCode: 403
          });
        }
        
        next();
      } catch (error) {
        console.error('CSRF middleware error:', error);
        next(error);
      }
    };
  }
  
  /**
   * Get token from request (header, body, or query)
   * @param {Object} req - Express request object
   * @returns {string|null} CSRF token
   */
  getTokenFromRequest(req) {
    // Check header first (recommended for AJAX)
    let token = req.headers[this.config.headerName];
    
    // Check body (for form submissions)
    if (!token && req.body) {
      token = req.body._csrf || req.body.csrfToken;
    }
    
    // Check query parameters (less secure, but sometimes necessary)
    if (!token && req.query) {
      token = req.query._csrf || req.query.csrfToken;
    }
    
    return token;
  }
  
  /**
   * Determine if CSRF protection should be skipped
   * @param {Object} req - Express request object
   * @returns {boolean} True if CSRF should be skipped
   */
  shouldSkipCSRF(req) {
    // Skip for API key authentication
    if (req.headers['x-api-key'] || req.authContext?.authType === 'api_key') {
      return true;
    }
    
    // Skip for GraphQL introspection queries
    if (req.body?.query?.includes('__schema') || req.body?.query?.includes('__type')) {
      return true;
    }
    
    // Skip for webhook endpoints
    if (req.path.startsWith('/webhooks/')) {
      return true;
    }
    
    // Skip for health checks
    if (req.path === '/health' || req.path.startsWith('/api/health')) {
      return true;
    }
    
    // Skip for public endpoints
    const publicEndpoints = [
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/refresh',
      '/api/transcribe/health',
      '/api/transcribe/languages'
    ];
    
    if (publicEndpoints.includes(req.path)) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Get CSRF secret from session
   * @param {Object} req - Express request object
   * @returns {string|null} CSRF secret
   */
  getSecretFromSession(req) {
    if (req.session) {
      return req.session[this.config.sessionKey];
    }
    
    // Fallback to signed cookie if no session
    if (req.signedCookies) {
      return req.signedCookies[this.config.sessionKey];
    }
    
    return null;
  }
  
  /**
   * Set CSRF secret in session
   * @param {Object} req - Express request object
   * @param {string} secret - Secret to store
   */
  setSecretInSession(req, secret) {
    if (req.session) {
      req.session[this.config.sessionKey] = secret;
    } else {
      // Fallback to signed cookie if no session
      // Note: This requires cookie-parser with a secret
      console.warn('No session available for CSRF secret storage, using signed cookie');
    }
  }
  
  /**
   * Hash token with secret
   * @param {string} data - Data to hash
   * @param {string} secret - Secret for HMAC
   * @returns {string} Hashed token
   */
  hashToken(data, secret) {
    return crypto
      .createHmac('sha256', secret)
      .update(data)
      .digest('hex');
  }
  
  /**
   * Clean up old used tokens to prevent memory leaks
   */
  cleanupTokens() {
    const maxTokens = 10000; // Limit memory usage
    
    if (this.usedTokens.size > maxTokens) {
      // Remove oldest tokens (simple FIFO cleanup)
      const tokensArray = Array.from(this.usedTokens);
      const tokensToRemove = tokensArray.slice(0, tokensArray.length - maxTokens + 1000);
      
      tokensToRemove.forEach(token => {
        this.usedTokens.delete(token);
      });
      
      console.log(`Cleaned up ${tokensToRemove.length} old CSRF tokens`);
    }
  }
  
  /**
   * Manually verify CSRF token (for custom use cases)
   * @param {string} token - Token to verify
   * @param {string} secret - Secret to verify against
   * @returns {boolean} True if token is valid
   */
  verifyToken(token, secret) {
    return this.validateToken(token, secret);
  }
  
  /**
   * Generate token for client use
   * @param {Object} req - Express request object
   * @returns {string|null} CSRF token
   */
  getTokenForClient(req) {
    const secret = this.getSecretFromSession(req);
    if (!secret) {
      return null;
    }
    
    const { token } = this.generateToken(secret);
    return token;
  }
  
  /**
   * Middleware to add CSRF token to response locals (for template rendering)
   * @returns {Function} Express middleware
   */
  addTokenToLocals() {
    return (req, res, next) => {
      const token = this.getTokenForClient(req);
      if (token) {
        res.locals.csrfToken = token;
      }
      next();
    };
  }
  
  /**
   * Cleanup on shutdown
   */
  destroy() {
    if (this.tokenCleanupInterval) {
      clearInterval(this.tokenCleanupInterval);
    }
    this.usedTokens.clear();
  }
}

/**
 * Double Submit Cookie CSRF Protection
 * Alternative implementation using double submit pattern
 */
class DoubleSubmitCSRF {
  constructor(config = {}) {
    this.config = {
      cookieName: '_csrf_token',
      headerName: 'x-csrf-token',
      tokenLength: 32,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 1000 * 60 * 60, // 1 hour
      ...config
    };
  }
  
  /**
   * Generate CSRF token
   * @returns {string} CSRF token
   */
  generateToken() {
    return crypto.randomBytes(this.config.tokenLength).toString('hex');
  }
  
  /**
   * Middleware for double submit CSRF protection
   * @returns {Function} Express middleware
   */
  middleware() {
    return (req, res, next) => {
      // Skip for safe methods
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        const token = this.generateToken();
        
        // Set cookie
        res.cookie(this.config.cookieName, token, {
          httpOnly: false, // Must be accessible to JavaScript
          secure: this.config.secure,
          sameSite: this.config.sameSite,
          maxAge: this.config.maxAge
        });
        
        return next();
      }
      
      // For state-changing requests, validate
      const cookieToken = req.cookies[this.config.cookieName];
      const headerToken = req.headers[this.config.headerName];
      
      if (!cookieToken || !headerToken || cookieToken !== headerToken) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'CSRF token mismatch',
          code: 'CSRF_TOKEN_MISMATCH',
          statusCode: 403
        });
      }
      
      next();
    };
  }
}

module.exports = {
  CSRFProtection,
  DoubleSubmitCSRF
};