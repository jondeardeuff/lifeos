const { ConnectionRecovery } = require('../../realtime/connectionRecovery');
const { EventBroadcaster } = require('../../realtime/eventBroadcaster');

// Mock EventBroadcaster
jest.mock('../../realtime/eventBroadcaster');

describe('ConnectionRecovery', () => {
  let connectionRecovery;
  let mockEventBroadcaster;
  let mockSocket;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create mock event broadcaster
    mockEventBroadcaster = new EventBroadcaster();
    
    // Create connection recovery instance
    connectionRecovery = new ConnectionRecovery(mockEventBroadcaster, {
      maxReconnectAttempts: 3,
      reconnectDelay: 100, // Faster for testing
      maxReconnectDelay: 1000,
      heartbeatInterval: 200,
      missedEventRetention: 60000, // 1 minute for testing
      maxMissedEvents: 10
    });

    // Create mock socket
    mockSocket = {
      id: 'test-socket-id',
      userId: 'test-user-id',
      emit: jest.fn(),
      join: jest.fn(),
      on: jest.fn(),
      once: jest.fn(),
      off: jest.fn()
    };
  });

  afterEach(() => {
    if (connectionRecovery) {
      connectionRecovery.destroy();
    }
  });

  describe('Connection Registration', () => {
    test('should register new connection successfully', () => {
      connectionRecovery.registerConnection(mockSocket, 'test-user-id');
      
      const connection = connectionRecovery.getConnection(mockSocket.id);
      expect(connection).toBeDefined();
      expect(connection.socketId).toBe(mockSocket.id);
      expect(connection.userId).toBe('test-user-id');
      expect(connection.status).toBe('connected');
    });

    test('should set up heartbeat for new connection', () => {
      connectionRecovery.registerConnection(mockSocket, 'test-user-id');
      
      // Verify heartbeat was set up (socket should have a heartbeatTimer)
      expect(mockSocket.heartbeatTimer).toBeDefined();
    });

    test('should deliver missed events on registration', () => {
      const userId = 'test-user-id';
      
      // Store some missed events first
      connectionRecovery.storeMissedEvent(userId, {
        type: 'task:created',
        data: { id: 'task-1', title: 'Test Task' }
      });
      
      connectionRecovery.registerConnection(mockSocket, userId);
      
      // Should emit missed events
      expect(mockSocket.emit).toHaveBeenCalledWith('missed_events', expect.objectContaining({
        events: expect.arrayContaining([
          expect.objectContaining({
            type: 'task:created'
          })
        ])
      }));
    });
  });

  describe('Connection Disconnection', () => {
    beforeEach(() => {
      connectionRecovery.registerConnection(mockSocket, 'test-user-id');
    });

    test('should handle disconnection properly', () => {
      connectionRecovery.handleDisconnection(mockSocket, 'client namespace disconnect');
      
      const connection = connectionRecovery.getConnection(mockSocket.id);
      expect(connection.status).toBe('disconnected');
      expect(connection.disconnectedAt).toBeDefined();
      expect(connection.disconnectReason).toBe('client namespace disconnect');
    });

    test('should clear heartbeat on disconnection', () => {
      // First register to set up heartbeat
      connectionRecovery.registerConnection(mockSocket, 'test-user-id');
      
      // Mock clearInterval
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      
      connectionRecovery.handleDisconnection(mockSocket, 'transport close');
      
      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });
  });

  describe('Connection Reconnection', () => {
    test('should handle reconnection with previous socket ID', () => {
      const userId = 'test-user-id';
      const previousSocketId = 'old-socket-id';
      
      // First, register and disconnect the original connection
      const oldSocket = { ...mockSocket, id: previousSocketId };
      connectionRecovery.registerConnection(oldSocket, userId);
      connectionRecovery.handleDisconnection(oldSocket, 'transport close');
      
      // Now reconnect with new socket
      const newSocket = { ...mockSocket, id: 'new-socket-id' };
      connectionRecovery.handleReconnection(newSocket, userId, previousSocketId);
      
      const connection = connectionRecovery.getConnection(newSocket.id);
      expect(connection).toBeDefined();
      expect(connection.status).toBe('reconnected');
      expect(connection.socketId).toBe(newSocket.id);
    });

    test('should deliver missed events since disconnection', () => {
      const userId = 'test-user-id';
      const previousSocketId = 'old-socket-id';
      
      // Register, disconnect, store missed event, then reconnect
      const oldSocket = { ...mockSocket, id: previousSocketId };
      connectionRecovery.registerConnection(oldSocket, userId);
      connectionRecovery.handleDisconnection(oldSocket, 'transport close');
      
      // Store missed event after disconnection
      connectionRecovery.storeMissedEvent(userId, {
        type: 'task:updated',
        data: { id: 'task-1', title: 'Updated Task' }
      });
      
      const newSocket = { ...mockSocket, id: 'new-socket-id', emit: jest.fn() };
      connectionRecovery.handleReconnection(newSocket, userId, previousSocketId);
      
      expect(newSocket.emit).toHaveBeenCalledWith('missed_events_since_disconnect', expect.any(Object));
    });
  });

  describe('Missed Events Management', () => {
    test('should store missed events for offline users', () => {
      const userId = 'offline-user';
      const event = {
        type: 'task:created',
        data: { id: 'task-1', title: 'Test Task' }
      };
      
      connectionRecovery.storeMissedEvent(userId, event);
      
      const stats = connectionRecovery.getStats();
      expect(stats.usersWithMissedEvents).toBe(1);
      expect(stats.totalMissedEvents).toBe(1);
    });

    test('should limit number of missed events per user', () => {
      const userId = 'test-user';
      
      // Store more events than the limit
      for (let i = 0; i < 15; i++) {
        connectionRecovery.storeMissedEvent(userId, {
          type: 'task:created',
          data: { id: `task-${i}` }
        });
      }
      
      const stats = connectionRecovery.getStats();
      expect(stats.totalMissedEvents).toBe(10); // Should be limited to maxMissedEvents
    });

    test('should clean up old missed events', () => {
      const userId = 'test-user';
      
      // Create a recovery service with very short retention
      const shortRetentionRecovery = new ConnectionRecovery(mockEventBroadcaster, {
        missedEventRetention: 10 // 10ms retention
      });
      
      // Store an event with an old timestamp
      const oldEvent = {
        type: 'task:created',
        data: { id: 'task-1' },
        missedAt: Date.now() - 60000 // 1 minute ago
      };
      
      // Manually add old event to simulate missed event retention
      shortRetentionRecovery.missedEvents.set(userId, [oldEvent]);
      
      // Run cleanup
      shortRetentionRecovery.cleanup();
      
      const stats = shortRetentionRecovery.getStats();
      expect(stats.totalMissedEvents).toBe(0);
      
      shortRetentionRecovery.destroy();
    });
  });

  describe('Room Subscription Tracking', () => {
    beforeEach(() => {
      connectionRecovery.registerConnection(mockSocket, 'test-user-id');
    });

    test('should track room subscriptions', () => {
      connectionRecovery.trackRoomSubscription(mockSocket.id, 'project', 'project-1');
      
      const connection = connectionRecovery.getConnection(mockSocket.id);
      expect(connection.rooms.has('project:project-1')).toBe(true);
    });

    test('should remove room subscription tracking', () => {
      connectionRecovery.trackRoomSubscription(mockSocket.id, 'project', 'project-1');
      connectionRecovery.untrackRoomSubscription(mockSocket.id, 'project', 'project-1');
      
      const connection = connectionRecovery.getConnection(mockSocket.id);
      expect(connection.rooms.has('project:project-1')).toBe(false);
    });

    test('should restore room subscriptions on reconnection', () => {
      const userId = 'test-user-id';
      const previousSocketId = 'old-socket-id';
      
      // Set up original connection with room subscription
      const oldSocket = { ...mockSocket, id: previousSocketId };
      connectionRecovery.registerConnection(oldSocket, userId);
      connectionRecovery.trackRoomSubscription(previousSocketId, 'project', 'project-1');
      connectionRecovery.handleDisconnection(oldSocket, 'transport close');
      
      // Reconnect with new socket
      const newSocket = { 
        ...mockSocket, 
        id: 'new-socket-id',
        join: jest.fn(),
        emit: jest.fn()
      };
      connectionRecovery.handleReconnection(newSocket, userId, previousSocketId);
      
      // Should restore room subscription
      expect(newSocket.join).toHaveBeenCalledWith('project:project-1');
      expect(newSocket.emit).toHaveBeenCalledWith('subscription_restored', expect.objectContaining({
        roomType: 'project',
        roomId: 'project-1'
      }));
    });
  });

  describe('Statistics and Monitoring', () => {
    test('should provide comprehensive statistics', () => {
      // Register a connection
      connectionRecovery.registerConnection(mockSocket, 'test-user-id');
      
      // Store some missed events
      connectionRecovery.storeMissedEvent('offline-user', {
        type: 'task:created',
        data: { id: 'task-1' }
      });
      
      const stats = connectionRecovery.getStats();
      
      expect(stats).toHaveProperty('totalReconnections');
      expect(stats).toHaveProperty('successfulReconnections');
      expect(stats).toHaveProperty('failedReconnections');
      expect(stats).toHaveProperty('missedEventsDelivered');
      expect(stats).toHaveProperty('activeConnections');
      expect(stats).toHaveProperty('usersWithMissedEvents');
      expect(stats).toHaveProperty('totalMissedEvents');
      
      expect(stats.activeConnections).toBe(1);
      expect(stats.usersWithMissedEvents).toBe(1);
      expect(stats.totalMissedEvents).toBe(1);
    });
  });

  describe('Cleanup and Destruction', () => {
    test('should clean up properly on destroy', () => {
      // Register some connections and missed events
      connectionRecovery.registerConnection(mockSocket, 'test-user-id');
      connectionRecovery.storeMissedEvent('offline-user', {
        type: 'task:created',
        data: { id: 'task-1' }
      });
      
      // Destroy the service
      connectionRecovery.destroy();
      
      // Should clean up all data
      const stats = connectionRecovery.getStats();
      expect(stats.activeConnections).toBe(0);
      expect(stats.totalMissedEvents).toBe(0);
    });

    test('should stop cleanup scheduler on destroy', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      
      connectionRecovery.destroy();
      
      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });
  });

  describe('Event ID Generation', () => {
    test('should generate unique event IDs', () => {
      const id1 = connectionRecovery.generateEventId();
      const id2 = connectionRecovery.generateEventId();
      
      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe('string');
      expect(typeof id2).toBe('string');
    });
  });
});