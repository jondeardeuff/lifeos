const DOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const validator = require('validator');

// Initialize DOMPurify for server-side use
const window = new JSDOM('').window;
const DOMPurifyServer = DOMPurify(window);

/**
 * Input Sanitization and Validation Service
 * Provides comprehensive protection against XSS, injection, and malformed data
 */
class InputSanitizer {
  /**
   * Sanitize HTML content to prevent XSS
   * @param {string} input - HTML input to sanitize
   * @param {Object} options - Sanitization options
   * @returns {string} Sanitized HTML
   */
  static sanitizeHTML(input, options = {}) {
    if (typeof input !== 'string') return '';
    
    if (input.length === 0) return input;
    
    const config = {
      ALLOWED_TAGS: options.allowedTags || ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
      ALLOWED_ATTR: options.allowedAttributes || ['href', 'title'],
      KEEP_CONTENT: true,
      RETURN_DOM: false,
      FORBID_SCRIPTS: true,
      FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'button'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'style'],
      ...options.domPurifyConfig
    };
    
    try {
      return DOMPurifyServer.sanitize(input, config);
    } catch (error) {
      console.error('HTML sanitization error:', error);
      return ''; // Return empty string on error
    }
  }
  
  /**
   * Sanitize plain text input
   * @param {string} input - Text input to sanitize
   * @param {Object} options - Sanitization options
   * @returns {string} Sanitized text
   */
  static sanitizeText(input, options = {}) {
    if (typeof input !== 'string') return '';
    
    const maxLength = options.maxLength || 10000;
    
    return input
      .trim()
      .replace(/[\x00-\x1f\x7f-\x9f]/g, '') // Remove control characters
      .replace(/[<>]/g, '') // Remove potential HTML
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/data:/gi, '') // Remove data: protocol (optional, based on needs)
      .substring(0, maxLength);
  }
  
  /**
   * Validate and sanitize email address
   * @param {string} email - Email to validate
   * @returns {string} Sanitized email
   * @throws {ValidationError} If email is invalid
   */
  static sanitizeEmail(email) {
    if (!email || typeof email !== 'string') {
      throw new ValidationError('Email is required and must be a string');
    }
    
    // Basic cleanup
    const cleaned = email.trim().toLowerCase();
    
    if (!validator.isEmail(cleaned)) {
      throw new ValidationError('Invalid email format');
    }
    
    const normalized = validator.normalizeEmail(cleaned, {
      gmail_remove_dots: false,
      gmail_remove_subaddress: false,
      outlookdotcom_remove_subaddress: false,
      yahoo_remove_subaddress: false,
      icloud_remove_subaddress: false
    });
    
    return normalized || cleaned;
  }
  
  /**
   * Validate and sanitize phone number
   * @param {string} phone - Phone number to validate
   * @param {string} locale - Locale for validation (default: 'US')
   * @returns {string} Sanitized phone number
   * @throws {ValidationError} If phone is invalid
   */
  static sanitizePhone(phone, locale = 'en-US') {
    if (!phone || typeof phone !== 'string') {
      throw new ValidationError('Phone number is required and must be a string');
    }
    
    // Remove all non-digit characters except +
    const cleaned = phone.replace(/[^\d+]/g, '');
    
    if (!validator.isMobilePhone(cleaned, locale)) {
      throw new ValidationError('Invalid phone number format');
    }
    
    return cleaned;
  }
  
  /**
   * Sanitize URL to prevent malicious redirects
   * @param {string} url - URL to sanitize
   * @param {Array} allowedDomains - Allowed domains (optional)
   * @returns {string} Sanitized URL
   * @throws {ValidationError} If URL is invalid
   */
  static sanitizeURL(url, allowedDomains = []) {
    if (!url || typeof url !== 'string') {
      throw new ValidationError('URL is required and must be a string');
    }
    
    const cleaned = url.trim();
    
    // Check for valid URL format
    if (!validator.isURL(cleaned, {
      protocols: ['http', 'https'],
      require_protocol: true
    })) {
      throw new ValidationError('Invalid URL format');
    }
    
    // Check allowed domains if specified
    if (allowedDomains.length > 0) {
      try {
        const urlObj = new URL(cleaned);
        const domain = urlObj.hostname.toLowerCase();
        
        const isAllowed = allowedDomains.some(allowedDomain => {
          return domain === allowedDomain.toLowerCase() || 
                 domain.endsWith('.' + allowedDomain.toLowerCase());
        });
        
        if (!isAllowed) {
          throw new ValidationError(`Domain ${domain} is not allowed`);
        }
      } catch (error) {
        throw new ValidationError('Invalid URL format');
      }
    }
    
    return cleaned;
  }
  
  /**
   * Validate file upload security
   * @param {Object} file - Multer file object
   * @param {Object} options - Validation options
   * @throws {ValidationError} If file is invalid or dangerous
   */
  static validateFileUpload(file, options = {}) {
    if (!file) {
      throw new ValidationError('File is required');
    }
    
    const allowedTypes = options.allowedTypes || [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'audio/mpeg', 'audio/wav', 'audio/webm', 'audio/mp4', 'audio/m4a',
      'application/pdf', 'text/plain'
    ];
    
    const maxSize = options.maxSize || 25 * 1024 * 1024; // 25MB default
    
    // Check MIME type
    if (!allowedTypes.includes(file.mimetype)) {
      throw new ValidationError(`File type ${file.mimetype} is not allowed`);
    }
    
    // Check file size
    if (file.size > maxSize) {
      throw new ValidationError(`File size ${file.size} exceeds maximum ${maxSize} bytes`);
    }
    
    // Check for malicious file patterns
    if (this.containsMaliciousPatterns(file.originalname)) {
      throw new ValidationError('Potentially malicious file detected');
    }
    
    // Additional checks for specific file types
    if (file.mimetype.startsWith('image/')) {
      this.validateImageFile(file);
    } else if (file.mimetype.startsWith('audio/')) {
      this.validateAudioFile(file);
    }
  }
  
  /**
   * Check for malicious file patterns
   * @param {string} filename - Filename to check
   * @returns {boolean} True if malicious patterns found
   */
  static containsMaliciousPatterns(filename) {
    if (!filename) return false;
    
    const maliciousPatterns = [
      // Executable extensions
      /\.php$/i, /\.jsp$/i, /\.asp$/i, /\.py$/i, /\.rb$/i,
      /\.exe$/i, /\.bat$/i, /\.cmd$/i, /\.sh$/i, /\.ps1$/i,
      
      // Directory traversal
      /\.\./,
      
      // Null bytes
      /\x00/,
      
      // HTML injection patterns
      /[<>]/,
      
      // Script injection patterns
      /javascript:/i,
      /vbscript:/i,
      
      // Double extensions (often used in attacks)
      /\.(php|jsp|asp|py|rb|exe|bat|cmd|sh)\./i
    ];
    
    return maliciousPatterns.some(pattern => pattern.test(filename));
  }
  
  /**
   * Validate image file
   * @param {Object} file - Image file to validate
   */
  static validateImageFile(file) {
    // Check for image-specific threats
    const buffer = file.buffer;
    
    if (!buffer) return; // File might not be in memory
    
    // Check for embedded scripts in image files
    const stringContent = buffer.toString('utf8');
    
    const scriptPatterns = [
      /<script/i,
      /javascript:/i,
      /vbscript:/i,
      /<iframe/i,
      /<embed/i,
      /<object/i
    ];
    
    if (scriptPatterns.some(pattern => pattern.test(stringContent))) {
      throw new ValidationError('Image file contains potentially malicious content');
    }
  }
  
  /**
   * Validate audio file
   * @param {Object} file - Audio file to validate
   */
  static validateAudioFile(file) {
    // Audio-specific validation
    const minSize = 1024; // 1KB minimum
    
    if (file.size < minSize) {
      throw new ValidationError('Audio file too small to be valid');
    }
    
    // Check for common audio file headers
    if (file.buffer) {
      const header = file.buffer.slice(0, 12);
      const headerString = header.toString('hex').toLowerCase();
      
      // Common audio file signatures
      const audioSignatures = [
        'fff3', 'fff2', // MP3
        '4944', // ID3 tag
        '5249464646', // RIFF (WAV)
        '1a45dfa3', // WebM
        '000000', // M4A starts with various patterns
      ];
      
      const hasValidSignature = audioSignatures.some(sig => 
        headerString.startsWith(sig)
      );
      
      if (!hasValidSignature && file.mimetype.startsWith('audio/')) {
        console.warn(`Audio file ${file.originalname} has unexpected header: ${headerString}`);
        // Don't throw error as some valid audio files might not match patterns
      }
    }
  }
}

