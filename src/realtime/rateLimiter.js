const { RateLimit } = require('../types/realtime');

/**
 * Rate limiter for WebSocket events to prevent abuse and maintain performance
 */
class SocketRateLimiter {
  constructor(options = {}) {
    this.userLimits = new Map(); // userId -> RateLimit
    this.socketLimits = new Map(); // socketId -> RateLimit
    this.ipLimits = new Map(); // ipAddress -> RateLimit
    
    // Configuration
    this.config = {
      // Per-user limits
      maxEventsPerMinute: options.maxEventsPerMinute || 60,
      maxEventsPerHour: options.maxEventsPerHour || 1000,
      
      // Per-socket limits (for multiple tabs)
      maxSocketEventsPerMinute: options.maxSocketEventsPerMinute || 30,
      
      // Per-IP limits (for DDoS protection)
      maxIpEventsPerMinute: options.maxIpEventsPerMinute || 200,
      maxIpConnectionsPerHour: options.maxIpConnectionsPerHour || 100,
      
      // Time windows
      minuteWindow: 60000, // 1 minute
      hourWindow: 3600000, // 1 hour
      
      // Whitelist
      whitelistedUsers: new Set(options.whitelistedUsers || []),
      whitelistedIps: new Set(options.whitelistedIps || [])
    };
    
    this.blockedUsers = new Set();
    this.blockedIps = new Set();
    this.violations = new Map(); // Track violations for escalating blocks
    
    // Cleanup old entries periodically
    this.startCleanupScheduler();
  }

  /**
   * Check if an event should be rate limited
   * @param {Object} socket - Socket instance
   * @param {string} eventType - Type of event
   * @returns {Object} Rate limit result
   */
  checkRateLimit(socket, eventType) {
    const userId = socket.userId;
    const socketId = socket.id;
    const ipAddress = socket.handshake.address;
    
    try {
      // Check if user/IP is whitelisted
      if (this.config.whitelistedUsers.has(userId) || 
          this.config.whitelistedIps.has(ipAddress)) {
        return { allowed: true, reason: 'whitelisted' };
      }
      
      // Check if user/IP is blocked
      if (this.blockedUsers.has(userId)) {
        return { 
          allowed: false, 
          reason: 'user_blocked',
          retryAfter: this.getBlockExpiry(userId)
        };
      }
      
      if (this.blockedIps.has(ipAddress)) {
        return { 
          allowed: false, 
          reason: 'ip_blocked',
          retryAfter: this.getBlockExpiry(ipAddress)
        };
      }
      
      // Check per-user rate limits
      const userCheck = this.checkUserRateLimit(userId);
      if (!userCheck.allowed) {
        this.recordViolation(userId, 'user_limit');
        return userCheck;
      }
      
      // Check per-socket rate limits
      const socketCheck = this.checkSocketRateLimit(socketId);
      if (!socketCheck.allowed) {
        this.recordViolation(userId, 'socket_limit');
        return socketCheck;
      }
      
      // Check per-IP rate limits
      const ipCheck = this.checkIpRateLimit(ipAddress);
      if (!ipCheck.allowed) {
        this.recordViolation(ipAddress, 'ip_limit');
        return ipCheck;
      }
      
      // All checks passed - update counters
      this.incrementCounters(userId, socketId, ipAddress);
      
      return { allowed: true };
      
    } catch (error) {
      console.error('Error checking rate limit:', error);
      // Fail open - allow the request but log the error
      return { allowed: true, error: error.message };
    }
  }

  /**
   * Check user-specific rate limits
   * @param {string} userId - User ID
   * @returns {Object} Rate limit result
   */
  checkUserRateLimit(userId) {
    const now = Date.now();
    
    // Check minute limit
    const minuteKey = `${userId}:minute`;
    const minuteLimit = this.getOrCreateLimit(
      minuteKey, 
      this.config.maxEventsPerMinute, 
      this.config.minuteWindow
    );
    
    if (!minuteLimit.checkLimit()) {
      return {
        allowed: false,
        reason: 'user_minute_limit_exceeded',
        limit: this.config.maxEventsPerMinute,
        window: 'minute',
        retryAfter: minuteLimit.getResetTime()
      };
    }
    
    // Check hour limit
    const hourKey = `${userId}:hour`;
    const hourLimit = this.getOrCreateLimit(
      hourKey,
      this.config.maxEventsPerHour,
      this.config.hourWindow
    );
    
    if (!hourLimit.checkLimit()) {
      return {
        allowed: false,
        reason: 'user_hour_limit_exceeded',
        limit: this.config.maxEventsPerHour,
        window: 'hour',
        retryAfter: hourLimit.getResetTime()
      };
    }
    
    return { allowed: true };
  }

