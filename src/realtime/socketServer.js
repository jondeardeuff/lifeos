const { Server: SocketIOServer } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const Redis = require('ioredis');
const jwt = require('jsonwebtoken');
const { prisma } = require('../../prisma-client');
const { 
  RealtimeEvent, 
  ConnectedUser, 
  createEventPayload,
  createRoomName,
  RoomType
} = require('../types/realtime');
const { ConnectionRecovery } = require('./connectionRecovery');

/**
 * Real-time WebSocket server implementation using Socket.io
 */
class RealtimeServer {
  constructor() {
    this.io = null;
    this.httpServer = null;
    this.redisClient = null;
    this.redisAdapter = null;
    this.connections = new Map(); // socketId -> ConnectedUser
    this.userSockets = new Map(); // userId -> Set<socketId>
    this.connectionRecovery = null;
    this.isShuttingDown = false;
  }

  /**
   * Initialize the WebSocket server
   * @param {Object} httpServer - HTTP server instance
   */
  async initialize(httpServer) {
    this.httpServer = httpServer;
    
    // Setup Redis client and adapter
    await this.setupRedisAdapter();
    
    // Setup Socket.io server
    this.setupSocketServer();
    
    // Setup authentication middleware
    this.setupAuthMiddleware();
    
    // Setup connection recovery
    this.setupConnectionRecovery();
    
    // Setup connection handlers
    this.setupConnectionHandlers();
    
    // Setup graceful shutdown
    this.setupGracefulShutdown();
    
    console.log('🔌 Real-time WebSocket server initialized');
  }

