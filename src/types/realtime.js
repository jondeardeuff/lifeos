/**
 * Real-time system type definitions and interfaces
 */

// Real-time event types
const RealtimeEvent = {
  // Task events
  TASK_CREATED: 'task:created',
  TASK_UPDATED: 'task:updated', 
  TASK_DELETED: 'task:deleted',
  TASK_ASSIGNED: 'task:assigned',
  
  // Project events
  PROJECT_CREATED: 'project:created',
  PROJECT_UPDATED: 'project:updated',
  PROJECT_MEMBER_ADDED: 'project:member_added',
  
  // User events
  USER_ONLINE: 'user:online',
  USER_OFFLINE: 'user:offline',
  USER_ACTIVITY: 'user:activity',
  
  // System events
  NOTIFICATION_SENT: 'notification:sent',
  SYSTEM_UPDATE: 'system:update',
  
  // Connection events
  CONNECTION_ERROR: 'connection:error',
  RECONNECTED: 'reconnected',
  PRESENCE_UPDATE: 'presence:update'
};

// User presence status types
const PresenceStatus = {
  ONLINE: 'online',
  AWAY: 'away',
  OFFLINE: 'offline'
};

// Room types for WebSocket organization
const RoomType = {
  USER: 'user',
  PROJECT: 'project',
  TASK: 'task',
  TEAM: 'team',
  GLOBAL: 'global'
};

/**
 * Creates a standardized real-time event payload
 * @param {string} type - Event type from RealtimeEvent
 * @param {any} data - Event data payload
 * @param {string} userId - User ID who triggered the event
 * @returns {Object} Standardized event payload
 */
function createEventPayload(type, data, userId = null) {
  return {
    type,
    data,
    userId,
    timestamp: new Date().toISOString(),
    id: generateEventId()
  };
}

/**
 * Generates a unique event ID
 * @returns {string} Unique event identifier
 */
function generateEventId() {
  return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Creates a room name for WebSocket rooms
 * @param {string} type - Room type from RoomType
 * @param {string} id - Entity ID
 * @param {string} suffix - Optional suffix
 * @returns {string} Room name
 */
function createRoomName(type, id, suffix = '') {
  const base = `${type}:${id}`;
  return suffix ? `${base}:${suffix}` : base;
}

/**
 * Validates event payload structure
 * @param {Object} payload - Event payload to validate
 * @returns {boolean} True if valid
 */
function validateEventPayload(payload) {
  return payload &&
         typeof payload.type === 'string' &&
         payload.data !== undefined &&
         typeof payload.timestamp === 'string' &&
         typeof payload.id === 'string';
}

/**
 * Connection metadata interface
 */
class ConnectedUser {
  constructor(socketId, userId, userAgent = null, ipAddress = null) {
    this.socketId = socketId;
    this.userId = userId;
    this.connectedAt = new Date();
    this.lastActivity = new Date();
    this.userAgent = userAgent;
    this.ipAddress = ipAddress;
    this.rooms = new Set();
  }
  
  updateActivity() {
    this.lastActivity = new Date();
  }
  
  addRoom(roomName) {
    this.rooms.add(roomName);
  }
  
  removeRoom(roomName) {
    this.rooms.delete(roomName);
  }
  
  toJSON() {
    return {
      socketId: this.socketId,
      userId: this.userId,
      connectedAt: this.connectedAt,
      lastActivity: this.lastActivity,
      userAgent: this.userAgent,
      ipAddress: this.ipAddress,
      rooms: Array.from(this.rooms)
    };
  }
}

/**
 * User presence interface
 */
class UserPresence {
  constructor(userId) {
    this.userId = userId;
    this.status = PresenceStatus.OFFLINE;
    this.lastSeen = new Date();
    this.currentPage = null;
    this.activeTask = null;
    this.activeProject = null;
    this.customData = {};
  }
  
  updateStatus(status) {
    this.status = status;
    this.lastSeen = new Date();
  }
  
  updateActivity(data = {}) {
    this.lastSeen = new Date();
    Object.assign(this, data);
  }
  
  isOnline() {
    return this.status === PresenceStatus.ONLINE;
  }
  
  isStale(thresholdMs = 5 * 60 * 1000) { // 5 minutes
    return Date.now() - this.lastSeen.getTime() > thresholdMs;
  }
  
  toJSON() {
    return {
      userId: this.userId,
      status: this.status,
      lastSeen: this.lastSeen,
      currentPage: this.currentPage,
      activeTask: this.activeTask,
      activeProject: this.activeProject,
      customData: this.customData
    };
  }
}

/**
 * Rate limiting interface
 */
class RateLimit {
  constructor(maxEvents = 60, windowMs = 60000) {
    this.maxEvents = maxEvents;
    this.windowMs = windowMs;
    this.count = 0;
    this.resetTime = Date.now() + windowMs;
  }
  
  checkLimit() {
    const now = Date.now();
    
    if (now > this.resetTime) {
      this.count = 1;
      this.resetTime = now + this.windowMs;
      return true;
    }
    
    if (this.count >= this.maxEvents) {
      return false;
    }
    
    this.count++;
    return true;
  }
  
  getRemainingRequests() {
    return Math.max(0, this.maxEvents - this.count);
  }
  
  getResetTime() {
    return this.resetTime;
  }
}

/**
 * Subscription management interface
 */
class Subscription {
  constructor(socketId, userId, eventType, filters = {}) {
    this.id = generateEventId();
    this.socketId = socketId;
    this.userId = userId;
    this.eventType = eventType;
    this.filters = filters;
    this.createdAt = new Date();
    this.active = true;
  }
  
  matches(event) {
    if (!this.active || event.type !== this.eventType) {
      return false;
    }
    
    // Apply filters
    for (const [key, value] of Object.entries(this.filters)) {
      if (event.data && event.data[key] !== value) {
        return false;
      }
    }
    
    return true;
  }
  
  deactivate() {
    this.active = false;
  }
  
  toJSON() {
    return {
      id: this.id,
      socketId: this.socketId,
      userId: this.userId,
      eventType: this.eventType,
      filters: this.filters,
      createdAt: this.createdAt,
      active: this.active
    };
  }
}

module.exports = {
  RealtimeEvent,
  PresenceStatus,
  RoomType,
  ConnectedUser,
  UserPresence,
  RateLimit,
  Subscription,
  createEventPayload,
  generateEventId,
  createRoomName,
  validateEventPayload
};