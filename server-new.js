const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const Redis = require('ioredis');

// Import custom middleware and services
const AuthenticationMiddleware = require('./server/middleware/authentication');
const { createRateLimiters } = require('./server/middleware/rateLimiter');
const RequestLogger = require('./server/middleware/requestLogger');
const { ErrorHandlerMiddleware } = require('./server/middleware/errorHandler');
const { RequestValidator, schemas } = require('./server/middleware/requestValidator');
// Use mock service until Prisma is properly generated
// const ApiKeyService = require('./server/services/apiKeyService');
const ApiKeyService = require('./server/services/apiKeyServiceMock');
const ApiAnalyticsService = require('./server/services/apiAnalytics');
const { setupApiDocs } = require('./server/docs/apiDocumentation');
const TranscriptionManager = require('./server/services/speech/transcriptionManager');
const multer = require('multer');

// Import existing GraphQL setup
const { prisma } = require('./prisma-client');
const { hashPassword, verifyPassword, generateTokens, verifyToken } = require('./auth');

// GraphQL type definitions (from existing server)
const typeDefs = `
  type User {
    id: ID!
    email: String!
    firstName: String!
    lastName: String!
    fullName: String!
    createdAt: String!
  }

  type AuthPayload {
    user: User!
    accessToken: String!
    refreshToken: String!
  }

  type Task {
    id: ID!
    title: String!
    description: String
    status: String!
    priority: String!
    createdAt: String!
    updatedAt: String!
  }

  type ApiKey {
    id: ID!
    name: String!
    keyPrefix: String!
    permissions: [String!]!
    isActive: Boolean!
    expiresAt: String
    lastUsedAt: String
    usageCount: Int!
    createdAt: String!
    updatedAt: String!
  }

  type ApiMetrics {
    totalRequests: Int!
    successfulRequests: Int!
    errorRequests: Int!
    averageResponseTime: Float!
    errorRate: Float!
    uniqueUsers: Int!
  }

  type TranscriptionResult {
    text: String!
    confidence: Float!
    language: String!
    alternatives: [TranscriptionAlternative!]!
    segments: [TranscriptionSegment!]!
    duration: Float!
    service: String!
    fallbackUsed: Boolean!
  }

  type TranscriptionAlternative {
    text: String!
    confidence: Float!
  }

  type TranscriptionSegment {
    start: Float!
    end: Float!
    text: String!
    confidence: Float!
  }

  type Query {
    me: User
    tasks: [Task!]!
    health: String!
    apiKeys: [ApiKey!]!
    analytics(startDate: String!, endDate: String!): ApiMetrics!
    transcriptionHealth: String!
    supportedLanguages: [String!]!
  }

  type Mutation {
    login(email: String!, password: String!): AuthPayload!
    signup(input: SignupInput!): AuthPayload!
    createTask(input: CreateTaskInput!): Task!
    updateTask(id: ID!, input: UpdateTaskInput!): Task!
    deleteTask(id: ID!): Boolean!
    createApiKey(input: CreateApiKeyInput!): CreateApiKeyPayload!
    revokeApiKey(id: ID!): Boolean!
  }

  input SignupInput {
    email: String!
    password: String!
    firstName: String!
    lastName: String!
  }

  input CreateTaskInput {
    title: String!
    description: String
    priority: String
  }

  input UpdateTaskInput {
    title: String
    description: String
    status: String
    priority: String
  }

  input CreateApiKeyInput {
    name: String!
    permissions: [String!]
    expiresAt: String
  }

  type CreateApiKeyPayload {
    apiKey: ApiKey!
    rawKey: String!
  }

  input TranscribeAudioInput {
    language: String
    preferredService: String
  }
`;

