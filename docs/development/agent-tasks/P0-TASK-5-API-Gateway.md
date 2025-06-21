# P0 Task 5: API Gateway & Rate Limiting

## Agent Assignment
**Agent Focus**: Backend Infrastructure  
**Priority**: P0 (Critical - Phase 1 MVP)  
**Dependencies**: GraphQL API (existing)  
**Estimated Duration**: 3-4 days  

## Objective
Implement a comprehensive API gateway with rate limiting, request authentication, API key management, request logging, analytics, error handling middleware, request validation, and API documentation to secure and monitor the LifeOS API.

## Technical Context
- **Framework**: Node.js with Fastify (or Express middleware)
- **Rate Limiting**: Redis-based with token bucket algorithm
- **Authentication**: JWT-based with API key support
- **Logging**: Structured logging with correlation IDs
- **Documentation**: OpenAPI/Swagger integration

## Detailed Subtasks

### 1. Implement API Rate Limiting
```typescript
// Location: server/middleware/rateLimiter.ts
interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Maximum requests per window
  keyGenerator: (req: any) => string; // Key generation function
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  onLimitReached?: (req: any, res: any) => void;
}

class RedisRateLimiter {
  private redis: Redis;
  private config: RateLimitConfig;
  
  constructor(redisClient: Redis, config: RateLimitConfig) {
    this.redis = redisClient;
    this.config = config;
  }
  
  async checkLimit(key: string): Promise<RateLimitResult> {
    const multi = this.redis.multi();
    const window = Math.floor(Date.now() / this.config.windowMs);
    const redisKey = `rate_limit:${key}:${window}`;
    
    multi.incr(redisKey);
    multi.expire(redisKey, Math.ceil(this.config.windowMs / 1000));
    
    const results = await multi.exec();
    const count = results?.[0]?.[1] as number;
    
    return {
      allowed: count <= this.config.maxRequests,
      count,
      remaining: Math.max(0, this.config.maxRequests - count),
      resetTime: (window + 1) * this.config.windowMs
    };
  }
  
  middleware() {
    return async (req: any, res: any, next: any) => {
      try {
        const key = this.config.keyGenerator(req);
        const result = await this.checkLimit(key);
        
        // Add rate limit headers
        res.setHeader('X-RateLimit-Limit', this.config.maxRequests);
        res.setHeader('X-RateLimit-Remaining', result.remaining);
        res.setHeader('X-RateLimit-Reset', new Date(result.resetTime).toISOString());
        
        if (!result.allowed) {
          return res.status(429).json({
            error: 'Too Many Requests',
            message: 'Rate limit exceeded',
            retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
          });
        }
        
        next();
      } catch (error) {
        console.error('Rate limiting error:', error);
        next(); // Fail open for availability
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
    keyGenerator: (req: any) => req.ip
  },
  
  // Authentication endpoints
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10, // Stricter for auth
    keyGenerator: (req: any) => req.ip
  },
  
  // Voice/AI endpoints (more expensive)
  voice: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    keyGenerator: (req: any) => req.user?.id || req.ip
  },
  
  // GraphQL queries
  graphql: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    keyGenerator: (req: any) => req.user?.id || req.ip
  }
};
```

