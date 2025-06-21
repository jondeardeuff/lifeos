# Security Implementation Guide

## Overview

Life OS implements defense-in-depth security with multiple layers of protection for user data, focusing on encryption, secure authentication, and privacy protection.

## Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        WAF/DDoS Protection                   │
│                        (Cloudflare)                          │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                     TLS 1.3 Encryption                       │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                 Application Security                         │
│  • Input Validation  • CSRF Protection  • Rate Limiting     │
│  • XSS Prevention   • SQL Injection Protection              │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                  Authentication & Authorization              │
│  • JWT + Refresh Tokens  • 2FA  • Role-Based Access        │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                    Data Encryption                           │
│  • At Rest (AES-256)  • In Transit (TLS)  • Field-Level    │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                    Database Security                         │
│  • Row-Level Security  • Encrypted Backups  • Audit Logs   │
└─────────────────────────────────────────────────────────────┘
```

## Encryption

### Data at Rest

```typescript
// utils/encryption.ts
import crypto from 'crypto';

export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyDerivationIterations = 100000;
  
  constructor(
    private readonly masterKey: string = process.env.MASTER_ENCRYPTION_KEY!
  ) {
    if (!masterKey || masterKey.length < 32) {
      throw new Error('Invalid master encryption key');
    }
  }
  
  /**
   * Derives an encryption key from the master key and salt
   */
  private deriveKey(salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(
      this.masterKey,
      salt,
      this.keyDerivationIterations,
      32,
      'sha256'
    );
  }
  
  /**
   * Encrypts sensitive data
   */
  encrypt(plaintext: string): EncryptedData {
    const salt = crypto.randomBytes(16);
    const key = this.deriveKey(salt);
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted: encrypted.toString('base64'),
      salt: salt.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
    };
  }
  
  /**
   * Decrypts sensitive data
   */
  decrypt(data: EncryptedData): string {
    const salt = Buffer.from(data.salt, 'base64');
    const key = this.deriveKey(salt);
    const iv = Buffer.from(data.iv, 'base64');
    const authTag = Buffer.from(data.authTag, 'base64');
    const encrypted = Buffer.from(data.encrypted, 'base64');
    
    const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
    decipher.setAuthTag(authTag);
    
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
    
    return decrypted.toString('utf8');
  }
  
  /**
   * Generates a secure hash for data integrity
   */
  hash(data: string): string {
    return crypto
      .createHash('sha256')
      .update(data)
      .digest('hex');
  }
  
  /**
   * Generates secure random tokens
   */
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }
}

interface EncryptedData {
  encrypted: string;
  salt: string;
  iv: string;
  authTag: string;
}
```

### Field-Level Encryption

```typescript
// models/encrypted-fields.ts
import { EncryptionService } from '@/utils/encryption';

const encryption = new EncryptionService();

/**
 * Decorator for encrypted database fields
 */
export function Encrypted(target: any, propertyKey: string) {
  const privateKey = `_${propertyKey}`;
  
  Object.defineProperty(target, propertyKey, {
    get() {
      const encrypted = this[privateKey];
      if (!encrypted) return null;
      
      try {
        return encryption.decrypt(JSON.parse(encrypted));
      } catch (error) {
        console.error(`Failed to decrypt ${propertyKey}`, error);
        return null;
      }
    },
    
    set(value: string) {
      if (!value) {
        this[privateKey] = null;
        return;
      }
      
      const encrypted = encryption.encrypt(value);
      this[privateKey] = JSON.stringify(encrypted);
    },
  });
}

// Usage in models
export class User {
  @Encrypted
  phoneNumber?: string;
  
  @Encrypted
  bankAccountNumber?: string;
  
  @Encrypted
  socialSecurityNumber?: string;
}
```

## Input Validation & Sanitization

### Request Validation

```typescript
// middleware/validation.ts
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

/**
 * Validates and sanitizes request data
 */
export function validateRequest<T>(
  schema: z.ZodSchema<T>
): RequestHandler {
  return async (req, res, next) => {
    try {
      // Validate against schema
      const validated = schema.parse(req.body);
      
      // Sanitize string fields
      const sanitized = sanitizeData(validated);
      
      // Replace request body with sanitized data
      req.body = sanitized;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.errors,
          },
        });
      }
      next(error);
    }
  };
}

