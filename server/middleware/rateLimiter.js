const Redis = require('ioredis');

/**
 * Rate limiting configuration
 * @typedef {Object} RateLimitConfig
 * @property {number} windowMs - Time window in milliseconds
 * @property {number} maxRequests - Maximum requests per window
 * @property {function} keyGenerator - Key generation function
 * @property {boolean} skipSuccessfulRequests - Skip successful requests from count
 * @property {boolean} skipFailedRequests - Skip failed requests from count
 * @property {function} onLimitReached - Callback when limit is reached
 */

/**
 * Rate limiting result
 * @typedef {Object} RateLimitResult
 * @property {boolean} allowed - Whether request is allowed
 * @property {number} count - Current request count
 * @property {number} remaining - Remaining requests
 * @property {number} resetTime - Reset timestamp
 */

class RedisRateLimiter {
  /**
   * Create a rate limiter
   * @param {Redis} redisClient - Redis client instance
   * @param {RateLimitConfig} config - Rate limit configuration
   */
  constructor(redisClient, config) {
    this.redis = redisClient;
    this.config = {
      windowMs: 15 * 60 * 1000, // 15 minutes default
      maxRequests: 1000,
      keyGenerator: (req) => req.ip,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      onLimitReached: null,
      ...config
    };
  }

  /**
   * Check if request is within rate limit
   * @param {string} key - Rate limit key
   * @returns {Promise<RateLimitResult>}
   */
  async checkLimit(key) {
    const multi = this.redis.multi();
    const window = Math.floor(Date.now() / this.config.windowMs);
    const redisKey = `rate_limit:${key}:${window}`;
    
    multi.incr(redisKey);
    multi.expire(redisKey, Math.ceil(this.config.windowMs / 1000));
    
    try {
      const results = await multi.exec();
      const count = results?.[0]?.[1] || 0;
      
      return {
        allowed: count <= this.config.maxRequests,
        count,
        remaining: Math.max(0, this.config.maxRequests - count),
        resetTime: (window + 1) * this.config.windowMs
      };
    } catch (error) {
      console.error('Rate limiting check failed:', error);
      // Fail open for availability
      return {
        allowed: true,
        count: 0,
        remaining: this.config.maxRequests,
        resetTime: Date.now() + this.config.windowMs
      };
    }
  }

  /**
   * Express middleware for rate limiting
   * @returns {function} Express middleware
   */
  middleware() {
    return async (req, res, next) => {
      try {
        const key = this.config.keyGenerator(req);
        const result = await this.checkLimit(key);
        
        // Add rate limit headers
        res.setHeader('X-RateLimit-Limit', this.config.maxRequests);
        res.setHeader('X-RateLimit-Remaining', result.remaining);
        res.setHeader('X-RateLimit-Reset', new Date(result.resetTime).toISOString());
        
        if (!result.allowed) {
          if (this.config.onLimitReached) {
            this.config.onLimitReached(req, res);
          }
          
          return res.status(429).json({
            error: 'Too Many Requests',
            message: 'Rate limit exceeded. Please try again later.',
            retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
            limit: this.config.maxRequests,
            remaining: result.remaining,
            resetTime: new Date(result.resetTime).toISOString()
          });
        }
        
        // Store rate limit info in request for analytics
        req.rateLimit = result;
        next();
      } catch (error) {
        console.error('Rate limiting middleware error:', error);
        // Fail open for availability
        next();
      }
    };
  }
}

// Rate limit configurations for different endpoints
const rateLimitConfigs = {
  // General API limits
  general: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 1000,
    keyGenerator: (req) => req.ip
  },
  
  // Authentication endpoints - stricter limits
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10,
    keyGenerator: (req) => req.ip,
    skipSuccessfulRequests: false
  },
  
  // Voice/AI endpoints - more expensive operations
  voice: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    keyGenerator: (req) => req.authContext?.user?.id || req.ip
  },
  
  // GraphQL queries
  graphql: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    keyGenerator: (req) => req.authContext?.user?.id || req.ip
  },

  // API key based limits (higher limits for authenticated users)
  apiKey: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 500,
    keyGenerator: (req) => req.authContext?.apiKey?.id || req.authContext?.user?.id || req.ip
  }
};

/**
 * Create rate limiter instances
 * @param {Redis} redisClient - Redis client
 * @returns {Object} Rate limiter instances
 */
function createRateLimiters(redisClient) {
  const limiters = {};
  
  for (const [name, config] of Object.entries(rateLimitConfigs)) {
    limiters[name] = new RedisRateLimiter(redisClient, config);
  }
  
  return limiters;
}

module.exports = {
  RedisRateLimiter,
  rateLimitConfigs,
  createRateLimiters
};