### 2. Create Request Authentication
```typescript
// Location: server/middleware/authentication.ts
interface AuthContext {
  user?: User;
  apiKey?: ApiKey;
  permissions: string[];
  rateLimit: {
    tier: 'free' | 'premium' | 'enterprise';
    limits: RateLimitConfig;
  };
}

class AuthenticationMiddleware {
  private jwtSecret: string;
  private apiKeyService: ApiKeyService;
  
  constructor(jwtSecret: string, apiKeyService: ApiKeyService) {
    this.jwtSecret = jwtSecret;
    this.apiKeyService = apiKeyService;
  }
  
  // JWT Authentication
  async authenticateJWT(token: string): Promise<AuthContext> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as any;
      const user = await getUserById(decoded.userId);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      return {
        user,
        permissions: await getUserPermissions(user.id),
        rateLimit: this.getRateLimitForUser(user)
      };
    } catch (error) {
      throw new Error('Invalid JWT token');
    }
  }
  
  // API Key Authentication
  async authenticateApiKey(apiKey: string): Promise<AuthContext> {
    const keyData = await this.apiKeyService.validateApiKey(apiKey);
    
    if (!keyData || !keyData.isActive) {
      throw new Error('Invalid API key');
    }
    
    // Update last used timestamp
    await this.apiKeyService.updateLastUsed(keyData.id);
    
    return {
      apiKey: keyData,
      permissions: keyData.permissions,
      rateLimit: this.getRateLimitForApiKey(keyData)
    };
  }
  
  // Combined authentication middleware
  middleware() {
    return async (req: any, res: any, next: any) => {
      try {
        let authContext: AuthContext | null = null;
        
        // Check for JWT token
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          authContext = await this.authenticateJWT(token);
        }
        
        // Check for API key
        else if (req.headers['x-api-key']) {
          const apiKey = req.headers['x-api-key'];
          authContext = await this.authenticateApiKey(apiKey);
        }
        
        // Public endpoints (health checks, etc.)
        else if (this.isPublicEndpoint(req.path)) {
          authContext = this.getPublicAuthContext();
        }
        
        if (!authContext) {
          return res.status(401).json({
            error: 'Unauthorized',
            message: 'Authentication required'
          });
        }
        
        req.authContext = authContext;
        next();
      } catch (error) {
        res.status(401).json({
          error: 'Authentication Failed',
          message: error.message
        });
      }
    };
  }
  
  private isPublicEndpoint(path: string): boolean {
    const publicPaths = ['/health', '/docs', '/api-docs', '/graphql'];
    return publicPaths.some(publicPath => path.startsWith(publicPath));
  }
}
```

### 3. Add API Key Management
```typescript
// Location: server/services/apiKeyService.ts
interface ApiKey {
  id: string;
  name: string;
  key: string; // Hashed version
  keyPrefix: string; // First 8 characters for identification
  userId: string;
  permissions: string[];
  isActive: boolean;
  expiresAt?: Date;
  lastUsedAt?: Date;
  usageCount: number;
  rateLimit?: {
    requestsPerMinute: number;
    requestsPerDay: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

class ApiKeyService {
  private readonly keyLength = 32;
  private readonly prefixLength = 8;
  
  async createApiKey(userId: string, name: string, permissions: string[] = []): Promise<{
    apiKey: ApiKey;
    rawKey: string; // Only returned once
  }> {
    const rawKey = this.generateSecureKey();
    const hashedKey = await bcrypt.hash(rawKey, 12);
    const keyPrefix = rawKey.substring(0, this.prefixLength);
    
    const apiKey = await prisma.apiKey.create({
      data: {
        name,
        key: hashedKey,
        keyPrefix,
        userId,
        permissions,
        isActive: true,
        usageCount: 0
      }
    });
    
    return { apiKey, rawKey };
  }
  
  async validateApiKey(rawKey: string): Promise<ApiKey | null> {
    const keyPrefix = rawKey.substring(0, this.prefixLength);
    
    // Find by prefix first (indexed)
    const candidates = await prisma.apiKey.findMany({
      where: {
        keyPrefix,
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      }
    });
    
    // Verify the full key
    for (const candidate of candidates) {
      const isValid = await bcrypt.compare(rawKey, candidate.key);
      if (isValid) {
        return candidate;
      }
    }
    
    return null;
  }
  
  async revokeApiKey(keyId: string, userId: string): Promise<void> {
    await prisma.apiKey.updateMany({
      where: { id: keyId, userId },
      data: { isActive: false }
    });
  }
  
  async updateLastUsed(keyId: string): Promise<void> {
    await prisma.apiKey.update({
      where: { id: keyId },
      data: {
        lastUsedAt: new Date(),
        usageCount: { increment: 1 }
      }
    });
  }
  
  async getUserApiKeys(userId: string): Promise<ApiKey[]> {
    return await prisma.apiKey.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        permissions: true,
        isActive: true,
        expiresAt: true,
        lastUsedAt: true,
        usageCount: true,
        createdAt: true,
        // Exclude the actual hashed key for security
        key: false
      }
    });
  }
  
  private generateSecureKey(): string {
    return crypto.randomBytes(this.keyLength).toString('hex');
  }
}
```

