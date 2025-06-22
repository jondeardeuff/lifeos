import { useState, useEffect, useCallback, useRef } from 'react';
import socketService from '../../services/socketService';

/**
 * Main real-time hook for WebSocket connection management
 * @param {Object} options - Hook options
 * @returns {Object} Real-time connection state and methods
 */
export const useRealtime = (options = {}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const hasConnectedRef = useRef(false);
  const optionsRef = useRef(options);

  // Update options ref when options change
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  /**
   * Connect to the WebSocket server
   */
  const connect = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      setConnectionError(null);
      await socketService.connect(token, optionsRef.current);
      
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      setConnectionError(error.message);
    }
  }, []);

  /**
   * Disconnect from the WebSocket server
   */
  const disconnect = useCallback(() => {
    socketService.disconnect();
  }, []);

  /**
   * Subscribe to an event
   */
  const subscribe = useCallback((eventType, callback) => {
    return socketService.on(eventType, callback);
  }, []);

  /**
   * Emit an event to the server
   */
  const emit = useCallback((eventType, data, ack) => {
    socketService.emit(eventType, data, ack);
  }, []);

  /**
   * Subscribe to a room
   */
  const subscribeToRoom = useCallback((roomType, roomId, filters) => {
    socketService.subscribe(roomType, roomId, filters);
  }, []);

  /**
   * Unsubscribe from a room
   */
  const unsubscribeFromRoom = useCallback((roomType, roomId) => {
    socketService.unsubscribe(roomType, roomId);
  }, []);

  /**
   * Update user activity
   */
  const updateActivity = useCallback((activityData) => {
    socketService.updateActivity(activityData);
  }, []);

  // Set up connection state tracking
  useEffect(() => {
    const handleConnect = () => {
      setIsConnected(true);
      setConnectionError(null);
      setReconnectAttempts(0);
      hasConnectedRef.current = true;
    };

    const handleDisconnect = (reason) => {
      setIsConnected(false);
      if (reason === 'io server disconnect') {
        setConnectionError('Server disconnected');
      }
    };

    const handleReconnect = (attemptNumber) => {
      setReconnectAttempts(attemptNumber);
      setIsConnected(true);
      setConnectionError(null);
    };

    const handleReconnectError = () => {
      setReconnectAttempts(prev => prev + 1);
    };

    const handleConnectError = (error) => {
      setConnectionError(error.message);
      setIsConnected(false);
    };

    // Add event listeners
    socketService.onConnect(handleConnect);
    socketService.onDisconnect(handleDisconnect);
    
    const socket = socketService.getSocket();
    if (socket) {
      socket.on('reconnect', handleReconnect);
      socket.on('reconnect_error', handleReconnectError);
      socket.on('connect_error', handleConnectError);
    }

    // Auto-connect if enabled and we have a token
    if (options.autoConnect !== false && localStorage.getItem('accessToken')) {
      connect();
    }

    // Cleanup
    return () => {
      if (socket) {
        socket.off('reconnect', handleReconnect);
        socket.off('reconnect_error', handleReconnectError);
        socket.off('connect_error', handleConnectError);
      }
    };
  }, [connect, options.autoConnect]);

  // Auto-reconnect on token change
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'accessToken') {
        if (e.newValue && hasConnectedRef.current) {
          // Token updated, reconnect
          connect();
        } else if (!e.newValue) {
          // Token removed, disconnect
          disconnect();
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    connectionError,
    reconnectAttempts,
    connect,
    disconnect,
    subscribe,
    emit,
    subscribeToRoom,
    unsubscribeFromRoom,
    updateActivity,
    socket: socketService.getSocket()
  };
};