const crypto = require('crypto');

/**
 * Audit Event Types for comprehensive security logging
 */
const AuditEventType = {
  // Authentication Events
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  USER_LOGIN_FAILED: 'USER_LOGIN_FAILED',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',
  
  // User Management
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DELETED: 'USER_DELETED',
  USER_PROFILE_VIEWED: 'USER_PROFILE_VIEWED',
  
  // Task Management
  TASK_CREATED: 'TASK_CREATED',
  TASK_UPDATED: 'TASK_UPDATED',
  TASK_DELETED: 'TASK_DELETED',
  TASK_VIEWED: 'TASK_VIEWED',
  TASK_SHARED: 'TASK_SHARED',
  
  // Project Management
  PROJECT_CREATED: 'PROJECT_CREATED',
  PROJECT_UPDATED: 'PROJECT_UPDATED',
  PROJECT_DELETED: 'PROJECT_DELETED',
  PROJECT_MEMBER_ADDED: 'PROJECT_MEMBER_ADDED',
  PROJECT_MEMBER_REMOVED: 'PROJECT_MEMBER_REMOVED',
  PROJECT_VIEWED: 'PROJECT_VIEWED',
  
  // API Key Management
  API_KEY_CREATED: 'API_KEY_CREATED',
  API_KEY_USED: 'API_KEY_USED',
  API_KEY_REVOKED: 'API_KEY_REVOKED',
  API_KEY_FAILED: 'API_KEY_FAILED',
  
  // Voice/Transcription
  VOICE_RECORDING_CREATED: 'VOICE_RECORDING_CREATED',
  TRANSCRIPTION_REQUESTED: 'TRANSCRIPTION_REQUESTED',
  TRANSCRIPTION_COMPLETED: 'TRANSCRIPTION_COMPLETED',
  TRANSCRIPTION_FAILED: 'TRANSCRIPTION_FAILED',
  
  // Security Events
  SECURITY_VIOLATION: 'SECURITY_VIOLATION',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
  BRUTE_FORCE_ATTEMPT: 'BRUTE_FORCE_ATTEMPT',
  
  // Data Events
  DATA_EXPORT: 'DATA_EXPORT',
  DATA_IMPORT: 'DATA_IMPORT',
  DATA_DELETED: 'DATA_DELETED',
  DATA_BACKUP: 'DATA_BACKUP',
  DATA_RESTORE: 'DATA_RESTORE',
  
  // System Events
  SYSTEM_ERROR: 'SYSTEM_ERROR',
  CONFIGURATION_CHANGED: 'CONFIGURATION_CHANGED',
  SERVICE_STARTED: 'SERVICE_STARTED',
  SERVICE_STOPPED: 'SERVICE_STOPPED'
};

/**
 * Comprehensive Audit Logger for security event tracking
 */
class AuditLogger {
  constructor(logger, prisma) {
    this.logger = logger; // Winston logger
    this.prisma = prisma; // Prisma client
    this.failureThresholds = {
      login: 5, // Failed login attempts
      apiKey: 10, // Failed API key attempts
      rateLimit: 20 // Rate limit violations
    };
    
    // Track recent events for pattern analysis
    this.recentEvents = new Map();
    this.alertCooldown = new Map();
  }
  
  /**
   * Log security audit event
   * @param {Object} event - Audit event details
   * @returns {Promise<void>}
   */
  async logEvent(event) {
    try {
      const auditEvent = this.createAuditEvent(event);
      
      // Log to secure audit log (Winston)
      this.logger.info('AUDIT_EVENT', {
        id: auditEvent.id,
        eventType: auditEvent.eventType,
        userId: auditEvent.userId,
        success: auditEvent.success,
        riskScore: auditEvent.riskScore,
        timestamp: auditEvent.timestamp
      });
      
      // Store in database for querying and analysis
      await this.storeAuditEvent(auditEvent);
      
      // Analyze for security patterns
      await this.analyzeSecurityPatterns(auditEvent);
      
    } catch (error) {
      // Critical: audit logging must never fail the main operation
      console.error('Audit logging failed:', error);
      // Try to log the failure itself
      try {
        this.logger.error('AUDIT_LOG_FAILURE', {
          error: error.message,
          originalEvent: event,
          timestamp: new Date().toISOString()
        });
      } catch (logError) {
        console.error('Critical: Unable to log audit failure:', logError);
      }
    }
  }
  