### 4. Implement Request Logging
```typescript
// Location: server/middleware/requestLogger.ts
interface RequestLog {
  id: string;
  method: string;
  url: string;
  userAgent?: string;
  ipAddress: string;
  userId?: string;
  apiKeyId?: string;
  statusCode: number;
  responseTime: number;
  requestSize: number;
  responseSize: number;
  error?: string;
  correlationId: string;
  timestamp: Date;
}

class RequestLogger {
  private logger: any; // Winston or similar
  
  constructor(logger: any) {
    this.logger = logger;
  }
  
  middleware() {
    return (req: any, res: any, next: any) => {
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
        userId: req.authContext?.user?.id,
        apiKeyId: req.authContext?.apiKey?.id,
        requestSize: req.headers['content-length'] ? parseInt(req.headers['content-length']) : 0,
        timestamp: new Date()
      };
      
      // Override res.end to capture response data
      const originalEnd = res.end;
      res.end = (...args: any[]) => {
        const responseTime = Date.now() - startTime;
        
        const logData: RequestLog = {
          ...requestData,
          id: this.generateLogId(),
          statusCode: res.statusCode,
          responseTime,
          responseSize: res.get('content-length') ? parseInt(res.get('content-length')) : 0,
          error: res.statusCode >= 400 ? res.statusMessage : undefined
        };
        
        // Log to structured logger
        this.logRequest(logData);
        
        // Call original end
        originalEnd.apply(res, args);
      };
      
      next();
    };
  }
  
  private logRequest(logData: RequestLog) {
    const level = logData.statusCode >= 500 ? 'error' :
                  logData.statusCode >= 400 ? 'warn' : 'info';
    
    this.logger[level]('API Request', {
      ...logData,
      // Add additional context
      isSlowRequest: logData.responseTime > 1000,
      isLargeRequest: logData.requestSize > 1024 * 1024, // 1MB
      isLargeResponse: logData.responseSize > 1024 * 1024
    });
    
    // Store in database for analytics (async, don't block response)
    this.storeRequestLog(logData).catch(error => {
      this.logger.error('Failed to store request log', { error, correlationId: logData.correlationId });
    });
  }
  
  private async storeRequestLog(logData: RequestLog): Promise<void> {
    await prisma.requestLog.create({
      data: logData
    });
  }
  
  private getClientIP(req: any): string {
    return req.headers['x-forwarded-for'] || 
           req.headers['x-real-ip'] || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress;
  }
  
  private generateCorrelationId(): string {
    return crypto.randomUUID();
  }
  
  private generateLogId(): string {
    return crypto.randomUUID();
  }
}
```

### 5. Create API Analytics
```typescript
// Location: server/services/apiAnalytics.ts
interface ApiMetrics {
  totalRequests: number;
  successfulRequests: number;
  errorRequests: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  requestsByEndpoint: Record<string, number>;
  requestsByUser: Record<string, number>;
  requestsByHour: Record<string, number>;
  popularEndpoints: Array<{ endpoint: string; count: number }>;
  slowestEndpoints: Array<{ endpoint: string; avgResponseTime: number }>;
}

class ApiAnalyticsService {
  async getMetrics(timeRange: { start: Date; end: Date }): Promise<ApiMetrics> {
    const logs = await prisma.requestLog.findMany({
      where: {
        timestamp: {
          gte: timeRange.start,
          lte: timeRange.end
        }
      }
    });
    
    return this.calculateMetrics(logs);
  }
  
  private calculateMetrics(logs: RequestLog[]): ApiMetrics {
    const totalRequests = logs.length;
    const successfulRequests = logs.filter(log => log.statusCode < 400).length;
    const errorRequests = totalRequests - successfulRequests;
    
    const responseTimes = logs.map(log => log.responseTime);
    const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / totalRequests;
    const p95ResponseTime = this.calculatePercentile(responseTimes, 95);
    
    const requestsByEndpoint = this.groupBy(logs, log => this.normalizeEndpoint(log.url));
    const requestsByUser = this.groupBy(logs, log => log.userId || 'anonymous');
    const requestsByHour = this.groupBy(logs, log => new Date(log.timestamp).toISOString().substr(0, 13));
    
    const popularEndpoints = Object.entries(requestsByEndpoint)
      .map(([endpoint, count]) => ({ endpoint, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    const endpointResponseTimes = this.groupResponseTimesByEndpoint(logs);
    const slowestEndpoints = Object.entries(endpointResponseTimes)
      .map(([endpoint, times]) => ({
        endpoint,
        avgResponseTime: times.reduce((a, b) => a + b, 0) / times.length
      }))
      .sort((a, b) => b.avgResponseTime - a.avgResponseTime)
      .slice(0, 10);
    
    return {
      totalRequests,
      successfulRequests,
      errorRequests,
      averageResponseTime,
      p95ResponseTime,
      requestsByEndpoint,
      requestsByUser,
      requestsByHour,
      popularEndpoints,
      slowestEndpoints
    };
  }
  
  async generateDailyReport(): Promise<void> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const endOfYesterday = new Date(yesterday);
    endOfYesterday.setHours(23, 59, 59, 999);
    
    const metrics = await this.getMetrics({
      start: yesterday,
      end: endOfYesterday
    });
    
    // Store daily aggregated metrics
    await prisma.dailyApiMetrics.create({
      data: {
        date: yesterday,
        metrics: metrics as any // Store as JSONB
      }
    });
  }
  
  private normalizeEndpoint(url: string): string {
    // Remove query parameters and normalize IDs
    return url
      .split('?')[0]
      .replace(/\/[a-f0-9-]{36}/g, '/:id') // Replace UUIDs
      .replace(/\/\d+/g, '/:id'); // Replace numeric IDs
  }
  
  private groupBy<T>(array: T[], keyFn: (item: T) => string): Record<string, number> {
    return array.reduce((acc, item) => {
      const key = keyFn(item);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
  
  private calculatePercentile(values: number[], percentile: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }
}
```

