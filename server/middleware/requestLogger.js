const crypto = require('crypto');
const winston = require('winston');
const { prisma } = require('../../prisma-client');

/**
 * Request log data structure
 * @typedef {Object} RequestLog
 * @property {string} id - Unique log ID
 * @property {string} method - HTTP method
 * @property {string} url - Request URL
 * @property {string} userAgent - User agent string
 * @property {string} ipAddress - Client IP address
 * @property {string} userId - User ID (if authenticated)
 * @property {string} apiKeyId - API key ID (if used)
 * @property {number} statusCode - HTTP status code
 * @property {number} responseTime - Response time in milliseconds
 * @property {number} requestSize - Request size in bytes
 * @property {number} responseSize - Response size in bytes
 * @property {string} error - Error message (if any)
 * @property {string} correlationId - Correlation ID for tracing
 * @property {Date} timestamp - Request timestamp
 */

class RequestLogger {
  constructor(customLogger = null) {
    this.logger = customLogger || this.createDefaultLogger();
  }

  /**
   * Create default Winston logger
   * @returns {winston.Logger}
   */
  createDefaultLogger() {
    const logFormat = winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    );

    return winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: logFormat,
      defaultMeta: { service: 'lifeos-api' },
      transports: [
        new winston.transports.File({ 
          filename: 'logs/error.log', 
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5
        }),
        new winston.transports.File({ 
          filename: 'logs/combined.log',
          maxsize: 5242880, // 5MB
          maxFiles: 5
        }),
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ]
    });
  }

  /**
   * Express middleware for request logging
   * @returns {function} Express middleware
   */
  middleware() {
    return (req, res, next) => {
      const startTime = Date.now();
      const correlationId = req.headers['x-correlation-id'] || this.generateCorrelationId();
      
      // Add correlation ID to request for downstream use
      req.correlationId = correlationId;
      res.setHeader('X-Correlation-ID', correlationId);
      
      // Capture request data
      const requestData = {
        correlationId,
        method: req.method,
        url: req.url,
        userAgent: req.headers['user-agent'],
        ipAddress: this.getClientIP(req),
        userId: null, // Will be set after authentication
        apiKeyId: null, // Will be set after authentication
        requestSize: this.getRequestSize(req),
        timestamp: new Date()
      };
      
      // Store original res.end to capture response data
      const originalEnd = res.end;
      const originalWrite = res.write;
      let responseSize = 0;
      
      // Track response size
      res.write = function(chunk, encoding) {
        if (chunk) {
          responseSize += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk, encoding);
        }
        return originalWrite.call(res, chunk, encoding);
      };
      
      // Override res.end to capture response data and log
      res.end = function(chunk, encoding) {
        const responseTime = Date.now() - startTime;
        
        if (chunk) {
          responseSize += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk, encoding);
        }
        
        // Update request data with auth info if available
        if (req.authContext) {
          requestData.userId = req.authContext.user?.id || null;
          requestData.apiKeyId = req.authContext.apiKey?.id || null;
        }
        
        const logData = {
          ...requestData,
          id: crypto.randomUUID(),
          statusCode: res.statusCode,
          responseTime,
          responseSize,
          error: res.statusCode >= 400 ? res.statusMessage : null
        };
        
        // Log the request
        this.logRequest(logData);
        
        // Call original end
        return originalEnd.call(res, chunk, encoding);
      }.bind(this);
      
      next();
    };
  }

  /**
   * Log request with structured logging
   * @param {RequestLog} logData - Request log data
   */
  logRequest(logData) {
    try {
      // Determine log level based on status code
      const level = this.getLogLevel(logData.statusCode, logData.responseTime);
      
      // Create log entry with additional context
      const logEntry = {
        ...logData,
        // Add flags for monitoring
        isSlowRequest: logData.responseTime > 1000,
        isLargeRequest: logData.requestSize > 1024 * 1024, // 1MB
        isLargeResponse: logData.responseSize > 1024 * 1024, // 1MB
        isError: logData.statusCode >= 400,
        isServerError: logData.statusCode >= 500
      };
      
      // Log to structured logger
      this.logger[level]('API Request', logEntry);
      
      // Store in database asynchronously (don't block response)
      this.storeRequestLog(logData).catch(error => {
        this.logger.error('Failed to store request log in database', { 
          error: error.message,
          correlationId: logData.correlationId 
        });
      });
    } catch (error) {
      console.error('Request logging failed:', error);
    }
  }

  /**
   * Store request log in database
   * @param {RequestLog} logData - Request log data
   * @returns {Promise<void>}
   */
  async storeRequestLog(logData) {
    try {
      // Only store if request logging is enabled
      if (process.env.REQUEST_LOGGING_ENABLED === 'false') {
        return;
      }

      // Check if prisma is connected and requestLog model exists
      if (!prisma || !prisma.requestLog) {
        return;
      }

      await prisma.requestLog.create({
        data: {
          id: logData.id,
          method: logData.method,
          url: logData.url.substring(0, 2000), // Truncate long URLs
          userAgent: logData.userAgent?.substring(0, 500), // Truncate long user agents
          ipAddress: logData.ipAddress,
          userId: logData.userId,
          apiKeyId: logData.apiKeyId,
          statusCode: logData.statusCode,
          responseTime: logData.responseTime,
          requestSize: logData.requestSize,
          responseSize: logData.responseSize,
          error: logData.error?.substring(0, 1000), // Truncate long error messages
          correlationId: logData.correlationId,
          timestamp: logData.timestamp
        }
      });
    } catch (error) {
      // Log database errors but don't propagate them
      this.logger.error('Database logging failed', {
        error: error.message,
        correlationId: logData.correlationId
      });
    }
  }

  /**
   * Determine log level based on status code and response time
   * @param {number} statusCode - HTTP status code
   * @param {number} responseTime - Response time in ms
   * @returns {string} Log level
   */
  getLogLevel(statusCode, responseTime) {
    if (statusCode >= 500) return 'error';
    if (statusCode >= 400) return 'warn';
    if (responseTime > 5000) return 'warn'; // Very slow requests
    if (responseTime > 1000) return 'info'; // Slow requests
    return 'debug'; // Normal requests
  }

  /**
   * Get client IP address, handling proxies
   * @param {Object} req - Express request object
   * @returns {string} Client IP address
   */
  getClientIP(req) {
    return (
      req.headers['x-forwarded-for'] ||
      req.headers['x-real-ip'] ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      req.connection?.socket?.remoteAddress ||
      req.ip ||
      'unknown'
    );
  }

  /**
   * Get request size in bytes
   * @param {Object} req - Express request object
   * @returns {number} Request size in bytes
   */
  getRequestSize(req) {
    const contentLength = req.headers['content-length'];
    return contentLength ? parseInt(contentLength, 10) : 0;
  }

  /**
   * Generate a unique correlation ID
   * @returns {string} Correlation ID
   */
  generateCorrelationId() {
    return crypto.randomUUID();
  }

  /**
   * Cleanup old request logs (should be run periodically)
   * @param {number} daysToKeep - Number of days to keep logs
   * @returns {Promise<number>} Number of deleted records
   */
  async cleanupOldLogs(daysToKeep = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      const result = await prisma.requestLog.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate
          }
        }
      });
      
      this.logger.info('Request log cleanup completed', {
        deletedCount: result.count,
        cutoffDate: cutoffDate.toISOString()
      });
      
      return result.count;
    } catch (error) {
      this.logger.error('Request log cleanup failed', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get request logs for analysis
   * @param {Object} filters - Filter options
   * @returns {Promise<RequestLog[]>}
   */
  async getRequestLogs(filters = {}) {
    try {
      const where = {};
      
      if (filters.userId) where.userId = filters.userId;
      if (filters.apiKeyId) where.apiKeyId = filters.apiKeyId;
      if (filters.statusCode) where.statusCode = filters.statusCode;
      if (filters.method) where.method = filters.method;
      if (filters.startDate || filters.endDate) {
        where.timestamp = {};
        if (filters.startDate) where.timestamp.gte = filters.startDate;
        if (filters.endDate) where.timestamp.lte = filters.endDate;
      }
      
      return await prisma.requestLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: filters.limit || 1000
      });
    } catch (error) {
      this.logger.error('Failed to fetch request logs', {
        error: error.message,
        filters
      });
      throw error;
    }
  }
}

module.exports = RequestLogger;