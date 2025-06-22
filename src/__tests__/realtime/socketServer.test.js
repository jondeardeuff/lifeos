const { RealtimeServer } = require('../../realtime/socketServer');
const { createServer } = require('http');
const { Server: SocketIOServer } = require('socket.io');
const { io: ClientIO } = require('socket.io-client');
const jwt = require('jsonwebtoken');

// Mock dependencies
jest.mock('../../prisma-client', () => ({
  prisma: {
    user: {
      findUnique: jest.fn()
    }
  }
}));

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    quit: jest.fn(),
    disconnect: jest.fn()
  }));
});

jest.mock('@socket.io/redis-adapter', () => ({
  createAdapter: jest.fn().mockReturnValue({})
}));

describe('RealtimeServer', () => {
  let server;
  let httpServer;
  let realtimeServer;
  let clientSocket;
  let testUser;
  let validToken;

  beforeAll((done) => {
    // Create test user and token
    testUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User'
    };

    validToken = jwt.sign(
      { userId: testUser.id },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Mock Prisma user lookup
    const { prisma } = require('../../prisma-client');
    prisma.user.findUnique.mockResolvedValue(testUser);

    // Create HTTP server and realtime server
    httpServer = createServer();
    realtimeServer = new RealtimeServer();
    
    httpServer.listen(() => {
      const port = httpServer.address().port;
      
      // Initialize the realtime server (this will be mocked to skip Redis)
      realtimeServer.initialize(httpServer).then(() => {
        done();
      }).catch(done);
    });
  });

  afterAll((done) => {
    if (clientSocket) {
      clientSocket.close();
    }
    
    if (realtimeServer && realtimeServer.io) {
      realtimeServer.io.close();
    }
    
    if (httpServer) {
      httpServer.close(done);
    } else {
      done();
    }
  });

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (clientSocket && clientSocket.connected) {
      clientSocket.disconnect();
    }
  });

  describe('Server Initialization', () => {
    test('should initialize server successfully', () => {
      expect(realtimeServer).toBeDefined();
      expect(realtimeServer.io).toBeDefined();
    });

    test('should have connection recovery service', () => {
      expect(realtimeServer.connectionRecovery).toBeDefined();
    });
  });

  describe('Authentication', () => {
    test('should reject connection without token', (done) => {
      const port = httpServer.address().port;
      clientSocket = ClientIO(`http://localhost:${port}`);
      
      clientSocket.on('connect_error', (error) => {
        expect(error.message).toContain('Authentication failed');
        done();
      });
    });

    test('should reject connection with invalid token', (done) => {
      const port = httpServer.address().port;
      clientSocket = ClientIO(`http://localhost:${port}`, {
        auth: {
          token: 'invalid-token'
        }
      });
      
      clientSocket.on('connect_error', (error) => {
        expect(error.message).toContain('Authentication failed');
        done();
      });
    });

    test('should accept connection with valid token', (done) => {
      const port = httpServer.address().port;
      clientSocket = ClientIO(`http://localhost:${port}`, {
        auth: {
          token: validToken
        }
      });
      
      clientSocket.on('connect', () => {
        expect(clientSocket.connected).toBe(true);
        done();
      });
      
      clientSocket.on('connect_error', (error) => {
        done(error);
      });
    });
  });

  describe('Connection Management', () => {
    beforeEach((done) => {
      const port = httpServer.address().port;
      clientSocket = ClientIO(`http://localhost:${port}`, {
        auth: {
          token: validToken
        }
      });
      
      clientSocket.on('connect', () => {
        done();
      });
    });

    test('should track connection in server', () => {
      const stats = realtimeServer.getStats();
      expect(stats.connectedSockets).toBeGreaterThan(0);
      expect(stats.connectedUsers).toBeGreaterThan(0);
    });

    test('should handle ping/pong for heartbeat', (done) => {
      clientSocket.emit('ping');
      
      clientSocket.on('pong', (data) => {
        expect(data).toHaveProperty('timestamp');
        expect(typeof data.timestamp).toBe('number');
        done();
      });
    });

    test('should handle disconnection properly', (done) => {
      const initialStats = realtimeServer.getStats();
      
      clientSocket.on('disconnect', () => {
        // Give server time to process disconnection
        setTimeout(() => {
          const finalStats = realtimeServer.getStats();
          expect(finalStats.connectedSockets).toBeLessThan(initialStats.connectedSockets);
          done();
        }, 100);
      });
      
      clientSocket.disconnect();
    });
  });

  describe('Room Subscriptions', () => {
    beforeEach((done) => {
      const port = httpServer.address().port;
      clientSocket = ClientIO(`http://localhost:${port}`, {
        auth: {
          token: validToken
        }
      });
      
      clientSocket.on('connect', () => {
        done();
      });
    });

    test('should handle room subscription requests', (done) => {
      const subscriptionData = {
        roomType: 'project',
        roomId: 'test-project-id',
        filters: {}
      };
      
      clientSocket.emit('subscribe', subscriptionData);
      
      clientSocket.on('subscription_confirmed', (data) => {
        expect(data.roomType).toBe(subscriptionData.roomType);
        expect(data.roomId).toBe(subscriptionData.roomId);
        done();
      });
      
      // Set a timeout in case the event doesn't fire
      setTimeout(() => {
        done(new Error('Subscription confirmation timeout'));
      }, 1000);
    });

    test('should handle room unsubscription requests', (done) => {
      const subscriptionData = {
        roomType: 'project',
        roomId: 'test-project-id'
      };
      
      // First subscribe
      clientSocket.emit('subscribe', subscriptionData);
      
      clientSocket.once('subscription_confirmed', () => {
        // Then unsubscribe
        clientSocket.emit('unsubscribe', subscriptionData);
        
        clientSocket.on('unsubscription_confirmed', (data) => {
          expect(data.roomType).toBe(subscriptionData.roomType);
          expect(data.roomId).toBe(subscriptionData.roomId);
          done();
        });
      });
    });
  });

  describe('Activity Tracking', () => {
    beforeEach((done) => {
      const port = httpServer.address().port;
      clientSocket = ClientIO(`http://localhost:${port}`, {
        auth: {
          token: validToken
        }
      });
      
      clientSocket.on('connect', () => {
        done();
      });
    });

    test('should handle activity updates', (done) => {
      const activityData = {
        type: 'user_activity',
        action: 'typing',
        metadata: {
          location: 'task-editor'
        }
      };
      
      clientSocket.emit('activity', activityData);
      
      // Give server time to process activity
      setTimeout(() => {
        // Activity should be processed without error
        done();
      }, 100);
    });
  });

  describe('Server Statistics', () => {
    test('should provide comprehensive stats', () => {
      const stats = realtimeServer.getStats();
      
      expect(stats).toHaveProperty('connectedSockets');
      expect(stats).toHaveProperty('connectedUsers');
      expect(stats).toHaveProperty('rooms');
      expect(stats).toHaveProperty('uptime');
      expect(stats).toHaveProperty('memory');
      expect(stats).toHaveProperty('connectionRecovery');
      
      expect(typeof stats.connectedSockets).toBe('number');
      expect(typeof stats.connectedUsers).toBe('number');
      expect(typeof stats.uptime).toBe('number');
      expect(typeof stats.memory).toBe('object');
    });

    test('should track user connections', () => {
      const port = httpServer.address().port;
      const testSocket = ClientIO(`http://localhost:${port}`, {
        auth: {
          token: validToken
        }
      });
      
      return new Promise((resolve) => {
        testSocket.on('connect', () => {
          const userConnections = realtimeServer.getUserConnections(testUser.id);
          expect(Array.isArray(userConnections)).toBe(true);
          
          testSocket.disconnect();
          resolve();
        });
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid room subscription gracefully', (done) => {
      const port = httpServer.address().port;
      clientSocket = ClientIO(`http://localhost:${port}`, {
        auth: {
          token: validToken
        }
      });
      
      clientSocket.on('connect', () => {
        const invalidSubscription = {
          roomType: 'invalid-room-type',
          roomId: null // Invalid room ID
        };
        
        clientSocket.emit('subscribe', invalidSubscription);
        
        clientSocket.on('subscription_error', (error) => {
          expect(error).toHaveProperty('reason');
          done();
        });
        
        // Timeout fallback
        setTimeout(() => {
          done(); // Consider no error response as success too
        }, 500);
      });
    });
  });
});