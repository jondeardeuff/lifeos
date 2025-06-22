const { EventBroadcaster } = require('./eventBroadcaster');
const { RealtimeEvent } = require('../types/realtime');

/**
 * Data synchronization service for real-time updates across all connected clients
 */
class DataSyncService {
  constructor(eventBroadcaster) {
    this.eventBroadcaster = eventBroadcaster;
    this.syncQueue = new Map(); // userId -> pending sync operations
    this.conflictResolvers = new Map();
    this.setupConflictResolvers();
  }

  /**
   * Setup conflict resolution strategies
   */
  setupConflictResolvers() {
    // Last-write-wins for most data types
    this.conflictResolvers.set('default', (local, remote) => {
      return new Date(remote.updatedAt) > new Date(local.updatedAt) ? remote : local;
    });

    // Custom resolver for tasks
    this.conflictResolvers.set('task', (local, remote) => {
      // Merge non-conflicting fields, prefer remote for most updates
      return {
        ...local,
        ...remote,
        // Keep local status if remote is older
        status: new Date(remote.updatedAt) > new Date(local.updatedAt) ? remote.status : local.status,
        updatedAt: new Date() // Update timestamp
      };
    });
  }

  /**
   * Sync task create operation
   * @param {Object} task - Created task
   * @param {string} fromUserId - User who created the task
   */
  async syncTaskCreate(task, fromUserId) {
    try {
      await this.eventBroadcaster.broadcastTaskEvent(task, 'create', fromUserId);
      console.log(`📊 Synced task creation: ${task.id}`);
    } catch (error) {
      console.error('Error syncing task create:', error);
    }
  }

  /**
   * Sync task update operation
   * @param {Object} task - Updated task
   * @param {Object} previousTask - Previous task state
   * @param {string} fromUserId - User who updated the task
   */
  async syncTaskUpdate(task, previousTask, fromUserId) {
    try {
      // Include change information for clients
      const changeData = {
        ...task,
        previousState: previousTask,
        changes: this.getTaskChanges(previousTask, task)
      };

      await this.eventBroadcaster.broadcastTaskEvent(changeData, 'update', fromUserId);
      console.log(`📊 Synced task update: ${task.id}`);
    } catch (error) {
      console.error('Error syncing task update:', error);
    }
  }

  /**
   * Sync task delete operation
   * @param {Object} task - Deleted task
   * @param {string} fromUserId - User who deleted the task
   */
  async syncTaskDelete(task, fromUserId) {
    try {
      await this.eventBroadcaster.broadcastTaskEvent(task, 'delete', fromUserId);
      console.log(`📊 Synced task deletion: ${task.id}`);
    } catch (error) {
      console.error('Error syncing task delete:', error);
    }
  }

  /**
   * Sync task assignment operation
   * @param {Object} task - Assigned task
   * @param {string} previousAssignee - Previous assignee ID
   * @param {string} fromUserId - User who made the assignment
   */
  async syncTaskAssignment(task, previousAssignee, fromUserId) {
    try {
      const assignmentData = {
        ...task,
        previousAssignee,
        assignmentChange: {
          from: previousAssignee,
          to: task.assignedTo,
          timestamp: new Date().toISOString()
        }
      };

      await this.eventBroadcaster.broadcastTaskEvent(assignmentData, 'assign', fromUserId);
      console.log(`📊 Synced task assignment: ${task.id} to ${task.assignedTo}`);
    } catch (error) {
      console.error('Error syncing task assignment:', error);
    }
  }

  /**
   * Sync project create operation
   * @param {Object} project - Created project
   * @param {string} fromUserId - User who created the project
   */
  async syncProjectCreate(project, fromUserId) {
    try {
      await this.eventBroadcaster.broadcastProjectEvent(project, 'create', fromUserId);
      console.log(`📊 Synced project creation: ${project.id}`);
    } catch (error) {
      console.error('Error syncing project create:', error);
    }
  }

