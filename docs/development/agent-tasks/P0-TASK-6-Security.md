# P0 Task 6: Security Implementation

## Agent Assignment
**Agent Focus**: Security & Compliance  
**Priority**: P0 (Critical - Phase 1 MVP)  
**Dependencies**: Authentication system, API Gateway  
**Estimated Duration**: 4-5 days  

## Objective
Implement comprehensive security measures including data encryption at rest and in transit, audit logging, input validation, CSRF protection, security headers, data masking, and penetration testing to ensure LifeOS meets enterprise-grade security standards.

## Technical Context
- **Encryption**: AES-256 for data at rest, TLS 1.3 for transport
- **Framework**: Node.js with existing infrastructure
- **Compliance**: GDPR, CCPA, SOC 2 readiness
- **Database**: PostgreSQL with row-level security
- **Audit**: Comprehensive logging for security events

## Detailed Subtasks

### 1. Implement Data Encryption at Rest
```typescript
// Location: server/security/encryption.ts
import crypto from 'crypto';

interface EncryptionConfig {
  algorithm: string;
  keySize: number;
  ivSize: number;
  saltSize: number;
  tagSize: number;
  iterations: number;
}

class DataEncryption {
  private config: EncryptionConfig = {
    algorithm: 'aes-256-gcm',
    keySize: 32, // 256 bits
    ivSize: 16,  // 128 bits
    saltSize: 16,
    tagSize: 16,
    iterations: 100000
  };
  
  private masterKey: Buffer;
  
  constructor(masterKeyBase64: string) {
    this.masterKey = Buffer.from(masterKeyBase64, 'base64');
    if (this.masterKey.length !== this.config.keySize) {
      throw new Error('Invalid master key size');
    }
  }
  
  // Encrypt sensitive data fields
  async encryptField(plaintext: string, context?: string): Promise<string> {
    const salt = crypto.randomBytes(this.config.saltSize);
    const iv = crypto.randomBytes(this.config.ivSize);
    
    // Derive encryption key using PBKDF2
    const key = crypto.pbkdf2Sync(this.masterKey, salt, this.config.iterations, this.config.keySize, 'sha256');
    
    // Create cipher
    const cipher = crypto.createCipherGCM(this.config.algorithm, key, iv);
    
    // Add context for additional authentication data
    if (context) {
      cipher.setAAD(Buffer.from(context, 'utf8'));
    }
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    // Combine salt, iv, tag, and encrypted data
    const combined = Buffer.concat([
      salt,
      iv,
      tag,
      Buffer.from(encrypted, 'hex')
    ]);
    
    return combined.toString('base64');
  }
  
  // Decrypt sensitive data fields
  async decryptField(encryptedData: string, context?: string): Promise<string> {
    const combined = Buffer.from(encryptedData, 'base64');
    
    // Extract components
    const salt = combined.subarray(0, this.config.saltSize);
    const iv = combined.subarray(this.config.saltSize, this.config.saltSize + this.config.ivSize);
    const tag = combined.subarray(this.config.saltSize + this.config.ivSize, this.config.saltSize + this.config.ivSize + this.config.tagSize);
    const encrypted = combined.subarray(this.config.saltSize + this.config.ivSize + this.config.tagSize);
    
    // Derive decryption key
    const key = crypto.pbkdf2Sync(this.masterKey, salt, this.config.iterations, this.config.keySize, 'sha256');
    
    // Create decipher
    const decipher = crypto.createDecipherGCM(this.config.algorithm, key, iv);
    decipher.setAuthTag(tag);
    
    if (context) {
      decipher.setAAD(Buffer.from(context, 'utf8'));
    }
    
    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
  
  // Generate new master key
  static generateMasterKey(): string {
    return crypto.randomBytes(32).toString('base64');
  }
}

// Prisma middleware for automatic encryption/decryption
class PrismaEncryption {
  private encryption: DataEncryption;
  private encryptedFields = new Set([
    'email', 'phone', 'bankAccount', 'ssn', 'personalData'
  ]);
  
  constructor(encryption: DataEncryption) {
    this.encryption = encryption;
  }
  
  // Middleware for encrypting data before storage
  encryptionMiddleware() {
    return async (params: any, next: any) => {
      // Encrypt on create/update
      if (['create', 'update', 'upsert'].includes(params.action)) {
        await this.encryptDataFields(params.args.data);
      }
      
      const result = await next(params);
      
      // Decrypt on read
      if (['findUnique', 'findFirst', 'findMany'].includes(params.action)) {
        await this.decryptResult(result);
      }
      
      return result;
    };
  }
  
  private async encryptDataFields(data: any, tableName?: string): Promise<void> {
    if (!data || typeof data !== 'object') return;
    
    for (const [key, value] of Object.entries(data)) {
      if (this.encryptedFields.has(key) && typeof value === 'string') {
        data[key] = await this.encryption.encryptField(value, `${tableName}.${key}`);
      }
    }
  }
  
  private async decryptResult(result: any): Promise<void> {
    if (!result) return;
    
    const items = Array.isArray(result) ? result : [result];
    
    for (const item of items) {
      for (const [key, value] of Object.entries(item)) {
        if (this.encryptedFields.has(key) && typeof value === 'string') {
          try {
            item[key] = await this.encryption.decryptField(value, key);
          } catch (error) {
            // Handle decryption errors gracefully
            console.error(`Failed to decrypt field ${key}:`, error);
            item[key] = '[ENCRYPTED]';
          }
        }
      }
    }
  }
}
```

