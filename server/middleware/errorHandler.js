/**
 * Custom API Error class
 * @extends Error
 */
class ApiError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.correlationId = null;
    this.timestamp = new Date();
  }
}

/**
 * Validation Error class
 * @extends ApiError
 */
class ValidationError extends ApiError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

/**
 * Authentication Error class
 * @extends ApiError
 */
class AuthenticationError extends ApiError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization Error class
 * @extends ApiError
 */
class AuthorizationError extends ApiError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

/**
 * Not Found Error class
 * @extends ApiError
 */
class NotFoundError extends ApiError {
  constructor(resource = 'Resource', id = null) {
    const message = id ? `${resource} with id ${id} not found` : `${resource} not found`;
    super(message, 404, 'NOT_FOUND_ERROR');
    this.name = 'NotFoundError';
  }
}

/**
 * Rate Limit Error class
 * @extends ApiError
 */
class RateLimitError extends ApiError {
  constructor(message = 'Rate limit exceeded', retryAfter = null) {
    super(message, 429, 'RATE_LIMIT_ERROR', { retryAfter });
    this.name = 'RateLimitError';
  }
}

/**
 * Conflict Error class
 * @extends ApiError
 */
class ConflictError extends ApiError {
  constructor(message = 'Resource conflict') {
    super(message, 409, 'CONFLICT_ERROR');
    this.name = 'ConflictError';
  }
}

class ErrorHandlerMiddleware {
  constructor(logger = null) {
    this.logger = logger || console;
  }

  /**
   * Express error handling middleware
   * @returns {function} Express error middleware
   */
  middleware() {
    return (error, req, res, next) => {
      // Set correlation ID for error tracking
      error.correlationId = req.correlationId || 'unknown';
      
      // Log error with context
      this.logError(error, req);
      
      // Format and send error response
      const errorResponse = this.formatError(error, req);
      res.status(errorResponse.statusCode).json(errorResponse);
    };
  }

  /**
   * Format error for response
   * @param {Error} error - Error object
   * @param {Object} req - Express request object
   * @returns {Object} Formatted error response
   */
  formatError(error, req = {}) {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Base error response
    const baseError = {
      error: error.name || 'Internal Server Error',
      message: error.message || 'An unexpected error occurred',
      statusCode: error.statusCode || 500,
      code: error.code || 'INTERNAL_ERROR',
      correlationId: error.correlationId || req.correlationId,
      timestamp: new Date().toISOString()
    };
    
    // Add development-specific details
    if (isDevelopment && !isProduction) {
      baseError.stack = error.stack;
      baseError.details = error.details;
      baseError.request = {
        method: req.method,
        url: req.url,
        headers: this.sanitizeHeaders(req.headers),
        body: this.sanitizeBody(req.body)
      };
    }
    
    // Handle specific error types
    switch (error.name) {
      case 'ValidationError':
        return {
          ...baseError,
          type: 'VALIDATION_ERROR',
          details: error.details || (isDevelopment ? error.details : undefined)
        };
        
      case 'AuthenticationError':
        return {
          ...baseError,
          type: 'AUTHENTICATION_ERROR',
          message: 'Authentication required'
        };
        
      case 'AuthorizationError':
        return {
          ...baseError,
          type: 'AUTHORIZATION_ERROR',
          message: 'Insufficient permissions'
        };
        
      case 'NotFoundError':
        return {
          ...baseError,
          type: 'NOT_FOUND_ERROR'
        };
        
      case 'RateLimitError':
        return {
          ...baseError,
          type: 'RATE_LIMIT_ERROR',
          retryAfter: error.details?.retryAfter
        };
        
      case 'ConflictError':
        return {
          ...baseError,
          type: 'CONFLICT_ERROR'
        };

      // Handle Prisma errors
      case 'PrismaClientKnownRequestError':
        return this.handlePrismaError(error, baseError);
        
      // Handle JWT errors
      case 'JsonWebTokenError':
      case 'TokenExpiredError':
        return {
          ...baseError,
          statusCode: 401,
          type: 'AUTHENTICATION_ERROR',
          message: 'Invalid or expired token'
        };
        
      // Handle Joi validation errors
      case 'ValidationError':
        if (error.isJoi) {
          return {
            ...baseError,
            statusCode: 400,
            type: 'VALIDATION_ERROR',
            details: error.details?.map(detail => ({
              field: detail.path?.join('.') || 'unknown',
              message: detail.message,
              value: detail.context?.value
            }))
          };
        }
        break;
        
      default:
        // For unknown errors, don't expose internal details in production
        if (isProduction) {
          return {
            error: 'Internal Server Error',
            message: 'An unexpected error occurred',
            statusCode: 500,
            code: 'INTERNAL_ERROR',
            correlationId: error.correlationId || req.correlationId,
            timestamp: new Date().toISOString()
          };
        }
        return baseError;
    }
    
    return baseError;
  }

  /**
   * Handle Prisma-specific errors
   * @param {Error} error - Prisma error
   * @param {Object} baseError - Base error object
   * @returns {Object} Formatted error response
   */
  handlePrismaError(error, baseError) {
    switch (error.code) {
      case 'P2002': // Unique constraint violation
        return {
          ...baseError,
          statusCode: 409,
          type: 'CONFLICT_ERROR',
          message: 'Resource already exists',
          details: {
            constraint: error.meta?.target
          }
        };
        
      case 'P2025': // Record not found
        return {
          ...baseError,
          statusCode: 404,
          type: 'NOT_FOUND_ERROR',
          message: 'Resource not found'
        };
        
      case 'P2014': // Invalid ID
        return {
          ...baseError,
          statusCode: 400,
          type: 'VALIDATION_ERROR',
          message: 'Invalid ID format'
        };
        
      default:
        return {
          ...baseError,
          statusCode: 500,
          type: 'DATABASE_ERROR',
          message: 'Database operation failed'
        };
    }
  }

  /**
   * Log error with context
   * @param {Error} error - Error object
   * @param {Object} req - Express request object
   */
  logError(error, req) {
    const logData = {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code,
        statusCode: error.statusCode
      },
      request: {
        method: req.method,
        url: req.url,
        userId: req.authContext?.user?.id,
        apiKeyId: req.authContext?.apiKey?.id,
        correlationId: req.correlationId,
        userAgent: req.headers?.['user-agent'],
        ipAddress: req.headers?.['x-forwarded-for'] || req.connection?.remoteAddress
      }
    };
    
    const level = error.statusCode && error.statusCode < 500 ? 'warn' : 'error';
    
    if (this.logger.log) {
      this.logger.log(level, 'API Error', logData);
    } else {
      console[level]('API Error:', JSON.stringify(logData, null, 2));
    }
  }

  /**
   * Sanitize headers for logging (remove sensitive data)
   * @param {Object} headers - Request headers
   * @returns {Object} Sanitized headers
   */
  sanitizeHeaders(headers = {}) {
    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'x-api-key', 'cookie'];
    
    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  /**
   * Sanitize request body for logging (remove sensitive data)
   * @param {Object} body - Request body
   * @returns {Object} Sanitized body
   */
  sanitizeBody(body = {}) {
    if (!body || typeof body !== 'object') {
      return body;
    }
    
    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'apiKey'];
    
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  /**
   * Create a 404 handler for unmatched routes
   * @returns {function} Express middleware
   */
  notFoundHandler() {
    return (req, res, next) => {
      const error = new NotFoundError('Endpoint');
      next(error);
    };
  }
}

module.exports = {
  ErrorHandlerMiddleware,
  ApiError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  ConflictError
};