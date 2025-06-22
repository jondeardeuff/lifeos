const { DataEncryption, PrismaEncryption, EncryptionKeyManager } = require('./encryption');
const { AuditLogger, AuditEventType } = require('./auditLogger');
const { InputSanitizer, GraphQLInputValidator, RequestValidator, ValidationError } = require('./inputValidator');
const { CSRFProtection, DoubleSubmitCSRF } = require('./csrfProtection');
const { SecurityHeaders, SecurityHeadersValidator } = require('./securityHeaders');
const { DataMasking } = require('./dataMasking');

/**
 * Comprehensive Security Manager
 * Orchestrates all security components and provides unified configuration
 */
class SecurityManager {
  constructor(config = {}) {
    this.config = {
      encryption: {
        enabled: true,
        masterKey: process.env.ENCRYPTION_MASTER_KEY,
        keyRotationDays: 90,
        ...config.encryption
      },
      audit: {
        enabled: true,
        logLevel: 'info',
        enablePatternAnalysis: true,
        ...config.audit
      },
      csrf: {
        enabled: true,
        type: 'stateful', // 'stateful' or 'double-submit'
        ...config.csrf
      },
      headers: {
        enabled: true,
        csp: {
          enabled: true,
          reportOnly: false
        },
        ...config.headers
      },
      masking: {
        enabled: true,
        defaultRole: 'user',
        ...config.masking
      },
      validation: {
        enabled: true,
        strictMode: true,
        ...config.validation
      },
      environment: process.env.NODE_ENV || 'development'
    };
    
    this.components = {};
    this.initialized = false;
  }
  
  /**
   * Initialize all security components
   * @param {Object} dependencies - Required dependencies (logger, prisma, etc.)
   * @returns {Promise<void>}
   */
  async initialize(dependencies = {}) {
    if (this.initialized) {
      console.warn('SecurityManager already initialized');
      return;
    }
    
    const { logger, prisma } = dependencies;
    
    try {
      // Initialize encryption
      if (this.config.encryption.enabled) {
        await this.initializeEncryption(prisma);
      }
      
      // Initialize audit logging
      if (this.config.audit.enabled) {
        this.initializeAuditLogging(logger, prisma);
      }
      
      // Initialize CSRF protection
      if (this.config.csrf.enabled) {
        this.initializeCSRFProtection();
      }
      
      // Initialize security headers
      if (this.config.headers.enabled) {
        this.initializeSecurityHeaders();
      }
      
      // Initialize data masking
      if (this.config.masking.enabled) {
        this.initializeDataMasking();
      }
      
      // Initialize input validation
      if (this.config.validation.enabled) {
        this.initializeInputValidation();
      }
      
      this.initialized = true;
      console.log('✅ SecurityManager initialized successfully');
      
      // Log security configuration
      if (this.components.auditLogger) {
        await this.components.auditLogger.logEvent({
          eventType: 'SECURITY_SYSTEM_INITIALIZED',
          details: this.getSecuritySummary(),
          success: true
        });
      }
      
    } catch (error) {
      console.error('❌ SecurityManager initialization failed:', error);
      throw error;
    }
  }
  
  /**
   * Initialize encryption components
   * @param {Object} prisma - Prisma client
   */
  async initializeEncryption(prisma) {
    try {
      const keyManager = new EncryptionKeyManager();
      
      if (!this.config.encryption.masterKey) {
        console.warn('⚠️  No encryption master key provided - generating new key');
        const newKey = DataEncryption.generateMasterKey();
        console.log('🔑 Generated new encryption key:', newKey);
        console.log('🔑 Set ENCRYPTION_MASTER_KEY environment variable with this key');
        keyManager.initialize(newKey);
      } else {
        keyManager.initialize(this.config.encryption.masterKey);
      }
      
      const encryption = keyManager.getActiveEncryption();
      
      // Validate encryption
      if (!encryption.validateConfig()) {
        throw new Error('Encryption validation failed');
      }
      
      // Set up Prisma encryption middleware
      if (prisma) {
        const prismaEncryption = new PrismaEncryption(encryption);
        prisma.$use(prismaEncryption.createMiddleware());
        this.components.prismaEncryption = prismaEncryption;
      }
      
      this.components.encryption = encryption;
      this.components.keyManager = keyManager;
      
      console.log('🔒 Encryption system initialized');
    } catch (error) {
      console.error('Encryption initialization failed:', error);
      if (this.config.environment === 'production') {
        throw error;
      }
      console.warn('⚠️  Continuing without encryption in development mode');
    }
  }
  