### 2. Add Transport Layer Security (TLS 1.3)
```typescript
// Location: server/security/tls.ts
import https from 'https';
import fs from 'fs';

interface TLSConfig {
  key: string;
  cert: string;
  ca?: string;
  secureProtocol: string;
  ciphers: string;
  honorCipherOrder: boolean;
  minVersion: string;
  maxVersion: string;
}

class TLSConfiguration {
  static createSecureServer(app: any, config?: Partial<TLSConfig>) {
    const tlsConfig: TLSConfig = {
      key: fs.readFileSync(process.env.TLS_KEY_PATH || './ssl/server.key'),
      cert: fs.readFileSync(process.env.TLS_CERT_PATH || './ssl/server.crt'),
      ca: process.env.TLS_CA_PATH ? fs.readFileSync(process.env.TLS_CA_PATH) : undefined,
      secureProtocol: 'TLSv1_3_method',
      ciphers: [
        'TLS_AES_256_GCM_SHA384',
        'TLS_CHACHA20_POLY1305_SHA256',
        'TLS_AES_128_GCM_SHA256',
        'ECDHE-RSA-AES256-GCM-SHA384',
        'ECDHE-RSA-AES128-GCM-SHA256'
      ].join(':'),
      honorCipherOrder: true,
      minVersion: 'TLSv1.2',
      maxVersion: 'TLSv1.3',
      ...config
    };
    
    const server = https.createServer(tlsConfig, app);
    
    // Security event handlers
    server.on('secureConnection', (tlsSocket) => {
      this.logSecureConnection(tlsSocket);
    });
    
    server.on('clientError', (err, socket) => {
      this.logTLSError(err, socket);
    });
    
    return server;
  }
  
  static configureSecurityHeaders(app: any) {
    app.use((req: any, res: any, next: any) => {
      // Strict Transport Security
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
      
      // Content Security Policy
      res.setHeader('Content-Security-Policy', 
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: https:; " +
        "connect-src 'self' wss: https:; " +
        "font-src 'self'; " +
        "object-src 'none'; " +
        "media-src 'self'; " +
        "frame-src 'none';"
      );
      
      // X-Content-Type-Options
      res.setHeader('X-Content-Type-Options', 'nosniff');
      
      // X-Frame-Options
      res.setHeader('X-Frame-Options', 'DENY');
      
      // X-XSS-Protection
      res.setHeader('X-XSS-Protection', '1; mode=block');
      
      // Referrer Policy
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      
      // Permissions Policy
      res.setHeader('Permissions-Policy', 
        'camera=(), microphone=(), geolocation=(), payment=()'
      );
      
      next();
    });
  }
  
  private static logSecureConnection(tlsSocket: any) {
    const connectionInfo = {
      remoteAddress: tlsSocket.remoteAddress,
      protocol: tlsSocket.getProtocol(),
      cipher: tlsSocket.getCipher(),
      peerCertificate: tlsSocket.getPeerCertificate(),
      timestamp: new Date().toISOString()
    };
    
    console.log('Secure TLS connection established:', connectionInfo);
  }
  
  private static logTLSError(error: any, socket: any) {
    console.error('TLS connection error:', {
      error: error.message,
      code: error.code,
      remoteAddress: socket.remoteAddress,
      timestamp: new Date().toISOString()
    });
  }
}
```