### 6. Add Error Handling Middleware
```typescript
// Location: server/middleware/errorHandler.ts
interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
  correlationId?: string;
}

class ErrorHandlerMiddleware {
  private logger: any;
  
  constructor(logger: any) {
    this.logger = logger;
  }
  
  middleware() {
    return (error: ApiError, req: any, res: any, next: any) => {
      // Set correlation ID for error tracking
      error.correlationId = req.correlationId;
      
      // Determine error type and response
      const errorResponse = this.formatError(error);
      
      // Log error with context
      this.logError(error, req);
      
      // Send response
      res.status(errorResponse.statusCode).json(errorResponse);
    };
  }
  
  private formatError(error: ApiError): any {
    // Production vs development error details
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    const baseError = {
      error: error.name || 'Internal Server Error',
      message: error.message,
      statusCode: error.statusCode || 500,
      correlationId: error.correlationId,
      timestamp: new Date().toISOString()
    };
    
    if (isDevelopment) {
      baseError.stack = error.stack;
      baseError.details = error.details;
    }
    
    // Handle specific error types
    switch (error.name) {
      case 'ValidationError':
        return {
          ...baseError,
          statusCode: 400,
          type: 'VALIDATION_ERROR',
          details: isDevelopment ? error.details : undefined
        };
        
      case 'UnauthorizedError':
        return {
          ...baseError,
          statusCode: 401,
          type: 'UNAUTHORIZED_ERROR'
        };
        
      case 'ForbiddenError':
        return {
          ...baseError,
          statusCode: 403,
          type: 'FORBIDDEN_ERROR'
        };
        
      case 'NotFoundError':
        return {
          ...baseError,
          statusCode: 404,
          type: 'NOT_FOUND_ERROR'
        };
        
      case 'RateLimitError':
        return {
          ...baseError,
          statusCode: 429,
          type: 'RATE_LIMIT_ERROR',
          retryAfter: error.details?.retryAfter
        };
        
      default:
        return baseError;
    }
  }
  
  private logError(error: ApiError, req: any) {
    const logData = {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code
      },
      request: {
        method: req.method,
        url: req.url,
        userId: req.authContext?.user?.id,
        correlationId: req.correlationId,
        userAgent: req.headers['user-agent'],
        ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress
      }
    };
    
    const level = error.statusCode && error.statusCode < 500 ? 'warn' : 'error';
    this.logger[level]('API Error', logData);
  }
}
```