/**
 * Recursively sanitizes all string fields
 */
function sanitizeData<T>(data: T): T {
  if (typeof data === 'string') {
    // Remove any HTML/scripts
    return DOMPurify.sanitize(data, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
    }) as T;
  }
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item)) as T;
  }
  
  if (typeof data === 'object' && data !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeData(value);
    }
    return sanitized;
  }
  
  return data;
}

// SQL Injection Prevention
export function sanitizeSqlIdentifier(identifier: string): string {
  // Only allow alphanumeric and underscore
  if (!/^[a-zA-Z0-9_]+$/.test(identifier)) {
    throw new Error('Invalid SQL identifier');
  }
  return identifier;
}
```

### File Upload Validation

```typescript
// middleware/file-upload.ts
import multer from 'multer';
import { Magic } from 'mmmagic';
import crypto from 'crypto';

const magic = new Magic();

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 5,
  },
  fileFilter: (req, file, cb) => {
    // Check file extension
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.csv', '.xlsx'];
    
    if (!allowedExts.includes(ext)) {
      return cb(new Error('Invalid file type'));
    }
    
    cb(null, true);
  },
});

/**
 * Validates file content matches claimed type
 */
export async function validateFileContent(
  file: Express.Multer.File
): Promise<void> {
  return new Promise((resolve, reject) => {
    magic.detect(file.buffer, (err, result) => {
      if (err) {
        return reject(err);
      }
      
      const detectedType = Array.isArray(result) ? result[0] : result;
      
      if (!ALLOWED_MIME_TYPES.includes(detectedType)) {
        return reject(new Error(`Invalid file content: ${detectedType}`));
      }
      
      // Additional validation for specific types
      if (detectedType.startsWith('image/')) {
        validateImage(file.buffer);
      }
      
      resolve();
    });
  });
}

/**
 * Scans file for malware signatures
 */
export async function scanFile(buffer: Buffer): Promise<boolean> {
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');
  
  // Check against known malware hashes
  const isMalware = await checkMalwareDatabase(hash);
  
  if (isMalware) {
    throw new Error('Malicious file detected');
  }
  
  // Additional scanning logic
  return true;
}
```

## Cross-Site Scripting (XSS) Prevention

### Content Security Policy

```typescript
// middleware/security-headers.ts
import helmet from 'helmet';

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'sha256-...'", // Specific inline script hashes
        "https://cdn.jsdelivr.net", // For trusted CDNs only
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Required for Tailwind
      ],
      imgSrc: [
        "'self'",
        "data:",
        "https:",
        "blob:",
      ],
      connectSrc: [
        "'self'",
        "https://api.lifeos.app",
        "wss://api.lifeos.app",
        "https://*.plaid.com", // External APIs
      ],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      sandbox: ['allow-forms', 'allow-scripts', 'allow-same-origin'],
      reportUri: '/api/csp-report',
      upgradeInsecureRequests: [],
    },
  },
  
  // Additional security headers
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  
  permissionsPolicy: {
    features: {
      camera: ["'none'"],
      geolocation: ["'self'"],
      microphone: ["'self'"], // For voice features
      payment: ["'none'"],
    },
  },
});
```

### Output Encoding

```typescript
// utils/encoding.ts

/**
 * Encodes data for safe HTML output
 */
export function encodeHTML(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Encodes data for use in HTML attributes
 */
export function encodeAttribute(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Encodes data for use in JavaScript strings
 */
export function encodeJS(str: string): string {
  return JSON.stringify(str).slice(1, -1);
}

/**
 * Encodes data for use in URLs
 */
export function encodeURL(str: string): string {
  return encodeURIComponent(str);
}
```

## SQL Injection Prevention

### Parameterized Queries

```typescript
// services/database-service.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['warn', 'error'],
});

/**
 * Safe query execution with parameterized queries
 */
