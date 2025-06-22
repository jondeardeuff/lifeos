const crypto = require('crypto');
const bcrypt = require('bcryptjs');

/**
 * Mock API Key Service for testing without database
 * This is a temporary solution until Prisma is properly generated
 */
class ApiKeyServiceMock {
  constructor() {
    this.keyLength = 32;
    this.prefixLength = 8;
    this.apiKeys = new Map(); // In-memory storage
  }

  /**
   * Generate a secure random key
   * @returns {string}
   */
  generateSecureKey() {
    return crypto.randomBytes(this.keyLength).toString('base64url');
  }

  /**
   * Create a new API key
   * @param {string} userId - User ID
   * @param {string} name - Key name
   * @param {string[]} permissions - Permissions array
   * @param {Object} options - Additional options
   * @returns {Promise<{apiKey: Object, rawKey: string}>}
   */
  async createApiKey(userId, name, permissions = [], options = {}) {
    try {
      const rawKey = this.generateSecureKey();
      const hashedKey = await bcrypt.hash(rawKey, 12);
      const keyPrefix = rawKey.substring(0, this.prefixLength);
      
      const apiKey = {
        id: crypto.randomUUID(),
        name,
        key: hashedKey,
        keyPrefix,
        userId,
        permissions,
        isActive: true,
        expiresAt: options.expiresAt || null,
        lastUsedAt: null,
        usageCount: 0,
        rateLimit: options.rateLimit || null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Store in memory
      this.apiKeys.set(apiKey.id, apiKey);
      
      // Return both the created key and the raw key (only shown once)
      return {
        apiKey: {
          ...apiKey,
          key: undefined // Don't expose hashed key
        },
        rawKey: `lifeos_${keyPrefix}_${rawKey}`
      };
    } catch (error) {
      console.error('Error creating API key:', error);
      throw new Error('Failed to create API key');
    }
  }

  /**
   * Validate an API key
   * @param {string} rawKey - The raw API key to validate
   * @returns {Promise<Object|null>}
   */
  async validateApiKey(rawKey) {
    try {
      // Extract the actual key from the formatted string
      const keyParts = rawKey.split('_');
      if (keyParts.length !== 3 || keyParts[0] !== 'lifeos') {
        return null;
      }
      
      const keyPrefix = keyParts[1];
      const actualKey = keyParts[2];
      
      // Find key by prefix
      for (const [id, apiKey] of this.apiKeys) {
        if (apiKey.keyPrefix === keyPrefix && apiKey.isActive) {
          // Check expiration
          if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
            return null;
          }
          
          // Verify the key
          const isValid = await bcrypt.compare(actualKey, apiKey.key);
          if (isValid) {
            // Update usage
            apiKey.lastUsedAt = new Date();
            apiKey.usageCount += 1;
            
            return {
              ...apiKey,
              key: undefined // Don't expose hashed key
            };
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error validating API key:', error);
      return null;
    }
  }

  /**
   * Get all API keys for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object[]>}
   */
  async getUserApiKeys(userId) {
    const userKeys = [];
    for (const [id, apiKey] of this.apiKeys) {
      if (apiKey.userId === userId) {
        userKeys.push({
          ...apiKey,
          key: undefined // Don't expose hashed key
        });
      }
    }
    return userKeys;
  }

  /**
   * Revoke an API key
   * @param {string} keyId - API key ID
   * @param {string} userId - User ID (for ownership verification)
   * @returns {Promise<boolean>}
   */
  async revokeApiKey(keyId, userId) {
    const apiKey = this.apiKeys.get(keyId);
    
    if (!apiKey || apiKey.userId !== userId) {
      throw new Error('API key not found or unauthorized');
    }
    
    apiKey.isActive = false;
    apiKey.updatedAt = new Date();
    
    return true;
  }

  /**
   * Get API key by ID
   * @param {string} keyId - API key ID
   * @returns {Promise<Object|null>}
   */
  async getApiKeyById(keyId) {
    const apiKey = this.apiKeys.get(keyId);
    if (!apiKey) return null;
    
    return {
      ...apiKey,
      key: undefined // Don't expose hashed key
    };
  }
}

module.exports = ApiKeyServiceMock;