### 3. Create Comprehensive Audit Logging
```typescript
// Location: server/security/auditLogger.ts
enum AuditEventType {
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  
  TASK_CREATED = 'TASK_CREATED',
  TASK_UPDATED = 'TASK_UPDATED',
  TASK_DELETED = 'TASK_DELETED',
  TASK_VIEWED = 'TASK_VIEWED',
  
  PROJECT_CREATED = 'PROJECT_CREATED',
  PROJECT_UPDATED = 'PROJECT_UPDATED',
  PROJECT_DELETED = 'PROJECT_DELETED',
  PROJECT_MEMBER_ADDED = 'PROJECT_MEMBER_ADDED',
  PROJECT_MEMBER_REMOVED = 'PROJECT_MEMBER_REMOVED',
  
  API_KEY_CREATED = 'API_KEY_CREATED',
  API_KEY_USED = 'API_KEY_USED',
  API_KEY_REVOKED = 'API_KEY_REVOKED',
  
  SECURITY_VIOLATION = 'SECURITY_VIOLATION',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  DATA_EXPORT = 'DATA_EXPORT',
  DATA_IMPORT = 'DATA_IMPORT',
  DATA_DELETED = 'DATA_DELETED'
}

interface AuditEvent {
  id: string;
  eventType: AuditEventType;
  userId?: string;
  sessionId?: string;
  resourceType?: string;
  resourceId?: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent?: string;
  correlationId?: string;
  timestamp: Date;
  success: boolean;
  riskScore?: number;
}

class AuditLogger {
  private secureLogger: any; // Winston with encryption
  
  constructor(secureLogger: any) {
    this.secureLogger = secureLogger;
  }
  
  async logEvent(event: Partial<AuditEvent>): Promise<void> {
    const auditEvent: AuditEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      success: true,
      riskScore: this.calculateRiskScore(event),
      ...event
    } as AuditEvent;
    
    // Log to secure audit log
    this.secureLogger.info('AUDIT_EVENT', auditEvent);
    
    // Store in database for querying
    await this.storeAuditEvent(auditEvent);
    
    // Check for suspicious patterns
    await this.analyzeSecurityPatterns(auditEvent);
  }
  
  // High-level audit functions for common events
  async logUserLogin(userId: string, req: any, success: boolean = true): Promise<void> {
    await this.logEvent({
      eventType: AuditEventType.USER_LOGIN,
      userId,
      ipAddress: this.getClientIP(req),
      userAgent: req.headers['user-agent'],
      correlationId: req.correlationId,
      success,
      details: {
        loginMethod: 'password',
        mfaUsed: false // TODO: implement MFA
      }
    });
  }
  
  async logDataAccess(userId: string, resourceType: string, resourceId: string, req: any): Promise<void> {
    await this.logEvent({
      eventType: AuditEventType.TASK_VIEWED,
      userId,
      resourceType,
      resourceId,
      ipAddress: this.getClientIP(req),
      correlationId: req.correlationId,
      details: {
        accessMethod: 'api',
        fields: req.query?.fields || 'all'
      }
    });
  }
  
  async logSecurityViolation(violation: string, req: any, details: any): Promise<void> {
    await this.logEvent({
      eventType: AuditEventType.SECURITY_VIOLATION,
      userId: req.authContext?.user?.id,
      ipAddress: this.getClientIP(req),
      userAgent: req.headers['user-agent'],
      correlationId: req.correlationId,
      success: false,
      riskScore: 10, // High risk
      details: {
        violation,
        ...details
      }
    });
  }
  
  private async storeAuditEvent(event: AuditEvent): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          id: event.id,
          eventType: event.eventType,
          userId: event.userId,
          resourceType: event.resourceType,
          resourceId: event.resourceId,
          details: event.details,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          correlationId: event.correlationId,
          timestamp: event.timestamp,
          success: event.success,
          riskScore: event.riskScore
        }
      });
    } catch (error) {
      // Critical: audit logging must not fail
      console.error('Failed to store audit event:', error);
    }
  }
  
  private calculateRiskScore(event: Partial<AuditEvent>): number {
    let score = 0;
    
    // Base score by event type
    const riskScores = {
      [AuditEventType.SECURITY_VIOLATION]: 10,
      [AuditEventType.PERMISSION_DENIED]: 8,
      [AuditEventType.API_KEY_CREATED]: 6,
      [AuditEventType.USER_DELETED]: 5,
      [AuditEventType.DATA_EXPORT]: 4,
      [AuditEventType.USER_LOGIN]: 2,
      [AuditEventType.TASK_VIEWED]: 1
    };
    
    score = riskScores[event.eventType!] || 1;
    
    // Increase score for failed events
    if (event.success === false) {
      score += 3;
    }
    
    return Math.min(score, 10);
  }
  
  private async analyzeSecurityPatterns(event: AuditEvent): Promise<void> {
    // Check for suspicious patterns
    if (event.riskScore && event.riskScore >= 8) {
      await this.alertSecurityTeam(event);
    }
    
    // Check for brute force attempts
    if (event.eventType === AuditEventType.USER_LOGIN && !event.success) {
      await this.checkBruteForce(event.ipAddress);
    }
    
    // Check for unusual access patterns
    if (event.userId) {
      await this.checkUnusualAccess(event.userId, event.ipAddress);
    }
  }
  
  private async alertSecurityTeam(event: AuditEvent): Promise<void> {
    // Implement security alerting (email, Slack, PagerDuty, etc.)
    console.warn('HIGH RISK SECURITY EVENT:', event);
  }
  
  private getClientIP(req: any): string {
    return req.headers['x-forwarded-for'] || 
           req.headers['x-real-ip'] || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress || 
           'unknown';
  }
}
```

