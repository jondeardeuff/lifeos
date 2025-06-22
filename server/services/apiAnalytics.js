const { prisma } = require('../../prisma-client');

/**
 * API Metrics data structure
 * @typedef {Object} ApiMetrics
 * @property {number} totalRequests - Total number of requests
 * @property {number} successfulRequests - Number of successful requests (status < 400)
 * @property {number} errorRequests - Number of error requests (status >= 400)
 * @property {number} averageResponseTime - Average response time in milliseconds
 * @property {number} p95ResponseTime - 95th percentile response time
 * @property {number} p99ResponseTime - 99th percentile response time
 * @property {Object} requestsByEndpoint - Requests grouped by endpoint
 * @property {Object} requestsByUser - Requests grouped by user
 * @property {Object} requestsByHour - Requests grouped by hour
 * @property {Object} requestsByStatus - Requests grouped by status code
 * @property {Array} popularEndpoints - Most popular endpoints
 * @property {Array} slowestEndpoints - Slowest endpoints by average response time
 * @property {Array} errorEndpoints - Endpoints with most errors
 */

class ApiAnalyticsService {
  constructor() {
    this.logger = console; // Can be replaced with Winston logger
  }

  /**
   * Get comprehensive API metrics for a time range
   * @param {Object} timeRange - Time range object
   * @param {Date} timeRange.start - Start date
   * @param {Date} timeRange.end - End date
   * @param {Object} filters - Optional filters
   * @returns {Promise<ApiMetrics>}
   */
  async getMetrics(timeRange, filters = {}) {
    try {
      const whereClause = {
        timestamp: {
          gte: timeRange.start,
          lte: timeRange.end
        }
      };

      // Apply filters
      if (filters.userId) whereClause.userId = filters.userId;
      if (filters.apiKeyId) whereClause.apiKeyId = filters.apiKeyId;
      if (filters.method) whereClause.method = filters.method;
      if (filters.statusCode) whereClause.statusCode = filters.statusCode;

      const logs = await prisma.requestLog.findMany({
        where: whereClause,
        select: {
          method: true,
          url: true,
          statusCode: true,
          responseTime: true,
          userId: true,
          apiKeyId: true,
          timestamp: true,
          error: true
        }
      });

      return this.calculateMetrics(logs);
    } catch (error) {
      this.logger.error('Failed to get API metrics:', error);
      throw new Error('Failed to retrieve API metrics');
    }
  }