  /**
   * Setup Redis adapter for scaling across multiple server instances
   */
  async setupRedisAdapter() {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      // Create Redis clients for pub/sub
      this.redisClient = new Redis(redisUrl, {
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3
      });
      
      const redisSubClient = new Redis(redisUrl, {
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3
      });
      
      // Test Redis connection
      await this.redisClient.ping();
      console.log('✅ Redis connection established for WebSocket adapter');
      
      // Create Redis adapter
      this.redisAdapter = createAdapter(this.redisClient, redisSubClient);
      
    } catch (error) {
      console.warn('⚠️ Redis unavailable, running in single-server mode:', error.message);
      this.redisClient = null;
      this.redisAdapter = null;
    }
  }

  /**
   * Setup Socket.io server with configuration
   */
  setupSocketServer() {
    this.io = new SocketIOServer(this.httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN?.split(',') || ["http://localhost:3000"],
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
      maxHttpBufferSize: 1e6, // 1MB
      allowEIO3: true
    });

    // Use Redis adapter if available
    if (this.redisAdapter) {
      this.io.adapter(this.redisAdapter);
      console.log('✅ Redis adapter attached to Socket.io server');
    }
  }

  /**
   * Setup JWT authentication middleware for WebSocket connections
   */
  setupAuthMiddleware() {
    this.io.use(async (socket, next) => {
      try {
        // Get token from auth object or headers
        const token = socket.handshake.auth?.token || 
                     socket.handshake.headers?.authorization?.replace('Bearer ', '');

        if (!token) {
          throw new Error('No authentication token provided');
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Get user from database
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        });

        if (!user) {
          throw new Error('User not found');
        }

        // Attach user data to socket
        socket.userId = user.id;
        socket.user = user;
        
        next();
      } catch (error) {
        console.error('WebSocket authentication failed:', error.message);
        next(new Error('Authentication failed'));
      }
    });
  }

  /**
   * Setup connection recovery service
   */
  setupConnectionRecovery() {
    this.connectionRecovery = new ConnectionRecovery(null, {
      maxReconnectAttempts: 5,
      reconnectDelay: 1000,
      maxReconnectDelay: 30000,
      heartbeatInterval: 30000,
      missedEventRetention: 24 * 60 * 60 * 1000, // 24 hours
      maxMissedEvents: 1000
    });
    
    console.log('🔄 Connection recovery service initialized');
  }

  /**
   * Setup connection event handlers
   */
  setupConnectionHandlers() {
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });
  }

  /**
   * Handle new WebSocket connection
   * @param {Object} socket - Socket.io socket instance
   */
  async handleConnection(socket) {
    const { userId, user } = socket;
    
    console.log(`🔌 User ${user.email} connected (${socket.id})`);

    try {
      // Create connection record
      const connection = new ConnectedUser(
        socket.id,
        userId,
        socket.handshake.headers['user-agent'],
        socket.handshake.address
      );
      
      // Track connection
      this.connections.set(socket.id, connection);
      
      // Track user sockets
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId).add(socket.id);
      
      // Register with connection recovery
      this.connectionRecovery.registerConnection(socket, userId);
      
      // Join user-specific room
      const userRoom = createRoomName(RoomType.USER, userId);
      socket.join(userRoom);
      connection.addRoom(userRoom);
      
      // Join user to their project rooms
      await this.joinUserProjectRooms(socket, userId);
      
      // Broadcast user online status
      await this.broadcastUserStatus(userId, 'online');
      
      // Send connection confirmation
      socket.emit('connected', createEventPayload(
        'connection:established',
        { 
          socketId: socket.id,
          userId,
          connectedAt: connection.connectedAt 
        },
        userId
      ));
      
      // Setup socket event handlers
      this.setupSocketHandlers(socket);
      
    } catch (error) {
      console.error('Error handling connection:', error);
      socket.emit('error', createEventPayload(
        RealtimeEvent.CONNECTION_ERROR,
        { message: 'Connection setup failed' }
      ));
    }
  }

  /**
   * Join user to their project rooms
   * @param {Object} socket - Socket instance
   * @param {string} userId - User ID
   */
  async joinUserProjectRooms(socket, userId) {
    try {
      // Get user's projects (this would need to be implemented based on your project model)
      // For now, we'll just join the user to their personal task room
      const taskRoom = createRoomName(RoomType.USER, userId, 'tasks');
      socket.join(taskRoom);
      
      const connection = this.connections.get(socket.id);
      if (connection) {
        connection.addRoom(taskRoom);
      }
      
    } catch (error) {
      console.error('Error joining project rooms:', error);
    }
  }

  /**
   * Setup event handlers for a socket
   * @param {Object} socket - Socket instance
   */
  setupSocketHandlers(socket) {
    const { userId } = socket;

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      this.handleDisconnection(socket, reason);
    });

    // Handle activity updates
    socket.on('activity', (data) => {
      this.updateUserActivity(socket, data);
    });

    // Handle room subscription requests
    socket.on('subscribe', (data) => {
      this.handleSubscriptionRequest(socket, data);
    });

    // Handle room unsubscription requests
    socket.on('unsubscribe', (data) => {
      this.handleUnsubscriptionRequest(socket, data);
    });

    // Handle ping for connection health
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
      this.updateConnectionActivity(socket.id);
    });

    // Handle pong responses (for heartbeat monitoring)
    socket.on('pong', (data) => {
      this.updateConnectionActivity(socket.id);
    });

    // Handle reconnection requests
    socket.on('reconnect_request', (data) => {
      this.handleReconnectionRequest(socket, data);
    });

    // Handle connection recovery events
    socket.on('request_missed_events', (data) => {
      this.handleMissedEventsRequest(socket, data);
    });
  }

  /**
   * Handle socket disconnection
   * @param {Object} socket - Socket instance
   * @param {string} reason - Disconnection reason
   */
  async handleDisconnection(socket, reason) {
    const { userId, user } = socket;
    console.log(`🔌 User ${user?.email} disconnected (${socket.id}): ${reason}`);

    try {
      // Handle disconnection with recovery service
      this.connectionRecovery.handleDisconnection(socket, reason);
      
      // Remove connection tracking
      this.connections.delete(socket.id);
      
      // Remove from user sockets
      const userSocketSet = this.userSockets.get(userId);
      if (userSocketSet) {
        userSocketSet.delete(socket.id);
        
        // If no more connections for user, mark as offline
        if (userSocketSet.size === 0) {
          this.userSockets.delete(userId);
          
          // Delay offline status to handle quick reconnects
          setTimeout(async () => {
            if (!this.userSockets.has(userId)) {
              await this.broadcastUserStatus(userId, 'offline');
            }
          }, 30000); // 30 second grace period
        }
      }
    } catch (error) {
      console.error('Error handling disconnection:', error);
    }
  }

  /**
   * Update user activity
   * @param {Object} socket - Socket instance
   * @param {Object} data - Activity data
   */
  updateUserActivity(socket, data) {
    const connection = this.connections.get(socket.id);
    if (connection) {
      connection.updateActivity();
    }
    
    // Broadcast activity to relevant users (implementation depends on requirements)
    this.broadcastActivity(socket.userId, data);
  }

  /**
   * Update connection activity timestamp
   * @param {string} socketId - Socket ID
   */
  updateConnectionActivity(socketId) {
    const connection = this.connections.get(socketId);
    if (connection) {
      connection.updateActivity();
    }
  }

  /**
   * Handle subscription requests
   * @param {Object} socket - Socket instance
   * @param {Object} data - Subscription data
   */
  async handleSubscriptionRequest(socket, data) {
    const { roomType, roomId, filters } = data;
    
    try {
      // Validate access to room
      const hasAccess = await this.validateRoomAccess(socket.userId, roomType, roomId);
      
      if (!hasAccess) {
        socket.emit('subscription_error', createEventPayload(
          'subscription:denied',
          { roomType, roomId, reason: 'Access denied' }
        ));
        return;
      }
      
      // Join room
      const roomName = createRoomName(roomType, roomId);
      socket.join(roomName);
      
      // Update connection record
      const connection = this.connections.get(socket.id);
      if (connection) {
        connection.addRoom(roomName);
      }
      
      // Confirm subscription
      socket.emit('subscribed', createEventPayload(
        'subscription:confirmed',
        { roomType, roomId, roomName }
      ));
      
    } catch (error) {
      console.error('Error handling subscription:', error);
      socket.emit('subscription_error', createEventPayload(
        'subscription:error',
        { roomType, roomId, error: error.message }
      ));
    }
  }

  /**
   * Handle unsubscription requests
   * @param {Object} socket - Socket instance
   * @param {Object} data - Unsubscription data
   */
  handleUnsubscriptionRequest(socket, data) {
    const { roomType, roomId } = data;
    
    const roomName = createRoomName(roomType, roomId);
    socket.leave(roomName);
    
    // Update connection record
    const connection = this.connections.get(socket.id);
    if (connection) {
      connection.removeRoom(roomName);
    }
    
    // Confirm unsubscription
    socket.emit('unsubscribed', createEventPayload(
      'subscription:removed',
      { roomType, roomId, roomName }
    ));
  }

  /**
   * Validate room access for a user
   * @param {string} userId - User ID
   * @param {string} roomType - Room type
   * @param {string} roomId - Room ID
   * @returns {boolean} Access granted
   */
  async validateRoomAccess(userId, roomType, roomId) {
    try {
      switch (roomType) {
        case RoomType.USER:
          return roomId === userId; // Users can only access their own rooms
        
        case RoomType.TASK:
          // Check if user owns the task or is assigned to it
          const task = await prisma.task.findFirst({
            where: { 
              id: roomId,
              OR: [
                { userId },
                // Add assignedTo check when that field exists
              ]
            }
          });
          return !!task;
        
        case RoomType.PROJECT:
          // Check if user is member of the project
          // This would need to be implemented based on your project model
          return true; // Placeholder
        
        default:
          return false;
      }
    } catch (error) {
      console.error('Error validating room access:', error);
      return false;
    }
  }

  /**
   * Broadcast user status change
   * @param {string} userId - User ID
   * @param {string} status - Status (online/offline)
   */
  async broadcastUserStatus(userId, status) {
    try {
      const payload = createEventPayload(
        status === 'online' ? RealtimeEvent.USER_ONLINE : RealtimeEvent.USER_OFFLINE,
        { userId, status, timestamp: new Date().toISOString() },
        userId
      );
      
      // Broadcast to all connected users (could be optimized to only relevant users)
      this.io.emit(RealtimeEvent.USER_ACTIVITY, payload);
      
    } catch (error) {
      console.error('Error broadcasting user status:', error);
    }
  }

  /**
   * Broadcast user activity
   * @param {string} userId - User ID
   * @param {Object} activityData - Activity data
   */
  async broadcastActivity(userId, activityData) {
    try {
      const payload = createEventPayload(
        RealtimeEvent.USER_ACTIVITY,
        { userId, ...activityData },
        userId
      );
      
      // Broadcast to user's connections and relevant rooms
      const userRoom = createRoomName(RoomType.USER, userId);
      this.io.to(userRoom).emit(RealtimeEvent.USER_ACTIVITY, payload);
      
    } catch (error) {
      console.error('Error broadcasting activity:', error);
    }
  }

  /**
   * Get server statistics
   * @returns {Object} Server stats
   */
  getStats() {
    return {
      connectedSockets: this.connections.size,
      connectedUsers: this.userSockets.size,
      rooms: this.io.sockets.adapter.rooms.size,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      connectionRecovery: this.getRecoveryStats()
    };
  }

  /**
   * Get connection information for a user
   * @param {string} userId - User ID
   * @returns {Array} User connections
   */
  getUserConnections(userId) {
    const socketIds = this.userSockets.get(userId) || new Set();
    return Array.from(socketIds).map(socketId => this.connections.get(socketId));
  }

  /**
   * Check if user is online
   * @param {string} userId - User ID
   * @returns {boolean} Online status
   */
  isUserOnline(userId) {
    return this.userSockets.has(userId) && this.userSockets.get(userId).size > 0;
  }

  /**
   * Get Socket.io server instance
   * @returns {Object} Socket.io server
   */
  getIO() {
    return this.io;
  }

  /**
   * Handle reconnection requests
   * @param {Object} socket - Socket instance
   * @param {Object} data - Reconnection data
   */
  handleReconnectionRequest(socket, data) {
    const { previousSocketId } = data;
    const { userId } = socket;
    
    try {
      this.connectionRecovery.handleReconnection(socket, userId, previousSocketId);
      
      socket.emit('reconnection_confirmed', {
        socketId: socket.id,
        previousSocketId,
        reconnectedAt: Date.now()
      });
      
      console.log(`🔄 Reconnection handled for user ${userId}: ${previousSocketId} -> ${socket.id}`);
    } catch (error) {
      console.error('Error handling reconnection request:', error);
      socket.emit('reconnection_error', { error: error.message });
    }
  }

  /**
   * Handle missed events requests
   * @param {Object} socket - Socket instance
   * @param {Object} data - Request data
   */
  handleMissedEventsRequest(socket, data) {
    const { since } = data;
    const { userId } = socket;
    
    try {
      // This would integrate with the connection recovery service
      // For now, just acknowledge the request
      socket.emit('missed_events_response', {
        requested: true,
        since,
        timestamp: Date.now()
      });
      
      console.log(`📨 Missed events requested by user ${userId} since ${since}`);
    } catch (error) {
      console.error('Error handling missed events request:', error);
      socket.emit('missed_events_error', { error: error.message });
    }
  }

  /**
   * Get connection recovery statistics
   * @returns {Object} Recovery stats
   */
  getRecoveryStats() {
    return this.connectionRecovery ? this.connectionRecovery.getStats() : {};
  }

  /**
   * Setup graceful shutdown
   */
  setupGracefulShutdown() {
    const shutdown = async () => {
      if (this.isShuttingDown) return;
      this.isShuttingDown = true;
      
      console.log('🔌 Shutting down WebSocket server...');
      
      try {
        // Notify all connected clients
        this.io.emit('server_shutdown', createEventPayload(
          RealtimeEvent.SYSTEM_UPDATE,
          { message: 'Server is shutting down' }
        ));
        
        // Close all connections
        this.io.close();
        
        // Cleanup connection recovery
        if (this.connectionRecovery) {
          this.connectionRecovery.destroy();
        }
        
        // Close Redis connection
        if (this.redisClient) {
          await this.redisClient.quit();
        }
        
        console.log('✅ WebSocket server shutdown complete');
      } catch (error) {
        console.error('Error during WebSocket server shutdown:', error);
      }
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  }
}

module.exports = { RealtimeServer };