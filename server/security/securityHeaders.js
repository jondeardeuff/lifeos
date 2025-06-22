/**
 * Security Headers Configuration
 * Provides comprehensive HTTP security headers for protection against common attacks
 */
class SecurityHeaders {
  constructor(config = {}) {
    this.config = {
      // Content Security Policy settings
      csp: {
        enabled: true,
        reportOnly: false,
        reportUri: null,
        ...config.csp
      },
      
      // HSTS settings
      hsts: {
        enabled: true,
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: false,
        ...config.hsts
      },
      
      // Feature/Permissions Policy settings
      permissionsPolicy: {
        enabled: true,
        ...config.permissionsPolicy
      },
      
      // Additional headers
      noSniff: config.noSniff !== false,
      frameDeny: config.frameDeny !== false,
      xssProtection: config.xssProtection !== false,
      referrerPolicy: config.referrerPolicy || 'strict-origin-when-cross-origin',
      
      // Environment-specific settings
      environment: config.environment || process.env.NODE_ENV || 'development'
    };
  }
  
  /**
   * Apply security headers middleware
   * @param {Object} app - Express app instance
   */
  static applySecurityHeaders(app, config = {}) {
    const headers = new SecurityHeaders(config);
    
    app.use((req, res, next) => {
      headers.setHeaders(req, res);
      next();
    });
  }
  
  /**
   * Set all security headers
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  setHeaders(req, res) {
    // Content Security Policy
    if (this.config.csp.enabled) {
      this.setContentSecurityPolicy(req, res);
    }
    
    // HTTP Strict Transport Security
    if (this.config.hsts.enabled && this.isSecureConnection(req)) {
      this.setHSTS(res);
    }
    
    // X-Content-Type-Options
    if (this.config.noSniff) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }
    
    // X-Frame-Options
    if (this.config.frameDeny) {
      res.setHeader('X-Frame-Options', 'DENY');
    }
    
    // X-XSS-Protection
    if (this.config.xssProtection) {
      res.setHeader('X-XSS-Protection', '1; mode=block');
    }
    
    // Referrer Policy
    if (this.config.referrerPolicy) {
      res.setHeader('Referrer-Policy', this.config.referrerPolicy);
    }
    
    // Permissions Policy
    if (this.config.permissionsPolicy.enabled) {
      this.setPermissionsPolicy(res);
    }
    
    // Cross-Origin policies
    this.setCrossOriginPolicies(res);
    
    // Remove server information
    this.removeServerHeaders(res);
  }
  
  /**
   * Set Content Security Policy header
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  setContentSecurityPolicy(req, res) {
    const cspDirectives = this.getCSPDirectives(req);
    
    const csp = Object.entries(cspDirectives)
      .filter(([directive, sources]) => sources.length > 0)
      .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
      .join('; ');
    
    const headerName = this.config.csp.reportOnly ? 
      'Content-Security-Policy-Report-Only' : 
      'Content-Security-Policy';
    
    res.setHeader(headerName, csp);
  }
  
  /**
   * Get CSP directives based on request context
   * @param {Object} req - Express request object
   * @returns {Object} CSP directives
   */
  getCSPDirectives(req) {
    const isApiEndpoint = req.path.startsWith('/api/') || req.path.startsWith('/graphql');
    const isDocsEndpoint = req.path.startsWith('/api-docs') || req.path.startsWith('/docs');
    
    if (isApiEndpoint) {
      return this.getAPICSPDirectives();
    } else if (isDocsEndpoint) {
      return this.getDocsCSPDirectives();
    } else {
      return this.getWebAppCSPDirectives();
    }
  }
  
  /**
   * Get CSP directives for API endpoints
   * @returns {Object} API CSP directives
   */
  getAPICSPDirectives() {
    return {
      'default-src': ["'none'"],
      'frame-ancestors': ["'none'"],
      'base-uri': ["'none'"],
      'form-action': ["'none'"]
    };
  }
  
  /**
   * Get CSP directives for documentation endpoints
   * @returns {Object} Docs CSP directives
   */
  getDocsCSPDirectives() {
    return {
      'default-src': ["'self'"],
      'script-src': [
        "'self'", 
        "'unsafe-inline'", // Required for Swagger UI
        'https://cdn.jsdelivr.net',
        'https://unpkg.com'
      ],
      'style-src': [
        "'self'", 
        "'unsafe-inline'", // Required for Swagger UI
        'https://fonts.googleapis.com'
      ],
      'font-src': [
        "'self'",
        'https://fonts.gstatic.com'
      ],
      'img-src': [
        "'self'",
        'data:',
        'https:'
      ],
      'connect-src': ["'self'"],
      'frame-ancestors': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"]
    };
  }
  