/**
 * GraphQL Input Validator
 * Provides validation for GraphQL resolvers
 */
class GraphQLInputValidator {
  /**
   * Validate task input
   * @param {Object} input - Task input to validate
   * @returns {Object} Validated and sanitized input
   */
  static validateTaskInput(input) {
    if (!input || typeof input !== 'object') {
      throw new ValidationError('Task input is required and must be an object');
    }
    
    const validated = {};
    
    // Title (required)
    if (!input.title || typeof input.title !== 'string') {
      throw new ValidationError('Task title is required and must be a string');
    }
    validated.title = InputSanitizer.sanitizeText(input.title, { maxLength: 255 });
    
    if (validated.title.length === 0) {
      throw new ValidationError('Task title cannot be empty after sanitization');
    }
    
    // Description (optional)
    if (input.description !== undefined) {
      if (input.description !== null && typeof input.description !== 'string') {
        throw new ValidationError('Task description must be a string or null');
      }
      validated.description = input.description ? 
        InputSanitizer.sanitizeHTML(input.description, { maxLength: 10000 }) : 
        null;
    }
    
    // Priority (optional, with enum validation)
    if (input.priority !== undefined) {
      const validPriorities = ['LOWEST', 'LOW', 'MEDIUM', 'HIGH', 'HIGHEST'];
      if (!validPriorities.includes(input.priority)) {
        throw new ValidationError(`Invalid priority. Must be one of: ${validPriorities.join(', ')}`);
      }
      validated.priority = input.priority;
    } else {
      validated.priority = 'MEDIUM';
    }
    
    // Status (optional, with enum validation)
    if (input.status !== undefined) {
      const validStatuses = ['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED'];
      if (!validStatuses.includes(input.status)) {
        throw new ValidationError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      }
      validated.status = input.status;
    }
    
    // Due date (optional)
    if (input.dueDate !== undefined) {
      if (input.dueDate !== null) {
        const date = new Date(input.dueDate);
        if (isNaN(date.getTime())) {
          throw new ValidationError('Invalid due date format');
        }
        validated.dueDate = date;
      } else {
        validated.dueDate = null;
      }
    }
    
    // Tags (optional array)
    if (input.tags !== undefined) {
      if (!Array.isArray(input.tags)) {
        throw new ValidationError('Tags must be an array');
      }
      
      validated.tags = input.tags
        .slice(0, 10) // Limit to 10 tags
        .map(tag => {
          if (typeof tag !== 'string') {
            throw new ValidationError('All tags must be strings');
          }
          return InputSanitizer.sanitizeText(tag, { maxLength: 50 });
        })
        .filter(tag => tag.length > 0); // Remove empty tags
    }
    
    return validated;
  }
  
