const { 
  PresenceStatus, 
  UserPresence, 
  RealtimeEvent,
  createEventPayload 
} = require('../types/realtime');

/**
 * Presence service for tracking user activity and online status
 */
class PresenceService {
  constructor(eventBroadcaster) {
    this.eventBroadcaster = eventBroadcaster;
    this.presenceMap = new Map(); // userId -> UserPresence
    this.cleanupInterval = null;
    this.startCleanupScheduler();
  }

  /**
   * Update user presence
   * @param {string} userId - User ID
   * @param {Object} data - Presence data to update
   */
  async updatePresence(userId, data = {}) {
    try {
      let presence = this.presenceMap.get(userId);
      
      if (!presence) {
        presence = new UserPresence(userId);
        this.presenceMap.set(userId, presence);
      }
      
      // Update presence data
      presence.updateActivity(data);
      
      // Broadcast presence update
      await this.broadcastPresenceUpdate(userId, presence);
      
      console.log(`👤 Updated presence for user ${userId}: ${presence.status}`);
    } catch (error) {
      console.error('Error updating presence:', error);
    }
  }

  /**
   * Set user online status
   * @param {string} userId - User ID
   * @param {Object} additionalData - Additional presence data
   */
  async setUserOnline(userId, additionalData = {}) {
    await this.updatePresence(userId, {
      status: PresenceStatus.ONLINE,
      ...additionalData
    });
  }

  /**
   * Set user offline status
   * @param {string} userId - User ID
   */
  async setUserOffline(userId) {
    await this.updatePresence(userId, {
      status: PresenceStatus.OFFLINE
    });
  }

  /**
   * Set user away status
   * @param {string} userId - User ID
   */
  async setUserAway(userId) {
    await this.updatePresence(userId, {
      status: PresenceStatus.AWAY
    });
  }

  /**
   * Update user's current page/location
   * @param {string} userId - User ID
   * @param {string} currentPage - Current page/route
   */
  async updateCurrentPage(userId, currentPage) {
    await this.updatePresence(userId, {
      currentPage,
      status: PresenceStatus.ONLINE
    });
  }

  /**
   * Update user's active task
   * @param {string} userId - User ID
   * @param {string} taskId - Active task ID
   */
  async updateActiveTask(userId, taskId) {
    await this.updatePresence(userId, {
      activeTask: taskId,
      status: PresenceStatus.ONLINE
    });
  }

  /**
   * Update user's active project
   * @param {string} userId - User ID
   * @param {string} projectId - Active project ID
   */
  async updateActiveProject(userId, projectId) {
    await this.updatePresence(userId, {
      activeProject: projectId,
      status: PresenceStatus.ONLINE
    });
  }

  /**
   * Update custom presence data
   * @param {string} userId - User ID
   * @param {Object} customData - Custom data object
   */
  async updateCustomData(userId, customData) {
    await this.updatePresence(userId, {
      customData: { ...customData },
      status: PresenceStatus.ONLINE
    });
  }

  /**
   * Get user presence
   * @param {string} userId - User ID
   * @returns {UserPresence|null} User presence or null
   */
  getUserPresence(userId) {
    return this.presenceMap.get(userId) || null;
  }

  /**
   * Get presence for multiple users
   * @param {Array<string>} userIds - Array of user IDs
   * @returns {Array<UserPresence>} Array of user presences
   */
  getMultipleUserPresence(userIds) {
    return userIds.map(userId => this.getUserPresence(userId))
                  .filter(presence => presence !== null);
  }

  /**
   * Get all online users
   * @returns {Array<UserPresence>} Array of online user presences
   */
  getOnlineUsers() {
    return Array.from(this.presenceMap.values())
                .filter(presence => presence.isOnline());
  }

  /**
   * Get team presence (placeholder - would need team membership data)
   * @param {string} teamId - Team ID
   * @returns {Array<UserPresence>} Team member presences
   */
  async getTeamPresence(teamId) {
    try {
      // This would need to be implemented with actual team membership data
      // For now, return empty array as placeholder
      const teamMembers = await this.getTeamMembers(teamId);
      return this.getMultipleUserPresence(teamMembers);
    } catch (error) {
      console.error('Error getting team presence:', error);
      return [];
    }
  }

  /**
   * Get project presence (placeholder - would need project membership data)
   * @param {string} projectId - Project ID
   * @returns {Array<UserPresence>} Project member presences
   */
  async getProjectPresence(projectId) {
    try {
      // This would need to be implemented with actual project membership data
      // For now, return empty array as placeholder
      const projectMembers = await this.getProjectMembers(projectId);
      return this.getMultipleUserPresence(projectMembers);
    } catch (error) {
      console.error('Error getting project presence:', error);
      return [];
    }
  }

  /**
   * Check if user is online
   * @param {string} userId - User ID
   * @returns {boolean} True if user is online
   */
  isUserOnline(userId) {
    const presence = this.getUserPresence(userId);
    return presence ? presence.isOnline() : false;
  }

  /**
   * Get users currently viewing a specific page
   * @param {string} page - Page/route name
   * @returns {Array<UserPresence>} Users on the page
   */
  getUsersOnPage(page) {
    return Array.from(this.presenceMap.values())
                .filter(presence => 
                  presence.currentPage === page && 
                  presence.isOnline()
                );
  }

  /**
   * Get users currently working on a task
   * @param {string} taskId - Task ID
   * @returns {Array<UserPresence>} Users working on the task
   */
  getUsersOnTask(taskId) {
    return Array.from(this.presenceMap.values())
                .filter(presence => 
                  presence.activeTask === taskId && 
                  presence.isOnline()
                );
  }