  /**
   * Calculate metrics from request logs
   * @param {Array} logs - Array of request log objects
   * @returns {ApiMetrics}
   */
  calculateMetrics(logs) {
    if (logs.length === 0) {
      return this.getEmptyMetrics();
    }

    const totalRequests = logs.length;
    const successfulRequests = logs.filter(log => log.statusCode < 400).length;
    const errorRequests = totalRequests - successfulRequests;

    const responseTimes = logs.map(log => log.responseTime).sort((a, b) => a - b);
    const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / totalRequests;
    const p95ResponseTime = this.calculatePercentile(responseTimes, 95);
    const p99ResponseTime = this.calculatePercentile(responseTimes, 99);

    const requestsByEndpoint = this.groupBy(logs, log => this.normalizeEndpoint(log.url));
    const requestsByUser = this.groupBy(logs, log => log.userId || 'anonymous');
    const requestsByHour = this.groupBy(logs, log => 
      new Date(log.timestamp).toISOString().substring(0, 13) + ':00:00.000Z'
    );
    const requestsByStatus = this.groupBy(logs, log => Math.floor(log.statusCode / 100) * 100);

    // Calculate endpoint statistics
    const endpointStats = this.calculateEndpointStats(logs);
    const popularEndpoints = Object.entries(requestsByEndpoint)
      .map(([endpoint, count]) => ({ endpoint, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const slowestEndpoints = Object.entries(endpointStats)
      .map(([endpoint, stats]) => ({
        endpoint,
        avgResponseTime: stats.avgResponseTime,
        requestCount: stats.count
      }))
      .sort((a, b) => b.avgResponseTime - a.avgResponseTime)
      .slice(0, 10);

    const errorEndpoints = Object.entries(endpointStats)
      .map(([endpoint, stats]) => ({
        endpoint,
        errorRate: stats.errorRate,
        errorCount: stats.errorCount,
        totalCount: stats.count
      }))
      .filter(item => item.errorCount > 0)
      .sort((a, b) => b.errorRate - a.errorRate)
      .slice(0, 10);

    return {
      totalRequests,
      successfulRequests,
      errorRequests,
      averageResponseTime: Math.round(averageResponseTime * 100) / 100,
      p95ResponseTime: Math.round(p95ResponseTime * 100) / 100,
      p99ResponseTime: Math.round(p99ResponseTime * 100) / 100,
      requestsByEndpoint,
      requestsByUser,
      requestsByHour,
      requestsByStatus,
      popularEndpoints,
      slowestEndpoints,
      errorEndpoints,
      // Additional computed metrics
      errorRate: (errorRequests / totalRequests) * 100,
      uniqueUsers: Object.keys(requestsByUser).filter(userId => userId !== 'anonymous').length,
      uniqueEndpoints: Object.keys(requestsByEndpoint).length
    };
  }

  /**
   * Calculate endpoint-specific statistics
   * @param {Array} logs - Request logs
   * @returns {Object} Endpoint statistics
   */
  calculateEndpointStats(logs) {
    const endpointStats = {};

    logs.forEach(log => {
      const endpoint = this.normalizeEndpoint(log.url);
      
      if (!endpointStats[endpoint]) {
        endpointStats[endpoint] = {
          count: 0,
          totalResponseTime: 0,
          errorCount: 0,
          statusCodes: {}
        };
      }

      const stats = endpointStats[endpoint];
      stats.count++;
      stats.totalResponseTime += log.responseTime;
      
      if (log.statusCode >= 400) {
        stats.errorCount++;
      }

      const statusGroup = Math.floor(log.statusCode / 100) * 100;
      stats.statusCodes[statusGroup] = (stats.statusCodes[statusGroup] || 0) + 1;
    });

    // Calculate derived metrics
    Object.keys(endpointStats).forEach(endpoint => {
      const stats = endpointStats[endpoint];
      stats.avgResponseTime = stats.totalResponseTime / stats.count;
      stats.errorRate = (stats.errorCount / stats.count) * 100;
    });

    return endpointStats;
  }

  /**
   * Get empty metrics object
   * @returns {ApiMetrics}
   */
  getEmptyMetrics() {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      errorRequests: 0,
      averageResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      requestsByEndpoint: {},
      requestsByUser: {},
      requestsByHour: {},
      requestsByStatus: {},
      popularEndpoints: [],
      slowestEndpoints: [],
      errorEndpoints: [],
      errorRate: 0,
      uniqueUsers: 0,
      uniqueEndpoints: 0
    };
  }

  /**
   * Generate daily aggregated metrics report
   * @param {Date} date - Date to generate report for (defaults to yesterday)
   * @returns {Promise<void>}
   */
  async generateDailyReport(date = null) {
    try {
      const targetDate = date || new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const metrics = await this.getMetrics({
        start: startOfDay,
        end: endOfDay
      });

      // Check if report already exists for this date
      const existingReport = await prisma.dailyApiMetrics.findUnique({
        where: { date: startOfDay }
      });

      if (existingReport) {
        // Update existing report
        await prisma.dailyApiMetrics.update({
          where: { date: startOfDay },
          data: { metrics: metrics }
        });
        this.logger.info(`Updated daily API metrics report for ${startOfDay.toISOString().split('T')[0]}`);
      } else {
        // Create new report
        await prisma.dailyApiMetrics.create({
          data: {
            date: startOfDay,
            metrics: metrics
          }
        });
        this.logger.info(`Created daily API metrics report for ${startOfDay.toISOString().split('T')[0]}`);
      }

      return metrics;
    } catch (error) {
      this.logger.error('Failed to generate daily report:', error);
      throw new Error('Failed to generate daily metrics report');
    }
  }

  /**
   * Get historical daily metrics
   * @param {number} days - Number of days to retrieve (default: 30)
   * @returns {Promise<Array>}
   */
  async getHistoricalMetrics(days = 30) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const reports = await prisma.dailyApiMetrics.findMany({
        where: {
          date: {
            gte: startDate,
            lte: endDate
          }
        },
        orderBy: { date: 'asc' }
      });

      return reports.map(report => ({
        date: report.date,
        ...report.metrics
      }));
    } catch (error) {
      this.logger.error('Failed to get historical metrics:', error);
      throw new Error('Failed to retrieve historical metrics');
    }
  }