  /**
   * Get CSP directives for web application
   * @returns {Object} Web app CSP directives
   */
  getWebAppCSPDirectives() {
    const directives = {
      'default-src': ["'self'"],
      'script-src': [
        "'self'"
      ],
      'style-src': [
        "'self'",
        'https://fonts.googleapis.com'
      ],
      'font-src': [
        "'self'",
        'https://fonts.gstatic.com'
      ],
      'img-src': [
        "'self'",
        'data:',
        'blob:',
        'https:'
      ],
      'media-src': [
        "'self'",
        'blob:'
      ],
      'connect-src': [
        "'self'",
        'wss:',
        'https:'
      ],
      'worker-src': [
        "'self'",
        'blob:'
      ],
      'frame-src': ["'none'"],
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'frame-ancestors': ["'none'"],
      'upgrade-insecure-requests': []
    };
    
    // Allow unsafe-inline for development
    if (this.config.environment === 'development') {
      directives['script-src'].push("'unsafe-inline'");
      directives['style-src'].push("'unsafe-inline'");
    }
    
    // Add report URI if configured
    if (this.config.csp.reportUri) {
      directives['report-uri'] = [this.config.csp.reportUri];
    }
    
    return directives;
  }
  
  /**
   * Set HTTP Strict Transport Security header
   * @param {Object} res - Express response object
   */
  setHSTS(res) {
    let hstsValue = `max-age=${this.config.hsts.maxAge}`;
    
    if (this.config.hsts.includeSubDomains) {
      hstsValue += '; includeSubDomains';
    }
    
    if (this.config.hsts.preload) {
      hstsValue += '; preload';
    }
    
    res.setHeader('Strict-Transport-Security', hstsValue);
  }
  
  /**
   * Set Permissions Policy header
   * @param {Object} res - Express response object
   */
  setPermissionsPolicy(res) {
    const permissions = [
      'camera=()',           // Disable camera by default
      'microphone=(self)',   // Allow microphone for voice features
      'geolocation=()',      // Disable geolocation
      'payment=()',          // Disable payment API
      'usb=()',             // Disable USB API
      'bluetooth=()',       // Disable Bluetooth API
      'accelerometer=()',   // Disable accelerometer
      'gyroscope=()',       // Disable gyroscope
      'magnetometer=()',    // Disable magnetometer
      'ambient-light-sensor=()', // Disable ambient light sensor
      'autoplay=()',        // Disable autoplay
      'encrypted-media=()', // Disable encrypted media
      'fullscreen=(self)',  // Allow fullscreen on same origin
      'picture-in-picture=()', // Disable picture-in-picture
      'sync-xhr=()'         // Disable synchronous XHR
    ];
    
    res.setHeader('Permissions-Policy', permissions.join(', '));
  }
  
  /**
   * Set Cross-Origin policies
   * @param {Object} res - Express response object
   */
  setCrossOriginPolicies(res) {
    // Cross-Origin-Embedder-Policy
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    
    // Cross-Origin-Opener-Policy
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    
    // Cross-Origin-Resource-Policy
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  }
  
  /**
   * Remove server information headers
   * @param {Object} res - Express response object
   */
  removeServerHeaders(res) {
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');
    res.removeHeader('X-AspNet-Version');
    res.removeHeader('X-AspNetMvc-Version');
  }
  
  /**
   * Check if connection is secure
   * @param {Object} req - Express request object
   * @returns {boolean} True if connection is secure
   */
  isSecureConnection(req) {
    return req.secure || 
           req.headers['x-forwarded-proto'] === 'https' ||
           req.headers['x-forwarded-ssl'] === 'on';
  }
  
  /**
   * Create dynamic CSP for specific routes
   * @param {string} routeType - Type of route (api, webapp, docs, admin)
   * @returns {Function} Express middleware
   */
  static dynamicCSP(routeType) {
    return (req, res, next) => {
      let csp = '';
      
      switch (routeType) {
        case 'api':
          csp = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none';";
          break;
          
        case 'webapp':
          csp = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' wss: https:; frame-ancestors 'none';";
          break;
          
        case 'docs':
          csp = "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; frame-ancestors 'none';";
          break;
          
        case 'admin':
          csp = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; form-action 'self';";
          break;
          
        default:
          csp = "default-src 'self'; frame-ancestors 'none';";
      }
      
      res.setHeader('Content-Security-Policy', csp);
      next();
    };
  }
  