### 4. Implement Input Validation & Sanitization
```typescript
// Location: server/security/inputValidator.ts
import DOMPurify from 'isomorphic-dompurify';
import validator from 'validator';

class InputSanitizer {
  // Sanitize HTML content to prevent XSS
  static sanitizeHTML(input: string): string {
    if (typeof input !== 'string') return '';
    
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li'],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true,
      RETURN_DOM: false
    });
  }
  
  // Sanitize plain text input
  static sanitizeText(input: string): string {
    if (typeof input !== 'string') return '';
    
    return input
      .trim()
      .replace(/[\x00-\x1f\x7f-\x9f]/g, '') // Remove control characters
      .replace(/[<>]/g, '') // Remove potential HTML
      .substring(0, 10000); // Limit length
  }
  
  // Validate and sanitize email
  static sanitizeEmail(email: string): string {
    if (!validator.isEmail(email)) {
      throw new ValidationError('Invalid email format');
    }
    return validator.normalizeEmail(email) || email.toLowerCase().trim();
  }
  
  // Validate and sanitize phone number
  static sanitizePhone(phone: string): string {
    const cleaned = phone.replace(/[^\d+]/g, '');
    if (!validator.isMobilePhone(cleaned)) {
      throw new ValidationError('Invalid phone number format');
    }
    return cleaned;
  }
  
  // Sanitize file uploads
  static validateFileUpload(file: any): void {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'audio/mpeg', 'audio/wav', 'audio/webm',
      'application/pdf', 'text/plain'
    ];
    
    const maxSize = 25 * 1024 * 1024; // 25MB
    
    if (!allowedTypes.includes(file.mimetype)) {
      throw new ValidationError('File type not allowed');
    }
    
    if (file.size > maxSize) {
      throw new ValidationError('File size exceeds limit');
    }
    
    // Check for malicious file patterns
    if (this.containsMaliciousPatterns(file.originalname)) {
      throw new ValidationError('Potentially malicious file detected');
    }
  }
  
  private static containsMaliciousPatterns(filename: string): boolean {
    const maliciousPatterns = [
      /\.php$/i, /\.jsp$/i, /\.asp$/i, /\.py$/i, /\.rb$/i,
      /\.exe$/i, /\.bat$/i, /\.cmd$/i, /\.sh$/i,
      /\.\./,    // Directory traversal
      /[<>]/,    // HTML injection
    ];
    
    return maliciousPatterns.some(pattern => pattern.test(filename));
  }
}

// GraphQL input validation middleware
class GraphQLInputValidator {
  static createValidationDirective() {
    return class ValidationDirective extends SchemaDirectiveVisitor {
      visitFieldDefinition(field: any) {
        const { resolve = defaultFieldResolver } = field;
        
        field.resolve = async function(source: any, args: any, context: any, info: any) {
          // Validate and sanitize inputs
          const sanitizedArgs = validateInputs(args, info.fieldName);
          
          // Call original resolver with sanitized args
          return resolve.call(this, source, sanitizedArgs, context, info);
        };
      }
    };
  }
  
  static validateTaskInput(input: any): any {
    return {
      title: InputSanitizer.sanitizeText(input.title),
      description: input.description ? InputSanitizer.sanitizeHTML(input.description) : undefined,
      priority: validator.isIn(input.priority, ['LOWEST', 'LOW', 'MEDIUM', 'HIGH', 'HIGHEST']) ? 
                input.priority : 'MEDIUM',
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
      tags: Array.isArray(input.tags) ? 
            input.tags.map((tag: string) => InputSanitizer.sanitizeText(tag)).slice(0, 10) : 
            []
    };
  }
  
  static validateUserInput(input: any): any {
    return {
      email: InputSanitizer.sanitizeEmail(input.email),
      firstName: InputSanitizer.sanitizeText(input.firstName),
      lastName: InputSanitizer.sanitizeText(input.lastName),
      phone: input.phone ? InputSanitizer.sanitizePhone(input.phone) : undefined
    };
  }
}
```

### 5. Add CSRF Protection
```typescript
// Location: server/security/csrfProtection.ts
import crypto from 'crypto';

interface CSRFConfig {
  secretLength: number;
  tokenLength: number;
  cookieName: string;
  headerName: string;
  sessionKey: string;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
}

class CSRFProtection {
  private config: CSRFConfig;
  
  constructor(config?: Partial<CSRFConfig>) {
    this.config = {
      secretLength: 32,
      tokenLength: 32,
      cookieName: '_csrf',
      headerName: 'x-csrf-token',
      sessionKey: 'csrfSecret',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      ...config
    };
  }
  
  // Generate CSRF token
  generateToken(secret?: string): { secret: string; token: string } {
    const csrfSecret = secret || crypto.randomBytes(this.config.secretLength).toString('hex');
    const salt = crypto.randomBytes(this.config.tokenLength).toString('hex');
    
    const token = this.hashToken(salt, csrfSecret);
    
    return {
      secret: csrfSecret,
      token: `${salt}:${token}`
    };
  }
  
  // Validate CSRF token
  validateToken(token: string, secret: string): boolean {
    if (!token || !secret) return false;
    
    const [salt, hash] = token.split(':');
    if (!salt || !hash) return false;
    
    const expectedHash = this.hashToken(salt, secret);
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expectedHash));
  }
  
  // Express/Fastify middleware
  middleware() {
    return (req: any, res: any, next: any) => {
      // Skip CSRF for safe methods and API endpoints with API keys
      if (this.shouldSkipCSRF(req)) {
        return next();
      }
      
      // Get or create CSRF secret
      let secret = req.session?.[this.config.sessionKey];
      if (!secret) {
        secret = crypto.randomBytes(this.config.secretLength).toString('hex');
        if (req.session) {
          req.session[this.config.sessionKey] = secret;
        }
      }
      
      // For GET requests, provide token
      if (req.method === 'GET') {
        const { token } = this.generateToken(secret);
        res.cookie(this.config.cookieName, token, {
          httpOnly: false, // Allow JavaScript access for AJAX
          secure: this.config.secure,
          sameSite: this.config.sameSite,
          maxAge: 1000 * 60 * 60 // 1 hour
        });
        return next();
      }
      
      // For state-changing requests, validate token
      const token = req.headers[this.config.headerName] || req.body._csrf;
      
      if (!this.validateToken(token, secret)) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Invalid CSRF token'
        });
      }
      
      next();
    };
  }
  
  private shouldSkipCSRF(req: any): boolean {
    // Skip for safe HTTP methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return false; // Still set token for GET
    }
    
    // Skip for API key authentication
    if (req.headers['x-api-key']) {
      return true;
    }
    
    // Skip for GraphQL introspection
    if (req.body?.query?.includes('__schema')) {
      return true;
    }
    
    return false;
  }
  
  private hashToken(salt: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(salt)
      .digest('hex');
  }
}
```

