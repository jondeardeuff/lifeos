const Joi = require('joi');
const { ValidationError } = require('./errorHandler');

class RequestValidator {
  /**
   * Validate request body against Joi schema
   * @param {Joi.Schema} schema - Joi validation schema
   * @returns {function} Express middleware
   */
  static validateBody(schema) {
    return (req, res, next) => {
      const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
        allowUnknown: false
      });
      
      if (error) {
        const validationError = new ValidationError('Request body validation failed');
        validationError.details = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value,
          type: detail.type
        }));
        return next(validationError);
      }
      
      req.body = value;
      next();
    };
  }

  /**
   * Validate query parameters against Joi schema
   * @param {Joi.Schema} schema - Joi validation schema
   * @returns {function} Express middleware
   */
  static validateQuery(schema) {
    return (req, res, next) => {
      const { error, value } = schema.validate(req.query, {
        abortEarly: false,
        stripUnknown: true,
        allowUnknown: false
      });
      
      if (error) {
        const validationError = new ValidationError('Query parameters validation failed');
        validationError.details = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value,
          type: detail.type
        }));
        return next(validationError);
      }
      
      req.query = value;
      next();
    };
  }

  /**
   * Validate route parameters against Joi schema
   * @param {Joi.Schema} schema - Joi validation schema
   * @returns {function} Express middleware
   */
  static validateParams(schema) {
    return (req, res, next) => {
      const { error, value } = schema.validate(req.params, {
        abortEarly: false,
        stripUnknown: true,
        allowUnknown: false
      });
      
      if (error) {
        const validationError = new ValidationError('Route parameters validation failed');
        validationError.details = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value,
          type: detail.type
        }));
        return next(validationError);
      }
      
      req.params = value;
      next();
    };
  }

  /**
   * Validate headers against Joi schema
   * @param {Joi.Schema} schema - Joi validation schema
   * @returns {function} Express middleware
   */
  static validateHeaders(schema) {
    return (req, res, next) => {
      const { error, value } = schema.validate(req.headers, {
        abortEarly: false,
        stripUnknown: true,
        allowUnknown: true // Headers often have many unknown fields
      });
      
      if (error) {
        const validationError = new ValidationError('Headers validation failed');
        validationError.details = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value,
          type: detail.type
        }));
        return next(validationError);
      }
      
      req.headers = { ...req.headers, ...value };
      next();
    };
  }

  /**
   * Validate entire request (body, query, params) against schemas
   * @param {Object} schemas - Object containing validation schemas
   * @returns {function} Express middleware
   */
  static validateRequest(schemas) {
    return (req, res, next) => {
      const errors = [];
      
      // Validate body
      if (schemas.body) {
        const { error, value } = schemas.body.validate(req.body, {
          abortEarly: false,
          stripUnknown: true,
          allowUnknown: false
        });
        
        if (error) {
          errors.push(...error.details.map(detail => ({
            location: 'body',
            field: detail.path.join('.'),
            message: detail.message,
            value: detail.context?.value,
            type: detail.type
          })));
        } else {
          req.body = value;
        }
      }
      
      // Validate query
      if (schemas.query) {
        const { error, value } = schemas.query.validate(req.query, {
          abortEarly: false,
          stripUnknown: true,
          allowUnknown: false
        });
        
        if (error) {
          errors.push(...error.details.map(detail => ({
            location: 'query',
            field: detail.path.join('.'),
            message: detail.message,
            value: detail.context?.value,
            type: detail.type
          })));
        } else {
          req.query = value;
        }
      }
      
      // Validate params
      if (schemas.params) {
        const { error, value } = schemas.params.validate(req.params, {
          abortEarly: false,
          stripUnknown: true,
          allowUnknown: false
        });
        
        if (error) {
          errors.push(...error.details.map(detail => ({
            location: 'params',
            field: detail.path.join('.'),
            message: detail.message,
            value: detail.context?.value,
            type: detail.type
          })));
        } else {
          req.params = value;
        }
      }
      
      // Validate headers
      if (schemas.headers) {
        const { error, value } = schemas.headers.validate(req.headers, {
          abortEarly: false,
          stripUnknown: true,
          allowUnknown: true
        });
        
        if (error) {
          errors.push(...error.details.map(detail => ({
            location: 'headers',
            field: detail.path.join('.'),
            message: detail.message,
            value: detail.context?.value,
            type: detail.type
          })));
        } else {
          req.headers = { ...req.headers, ...value };
        }
      }
      
      if (errors.length > 0) {
        const validationError = new ValidationError('Request validation failed');
        validationError.details = errors;
        return next(validationError);
      }
      
      next();
    };
  }
}

