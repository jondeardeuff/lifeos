const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'LifeOS API',
      version: '1.0.0',
      description: 'Voice-first life management system API with comprehensive task management, authentication, and real-time features.',
      contact: {
        name: 'LifeOS Team',
        email: 'support@lifeos.dev',
        url: 'https://lifeos.dev'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:4000',
        description: 'Development server'
      },
      {
        url: 'https://lifeos-api-production.up.railway.app',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token for user authentication'
        },
        apiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key for service-to-service authentication'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          required: ['error', 'message', 'statusCode', 'timestamp'],
          properties: {
            error: {
              type: 'string',
              description: 'Error type',
              example: 'ValidationError'
            },
            message: {
              type: 'string',
              description: 'Human-readable error message',
              example: 'Request validation failed'
            },
            statusCode: {
              type: 'integer',
              description: 'HTTP status code',
              example: 400
            },
            code: {
              type: 'string',
              description: 'Machine-readable error code',
              example: 'VALIDATION_ERROR'
            },
            correlationId: {
              type: 'string',
              format: 'uuid',
              description: 'Request correlation ID for tracking'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Error timestamp'
            },
            details: {
              type: 'array',
              description: 'Detailed error information (development only)',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string',
                    description: 'Field that caused the error'
                  },
                  message: {
                    type: 'string',
                    description: 'Field-specific error message'
                  },
                  value: {
                    description: 'Invalid value that was provided'
                  }
                }
              }
            }
          }
        },
        User: {
          type: 'object',
          required: ['id', 'email', 'firstName', 'lastName', 'createdAt'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique user identifier',
              example: 'cuid-example-123456789'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'user@example.com'
            },
            firstName: {
              type: 'string',
              minLength: 1,
              maxLength: 50,
              description: 'User first name',
              example: 'John'
            },
            lastName: {
              type: 'string',
              minLength: 1,
              maxLength: 50,
              description: 'User last name',
              example: 'Doe'
            },
            fullName: {
              type: 'string',
              description: 'Computed full name',
              example: 'John Doe'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Account creation timestamp'
            }
          }
        },
        Task: {
          type: 'object',
          required: ['id', 'title', 'status', 'priority', 'createdAt', 'updatedAt'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique task identifier'
            },
            title: {
              type: 'string',
              minLength: 1,
              maxLength: 500,
              description: 'Task title',
              example: 'Complete API documentation'
            },
            description: {
              type: 'string',
              maxLength: 5000,
              description: 'Task description',
              example: 'Write comprehensive API documentation with examples'
            },
            status: {
              type: 'string',
              enum: ['TODO', 'IN_PROGRESS', 'COMPLETED'],
              description: 'Current task status',
              example: 'TODO'
            },
            priority: {
              type: 'string',
              enum: ['LOW', 'MEDIUM', 'HIGH'],
              description: 'Task priority level',
              example: 'HIGH'
            },
            dueDate: {
              type: 'string',
              format: 'date-time',
              description: 'Task due date (optional)'
            },
            dueTime: {
              type: 'string',
              pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$',
              description: 'Task due time in HH:MM format (optional)',
              example: '14:30'
            },
            timezone: {
              type: 'string',
              description: 'Timezone for due date/time',
              example: 'America/New_York'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Task creation timestamp'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp'
            }
          }
        },
        ApiKey: {
          type: 'object',
          required: ['id', 'name', 'keyPrefix', 'permissions', 'isActive', 'createdAt'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique API key identifier'
            },
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 100,
              description: 'Human-readable API key name',
              example: 'Production API Key'
            },
            keyPrefix: {
              type: 'string',
              minLength: 8,
              maxLength: 8,
              description: 'First 8 characters of the key for identification',
              example: 'sk_live_'
            },
            permissions: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Array of permission strings',
              example: ['tasks:read', 'tasks:write']
            },
            isActive: {
              type: 'boolean',
              description: 'Whether the API key is active',
              example: true
            },
            expiresAt: {
              type: 'string',
              format: 'date-time',
              description: 'API key expiration date (optional)'
            },
            lastUsedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last usage timestamp'
            },
            usageCount: {
              type: 'integer',
              minimum: 0,
              description: 'Total number of times the key has been used',
              example: 1250
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'API key creation timestamp'
            }
          }
        },
        AuthPayload: {
          type: 'object',
          required: ['user', 'accessToken', 'refreshToken'],
          properties: {
            user: {
              $ref: '#/components/schemas/User'
            },
            accessToken: {
              type: 'string',
              description: 'JWT access token',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
            },
            refreshToken: {
              type: 'string',
              description: 'JWT refresh token',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
            }
          }
        },
        ApiMetrics: {
          type: 'object',
          properties: {
            totalRequests: {
              type: 'integer',
              description: 'Total number of API requests',
              example: 15420
            },
            successfulRequests: {
              type: 'integer',
              description: 'Number of successful requests (status < 400)',
              example: 14892
            },
            errorRequests: {
              type: 'integer',
              description: 'Number of error requests (status >= 400)',
              example: 528
            },
            averageResponseTime: {
              type: 'number',
              format: 'float',
              description: 'Average response time in milliseconds',
              example: 127.45
            },
            p95ResponseTime: {
              type: 'number',
              format: 'float',
              description: '95th percentile response time',
              example: 285.67
            },
            errorRate: {
              type: 'number',
              format: 'float',
              description: 'Error rate as percentage',
              example: 3.42
            },
            uniqueUsers: {
              type: 'integer',
              description: 'Number of unique users',
              example: 45
            },
            popularEndpoints: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  endpoint: {
                    type: 'string',
                    example: '/api/tasks'
                  },
                  count: {
                    type: 'integer',
                    example: 5420
                  }
                }
              }
            }
          }
        },
        PaginationMeta: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              minimum: 1,
              description: 'Current page number',
              example: 1
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              description: 'Number of items per page',
              example: 20
            },
            total: {
              type: 'integer',
              minimum: 0,
              description: 'Total number of items',
              example: 150
            },
            totalPages: {
              type: 'integer',
              minimum: 0,
              description: 'Total number of pages',
              example: 8
            }
          }
        }
      },
      parameters: {
        CorrelationId: {
          in: 'header',
          name: 'X-Correlation-ID',
          schema: {
            type: 'string',
            format: 'uuid'
          },
          description: 'Optional correlation ID for request tracking'
        },
        PageParam: {
          in: 'query',
          name: 'page',
          schema: {
            type: 'integer',
            minimum: 1,
            default: 1
          },
          description: 'Page number for pagination'
        },
        LimitParam: {
          in: 'query',
          name: 'limit',
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 20
          },
          description: 'Number of items per page'
        },
        SortByParam: {
          in: 'query',
          name: 'sortBy',
          schema: {
            type: 'string',
            enum: ['createdAt', 'updatedAt', 'title', 'name'],
            default: 'createdAt'
          },
          description: 'Field to sort by'
        },
        SortOrderParam: {
          in: 'query',
          name: 'sortOrder',
          schema: {
            type: 'string',
            enum: ['asc', 'desc'],
            default: 'desc'
          },
          description: 'Sort order'
        }
      },
      responses: {
        BadRequest: {
          description: 'Bad Request - Invalid input data',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: 'ValidationError',
                message: 'Request validation failed',
                statusCode: 400,
                code: 'VALIDATION_ERROR',
                correlationId: '123e4567-e89b-12d3-a456-426614174000',
                timestamp: '2024-01-15T10:30:00Z',
                details: [
                  {
                    field: 'title',
                    message: 'Title is required',
                    value: null
                  }
                ]
              }
            }
          }
        },
        Unauthorized: {
          description: 'Unauthorized - Authentication required',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: 'AuthenticationError',
                message: 'Authentication required',
                statusCode: 401,
                code: 'AUTHENTICATION_REQUIRED',
                correlationId: '123e4567-e89b-12d3-a456-426614174000',
                timestamp: '2024-01-15T10:30:00Z'
              }
            }
          }
        },
        Forbidden: {
          description: 'Forbidden - Insufficient permissions',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: 'AuthorizationError',
                message: 'Insufficient permissions',
                statusCode: 403,
                code: 'INSUFFICIENT_PERMISSIONS',
                correlationId: '123e4567-e89b-12d3-a456-426614174000',
                timestamp: '2024-01-15T10:30:00Z'
              }
            }
          }
        },
        NotFound: {
          description: 'Not Found - Resource does not exist',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: 'NotFoundError',
                message: 'Task not found',
                statusCode: 404,
                code: 'NOT_FOUND_ERROR',
                correlationId: '123e4567-e89b-12d3-a456-426614174000',
                timestamp: '2024-01-15T10:30:00Z'
              }
            }
          }
        },
        TooManyRequests: {
          description: 'Too Many Requests - Rate limit exceeded',
          headers: {
            'X-RateLimit-Limit': {
              schema: {
                type: 'integer'
              },
              description: 'Request limit per window'
            },
            'X-RateLimit-Remaining': {
              schema: {
                type: 'integer'
              },
              description: 'Remaining requests in current window'
            },
            'X-RateLimit-Reset': {
              schema: {
                type: 'string',
                format: 'date-time'
              },
              description: 'Time when the rate limit resets'
            }
          },
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: 'RateLimitError',
                message: 'Rate limit exceeded',
                statusCode: 429,
                code: 'RATE_LIMIT_ERROR',
                correlationId: '123e4567-e89b-12d3-a456-426614174000',
                timestamp: '2024-01-15T10:30:00Z',
                retryAfter: 60
              }
            }
          }
        },
        InternalServerError: {
          description: 'Internal Server Error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: 'Internal Server Error',
                message: 'An unexpected error occurred',
                statusCode: 500,
                code: 'INTERNAL_ERROR',
                correlationId: '123e4567-e89b-12d3-a456-426614174000',
                timestamp: '2024-01-15T10:30:00Z'
              }
            }
          }
        }
      }
    },
    security: [
      { bearerAuth: [] },
      { apiKeyAuth: [] }
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization endpoints'
      },
      {
        name: 'Tasks',
        description: 'Task management operations'
      },
      {
        name: 'API Keys',
        description: 'API key management operations'
      },
      {
        name: 'Analytics',
        description: 'API usage analytics and metrics'
      },
      {
        name: 'Health',
        description: 'System health and status endpoints'
      }
    ]
  },
  apis: [
    './server/routes/*.js',
    './server/resolvers/*.js',
    './server.js'
  ]
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