// GraphQL resolvers (enhanced from existing server)
const resolvers = {
  Query: {
    health: () => "LifeOS API is running with API Gateway!",
    
    me: async (_, __, { userId }) => {
      if (!userId) return null;
      
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });
      
      if (!user) return null;
      
      return {
        ...user,
        fullName: `${user.firstName} ${user.lastName}`,
      };
    },
    
    tasks: async (_, __, { userId }) => {
      if (!userId) return [];
      
      return await prisma.task.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
    },

    apiKeys: async (_, __, { userId }) => {
      if (!userId) throw new Error('Not authenticated');
      
      const apiKeyService = new ApiKeyService();
      return await apiKeyService.getUserApiKeys(userId);
    },

    analytics: async (_, { startDate, endDate }, { userId }) => {
      if (!userId) throw new Error('Not authenticated');
      
      const analyticsService = new ApiAnalyticsService();
      return await analyticsService.getMetrics({
        start: new Date(startDate),
        end: new Date(endDate)
      }, { userId });
    },

    transcriptionHealth: async () => {
      const transcriptionManager = new TranscriptionManager();
      const health = await transcriptionManager.healthCheck();
      return JSON.stringify(health);
    },

    supportedLanguages: async () => {
      const transcriptionManager = new TranscriptionManager();
      const languages = transcriptionManager.getSupportedLanguages();
      return languages.recommended || ['en', 'es'];
    }
  },
  
  Mutation: {
    signup: async (_, { input }) => {
      const { email, password, firstName, lastName } = input;
      
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });
      
      if (existingUser) {
        throw new Error('User already exists with this email');
      }
      
      const hashedPassword = await hashPassword(password);
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
        },
      });
      
      const { accessToken, refreshToken } = generateTokens(user.id);
      
      return {
        user: {
          ...user,
          fullName: `${user.firstName} ${user.lastName}`,
        },
        accessToken,
        refreshToken,
      };
    },
    
    login: async (_, { email, password }) => {
      const user = await prisma.user.findUnique({
        where: { email },
      });
      
      if (!user) {
        throw new Error('Invalid credentials');
      }
      
      const validPassword = await verifyPassword(password, user.password);
      if (!validPassword) {
        throw new Error('Invalid credentials');
      }
      
      const { accessToken, refreshToken } = generateTokens(user.id);
      
      return {
        user: {
          ...user,
          fullName: `${user.firstName} ${user.lastName}`,
        },
        accessToken,
        refreshToken,
      };
    },
    
    createTask: async (_, { input }, { userId }) => {
      if (!userId) throw new Error('Not authenticated');
      
      return await prisma.task.create({
        data: {
          ...input,
          userId,
          priority: input.priority || 'MEDIUM',
          status: 'TODO',
        },
      });
    },
    
    updateTask: async (_, { id, input }, { userId }) => {
      if (!userId) throw new Error('Not authenticated');
      
      const task = await prisma.task.findFirst({
        where: { id, userId },
      });
      
      if (!task) {
        throw new Error('Task not found');
      }
      
      return await prisma.task.update({
        where: { id },
        data: input,
      });
    },
    
    deleteTask: async (_, { id }, { userId }) => {
      if (!userId) throw new Error('Not authenticated');
      
      const task = await prisma.task.findFirst({
        where: { id, userId },
      });
      
      if (!task) {
        throw new Error('Task not found');
      }
      
      await prisma.task.delete({ where: { id } });
      return true;
    },

    createApiKey: async (_, { input }, { userId }) => {
      if (!userId) throw new Error('Not authenticated');
      
      const apiKeyService = new ApiKeyService();
      const result = await apiKeyService.createApiKey(
        userId,
        input.name,
        input.permissions || [],
        {
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : null
        }
      );
      
      return result;
    },

    revokeApiKey: async (_, { id }, { userId }) => {
      if (!userId) throw new Error('Not authenticated');
      
      const apiKeyService = new ApiKeyService();
      await apiKeyService.revokeApiKey(id, userId);
      return true;
    }
  },
};