  /**
   * Validate user input
   * @param {Object} input - User input to validate
   * @returns {Object} Validated and sanitized input
   */
  static validateUserInput(input) {
    if (!input || typeof input !== 'object') {
      throw new ValidationError('User input is required and must be an object');
    }
    
    const validated = {};
    
    // Email (required for creation)
    if (input.email !== undefined) {
      validated.email = InputSanitizer.sanitizeEmail(input.email);
    }
    
    // First name
    if (input.firstName !== undefined) {
      if (typeof input.firstName !== 'string') {
        throw new ValidationError('First name must be a string');
      }
      validated.firstName = InputSanitizer.sanitizeText(input.firstName, { maxLength: 100 });
      if (validated.firstName.length === 0) {
        throw new ValidationError('First name cannot be empty');
      }
    }
    
    // Last name
    if (input.lastName !== undefined) {
      if (typeof input.lastName !== 'string') {
        throw new ValidationError('Last name must be a string');
      }
      validated.lastName = InputSanitizer.sanitizeText(input.lastName, { maxLength: 100 });
      if (validated.lastName.length === 0) {
        throw new ValidationError('Last name cannot be empty');
      }
    }
    
    // Phone (optional)
    if (input.phone !== undefined && input.phone !== null) {
      validated.phone = InputSanitizer.sanitizePhone(input.phone);
    }
    
    return validated;
  }
  
