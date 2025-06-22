import { renderHook, act } from '@testing-library/react';
import { useRealtime } from '../../hooks/realtime/useRealtime';
import socketService from '../../services/socketService';

// Mock the socket service
jest.mock('../../services/socketService', () => ({
  connect: jest.fn(),
  disconnect: jest.fn(),
  on: jest.fn(),
  emit: jest.fn(),
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
  updateActivity: jest.fn(),
  getSocket: jest.fn(),
  onConnect: jest.fn(),
  onDisconnect: jest.fn()
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock addEventListener for storage events
const originalAddEventListener = window.addEventListener;
const originalRemoveEventListener = window.removeEventListener;

describe('useRealtime Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock localStorage to return a valid token
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'accessToken') return 'mock-token';
      return null;
    });

    // Mock socket service methods
    socketService.connect.mockResolvedValue();
    socketService.on.mockReturnValue(() => {}); // Return unsubscribe function
    socketService.getSocket.mockReturnValue({
      on: jest.fn(),
      off: jest.fn()
    });
  });

  afterEach(() => {
    window.addEventListener = originalAddEventListener;
    window.removeEventListener = originalRemoveEventListener;
  });

  describe('Initialization', () => {
    test('should initialize with default state', () => {
      const { result } = renderHook(() => useRealtime());

      expect(result.current.isConnected).toBe(false);
      expect(result.current.connectionError).toBe(null);
      expect(result.current.reconnectAttempts).toBe(0);
    });

    test('should auto-connect when token is available', async () => {
      renderHook(() => useRealtime());

      await act(async () => {
        // Wait for useEffect to run
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(socketService.connect).toHaveBeenCalledWith('mock-token', {});
    });

    test('should not auto-connect when autoConnect is false', () => {
      renderHook(() => useRealtime({ autoConnect: false }));

      expect(socketService.connect).not.toHaveBeenCalled();
    });

    test('should not auto-connect when no token is available', () => {
      localStorageMock.getItem.mockReturnValue(null);

      renderHook(() => useRealtime());

      expect(socketService.connect).not.toHaveBeenCalled();
    });
  });

  describe('Connection Management', () => {
    test('should connect manually', async () => {
      const { result } = renderHook(() => useRealtime({ autoConnect: false }));

      await act(async () => {
        await result.current.connect();
      });

      expect(socketService.connect).toHaveBeenCalledWith('mock-token', {});
    });

    test('should handle connection error when no token', async () => {
      localStorageMock.getItem.mockReturnValue(null);
      const { result } = renderHook(() => useRealtime({ autoConnect: false }));

      await act(async () => {
        await result.current.connect();
      });

      expect(result.current.connectionError).toBe('No authentication token found');
      expect(socketService.connect).not.toHaveBeenCalled();
    });

    test('should handle connection service error', async () => {
      const errorMessage = 'Connection failed';
      socketService.connect.mockRejectedValue(new Error(errorMessage));
      
      const { result } = renderHook(() => useRealtime({ autoConnect: false }));

      await act(async () => {
        await result.current.connect();
      });

      expect(result.current.connectionError).toBe(errorMessage);
    });

    test('should disconnect', () => {
      const { result } = renderHook(() => useRealtime());

      act(() => {
        result.current.disconnect();
      });

      expect(socketService.disconnect).toHaveBeenCalled();
    });
  });

  describe('Event Handling', () => {
    test('should subscribe to events', () => {
      const { result } = renderHook(() => useRealtime());
      const mockCallback = jest.fn();

      act(() => {
        result.current.subscribe('test_event', mockCallback);
      });

      expect(socketService.on).toHaveBeenCalledWith('test_event', mockCallback);
    });

    test('should emit events', () => {
      const { result } = renderHook(() => useRealtime());
      const eventData = { test: 'data' };
      const ackCallback = jest.fn();

      act(() => {
        result.current.emit('test_event', eventData, ackCallback);
      });

      expect(socketService.emit).toHaveBeenCalledWith('test_event', eventData, ackCallback);
    });

    test('should handle room subscriptions', () => {
      const { result } = renderHook(() => useRealtime());

      act(() => {
        result.current.subscribeToRoom('project', 'project-id', { filter: 'test' });
      });

      expect(socketService.subscribe).toHaveBeenCalledWith('project', 'project-id', { filter: 'test' });
    });

    test('should handle room unsubscriptions', () => {
      const { result } = renderHook(() => useRealtime());

      act(() => {
        result.current.unsubscribeFromRoom('project', 'project-id');
      });

      expect(socketService.unsubscribe).toHaveBeenCalledWith('project', 'project-id');
    });

    test('should update activity', () => {
      const { result } = renderHook(() => useRealtime());
      const activityData = { action: 'typing' };

      act(() => {
        result.current.updateActivity(activityData);
      });

      expect(socketService.updateActivity).toHaveBeenCalledWith(activityData);
    });
  });

  describe('Connection State Tracking', () => {
    test('should handle connect event', () => {
      const { result } = renderHook(() => useRealtime());

      // Simulate connect event
      act(() => {
        const connectCallback = socketService.onConnect.mock.calls[0][0];
        connectCallback();
      });

      expect(result.current.isConnected).toBe(true);
      expect(result.current.connectionError).toBe(null);
      expect(result.current.reconnectAttempts).toBe(0);
    });

    test('should handle disconnect event', () => {
      const { result } = renderHook(() => useRealtime());

      // First connect
      act(() => {
        const connectCallback = socketService.onConnect.mock.calls[0][0];
        connectCallback();
      });

      // Then disconnect
      act(() => {
        const disconnectCallback = socketService.onDisconnect.mock.calls[0][0];
        disconnectCallback('transport close');
      });

      expect(result.current.isConnected).toBe(false);
    });

    test('should handle server disconnect with error', () => {
      const { result } = renderHook(() => useRealtime());

      act(() => {
        const disconnectCallback = socketService.onDisconnect.mock.calls[0][0];
        disconnectCallback('io server disconnect');
      });

      expect(result.current.isConnected).toBe(false);
      expect(result.current.connectionError).toBe('Server disconnected');
    });
  });

  describe('Storage Event Handling', () => {
    test('should handle token updates', async () => {
      // Mock addEventListener to capture the storage event handler
      let storageEventHandler;
      window.addEventListener = jest.fn((event, handler) => {
        if (event === 'storage') {
          storageEventHandler = handler;
        }
      });

      const { result } = renderHook(() => useRealtime());

      // Simulate token update
      await act(async () => {
        storageEventHandler({
          key: 'accessToken',
          newValue: 'new-token',
          oldValue: 'old-token'
        });
      });

      expect(socketService.connect).toHaveBeenCalledWith('new-token', {});
    });

    test('should disconnect when token is removed', () => {
      let storageEventHandler;
      window.addEventListener = jest.fn((event, handler) => {
        if (event === 'storage') {
          storageEventHandler = handler;
        }
      });

      const { result } = renderHook(() => useRealtime());

      act(() => {
        storageEventHandler({
          key: 'accessToken',
          newValue: null,
          oldValue: 'old-token'
        });
      });

      expect(socketService.disconnect).toHaveBeenCalled();
    });

    test('should ignore non-token storage events', () => {
      let storageEventHandler;
      window.addEventListener = jest.fn((event, handler) => {
        if (event === 'storage') {
          storageEventHandler = handler;
        }
      });

      renderHook(() => useRealtime());

      act(() => {
        storageEventHandler({
          key: 'otherKey',
          newValue: 'value',
          oldValue: null
        });
      });

      // Should not trigger any socket service calls
      expect(socketService.connect).toHaveBeenCalledTimes(1); // Only initial auto-connect
      expect(socketService.disconnect).not.toHaveBeenCalled();
    });
  });

  describe('Socket Instance Access', () => {
    test('should provide socket instance', () => {
      const mockSocket = { id: 'test-socket' };
      socketService.getSocket.mockReturnValue(mockSocket);

      const { result } = renderHook(() => useRealtime());

      expect(result.current.socket).toBe(mockSocket);
    });
  });

  describe('Cleanup', () => {
    test('should clean up event listeners on unmount', () => {
      window.removeEventListener = jest.fn();

      const { unmount } = renderHook(() => useRealtime());

      unmount();

      expect(window.removeEventListener).toHaveBeenCalledWith('storage', expect.any(Function));
    });

    test('should clean up socket event listeners on unmount', () => {
      const mockSocket = {
        off: jest.fn(),
        on: jest.fn()
      };
      socketService.getSocket.mockReturnValue(mockSocket);

      const { unmount } = renderHook(() => useRealtime());

      unmount();

      expect(mockSocket.off).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should handle socket service errors gracefully', async () => {
      socketService.connect.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useRealtime({ autoConnect: false }));

      await act(async () => {
        await result.current.connect();
      });

      expect(result.current.connectionError).toBe('Network error');
      expect(result.current.isConnected).toBe(false);
    });
  });
});