  /**
   * Check socket-specific rate limits
   * @param {string} socketId - Socket ID
   * @returns {Object} Rate limit result
   */
  checkSocketRateLimit(socketId) {
    const limit = this.getOrCreateLimit(
      socketId,
      this.config.maxSocketEventsPerMinute,
      this.config.minuteWindow
    );
    
    if (!limit.checkLimit()) {
      return {
        allowed: false,
        reason: 'socket_limit_exceeded',
        limit: this.config.maxSocketEventsPerMinute,
        window: 'minute',
        retryAfter: limit.getResetTime()
      };
    }
    
    return { allowed: true };
  }

  /**
   * Check IP-specific rate limits
   * @param {string} ipAddress - IP address
   * @returns {Object} Rate limit result
   */
  checkIpRateLimit(ipAddress) {
    const limit = this.getOrCreateLimit(
      ipAddress,
      this.config.maxIpEventsPerMinute,
      this.config.minuteWindow
    );
    
    if (!limit.checkLimit()) {
      return {
        allowed: false,
        reason: 'ip_limit_exceeded',
        limit: this.config.maxIpEventsPerMinute,
        window: 'minute',
        retryAfter: limit.getResetTime()
      };
    }
    
    return { allowed: true };
  }

  /**
   * Get or create a rate limit instance
   * @param {string} key - Limit key
   * @param {number} maxEvents - Maximum events
   * @param {number} windowMs - Time window in milliseconds
   * @returns {RateLimit} Rate limit instance
   */
  getOrCreateLimit(key, maxEvents, windowMs) {
    let limit = this.userLimits.get(key);
    
    if (!limit || Date.now() > limit.getResetTime()) {
      limit = new RateLimit(maxEvents, windowMs);
      this.userLimits.set(key, limit);
    }
    
    return limit;
  }

  /**
   * Increment rate limit counters
   * @param {string} userId - User ID
   * @param {string} socketId - Socket ID
   * @param {string} ipAddress - IP address
   */
  incrementCounters(userId, socketId, ipAddress) {
    // User counters are already incremented in checkUserRateLimit
    // Socket counter is already incremented in checkSocketRateLimit  
    // IP counter is already incremented in checkIpRateLimit
    // This method is for future extensibility
  }

  /**
   * Record a rate limit violation
   * @param {string} identifier - User ID or IP address
   * @param {string} violationType - Type of violation
   */
  recordViolation(identifier, violationType) {
    try {
      if (!this.violations.has(identifier)) {
        this.violations.set(identifier, {
          count: 0,
          firstViolation: Date.now(),
          lastViolation: Date.now(),
          types: new Set()
        });
      }
      
      const violation = this.violations.get(identifier);
      violation.count++;
      violation.lastViolation = Date.now();
      violation.types.add(violationType);
      
      // Escalate to temporary block after multiple violations
      if (violation.count >= 5) {
        this.temporaryBlock(identifier, this.calculateBlockDuration(violation.count));
      }
      
      console.warn(`⚠️ Rate limit violation: ${identifier} (${violationType}) - Count: ${violation.count}`);
    } catch (error) {
      console.error('Error recording violation:', error);
    }
  }

  /**
   * Temporarily block a user or IP
   * @param {string} identifier - User ID or IP address
   * @param {number} durationMs - Block duration in milliseconds
   */
  temporaryBlock(identifier, durationMs) {
    try {
      // Determine if it's a user ID or IP address
      const isIp = /^\d+\.\d+\.\d+\.\d+$/.test(identifier);
      
      if (isIp) {
        this.blockedIps.add(identifier);
      } else {
        this.blockedUsers.add(identifier);
      }
      
      // Set unblock timer
      setTimeout(() => {
        if (isIp) {
          this.blockedIps.delete(identifier);
        } else {
          this.blockedUsers.delete(identifier);
        }
        console.log(`🔓 Unblocked ${identifier} after temporary block`);
      }, durationMs);
      
      console.warn(`🚫 Temporarily blocked ${identifier} for ${durationMs / 1000} seconds`);
    } catch (error) {
      console.error('Error applying temporary block:', error);
    }
  }