  /**
   * Validate project input
   * @param {Object} input - Project input to validate
   * @returns {Object} Validated and sanitized input
   */
  static validateProjectInput(input) {
    if (!input || typeof input !== 'object') {
      throw new ValidationError('Project input is required and must be an object');
    }
    
    const validated = {};
    
    // Name (required)
    if (!input.name || typeof input.name !== 'string') {
      throw new ValidationError('Project name is required and must be a string');
    }
    validated.name = InputSanitizer.sanitizeText(input.name, { maxLength: 255 });
    
    if (validated.name.length === 0) {
      throw new ValidationError('Project name cannot be empty after sanitization');
    }
    
    // Description (optional)
    if (input.description !== undefined) {
      if (input.description !== null && typeof input.description !== 'string') {
        throw new ValidationError('Project description must be a string or null');
      }
      validated.description = input.description ? 
        InputSanitizer.sanitizeHTML(input.description, { maxLength: 5000 }) : 
        null;
    }
    
    return validated;
  }
}

/**
 * Custom validation error class
 */
class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.code = 'VALIDATION_ERROR';
    this.statusCode = 400;
  }
}

/**
 * Request validation middleware factory
 */
class RequestValidator {
  /**
   * Create middleware for validating request body
   * @param {Function} validator - Validation function
   * @returns {Function} Express middleware
   */
  static validateBody(validator) {
    return (req, res, next) => {
      try {
        req.body = validator(req.body);
        next();
      } catch (error) {
        if (error instanceof ValidationError) {
          return res.status(400).json({
            error: 'Validation Error',
            message: error.message,
            statusCode: 400
          });
        }
        next(error);
      }
    };
  }
  
  /**
   * Create middleware for validating query parameters
   * @param {Function} validator - Validation function
   * @returns {Function} Express middleware
   */
  static validateQuery(validator) {
    return (req, res, next) => {
      try {
        req.query = validator(req.query);
        next();
      } catch (error) {
        if (error instanceof ValidationError) {
          return res.status(400).json({
            error: 'Validation Error',
            message: error.message,
            statusCode: 400
          });
        }
        next(error);
      }
    };
  }
  
  /**
   * Create middleware for validating path parameters
   * @param {Function} validator - Validation function
   * @returns {Function} Express middleware
   */
  static validateParams(validator) {
    return (req, res, next) => {
      try {
        req.params = validator(req.params);
        next();
      } catch (error) {
        if (error instanceof ValidationError) {
          return res.status(400).json({
            error: 'Validation Error',
            message: error.message,
            statusCode: 400
          });
        }
        next(error);
      }
    };
  }
}

module.exports = {
  InputSanitizer,
  GraphQLInputValidator,
  RequestValidator,
  ValidationError
};