  /**
   * Initialize audit logging
   * @param {Object} logger - Winston logger
   * @param {Object} prisma - Prisma client
   */
  initializeAuditLogging(logger, prisma) {
    if (!logger) {
      console.warn('⚠️  No logger provided for audit logging');
      return;
    }
    
    this.components.auditLogger = new AuditLogger(logger, prisma);
    console.log('📋 Audit logging initialized');
  }
  
  /**
   * Initialize CSRF protection
   */
  initializeCSRFProtection() {
    if (this.config.csrf.type === 'double-submit') {
      this.components.csrf = new DoubleSubmitCSRF(this.config.csrf);
    } else {
      this.components.csrf = new CSRFProtection(this.config.csrf);
    }
    
    console.log(`🛡️  CSRF protection initialized (${this.config.csrf.type})`);
  }
  
  /**
   * Initialize security headers
   */
  initializeSecurityHeaders() {
    this.components.securityHeaders = new SecurityHeaders(this.config.headers);
    console.log('🔐 Security headers initialized');
  }
  
  /**
   * Initialize data masking
   */
  initializeDataMasking() {
    this.components.dataMasking = new DataMasking();
    console.log('🎭 Data masking initialized');
  }
  
  /**
   * Initialize input validation
   */
  initializeInputValidation() {
    this.components.inputSanitizer = InputSanitizer;
    this.components.graphQLValidator = GraphQLInputValidator;
    this.components.requestValidator = RequestValidator;
    console.log('✅ Input validation initialized');
  }
  
  /**
   * Create Express middleware stack for security
   * @param {Object} options - Middleware options
   * @returns {Array} Array of middleware functions
   */
  createMiddlewareStack(options = {}) {
    if (!this.initialized) {
      throw new Error('SecurityManager must be initialized before creating middleware');
    }
    
    const middlewares = [];
    
    // Security headers (first)
    if (this.components.securityHeaders) {
      middlewares.push((req, res, next) => {
        this.components.securityHeaders.setHeaders(req, res);
        next();
      });
    }
    
    // Audit logging middleware
    if (this.components.auditLogger) {
      middlewares.push((req, res, next) => {
        req.auditLogger = this.components.auditLogger;
        next();
      });
    }
    
    // CSRF protection (for non-API routes)
    if (this.components.csrf && !options.skipCSRF) {
      middlewares.push(this.components.csrf.middleware());
    }
    
    // Data masking middleware
    if (this.components.dataMasking && !options.skipMasking) {
      middlewares.push(this.components.dataMasking.createMaskingMiddleware());
    }
    
    // Input validation error handler
    middlewares.push((error, req, res, next) => {
      if (error instanceof ValidationError) {
        // Log validation error
        if (req.auditLogger) {
          req.auditLogger.logSecurityViolation('INPUT_VALIDATION_FAILED', req, {
            error: error.message,
            field: error.field,
            value: error.value ? '[REDACTED]' : undefined
          });
        }
        
        return res.status(400).json({
          error: 'Validation Error',
          message: error.message,
          code: 'VALIDATION_ERROR',
          statusCode: 400
        });
      }
      next(error);
    });
    
    return middlewares;
  }
  