export class DatabaseService {
  /**
   * NEVER do string concatenation for queries
   */
  async unsafeQuery(userId: string, status: string) {
    // ❌ NEVER DO THIS
    // const query = `SELECT * FROM tasks WHERE user_id = '${userId}' AND status = '${status}'`;
    // return db.$queryRawUnsafe(query);
  }
  
  /**
   * Always use parameterized queries
   */
  async getTasksByStatus(userId: string, status: string) {
    // ✅ Safe parameterized query
    return prisma.task.findMany({
      where: {
        userId,
        status,
      },
    });
  }
  
  /**
   * For raw queries, use tagged templates
   */
  async getProjectStats(projectId: string) {
    // ✅ Safe raw query with Prisma
    return prisma.$queryRaw`
      SELECT 
        COUNT(*) as total_tasks,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
        AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_completion_time
      FROM tasks
      WHERE project_id = ${projectId}
    `;
  }
  
  /**
   * Validate dynamic column names
   */
  async sortTasks(userId: string, sortBy: string, order: 'asc' | 'desc') {
    const allowedColumns = ['title', 'created_at', 'due_date', 'priority'];
    
    if (!allowedColumns.includes(sortBy)) {
      throw new Error('Invalid sort column');
    }
    
    // Safe because we validated against whitelist
    return prisma.task.findMany({
      where: { userId },
      orderBy: { [sortBy]: order },
    });
  }
}
```

## Cross-Site Request Forgery (CSRF) Protection

### CSRF Tokens

```typescript
// middleware/csrf.ts
import crypto from 'crypto';

export class CSRFProtection {
  private readonly tokenLength = 32;
  
  /**
   * Generates a CSRF token for the session
   */
  generateToken(): string {
    return crypto.randomBytes(this.tokenLength).toString('hex');
  }
  
  /**
   * Middleware to validate CSRF tokens
   */
  validateToken(): RequestHandler {
    return (req, res, next) => {
      // Skip for safe methods
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
      }
      
      const sessionToken = req.session?.csrfToken;
      const requestToken = req.body._csrf || req.headers['x-csrf-token'];
      
      if (!sessionToken || !requestToken) {
        return res.status(403).json({
          error: {
            code: 'CSRF_TOKEN_MISSING',
            message: 'CSRF token required',
          },
        });
      }
      
      if (!crypto.timingSafeEqual(
        Buffer.from(sessionToken),
        Buffer.from(requestToken)
      )) {
        return res.status(403).json({
          error: {
            code: 'CSRF_TOKEN_INVALID',
            message: 'Invalid CSRF token',
          },
        });
      }
      
      next();
    };
  }
  
  /**
   * Double Submit Cookie pattern for stateless CSRF
   */
  doubleSubmitCookie(): RequestHandler {
    return (req, res, next) => {
      const cookieToken = req.cookies['csrf-token'];
      const headerToken = req.headers['x-csrf-token'];
      
      if (!cookieToken || !headerToken) {
        return res.status(403).json({
          error: {
            code: 'CSRF_TOKEN_MISSING',
            message: 'CSRF token required',
          },
        });
      }
      
      if (cookieToken !== headerToken) {
        return res.status(403).json({
          error: {
            code: 'CSRF_TOKEN_MISMATCH',
            message: 'CSRF token mismatch',
          },
        });
      }
      
      next();
    };
  }
}
```

## API Security

### Rate Limiting

```typescript
// middleware/rate-limit.ts
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';

export const createRateLimiter = (options: {
  windowMs: number;
  max: number;
  keyPrefix: string;
}) => {
  return rateLimit({
    store: new RedisStore({
      client: redis,
      prefix: `rl:${options.keyPrefix}:`,
    }),
    windowMs: options.windowMs,
    max: options.max,
    message: 'Too many requests',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Please try again later.',
          retryAfter: req.rateLimit.resetTime,
        },
      });
    },
  });
};

// Different limits for different endpoints
export const rateLimiters = {
  // Strict limit for auth endpoints
  auth: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    keyPrefix: 'auth',
  }),
  
  // Standard API limit
  api: createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 100,
    keyPrefix: 'api',
  }),
  
  // Higher limit for read operations
  read: createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 500,
    keyPrefix: 'read',
  }),
  
  // File upload limit
  upload: createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20,
    keyPrefix: 'upload',
  }),
};
```

### API Key Management

```typescript
// services/api-key-service.ts
import crypto from 'crypto';