### 7. Implement Request Validation
```typescript
// Location: server/middleware/requestValidator.ts
import Joi from 'joi';

class RequestValidator {
  static validateBody(schema: Joi.Schema) {
    return (req: any, res: any, next: any) => {
      const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true
      });
      
      if (error) {
        const validationError = new ValidationError('Request validation failed');
        validationError.details = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));
        return next(validationError);
      }
      
      req.body = value;
      next();
    };
  }
  
  static validateQuery(schema: Joi.Schema) {
    return (req: any, res: any, next: any) => {
      const { error, value } = schema.validate(req.query, {
        abortEarly: false,
        stripUnknown: true
      });
      
      if (error) {
        const validationError = new ValidationError('Query validation failed');
        validationError.details = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }));
        return next(validationError);
      }
      
      req.query = value;
      next();
    };
  }
  
  static validateParams(schema: Joi.Schema) {
    return (req: any, res: any, next: any) => {
      const { error, value } = schema.validate(req.params);
      
      if (error) {
        const validationError = new ValidationError('Parameter validation failed');
        validationError.details = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }));
        return next(validationError);
      }
      
      req.params = value;
      next();
    };
  }
}

// Common validation schemas
const commonSchemas = {
  uuid: Joi.string().uuid().required(),
  paginationQuery: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().valid('createdAt', 'updatedAt', 'title').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  }),
  dateRange: Joi.object({
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().min(Joi.ref('startDate'))
  })
};
```

### 8. Create API Documentation
```typescript
// Location: server/docs/apiDocumentation.ts
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'LifeOS API',
      version: '1.0.0',
      description: 'Voice-first life management system API',
      contact: {
        name: 'LifeOS Team',
        email: 'support@lifeos.dev'
      }
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:4000',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        },
        apiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            statusCode: { type: 'number' },
            correlationId: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        },
        Task: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string', maxLength: 500 },
            description: { type: 'string', maxLength: 5000 },
            status: { 
              type: 'string', 
              enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] 
            },
            priority: { 
              type: 'string', 
              enum: ['LOWEST', 'LOW', 'MEDIUM', 'HIGH', 'HIGHEST'] 
            },
            dueDate: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        }
      }
    },
    security: [
      { bearerAuth: [] },
      { apiKeyAuth: [] }
    ]
  },
  apis: ['./server/routes/*.ts', './server/resolvers/*.ts']
};

export const swaggerSpec = swaggerJSDoc(swaggerOptions);

export const setupApiDocs = (app: any) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'LifeOS API Documentation'
  }));
  
  // Serve OpenAPI spec as JSON
  app.get('/api-docs.json', (req: any, res: any) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
};
```

## Integration with Existing System

### Server Setup
```typescript
// Location: server.js (main server file)
import { RedisRateLimiter } from './middleware/rateLimiter';
import { AuthenticationMiddleware } from './middleware/authentication';
import { RequestLogger } from './middleware/requestLogger';
import { ErrorHandlerMiddleware } from './middleware/errorHandler';
import { setupApiDocs } from './docs/apiDocumentation';

const app = express();
const redis = createRedisClient();

// Initialize middleware
const rateLimiter = new RedisRateLimiter(redis, rateLimitConfigs.general);
const authMiddleware = new AuthenticationMiddleware(process.env.JWT_SECRET!, new ApiKeyService());
const requestLogger = new RequestLogger(logger);
const errorHandler = new ErrorHandlerMiddleware(logger);

// Apply middleware in order
app.use(requestLogger.middleware());
app.use(authMiddleware.middleware());
app.use('/api', rateLimiter.middleware());

// Specific rate limits for different endpoints
app.use('/auth', new RedisRateLimiter(redis, rateLimitConfigs.auth).middleware());
app.use('/voice', new RedisRateLimiter(redis, rateLimitConfigs.voice).middleware());
app.use('/graphql', new RedisRateLimiter(redis, rateLimitConfigs.graphql).middleware());

// API Documentation
setupApiDocs(app);

// GraphQL endpoint
app.use('/graphql', graphqlHTTP({
  schema: graphqlSchema,
  context: (req) => ({
    ...req.authContext,
    correlationId: req.correlationId
  })
}));

// Error handling (must be last)
app.use(errorHandler.middleware());
```

## Database Schema Extensions

