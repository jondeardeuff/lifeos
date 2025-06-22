const { 
  RealtimeEvent, 
  createEventPayload, 
  createRoomName, 
  RoomType 
} = require('../types/realtime');

/**
 * Event broadcasting service for real-time WebSocket communications
 */
class EventBroadcaster {
  constructor(io) {
    this.io = io;
    this.eventLog = new Map(); // Event history for missed updates
    this.maxEventHistory = 1000; // Maximum events to keep in memory
  }

  /**
   * Broadcast event to a specific user
   * @param {string} userId - Target user ID
   * @param {string} eventType - Event type from RealtimeEvent
   * @param {any} data - Event data payload
   * @param {string} fromUserId - User ID who triggered the event
   */
  async broadcastToUser(userId, eventType, data, fromUserId = null) {
    try {
      const payload = createEventPayload(eventType, data, fromUserId);
      const userRoom = createRoomName(RoomType.USER, userId);
      
      this.io.to(userRoom).emit(eventType, payload);
      
      // Log event for missed updates
      this.logEvent(userId, payload);
      
      console.log(`📡 Broadcasted ${eventType} to user ${userId}`);
    } catch (error) {
      console.error('Error broadcasting to user:', error);
    }
  }

  /**
   * Broadcast event to multiple users
   * @param {Array<string>} userIds - Array of user IDs
   * @param {string} eventType - Event type
   * @param {any} data - Event data
   * @param {string} fromUserId - User who triggered the event
   */
  async broadcastToUsers(userIds, eventType, data, fromUserId = null) {
    try {
      const payload = createEventPayload(eventType, data, fromUserId);
      
      for (const userId of userIds) {
        const userRoom = createRoomName(RoomType.USER, userId);
        this.io.to(userRoom).emit(eventType, payload);
        this.logEvent(userId, payload);
      }
      
      console.log(`📡 Broadcasted ${eventType} to ${userIds.length} users`);
    } catch (error) {
      console.error('Error broadcasting to users:', error);
    }
  }

  /**
   * Broadcast event to a project room
   * @param {string} projectId - Project ID
   * @param {string} eventType - Event type
   * @param {any} data - Event data
   * @param {string} fromUserId - User who triggered the event
   */
  async broadcastToProject(projectId, eventType, data, fromUserId = null) {
    try {
      const payload = createEventPayload(eventType, data, fromUserId);
      const projectRoom = createRoomName(RoomType.PROJECT, projectId);
      
      this.io.to(projectRoom).emit(eventType, payload);
      
      console.log(`📡 Broadcasted ${eventType} to project ${projectId}`);
    } catch (error) {
      console.error('Error broadcasting to project:', error);
    }
  }

  /**
   * Broadcast event to a team room
   * @param {string} teamId - Team ID
   * @param {string} eventType - Event type
   * @param {any} data - Event data
   * @param {string} fromUserId - User who triggered the event
   */
  async broadcastToTeam(teamId, eventType, data, fromUserId = null) {
    try {
      const payload = createEventPayload(eventType, data, fromUserId);
      const teamRoom = createRoomName(RoomType.TEAM, teamId);
      
      this.io.to(teamRoom).emit(eventType, payload);
      
      console.log(`📡 Broadcasted ${eventType} to team ${teamId}`);
    } catch (error) {
      console.error('Error broadcasting to team:', error);
    }
  }

  /**
   * Broadcast event to all authenticated users
   * @param {string} eventType - Event type
   * @param {any} data - Event data
   * @param {string} fromUserId - User who triggered the event
   */
  async broadcastToAll(eventType, data, fromUserId = null) {
    try {
      const payload = createEventPayload(eventType, data, fromUserId);
      
      this.io.emit(eventType, payload);
      
      console.log(`📡 Broadcasted ${eventType} to all users`);
    } catch (error) {
      console.error('Error broadcasting to all:', error);
    }
  }

  /**
   * Broadcast event to a specific room
   * @param {string} roomName - Room name
   * @param {string} eventType - Event type
   * @param {any} data - Event data
   * @param {string} fromUserId - User who triggered the event
   */
  async broadcastToRoom(roomName, eventType, data, fromUserId = null) {
    try {
      const payload = createEventPayload(eventType, data, fromUserId);
      
      this.io.to(roomName).emit(eventType, payload);
      
      console.log(`📡 Broadcasted ${eventType} to room ${roomName}`);
    } catch (error) {
      console.error('Error broadcasting to room:', error);
    }
  }

  /**
   * Broadcast task-related events
   * @param {Object} task - Task object
   * @param {string} operation - Operation type (create, update, delete)
   * @param {string} fromUserId - User who performed the operation
   */
  async broadcastTaskEvent(task, operation, fromUserId = null) {
    try {
      let eventType;
      switch (operation) {
        case 'create':
          eventType = RealtimeEvent.TASK_CREATED;
          break;
        case 'update':
          eventType = RealtimeEvent.TASK_UPDATED;
          break;
        case 'delete':
          eventType = RealtimeEvent.TASK_DELETED;
          break;
        case 'assign':
          eventType = RealtimeEvent.TASK_ASSIGNED;
          break;
        default:
          eventType = RealtimeEvent.TASK_UPDATED;
      }

      // Broadcast to task owner
      if (task.userId) {
        await this.broadcastToUser(task.userId, eventType, task, fromUserId);
      }

      // Broadcast to assigned user if different from owner
      if (task.assignedTo && task.assignedTo !== task.userId) {
        await this.broadcastToUser(task.assignedTo, eventType, task, fromUserId);
      }

      // Broadcast to project members if task belongs to a project
      if (task.projectId) {
        await this.broadcastToProject(task.projectId, eventType, task, fromUserId);
      }

      // Broadcast to task-specific room for real-time collaboration
      const taskRoom = createRoomName(RoomType.TASK, task.id);
      await this.broadcastToRoom(taskRoom, eventType, task, fromUserId);

    } catch (error) {
      console.error('Error broadcasting task event:', error);
    }
  }