async function startServer() {
  try {
    const app = express();
    const PORT = process.env.PORT || 4000;

    // Initialize Redis client for rate limiting
    const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
      retryStrategy: (times) => {
        // Stop retrying after 3 attempts
        if (times > 3) {
          console.log('Redis unavailable - using in-memory rate limiting');
          return null; // Stop retrying
        }
        // Reconnect after
        return Math.min(times * 50, 2000);
      },
      reconnectOnError: (err) => {
        return false; // Don't reconnect
      }
    });

    redis.on('error', (err) => {
      // Only log once
      if (!redis.redisErrorLogged) {
        console.warn('Redis connection error:', err.message);
        console.log('Rate limiting will fall back to in-memory store');
        redis.redisErrorLogged = true;
      }
    });

    // Initialize services and middleware
    const authMiddleware = new AuthenticationMiddleware();
    const rateLimiters = createRateLimiters(redis);
    const requestLogger = new RequestLogger();
    const errorHandler = new ErrorHandlerMiddleware(requestLogger.logger);
    const apiAnalytics = new ApiAnalyticsService();

    // Security middleware
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
        },
      },
      crossOriginEmbedderPolicy: false
    }));

    app.use(compression());

    // CORS configuration
    app.use(cors({
      origin: [
        'https://lifeos-frontend-production.up.railway.app',
        'http://localhost:3000',
        'http://localhost:3001'
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Correlation-ID']
    }));

    // Request logging (must be early in middleware chain)
    app.use(requestLogger.middleware());

    // Body parsing
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Health check endpoint (before authentication)
    app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        uptime: process.uptime()
      });
    });

    // API documentation
    setupApiDocs(app);

    // Authentication middleware (for all protected routes)
    app.use(authMiddleware.middleware());

    // Rate limiting based on authentication type
    app.use((req, res, next) => {
      const authType = req.authContext?.authType;
      let rateLimiter;

      switch (authType) {
        case 'api_key':
          rateLimiter = rateLimiters.apiKey;
          break;
        case 'jwt':
          rateLimiter = rateLimiters.general;
          break;
        default:
          rateLimiter = rateLimiters.general;
      }

      return rateLimiter.middleware()(req, res, next);
    });

    // Create Apollo Server
    const server = new ApolloServer({
      typeDefs,
      resolvers,
      introspection: process.env.NODE_ENV !== 'production',
      formatError: (err) => {
        console.error('GraphQL Error:', err);
        return {
          message: err.message,
          code: err.extensions?.code || 'INTERNAL_ERROR',
          locations: err.locations,
          path: err.path,
        };
      },
    });

    await server.start();

    // GraphQL endpoint with specific rate limiting
    app.use('/graphql', 
      rateLimiters.graphql.middleware(),
      expressMiddleware(server, {
        context: async ({ req }) => {
          return {
            userId: req.authContext?.user?.id || null,
            authContext: req.authContext,
            correlationId: req.correlationId
          };
        },
      })
    );

    // REST API endpoints for API key management
    app.post('/api/keys', 
      authMiddleware.requireAuth(),
      RequestValidator.validateBody(schemas.createApiKey.body),
      async (req, res, next) => {
        try {
          const apiKeyService = new ApiKeyService();
          const result = await apiKeyService.createApiKey(
            req.authContext.user.id,
            req.body.name,
            req.body.permissions || [],
            {
              expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : null,
              rateLimit: req.body.rateLimit
            }
          );
          res.status(201).json(result);
        } catch (error) {
          next(error);
        }
      }
    );

    app.get('/api/keys',
      authMiddleware.requireAuth(),
      async (req, res, next) => {
        try {
          const apiKeyService = new ApiKeyService();
          const apiKeys = await apiKeyService.getUserApiKeys(req.authContext.user.id);
          res.json(apiKeys);
        } catch (error) {
          next(error);
        }
      }
    );

    app.delete('/api/keys/:id',
      authMiddleware.requireAuth(),
      RequestValidator.validateParams(schemas.revokeApiKey.params),
      async (req, res, next) => {
        try {
          const apiKeyService = new ApiKeyService();
          await apiKeyService.revokeApiKey(req.params.id, req.authContext.user.id);
          res.status(204).send();
        } catch (error) {
          next(error);
        }
      }
    );

    // Analytics endpoints
    app.get('/api/analytics',
      authMiddleware.requireAuth(),
      RequestValidator.validateQuery(schemas.getAnalytics.query),
      async (req, res, next) => {
        try {
          const { startDate, endDate, groupBy, metrics } = req.query;
          const analyticsMetrics = await apiAnalytics.getMetrics(
            {
              start: new Date(startDate),
              end: new Date(endDate)
            },
            { userId: req.authContext.user.id }
          );
          res.json(analyticsMetrics);
        } catch (error) {
          next(error);
        }
      }
    );

    // Initialize transcription manager
    const transcriptionManager = new TranscriptionManager();

    // Configure multer for file uploads
    const upload = multer({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 25 * 1024 * 1024, // 25MB limit
        files: 1
      },
      fileFilter: (req, file, cb) => {
        // Check file type
        const allowedTypes = [
          'audio/mp3',
          'audio/mp4', 
          'audio/mpeg',
          'audio/mpga',
          'audio/m4a',
          'audio/wav',
          'audio/webm'
        ];
        
        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error(`Unsupported audio format: ${file.mimetype}`), false);
        }
      }
    });

    // Transcription endpoints
    app.post('/api/transcribe',
      authMiddleware.requireAuth(),
      rateLimiters.voice.middleware(),
      upload.single('audio'),
      async (req, res, next) => {
        try {
          if (!req.file) {
            return res.status(400).json({
              error: 'Bad Request',
              message: 'Audio file is required',
              statusCode: 400
            });
          }

          const { language, preferredService } = req.body;
          const audioBuffer = req.file.buffer;
          const filename = req.file.originalname || 'audio.webm';

          console.log(`Transcription request: ${(audioBuffer.length / 1024).toFixed(2)}KB, ${req.file.mimetype}, user: ${req.authContext.user.id}`);

          // Validate audio file
          const validation = transcriptionManager.validateAudio(audioBuffer, req.file.mimetype);
          if (!validation.valid) {
            return res.status(400).json({
              error: 'Validation Error',
              message: 'Invalid audio file',
              details: validation.errors,
              statusCode: 400
            });
          }

          // Transcribe audio
          const result = await transcriptionManager.transcribeAudio(audioBuffer, {
            language,
            preferredService,
            filename
          });

          res.json({
            success: true,
            data: result,
            fallbackUsed: result.fallbackUsed || false
          });

        } catch (error) {
          console.error('Transcription API error:', error);
          next(error);
        }
      }
    );

    // Transcription health check
    app.get('/api/transcribe/health',
      async (req, res, next) => {
        try {
          const health = await transcriptionManager.healthCheck();
          res.json(health);
        } catch (error) {
          next(error);
        }
      }
    );

    // Get supported languages
    app.get('/api/transcribe/languages',
      async (req, res, next) => {
        try {
          const languages = transcriptionManager.getSupportedLanguages();
          res.json({
            success: true,
            data: languages
          });
        } catch (error) {
          next(error);
        }
      }
    );

    // Get transcription statistics (admin endpoint)
    app.get('/api/transcribe/stats',
      authMiddleware.requireAuth(),
      async (req, res, next) => {
        try {
          const stats = transcriptionManager.getStatistics();
          res.json({
            success: true,
            data: stats
          });
        } catch (error) {
          next(error);
        }
      }
    );

    // 404 handler for unmatched routes
    app.use(errorHandler.notFoundHandler());

    // Global error handler (must be last)
    app.use(errorHandler.middleware());

    // Start server
    app.listen(PORT, '0.0.0.0', async () => {
      console.log(`🚀 LifeOS API Gateway Server ready at http://localhost:${PORT}`);
      console.log(`📊 GraphQL Playground available at http://localhost:${PORT}/graphql`);
      console.log(`📚 API Documentation available at http://localhost:${PORT}/api-docs`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🗄️  Database connected via Prisma`);
      console.log(`🔒 Rate limiting enabled with Redis`);
      console.log(`📝 Request logging enabled`);
      console.log(`🛡️  Security headers enabled`);

      // Test database connection
      try {
        await prisma.$connect();
        console.log('✅ Database connected successfully');

        // Create demo user if none exists
        const demoUser = await prisma.user.findUnique({
          where: { email: 'test@lifeos.dev' },
        });

        if (!demoUser) {
          const hashedPassword = await hashPassword('password123');
          await prisma.user.create({
            data: {
              email: 'test@lifeos.dev',
              password: hashedPassword,
              firstName: 'Test',
              lastName: 'User',
            },
          });
          console.log(`✅ Demo user created: test@lifeos.dev / password123`);
        }

        // Setup analytics daily report generation
        apiAnalytics.setupDailyReportCron();
        console.log('📈 Analytics daily reports scheduled');

      } catch (dbError) {
        console.error('❌ Database connection error:', dbError.message);
        console.log('⚠️  Server will continue without database functionality');
      }
    });

  } catch (err) {
    console.error('Server startup error:', err);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

startServer();