  /**
   * Create GraphQL context enhancer
   * @param {Object} baseContext - Base GraphQL context
   * @returns {Object} Enhanced context with security components
   */
  enhanceGraphQLContext(baseContext) {
    return {
      ...baseContext,
      security: {
        auditLogger: this.components.auditLogger,
        dataMasking: this.components.dataMasking,
        inputValidator: this.components.graphQLValidator,
        encryption: this.components.encryption
      }
    };
  }
  
  /**
   * Validate and sanitize GraphQL input
   * @param {string} operation - GraphQL operation name
   * @param {Object} input - Input to validate
   * @param {Object} context - GraphQL context
   * @returns {Object} Validated and sanitized input
   */
  validateGraphQLInput(operation, input, context) {
    if (!this.components.graphQLValidator) {
      return input;
    }
    
    try {
      switch (operation) {
        case 'createTask':
        case 'updateTask':
          return this.components.graphQLValidator.validateTaskInput(input);
        
        case 'signup':
        case 'updateUser':
          return this.components.graphQLValidator.validateUserInput(input);
        
        default:
          return input;
      }
    } catch (error) {
      // Log security violation
      if (context.security?.auditLogger) {
        context.security.auditLogger.logSecurityViolation('GRAPHQL_INPUT_VALIDATION_FAILED', {
          headers: { 'user-agent': 'graphql' }
        }, {
          operation,
          error: error.message
        });
      }
      throw error;
    }
  }
  
  /**
   * Log security event
   * @param {string} eventType - Type of security event
   * @param {Object} req - Express request object
   * @param {Object} details - Additional details
   * @returns {Promise<void>}
   */
  async logSecurityEvent(eventType, req, details = {}) {
    if (!this.components.auditLogger) {
      return;
    }
    
    await this.components.auditLogger.logEvent({
      eventType,
      userId: req.authContext?.user?.id,
      ipAddress: this.components.auditLogger.getClientIP(req),
      userAgent: req.headers['user-agent'],
      correlationId: req.correlationId,
      details
    });
  }
  
  /**
   * Encrypt sensitive data
   * @param {string} data - Data to encrypt
   * @param {string} context - Encryption context
   * @returns {Promise<string>} Encrypted data
   */
  async encryptData(data, context = '') {
    if (!this.components.encryption) {
      return data;
    }
    
    return await this.components.encryption.encryptField(data, context);
  }
  
  /**
   * Decrypt sensitive data
   * @param {string} encryptedData - Encrypted data
   * @param {string} context - Decryption context
   * @returns {Promise<string>} Decrypted data
   */
  async decryptData(encryptedData, context = '') {
    if (!this.components.encryption) {
      return encryptedData;
    }
    
    return await this.components.encryption.decryptField(encryptedData, context);
  }
  
  /**
   * Mask sensitive data for response
   * @param {*} data - Data to mask
   * @param {string} userRole - User role
   * @returns {*} Masked data
   */
  maskData(data, userRole = 'user') {
    if (!this.components.dataMasking) {
      return data;
    }
    
    return this.components.dataMasking.maskSensitiveData(data, userRole);
  }
  
  /**
   * Get security configuration summary
   * @returns {Object} Security configuration summary
   */
  getSecuritySummary() {
    return {
      encryption: {
        enabled: !!this.components.encryption,
        algorithm: this.components.encryption ? 'AES-256-GCM' : null
      },
      auditLogging: {
        enabled: !!this.components.auditLogger,
        patternAnalysis: this.config.audit.enablePatternAnalysis
      },
      csrf: {
        enabled: !!this.components.csrf,
        type: this.config.csrf.type
      },
      headers: {
        enabled: !!this.components.securityHeaders,
        csp: this.config.headers.csp.enabled
      },
      masking: {
        enabled: !!this.components.dataMasking
      },
      validation: {
        enabled: !!this.components.inputSanitizer,
        strictMode: this.config.validation.strictMode
      },
      environment: this.config.environment
    };
  }
  
