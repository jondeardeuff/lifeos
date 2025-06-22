const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { prisma } = require('../../prisma-client');

/**
 * API Key data structure
 * @typedef {Object} ApiKey
 * @property {string} id - Unique identifier
 * @property {string} name - Human-readable name
 * @property {string} key - Hashed version of the key
 * @property {string} keyPrefix - First 8 characters for identification
 * @property {string} userId - Owner user ID
 * @property {string[]} permissions - Array of permission strings
 * @property {boolean} isActive - Whether the key is active
 * @property {Date} expiresAt - Expiration date (optional)
 * @property {Date} lastUsedAt - Last usage timestamp
 * @property {number} usageCount - Total usage count
 * @property {Object} rateLimit - Custom rate limit settings
 * @property {Date} createdAt - Creation timestamp
 * @property {Date} updatedAt - Last update timestamp
 */

class ApiKeyService {
  constructor() {
    this.keyLength = 32;
    this.prefixLength = 8;
  }

  /**
   * Create a new API key
   * @param {string} userId - User ID
   * @param {string} name - Key name
   * @param {string[]} permissions - Permissions array
   * @param {Object} options - Additional options
   * @returns {Promise<{apiKey: ApiKey, rawKey: string}>}
   */
  async createApiKey(userId, name, permissions = [], options = {}) {
    try {
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
          usageCount: 0,
          expiresAt: options.expiresAt || null,
          rateLimit: options.rateLimit || null
        }
      });
      
      return { apiKey, rawKey };
    } catch (error) {
      console.error('Error creating API key:', error);
      throw new Error('Failed to create API key');
    }
  }

  /**
   * Validate an API key
   * @param {string} rawKey - The raw API key
   * @returns {Promise<ApiKey|null>}
   */
  async validateApiKey(rawKey) {
    try {
      if (!rawKey || rawKey.length !== this.keyLength * 2) { // hex encoded
        return null;
      }

      const keyPrefix = rawKey.substring(0, this.prefixLength);
      
      // Find by prefix first (indexed for performance)
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
      
      // Verify the full key using bcrypt
      for (const candidate of candidates) {
        const isValid = await bcrypt.compare(rawKey, candidate.key);
        if (isValid) {
          return candidate;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error validating API key:', error);
      return null;
    }
  }

  /**
   * Revoke an API key
   * @param {string} keyId - API key ID
   * @param {string} userId - User ID (for security)
   * @returns {Promise<void>}
   */
  async revokeApiKey(keyId, userId) {
    try {
      await prisma.apiKey.updateMany({
        where: { 
          id: keyId, 
          userId 
        },
        data: { 
          isActive: false,
          updatedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Error revoking API key:', error);
      throw new Error('Failed to revoke API key');
    }
  }

  /**
   * Update last used timestamp and increment usage count
   * @param {string} keyId - API key ID
   * @returns {Promise<void>}
   */
  async updateLastUsed(keyId) {
    try {
      await prisma.apiKey.update({
        where: { id: keyId },
        data: {
          lastUsedAt: new Date(),
          usageCount: { increment: 1 },
          updatedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Error updating API key usage:', error);
      // Don't throw error here as it's not critical
    }
  }

  /**
   * Get all API keys for a user (excluding the actual key)
   * @param {string} userId - User ID
   * @returns {Promise<ApiKey[]>}
   */
  async getUserApiKeys(userId) {
    try {
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
          rateLimit: true,
          createdAt: true,
          updatedAt: true,
          // Exclude the actual hashed key for security
          key: false
        },
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      console.error('Error fetching user API keys:', error);
      throw new Error('Failed to fetch API keys');
    }
  }

  /**
   * Update API key permissions
   * @param {string} keyId - API key ID
   * @param {string} userId - User ID (for security)
   * @param {string[]} permissions - New permissions array
   * @returns {Promise<ApiKey>}
   */
  async updatePermissions(keyId, userId, permissions) {
    try {
      return await prisma.apiKey.update({
        where: { 
          id: keyId,
          userId 
        },
        data: { 
          permissions,
          updatedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Error updating API key permissions:', error);
      throw new Error('Failed to update API key permissions');
    }
  }

  /**
   * Get API key usage statistics
   * @param {string} userId - User ID
   * @param {Date} startDate - Start date for statistics
   * @param {Date} endDate - End date for statistics
   * @returns {Promise<Object>}
   */
  async getUsageStatistics(userId, startDate, endDate) {
    try {
      // Get API keys for the user
      const apiKeys = await this.getUserApiKeys(userId);
      
      // Get request logs for the date range
      const requestLogs = await prisma.requestLog.findMany({
        where: {
          userId,
          timestamp: {
            gte: startDate,
            lte: endDate
          },
          apiKeyId: {
            not: null
          }
        },
        select: {
          apiKeyId: true,
          statusCode: true,
          responseTime: true,
          timestamp: true
        }
      });

      // Aggregate statistics
      const stats = {
        totalRequests: requestLogs.length,
        successfulRequests: requestLogs.filter(log => log.statusCode < 400).length,
        errorRequests: requestLogs.filter(log => log.statusCode >= 400).length,
        averageResponseTime: requestLogs.length > 0 
          ? requestLogs.reduce((sum, log) => sum + log.responseTime, 0) / requestLogs.length 
          : 0,
        byApiKey: {}
      };

      // Statistics by API key
      apiKeys.forEach(apiKey => {
        const keyLogs = requestLogs.filter(log => log.apiKeyId === apiKey.id);
        stats.byApiKey[apiKey.id] = {
          name: apiKey.name,
          requests: keyLogs.length,
          successfulRequests: keyLogs.filter(log => log.statusCode < 400).length,
          errorRequests: keyLogs.filter(log => log.statusCode >= 400).length,
          averageResponseTime: keyLogs.length > 0 
            ? keyLogs.reduce((sum, log) => sum + log.responseTime, 0) / keyLogs.length 
            : 0
        };
      });

      return stats;
    } catch (error) {
      console.error('Error getting usage statistics:', error);
      throw new Error('Failed to get usage statistics');
    }
  }

  /**
   * Generate a cryptographically secure API key
   * @returns {string} Hex-encoded random key
   */
  generateSecureKey() {
    return crypto.randomBytes(this.keyLength).toString('hex');
  }

  /**
   * Check if a user has permission to perform an action
   * @param {ApiKey} apiKey - API key object
   * @param {string} permission - Permission string
   * @returns {boolean}
   */
  hasPermission(apiKey, permission) {
    if (!apiKey || !apiKey.permissions) {
      return false;
    }
    
    // Check for wildcard permission
    if (apiKey.permissions.includes('*')) {
      return true;
    }
    
    // Check for specific permission
    return apiKey.permissions.includes(permission);
  }

  /**
   * Get rate limit configuration for an API key
   * @param {ApiKey} apiKey - API key object
   * @returns {Object} Rate limit configuration
   */
  getRateLimitForApiKey(apiKey) {
    if (apiKey.rateLimit) {
      return apiKey.rateLimit;
    }
    
    // Default rate limits based on permissions
    const hasHighLimit = this.hasPermission(apiKey, 'high_rate_limit');
    
    return {
      tier: hasHighLimit ? 'premium' : 'standard',
      limits: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: hasHighLimit ? 1000 : 100
      }
    };
  }
}

module.exports = ApiKeyService;