  /**
   * Sync project update operation
   * @param {Object} project - Updated project
   * @param {Object} previousProject - Previous project state
   * @param {string} fromUserId - User who updated the project
   */
  async syncProjectUpdate(project, previousProject, fromUserId) {
    try {
      const changeData = {
        ...project,
        previousState: previousProject,
        changes: this.getProjectChanges(previousProject, project)
      };

      await this.eventBroadcaster.broadcastProjectEvent(changeData, 'update', fromUserId);
      console.log(`📊 Synced project update: ${project.id}`);
    } catch (error) {
      console.error('Error syncing project update:', error);
    }
  }

  /**
   * Sync project member addition
   * @param {Object} project - Project
   * @param {string} newMemberId - New member ID
   * @param {string} fromUserId - User who added the member
   */
  async syncProjectMemberAdd(project, newMemberId, fromUserId) {
    try {
      const memberData = {
        ...project,
        newMember: newMemberId,
        addedAt: new Date().toISOString()
      };

      await this.eventBroadcaster.broadcastProjectEvent(memberData, 'member_added', fromUserId);
      console.log(`📊 Synced project member addition: ${newMemberId} to ${project.id}`);
    } catch (error) {
      console.error('Error syncing project member add:', error);
    }
  }

  /**
   * Sync notification
   * @param {Object} notification - Notification object
   */
  async syncNotification(notification) {
    try {
      await this.eventBroadcaster.broadcastNotification(notification);
      console.log(`📊 Synced notification: ${notification.id}`);
    } catch (error) {
      console.error('Error syncing notification:', error);
    }
  }

  /**
   * Sync tag create operation
   * @param {Object} tag - Created tag
   * @param {string} fromUserId - User who created the tag
   */
  async syncTagCreate(tag, fromUserId) {
    try {
      await this.eventBroadcaster.broadcastToUser(
        tag.userId,
        'tag:created',
        tag,
        fromUserId
      );
      console.log(`📊 Synced tag creation: ${tag.id}`);
    } catch (error) {
      console.error('Error syncing tag create:', error);
    }
  }

  /**
   * Sync tag update operation
   * @param {Object} tag - Updated tag
   * @param {string} fromUserId - User who updated the tag
   */
  async syncTagUpdate(tag, fromUserId) {
    try {
      await this.eventBroadcaster.broadcastToUser(
        tag.userId,
        'tag:updated',
        tag,
        fromUserId
      );
      console.log(`📊 Synced tag update: ${tag.id}`);
    } catch (error) {
      console.error('Error syncing tag update:', error);
    }
  }

  /**
   * Sync tag delete operation
   * @param {Object} tag - Deleted tag
   * @param {string} fromUserId - User who deleted the tag
   */
  async syncTagDelete(tag, fromUserId) {
    try {
      await this.eventBroadcaster.broadcastToUser(
        tag.userId,
        'tag:deleted',
        tag,
        fromUserId
      );
      console.log(`📊 Synced tag deletion: ${tag.id}`);
    } catch (error) {
      console.error('Error syncing tag delete:', error);
    }
  }

  /**
   * Sync user preference changes
   * @param {string} userId - User ID
   * @param {Object} preferences - Updated preferences
   */
  async syncUserPreferences(userId, preferences) {
    try {
      await this.eventBroadcaster.broadcastToUser(
        userId,
        'user:preferences_updated',
        { preferences },
        userId
      );
      console.log(`📊 Synced user preferences: ${userId}`);
    } catch (error) {
      console.error('Error syncing user preferences:', error);
    }
  }

  /**
   * Sync bulk operations
   * @param {string} operationType - Type of bulk operation
   * @param {Array} items - Items affected
   * @param {string} fromUserId - User who performed the operation
   */
  async syncBulkOperation(operationType, items, fromUserId) {
    try {
      const bulkData = {
        operationType,
        items,
        count: items.length,
        timestamp: new Date().toISOString()
      };

      // Determine affected users
      const affectedUsers = new Set();
      items.forEach(item => {
        if (item.userId) affectedUsers.add(item.userId);
        if (item.assignedTo) affectedUsers.add(item.assignedTo);
      });

      // Broadcast to affected users
      for (const userId of affectedUsers) {
        await this.eventBroadcaster.broadcastToUser(
          userId,
          `bulk:${operationType}`,
          bulkData,
          fromUserId
        );
      }

      console.log(`📊 Synced bulk operation: ${operationType} (${items.length} items)`);
    } catch (error) {
      console.error('Error syncing bulk operation:', error);
    }
  }

