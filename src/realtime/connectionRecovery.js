/**
 * Connection recovery and resilience service for WebSocket connections
 * Handles reconnection, missed events, and connection state management
 */
class ConnectionRecovery {
  constructor(eventBroadcaster, options = {}) {
    this.eventBroadcaster = eventBroadcaster;
    this.connections = new Map(); // socketId -> connection info
    this.missedEvents = new Map(); // userId -> missed events queue
    this.reconnectionTimers = new Map(); // socketId -> timer
    
    this.config = {
      maxReconnectAttempts: options.maxReconnectAttempts || 5,
      reconnectDelay: options.reconnectDelay || 1000,
      maxReconnectDelay: options.maxReconnectDelay || 30000,
      backoffMultiplier: options.backoffMultiplier || 2,
      heartbeatInterval: options.heartbeatInterval || 30000,
      missedEventRetention: options.missedEventRetention || 24 * 60 * 60 * 1000, // 24 hours
      maxMissedEvents: options.maxMissedEvents || 1000,
      connectionTimeout: options.connectionTimeout || 10000
    };
    
    this.stats = {
      totalReconnections: 0,
      successfulReconnections: 0,
      failedReconnections: 0,
      missedEventsDelivered: 0,
      connectionTimeouts: 0
    };
    
    this.startCleanupScheduler();
  }

  /**
   * Register a new connection
   * @param {Object} socket - Socket instance
   * @param {string} userId - User ID
   */
  registerConnection(socket, userId) {
    const connectionInfo = {
      socketId: socket.id,
      userId,
      connectedAt: Date.now(),
      lastSeen: Date.now(),
      reconnectAttempts: 0,
      status: 'connected',
      rooms: new Set(),
      metadata: {}
    };
    
    this.connections.set(socket.id, connectionInfo);
    
    // Set up heartbeat monitoring
    this.setupHeartbeat(socket);
    
    // Deliver any missed events
    this.deliverMissedEvents(socket, userId);
    
    console.log(`🔗 Connection registered: ${socket.id} (User: ${userId})`);
  }

  /**
   * Handle connection disconnection
   * @param {Object} socket - Socket instance
   * @param {string} reason - Disconnection reason
   */
  handleDisconnection(socket, reason) {
    const connection = this.connections.get(socket.id);
    if (!connection) return;
    
    connection.status = 'disconnected';
    connection.disconnectedAt = Date.now();
    connection.disconnectReason = reason;
    
    // Clear heartbeat timer
    this.clearHeartbeat(socket.id);
    
    // Schedule cleanup if it's a clean disconnect
    if (reason === 'client namespace disconnect' || reason === 'server namespace disconnect') {
      // Clean disconnect - remove immediately
      setTimeout(() => {
        this.connections.delete(socket.id);
      }, 5000);
    } else {
      // Unexpected disconnect - keep for potential reconnection
      this.scheduleReconnectionCleanup(socket.id);
    }
    
    console.log(`🔗 Connection disconnected: ${socket.id} (Reason: ${reason})`);
  }

  /**
   * Handle connection reconnection
   * @param {Object} socket - New socket instance
   * @param {string} userId - User ID
   * @param {string} previousSocketId - Previous socket ID (if known)
   */
  handleReconnection(socket, userId, previousSocketId = null) {
    // Find existing connection by user ID or previous socket ID
    let existingConnection = null;
    
    if (previousSocketId && this.connections.has(previousSocketId)) {
      existingConnection = this.connections.get(previousSocketId);
    } else {
      // Search by user ID
      for (const [socketId, connection] of this.connections.entries()) {
        if (connection.userId === userId && connection.status === 'disconnected') {
          existingConnection = connection;
          this.connections.delete(socketId);
          break;
        }
      }
    }
    
    if (existingConnection) {
      // Update existing connection with new socket
      existingConnection.socketId = socket.id;
      existingConnection.status = 'reconnected';
      existingConnection.reconnectedAt = Date.now();
      existingConnection.lastSeen = Date.now();
      existingConnection.reconnectAttempts = 0;
      
      this.connections.set(socket.id, existingConnection);
      
      // Clear any pending cleanup
      if (this.reconnectionTimers.has(previousSocketId)) {
        clearTimeout(this.reconnectionTimers.get(previousSocketId));
        this.reconnectionTimers.delete(previousSocketId);
      }
      
      this.stats.successfulReconnections++;
      
      console.log(`🔗 Connection reconnected: ${socket.id} (User: ${userId})`);
      
      // Deliver missed events since disconnection
      this.deliverMissedEventsSinceDisconnection(socket, existingConnection);
      
      // Restore room subscriptions
      this.restoreRoomSubscriptions(socket, existingConnection);
      
    } else {
      // New connection
      this.registerConnection(socket, userId);
    }
    
    this.stats.totalReconnections++;
    
    // Set up heartbeat monitoring
    this.setupHeartbeat(socket);
  }

