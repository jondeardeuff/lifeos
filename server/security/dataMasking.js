/**
 * Data Masking Service
 * Provides privacy protection by masking sensitive data in responses and logs
 */
class DataMasking {
  constructor() {
    // Define masking rules for different data types
    this.maskingRules = {
      email: {
        pattern: /^(.{1,2}).*(@.+)$/,
        replacement: '$1****$2',
        description: 'Mask email keeping first 1-2 chars and domain'
      },
      phone: {
        pattern: /^(\+?\d{1,3})?.*(\d{4})$/,
        replacement: '$1***-***-$2',
        description: 'Mask phone keeping country code and last 4 digits'
      },
      ssn: {
        pattern: /^(\d{3}).*(\d{4})$/,
        replacement: '***-**-$2',
        description: 'Mask SSN keeping only last 4 digits'
      },
      creditCard: {
        pattern: /^(\d{4}).*(\d{4})$/,
        replacement: '$1-****-****-$2',
        description: 'Mask credit card keeping first and last 4 digits'
      },
      apiKey: {
        pattern: /^(.{8}).*$/,
        replacement: '$1****',
        description: 'Mask API key keeping first 8 characters'
      },
      address: {
        pattern: /^(\d+\s+)(.+)(\s+\w{2}\s+\d{5})$/,
        replacement: '$1*** $3',
        description: 'Mask street address keeping number and zip'
      },
      name: {
        pattern: /^(\w).*(\s+\w).*$/,
        replacement: '$1****$2****',
        description: 'Mask name keeping first letter of each word'
      }
    };
    
    // Define sensitive field patterns
    this.sensitiveFields = {
      critical: new Set([
        'ssn', 'socialSecurityNumber', 'taxId', 'taxIdentificationNumber',
        'bankAccount', 'accountNumber', 'routingNumber',
        'creditCard', 'creditCardNumber', 'cardNumber',
        'password', 'passwd', 'secret', 'privateKey',
        'token', 'accessToken', 'refreshToken', 'apiKey'
      ]),
      personal: new Set([
        'email', 'emailAddress', 'personalEmail',
        'phone', 'phoneNumber', 'mobileNumber', 'cellPhone',
        'address', 'homeAddress', 'streetAddress', 'mailingAddress',
        'firstName', 'lastName', 'fullName', 'name',
        'dateOfBirth', 'birthDate', 'dob'
      ]),
      business: new Set([
        'salary', 'income', 'compensation', 'wage',
        'employeeId', 'workerId', 'badgeNumber',
        'workEmail', 'businessEmail', 'companyEmail'
      ])
    };
    
    // Define masking levels for different user roles
    this.maskingLevels = {
      admin: [], // No masking for admin users
      manager: ['critical'], // Mask only critical fields for managers
      user: ['critical', 'personal'], // Mask critical and personal for regular users
      guest: ['critical', 'personal', 'business'] // Mask everything for guests
    };
  }
  
  /**
   * Mask sensitive data in response based on user role
   * @param {*} data - Data to mask (object, array, or primitive)
   * @param {string} userRole - User role (admin, manager, user, guest)
   * @param {Object} options - Masking options
   * @returns {*} Masked data
   */
  maskSensitiveData(data, userRole = 'user', options = {}) {
    if (!data || typeof data !== 'object') {
      return data;
    }
    
    // Get masking levels for user role
    const maskingLevels = this.maskingLevels[userRole] || this.maskingLevels.user;
    
    // Admin users see unmasked data unless explicitly overridden
    if (userRole === 'admin' && !options.forceAdmin) {
      return data;
    }
    
    // Clone data to avoid mutating original
    const masked = this.deepClone(data);
    
    // Apply masking recursively
    this.recursivelyMask(masked, maskingLevels, options);
    
    return masked;
  }
  