### 6. Create Security Headers
```typescript
// Location: server/security/securityHeaders.ts
class SecurityHeaders {
  static applySecurityHeaders(app: any) {
    app.use((req: any, res: any, next: any) => {
      // Content Security Policy
      const cspDirectives = {
        'default-src': ["'self'"],
        'script-src': ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        'img-src': ["'self'", 'data:', 'https:', 'blob:'],
        'font-src': ["'self'", 'https://fonts.gstatic.com'],
        'connect-src': ["'self'", 'wss:', 'https:'],
        'media-src': ["'self'", 'blob:'],
        'object-src': ["'none'"],
        'base-uri': ["'self'"],
        'form-action': ["'self'"],
        'frame-ancestors': ["'none'"],
        'upgrade-insecure-requests': []
      };
      
      const csp = Object.entries(cspDirectives)
        .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
        .join('; ');
      
      res.setHeader('Content-Security-Policy', csp);
      
      // HTTP Strict Transport Security
      res.setHeader(
        'Strict-Transport-Security', 
        'max-age=31536000; includeSubDomains; preload'
      );
      
      // X-Content-Type-Options
      res.setHeader('X-Content-Type-Options', 'nosniff');
      
      // X-Frame-Options
      res.setHeader('X-Frame-Options', 'DENY');
      
      // X-XSS-Protection
      res.setHeader('X-XSS-Protection', '1; mode=block');
      
      // Referrer Policy
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      
      // Permissions Policy (Feature Policy)
      const permissions = [
        'camera=()',
        'microphone=(self)',
        'geolocation=()',
        'payment=()',
        'usb=()',
        'bluetooth=()',
        'accelerometer=()',
        'gyroscope=()',
        'magnetometer=()'
      ];
      res.setHeader('Permissions-Policy', permissions.join(', '));
      
      // Cross-Origin policies
      res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
      res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
      
      // Remove server information
      res.removeHeader('X-Powered-By');
      res.removeHeader('Server');
      
      next();
    });
  }
  
  // Dynamic CSP for different routes
  static dynamicCSP(routeType: 'api' | 'webapp' | 'docs') {
    return (req: any, res: any, next: any) => {
      let csp = '';
      
      switch (routeType) {
        case 'api':
          csp = "default-src 'none'; frame-ancestors 'none';";
          break;
        case 'webapp':
          csp = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';";
          break;
        case 'docs':
          csp = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https:;";
          break;
      }
      
      res.setHeader('Content-Security-Policy', csp);
      next();
    };
  }
}
```

### 7. Implement Data Masking
```typescript
// Location: server/security/dataMasking.ts
interface MaskingRules {
  [field: string]: {
    pattern: RegExp;
    replacement: string;
    preserveLength?: boolean;
  };
}

class DataMasking {
  private static maskingRules: MaskingRules = {
    email: {
      pattern: /(.{2}).*(@.*)$/,
      replacement: '$1****$2'
    },
    phone: {
      pattern: /(\d{3})(\d{3})(\d{4})/,
      replacement: '$1-***-$3'
    },
    ssn: {
      pattern: /(\d{3})(\d{2})(\d{4})/,
      replacement: '***-**-$3'
    },
    creditCard: {
      pattern: /(\d{4})(\d{4,})(\d{4})/,
      replacement: '$1-****-****-$3'
    },
    apiKey: {
      pattern: /(.{8})(.*)$/,
      replacement: '$1****'
    }
  };
  
  // Mask sensitive data in responses
  static maskSensitiveData(data: any, userRole: string = 'user'): any {
    if (!data || typeof data !== 'object') return data;
    
    // Admin users see unmasked data
    if (userRole === 'admin') return data;
    
    const masked = Array.isArray(data) ? [...data] : { ...data };
    
    this.recursivelyMask(masked, userRole);
    
    return masked;
  }
  
  private static recursivelyMask(obj: any, userRole: string): void {
    if (!obj || typeof obj !== 'object') return;
    
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        obj[key] = this.maskField(key, value, userRole);
      } else if (typeof value === 'object') {
        this.recursivelyMask(value, userRole);
      }
    }
  }
  
  private static maskField(fieldName: string, value: string, userRole: string): string {
    const lowerFieldName = fieldName.toLowerCase();
    
    // Determine masking level based on user role
    const sensitiveFields = ['ssn', 'taxid', 'bankaccount'];
    const personalFields = ['email', 'phone', 'address'];
    
    if (sensitiveFields.some(field => lowerFieldName.includes(field))) {
      return '***REDACTED***';
    }
    
    if (personalFields.some(field => lowerFieldName.includes(field))) {
      const rule = this.findMaskingRule(lowerFieldName);
      if (rule) {
        return value.replace(rule.pattern, rule.replacement);
      }
    }
    
    return value;
  }
  
  private static findMaskingRule(fieldName: string) {
    for (const [ruleName, rule] of Object.entries(this.maskingRules)) {
      if (fieldName.includes(ruleName)) {
        return rule;
      }
    }
    return null;
  }
  
  // Mask data in logs
  static maskForLogging(data: any): any {
    const sensitive = ['password', 'token', 'secret', 'key', 'auth'];
    const masked = JSON.parse(JSON.stringify(data));
    
    this.maskLogData(masked, sensitive);
    
    return masked;
  }
  
  private static maskLogData(obj: any, sensitiveFields: string[]): void {
    if (!obj || typeof obj !== 'object') return;
    
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      
      if (sensitiveFields.some(field => lowerKey.includes(field))) {
        obj[key] = '[REDACTED]';
      } else if (typeof value === 'object') {
        this.maskLogData(value, sensitiveFields);
      }
    }
  }
}
```