  /**
   * Store missed event for offline users
   * @param {string} userId - User ID
   * @param {Object} event - Event data
   */
  storeMissedEvent(userId, event) {
    if (!this.missedEvents.has(userId)) {
      this.missedEvents.set(userId, []);
    }
    
    const userEvents = this.missedEvents.get(userId);
    
    // Add event with timestamp
    userEvents.push({
      ...event,
      missedAt: Date.now(),
      eventId: this.generateEventId()
    });
    
    // Limit the number of missed events
    if (userEvents.length > this.config.maxMissedEvents) {
      userEvents.shift(); // Remove oldest event
    }
    
    console.log(`📝 Stored missed event for user ${userId}: ${event.type}`);
  }

  /**
   * Deliver missed events to a reconnected user
   * @param {Object} socket - Socket instance
   * @param {string} userId - User ID
   */
  deliverMissedEvents(socket, userId) {
    const missedEvents = this.missedEvents.get(userId);
    if (!missedEvents || missedEvents.length === 0) return;
    
    const now = Date.now();
    const validEvents = missedEvents.filter(event => 
      now - event.missedAt < this.config.missedEventRetention
    );
    
    if (validEvents.length > 0) {
      socket.emit('missed_events', {
        events: validEvents,
        count: validEvents.length,
        deliveredAt: now
      });
      
      this.stats.missedEventsDelivered += validEvents.length;
      
      console.log(`📨 Delivered ${validEvents.length} missed events to ${userId}`);
    }
    
    // Clear delivered events
    this.missedEvents.delete(userId);
  }

  /**
   * Deliver missed events since disconnection
   * @param {Object} socket - Socket instance
   * @param {Object} connection - Connection info
   */
  deliverMissedEventsSinceDisconnection(socket, connection) {
    if (!connection.disconnectedAt) return;
    
    const missedEvents = this.missedEvents.get(connection.userId) || [];
    const eventsSinceDisconnect = missedEvents.filter(event => 
      event.missedAt >= connection.disconnectedAt
    );
    
    if (eventsSinceDisconnect.length > 0) {
      socket.emit('missed_events_since_disconnect', {
        events: eventsSinceDisconnect,
        count: eventsSinceDisconnect.length,
        disconnectedAt: connection.disconnectedAt,
        deliveredAt: Date.now()
      });
      
      console.log(`📨 Delivered ${eventsSinceDisconnect.length} events since disconnect to ${connection.userId}`);
    }
  }

  /**
   * Restore room subscriptions after reconnection
   * @param {Object} socket - Socket instance
   * @param {Object} connection - Connection info
   */
  restoreRoomSubscriptions(socket, connection) {
    if (connection.rooms.size === 0) return;
    
    connection.rooms.forEach(roomKey => {
      const [roomType, roomId] = roomKey.split(':');
      socket.join(roomKey);
      
      socket.emit('subscription_restored', {
        roomType,
        roomId,
        restoredAt: Date.now()
      });
    });
    
    console.log(`🏠 Restored ${connection.rooms.size} room subscriptions for ${connection.userId}`);
  }

  /**
   * Track room subscription for a connection
   * @param {string} socketId - Socket ID
   * @param {string} roomType - Room type
   * @param {string} roomId - Room ID
   */
  trackRoomSubscription(socketId, roomType, roomId) {
    const connection = this.connections.get(socketId);
    if (connection) {
      const roomKey = `${roomType}:${roomId}`;
      connection.rooms.add(roomKey);
    }
  }

  /**
   * Remove room subscription tracking
   * @param {string} socketId - Socket ID
   * @param {string} roomType - Room type
   * @param {string} roomId - Room ID
   */
  untrackRoomSubscription(socketId, roomType, roomId) {
    const connection = this.connections.get(socketId);
    if (connection) {
      const roomKey = `${roomType}:${roomId}`;
      connection.rooms.delete(roomKey);
    }
  }

  /**
   * Set up heartbeat monitoring for a connection
   * @param {Object} socket - Socket instance
   */
  setupHeartbeat(socket) {
    const heartbeatTimer = setInterval(() => {
      const connection = this.connections.get(socket.id);
      if (!connection) {
        clearInterval(heartbeatTimer);
        return;
      }
      
      // Send ping and wait for pong
      const pingStart = Date.now();
      socket.emit('ping', { timestamp: pingStart });
      
      const pongTimeout = setTimeout(() => {
        // No pong received - connection might be dead
        console.warn(`⚠️ No pong received from ${socket.id}, considering connection stale`);
        connection.status = 'stale';
        this.stats.connectionTimeouts++;
      }, this.config.connectionTimeout);
      
      socket.once('pong', (data) => {
        clearTimeout(pongTimeout);
        connection.lastSeen = Date.now();
        connection.latency = Date.now() - pingStart;
        connection.status = 'connected';
      });
      
    }, this.config.heartbeatInterval);
    
    // Store timer for cleanup
    socket.heartbeatTimer = heartbeatTimer;
  }

