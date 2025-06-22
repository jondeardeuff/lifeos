const crypto = require('crypto');

/**
 * Data Encryption Service for AES-256-GCM encryption at rest
 * Provides secure encryption/decryption for sensitive data fields
 */
class DataEncryption {
  constructor(masterKeyBase64) {
    this.config = {
      algorithm: 'aes-256-gcm',
      keySize: 32, // 256 bits
      ivSize: 16,  // 128 bits
      saltSize: 16,
      tagSize: 16,
      iterations: 100000 // PBKDF2 iterations
    };
    
    if (!masterKeyBase64) {
      throw new Error('Master key is required for encryption');
    }
    
    try {
      this.masterKey = Buffer.from(masterKeyBase64, 'base64');
      if (this.masterKey.length !== this.config.keySize) {
        throw new Error(`Invalid master key size. Expected ${this.config.keySize} bytes`);
      }
    } catch (error) {
      throw new Error(`Invalid master key format: ${error.message}`);
    }
  }
  
  /**
   * Encrypt sensitive data field
   * @param {string} plaintext - Data to encrypt
   * @param {string} context - Additional authentication data (optional)
   * @returns {Promise<string>} Base64 encoded encrypted data
   */
  async encryptField(plaintext, context = '') {
    if (typeof plaintext !== 'string') {
      throw new Error('Plaintext must be a string');
    }
    
    if (plaintext.length === 0) {
      return plaintext; // Don't encrypt empty strings
    }
    
    try {
      const salt = crypto.randomBytes(this.config.saltSize);
      const iv = crypto.randomBytes(this.config.ivSize);
      
      // Derive encryption key using PBKDF2
      const key = crypto.pbkdf2Sync(
        this.masterKey, 
        salt, 
        this.config.iterations, 
        this.config.keySize, 
        'sha256'
      );
      
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
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }
  
  /**
   * Decrypt sensitive data field
   * @param {string} encryptedData - Base64 encoded encrypted data
   * @param {string} context - Additional authentication data (optional)
   * @returns {Promise<string>} Decrypted plaintext
   */
  async decryptField(encryptedData, context = '') {
    if (typeof encryptedData !== 'string') {
      throw new Error('Encrypted data must be a string');
    }
    
    if (encryptedData.length === 0) {
      return encryptedData; // Return empty strings as-is
    }
    
    try {
      const combined = Buffer.from(encryptedData, 'base64');
      
      // Validate minimum length
      const minLength = this.config.saltSize + this.config.ivSize + this.config.tagSize;
      if (combined.length < minLength) {
        throw new Error('Invalid encrypted data format');
      }
      
      // Extract components
      const salt = combined.subarray(0, this.config.saltSize);
      const iv = combined.subarray(this.config.saltSize, this.config.saltSize + this.config.ivSize);
      const tag = combined.subarray(
        this.config.saltSize + this.config.ivSize, 
        this.config.saltSize + this.config.ivSize + this.config.tagSize
      );
      const encrypted = combined.subarray(this.config.saltSize + this.config.ivSize + this.config.tagSize);
      
      // Derive decryption key
      const key = crypto.pbkdf2Sync(
        this.masterKey, 
        salt, 
        this.config.iterations, 
        this.config.keySize, 
        'sha256'
      );
      
      // Create decipher
      const decipher = crypto.createDecipherGCM(this.config.algorithm, key, iv);
      decipher.setAuthTag(tag);
      
      if (context) {
        decipher.setAAD(Buffer.from(context, 'utf8'));
      }
      
      let decrypted = decipher.update(encrypted, undefined, 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }
  
  /**
   * Generate new master key for encryption
   * @returns {string} Base64 encoded master key
   */
  static generateMasterKey() {
    return crypto.randomBytes(32).toString('base64');
  }
  
  /**
   * Validate encryption configuration
   * @returns {boolean} True if configuration is valid
   */
  validateConfig() {
    try {
      // Test encryption/decryption with sample data
      const testData = 'test-encryption-validation';
      const encrypted = this.encryptField(testData);
      const decrypted = this.decryptField(encrypted);
      
      return decrypted === testData;
    } catch (error) {
      console.error('Encryption validation failed:', error);
      return false;
    }
  }
}

/**
 * Prisma middleware for automatic encryption/decryption
 * Handles transparent encryption of sensitive fields
 */
class PrismaEncryption {
  constructor(encryption) {
    this.encryption = encryption;
    
    // Define which fields should be encrypted
    this.encryptedFields = new Set([
      'email',
      'phone', 
      'personalData',
      'sensitiveNotes',
      'bankAccount',
      'ssn',
      'address'
    ]);
    
    // Define which models have encrypted fields
    this.encryptedModels = new Set([
      'User',
      'UserProfile', 
      'Task',
      'Project'
    ]);
  }
  
  /**
   * Create Prisma middleware for encryption
   * @returns {Function} Prisma middleware function
   */
  createMiddleware() {
    return async (params, next) => {
      try {
        // Only process models that have encrypted fields
        if (!this.encryptedModels.has(params.model)) {
          return await next(params);
        }
        
        // Encrypt on create/update/upsert
        if (['create', 'update', 'upsert'].includes(params.action)) {
          if (params.args.data) {
            await this.encryptDataFields(params.args.data, params.model);
          }
          
          // Handle upsert create and update separately
          if (params.action === 'upsert') {
            if (params.args.create) {
              await this.encryptDataFields(params.args.create, params.model);
            }
            if (params.args.update) {
              await this.encryptDataFields(params.args.update, params.model);
            }
          }
        }
        
        const result = await next(params);
        
        // Decrypt on read operations
        if (['findUnique', 'findFirst', 'findMany'].includes(params.action)) {
          await this.decryptResult(result, params.model);
        }
        
        return result;
      } catch (error) {
        console.error('Encryption middleware error:', error);
        throw error;
      }
    };
  }
  
  /**
   * Encrypt data fields before storage
   * @param {Object} data - Data object to encrypt
   * @param {string} tableName - Name of the table/model
   */
  async encryptDataFields(data, tableName) {
    if (!data || typeof data !== 'object') return;
    
    for (const [key, value] of Object.entries(data)) {
      if (this.encryptedFields.has(key) && typeof value === 'string' && value.length > 0) {
        try {
          const context = `${tableName}.${key}`;
          data[key] = await this.encryption.encryptField(value, context);
        } catch (error) {
          console.error(`Failed to encrypt field ${tableName}.${key}:`, error);
          // Don't fail the operation, but log the error
        }
      }
      
      // Handle nested objects (for JSON fields)
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        await this.encryptDataFields(value, tableName);
      }
    }
  }
  
  /**
   * Decrypt result data after retrieval
   * @param {Object|Array} result - Result from database
   * @param {string} tableName - Name of the table/model
   */
  async decryptResult(result, tableName) {
    if (!result) return;
    
    const items = Array.isArray(result) ? result : [result];
    
    for (const item of items) {
      if (!item || typeof item !== 'object') continue;
      
      for (const [key, value] of Object.entries(item)) {
        if (this.encryptedFields.has(key) && typeof value === 'string' && value.length > 0) {
          try {
            const context = `${tableName}.${key}`;
            item[key] = await this.encryption.decryptField(value, context);
          } catch (error) {
            console.error(`Failed to decrypt field ${tableName}.${key}:`, error);
            // Leave encrypted data with indicator rather than failing
            item[key] = '[ENCRYPTED_DATA]';
          }
        }
        
        // Handle nested objects
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          await this.decryptResult(value, tableName);
        }
      }
    }
  }
  
  /**
   * Add field to encryption list
   * @param {string} fieldName - Field name to encrypt
   */
  addEncryptedField(fieldName) {
    this.encryptedFields.add(fieldName);
  }
  
  /**
   * Remove field from encryption list
   * @param {string} fieldName - Field name to stop encrypting
   */
  removeEncryptedField(fieldName) {
    this.encryptedFields.delete(fieldName);
  }
  
  /**
   * Get list of encrypted fields
   * @returns {Array<string>} List of encrypted field names
   */
  getEncryptedFields() {
    return Array.from(this.encryptedFields);
  }
}

/**
 * Key management for encryption
 * Handles key rotation and storage
 */
class EncryptionKeyManager {
  constructor() {
    this.activeKeyVersion = 1;
    this.keys = new Map();
  }
  