  /**
   * Handle optimistic update conflicts
   * @param {Object} localData - Local client data
   * @param {Object} remoteData - Remote server data
   * @param {string} dataType - Type of data
   * @returns {Object} Resolved data
   */
  resolveConflict(localData, remoteData, dataType = 'default') {
    try {
      const resolver = this.conflictResolvers.get(dataType) || this.conflictResolvers.get('default');
      return resolver(localData, remoteData);
    } catch (error) {
      console.error('Error resolving conflict:', error);
      // Fallback to remote data
      return remoteData;
    }
  }

  /**
   * Queue sync operation for offline users
   * @param {string} userId - User ID
   * @param {Object} syncOperation - Sync operation data
   */
  queueSyncOperation(userId, syncOperation) {
    try {
      if (!this.syncQueue.has(userId)) {
        this.syncQueue.set(userId, []);
      }

      const userQueue = this.syncQueue.get(userId);
      userQueue.push({
        ...syncOperation,
        queuedAt: new Date().toISOString()
      });

      // Limit queue size to prevent memory issues
      const maxQueueSize = 100;
      if (userQueue.length > maxQueueSize) {
        userQueue.splice(0, userQueue.length - maxQueueSize);
      }

      console.log(`📥 Queued sync operation for offline user ${userId}`);
    } catch (error) {
      console.error('Error queuing sync operation:', error);
    }
  }

  /**
   * Process queued sync operations for a user
   * @param {string} userId - User ID
   */
  async processQueuedOperations(userId) {
    try {
      const userQueue = this.syncQueue.get(userId);
      if (!userQueue || userQueue.length === 0) {
        return;
      }

      console.log(`📤 Processing ${userQueue.length} queued operations for user ${userId}`);

      // Send queued operations to user
      for (const operation of userQueue) {
        await this.eventBroadcaster.sendToSocket(
          operation.socketId,
          'sync:queued_operation',
          operation
        );
      }

      // Clear the queue
      this.syncQueue.delete(userId);
    } catch (error) {
      console.error('Error processing queued operations:', error);
    }
  }

  /**
   * Get changes between two task objects
   * @param {Object} previous - Previous task state
   * @param {Object} current - Current task state
   * @returns {Object} Changes object
   */
  getTaskChanges(previous, current) {
    const changes = {};
    const fields = ['title', 'description', 'status', 'priority', 'dueDate', 'tags', 'metadata'];

    fields.forEach(field => {
      if (JSON.stringify(previous[field]) !== JSON.stringify(current[field])) {
        changes[field] = {
          from: previous[field],
          to: current[field]
        };
      }
    });

    return changes;
  }

  /**
   * Get changes between two project objects
   * @param {Object} previous - Previous project state
   * @param {Object} current - Current project state
   * @returns {Object} Changes object
   */
  getProjectChanges(previous, current) {
    const changes = {};
    const fields = ['name', 'description', 'status', 'settings'];

    fields.forEach(field => {
      if (JSON.stringify(previous[field]) !== JSON.stringify(current[field])) {
        changes[field] = {
          from: previous[field],
          to: current[field]
        };
      }
    });

    return changes;
  }

  /**
   * Get sync service statistics
   * @returns {Object} Sync stats
   */
  getStats() {
    return {
      queuedUsers: this.syncQueue.size,
      totalQueuedOperations: Array.from(this.syncQueue.values())
        .reduce((total, queue) => total + queue.length, 0),
      conflictResolvers: this.conflictResolvers.size
    };
  }

  /**
   * Clear all queued operations
   */
  clearQueue() {
    this.syncQueue.clear();
  }

  /**
   * Clear queued operations for a specific user
   * @param {string} userId - User ID
   */
  clearUserQueue(userId) {
    this.syncQueue.delete(userId);
  }
}

module.exports = { DataSyncService };