  /**
   * Run security health check
   * @returns {Object} Health check results
   */
  async runHealthCheck() {
    const results = {
      overall: 'healthy',
      components: {},
      warnings: [],
      errors: []
    };
    
    // Check encryption
    if (this.components.encryption) {
      try {
        const isValid = this.components.encryption.validateConfig();
        results.components.encryption = isValid ? 'healthy' : 'unhealthy';
        if (!isValid) {
          results.errors.push('Encryption validation failed');
        }
      } catch (error) {
        results.components.encryption = 'error';
        results.errors.push(`Encryption error: ${error.message}`);
      }
    } else {
      results.components.encryption = 'disabled';
      if (this.config.environment === 'production') {
        results.warnings.push('Encryption disabled in production');
      }
    }
    
    // Check audit logging
    results.components.auditLogging = this.components.auditLogger ? 'healthy' : 'disabled';
    
    // Check CSRF
    results.components.csrf = this.components.csrf ? 'healthy' : 'disabled';
    
    // Check headers
    results.components.securityHeaders = this.components.securityHeaders ? 'healthy' : 'disabled';
    
    // Check masking
    results.components.dataMasking = this.components.dataMasking ? 'healthy' : 'disabled';
    
    // Check validation
    results.components.inputValidation = this.components.inputSanitizer ? 'healthy' : 'disabled';
    
    // Determine overall health
    if (results.errors.length > 0) {
      results.overall = 'unhealthy';
    } else if (results.warnings.length > 0) {
      results.overall = 'degraded';
    }
    
    return results;
  }
  
  /**
   * Generate security report
   * @returns {string} Security report
   */
  async generateSecurityReport() {
    const summary = this.getSecuritySummary();
    const health = await this.runHealthCheck();
    
    let report = '🔒 LifeOS Security Report\n';
    report += '========================\n\n';
    
    report += '📊 Component Status:\n';
    Object.entries(health.components).forEach(([component, status]) => {
      const icon = status === 'healthy' ? '✅' : status === 'disabled' ? '⚠️' : '❌';
      report += `  ${icon} ${component}: ${status}\n`;
    });
    
    report += '\n🔧 Configuration:\n';
    report += `  • Environment: ${summary.environment}\n`;
    report += `  • Encryption: ${summary.encryption.enabled ? '✅ AES-256-GCM' : '❌ Disabled'}\n`;
    report += `  • Audit Logging: ${summary.auditLogging.enabled ? '✅ Enabled' : '❌ Disabled'}\n`;
    report += `  • CSRF Protection: ${summary.csrf.enabled ? `✅ ${summary.csrf.type}` : '❌ Disabled'}\n`;
    report += `  • Security Headers: ${summary.headers.enabled ? '✅ Enabled' : '❌ Disabled'}\n`;
    report += `  • Data Masking: ${summary.masking.enabled ? '✅ Enabled' : '❌ Disabled'}\n`;
    report += `  • Input Validation: ${summary.validation.enabled ? '✅ Enabled' : '❌ Disabled'}\n`;
    
    if (health.warnings.length > 0) {
      report += '\n⚠️  Warnings:\n';
      health.warnings.forEach(warning => {
        report += `  • ${warning}\n`;
      });
    }
    
    if (health.errors.length > 0) {
      report += '\n❌ Errors:\n';
      health.errors.forEach(error => {
        report += `  • ${error}\n`;
      });
    }
    
    report += `\n📈 Overall Status: ${health.overall.toUpperCase()}\n`;
    
    return report;
  }
  
  /**
   * Cleanup resources on shutdown
   */
  async destroy() {
    if (this.components.csrf && typeof this.components.csrf.destroy === 'function') {
      this.components.csrf.destroy();
    }
    
    console.log('🔒 SecurityManager destroyed');
  }
}

module.exports = {
  SecurityManager,
  AuditEventType,
  ValidationError
};