  /**
   * Initialize with master key
   * @param {string} masterKey - Base64 encoded master key
   * @param {number} version - Key version (default: 1)
   */
  initialize(masterKey, version = 1) {
    if (!masterKey) {
      throw new Error('Master key is required');
    }
    
    this.keys.set(version, masterKey);
    this.activeKeyVersion = version;
  }
  
  /**
   * Get active encryption instance
   * @returns {DataEncryption} Active encryption instance
   */
  getActiveEncryption() {
    const activeKey = this.keys.get(this.activeKeyVersion);
    if (!activeKey) {
      throw new Error('No active encryption key found');
    }
    
    return new DataEncryption(activeKey);
  }
  
  /**
   * Rotate encryption key
   * @returns {string} New master key
   */
  rotateKey() {
    const newKey = DataEncryption.generateMasterKey();
    const newVersion = this.activeKeyVersion + 1;
    
    this.keys.set(newVersion, newKey);
    this.activeKeyVersion = newVersion;
    
    console.log(`Encryption key rotated to version ${newVersion}`);
    
    return newKey;
  }
  
  /**
   * Get encryption instance for specific key version
   * @param {number} version - Key version
   * @returns {DataEncryption} Encryption instance for specified version
   */
  getEncryption(version) {
    const key = this.keys.get(version);
    if (!key) {
      throw new Error(`Encryption key version ${version} not found`);
    }
    
    return new DataEncryption(key);
  }
}

module.exports = {
  DataEncryption,
  PrismaEncryption,
  EncryptionKeyManager
};