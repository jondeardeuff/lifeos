import { useState, useEffect, useCallback, useRef } from 'react';
import { useRealtime } from './useRealtime';

/**
 * Hook for managing user presence and activity tracking
 * @param {Object} options - Hook options
 * @returns {Object} Presence state and methods
 */
export const usePresence = (options = {}) => {
  const {
    trackActivity = true,
    activityThreshold = 30000, // 30 seconds
    presenceUpdateInterval = 60000, // 1 minute
    autoTrackMouse = true,
    autoTrackKeyboard = true,
    autoTrackFocus = true
  } = options;

  const [userPresence, setUserPresence] = useState('online');
  const [isVisible, setIsVisible] = useState(!document.hidden);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [connectedUsers, setConnectedUsers] = useState(new Map());
  
  const { isConnected, subscribe, emit } = useRealtime();
  const activityTimerRef = useRef(null);
  const presenceTimerRef = useRef(null);
  const lastActivityRef = useRef(lastActivity);

  // Update lastActivity ref when state changes
  useEffect(() => {
    lastActivityRef.current = lastActivity;
  }, [lastActivity]);

  /**
   * Update user activity timestamp
   */
  const updateActivity = useCallback(() => {
    const now = Date.now();
    setLastActivity(now);
    
    // If user was away, update presence to online
    if (userPresence === 'away') {
      setUserPresence('online');
      emit('presence:update', { status: 'online', lastSeen: now });
    }
  }, [userPresence, emit]);

  /**
   * Set user presence status
   */
  const setPresence = useCallback((status, metadata = {}) => {
    setUserPresence(status);
    emit('presence:update', { 
      status, 
      lastSeen: Date.now(),
      metadata 
    });
  }, [emit]);

  /**
   * Get presence status for a specific user
   */
  const getUserPresence = useCallback((userId) => {
    return connectedUsers.get(userId) || null;
  }, [connectedUsers]);

  /**
   * Get all connected users
   */
  const getConnectedUsers = useCallback(() => {
    return Array.from(connectedUsers.values());
  }, [connectedUsers]);

  /**
   * Get users with specific presence status
   */
  const getUsersByStatus = useCallback((status) => {
    return Array.from(connectedUsers.values()).filter(user => user.status === status);
  }, [connectedUsers]);

  /**
   * Check if user is currently active (within activity threshold)
   */
  const isUserActive = useCallback(() => {
    return Date.now() - lastActivityRef.current < activityThreshold;
  }, [activityThreshold]);

  // Handle presence events from server
  useEffect(() => {
    if (!isConnected) return;

    const unsubscribers = [
      // User joined
      subscribe('presence:user_joined', (data) => {
        setConnectedUsers(prev => {
          const updated = new Map(prev);
          updated.set(data.userId, {
            ...data,
            joinedAt: Date.now()
          });
          return updated;
        });
      }),

      // User left
      subscribe('presence:user_left', (data) => {
        setConnectedUsers(prev => {
          const updated = new Map(prev);
          updated.delete(data.userId);
          return updated;
        });
      }),

      // User presence updated
      subscribe('presence:user_updated', (data) => {
        setConnectedUsers(prev => {
          const updated = new Map(prev);
          const existing = updated.get(data.userId) || {};
          updated.set(data.userId, {
            ...existing,
            ...data,
            updatedAt: Date.now()
          });
          return updated;
        });
      }),

      // Initial presence state
      subscribe('presence:initial_state', (data) => {
        const usersMap = new Map();
        data.users.forEach(user => {
          usersMap.set(user.userId, user);
        });
        setConnectedUsers(usersMap);
      }),

      // Presence sync (periodic updates)
      subscribe('presence:sync', (data) => {
        setConnectedUsers(prev => {
          const updated = new Map(prev);
          data.updates.forEach(update => {
            const existing = updated.get(update.userId) || {};
            updated.set(update.userId, {
              ...existing,
              ...update,
              syncedAt: Date.now()
            });
          });
          return updated;
        });
      })
    ];

    return () => {
      unsubscribers.forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
    };
  }, [isConnected, subscribe]);

  // Track document visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = !document.hidden;
      setIsVisible(visible);
      
      if (visible) {
        // Page became visible - user is back
        updateActivity();
        setPresence('online');
      } else {
        // Page became hidden - user might be away
        setPresence('away');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [updateActivity, setPresence]);

  // Track user activity
  useEffect(() => {
    if (!trackActivity) return;

    const events = [];
    
    if (autoTrackMouse) {
      events.push('mousemove', 'mousedown', 'click');
    }
    
    if (autoTrackKeyboard) {
      events.push('keydown', 'keypress');
    }
    
    if (autoTrackFocus) {
      events.push('focus');
    }

    const handleActivity = () => {
      updateActivity();
    };

    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [trackActivity, autoTrackMouse, autoTrackKeyboard, autoTrackFocus, updateActivity]);

  // Monitor for inactivity
  useEffect(() => {
    if (!trackActivity) return;

    const checkActivity = () => {
      const timeSinceActivity = Date.now() - lastActivityRef.current;
      
      if (timeSinceActivity > activityThreshold && userPresence === 'online') {
        setPresence('away');
      }
    };

    activityTimerRef.current = setInterval(checkActivity, 10000); // Check every 10 seconds

    return () => {
      if (activityTimerRef.current) {
        clearInterval(activityTimerRef.current);
      }
    };
  }, [trackActivity, activityThreshold, userPresence, setPresence]);

  // Send periodic presence updates
  useEffect(() => {
    if (!isConnected) return;

    const sendPresenceUpdate = () => {
      emit('presence:heartbeat', {
        status: userPresence,
        lastSeen: lastActivityRef.current,
        isVisible,
        isActive: isUserActive()
      });
    };

    // Send initial presence
    sendPresenceUpdate();

    // Send periodic updates
    presenceTimerRef.current = setInterval(sendPresenceUpdate, presenceUpdateInterval);

    return () => {
      if (presenceTimerRef.current) {
        clearInterval(presenceTimerRef.current);
      }
    };
  }, [isConnected, userPresence, isVisible, presenceUpdateInterval, emit, isUserActive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (activityTimerRef.current) {
        clearInterval(activityTimerRef.current);
      }
      if (presenceTimerRef.current) {
        clearInterval(presenceTimerRef.current);
      }
    };
  }, []);

  return {
    // Current user presence
    userPresence,
    isVisible,
    lastActivity,
    isActive: isUserActive(),
    
    // Connected users
    connectedUsers: getConnectedUsers(),
    connectedUsersMap: connectedUsers,
    
    // Actions
    setPresence,
    updateActivity,
    
    // Queries
    getUserPresence,
    getUsersByStatus,
    
    // Statistics
    stats: {
      totalConnected: connectedUsers.size,
      online: getUsersByStatus('online').length,
      away: getUsersByStatus('away').length,
      offline: getUsersByStatus('offline').length
    }
  };
};