  /**
   * Clear heartbeat monitoring for a connection
   * @param {string} socketId - Socket ID
   */
  clearHeartbeat(socketId) {
    const connection = this.connections.get(socketId);
    if (connection && connection.heartbeatTimer) {
      clearInterval(connection.heartbeatTimer);
      delete connection.heartbeatTimer;
    }
  }

  /**
   * Schedule cleanup for disconnected connection
   * @param {string} socketId - Socket ID
   */
  scheduleReconnectionCleanup(socketId) {
    const connection = this.connections.get(socketId);
    if (!connection) return;
    
    // Calculate delay based on reconnect attempts (exponential backoff)
    const delay = Math.min(
      this.config.reconnectDelay * Math.pow(this.config.backoffMultiplier, connection.reconnectAttempts),
      this.config.maxReconnectDelay
    );
    
    const timer = setTimeout(() => {
      const conn = this.connections.get(socketId);
      if (conn && conn.status === 'disconnected') {
        if (conn.reconnectAttempts < this.config.maxReconnectAttempts) {
          conn.reconnectAttempts++;
          this.scheduleReconnectionCleanup(socketId); // Schedule next attempt
        } else {
          // Max attempts reached - remove connection
          this.connections.delete(socketId);
          this.stats.failedReconnections++;
          console.log(`❌ Connection cleanup: ${socketId} (max reconnect attempts reached)`);
        }
      }
      this.reconnectionTimers.delete(socketId);
    }, delay);
    
    this.reconnectionTimers.set(socketId, timer);
  }

  /**
   * Get connection info
   * @param {string} socketId - Socket ID
   * @returns {Object} Connection info
   */
  getConnection(socketId) {
    return this.connections.get(socketId);
  }

  /**
   * Get all connections for a user
   * @param {string} userId - User ID
   * @returns {Array} User connections
   */
  getUserConnections(userId) {
    return Array.from(this.connections.values())
      .filter(conn => conn.userId === userId);
  }

  /**
   * Get recovery statistics
   * @returns {Object} Recovery stats
   */
  getStats() {
    return {
      ...this.stats,
      activeConnections: this.connections.size,
      pendingReconnections: this.reconnectionTimers.size,
      usersWithMissedEvents: this.missedEvents.size,
      totalMissedEvents: Array.from(this.missedEvents.values())
        .reduce((total, events) => total + events.length, 0)
    };
  }

  /**
   * Generate unique event ID
   * @returns {string} Event ID
   */
  generateEventId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start cleanup scheduler for old data
   */
  startCleanupScheduler() {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 60 * 1000); // Every hour
    
    console.log('🧹 Started connection recovery cleanup scheduler');
  }

  /**
   * Clean up old missed events and stale connections
   */
  cleanup() {
    try {
      const now = Date.now();
      let cleanedEvents = 0;
      let cleanedConnections = 0;
      
      // Clean up old missed events
      for (const [userId, events] of this.missedEvents.entries()) {
        const validEvents = events.filter(event => 
          now - event.missedAt < this.config.missedEventRetention
        );
        
        if (validEvents.length === 0) {
          this.missedEvents.delete(userId);
        } else if (validEvents.length < events.length) {
          this.missedEvents.set(userId, validEvents);
        }
        
        cleanedEvents += events.length - validEvents.length;
      }
      
      // Clean up stale connections
      for (const [socketId, connection] of this.connections.entries()) {
        const timeSinceLastSeen = now - connection.lastSeen;
        const isStale = timeSinceLastSeen > (this.config.heartbeatInterval * 3);
        
        if (connection.status === 'disconnected' && isStale) {
          this.connections.delete(socketId);
          cleanedConnections++;
        }
      }
      
      if (cleanedEvents > 0 || cleanedConnections > 0) {
        console.log(`🧹 Cleanup completed: ${cleanedEvents} events, ${cleanedConnections} connections`);
      }
    } catch (error) {
      console.error('Error during connection recovery cleanup:', error);
    }
  }

  /**
   * Stop cleanup scheduler
   */
  stopCleanupScheduler() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('🛑 Stopped connection recovery cleanup scheduler');
    }
  }

  /**
   * Destroy the service
   */
  destroy() {
    this.stopCleanupScheduler();
    
    // Clear all timers
    this.reconnectionTimers.forEach(timer => clearTimeout(timer));
    this.reconnectionTimers.clear();
    
    // Clear heartbeat timers
    this.connections.forEach((connection, socketId) => {
      this.clearHeartbeat(socketId);
    });
    
    // Clear data
    this.connections.clear();
    this.missedEvents.clear();
  }
}

module.exports = { ConnectionRecovery };