// Common validation schemas
const commonSchemas = {
  // UUID validation
  uuid: Joi.string().uuid().required(),
  
  // Optional UUID
  optionalUuid: Joi.string().uuid().optional(),
  
  // Pagination query parameters
  paginationQuery: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().valid('createdAt', 'updatedAt', 'title', 'name').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  }),
  
  // Date range query parameters
  dateRangeQuery: Joi.object({
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().min(Joi.ref('startDate'))
  }),
  
  // Search query parameters
  searchQuery: Joi.object({
    q: Joi.string().min(1).max(100).optional(),
    fields: Joi.array().items(Joi.string()).optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().valid('createdAt', 'updatedAt', 'title', 'name').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  }),
  
  // Email validation
  email: Joi.string().email().required(),
  
  // Password validation
  password: Joi.string().min(8).max(128).pattern(
    new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]')
  ).required().messages({
    'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'
  }),
  
  // Task priority validation
  taskPriority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH').default('MEDIUM'),
  
  // Task status validation
  taskStatus: Joi.string().valid('TODO', 'IN_PROGRESS', 'COMPLETED').default('TODO'),
  
  // API Key name validation
  apiKeyName: Joi.string().min(1).max(100).required(),
  
  // Permissions array validation
  permissions: Joi.array().items(Joi.string().min(1).max(50)).default([]),
  
  // Headers validation for API requests
  apiHeaders: Joi.object({
    'content-type': Joi.string().valid('application/json').required(),
    'user-agent': Joi.string().optional(),
    'x-api-key': Joi.string().optional(),
    'authorization': Joi.string().pattern(/^Bearer\s/).optional(),
    'x-correlation-id': Joi.string().uuid().optional()
  }).unknown(true)
};

// Specific validation schemas for different endpoints
const schemas = {
  // User authentication
  login: {
    body: Joi.object({
      email: commonSchemas.email,
      password: Joi.string().required()
    })
  },
  
  signup: {
    body: Joi.object({
      email: commonSchemas.email,
      password: commonSchemas.password,
      firstName: Joi.string().min(1).max(50).required(),
      lastName: Joi.string().min(1).max(50).required()
    })
  },
  
  // Task management
  createTask: {
    body: Joi.object({
      title: Joi.string().min(1).max(500).required(),
      description: Joi.string().max(5000).optional(),
      priority: commonSchemas.taskPriority,
      status: commonSchemas.taskStatus,
      dueDate: Joi.date().iso().optional(),
      dueTime: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
      timezone: Joi.string().optional()
    })
  },
  
  updateTask: {
    params: Joi.object({
      id: commonSchemas.uuid
    }),
    body: Joi.object({
      title: Joi.string().min(1).max(500).optional(),
      description: Joi.string().max(5000).optional(),
      priority: commonSchemas.taskPriority.optional(),
      status: commonSchemas.taskStatus.optional(),
      dueDate: Joi.date().iso().optional(),
      dueTime: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
      timezone: Joi.string().optional()
    }).min(1) // At least one field must be provided
  },
  
  getTask: {
    params: Joi.object({
      id: commonSchemas.uuid
    })
  },
  
  deleteTask: {
    params: Joi.object({
      id: commonSchemas.uuid
    })
  },
  
  getTasks: {
    query: Joi.object({
      q: Joi.string().min(1).max(100).optional(),
      fields: Joi.array().items(Joi.string()).optional(),
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(20),
      sortBy: Joi.string().valid('createdAt', 'updatedAt', 'title', 'name').default('createdAt'),
      sortOrder: Joi.string().valid('asc', 'desc').default('desc')
    })
  },
  
  // API Key management
  createApiKey: {
    body: Joi.object({
      name: commonSchemas.apiKeyName,
      permissions: commonSchemas.permissions,
      expiresAt: Joi.date().iso().min('now').optional(),
      rateLimit: Joi.object({
        requestsPerMinute: Joi.number().integer().min(1).max(10000).optional(),
        requestsPerDay: Joi.number().integer().min(1).max(1000000).optional()
      }).optional()
    })
  },
  
  updateApiKey: {
    params: Joi.object({
      id: commonSchemas.uuid
    }),
    body: Joi.object({
      name: commonSchemas.apiKeyName.optional(),
      permissions: commonSchemas.permissions.optional(),
      isActive: Joi.boolean().optional()
    }).min(1)
  },
  
  revokeApiKey: {
    params: Joi.object({
      id: commonSchemas.uuid
    })
  },
  
  // Analytics
  getAnalytics: {
    query: Joi.object({
      startDate: Joi.date().iso().required(),
      endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
      groupBy: Joi.string().valid('hour', 'day', 'week', 'month').default('day'),
      metrics: Joi.array().items(
        Joi.string().valid('requests', 'errors', 'response_time', 'users')
      ).default(['requests'])
    })
  }
};

module.exports = {
  RequestValidator,
  commonSchemas,
  schemas
};