```sql
-- API Keys table
CREATE TABLE "ApiKey" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "keyPrefix" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "permissions" TEXT[],
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "expiresAt" TIMESTAMP(3),
  "lastUsedAt" TIMESTAMP(3),
  "usageCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  
  CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- Request logs table
CREATE TABLE "RequestLog" (
  "id" TEXT NOT NULL,
  "method" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "userAgent" TEXT,
  "ipAddress" TEXT NOT NULL,
  "userId" TEXT,
  "apiKeyId" TEXT,
  "statusCode" INTEGER NOT NULL,
  "responseTime" INTEGER NOT NULL,
  "requestSize" INTEGER NOT NULL DEFAULT 0,
  "responseSize" INTEGER NOT NULL DEFAULT 0,
  "error" TEXT,
  "correlationId" TEXT NOT NULL,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "RequestLog_pkey" PRIMARY KEY ("id")
);

-- Daily API metrics
CREATE TABLE "DailyApiMetrics" (
  "id" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "metrics" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "DailyApiMetrics_pkey" PRIMARY KEY ("id")
);

-- Indexes for performance
CREATE INDEX "ApiKey_userId_isActive_idx" ON "ApiKey"("userId", "isActive");
CREATE INDEX "ApiKey_keyPrefix_isActive_idx" ON "ApiKey"("keyPrefix", "isActive");
CREATE INDEX "RequestLog_userId_timestamp_idx" ON "RequestLog"("userId", "timestamp");
CREATE INDEX "RequestLog_correlationId_idx" ON "RequestLog"("correlationId");
CREATE INDEX "RequestLog_timestamp_idx" ON "RequestLog"("timestamp");
CREATE UNIQUE INDEX "DailyApiMetrics_date_key" ON "DailyApiMetrics"("date");
```

## Testing Requirements

### Unit Tests
```typescript
describe('RateLimiter', () => {
  test('allows requests within limit', async () => {
    // Test implementation
  });
  
  test('blocks requests exceeding limit', async () => {
    // Test implementation
  });
});

describe('Authentication', () => {
  test('validates JWT tokens correctly', async () => {
    // Test implementation
  });
  
  test('validates API keys correctly', async () => {
    // Test implementation
  });
});
```

### Integration Tests
- End-to-end API request flow
- Rate limiting under load
- Authentication with different token types
- Error handling scenarios
- API documentation accuracy

### Performance Tests
- Rate limiter performance under high load
- Authentication middleware latency
- Request logging impact on response time
- Memory usage with high request volume

## Acceptance Criteria

### Functional Requirements
✅ Rate limiting prevents abuse and manages API usage  
✅ Authentication works with JWT tokens and API keys  
✅ API key management allows creation, validation, and revocation  
✅ Request logging captures all necessary data  
✅ API analytics provide meaningful insights  
✅ Error handling provides clear, consistent responses  
✅ Request validation prevents malformed requests  
✅ API documentation is complete and accurate  

### Performance Requirements
✅ Rate limiting adds <10ms overhead per request  
✅ Authentication middleware adds <5ms overhead  
✅ Request logging doesn't impact response time significantly  
✅ System handles 1000+ concurrent requests  

### Security Requirements
✅ API keys are properly hashed and secured  
✅ Rate limiting prevents DDoS attacks  
✅ Error responses don't leak sensitive information  
✅ Request logging excludes sensitive data  

## Deployment Instructions

1. **Environment Setup**:
   ```bash
   REDIS_URL=redis://localhost:6379
   JWT_SECRET=your_jwt_secret_here
   API_RATE_LIMIT_ENABLED=true
   REQUEST_LOGGING_ENABLED=true
   ```

2. **Database Migration**:
   ```bash
   npx prisma migrate dev --name api-gateway
   ```

3. **Redis Configuration**:
   - Ensure Redis is running and accessible
   - Configure Redis persistence for rate limit data

4. **Monitoring Setup**:
   - Configure log aggregation
   - Set up API metrics dashboards
   - Configure alerting for rate limit violations

## Success Validation

Agent should provide:
- [ ] Complete API gateway implementation with all middleware
- [ ] Rate limiting system with Redis backend
- [ ] API key management service
- [ ] Request logging and analytics system
- [ ] Error handling middleware
- [ ] Request validation framework
- [ ] API documentation with Swagger/OpenAPI
- [ ] Comprehensive test suite
- [ ] Performance benchmarks
- [ ] Security validation report

**This API gateway provides essential security, monitoring, and management capabilities for the entire LifeOS API ecosystem.**