### 8. Add Penetration Testing Framework
```typescript
// Location: server/security/securityTesting.ts
interface SecurityTest {
  name: string;
  category: 'injection' | 'authentication' | 'authorization' | 'crypto' | 'config';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  test: () => Promise<SecurityTestResult>;
}

interface SecurityTestResult {
  passed: boolean;
  findings: string[];
  recommendations: string[];
  evidence?: any;
}

class SecurityTestSuite {
  private tests: SecurityTest[] = [];
  
  constructor() {
    this.registerTests();
  }
  
  private registerTests() {
    // SQL Injection tests
    this.tests.push({
      name: 'SQL Injection Protection',
      category: 'injection',
      severity: 'critical',
      description: 'Test for SQL injection vulnerabilities in GraphQL resolvers',
      test: this.testSQLInjection.bind(this)
    });
    
    // XSS tests
    this.tests.push({
      name: 'Cross-Site Scripting Protection',
      category: 'injection',
      severity: 'high',
      description: 'Test for XSS vulnerabilities in input handling',
      test: this.testXSSProtection.bind(this)
    });
    
    // Authentication tests
    this.tests.push({
      name: 'JWT Token Security',
      category: 'authentication',
      severity: 'high',
      description: 'Test JWT token implementation security',
      test: this.testJWTSecurity.bind(this)
    });
    
    // Authorization tests
    this.tests.push({
      name: 'Authorization Controls',
      category: 'authorization',
      severity: 'high',
      description: 'Test authorization and access controls',
      test: this.testAuthorization.bind(this)
    });
    
    // Cryptography tests
    this.tests.push({
      name: 'Encryption Implementation',
      category: 'crypto',
      severity: 'critical',
      description: 'Test encryption implementation security',
      test: this.testEncryption.bind(this)
    });
  }
  
  async runAllTests(): Promise<SecurityTestResult[]> {
    const results: SecurityTestResult[] = [];
    
    for (const test of this.tests) {
      try {
        console.log(`Running security test: ${test.name}`);
        const result = await test.test();
        results.push({
          ...result,
          testName: test.name,
          category: test.category,
          severity: test.severity
        } as any);
      } catch (error) {
        results.push({
          passed: false,
          findings: [`Test failed with error: ${error.message}`],
          recommendations: ['Fix test implementation'],
          testName: test.name,
          category: test.category,
          severity: test.severity
        } as any);
      }
    }
    
    return results;
  }
  
  private async testSQLInjection(): Promise<SecurityTestResult> {
    const maliciousInputs = [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "1' UNION SELECT * FROM users --",
      "admin'/*",
      "' OR 1=1#"
    ];
    
    const findings: string[] = [];
    
    for (const input of maliciousInputs) {
      try {
        // Test against task creation endpoint
        const result = await this.simulateGraphQLRequest('createTask', {
          input: { title: input }
        });
        
        // If this doesn't throw an error, it might be vulnerable
        if (result && !result.errors) {
          findings.push(`Potential SQL injection with input: ${input}`);
        }
      } catch (error) {
        // Errors are expected for malicious input
      }
    }
    
    return {
      passed: findings.length === 0,
      findings,
      recommendations: findings.length > 0 ? 
        ['Implement parameterized queries', 'Add input validation', 'Use ORM properly'] : 
        []
    };
  }
  
  private async testXSSProtection(): Promise<SecurityTestResult> {
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '"><script>alert("XSS")</script>',
      "javascript:alert('XSS')",
      '<img src=x onerror=alert("XSS")>',
      '<svg onload=alert("XSS")>'
    ];
    
    const findings: string[] = [];
    
    for (const payload of xssPayloads) {
      try {
        const result = await this.simulateGraphQLRequest('createTask', {
          input: { 
            title: 'Test Task',
            description: payload 
          }
        });
        
        // Check if malicious script is stored unsanitized
        if (result?.data?.createTask?.description?.includes('<script>')) {
          findings.push(`XSS vulnerability with payload: ${payload}`);
        }
      } catch (error) {
        // Expected for blocked XSS attempts
      }
    }
    
    return {
      passed: findings.length === 0,
      findings,
      recommendations: findings.length > 0 ? 
        ['Implement output encoding', 'Sanitize HTML input', 'Use Content Security Policy'] : 
        []
    };
  }
  
  private async testJWTSecurity(): Promise<SecurityTestResult> {
    const findings: string[] = [];
    
    // Test 1: Check for algorithm confusion
    try {
      const noneToken = this.createTokenWithAlgorithm('none');
      const result = await this.testTokenValidation(noneToken);
      if (result.valid) {
        findings.push('JWT accepts "none" algorithm');
      }
    } catch (error) {
      // Expected to fail
    }
    
    // Test 2: Check for weak secrets
    const weakSecrets = ['secret', '123456', 'password'];
    for (const secret of weakSecrets) {
      try {
        const token = this.createTokenWithSecret(secret);
        const result = await this.testTokenValidation(token);
        if (result.valid) {
          findings.push(`JWT accepts weak secret: ${secret}`);
        }
      } catch (error) {
        // Expected to fail
      }
    }
    
    return {
      passed: findings.length === 0,
      findings,
      recommendations: findings.length > 0 ? 
        ['Use strong JWT secrets', 'Enforce algorithm whitelist', 'Implement token rotation'] : 
        []
    };
  }
  
  private async testAuthorization(): Promise<SecurityTestResult> {
    const findings: string[] = [];
    
    // Test unauthorized access to protected resources
    try {
      const result = await this.simulateGraphQLRequest('tasks', {}, null); // No auth
      if (result && !result.errors) {
        findings.push('Protected endpoint accessible without authentication');
      }
    } catch (error) {
      // Expected for protected endpoints
    }
    
    // Test privilege escalation
    try {
      const userToken = this.createUserToken('user');
      const result = await this.simulateGraphQLRequest('deleteUser', { id: 'admin' }, userToken);
      if (result && !result.errors) {
        findings.push('User can perform admin actions');
      }
    } catch (error) {
      // Expected to fail
    }
    
    return {
      passed: findings.length === 0,
      findings,
      recommendations: findings.length > 0 ? 
        ['Implement proper authorization checks', 'Use role-based access control', 'Validate permissions on every request'] : 
        []
    };
  }
  
  private async testEncryption(): Promise<SecurityTestResult> {
    const findings: string[] = [];
    
    // Test encryption implementation
    try {
      const encryption = new DataEncryption(process.env.ENCRYPTION_KEY!);
      const plaintext = 'sensitive data';
      const encrypted = await encryption.encryptField(plaintext);
      const decrypted = await encryption.decryptField(encrypted);
      
      if (decrypted !== plaintext) {
        findings.push('Encryption/decryption mismatch');
      }
      
      if (encrypted === plaintext) {
        findings.push('Data not actually encrypted');
      }
      
      if (encrypted.length < plaintext.length) {
        findings.push('Encrypted data shorter than plaintext');
      }
    } catch (error) {
      findings.push(`Encryption error: ${error.message}`);
    }
    
    return {
      passed: findings.length === 0,
      findings,
      recommendations: findings.length > 0 ? 
        ['Fix encryption implementation', 'Use established crypto libraries', 'Test encryption thoroughly'] : 
        []
    };
  }
  
  // Helper methods for testing
  private async simulateGraphQLRequest(operation: string, variables: any, token?: string): Promise<any> {
    // Simulate GraphQL request for testing
    // This would typically make an actual HTTP request to test the live system
    return { data: null, errors: ['Simulated request'] };
  }
  
  private createTokenWithAlgorithm(algorithm: string): string {
    // Create test JWT with specific algorithm
    return 'test.token.here';
  }
  
  private createTokenWithSecret(secret: string): string {
    // Create test JWT with weak secret
    return 'test.token.here';
  }
  
  private createUserToken(role: string): string {
    // Create test JWT for user with specific role
    return 'test.user.token';
  }
  
  private async testTokenValidation(token: string): Promise<{ valid: boolean }> {
    // Test if token is accepted by the system
    return { valid: false };
  }
}

// CLI tool for running security tests
class SecurityTestCLI {
  static async run() {
    console.log('Starting LifeOS Security Test Suite...\n');
    
    const testSuite = new SecurityTestSuite();
    const results = await testSuite.runAllTests();
    
    // Generate report
    const report = this.generateReport(results);
    console.log(report);
    
    // Save report to file
    fs.writeFileSync(
      `security-report-${new Date().toISOString().split('T')[0]}.json`,
      JSON.stringify(results, null, 2)
    );
    
    // Exit with error code if any critical issues found
    const criticalIssues = results.filter(r => !r.passed && (r as any).severity === 'critical');
    process.exit(criticalIssues.length > 0 ? 1 : 0);
  }
  
  private static generateReport(results: SecurityTestResult[]): string {
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    
    let report = `\n📊 Security Test Results\n`;
    report += `================================\n`;
    report += `✅ Passed: ${passed}\n`;
    report += `❌ Failed: ${failed}\n`;
    report += `📈 Success Rate: ${Math.round((passed / results.length) * 100)}%\n\n`;
    
    // Show failed tests
    const failedTests = results.filter(r => !r.passed);
    if (failedTests.length > 0) {
      report += `🚨 Failed Tests:\n`;
      failedTests.forEach((test: any) => {
        report += `\n📛 ${test.testName} (${test.severity})\n`;
        test.findings.forEach((finding: string) => {
          report += `   • ${finding}\n`;
        });
        report += `   💡 Recommendations:\n`;
        test.recommendations.forEach((rec: string) => {
          report += `      - ${rec}\n`;
        });
      });
    }
    
    return report;
  }
}
```

