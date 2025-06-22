import { renderHook, act } from '@testing-library/react';
import { useRealtimeData } from '../../hooks/realtime/useRealtimeData';
import { useRealtime } from '../../hooks/realtime/useRealtime';

// Mock the useRealtime hook
jest.mock('../../hooks/realtime/useRealtime');

describe('useRealtimeData Hook', () => {
  const mockSubscribe = jest.fn();
  const mockIsConnected = true;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock useRealtime hook
    useRealtime.mockReturnValue({
      isConnected: mockIsConnected,
      subscribe: mockSubscribe.mockReturnValue(() => {}) // Return unsubscribe function
    });
  });

  describe('Initialization', () => {
    test('should initialize with default state', () => {
      const { result } = renderHook(() => useRealtimeData());

      expect(result.current.data).toBe(null);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.lastUpdated).toBe(null);
      expect(result.current.isConnected).toBe(true);
    });

    test('should initialize with provided initial data', () => {
      const initialData = { id: 1, title: 'Test Task' };
      const { result } = renderHook(() => 
        useRealtimeData({ initialData, dataType: 'task' })
      );

      expect(result.current.data).toEqual(initialData);
    });
  });

  describe('Event Subscriptions', () => {
    test('should subscribe to task events when dataType is task', () => {
      renderHook(() => useRealtimeData({ dataType: 'task' }));

      expect(mockSubscribe).toHaveBeenCalledWith('task:created', expect.any(Function));
      expect(mockSubscribe).toHaveBeenCalledWith('task:updated', expect.any(Function));
      expect(mockSubscribe).toHaveBeenCalledWith('task:deleted', expect.any(Function));
      expect(mockSubscribe).toHaveBeenCalledWith('task:assigned', expect.any(Function));
      expect(mockSubscribe).toHaveBeenCalledWith('bulk:update', expect.any(Function));
      expect(mockSubscribe).toHaveBeenCalledWith('bulk:delete', expect.any(Function));
    });

    test('should subscribe to tag events when dataType is tag', () => {
      renderHook(() => useRealtimeData({ dataType: 'tag' }));

      expect(mockSubscribe).toHaveBeenCalledWith('tag:created', expect.any(Function));
      expect(mockSubscribe).toHaveBeenCalledWith('tag:updated', expect.any(Function));
      expect(mockSubscribe).toHaveBeenCalledWith('tag:deleted', expect.any(Function));
    });

    test('should subscribe to project events when dataType is project', () => {
      renderHook(() => useRealtimeData({ dataType: 'project' }));

      expect(mockSubscribe).toHaveBeenCalledWith('project:created', expect.any(Function));
      expect(mockSubscribe).toHaveBeenCalledWith('project:updated', expect.any(Function));
      expect(mockSubscribe).toHaveBeenCalledWith('project:member_added', expect.any(Function));
    });

    test('should not subscribe when autoSync is false', () => {
      renderHook(() => useRealtimeData({ dataType: 'task', autoSync: false }));

      expect(mockSubscribe).not.toHaveBeenCalled();
    });

    test('should not subscribe when not connected', () => {
      useRealtime.mockReturnValue({
        isConnected: false,
        subscribe: mockSubscribe
      });

      renderHook(() => useRealtimeData({ dataType: 'task' }));

      expect(mockSubscribe).not.toHaveBeenCalled();
    });
  });

  describe('Data Updates', () => {
    test('should update data with replace strategy', () => {
      const { result } = renderHook(() => useRealtimeData());
      const newData = { id: 1, title: 'New Task' };

      act(() => {
        result.current.updateData(newData, 'replace');
      });

      expect(result.current.data).toEqual(newData);
      expect(result.current.lastUpdated).toBeInstanceOf(Date);
    });

    test('should merge data with merge strategy', () => {
      const initialData = [{ id: 1, title: 'Task 1' }];
      const { result } = renderHook(() => 
        useRealtimeData({ initialData })
      );

      const newData = [{ id: 2, title: 'Task 2' }];

      act(() => {
        result.current.updateData(newData, 'merge');
      });

      expect(result.current.data).toEqual([
        { id: 1, title: 'Task 1' },
        { id: 2, title: 'Task 2' }
      ]);
    });

    test('should upsert data correctly', () => {
      const initialData = [
        { id: 1, title: 'Task 1' },
        { id: 2, title: 'Task 2' }
      ];
      const { result } = renderHook(() => 
        useRealtimeData({ initialData })
      );

      const updateData = [
        { id: 2, title: 'Updated Task 2' },
        { id: 3, title: 'New Task 3' }
      ];

      act(() => {
        result.current.updateData(updateData, 'upsert');
      });

      expect(result.current.data).toEqual([
        { id: 1, title: 'Task 1' },
        { id: 2, title: 'Updated Task 2' },
        { id: 3, title: 'New Task 3' }
      ]);
    });

    test('should remove data correctly', () => {
      const initialData = [
        { id: 1, title: 'Task 1' },
        { id: 2, title: 'Task 2' },
        { id: 3, title: 'Task 3' }
      ];
      const { result } = renderHook(() => 
        useRealtimeData({ initialData })
      );

      const idsToRemove = [2];

      act(() => {
        result.current.updateData(idsToRemove, 'remove');
      });

      expect(result.current.data).toEqual([
        { id: 1, title: 'Task 1' },
        { id: 3, title: 'Task 3' }
      ]);
    });
  });

  describe('Task Event Handling', () => {
    test('should handle task:created event', () => {
      const { result } = renderHook(() => 
        useRealtimeData({ dataType: 'task', initialData: [] })
      );

      // Get the task created handler
      const taskCreatedHandler = mockSubscribe.mock.calls.find(
        call => call[0] === 'task:created'
      )[1];

      const newTask = { id: 1, title: 'New Task' };

      act(() => {
        taskCreatedHandler({
          type: 'task:created',
          data: newTask
        });
      });

      expect(result.current.data).toEqual([newTask]);
    });

    test('should handle task:updated event', () => {
      const initialData = [{ id: 1, title: 'Old Title' }];
      const { result } = renderHook(() => 
        useRealtimeData({ dataType: 'task', initialData })
      );

      const taskUpdatedHandler = mockSubscribe.mock.calls.find(
        call => call[0] === 'task:updated'
      )[1];

      const updatedTask = { id: 1, title: 'Updated Title' };

      act(() => {
        taskUpdatedHandler({
          type: 'task:updated',
          data: updatedTask
        });
      });

      expect(result.current.data).toEqual([updatedTask]);
    });

    test('should handle task:deleted event', () => {
      const initialData = [
        { id: 1, title: 'Task 1' },
        { id: 2, title: 'Task 2' }
      ];
      const { result } = renderHook(() => 
        useRealtimeData({ dataType: 'task', initialData })
      );

      const taskDeletedHandler = mockSubscribe.mock.calls.find(
        call => call[0] === 'task:deleted'
      )[1];

      act(() => {
        taskDeletedHandler({
          type: 'task:deleted',
          data: { id: 1 }
        });
      });

      expect(result.current.data).toEqual([{ id: 2, title: 'Task 2' }]);
    });

    test('should handle bulk:update event', () => {
      const initialData = [{ id: 1, title: 'Task 1' }];
      const { result } = renderHook(() => 
        useRealtimeData({ dataType: 'task', initialData })
      );

      const bulkUpdateHandler = mockSubscribe.mock.calls.find(
        call => call[0] === 'bulk:update'
      )[1];

      const bulkData = {
        operationType: 'update',
        items: [
          { id: 1, title: 'Updated Task 1' },
          { id: 2, title: 'New Task 2' }
        ]
      };

      act(() => {
        bulkUpdateHandler({
          type: 'bulk:update',
          data: bulkData
        });
      });

      expect(result.current.data).toEqual([
        { id: 1, title: 'Updated Task 1' },
        { id: 2, title: 'New Task 2' }
      ]);
    });

    test('should ignore events for different data types', () => {
      const initialData = [{ id: 1, title: 'Task 1' }];
      const { result } = renderHook(() => 
        useRealtimeData({ dataType: 'project', initialData })
      );

      // Should have subscribed to project events, not task events
      const projectCreatedCalls = mockSubscribe.mock.calls.filter(
        call => call[0] === 'project:created'
      );
      const taskCreatedCalls = mockSubscribe.mock.calls.filter(
        call => call[0] === 'task:created'
      );

      expect(projectCreatedCalls.length).toBe(1);
      expect(taskCreatedCalls.length).toBe(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle errors in event processing', () => {
      const { result } = renderHook(() => 
        useRealtimeData({ dataType: 'task', initialData: [] })
      );

      const taskCreatedHandler = mockSubscribe.mock.calls.find(
        call => call[0] === 'task:created'
      )[1];

      // Trigger an error by passing invalid data
      act(() => {
        try {
          taskCreatedHandler({
            type: 'task:created',
            data: null // This might cause issues
          });
        } catch (error) {
          // Error should be caught and set in state
        }
      });

      // Error should be handled gracefully
      expect(result.current.error).toBeTruthy();
    });

    test('should clear errors', () => {
      const { result } = renderHook(() => useRealtimeData());

      // Set an error first
      act(() => {
        result.current.updateData(null, 'invalid-strategy');
      });

      // Clear the error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBe(null);
    });
  });

  describe('Utility Methods', () => {
    test('should sync data manually', () => {
      const { result } = renderHook(() => useRealtimeData());
      const newData = { id: 1, title: 'Synced Task' };

      act(() => {
        result.current.sync(newData);
      });

      expect(result.current.data).toEqual(newData);
    });

    test('should reset to initial state', () => {
      const initialData = { id: 1, title: 'Initial Task' };
      const { result } = renderHook(() => 
        useRealtimeData({ initialData })
      );

      // Update data first
      act(() => {
        result.current.updateData({ id: 2, title: 'New Task' });
      });

      // Reset to initial state
      act(() => {
        result.current.reset();
      });

      expect(result.current.data).toEqual(initialData);
      expect(result.current.error).toBe(null);
      expect(result.current.lastUpdated).toBe(null);
    });
  });

  describe('Connection Recovery', () => {
    test('should handle reconnection events', () => {
      renderHook(() => useRealtimeData());

      const reconnectedHandler = mockSubscribe.mock.calls.find(
        call => call[0] === 'reconnected'
      )[1];

      expect(reconnectedHandler).toBeDefined();
    });
  });

  describe('Cleanup', () => {
    test('should unsubscribe from events on unmount', () => {
      const unsubscribeMock = jest.fn();
      mockSubscribe.mockReturnValue(unsubscribeMock);

      const { unmount } = renderHook(() => 
        useRealtimeData({ dataType: 'task' })
      );

      unmount();

      expect(unsubscribeMock).toHaveBeenCalled();
    });

    test('should handle cleanup with invalid unsubscribe functions', () => {
      mockSubscribe.mockReturnValue(null); // Invalid unsubscribe function

      const { unmount } = renderHook(() => 
        useRealtimeData({ dataType: 'task' })
      );

      // Should not throw error
      expect(() => unmount()).not.toThrow();
    });
  });
});