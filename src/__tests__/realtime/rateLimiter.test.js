const { SocketRateLimiter } = require('../../realtime/rateLimiter');

// Mock the RateLimit class
jest.mock('../../types/realtime', () => ({
  RateLimit: jest.fn().mockImplementation((maxEvents, windowMs) => ({
    checkLimit: jest.fn(() => true),
    getResetTime: jest.fn(() => Date.now() + windowMs)
  }))
}));

describe('SocketRateLimiter', () => {
  let rateLimiter;
  let mockSocket;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create rate limiter with test configuration
    rateLimiter = new SocketRateLimiter({
      maxEventsPerMinute: 10,
      maxEventsPerHour: 100,
      maxSocketEventsPerMinute: 5,
      maxIpEventsPerMinute: 20,
      whitelistedUsers: ['whitelisted-user'],
      whitelistedIps: ['127.0.0.1']
    });

    // Create mock socket
    mockSocket = {
      id: 'test-socket-id',
      userId: 'test-user-id',
      handshake: {
        address: '192.168.1.1'
      },
      emit: jest.fn()
    };
  });

  afterEach(() => {
    if (rateLimiter) {
      rateLimiter.destroy();
    }
  });

  describe('Rate Limit Checking', () => {
    test('should allow requests within limits', () => {
      const result = rateLimiter.checkRateLimit(mockSocket, 'test_event');
      
      expect(result.allowed).toBe(true);
    });

    test('should allow whitelisted users', () => {
      const whitelistedSocket = {
        ...mockSocket,
        userId: 'whitelisted-user'
      };
      
      const result = rateLimiter.checkRateLimit(whitelistedSocket, 'test_event');
      
      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('whitelisted');
    });

    test('should allow whitelisted IPs', () => {
      const whitelistedSocket = {
        ...mockSocket,
        handshake: {
          address: '127.0.0.1'
        }
      };
      
      const result = rateLimiter.checkRateLimit(whitelistedSocket, 'test_event');
      
      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('whitelisted');
    });

    test('should block requests when user is blocked', () => {
      // Block the user first
      rateLimiter.blockedUsers.add(mockSocket.userId);
      
      const result = rateLimiter.checkRateLimit(mockSocket, 'test_event');
      
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('user_blocked');
    });

    test('should block requests when IP is blocked', () => {
      // Block the IP first
      rateLimiter.blockedIps.add(mockSocket.handshake.address);
      
      const result = rateLimiter.checkRateLimit(mockSocket, 'test_event');
      
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('ip_blocked');
    });
  });

  describe('Rate Limit Enforcement', () => {
    test('should enforce user minute limits', () => {
      // Mock the rate limit to return false (limit exceeded)
      const { RateLimit } = require('../../types/realtime');
      const mockLimit = {
        checkLimit: jest.fn(() => false),
        getResetTime: jest.fn(() => Date.now() + 60000)
      };
      RateLimit.mockImplementation(() => mockLimit);
      
      // Create new limiter to use the mocked RateLimit
      const testLimiter = new SocketRateLimiter({
        maxEventsPerMinute: 1
      });
      
      const result = testLimiter.checkRateLimit(mockSocket, 'test_event');
      
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('user_minute_limit_exceeded');
      
      testLimiter.destroy();
    });

    test('should enforce user hour limits', () => {
      // Mock minute limit to pass, hour limit to fail
      const { RateLimit } = require('../../types/realtime');
      let callCount = 0;
      RateLimit.mockImplementation(() => ({
        checkLimit: jest.fn(() => {
          callCount++;
          return callCount === 1; // First call (minute) passes, second (hour) fails
        }),
        getResetTime: jest.fn(() => Date.now() + 3600000)
      }));
      
      const testLimiter = new SocketRateLimiter({
        maxEventsPerHour: 1
      });
      
      const result = testLimiter.checkRateLimit(mockSocket, 'test_event');
      
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('user_hour_limit_exceeded');
      
      testLimiter.destroy();
    });
  });

  describe('Violation Recording', () => {
    test('should record violations', () => {
      const identifier = 'test-user-id';
      const violationType = 'user_limit';
      
      rateLimiter.recordViolation(identifier, violationType);
      
      expect(rateLimiter.violations.has(identifier)).toBe(true);
      
      const violation = rateLimiter.violations.get(identifier);
      expect(violation.count).toBe(1);
      expect(violation.types.has(violationType)).toBe(true);
    });

    test('should escalate to temporary block after multiple violations', () => {
      const identifier = 'test-user-id';
      
      // Record multiple violations
      for (let i = 0; i < 5; i++) {
        rateLimiter.recordViolation(identifier, 'user_limit');
      }
      
      // Should block the user
      expect(rateLimiter.blockedUsers.has(identifier)).toBe(true);
    });
  });

  describe('Block Duration Calculation', () => {
    test('should calculate increasing block durations', () => {
      const duration1 = rateLimiter.calculateBlockDuration(5); // First block
      const duration2 = rateLimiter.calculateBlockDuration(6); // Second block
      const duration3 = rateLimiter.calculateBlockDuration(7); // Third block
      
      expect(duration2).toBeGreaterThan(duration1);
      expect(duration3).toBeGreaterThan(duration2);
    });

    test('should cap block duration at maximum', () => {
      const maxDuration = rateLimiter.calculateBlockDuration(20); // Very high count
      const expectedMax = 24 * 60 * 60 * 1000; // 24 hours
      
      expect(maxDuration).toBe(expectedMax);
    });
  });

  describe('Middleware Integration', () => {
    test('should create middleware function', () => {
      const middleware = rateLimiter.middleware();
      
      expect(typeof middleware).toBe('function');
    });

    test('should add rate limit checking to socket', () => {
      const middleware = rateLimiter.middleware();
      const mockNext = jest.fn();
      
      middleware(mockSocket, mockNext);
      
      expect(typeof mockSocket.checkRateLimit).toBe('function');
      expect(mockNext).toHaveBeenCalled();
    });

    test('should intercept socket emit for rate limiting', () => {
      const middleware = rateLimiter.middleware();
      const mockNext = jest.fn();
      const originalEmit = mockSocket.emit;
      
      middleware(mockSocket, mockNext);
      
      // Socket emit should be wrapped
      expect(mockSocket.emit).not.toBe(originalEmit);
    });
  });

  describe('Statistics', () => {
    test('should provide comprehensive statistics', () => {
      // Add some test data
      rateLimiter.recordViolation('user1', 'user_limit');
      rateLimiter.recordViolation('user2', 'socket_limit');
      rateLimiter.blockedUsers.add('blocked-user');
      rateLimiter.blockedIps.add('192.168.1.100');
      
      const stats = rateLimiter.getStats();
      
      expect(stats).toHaveProperty('activeLimits');
      expect(stats).toHaveProperty('blockedUsers');
      expect(stats).toHaveProperty('blockedIps');
      expect(stats).toHaveProperty('totalViolations');
      expect(stats).toHaveProperty('violationDetails');
      
      expect(stats.blockedUsers).toBe(1);
      expect(stats.blockedIps).toBe(1);
      expect(stats.totalViolations).toBe(2);
      expect(Array.isArray(stats.violationDetails)).toBe(true);
    });
  });

  describe('Limit Reset and Management', () => {
    test('should reset user limits', () => {
      const userId = 'test-user';
      
      // Add some data to reset
      rateLimiter.recordViolation(userId, 'user_limit');
      rateLimiter.blockedUsers.add(userId);
      
      rateLimiter.resetUserLimits(userId);
      
      expect(rateLimiter.violations.has(userId)).toBe(false);
      expect(rateLimiter.blockedUsers.has(userId)).toBe(false);
    });

    test('should reset IP limits', () => {
      const ipAddress = '192.168.1.1';
      
      // Add some data to reset
      rateLimiter.recordViolation(ipAddress, 'ip_limit');
      rateLimiter.blockedIps.add(ipAddress);
      
      rateLimiter.resetIpLimits(ipAddress);
      
      expect(rateLimiter.violations.has(ipAddress)).toBe(false);
      expect(rateLimiter.blockedIps.has(ipAddress)).toBe(false);
    });
  });

  describe('Cleanup Operations', () => {
    test('should clean up old rate limit entries', () => {
      // Mock old data
      const oldTime = Date.now() - (2 * 60 * 60 * 1000); // 2 hours ago
      rateLimiter.violations.set('old-user', {
        count: 1,
        firstViolation: oldTime,
        lastViolation: oldTime,
        types: new Set(['user_limit'])
      });
      
      rateLimiter.cleanup();
      
      // Old violation should be cleaned up
      expect(rateLimiter.violations.has('old-user')).toBe(false);
    });

    test('should stop cleanup scheduler', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      
      rateLimiter.stopCleanupScheduler();
      
      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    test('should handle errors gracefully in rate limit checking', () => {
      // Create a socket that will cause an error
      const badSocket = {
        id: null, // This might cause issues
        userId: undefined,
        handshake: { address: null } // Provide handshake but with null address
      };
      
      const result = rateLimiter.checkRateLimit(badSocket, 'test_event');
      
      // Should fail open (allow request) when there's an error
      expect(result.allowed).toBe(true);
      expect(result.error).toBeDefined();
    });

    test('should handle errors in violation recording', () => {
      // This should not throw even with bad data
      expect(() => {
        rateLimiter.recordViolation(null, 'test_violation');
      }).not.toThrow();
    });

    test('should handle errors in cleanup', () => {
      // Force an error in cleanup by corrupting data
      rateLimiter.violations.set('bad-entry', null);
      
      expect(() => {
        rateLimiter.cleanup();
      }).not.toThrow();
    });
  });

  describe('Temporary Blocking', () => {
    test('should temporarily block users', () => {
      const identifier = 'test-user';
      const duration = 100; // 100ms for testing
      
      rateLimiter.temporaryBlock(identifier, duration);
      
      expect(rateLimiter.blockedUsers.has(identifier)).toBe(true);
      
      // Fast forward time to simulate timeout
      jest.advanceTimersByTime(duration + 50);
      
      expect(rateLimiter.blockedUsers.has(identifier)).toBe(false);
    });

    test('should temporarily block IPs', () => {
      const identifier = '192.168.1.1';
      const duration = 100;
      
      rateLimiter.temporaryBlock(identifier, duration);
      
      expect(rateLimiter.blockedIps.has(identifier)).toBe(true);
      
      // Fast forward time to simulate timeout
      jest.advanceTimersByTime(duration + 50);
      
      expect(rateLimiter.blockedIps.has(identifier)).toBe(false);
    });
  });
});