## Database Schema Extensions

```sql
-- Audit logging table
CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "userId" TEXT,
  "resourceType" TEXT,
  "resourceId" TEXT,
  "details" JSONB NOT NULL DEFAULT '{}',
  "ipAddress" TEXT NOT NULL,
  "userAgent" TEXT,
  "correlationId" TEXT,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "success" BOOLEAN NOT NULL DEFAULT true,
  "riskScore" INTEGER,
  
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- Encryption keys management
CREATE TABLE "EncryptionKey" (
  "id" TEXT NOT NULL,
  "keyVersion" INTEGER NOT NULL,
  "algorithm" TEXT NOT NULL,
  "keyData" TEXT NOT NULL, -- Encrypted master key
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "rotatedAt" TIMESTAMP(3),
  
  CONSTRAINT "EncryptionKey_pkey" PRIMARY KEY ("id")
);

-- Security incidents
CREATE TABLE "SecurityIncident" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "userId" TEXT,
  "ipAddress" TEXT,
  "details" JSONB NOT NULL DEFAULT '{}',
  "status" TEXT NOT NULL DEFAULT 'open',
  "assignedTo" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "SecurityIncident_pkey" PRIMARY KEY ("id")
);

-- Indexes for security tables
CREATE INDEX "AuditLog_userId_timestamp_idx" ON "AuditLog"("userId", "timestamp");
CREATE INDEX "AuditLog_eventType_timestamp_idx" ON "AuditLog"("eventType", "timestamp");
CREATE INDEX "AuditLog_riskScore_idx" ON "AuditLog"("riskScore");
CREATE INDEX "SecurityIncident_status_severity_idx" ON "SecurityIncident"("status", "severity");
```