  /**
   * Broadcast project-related events
   * @param {Object} project - Project object
   * @param {string} operation - Operation type
   * @param {string} fromUserId - User who performed the operation
   */
  async broadcastProjectEvent(project, operation, fromUserId = null) {
    try {
      let eventType;
      switch (operation) {
        case 'create':
          eventType = RealtimeEvent.PROJECT_CREATED;
          break;
        case 'update':
          eventType = RealtimeEvent.PROJECT_UPDATED;
          break;
        case 'member_added':
          eventType = RealtimeEvent.PROJECT_MEMBER_ADDED;
          break;
        default:
          eventType = RealtimeEvent.PROJECT_UPDATED;
      }

      // Broadcast to project room
      await this.broadcastToProject(project.id, eventType, project, fromUserId);

      // Broadcast to project owner
      if (project.ownerId) {
        await this.broadcastToUser(project.ownerId, eventType, project, fromUserId);
      }

    } catch (error) {
      console.error('Error broadcasting project event:', error);
    }
  }

  /**
   * Broadcast notification events
   * @param {Object} notification - Notification object
   */
  async broadcastNotification(notification) {
    try {
      await this.broadcastToUser(
        notification.userId,
        RealtimeEvent.NOTIFICATION_SENT,
        notification
      );
    } catch (error) {
      console.error('Error broadcasting notification:', error);
    }
  }

  /**
   * Broadcast system-wide events
   * @param {string} eventType - Event type
   * @param {any} data - Event data
   */
  async broadcastSystemEvent(eventType, data) {
    try {
      await this.broadcastToAll(eventType, data, 'system');
    } catch (error) {
      console.error('Error broadcasting system event:', error);
    }
  }

  /**
   * Send direct message to a socket
   * @param {string} socketId - Socket ID
   * @param {string} eventType - Event type
   * @param {any} data - Event data
   * @param {string} fromUserId - User who sent the message
   */
  async sendToSocket(socketId, eventType, data, fromUserId = null) {
    try {
      const payload = createEventPayload(eventType, data, fromUserId);
      
      this.io.to(socketId).emit(eventType, payload);
      
      console.log(`📡 Sent ${eventType} to socket ${socketId}`);
    } catch (error) {
      console.error('Error sending to socket:', error);
    }
  }

  /**
   * Log event for missed updates functionality
   * @param {string} userId - User ID
   * @param {Object} payload - Event payload
   */
  logEvent(userId, payload) {
    try {
      if (!this.eventLog.has(userId)) {
        this.eventLog.set(userId, []);
      }
      
      const userEvents = this.eventLog.get(userId);
      userEvents.push({
        ...payload,
        loggedAt: new Date()
      });
      
      // Keep only recent events to prevent memory leaks
      if (userEvents.length > this.maxEventHistory) {
        userEvents.splice(0, userEvents.length - this.maxEventHistory);
      }
    } catch (error) {
      console.error('Error logging event:', error);
    }
  }

  /**
   * Get missed events for a user since a specific timestamp
   * @param {string} userId - User ID
   * @param {Date} since - Timestamp to get events since
   * @returns {Array} Missed events
   */
  getMissedEvents(userId, since) {
    try {
      const userEvents = this.eventLog.get(userId) || [];
      return userEvents.filter(event => 
        new Date(event.timestamp) > since
      );
    } catch (error) {
      console.error('Error getting missed events:', error);
      return [];
    }
  }

  /**
   * Clear event log for a user
   * @param {string} userId - User ID
   */
  clearEventLog(userId) {
    this.eventLog.delete(userId);
  }

  /**
   * Get broadcast statistics
   * @returns {Object} Broadcasting stats
   */
  getStats() {
    return {
      totalRooms: this.io.sockets.adapter.rooms.size,
      connectedSockets: this.io.sockets.sockets.size,
      eventLogSize: this.eventLog.size,
      totalLoggedEvents: Array.from(this.eventLog.values())
        .reduce((total, events) => total + events.length, 0)
    };
  }

  /**
   * Cleanup old events from memory
   * @param {number} maxAgeMs - Maximum age in milliseconds
   */
  cleanupOldEvents(maxAgeMs = 24 * 60 * 60 * 1000) { // 24 hours
    try {
      const cutoff = new Date(Date.now() - maxAgeMs);
      
      for (const [userId, events] of this.eventLog.entries()) {
        const recentEvents = events.filter(event => 
          new Date(event.loggedAt) > cutoff
        );
        
        if (recentEvents.length === 0) {
          this.eventLog.delete(userId);
        } else {
          this.eventLog.set(userId, recentEvents);
        }
      }
      
      console.log('🧹 Cleaned up old events from memory');
    } catch (error) {
      console.error('Error cleaning up old events:', error);
    }
  }
}

module.exports = { EventBroadcaster };