  /**
   * Calculate block duration based on violation count
   * @param {number} violationCount - Number of violations
   * @returns {number} Block duration in milliseconds
   */
  calculateBlockDuration(violationCount) {
    // Exponential backoff: 1min, 5min, 15min, 1hour, 24hours
    const durations = [
      60 * 1000,        // 1 minute
      5 * 60 * 1000,    // 5 minutes
      15 * 60 * 1000,   // 15 minutes
      60 * 60 * 1000,   // 1 hour
      24 * 60 * 60 * 1000 // 24 hours
    ];
    
    const index = Math.min(violationCount - 5, durations.length - 1);
    return durations[index];
  }

  /**
   * Get block expiry time
   * @param {string} identifier - User ID or IP address
   * @returns {number} Expiry timestamp
   */
  getBlockExpiry(identifier) {
    // This is a simplified implementation
    // In a real system, you'd store block expiry times
    return Date.now() + (5 * 60 * 1000); // 5 minutes default
  }

  /**
   * Create rate limiting middleware for Socket.io
   * @returns {Function} Middleware function
   */
  middleware() {
    return (socket, next) => {
      // Add rate limit checking to socket instance
      socket.checkRateLimit = (eventType) => {
        return this.checkRateLimit(socket, eventType);
      };
      
      // Intercept all events for rate limiting
      const originalEmit = socket.emit;
      socket.emit = (...args) => {
        const eventType = args[0];
        const rateLimitResult = this.checkRateLimit(socket, eventType);
        
        if (!rateLimitResult.allowed) {
          socket.emit('rate_limit_exceeded', {
            reason: rateLimitResult.reason,
            retryAfter: rateLimitResult.retryAfter,
            limit: rateLimitResult.limit
          });
          return false;
        }
        
        return originalEmit.apply(socket, args);
      };
      
      next();
    };
  }

  /**
   * Get rate limiter statistics
   * @returns {Object} Rate limiter stats
   */
  getStats() {
    return {
      activeLimits: this.userLimits.size,
      blockedUsers: this.blockedUsers.size,
      blockedIps: this.blockedIps.size,
      totalViolations: this.violations.size,
      violationDetails: Array.from(this.violations.entries()).map(([id, data]) => ({
        identifier: id,
        violationCount: data.count,
        violationTypes: Array.from(data.types),
        firstViolation: data.firstViolation,
        lastViolation: data.lastViolation
      }))
    };
  }

  /**
   * Reset rate limits for a user
   * @param {string} userId - User ID
   */
  resetUserLimits(userId) {
    this.userLimits.delete(`${userId}:minute`);
    this.userLimits.delete(`${userId}:hour`);
    this.violations.delete(userId);
    this.blockedUsers.delete(userId);
  }

  /**
   * Reset rate limits for an IP
   * @param {string} ipAddress - IP address
   */
  resetIpLimits(ipAddress) {
    this.ipLimits.delete(ipAddress);
    this.violations.delete(ipAddress);
    this.blockedIps.delete(ipAddress);
  }

  /**
   * Start cleanup scheduler to remove old entries
   */
  startCleanupScheduler() {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000); // Every 5 minutes
    
    console.log('🧹 Started rate limiter cleanup scheduler');
  }

  /**
   * Clean up old rate limit entries
   */
  cleanup() {
    try {
      const now = Date.now();
      const oneHourAgo = now - this.config.hourWindow;
      
      // Clean up old rate limits
      for (const [key, limit] of this.userLimits.entries()) {
        if (now > limit.getResetTime() + this.config.hourWindow) {
          this.userLimits.delete(key);
        }
      }
      
      // Clean up old violations
      for (const [identifier, violation] of this.violations.entries()) {
        if (violation.lastViolation < oneHourAgo) {
          this.violations.delete(identifier);
        }
      }
      
      console.log('🧹 Cleaned up old rate limit entries');
    } catch (error) {
      console.error('Error during rate limiter cleanup:', error);
    }
  }

  /**
   * Stop cleanup scheduler
   */
  stopCleanupScheduler() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('🛑 Stopped rate limiter cleanup scheduler');
    }
  }

  /**
   * Destroy the rate limiter
   */
  destroy() {
    this.stopCleanupScheduler();
    this.userLimits.clear();
    this.socketLimits.clear();
    this.ipLimits.clear();
    this.violations.clear();
    this.blockedUsers.clear();
    this.blockedIps.clear();
  }
}

module.exports = { SocketRateLimiter };