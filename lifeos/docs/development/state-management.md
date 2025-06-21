# Life OS State Management

## Overview

State management using Zustand with a modular, type-safe approach. Each domain has its own store with cross-store communication through events.

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  UI Components                   │
└─────────────────────┬───────────────────────────┘
                      │
         ┌────────────┴────────────┐
         │     Custom Hooks        │
         │  (useTask, useVoice)    │
         └────────────┬────────────┘
                      │
    ┌─────────────────┴─────────────────┐
    │          Zustand Stores           │
    ├───────────────────────────────────┤
    │ • TaskStore    • CalendarStore    │
    │ • VoiceStore   • FinanceStore     │
    │ • UIStore      • UserStore        │
    └─────────────────┬─────────────────┘
                      │
         ┌────────────┴────────────┐
         │    Event Emitter        │
         │  (Cross-store comm)     │
         └────────────┬────────────┘
                      │
         ┌────────────┴────────────┐
         │    API Layer            │
         │  (GraphQL/REST)         │
         └─────────────────────────┘
```

## Store Structure

### Base Store Pattern

```typescript
// types/store.ts
interface BaseStore<T> {
  // State
  data: Map<string, T>;
  loading: Set<string>;
  errors: Map<string, Error>;
  
  // Actions
  setItem: (id: string, item: T) => void;
  removeItem: (id: string) => void;
  setLoading: (id: string, loading: boolean) => void;
  setError: (id: string, error: Error | null) => void;
  reset: () => void;
}

// utils/create-store.ts
export function createStore<T>(name: string) {
  return create<BaseStore<T>>()(
    devtools(
      immer((set) => ({
        data: new Map(),
        loading: new Set(),
        errors: new Map(),
        
        setItem: (id, item) =>
          set((state) => {
            state.data.set(id, item);
          }),
          
        removeItem: (id) =>
          set((state) => {
            state.data.delete(id);
            state.loading.delete(id);
            state.errors.delete(id);
          }),
          
        setLoading: (id, loading) =>
          set((state) => {
            if (loading) {
              state.loading.add(id);
            } else {
              state.loading.delete(id);
            }
          }),
          
        setError: (id, error) =>
          set((state) => {
            if (error) {
              state.errors.set(id, error);
            } else {
              state.errors.delete(id);
            }
          }),
          
        reset: () =>
          set((state) => {
            state.data.clear();
            state.loading.clear();
            state.errors.clear();
          }),
      })),
      { name }
    )
  );
}
```

## Domain Stores

### Task Store

```typescript
// stores/task-store.ts
interface Task {
  id: string;
  title: string;
  description?: string;
  projectId?: string;
  assigneeId?: string;
  status: TaskStatus;
  priority: number;
  dueDate?: Date;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface TaskFilters {
  status?: TaskStatus;
  projectId?: string;
  assigneeId?: string;
  tags?: string[];
  search?: string;
}

interface TaskStore extends BaseStore<Task> {
  // Additional state
  filters: TaskFilters;
  sortBy: 'dueDate' | 'priority' | 'createdAt';
  sortOrder: 'asc' | 'desc';
  
  // Computed
  filteredTasks: () => Task[];
  tasksByProject: (projectId: string) => Task[];
  overdueTasks: () => Task[];
  
  // Actions
  createTask: (input: CreateTaskInput) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  completeTask: (id: string) => Promise<void>;
  
  // Batch operations
  batchUpdate: (updates: Array<{ id: string; changes: Partial<Task> }>) => Promise<void>;
  