  /**
   * Create standardized audit event
   * @param {Object} event - Raw event data
   * @returns {Object} Standardized audit event
   */
  createAuditEvent(event) {
    const now = new Date();
    const auditEvent = {
      id: crypto.randomUUID(),
      eventType: event.eventType,
      userId: event.userId || null,
      sessionId: event.sessionId || null,
      resourceType: event.resourceType || null,
      resourceId: event.resourceId || null,
      details: event.details || {},
      ipAddress: event.ipAddress || 'unknown',
      userAgent: event.userAgent || null,
      correlationId: event.correlationId || null,
      timestamp: now,
      success: event.success !== false, // Default to true unless explicitly false
      riskScore: event.riskScore || this.calculateRiskScore(event)
    };
    
    return auditEvent;
  }
  
  /**
   * Store audit event in database
   * @param {Object} auditEvent - Audit event to store
   */
  async storeAuditEvent(auditEvent) {
    try {
      if (!this.prisma) {
        console.warn('Prisma client not available for audit storage');
        return;
      }
      
      await this.prisma.auditLog.create({
        data: {
          id: auditEvent.id,
          eventType: auditEvent.eventType,
          userId: auditEvent.userId,
          resourceType: auditEvent.resourceType,
          resourceId: auditEvent.resourceId,
          details: auditEvent.details,
          ipAddress: auditEvent.ipAddress,
          userAgent: auditEvent.userAgent,
          correlationId: auditEvent.correlationId,
          timestamp: auditEvent.timestamp,
          success: auditEvent.success,
          riskScore: auditEvent.riskScore
        }
      });
    } catch (error) {
      console.error('Failed to store audit event in database:', error);
      // Log to file as fallback
      this.logger.error('AUDIT_DB_FAILURE', {
        auditEvent,
        error: error.message
      });
    }
  }
  
  /**
   * Calculate risk score for event
   * @param {Object} event - Event to score
   * @returns {number} Risk score (1-10)
   */
  calculateRiskScore(event) {
    let score = 1; // Base score
    
    // Risk scores by event type
    const riskScores = {
      [AuditEventType.SECURITY_VIOLATION]: 10,
      [AuditEventType.SUSPICIOUS_ACTIVITY]: 9,
      [AuditEventType.BRUTE_FORCE_ATTEMPT]: 9,
      [AuditEventType.PERMISSION_DENIED]: 8,
      [AuditEventType.DATA_EXPORT]: 7,
      [AuditEventType.API_KEY_CREATED]: 6,
      [AuditEventType.USER_DELETED]: 5,
      [AuditEventType.PASSWORD_CHANGED]: 4,
      [AuditEventType.USER_LOGIN_FAILED]: 3,
      [AuditEventType.USER_LOGIN]: 2,
      [AuditEventType.TASK_VIEWED]: 1
    };
    
    score = riskScores[event.eventType] || 1;
    
    // Increase score for failed events
    if (event.success === false) {
      score = Math.min(score + 3, 10);
    }
    
    // Increase score for privileged operations
    if (event.details?.isAdmin || event.details?.privileged) {
      score = Math.min(score + 2, 10);
    }
    
    // Increase score for unusual times (outside business hours)
    const hour = new Date().getHours();
    if (hour < 6 || hour > 22) {
      score = Math.min(score + 1, 10);
    }
    
    return score;
  }
  
  /**
   * Analyze security patterns and trigger alerts
   * @param {Object} event - Event to analyze
   */
  async analyzeSecurityPatterns(event) {
    try {
      // High-risk event immediate alert
      if (event.riskScore >= 8) {
        await this.triggerSecurityAlert('HIGH_RISK_EVENT', event);
      }
      
      // Brute force detection
      if (event.eventType === AuditEventType.USER_LOGIN_FAILED) {
        await this.checkBruteForce(event.ipAddress, event.userId);
      }
      
      // API key abuse detection
      if (event.eventType === AuditEventType.API_KEY_FAILED) {
        await this.checkApiKeyAbuse(event.ipAddress);
      }
      
      // Rate limiting abuse
      if (event.eventType === AuditEventType.RATE_LIMIT_EXCEEDED) {
        await this.checkRateLimitAbuse(event.ipAddress);
      }
      
      // Unusual access pattern detection
      if (event.userId) {
        await this.checkUnusualAccess(event.userId, event.ipAddress);
      }
      
    } catch (error) {
      console.error('Security pattern analysis failed:', error);
    }
  }
  
  /**
   * Check for brute force attempts
   * @param {string} ipAddress - IP address to check
   * @param {string} userId - User ID (optional)
   */
  async checkBruteForce(ipAddress, userId) {
    const key = userId ? `bf_user_${userId}` : `bf_ip_${ipAddress}`;
    const timeWindow = 15 * 60 * 1000; // 15 minutes
    const now = Date.now();
    
    // Get recent failed attempts
    const recentAttempts = this.getRecentEvents(key, timeWindow);
    recentAttempts.push(now);
    
    // Update tracked events
    this.setRecentEvents(key, recentAttempts, timeWindow);
    
    // Check if threshold exceeded
    if (recentAttempts.length >= this.failureThresholds.login) {
      await this.triggerSecurityAlert('BRUTE_FORCE_DETECTED', {
        ipAddress,
        userId,
        attemptCount: recentAttempts.length,
        timeWindow: '15 minutes'
      });
    }
  }
  