  /**
   * Get users currently working on a project
   * @param {string} projectId - Project ID
   * @returns {Array<UserPresence>} Users working on the project
   */
  getUsersOnProject(projectId) {
    return Array.from(this.presenceMap.values())
                .filter(presence => 
                  presence.activeProject === projectId && 
                  presence.isOnline()
                );
  }

  /**
   * Broadcast presence update to relevant users
   * @param {string} userId - User ID whose presence changed
   * @param {UserPresence} presence - Updated presence
   */
  async broadcastPresenceUpdate(userId, presence) {
    try {
      // Get users who should receive this presence update
      const relevantUsers = await this.getRelevantUsers(userId);
      
      const payload = createEventPayload(
        RealtimeEvent.USER_ACTIVITY,
        {
          userId,
          presence: presence.toJSON()
        },
        userId
      );
      
      // Broadcast to relevant users
      await this.eventBroadcaster.broadcastToUsers(
        relevantUsers,
        RealtimeEvent.USER_ACTIVITY,
        payload.data
      );
      
    } catch (error) {
      console.error('Error broadcasting presence update:', error);
    }
  }

  /**
   * Get users who should receive presence updates for a user
   * @param {string} userId - User ID
   * @returns {Array<string>} Array of user IDs who should receive updates
   */
  async getRelevantUsers(userId) {
    try {
      // This would need to be implemented based on team/project memberships
      // For now, return all online users as placeholder
      const relevantUsers = new Set();
      
      // Add team members
      const teams = await this.getUserTeams(userId);
      for (const teamId of teams) {
        const teamMembers = await this.getTeamMembers(teamId);
        teamMembers.forEach(memberId => relevantUsers.add(memberId));
      }
      
      // Add project collaborators
      const projects = await this.getUserProjects(userId);
      for (const projectId of projects) {
        const projectMembers = await this.getProjectMembers(projectId);
        projectMembers.forEach(memberId => relevantUsers.add(memberId));
      }
      
      // Remove the user themselves
      relevantUsers.delete(userId);
      
      return Array.from(relevantUsers);
    } catch (error) {
      console.error('Error getting relevant users:', error);
      // Fallback: return empty array to avoid broadcasting to everyone
      return [];
    }
  }

  /**
   * Placeholder: Get user's teams
   * @param {string} userId - User ID
   * @returns {Array<string>} Team IDs
   */
  async getUserTeams(userId) {
    // Placeholder implementation
    return [];
  }

  /**
   * Placeholder: Get user's projects
   * @param {string} userId - User ID
   * @returns {Array<string>} Project IDs
   */
  async getUserProjects(userId) {
    // Placeholder implementation
    return [];
  }

  /**
   * Placeholder: Get team members
   * @param {string} teamId - Team ID
   * @returns {Array<string>} User IDs
   */
  async getTeamMembers(teamId) {
    // Placeholder implementation
    return [];
  }

  /**
   * Placeholder: Get project members
   * @param {string} projectId - Project ID
   * @returns {Array<string>} User IDs
   */
  async getProjectMembers(projectId) {
    // Placeholder implementation
    return [];
  }

  /**
   * Clean up stale presence data
   */
  cleanupStalePresence() {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const staleUsers = [];
      
      for (const [userId, presence] of this.presenceMap) {
        if (presence.isStale() && presence.status !== PresenceStatus.OFFLINE) {
          // Mark as away first, then offline if still stale
          if (presence.lastSeen < fiveMinutesAgo) {
            presence.updateStatus(PresenceStatus.OFFLINE);
            staleUsers.push(userId);
          } else {
            presence.updateStatus(PresenceStatus.AWAY);
            staleUsers.push(userId);
          }
        }
      }
      
      // Broadcast updates for stale users
      staleUsers.forEach(async (userId) => {
        const presence = this.presenceMap.get(userId);
        if (presence) {
          await this.broadcastPresenceUpdate(userId, presence);
        }
      });
      
      if (staleUsers.length > 0) {
        console.log(`🧹 Cleaned up ${staleUsers.length} stale presence records`);
      }
    } catch (error) {
      console.error('Error cleaning up stale presence:', error);
    }
  }

  /**
   * Start the cleanup scheduler
   */
  startCleanupScheduler() {
    // Clean up stale presence every 2 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupStalePresence();
    }, 2 * 60 * 1000);
    
    console.log('🕐 Started presence cleanup scheduler');
  }

  /**
   * Stop the cleanup scheduler
   */
  stopCleanupScheduler() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('🛑 Stopped presence cleanup scheduler');
    }
  }

  /**
   * Get presence service statistics
   * @returns {Object} Presence stats
   */
  getStats() {
    const presences = Array.from(this.presenceMap.values());
    
    return {
      totalUsers: presences.length,
      onlineUsers: presences.filter(p => p.status === PresenceStatus.ONLINE).length,
      awayUsers: presences.filter(p => p.status === PresenceStatus.AWAY).length,
      offlineUsers: presences.filter(p => p.status === PresenceStatus.OFFLINE).length,
      staleUsers: presences.filter(p => p.isStale()).length
    };
  }

  /**
   * Remove user from presence tracking
   * @param {string} userId - User ID
   */
  removeUser(userId) {
    this.presenceMap.delete(userId);
  }

  /**
   * Clear all presence data
   */
  clear() {
    this.presenceMap.clear();
  }

  /**
   * Cleanup on service shutdown
   */
  destroy() {
    this.stopCleanupScheduler();
    this.clear();
  }
}

module.exports = { PresenceService };