/**
 * Setup API documentation middleware
 * @param {Express} app - Express application instance
 */
const setupApiDocs = (app) => {
  // Serve Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: `
      .swagger-ui .topbar { display: none; }
      .swagger-ui .info { margin: 20px 0; }
      .swagger-ui .scheme-container { margin: 20px 0; padding: 10px; background: #f5f5f5; }
    `,
    customSiteTitle: 'LifeOS API Documentation',
    customfavIcon: '/favicon.ico',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      tryItOutEnabled: true
    }
  }));
  
  // Serve OpenAPI spec as JSON
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // API documentation redirect
  app.get('/docs', (req, res) => {
    res.redirect('/api-docs');
  });

  console.log('📚 API Documentation available at /api-docs');
  console.log('📄 OpenAPI spec available at /api-docs.json');
};

/**
 * Add Swagger JSDoc comments to existing routes
 * This is a helper function to document existing GraphQL resolvers
 */
const addGraphQLDocumentation = () => {
  /**
   * @swagger
   * /graphql:
   *   post:
   *     tags: [GraphQL]
   *     summary: GraphQL endpoint
   *     description: Execute GraphQL queries and mutations
   *     security:
   *       - bearerAuth: []
   *       - apiKeyAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [query]
   *             properties:
   *               query:
   *                 type: string
   *                 description: GraphQL query string
   *                 example: "query { tasks { id title status } }"
   *               variables:
   *                 type: object
   *                 description: GraphQL variables
   *               operationName:
   *                 type: string
   *                 description: Operation name for multi-operation queries
   *     responses:
   *       200:
   *         description: GraphQL response
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   type: object
   *                   description: Query result data
   *                 errors:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       message:
   *                         type: string
   *                       locations:
   *                         type: array
   *                       path:
   *                         type: array
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       429:
   *         $ref: '#/components/responses/TooManyRequests'
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */

  /**
   * @swagger
   * /health:
   *   get:
   *     tags: [Health]
   *     summary: Health check endpoint
   *     description: Check if the API is running and healthy
   *     responses:
   *       200:
   *         description: API is healthy
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: "healthy"
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *                 version:
   *                   type: string
   *                   example: "1.0.0"
   *                 uptime:
   *                   type: number
   *                   description: Server uptime in seconds
   */
};

module.exports = {
  setupApiDocs,
  swaggerSpec,
  addGraphQLDocumentation
};