  /**
   * Check for API key abuse
   * @param {string} ipAddress - IP address to check
   */
  async checkApiKeyAbuse(ipAddress) {
    const key = `api_abuse_${ipAddress}`;
    const timeWindow = 5 * 60 * 1000; // 5 minutes
    const now = Date.now();
    
    const recentAttempts = this.getRecentEvents(key, timeWindow);
    recentAttempts.push(now);
    this.setRecentEvents(key, recentAttempts, timeWindow);
    
    if (recentAttempts.length >= this.failureThresholds.apiKey) {
      await this.triggerSecurityAlert('API_KEY_ABUSE_DETECTED', {
        ipAddress,
        attemptCount: recentAttempts.length,
        timeWindow: '5 minutes'
      });
    }
  }
  
  /**
   * Check for rate limit abuse
   * @param {string} ipAddress - IP address to check
   */
  async checkRateLimitAbuse(ipAddress) {
    const key = `rate_abuse_${ipAddress}`;
    const timeWindow = 10 * 60 * 1000; // 10 minutes
    const now = Date.now();
    
    const recentAttempts = this.getRecentEvents(key, timeWindow);
    recentAttempts.push(now);
    this.setRecentEvents(key, recentAttempts, timeWindow);
    
    if (recentAttempts.length >= this.failureThresholds.rateLimit) {
      await this.triggerSecurityAlert('RATE_LIMIT_ABUSE_DETECTED', {
        ipAddress,
        violationCount: recentAttempts.length,
        timeWindow: '10 minutes'
      });
    }
  }
  
  /**
   * Check for unusual access patterns
   * @param {string} userId - User ID
   * @param {string} ipAddress - IP address
   */
  async checkUnusualAccess(userId, ipAddress) {
    // This would typically check against user's normal access patterns
    // For now, we'll implement basic geolocation change detection
    const userKey = `access_pattern_${userId}`;
    const lastIp = this.recentEvents.get(userKey);
    
    if (lastIp && lastIp !== ipAddress) {
      // IP changed - potential security concern
      await this.triggerSecurityAlert('UNUSUAL_ACCESS_PATTERN', {
        userId,
        previousIp: lastIp,
        currentIp: ipAddress,
        type: 'ip_change'
      });
    }
    
    this.recentEvents.set(userKey, ipAddress);
  }
  
  /**
   * Trigger security alert
   * @param {string} alertType - Type of alert
   * @param {Object} details - Alert details
   */
  async triggerSecurityAlert(alertType, details) {
    const alertKey = `${alertType}_${details.ipAddress || details.userId || 'unknown'}`;
    const cooldownPeriod = 30 * 60 * 1000; // 30 minutes
    const now = Date.now();
    
    // Check cooldown to prevent spam
    const lastAlert = this.alertCooldown.get(alertKey);
    if (lastAlert && (now - lastAlert) < cooldownPeriod) {
      return; // Skip duplicate alert
    }
    
    this.alertCooldown.set(alertKey, now);
    
    const alert = {
      type: alertType,
      severity: this.getAlertSeverity(alertType),
      details,
      timestamp: new Date().toISOString(),
      correlationId: crypto.randomUUID()
    };
    
    // Log security alert
    this.logger.warn('SECURITY_ALERT', alert);
    
    // Store security incident
    if (this.prisma) {
      try {
        await this.prisma.securityIncident.create({
          data: {
            id: alert.correlationId,
            type: alertType,
            severity: alert.severity,
            description: this.getAlertDescription(alertType, details),
            userId: details.userId || null,
            ipAddress: details.ipAddress || null,
            details: details,
            status: 'open',
            createdAt: new Date()
          }
        });
      } catch (error) {
        console.error('Failed to store security incident:', error);
      }
    }
    
    // Trigger external alerting (Slack, email, PagerDuty, etc.)
    await this.sendExternalAlert(alert);
    
    console.warn(`🚨 SECURITY ALERT: ${alertType}`, details);
  }
  
