import { useState, useEffect, useCallback, useRef } from 'react';
import { useRealtime } from './useRealtime';

/**
 * Hook for managing real-time subscriptions to specific data streams
 * @param {Object} options - Subscription options
 * @returns {Object} Subscription state and methods
 */
export const useSubscription = (options = {}) => {
  const {
    roomType = null, // 'user', 'project', 'task', 'global'
    roomId = null,
    filters = {},
    autoSubscribe = true,
    reconnectOnError = true,
    maxRetries = 3,
    retryDelay = 1000
  } = options;

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [activeSubscriptions, setActiveSubscriptions] = useState(new Map());
  const [subscriptionData, setSubscriptionData] = useState(null);
  
  const { isConnected, subscribeToRoom, unsubscribeFromRoom, subscribe } = useRealtime();
  const retryTimeoutRef = useRef(null);
  const subscriptionRef = useRef({ roomType, roomId, filters });

  // Update subscription ref when options change
  useEffect(() => {
    subscriptionRef.current = { roomType, roomId, filters };
  }, [roomType, roomId, filters]);

  /**
   * Subscribe to a room
   */
  const subscribeToRoomWithRetry = useCallback(async (type, id, roomFilters = {}) => {
    try {
      setSubscriptionError(null);
      
      if (!isConnected) {
        throw new Error('Not connected to WebSocket server');
      }

      if (!type || !id) {
        throw new Error('Room type and ID are required');
      }

      // Subscribe to the room
      subscribeToRoom(type, id, roomFilters);
      
      // Track the subscription
      const subscriptionKey = `${type}:${id}`;
      setActiveSubscriptions(prev => {
        const updated = new Map(prev);
        updated.set(subscriptionKey, {
          roomType: type,
          roomId: id,
          filters: roomFilters,
          subscribedAt: Date.now(),
          status: 'active'
        });
        return updated;
      });

      setIsSubscribed(true);
      setRetryCount(0);
      
      console.log(`📡 Subscribed to ${type}:${id}`);
      
    } catch (error) {
      console.error('Subscription error:', error);
      setSubscriptionError(error.message);
      setIsSubscribed(false);
      
      // Retry if enabled and not exceeded max retries
      if (reconnectOnError && retryCount < maxRetries) {
        const delay = retryDelay * Math.pow(2, retryCount); // Exponential backoff
        
        retryTimeoutRef.current = setTimeout(() => {
          setRetryCount(prev => prev + 1);
          subscribeToRoomWithRetry(type, id, roomFilters);
        }, delay);
        
        console.log(`🔄 Retrying subscription in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
      }
    }
  }, [isConnected, subscribeToRoom, reconnectOnError, retryCount, maxRetries, retryDelay]);

  /**
   * Unsubscribe from a room
   */
  const unsubscribeFromRoomSafe = useCallback((type, id) => {
    try {
      if (isConnected) {
        unsubscribeFromRoom(type, id);
      }
      
      // Remove from tracking
      const subscriptionKey = `${type}:${id}`;
      setActiveSubscriptions(prev => {
        const updated = new Map(prev);
        updated.delete(subscriptionKey);
        return updated;
      });
      
      // Clear retry timeout if active
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      
      setIsSubscribed(false);
      setSubscriptionError(null);
      setRetryCount(0);
      
      console.log(`📡 Unsubscribed from ${type}:${id}`);
      
    } catch (error) {
      console.error('Unsubscription error:', error);
    }
  }, [isConnected, unsubscribeFromRoom]);

  /**
   * Subscribe to current room configuration
   */
  const subscribeToRoom = useCallback(() => {
    const { roomType: type, roomId: id, filters: roomFilters } = subscriptionRef.current;
    if (type && id) {
      subscribeToRoomWithRetry(type, id, roomFilters);
    }
  }, [subscribeToRoomWithRetry]);

  /**
   * Unsubscribe from current room
   */
  const unsubscribeFromCurrentRoom = useCallback(() => {
    const { roomType: type, roomId: id } = subscriptionRef.current;
    if (type && id) {
      unsubscribeFromRoomSafe(type, id);
    }
  }, [unsubscribeFromRoomSafe]);

  /**
   * Subscribe to multiple rooms
   */
  const subscribeToMultipleRooms = useCallback((subscriptions) => {
    subscriptions.forEach(({ roomType: type, roomId: id, filters: roomFilters = {} }) => {
      subscribeToRoomWithRetry(type, id, roomFilters);
    });
  }, [subscribeToRoomWithRetry]);

  /**
   * Unsubscribe from all active subscriptions
   */
  const unsubscribeFromAll = useCallback(() => {
    activeSubscriptions.forEach((subscription, key) => {
      const [type, id] = key.split(':');
      unsubscribeFromRoomSafe(type, id);
    });
  }, [activeSubscriptions, unsubscribeFromRoomSafe]);

  /**
   * Check if subscribed to a specific room
   */
  const isSubscribedTo = useCallback((type, id) => {
    const subscriptionKey = `${type}:${id}`;
    return activeSubscriptions.has(subscriptionKey);
  }, [activeSubscriptions]);

  /**
   * Get subscription status for a specific room
   */
  const getSubscriptionStatus = useCallback((type, id) => {
    const subscriptionKey = `${type}:${id}`;
    return activeSubscriptions.get(subscriptionKey) || null;
  }, [activeSubscriptions]);

  // Auto-subscribe when connected and room details are available
  useEffect(() => {
    if (autoSubscribe && isConnected && roomType && roomId && !isSubscribed) {
      subscribeToRoom();
    }
  }, [autoSubscribe, isConnected, roomType, roomId, isSubscribed, subscribeToRoom]);

  // Handle reconnection
  useEffect(() => {
    if (isConnected && activeSubscriptions.size > 0) {
      // Resubscribe to all active subscriptions after reconnection
      activeSubscriptions.forEach((subscription, key) => {
        const [type, id] = key.split(':');
        subscribeToRoomWithRetry(type, id, subscription.filters);
      });
    }
  }, [isConnected, subscribeToRoomWithRetry]);

  // Handle subscription-specific events
  useEffect(() => {
    if (!isConnected) return;

    const unsubscribers = [
      // Subscription confirmed
      subscribe('subscription:confirmed', (data) => {
        const { roomType: type, roomId: id } = data;
        const subscriptionKey = `${type}:${id}`;
        
        setActiveSubscriptions(prev => {
          const updated = new Map(prev);
          const existing = updated.get(subscriptionKey);
          if (existing) {
            updated.set(subscriptionKey, {
              ...existing,
              status: 'confirmed',
              confirmedAt: Date.now()
            });
          }
          return updated;
        });
        
        console.log(`✅ Subscription confirmed: ${type}:${id}`);
      }),

      // Subscription error
      subscribe('subscription:error', (data) => {
        const { roomType: type, roomId: id, error } = data;
        const subscriptionKey = `${type}:${id}`;
        
        setActiveSubscriptions(prev => {
          const updated = new Map(prev);
          const existing = updated.get(subscriptionKey);
          if (existing) {
            updated.set(subscriptionKey, {
              ...existing,
              status: 'error',
              error: error,
              errorAt: Date.now()
            });
          }
          return updated;
        });
        
        setSubscriptionError(error);
        console.error(`❌ Subscription error: ${type}:${id} - ${error}`);
      }),

      // Room data updates
      subscribe('room:data', (data) => {
        setSubscriptionData(data);
      }),

      // Room member updates
      subscribe('room:member_joined', (data) => {
        console.log(`👋 Member joined room: ${data.userId}`);
      }),

      subscribe('room:member_left', (data) => {
        console.log(`👋 Member left room: ${data.userId}`);
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      
      // Unsubscribe from all rooms on unmount
      unsubscribeFromAll();
    };
  }, [unsubscribeFromAll]);

  return {
    // Current subscription state
    isSubscribed,
    subscriptionError,
    retryCount,
    subscriptionData,
    
    // Active subscriptions
    activeSubscriptions: Array.from(activeSubscriptions.values()),
    activeSubscriptionsMap: activeSubscriptions,
    
    // Actions
    subscribe: subscribeToRoomWithRetry,
    unsubscribe: unsubscribeFromRoomSafe,
    subscribeToRoom,
    unsubscribeFromCurrentRoom,
    subscribeToMultipleRooms,
    unsubscribeFromAll,
    
    // Queries
    isSubscribedTo,
    getSubscriptionStatus,
    
    // Configuration
    currentRoom: { roomType, roomId, filters },
    
    // Statistics
    stats: {
      totalSubscriptions: activeSubscriptions.size,
      confirmedSubscriptions: Array.from(activeSubscriptions.values())
        .filter(sub => sub.status === 'confirmed').length,
      errorSubscriptions: Array.from(activeSubscriptions.values())
        .filter(sub => sub.status === 'error').length,
      retryCount
    }
  };
};