  // Filters
  setFilters: (filters: TaskFilters) => void;
  setSorting: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  
  // Sync
  syncTasks: () => Promise<void>;
}

export const useTaskStore = create<TaskStore>()(
  devtools(
    immer((set, get) => ({
      // Base store implementation
      ...createStore<Task>('tasks'),
      
      // Additional state
      filters: {},
      sortBy: 'dueDate',
      sortOrder: 'asc',
      
      // Computed
      filteredTasks: () => {
        const state = get();
        let tasks = Array.from(state.data.values());
        
        // Apply filters
        if (state.filters.status) {
          tasks = tasks.filter(t => t.status === state.filters.status);
        }
        if (state.filters.projectId) {
          tasks = tasks.filter(t => t.projectId === state.filters.projectId);
        }
        if (state.filters.search) {
          const search = state.filters.search.toLowerCase();
          tasks = tasks.filter(t => 
            t.title.toLowerCase().includes(search) ||
            t.description?.toLowerCase().includes(search)
          );
        }
        
        // Apply sorting
        tasks.sort((a, b) => {
          const aVal = a[state.sortBy];
          const bVal = b[state.sortBy];
          const order = state.sortOrder === 'asc' ? 1 : -1;
          return aVal > bVal ? order : -order;
        });
        
        return tasks;
      },
      
      tasksByProject: (projectId) => {
        return Array.from(get().data.values())
          .filter(task => task.projectId === projectId);
      },
      
      overdueTasks: () => {
        const now = new Date();
        return Array.from(get().data.values())
          .filter(task => 
            task.dueDate && 
            new Date(task.dueDate) < now && 
            task.status !== 'completed'
          );
      },
      
      // Actions
      createTask: async (input) => {
        const tempId = `temp-${Date.now()}`;
        const optimisticTask: Task = {
          id: tempId,
          ...input,
          status: 'pending',
          priority: input.priority || 3,
          tags: input.tags || [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        // Optimistic update
        set((state) => {
          state.data.set(tempId, optimisticTask);
        });
        
        try {
          const { data } = await api.createTask(input);
          
          // Replace temp with real data
          set((state) => {
            state.data.delete(tempId);
            state.data.set(data.id, data);
          });
          
          // Emit event for other stores
          eventEmitter.emit('task:created', data);
        } catch (error) {
          // Rollback
          set((state) => {
            state.data.delete(tempId);
            state.errors.set('create', error);
          });
          throw error;
        }
      },
      
      updateTask: async (id, updates) => {
        const original = get().data.get(id);
        if (!original) throw new Error('Task not found');
        
        // Optimistic update
        set((state) => {
          const task = state.data.get(id);
          if (task) {
            Object.assign(task, updates);
            task.updatedAt = new Date();
          }
        });
        
        try {
          const { data } = await api.updateTask(id, updates);
          
          set((state) => {
            state.data.set(id, data);
          });
          
          eventEmitter.emit('task:updated', data);
        } catch (error) {
          // Rollback
          set((state) => {
            state.data.set(id, original);
            state.errors.set(id, error);
          });
          throw error;
        }
      },
      
      // ... other actions
    })),
    {
      name: 'task-store',
    }
  )
);
```

### Voice Store

```typescript
// stores/voice-store.ts
interface VoiceStore {
  // State
  isRecording: boolean;
  isProcessing: boolean;
  transcription: string;
  confidence: number;
  error: Error | null;
  
  // Audio state
  audioLevel: number;
  recordingDuration: number;
  
  // Context
  context: VoiceContext;
  
  // Actions
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  cancelRecording: () => void;
  processCommand: (audio: Blob) => Promise<VoiceCommandResult>;
  
  // Context management
  updateContext: (context: Partial<VoiceContext>) => void;
  
  // UI helpers
  setAudioLevel: (level: number) => void;
  reset: () => void;
}

export const useVoiceStore = create<VoiceStore>()(
  devtools(
    immer((set, get) => ({
      // State
      isRecording: false,
      isProcessing: false,
      transcription: '',
      confidence: 0,
      error: null,
      audioLevel: 0,
      recordingDuration: 0,
      
      // Context
      context: {
        currentView: 'dashboard',
        currentProjectId: null,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      
      // Actions
      startRecording: async () => {
        set((state) => {
          state.isRecording = true;
          state.error = null;
          state.transcription = '';
        });
        
        try {
          await audioRecorder.start();
          
          // Monitor audio levels
          audioRecorder.onAudioLevel = (level) => {
            get().setAudioLevel(level);
          };
          
          // Track duration
          const startTime = Date.now();
          const durationInterval = setInterval(() => {
            if (!get().isRecording) {
              clearInterval(durationInterval);
              return;
            }
            set((state) => {
              state.recordingDuration = Date.now() - startTime;
            });
          }, 100);
          
        } catch (error) {
          set((state) => {
            state.isRecording = false;
            state.error = error;
          });
          throw error;
        }
      },
      
      stopRecording: async () => {
        if (!get().isRecording) return;
        
        set((state) => {
          state.isRecording = false;
          state.isProcessing = true;
        });
        
        try {
          const audioBlob = await audioRecorder.stop();
          const result = await get().processCommand(audioBlob);
          
          return result;
        } catch (error) {
          set((state) => {
            state.error = error;
          });
          throw error;
        } finally {
          set((state) => {
            state.isProcessing = false;
          });
        }
      },
      
      processCommand: async (audio) => {
        const formData = new FormData();
        formData.append('audio', audio);
        formData.append('context', JSON.stringify(get().context));
        
        const { data } = await api.processVoiceCommand(formData);
        
        set((state) => {
          state.transcription = data.transcription;
          state.confidence = data.confidence;
        });
        
        // Handle the command result
        if (data.action === 'CREATE_TASK') {
          await useTaskStore.getState().createTask(data.result);
        } else if (data.action === 'CREATE_EVENT') {
          await useCalendarStore.getState().createEvent(data.result);
        }
        // ... handle other actions
        
        return data;
      },
      
      // ... other methods
    })),
    {
      name: 'voice-store',
    }
  )
);
```

### UI Store

```typescript
// stores/ui-store.ts
interface UIStore {
  // Navigation
  currentView: string;
  sidebarOpen: boolean;
  
  // Modals
  modals: Map<string, boolean>;
  modalData: Map<string, any>;
  
  // Notifications
  notifications: Notification[];
  
  // Preferences
  theme: 'light' | 'dark' | 'system';
  density: 'compact' | 'normal' | 'comfortable';
  
  // Actions
  navigate: (view: string) => void;
  toggleSidebar: () => void;
  
  // Modals
  openModal: (id: string, data?: any) => void;
  closeModal: (id: string) => void;
  
  // Notifications
  showNotification: (notification: Omit<Notification, 'id'>) => void;
  dismissNotification: (id: string) => void;
  
  // Preferences
  setTheme: (theme: string) => void;
  setDensity: (density: string) => void;
}
```

## Cross-Store Communication

### Event System

```typescript
// utils/event-emitter.ts
class EventEmitter {
  private events: Map<string, Set<Function>> = new Map();
  
  on(event: string, callback: Function) {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.events.get(event)?.delete(callback);
    };
  }
  
  emit(event: string, data?: any) {
    this.events.get(event)?.forEach(callback => {
      callback(data);
    });
  }
}

export const eventEmitter = new EventEmitter();
```

### Store Subscriptions

```typescript
// stores/calendar-store.ts
// Subscribe to task events
eventEmitter.on('task:created', (task) => {
  if (task.dueDate) {
    // Create calendar event for task
    useCalendarStore.getState().createEventFromTask(task);
  }
});

eventEmitter.on('project:deleted', (projectId) => {
  // Remove project filter if active
  const state = useTaskStore.getState();
  if (state.filters.projectId === projectId) {
    state.setFilters({ ...state.filters, projectId: undefined });
  }
});
```

## Persistence

### Local Storage Sync

```typescript
// utils/persist-store.ts
export function persistStore<T extends object>(
  store: StoreApi<T>,
  options: {
    name: string;
    include?: string[];
    exclude?: string[];
  }
) {
  // Load initial state
  const savedState = localStorage.getItem(`lifeos-${options.name}`);
  if (savedState) {
    const parsed = JSON.parse(savedState);
    store.setState(parsed);
  }
  
  // Subscribe to changes
  store.subscribe((state) => {
    const toPersist = options.include
      ? pick(state, options.include)
      : omit(state, options.exclude || []);
      
    localStorage.setItem(
      `lifeos-${options.name}`,
      JSON.stringify(toPersist)
    );
  });
}

// Usage
persistStore(useUIStore, {
  name: 'ui',
  include: ['theme', 'density', 'sidebarOpen']
});
```

### Offline Queue

```typescript
// stores/sync-store.ts
interface SyncStore {
  queue: SyncOperation[];
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncAt: Date | null;
  
  // Actions
  addToQueue: (operation: SyncOperation) => void;
  processQueue: () => Promise<void>;
  setOnlineStatus: (online: boolean) => void;
}

interface SyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'task' | 'event' | 'transaction';
  data: any;
  timestamp: Date;
  retries: number;
}
```

## Custom Hooks

### useTask Hook

```typescript
// hooks/use-task.ts
export function useTask(taskId: string) {
  const task = useTaskStore((state) => state.data.get(taskId));
  const loading = useTaskStore((state) => state.loading.has(taskId));
  const error = useTaskStore((state) => state.errors.get(taskId));
  
  const updateTask = useCallback(
    (updates: Partial<Task>) => {
      return useTaskStore.getState().updateTask(taskId, updates);
    },
    [taskId]
  );
  
  const deleteTask = useCallback(() => {
    return useTaskStore.getState().deleteTask(taskId);
  }, [taskId]);
  
  return {
    task,
    loading,
    error,
    updateTask,
    deleteTask,
  };
}
```

### useVoiceCommand Hook

```typescript
// hooks/use-voice-command.ts
export function useVoiceCommand() {
  const { 
    isRecording, 
    isProcessing, 
    transcription,
    error 
  } = useVoiceStore();
  
  const startRecording = useCallback(async () => {
    try {
      await useVoiceStore.getState().startRecording();
    } catch (error) {
      console.error('Failed to start recording:', error);
      // Show notification
      useUIStore.getState().showNotification({
        type: 'error',
        message: 'Failed to start voice recording',
      });
    }
  }, []);
  
  const stopRecording = useCallback(async () => {
    try {
      const result = await useVoiceStore.getState().stopRecording();
      
      // Show success notification
      useUIStore.getState().showNotification({
        type: 'success',
        message: `Command processed: ${result.action}`,
      });
      
      return result;
    } catch (error) {
      console.error('Failed to process voice command:', error);
      useUIStore.getState().showNotification({
        type: 'error',
        message: 'Failed to process voice command',
      });
    }
  }, []);
  
  return {
    isRecording,
    isProcessing,
    transcription,
    error,
    startRecording,
    stopRecording,
  };
}
```

## Performance Optimization

### Selective Subscriptions

```typescript
// Only subscribe to specific parts of store
const projectTasks = useTaskStore(
  (state) => state.tasksByProject(projectId),
  // Custom equality function
  shallow
);

// Memoized selectors
const selectOverdueTasks = (state: TaskStore) => 
  state.filteredTasks().filter(task => 
    task.dueDate && new Date(task.dueDate) < new Date()
  );

const overdueTasks = useTaskStore(selectOverdueTasks);
```

### Batched Updates

```typescript
// Batch multiple state updates
const batchedUpdate = unstable_batchedUpdates(() => {
  useTaskStore.getState().updateTask(id1, updates1);
  useTaskStore.getState().updateTask(id2, updates2);
  useUIStore.getState().showNotification({ message: 'Tasks updated' });
});
```

## Testing Stores

```typescript
// stores/__tests__/task-store.test.ts
describe('TaskStore', () => {
  beforeEach(() => {
    useTaskStore.getState().reset();
  });
  
  it('should create task optimistically', async () => {
    const createSpy = vi.spyOn(api, 'createTask').mockResolvedValue({
      data: { id: 'real-id', title: 'Test Task' }
    });
    
    const promise = useTaskStore.getState().createTask({
      title: 'Test Task'
    });
    
    // Check optimistic update
    const tasks = Array.from(useTaskStore.getState().data.values());
    expect(tasks).toHaveLength(1);
    expect(tasks[0].id).toMatch(/^temp-/);
    
    await promise;
    
    // Check final state
    const finalTasks = Array.from(useTaskStore.getState().data.values());
    expect(finalTasks).toHaveLength(1);
    expect(finalTasks[0].id).toBe('real-id');
  });
});
```