  /**
   * Recursively mask sensitive fields in data structure
   * @param {Object|Array} obj - Object to mask
   * @param {Array} maskingLevels - Levels of masking to apply
   * @param {Object} options - Masking options
   */
  recursivelyMask(obj, maskingLevels, options = {}) {
    if (!obj || typeof obj !== 'object') {
      return;
    }
    
    if (Array.isArray(obj)) {
      obj.forEach(item => this.recursivelyMask(item, maskingLevels, options));
      return;
    }
    
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string' && value.length > 0) {
        const maskedValue = this.maskField(key, value, maskingLevels, options);
        if (maskedValue !== value) {
          obj[key] = maskedValue;
        }
      } else if (typeof value === 'object' && value !== null) {
        this.recursivelyMask(value, maskingLevels, options);
      }
    }
  }
  
  /**
   * Mask individual field based on field name and masking levels
   * @param {string} fieldName - Name of the field
   * @param {string} value - Value to mask
   * @param {Array} maskingLevels - Levels of masking to apply
   * @param {Object} options - Masking options
   * @returns {string} Masked value
   */
  maskField(fieldName, value, maskingLevels, options = {}) {
    const lowerFieldName = fieldName.toLowerCase();
    
    // Check if field should be masked based on masking levels
    const shouldMask = maskingLevels.some(level => {
      const fieldsToMask = this.sensitiveFields[level];
      return fieldsToMask && Array.from(fieldsToMask).some(field => 
        lowerFieldName.includes(field.toLowerCase())
      );
    });
    
    if (!shouldMask) {
      return value;
    }
    
    // Apply specific masking rule if available
    const maskingRule = this.findMaskingRule(lowerFieldName);
    if (maskingRule) {
      try {
        return value.replace(maskingRule.pattern, maskingRule.replacement);
      } catch (error) {
        console.error(`Error applying masking rule for ${fieldName}:`, error);
        return this.applyGenericMasking(value);
      }
    }
    
    // Apply generic masking for critical fields
    if (this.sensitiveFields.critical.has(lowerFieldName)) {
      return '***REDACTED***';
    }
    
    // Apply generic masking for other sensitive fields
    return this.applyGenericMasking(value);
  }
  
  /**
   * Find appropriate masking rule for field
   * @param {string} fieldName - Field name (lowercase)
   * @returns {Object|null} Masking rule or null
   */
  findMaskingRule(fieldName) {
    for (const [ruleName, rule] of Object.entries(this.maskingRules)) {
      if (fieldName.includes(ruleName.toLowerCase())) {
        return rule;
      }
    }
    return null;
  }
  
  /**
   * Apply generic masking when no specific rule exists
   * @param {string} value - Value to mask
   * @returns {string} Masked value
   */
  applyGenericMasking(value) {
    if (value.length <= 3) {
      return '*'.repeat(value.length);
    } else if (value.length <= 6) {
      return value.substring(0, 1) + '*'.repeat(value.length - 2) + value.substring(value.length - 1);
    } else {
      return value.substring(0, 2) + '*'.repeat(Math.min(value.length - 4, 8)) + value.substring(value.length - 2);
    }
  }
  
  /**
   * Mask data for logging purposes
   * @param {*} data - Data to mask
   * @param {Object} options - Masking options
   * @returns {*} Masked data safe for logging
   */
  maskForLogging(data, options = {}) {
    if (!data || typeof data !== 'object') {
      return data;
    }
    
    // Clone data
    const masked = this.deepClone(data);
    
    // Define sensitive fields for logging
    const sensitiveLogFields = new Set([
      'password', 'passwd', 'secret', 'token', 'key', 'auth', 'authorization',
      'cookie', 'session', 'csrf', 'api_key', 'apikey',
      'email', 'phone', 'ssn', 'credit', 'bank', 'account'
    ]);
    
    this.maskLogData(masked, sensitiveLogFields);
    
    return masked;
  }
  
  /**
   * Recursively mask data for logging
   * @param {Object|Array} obj - Object to mask
   * @param {Set} sensitiveFields - Set of sensitive field patterns
   */
  maskLogData(obj, sensitiveFields) {
    if (!obj || typeof obj !== 'object') {
      return;
    }
    
    if (Array.isArray(obj)) {
      obj.forEach(item => this.maskLogData(item, sensitiveFields));
      return;
    }
    
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      
      // Check if key contains sensitive patterns
      const isSensitive = Array.from(sensitiveFields).some(field => 
        lowerKey.includes(field.toLowerCase())
      );
      
      if (isSensitive) {
        obj[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        this.maskLogData(value, sensitiveFields);
      }
    }
  }
  
  /**
   * Mask GraphQL response data
   * @param {Object} result - GraphQL result
   * @param {string} userRole - User role
   * @param {Object} options - Masking options
   * @returns {Object} Masked GraphQL result
   */
  maskGraphQLResponse(result, userRole, options = {}) {
    if (!result || !result.data) {
      return result;
    }
    
    const masked = { ...result };
    masked.data = this.maskSensitiveData(result.data, userRole, options);
    
    return masked;
  }
  
  /**
   * Create masking middleware for Express
   * @param {Object} options - Middleware options
   * @returns {Function} Express middleware
   */
  createMaskingMiddleware(options = {}) {
    return (req, res, next) => {
      // Get user role from auth context
      const userRole = req.authContext?.user?.role || 'user';
      
      // Override res.json to apply masking
      const originalJson = res.json.bind(res);
      res.json = (data) => {
        // Apply masking based on route and user role
        const shouldMask = this.shouldMaskResponse(req, options);
        
        if (shouldMask) {
          const maskedData = this.maskSensitiveData(data, userRole, options);
          return originalJson(maskedData);
        }
        
        return originalJson(data);
      };
      
      next();
    };
  }
  
  /**
   * Determine if response should be masked
   * @param {Object} req - Express request object
   * @param {Object} options - Options
   * @returns {boolean} True if response should be masked
   */
  shouldMaskResponse(req, options = {}) {
    // Always mask for non-admin users unless explicitly disabled
    if (options.disabled) {
      return false;
    }
    
    // Don't mask health checks
    if (req.path === '/health' || req.path.startsWith('/api/health')) {
      return false;
    }
    
    // Don't mask authentication endpoints (they handle their own masking)
    if (req.path.startsWith('/api/auth/')) {
      return false;
    }
    
    // Mask by default
    return true;
  }
  
  /**
   * Deep clone object to avoid mutations
   * @param {*} obj - Object to clone
   * @returns {*} Cloned object
   */
  deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    if (obj instanceof Date) {
      return new Date(obj.getTime());
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.deepClone(item));
    }
    
    const cloned = {};
    for (const [key, value] of Object.entries(obj)) {
      cloned[key] = this.deepClone(value);
    }
    
    return cloned;
  }
  
  /**
   * Add custom masking rule
   * @param {string} name - Rule name
   * @param {Object} rule - Masking rule
   */
  addMaskingRule(name, rule) {
    if (!rule.pattern || !rule.replacement) {
      throw new Error('Masking rule must have pattern and replacement');
    }
    
    this.maskingRules[name] = {
      pattern: rule.pattern,
      replacement: rule.replacement,
      description: rule.description || `Custom rule: ${name}`
    };
  }
  
  /**
   * Add sensitive field pattern
   * @param {string} category - Category (critical, personal, business)
   * @param {string} fieldName - Field name pattern
   */
  addSensitiveField(category, fieldName) {
    if (!this.sensitiveFields[category]) {
      this.sensitiveFields[category] = new Set();
    }
    
    this.sensitiveFields[category].add(fieldName.toLowerCase());
  }
  
  /**
   * Get masking statistics
   * @returns {Object} Statistics about masking rules and fields
   */
  getStatistics() {
    return {
      maskingRules: Object.keys(this.maskingRules).length,
      sensitiveFieldCategories: Object.keys(this.sensitiveFields).length,
      totalSensitiveFields: Object.values(this.sensitiveFields)
        .reduce((total, set) => total + set.size, 0),
      maskingLevels: Object.keys(this.maskingLevels).length
    };
  }
  
  /**
   * Test masking rules with sample data
   * @returns {Object} Test results
   */
  testMaskingRules() {
    const testData = {
      email: 'user@example.com',
      phone: '+1-555-123-4567',
      ssn: '123-45-6789',
      creditCard: '4532-1234-5678-9012',
      apiKey: 
    };
    
    const results = {};
    
    for (const [field, value] of Object.entries(testData)) {
      const masked = this.maskField(field, value, ['critical', 'personal'], {});
      results[field] = {
        original: value,
        masked: masked,
        changed: value !== masked
      };
    }
    
    return results;
  }
}

module.exports = {
  DataMasking
};