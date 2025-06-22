import { io } from 'socket.io-client';

/**
 * WebSocket client service for real-time communications
 */
class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.eventListeners = new Map();
    this.connectionCallbacks = [];
    this.disconnectionCallbacks = [];
  }

  /**
   * Connect to the WebSocket server
   * @param {string} token - JWT authentication token
   * @param {Object} options - Connection options
   */
  connect(token, options = {}) {
    if (this.socket && this.socket.connected) {
      console.log('Socket already connected');
      return Promise.resolve();
    }

    const serverUrl = options.serverUrl || process.env.REACT_APP_WS_URL || window.location.origin;

    return new Promise((resolve, reject) => {
      try {
        this.socket = io(serverUrl, {
          auth: { token },
          transports: ['websocket', 'polling'],
          timeout: 10000,
          forceNew: options.forceNew || false,
          reconnection: true,
          reconnectionAttempts: this.maxReconnectAttempts,
          reconnectionDelay: this.reconnectDelay,
          ...options.socketOptions
        });

        // Connection event handlers
        this.socket.on('connect', () => {
          console.log('🔌 Connected to WebSocket server');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          
          // Restore event listeners
          this.restoreEventListeners();
          
          // Call connection callbacks
          this.connectionCallbacks.forEach(callback => {
            try {
              callback();
            } catch (error) {
              console.error('Error in connection callback:', error);
            }
          });
          
          resolve();
        });

        this.socket.on('disconnect', (reason) => {
          console.log('🔌 Disconnected from WebSocket server:', reason);
          this.isConnected = false;
          
          // Call disconnection callbacks
          this.disconnectionCallbacks.forEach(callback => {
            try {
              callback(reason);
            } catch (error) {
              console.error('Error in disconnection callback:', error);
            }
          });
        });

        this.socket.on('connect_error', (error) => {
          console.error('🔌 WebSocket connection error:', error.message);
          this.isConnected = false;
          
          if (this.reconnectAttempts === 0) {
            reject(error);
          }
        });

        this.socket.on('reconnect', (attemptNumber) => {
          console.log(`🔌 Reconnected to WebSocket server (attempt ${attemptNumber})`);
          this.isConnected = true;
          this.reconnectAttempts = 0;
        });

        this.socket.on('reconnect_failed', () => {
          console.error('🔌 Failed to reconnect to WebSocket server');
          this.isConnected = false;
        });

        // Handle rate limiting
        this.socket.on('rate_limit_exceeded', (data) => {
          console.warn('⚠️ Rate limit exceeded:', data);
          // Could show user notification here
        });

        // Handle server errors
        this.socket.on('error', (error) => {
          console.error('🔌 WebSocket error:', error);
        });

        // Ping/pong for connection health
        this.socket.on('pong', (data) => {
          // Update connection health indicator
        });

        // Start heartbeat
        this.startHeartbeat();

      } catch (error) {
        console.error('Error creating socket connection:', error);
        reject(error);
      }
    });
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.stopHeartbeat();
    }
  }

  /**
   * Subscribe to an event
   * @param {string} eventType - Event type to listen for
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  on(eventType, callback) {
    if (!this.socket) {
      console.warn('Socket not connected, queuing event listener');
    }

    // Store the listener for restoration after reconnect
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    this.eventListeners.get(eventType).add(callback);

    // Add listener to socket if connected
    if (this.socket) {
      this.socket.on(eventType, callback);
    }

    // Return unsubscribe function
    return () => {
      this.off(eventType, callback);
    };
  }

  /**
   * Unsubscribe from an event
   * @param {string} eventType - Event type
   * @param {Function} callback - Callback function
   */
  off(eventType, callback) {
    // Remove from stored listeners
    if (this.eventListeners.has(eventType)) {
      this.eventListeners.get(eventType).delete(callback);
      
      if (this.eventListeners.get(eventType).size === 0) {
        this.eventListeners.delete(eventType);
      }
    }

    // Remove from socket if connected
    if (this.socket) {
      this.socket.off(eventType, callback);
    }
  }

  /**
   * Emit an event to the server
   * @param {string} eventType - Event type
   * @param {any} data - Event data
   * @param {Function} ack - Acknowledgment callback
   */
  emit(eventType, data, ack) {
    if (!this.socket || !this.isConnected) {
      console.warn('Socket not connected, cannot emit event:', eventType);
      return;
    }

    if (ack) {
      this.socket.emit(eventType, data, ack);
    } else {
      this.socket.emit(eventType, data);
    }
  }

  /**
   * Subscribe to a room
   * @param {string} roomType - Type of room (user, project, task, etc.)
   * @param {string} roomId - Room identifier
   * @param {Object} filters - Optional filters
   */
  subscribe(roomType, roomId, filters = {}) {
    this.emit('subscribe', { roomType, roomId, filters }, (response) => {
      if (response?.error) {
        console.error('Subscription error:', response.error);
      } else {
        console.log(`📡 Subscribed to ${roomType}:${roomId}`);
      }
    });
  }

  /**
   * Unsubscribe from a room
   * @param {string} roomType - Type of room
   * @param {string} roomId - Room identifier
   */
  unsubscribe(roomType, roomId) {
    this.emit('unsubscribe', { roomType, roomId }, (response) => {
      console.log(`📡 Unsubscribed from ${roomType}:${roomId}`);
    });
  }

  /**
   * Update user activity/presence
   * @param {Object} activityData - Activity data
   */
  updateActivity(activityData) {
    this.emit('activity', activityData);
  }

  /**
   * Add connection callback
   * @param {Function} callback - Callback function
   */
  onConnect(callback) {
    this.connectionCallbacks.push(callback);
  }

  /**
   * Add disconnection callback
   * @param {Function} callback - Callback function
   */
  onDisconnect(callback) {
    this.disconnectionCallbacks.push(callback);
  }

  /**
   * Get connection status
   * @returns {boolean} Connection status
   */
  isSocketConnected() {
    return this.isConnected && this.socket && this.socket.connected;
  }

  /**
   * Get socket instance
   * @returns {Object} Socket instance
   */
  getSocket() {
    return this.socket;
  }

  /**
   * Restore event listeners after reconnection
   * @private
   */
  restoreEventListeners() {
    for (const [eventType, callbacks] of this.eventListeners.entries()) {
      for (const callback of callbacks) {
        this.socket.on(eventType, callback);
      }
    }
  }

  /**
   * Start heartbeat to maintain connection
   * @private
   */
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.isSocketConnected()) {
        this.emit('ping');
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Stop heartbeat
   * @private
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}

// Create a singleton instance
const socketService = new SocketService();

export default socketService;