  /**
   * CSP violation report handler
   * @returns {Function} Express middleware
   */
  static cspReportHandler() {
    return (req, res, next) => {
      if (req.path === '/csp-violation-report') {
        // Log CSP violations for security monitoring
        console.warn('CSP Violation Report:', req.body);
        
        // Store violation in security incident log
        if (req.auditLogger) {
          req.auditLogger.logSecurityViolation('CSP_VIOLATION', req, {
            violation: req.body,
            userAgent: req.headers['user-agent'],
            referer: req.headers.referer
          });
        }
        
        return res.status(204).send();
      }
      next();
    };
  }
  
  /**
   * Create nonce for inline scripts/styles
   * @returns {string} Base64 encoded nonce
   */
  static createNonce() {
    return require('crypto').randomBytes(16).toString('base64');
  }
  
  /**
   * Middleware to add nonce to response locals
   * @returns {Function} Express middleware
   */
  static addNonce() {
    return (req, res, next) => {
      res.locals.scriptNonce = SecurityHeaders.createNonce();
      res.locals.styleNonce = SecurityHeaders.createNonce();
      next();
    };
  }
  
  /**
   * Get CSP with nonces for inline scripts/styles
   * @param {string} scriptNonce - Script nonce
   * @param {string} styleNonce - Style nonce
   * @returns {string} CSP header value
   */
  static getCSPWithNonces(scriptNonce, styleNonce) {
    return `default-src 'self'; script-src 'self' 'nonce-${scriptNonce}'; style-src 'self' 'nonce-${styleNonce}'; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none';`;
  }
}

/**
 * Security Headers Validator
 * Validates that security headers are properly set
 */
class SecurityHeadersValidator {
  /**
   * Validate security headers in response
   * @param {Object} res - Express response object
   * @returns {Object} Validation results
   */
  static validateHeaders(res) {
    const headers = res.getHeaders();
    const results = {
      passed: [],
      failed: [],
      warnings: []
    };
    
    // Check required security headers
    const requiredHeaders = [
      'content-security-policy',
      'x-content-type-options',
      'x-frame-options',
      'referrer-policy'
    ];
    
    requiredHeaders.forEach(header => {
      if (headers[header]) {
        results.passed.push(`${header}: ${headers[header]}`);
      } else {
        results.failed.push(`Missing header: ${header}`);
      }
    });
    
    // Check HSTS for HTTPS
    if (headers['strict-transport-security']) {
      results.passed.push(`strict-transport-security: ${headers['strict-transport-security']}`);
    } else {
      results.warnings.push('Missing HSTS header (only required for HTTPS)');
    }
    
    // Check for removed headers
    const unwantedHeaders = ['x-powered-by', 'server'];
    unwantedHeaders.forEach(header => {
      if (!headers[header]) {
        results.passed.push(`${header}: properly removed`);
      } else {
        results.failed.push(`Unwanted header present: ${header}`);
      }
    });
    
    return results;
  }
  
  /**
   * Generate security headers report
   * @param {Object} res - Express response object
   * @returns {string} Security report
   */
  static generateReport(res) {
    const validation = this.validateHeaders(res);
    
    let report = '🔒 Security Headers Report\n';
    report += '========================\n\n';
    
    if (validation.passed.length > 0) {
      report += '✅ Passed:\n';
      validation.passed.forEach(item => {
        report += `  • ${item}\n`;
      });
      report += '\n';
    }
    
    if (validation.failed.length > 0) {
      report += '❌ Failed:\n';
      validation.failed.forEach(item => {
        report += `  • ${item}\n`;
      });
      report += '\n';
    }
    
    if (validation.warnings.length > 0) {
      report += '⚠️  Warnings:\n';
      validation.warnings.forEach(item => {
        report += `  • ${item}\n`;
      });
      report += '\n';
    }
    
    const score = Math.round((validation.passed.length / (validation.passed.length + validation.failed.length)) * 100);
    report += `📊 Security Score: ${score}%\n`;
    
    return report;
  }
}

module.exports = {
  SecurityHeaders,
  SecurityHeadersValidator
};