import { useState, useEffect, useCallback, useRef } from 'react';
import { useRealtime } from './useRealtime';

/**
 * Hook for managing real-time data synchronization
 * @param {Object} options - Hook options
 * @returns {Object} Real-time data state and methods
 */
export const useRealtimeData = (options = {}) => {
  const {
    dataType = 'task', // task, project, tag, etc.
    initialData = null,
    filters = {},
    autoSync = true
  } = options;

  const [data, setData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  const { isConnected, subscribe } = useRealtime();
  const dataRef = useRef(data);
  const filtersRef = useRef(filters);

  // Update refs when data/filters change
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  /**
   * Update data and metadata
   */
  const updateData = useCallback((newData, updateType = 'replace') => {
    setData(prevData => {
      let updatedData;
      
      switch (updateType) {
        case 'merge':
          updatedData = Array.isArray(prevData) 
            ? [...prevData, ...newData]
            : { ...prevData, ...newData };
          break;
        case 'upsert':
          if (Array.isArray(prevData)) {
            updatedData = [...prevData];
            newData.forEach(item => {
              const index = updatedData.findIndex(existing => existing.id === item.id);
              if (index >= 0) {
                updatedData[index] = item;
              } else {
                updatedData.push(item);
              }
            });
          } else {
            updatedData = { ...prevData, ...newData };
          }
          break;
        case 'remove':
          if (Array.isArray(prevData)) {
            const idsToRemove = Array.isArray(newData) ? newData : [newData];
            updatedData = prevData.filter(item => 
              !idsToRemove.some(id => 
                typeof id === 'object' ? id.id === item.id : id === item.id
              )
            );
          } else {
            updatedData = prevData;
          }
          break;
        default: // 'replace'
          updatedData = newData;
      }
      
      return updatedData;
    });
    
    setLastUpdated(new Date());
    setError(null);
  }, []);

  /**
   * Handle real-time task events
   */
  const handleTaskEvent = useCallback((event) => {
    const { type, data: eventData } = event;
    
    try {
      switch (type) {
        case 'task:created':
          if (dataType === 'task') {
            updateData([eventData], 'upsert');
          }
          break;
          
        case 'task:updated':
          if (dataType === 'task') {
            updateData([eventData], 'upsert');
          }
          break;
          
        case 'task:deleted':
          if (dataType === 'task') {
            updateData([eventData.id], 'remove');
          }
          break;
          
        case 'task:assigned':
          if (dataType === 'task') {
            updateData([eventData], 'upsert');
          }
          break;
          
        case 'bulk:update':
          if (dataType === 'task' && eventData.operationType === 'update') {
            updateData(eventData.items, 'upsert');
          }
          break;
          
        case 'bulk:delete':
          if (dataType === 'task' && eventData.operationType === 'delete') {
            const idsToRemove = eventData.items.map(item => item.id);
            updateData(idsToRemove, 'remove');
          }
          break;
      }
    } catch (error) {
      console.error('Error handling task event:', error);
      setError(error.message);
    }
  }, [dataType, updateData]);

  /**
   * Handle real-time tag events
   */
  const handleTagEvent = useCallback((event) => {
    const { type, data: eventData } = event;
    
    if (dataType !== 'tag') return;
    
    try {
      switch (type) {
        case 'tag:created':
          updateData([eventData], 'upsert');
          break;
          
        case 'tag:updated':
          updateData([eventData], 'upsert');
          break;
          
        case 'tag:deleted':
          updateData([eventData.id], 'remove');
          break;
      }
    } catch (error) {
      console.error('Error handling tag event:', error);
      setError(error.message);
    }
  }, [dataType, updateData]);

  /**
   * Handle real-time project events
   */
  const handleProjectEvent = useCallback((event) => {
    const { type, data: eventData } = event;
    
    if (dataType !== 'project') return;
    
    try {
      switch (type) {
        case 'project:created':
          updateData([eventData], 'upsert');
          break;
          
        case 'project:updated':
          updateData([eventData], 'upsert');
          break;
          
        case 'project:member_added':
          updateData([eventData], 'upsert');
          break;
      }
    } catch (error) {
      console.error('Error handling project event:', error);
      setError(error.message);
    }
  }, [dataType, updateData]);

  /**
   * Handle connection recovery
   */
  const handleReconnection = useCallback(() => {
    // Optionally refetch data after reconnection
    if (options.refetchOnReconnect) {
      setIsLoading(true);
      // This would trigger a refetch of initial data
      // Implementation depends on how initial data is loaded
    }
  }, [options.refetchOnReconnect]);

  // Set up real-time event subscriptions
  useEffect(() => {
    if (!isConnected || !autoSync) return;

    const unsubscribers = [];

    // Subscribe to relevant events based on data type
    switch (dataType) {
      case 'task':
        unsubscribers.push(
          subscribe('task:created', handleTaskEvent),
          subscribe('task:updated', handleTaskEvent),
          subscribe('task:deleted', handleTaskEvent),
          subscribe('task:assigned', handleTaskEvent),
          subscribe('bulk:update', handleTaskEvent),
          subscribe('bulk:delete', handleTaskEvent)
        );
        break;
        
      case 'tag':
        unsubscribers.push(
          subscribe('tag:created', handleTagEvent),
          subscribe('tag:updated', handleTagEvent),
          subscribe('tag:deleted', handleTagEvent)
        );
        break;
        
      case 'project':
        unsubscribers.push(
          subscribe('project:created', handleProjectEvent),
          subscribe('project:updated', handleProjectEvent),
          subscribe('project:member_added', handleProjectEvent)
        );
        break;
    }

    // Subscribe to reconnection events
    unsubscribers.push(
      subscribe('reconnected', handleReconnection)
    );

    // Cleanup subscriptions
    return () => {
      unsubscribers.forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
    };
  }, [
    isConnected,
    autoSync,
    dataType,
    subscribe,
    handleTaskEvent,
    handleTagEvent,
    handleProjectEvent,
    handleReconnection
  ]);

  /**
   * Manually sync data
   */
  const sync = useCallback((newData, updateType = 'replace') => {
    updateData(newData, updateType);
  }, [updateData]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Reset data to initial state
   */
  const reset = useCallback(() => {
    setData(initialData);
    setError(null);
    setLastUpdated(null);
  }, [initialData]);

  return {
    data,
    isLoading,
    error,
    lastUpdated,
    isConnected,
    sync,
    clearError,
    reset,
    updateData
  };
};