  /**
   * Get alert severity
   * @param {string} alertType - Alert type
   * @returns {string} Severity level
   */
  getAlertSeverity(alertType) {
    const severityMap = {
      HIGH_RISK_EVENT: 'high',
      BRUTE_FORCE_DETECTED: 'high',
      API_KEY_ABUSE_DETECTED: 'medium',
      RATE_LIMIT_ABUSE_DETECTED: 'medium',
      UNUSUAL_ACCESS_PATTERN: 'low'
    };
    
    return severityMap[alertType] || 'medium';
  }
  
  /**
   * Get alert description
   * @param {string} alertType - Alert type
   * @param {Object} details - Alert details
   * @returns {string} Human-readable description
   */
  getAlertDescription(alertType, details) {
    const descriptions = {
      HIGH_RISK_EVENT: `High-risk security event detected from ${details.ipAddress}`,
      BRUTE_FORCE_DETECTED: `Brute force attack detected: ${details.attemptCount} failed attempts from ${details.ipAddress}`,
      API_KEY_ABUSE_DETECTED: `API key abuse detected: ${details.attemptCount} failed attempts from ${details.ipAddress}`,
      RATE_LIMIT_ABUSE_DETECTED: `Rate limit abuse detected: ${details.violationCount} violations from ${details.ipAddress}`,
      UNUSUAL_ACCESS_PATTERN: `Unusual access pattern for user ${details.userId}: IP changed from ${details.previousIp} to ${details.currentIp}`
    };
    
    return descriptions[alertType] || `Security alert: ${alertType}`;
  }
  
  /**
   * Send external alert (placeholder for integration)
   * @param {Object} alert - Alert to send
   */
  async sendExternalAlert(alert) {
    // Placeholder for external alerting integration
    // Could integrate with:
    // - Slack webhooks
    // - Email notifications
    // - PagerDuty
    // - SMS alerts
    // - Security dashboard
    
    console.log('External alert would be sent:', alert.type);
  }
  
  /**
   * Helper: Get recent events for pattern analysis
   * @param {string} key - Event key
   * @param {number} timeWindow - Time window in milliseconds
   * @returns {Array} Recent event timestamps
   */
  getRecentEvents(key, timeWindow) {
    const events = this.recentEvents.get(key) || [];
    const cutoff = Date.now() - timeWindow;
    return events.filter(timestamp => timestamp > cutoff);
  }
  
  /**
   * Helper: Set recent events with cleanup
   * @param {string} key - Event key
   * @param {Array} events - Event timestamps
   * @param {number} timeWindow - Time window in milliseconds
   */
  setRecentEvents(key, events, timeWindow) {
    const cutoff = Date.now() - timeWindow;
    const filteredEvents = events.filter(timestamp => timestamp > cutoff);
    this.recentEvents.set(key, filteredEvents);
  }
  
  /**
   * Get client IP from request
   * @param {Object} req - Express request object
   * @returns {string} Client IP address
   */
  getClientIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
           req.headers['x-real-ip'] ||
           req.connection?.remoteAddress ||
           req.socket?.remoteAddress ||
           req.ip ||
           'unknown';
  }
  
  // High-level audit logging methods for common events
  
  async logUserLogin(userId, req, success = true, details = {}) {
    await this.logEvent({
      eventType: success ? AuditEventType.USER_LOGIN : AuditEventType.USER_LOGIN_FAILED,
      userId,
      ipAddress: this.getClientIP(req),
      userAgent: req.headers['user-agent'],
      correlationId: req.correlationId,
      success,
      details: {
        loginMethod: 'password',
        mfaUsed: false,
        ...details
      }
    });
  }
  
  async logDataAccess(userId, resourceType, resourceId, req, details = {}) {
    await this.logEvent({
      eventType: AuditEventType.TASK_VIEWED,
      userId,
      resourceType,
      resourceId,
      ipAddress: this.getClientIP(req),
      correlationId: req.correlationId,
      details: {
        accessMethod: 'api',
        fields: req.query?.fields || 'all',
        ...details
      }
    });
  }
  
  async logSecurityViolation(violation, req, details = {}) {
    await this.logEvent({
      eventType: AuditEventType.SECURITY_VIOLATION,
      userId: req.authContext?.user?.id,
      ipAddress: this.getClientIP(req),
      userAgent: req.headers['user-agent'],
      correlationId: req.correlationId,
      success: false,
      details: {
        violation,
        ...details
      }
    });
  }
  
  async logApiKeyUsage(keyId, userId, req, success = true, details = {}) {
    await this.logEvent({
      eventType: success ? AuditEventType.API_KEY_USED : AuditEventType.API_KEY_FAILED,
      userId,
      resourceType: 'ApiKey',
      resourceId: keyId,
      ipAddress: this.getClientIP(req),
      correlationId: req.correlationId,
      success,
      details
    });
  }
}

module.exports = {
  AuditLogger,
  AuditEventType
};