  /**
   * Get real-time metrics (last hour)
   * @returns {Promise<ApiMetrics>}
   */
  async getRealTimeMetrics() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    return this.getMetrics({
      start: oneHourAgo,
      end: now
    });
  }

  /**
   * Get user-specific analytics
   * @param {string} userId - User ID
   * @param {Object} timeRange - Time range
   * @returns {Promise<Object>}
   */
  async getUserAnalytics(userId, timeRange) {
    try {
      const userMetrics = await this.getMetrics(timeRange, { userId });
      
      // Get user's API keys analytics
      const apiKeys = await prisma.apiKey.findMany({
        where: { userId },
        select: { id: true, name: true }
      });

      const apiKeyAnalytics = {};
      for (const apiKey of apiKeys) {
        apiKeyAnalytics[apiKey.id] = {
          name: apiKey.name,
          metrics: await this.getMetrics(timeRange, { apiKeyId: apiKey.id })
        };
      }

      return {
        userMetrics,
        apiKeyAnalytics
      };
    } catch (error) {
      this.logger.error('Failed to get user analytics:', error);
      throw new Error('Failed to retrieve user analytics');
    }
  }

  /**
   * Normalize endpoint URL for grouping
   * @param {string} url - Request URL
   * @returns {string} Normalized endpoint
   */
  normalizeEndpoint(url) {
    return url
      .split('?')[0] // Remove query parameters
      .replace(/\/[a-f0-9-]{36}/g, '/:uuid') // Replace UUIDs with :uuid
      .replace(/\/[0-9]+/g, '/:id') // Replace numeric IDs with :id
      .replace(/\/[a-zA-Z0-9]{24}/g, '/:id'); // Replace MongoDB ObjectIds with :id
  }

  /**
   * Group array items by a key function
   * @param {Array} array - Array to group
   * @param {function} keyFn - Function to generate grouping key
   * @returns {Object} Grouped object
   */
  groupBy(array, keyFn) {
    return array.reduce((acc, item) => {
      const key = keyFn(item);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }

  /**
   * Calculate percentile from sorted array
   * @param {Array} sortedValues - Sorted array of values
   * @param {number} percentile - Percentile to calculate (0-100)
   * @returns {number} Percentile value
   */
  calculatePercentile(sortedValues, percentile) {
    if (sortedValues.length === 0) return 0;
    
    const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
    return sortedValues[Math.max(0, index)] || 0;
  }

  /**
   * Setup automatic daily report generation
   * This should be called when the server starts
   */
  setupDailyReportCron() {
    // Run at 1 AM every day
    const runDaily = () => {
      this.generateDailyReport().catch(error => {
        this.logger.error('Daily report generation failed:', error);
      });
    };

    // Calculate time until next 1 AM
    const now = new Date();
    const tomorrow1AM = new Date(now);
    tomorrow1AM.setDate(tomorrow1AM.getDate() + 1);
    tomorrow1AM.setHours(1, 0, 0, 0);
    
    const timeUntilNext1AM = tomorrow1AM.getTime() - now.getTime();

    // Set initial timeout, then interval
    setTimeout(() => {
      runDaily();
      // Then run every 24 hours
      setInterval(runDaily, 24 * 60 * 60 * 1000);
    }, timeUntilNext1AM);

    this.logger.info(`Daily report generation scheduled. Next run at ${tomorrow1AM.toISOString()}`);
  }

  /**
   * Cleanup old analytics data
   * @param {number} daysToKeep - Number of days to keep
   * @returns {Promise<number>}
   */
  async cleanupOldAnalytics(daysToKeep = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await prisma.dailyApiMetrics.deleteMany({
        where: {
          date: {
            lt: cutoffDate
          }
        }
      });

      this.logger.info(`Cleaned up ${result.count} old analytics records`);
      return result.count;
    } catch (error) {
      this.logger.error('Failed to cleanup old analytics:', error);
      throw error;
    }
  }
}

module.exports = ApiAnalyticsService;