export class APIKeyService {
  /**
   * Generates a secure API key
   */
  async generateAPIKey(userId: string, name: string): Promise<APIKey> {
    const key = `sk_${crypto.randomBytes(32).toString('hex')}`;
    const hashedKey = await argon2.hash(key);
    
    const apiKey = await db.apiKey.create({
      data: {
        userId,
        name,
        keyHash: hashedKey,
        prefix: key.substring(0, 7),
        lastUsed: null,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      },
    });
    
    // Return the key only once
    return {
      ...apiKey,
      key, // Full key returned only on creation
    };
  }
  
  /**
   * Validates an API key
   */
  async validateAPIKey(key: string): Promise<APIKeyInfo | null> {
    const prefix = key.substring(0, 7);
    
    const apiKeys = await db.apiKey.findMany({
      where: {
        prefix,
        expiresAt: { gt: new Date() },
        revokedAt: null,
      },
    });
    
    for (const apiKey of apiKeys) {
      const valid = await argon2.verify(apiKey.keyHash, key);
      if (valid) {
        // Update last used
        await db.apiKey.update({
          where: { id: apiKey.id },
          data: { lastUsed: new Date() },
        });
        
        return {
          id: apiKey.id,
          userId: apiKey.userId,
          scopes: apiKey.scopes,
        };
      }
    }
    
    return null;
  }
}
```

## Audit Logging

### Audit Trail

```typescript
// services/audit-service.ts
export class AuditService {
  async log(event: AuditEvent): Promise<void> {
    await db.auditLog.create({
      data: {
        userId: event.userId,
        action: event.action,
        resource: event.resource,
        resourceId: event.resourceId,
        changes: event.changes,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        timestamp: new Date(),
        metadata: event.metadata,
      },
    });
    
    // For critical events, also send to SIEM
    if (this.isCriticalEvent(event)) {
      await this.sendToSIEM(event);
    }
  }
  
  private isCriticalEvent(event: AuditEvent): boolean {
    const criticalActions = [
      'USER_DELETED',
      'PERMISSION_CHANGED',
      'DATA_EXPORTED',
      'API_KEY_CREATED',
      'BANK_ACCOUNT_CONNECTED',
      'BULK_DELETE',
    ];
    
    return criticalActions.includes(event.action);
  }
  
  async query(filters: AuditFilters): Promise<AuditLog[]> {
    return db.auditLog.findMany({
      where: {
        userId: filters.userId,
        action: filters.action,
        resource: filters.resource,
        timestamp: {
          gte: filters.startDate,
          lte: filters.endDate,
        },
      },
      orderBy: { timestamp: 'desc' },
      take: filters.limit || 100,
    });
  }
}

interface AuditEvent {
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  changes?: Record<string, { old: any; new: any }>;
  ipAddress: string;
  userAgent: string;
  metadata?: Record<string, any>;
}
```

## Security Monitoring

### Intrusion Detection

```typescript
// services/security-monitor.ts
export class SecurityMonitor {
  private readonly thresholds = {
    failedLogins: 5,
    suspiciousRequests: 10,
    dataExfiltration: 1000, // records
  };
  
  async detectAnomalies(userId: string): Promise<SecurityAlert[]> {
    const alerts: SecurityAlert[] = [];
    
    // Check failed login attempts
    const failedLogins = await this.getFailedLogins(userId, '1h');
    if (failedLogins > this.thresholds.failedLogins) {
      alerts.push({
        type: 'BRUTE_FORCE_ATTEMPT',
        severity: 'high',
        description: `${failedLogins} failed login attempts in the last hour`,
      });
    }
    
    // Check for suspicious request patterns
    const suspiciousPatterns = await this.detectSuspiciousPatterns(userId);
    if (suspiciousPatterns.length > 0) {
      alerts.push({
        type: 'SUSPICIOUS_ACTIVITY',
        severity: 'medium',
        description: `Detected suspicious patterns: ${suspiciousPatterns.join(', ')}`,
      });
    }
    
    // Check for data exfiltration
    const exportedRecords = await this.getExportedRecords(userId, '1h');
    if (exportedRecords > this.thresholds.dataExfiltration) {
      alerts.push({
        type: 'POSSIBLE_DATA_EXFILTRATION',
        severity: 'critical',
        description: `User exported ${exportedRecords} records in the last hour`,
      });
    }
    
    return alerts;
  }
  