## Testing Requirements

### Security Test Suite
```typescript
describe('Security Implementation', () => {
  test('encrypts data at rest', async () => {
    // Test encryption/decryption
  });
  
  test('validates all inputs', async () => {
    // Test input validation
  });
  
  test('logs security events', async () => {
    // Test audit logging
  });
  
  test('protects against CSRF', async () => {
    // Test CSRF protection
  });
});
```

### Penetration Testing
- Automated security testing with OWASP ZAP
- Manual security assessment
- Third-party security audit
- Vulnerability scanning

### Compliance Testing
- GDPR compliance verification
- Data retention policy testing
- Privacy controls validation
- Audit trail completeness

## Acceptance Criteria

### Security Requirements
✅ Data encrypted at rest with AES-256  
✅ TLS 1.3 enforced for all communications  
✅ Comprehensive audit logging implemented  
✅ Input validation prevents injection attacks  
✅ CSRF protection active for state-changing operations  
✅ Security headers properly configured  
✅ Sensitive data masked in logs and responses  
✅ Security testing framework operational  

### Compliance Requirements
✅ GDPR compliance measures implemented  
✅ Data breach detection and alerting  
✅ User consent management  
✅ Data portability and deletion capabilities  

### Performance Requirements
✅ Security measures add <50ms overhead  
✅ Encryption/decryption performs efficiently  
✅ Audit logging doesn't impact response times  
✅ Security tests complete in <10 minutes  

## Deployment Instructions

1. **Environment Setup**:
   ```bash
   ENCRYPTION_MASTER_KEY=base64_encoded_key_here
   TLS_CERT_PATH=/path/to/cert.pem
   TLS_KEY_PATH=/path/to/key.pem
   AUDIT_LOG_LEVEL=info
   SECURITY_TESTING_ENABLED=true
   ```

2. **Database Migration**:
   ```bash
   npx prisma migrate dev --name security-implementation
   ```

3. **SSL Certificate Setup**:
   - Generate or obtain SSL certificates
   - Configure TLS in production
   - Set up certificate renewal

4. **Security Monitoring**:
   - Configure log aggregation
   - Set up security alerting
   - Deploy security dashboards

## Success Validation

Agent should provide:
- [ ] Complete encryption implementation for sensitive data
- [ ] TLS 1.3 configuration and security headers
- [ ] Comprehensive audit logging system
- [ ] Input validation and sanitization framework
- [ ] CSRF protection implementation
- [ ] Data masking for privacy protection
- [ ] Automated security testing suite
- [ ] Security documentation and compliance guide
- [ ] Performance benchmarks with security enabled
- [ ] Security incident response procedures

**This security implementation provides enterprise-grade protection for all LifeOS data and operations, ensuring compliance with privacy regulations and industry security standards.**