  private async detectSuspiciousPatterns(userId: string): Promise<string[]> {
    const patterns: string[] = [];
    
    // SQL injection attempts
    const sqlInjectionAttempts = await db.auditLog.count({
      where: {
        userId,
        metadata: {
          path: ['error'],
          equals: 'SQL_INJECTION_ATTEMPT',
        },
      },
    });
    
    if (sqlInjectionAttempts > 0) {
      patterns.push('SQL injection attempts');
    }
    
    // Path traversal attempts
    const pathTraversalAttempts = await db.auditLog.count({
      where: {
        userId,
        metadata: {
          path: ['path'],
          string_contains: '../',
        },
      },
    });
    
    if (pathTraversalAttempts > 0) {
      patterns.push('Path traversal attempts');
    }
    
    return patterns;
  }
}
```

## Vulnerability Management

### Dependency Scanning

```json
// package.json
{
  "scripts": {
    "security:check": "npm audit && snyk test",
    "security:fix": "npm audit fix && snyk wizard",
    "security:monitor": "snyk monitor"
  },
  "husky": {
    "hooks": {
      "pre-commit": "npm run security:check"
    }
  }
}
```

### Security Testing

```typescript
// tests/security.test.ts
describe('Security Tests', () => {
  describe('SQL Injection', () => {
    it('should prevent SQL injection in search', async () => {
      const maliciousInput = "'; DROP TABLE users; --";
      
      const response = await request(app)
        .get('/api/tasks')
        .query({ search: maliciousInput })
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
      
      // Verify database is intact
      const users = await db.user.count();
      expect(users).toBeGreaterThan(0);
    });
  });
  
  describe('XSS Prevention', () => {
    it('should sanitize user input', async () => {
      const xssPayload = '<script>alert("XSS")</script>';
      
      const response = await request(app)
        .post('/api/tasks')
        .send({ title: xssPayload })
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(201);
      expect(response.body.data.title).toBe('');
    });
  });
  
  describe('Authentication', () => {
    it('should rate limit login attempts', async () => {
      for (let i = 0; i < 6; i++) {
        await request(app)
          .post('/auth/login')
          .send({ email: 'test@example.com', password: 'wrong' });
      }
      
      const response = await request(app)
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'correct' });
      
      expect(response.status).toBe(429);
      expect(response.body.error.code).toBe('RATE_LIMITED');
    });
  });
});
```

## Incident Response

### Security Incident Handler

```typescript
// services/incident-response.ts
export class IncidentResponse {
  async handleSecurityIncident(incident: SecurityIncident): Promise<void> {
    // 1. Contain the threat
    await this.containThreat(incident);
    
    // 2. Assess the damage
    const impact = await this.assessImpact(incident);
    
    // 3. Notify stakeholders
    await this.notifyStakeholders(incident, impact);
    
    // 4. Collect evidence
    await this.collectEvidence(incident);
    
    // 5. Remediate
    await this.remediate(incident);
    
    // 6. Document
    await this.documentIncident(incident, impact);
  }
  
  private async containThreat(incident: SecurityIncident): Promise<void> {
    switch (incident.type) {
      case 'ACCOUNT_COMPROMISE':
        // Revoke all sessions
        await this.revokeUserSessions(incident.userId);
        // Force password reset
        await this.forcePasswordReset(incident.userId);
        break;
        
      case 'DATA_BREACH':
        // Disable affected API keys
        await this.disableAPIKeys(incident.affectedKeys);
        // Block suspicious IPs
        await this.blockIPs(incident.suspiciousIPs);
        break;
        
      case 'MALWARE_DETECTED':
        // Quarantine files
        await this.quarantineFiles(incident.files);
        break;
    }
  }
}
```