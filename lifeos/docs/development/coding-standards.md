# Life OS Coding Standards

## Overview

Comprehensive coding standards ensuring consistency, maintainability, and quality across the Life OS codebase.

## General Principles

1. **Readability First**: Code is read more than written
2. **Consistency**: Follow patterns established in the codebase
3. **Simplicity**: Prefer simple solutions over clever ones
4. **Documentation**: Self-documenting code with helpful comments
5. **Performance**: Optimize when measured, not assumed

## TypeScript Standards

### Type Safety

```typescript
// ✅ DO: Use strict types
interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

// ❌ DON'T: Use any
const processData = (data: any) => { // Avoid any
  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <TaskItem task={tasks[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
};

// ✅ DO: Lazy load heavy components
const HeavyChart = lazy(() => import('./HeavyChart'));

const Dashboard = () => {
  const [showChart, setShowChart] = useState(false);
  
  return (
    <div>
      <button onClick={() => setShowChart(true)}>Show Analytics</button>
      {showChart && (
        <Suspense fallback={<ChartSkeleton />}>
          <HeavyChart />
        </Suspense>
      )}
    </div>
  );
};
```

### API Performance

```typescript
// ✅ DO: Implement pagination
interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

async function getTasks(params: PaginationParams) {
  const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = params;
  
  const offset = (page - 1) * limit;
  
  const [tasks, total] = await Promise.all([
    db.task.findMany({
      skip: offset,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    }),
    db.task.count(),
  ]);
  
  return {
    data: tasks,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ✅ DO: Use database indexes
// In your schema
model Task {
  id          String   @id @default(uuid())
  userId      String
  projectId   String?
  status      String
  createdAt   DateTime @default(now())
  
  @@index([userId, status])
  @@index([projectId])
  @@index([createdAt])
}
```

## Security Standards

### Input Validation

```typescript
// ✅ DO: Validate all inputs
import { z } from 'zod';

const createTaskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  projectId: z.string().uuid().optional(),
  dueDate: z.date().min(new Date()).optional(),
  priority: z.number().int().min(1).max(5).optional(),
});

export async function createTask(input: unknown) {
  // Validate input
  const validated = createTaskSchema.parse(input);
  
  // Sanitize HTML if needed
  const sanitized = {
    ...validated,
    title: sanitizeHtml(validated.title),
    description: validated.description ? sanitizeHtml(validated.description) : undefined,
  };
  
  return taskService.create(sanitized);
}

// ✅ DO: Use parameterized queries
async function getTasksByProject(projectId: string, userId: string) {
  // Safe - uses parameterized query
  return db.task.findMany({
    where: {
      projectId,
      userId,
    },
  });
  
  // ❌ DON'T: String concatenation
  // return db.$queryRaw(`SELECT * FROM tasks WHERE projectId = '${projectId}'`);
}
```

### Authentication & Authorization

```typescript
// ✅ DO: Check permissions at every level
export const taskRouter = Router();

// Middleware for all routes
taskRouter.use(requireAuth);

taskRouter.get('/:id', async (req, res) => {
  const { id } = req.params;
  const userId = req.user!.id;
  
  const task = await taskService.getTask(id);
  
  // Check ownership
  if (task.userId !== userId) {
    return res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'You do not have access to this task',
      },
    });
  }
  
  res.json({ data: task });
});

// ✅ DO: Use secure session management
app.use(session({
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    sameSite: 'lax',
  },
}));
```

## Documentation Standards

### Code Comments

```typescript
// ✅ DO: Document complex logic
/**
 * Parses natural language into structured task data
 * 
 * @param input - Raw voice transcription or text input
 * @param context - Current user context (project, timezone, etc.)
 * @returns Parsed task data or null if parsing fails
 * 
 * @example
 * parseTask("Call John tomorrow at 3pm about project")
 * // Returns: { 
 * //   title: "Call John", 
 * //   dueDate: "2024-01-16T15:00:00Z",
 * //   description: "about project"
 * // }
 */
export function parseTask(
  input: string,
  context: UserContext
): ParsedTask | null {
  // Extract date/time entities first
  const dateEntities = extractDates(input, context.timezone);
  
  // Remove date/time from input for cleaner title extraction
  let cleanedInput = input;
  dateEntities.forEach(entity => {
    cleanedInput = cleanedInput.replace(entity.text, '');
  });
  
  // ... parsing logic
}

// ✅ DO: Document non-obvious code
// Use Fisher-Yates shuffle for unbiased randomization
function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ❌ DON'T: State the obvious
// Set loading to true
setLoading(true);

// Increment counter by 1
counter++;
```

### API Documentation

```typescript
/**
 * @swagger
 * /api/tasks:
 *   post:
 *     summary: Create a new task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTaskInput'
 *     responses:
 *       201:
 *         description: Task created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
```

## Error Handling Standards

### Error Types

```typescript
// ✅ DO: Create specific error classes
export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public code = 'VALIDATION_ERROR'
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(
    resource: string,
    id: string,
    public code = 'NOT_FOUND'
  ) {
    super(`${resource} with id ${id} not found`);
    this.name = 'NotFoundError';
  }
}

export class PermissionError extends Error {
  constructor(
    action: string,
    resource: string,
    public code = 'FORBIDDEN'
  ) {
    super(`You don't have permission to ${action} this ${resource}`);
    this.name = 'PermissionError';
  }
}
```

### Error Handling

```typescript
// ✅ DO: Handle errors at appropriate levels
export async function createTaskHandler(req: Request, res: Response) {
  try {
    const task = await taskService.createTask(req.body);
    res.status(201).json({ data: task });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({
        error: {
          code: error.code,
          message: error.message,
          field: error.field,
        },
      });
    }
    
    if (error instanceof PermissionError) {
      return res.status(403).json({
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }
    
    // Log unexpected errors
    logger.error('Unexpected error in createTask', { error, body: req.body });
    
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
}
```

## Accessibility Standards

### Component Accessibility

```typescript
// ✅ DO: Include proper ARIA attributes
export const VoiceButton: React.FC = () => {
  const { isRecording, startRecording, stopRecording } = useVoiceRecording();
  
  return (
    <button
      onClick={isRecording ? stopRecording : startRecording}
      className={cn(
        "p-4 rounded-full transition-colors",
        isRecording ? "bg-red-500" : "bg-blue-500"
      )}
      aria-label={isRecording ? "Stop recording" : "Start voice recording"}
      aria-pressed={isRecording}
      role="switch"
    >
      <MicrophoneIcon 
        className="w-6 h-6 text-white"
        aria-hidden="true"
      />
      {isRecording && (
        <span className="sr-only">Recording in progress</span>
      )}
    </button>
  );
};

// ✅ DO: Keyboard navigation support
export const TaskList: React.FC<Props> = ({ tasks }) => {
  const [focusedIndex, setFocusedIndex] = useState(0);
  
  const handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((prev) => Math.min(prev + 1, tasks.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        // Handle selection
        break;
    }
  };
  
  return (
    <ul
      role="listbox"
      aria-label="Tasks"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {tasks.map((task, index) => (
        <li
          key={task.id}
          role="option"
          aria-selected={index === focusedIndex}
          tabIndex={index === focusedIndex ? 0 : -1}
        >
          {task.title}
        </li>
      ))}
    </ul>
  );
};
```

## Code Review Checklist

### Before Submitting PR

- [ ] Code follows established patterns
- [ ] All tests pass
- [ ] New tests added for new features
- [ ] No console.logs or debugging code
- [ ] Error cases handled appropriately
- [ ] Documentation updated if needed
- [ ] Accessibility requirements met
- [ ] Performance impact considered
- [ ] Security implications reviewed
- [ ] No hardcoded values or secrets

### Review Focus Areas

1. **Logic Correctness**: Does it do what it should?
2. **Edge Cases**: Are all scenarios handled?
3. **Performance**: Are there any bottlenecks?
4. **Security**: Are inputs validated?
5. **Maintainability**: Will others understand it?
6. **Testing**: Is it properly tested?
7. **Documentation**: Is it well documented?
8. **Consistency**: Does it follow standards? data.someProperty;
};

// ✅ DO: Use unknown with type guards
const processData = (data: unknown) => {
  if (isUser(data)) {
    return data.email;
  }
  throw new Error('Invalid data');
};
```

### Interfaces vs Types

```typescript
// ✅ DO: Use interfaces for objects
interface TaskInput {
  title: string;
  dueDate?: Date;
  projectId?: string;
}

// ✅ DO: Use types for unions, primitives, and utilities
type TaskStatus = 'pending' | 'in_progress' | 'completed';
type TaskId = string;
type Optional<T> = T | null | undefined;
```

### Enums and Constants

```typescript
// ✅ DO: Use const assertions for simple enums
const TaskPriority = {
  LOW: 1,
  MEDIUM: 3,
  HIGH: 5,
} as const;

type TaskPriority = typeof TaskPriority[keyof typeof TaskPriority];

// ✅ DO: Use enums for complex cases with methods
enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense',
  TRANSFER = 'transfer',
}

// ❌ DON'T: Use numeric enums
enum Status {
  Active, // 0
  Inactive, // 1
}
```

### Function Signatures

```typescript
// ✅ DO: Use descriptive parameter names and return types
function calculateProjectProgress(
  completedTasks: number,
  totalTasks: number
): number {
  if (totalTasks === 0) return 0;
  return (completedTasks / totalTasks) * 100;
}

// ✅ DO: Use object parameters for multiple arguments
interface CreateTaskOptions {
  title: string;
  projectId?: string;
  assigneeId?: string;
  dueDate?: Date;
  priority?: number;
}

function createTask(options: CreateTaskOptions): Promise<Task> {
  // Implementation
}

// ❌ DON'T: Use too many positional parameters
function createTask(
  title: string,
  projectId?: string,
  assigneeId?: string,
  dueDate?: Date,
  priority?: number
) {
  // Hard to use and maintain
}
```

## React Standards

### Component Structure

```typescript
// ✅ DO: Consistent component structure
import React, { useState, useEffect, useCallback } from 'react';
import { useTaskStore } from '@/stores/task-store';
import { Button } from '@/components/ui/button';
import type { Task } from '@/types';

interface TaskItemProps {
  task: Task;
  onUpdate: (task: Task) => void;
  onDelete: (id: string) => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onUpdate,
  onDelete,
}) => {
  // State
  const [isEditing, setIsEditing] = useState(false);
  
  // Store hooks
  const updateTask = useTaskStore((state) => state.updateTask);
  
  // Effects
  useEffect(() => {
    // Effect logic
  }, [dependency]);
  
  // Handlers
  const handleEdit = useCallback(() => {
    setIsEditing(true);
  }, []);
  
  const handleSave = useCallback(async (updatedTask: Task) => {
    await updateTask(task.id, updatedTask);
    setIsEditing(false);
    onUpdate(updatedTask);
  }, [task.id, updateTask, onUpdate]);
  
  // Render
  if (isEditing) {
    return <TaskEditor task={task} onSave={handleSave} />;
  }
  
  return (
    <div className="task-item">
      <h3>{task.title}</h3>
      <Button onClick={handleEdit}>Edit</Button>
      <Button onClick={() => onDelete(task.id)}>Delete</Button>
    </div>
  );
};

// Set display name for debugging
TaskItem.displayName = 'TaskItem';
```

### Hooks Rules

```typescript
// ✅ DO: Custom hooks with clear returns
export function useVoiceRecording() {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const startRecording = useCallback(async () => {
    try {
      // Recording logic
      setIsRecording(true);
    } catch (err) {
      setError(err as Error);
    }
  }, []);
  
  const stopRecording = useCallback(async () => {
    // Stop logic
    setIsRecording(false);
  }, []);
  
  return {
    isRecording,
    error,
    startRecording,
    stopRecording,
  };
}

// ❌ DON'T: Hooks with unclear returns
export function useVoice() {
  // Returns array - unclear what each element is
  return [isRecording, startRecording, stopRecording, error];
}
```

### Performance Optimization

```typescript
// ✅ DO: Memoize expensive computations
const TaskList: React.FC<Props> = ({ tasks, filters }) => {
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (filters.status && task.status !== filters.status) return false;
      if (filters.project && task.projectId !== filters.project) return false;
      return true;
    });
  }, [tasks, filters]);
  
  return (
    <>
      {filteredTasks.map(task => (
        <TaskItem key={task.id} task={task} />
      ))}
    </>
  );
};

// ✅ DO: Memoize callbacks passed to children
const ParentComponent = () => {
  const [value, setValue] = useState('');
  
  const handleChange = useCallback((newValue: string) => {
    setValue(newValue);
  }, []);
  
  return <ChildComponent onChange={handleChange} />;
};
```

## State Management Standards

### Store Structure

```typescript
// ✅ DO: Normalized state structure
interface TaskStore {
  // Normalized data
  tasks: Map<string, Task>;
  projects: Map<string, Project>;
  
  // UI state
  selectedTaskId: string | null;
  filters: TaskFilters;
  
  // Loading states
  loading: Set<string>;
  errors: Map<string, Error>;
  
  // Actions
  createTask: (input: CreateTaskInput) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
}

// ❌ DON'T: Nested state structure
interface BadStore {
  projects: {
    id: string;
    tasks: Task[]; // Nested arrays make updates complex
  }[];
}
```

### Action Patterns

```typescript
// ✅ DO: Consistent action patterns
const useTaskStore = create<TaskStore>()((set, get) => ({
  tasks: new Map(),
  
  createTask: async (input) => {
    const tempId = generateTempId();
    
    // Optimistic update
    set((state) => {
      state.tasks.set(tempId, {
        id: tempId,
        ...input,
        status: 'pending',
        createdAt: new Date(),
      });
    });
    
    try {
      const task = await api.createTask(input);
      
      // Replace with real data
      set((state) => {
        state.tasks.delete(tempId);
        state.tasks.set(task.id, task);
      });
    } catch (error) {
      // Rollback
      set((state) => {
        state.tasks.delete(tempId);
        state.errors.set('create', error);
      });
      throw error;
    }
  },
}));
```

## API Design Standards

### GraphQL Schema

```graphql
# ✅ DO: Clear naming and documentation
type Task {
  """Unique identifier for the task"""
  id: ID!
  
  """Task title - what needs to be done"""
  title: String!
  
  """Optional detailed description"""
  description: String
  
  """Current status of the task"""
  status: TaskStatus!
  
  """When the task was created"""
  createdAt: DateTime!
  
  """When the task was last updated"""
  updatedAt: DateTime!
}

# ✅ DO: Use enums for finite sets
enum TaskStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

# ✅ DO: Consistent input types
input CreateTaskInput {
  title: String!
  description: String
  projectId: ID
  assigneeId: ID
  dueDate: DateTime
  priority: Int
}

input UpdateTaskInput {
  title: String
  description: String
  status: TaskStatus
  assigneeId: ID
  dueDate: DateTime
  priority: Int
}
```

### REST Endpoints

```typescript
// ✅ DO: RESTful conventions
router.get('/api/tasks', getTasks);           // List
router.post('/api/tasks', createTask);         // Create
router.get('/api/tasks/:id', getTask);        // Read
router.put('/api/tasks/:id', updateTask);     // Update
router.delete('/api/tasks/:id', deleteTask);  // Delete

// ✅ DO: Consistent error responses
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const response = {
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'Something went wrong',
      ...(isDevelopment && { stack: err.stack }),
    },
    requestId: req.id,
  };
  
  logger.error('API Error', { err, req });
  res.status(status).json(response);
});
```

## Testing Standards

### Test Structure

```typescript
// ✅ DO: Descriptive test structure
describe('TaskService', () => {
  describe('createTask', () => {
    it('should create a task with valid input', async () => {
      // Arrange
      const input = {
        title: 'Test Task',
        projectId: 'project-123',
      };
      
      // Act
      const task = await taskService.createTask(input);
      
      // Assert
      expect(task).toMatchObject({
        title: input.title,
        projectId: input.projectId,
        status: 'pending',
      });
      expect(task.id).toBeDefined();
      expect(task.createdAt).toBeInstanceOf(Date);
    });
    
    it('should throw error for invalid input', async () => {
      // Arrange
      const input = { title: '' };
      
      // Act & Assert
      await expect(taskService.createTask(input))
        .rejects
        .toThrow('Title is required');
    });
  });
});
```

### Mock Data

```typescript
// ✅ DO: Reusable test factories
export const createMockTask = (overrides?: Partial<Task>): Task => ({
  id: generateId(),
  title: 'Mock Task',
  description: null,
  status: 'pending',
  priority: 3,
  projectId: null,
  assigneeId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockUser = (overrides?: Partial<User>): User => ({
  id: generateId(),
  email: 'test@example.com',
  name: 'Test User',
  createdAt: new Date(),
  ...overrides,
});
```

## CSS/Styling Standards

### Tailwind Classes

```typescript
// ✅ DO: Consistent class organization
<div className={cn(
  // Layout
  "flex flex-col gap-4",
  // Sizing
  "w-full max-w-4xl",
  // Spacing
  "p-6",
  // Colors
  "bg-white dark:bg-gray-800",
  // Borders
  "rounded-lg border border-gray-200",
  // Interactive
  "hover:shadow-lg transition-shadow",
  // Conditional
  isActive && "ring-2 ring-blue-500",
  className
)} />

// ❌ DON'T: Random class order
<div className="hover:shadow-lg p-6 flex bg-white w-full rounded-lg dark:bg-gray-800 gap-4 border-gray-200 border flex-col max-w-4xl transition-shadow" />
```

### Component Styling

```typescript
// ✅ DO: Extract complex styles to constants
const styles = {
  container: "flex flex-col gap-4 p-6 bg-white rounded-lg shadow",
  header: "flex items-center justify-between mb-4",
  title: "text-2xl font-bold text-gray-900",
  button: cn(
    "px-4 py-2 rounded-md transition-colors",
    "bg-blue-500 text-white",
    "hover:bg-blue-600 focus:outline-none focus:ring-2"
  ),
};

// ✅ DO: Use CSS variables for themes
const themes = {
  light: {
    '--color-background': '#ffffff',
    '--color-text': '#1a1a1a',
    '--color-primary': '#3b82f6',
  },
  dark: {
    '--color-background': '#1a1a1a',
    '--color-text': '#ffffff',
    '--color-primary': '#60a5fa',
  },
};
```

## Git Standards

### Commit Messages

```bash
# ✅ DO: Conventional commits
feat: add voice command parsing for task creation
fix: resolve timezone issue in calendar sync
refactor: extract task validation into separate module
test: add unit tests for transaction categorization
docs: update API documentation for v2 endpoints
style: format code according to prettier rules
chore: update dependencies to latest versions

# ❌ DON'T: Vague commits
update code
fix bug
WIP
changes
```

### Branch Naming

```bash
# ✅ DO: Descriptive branch names
feature/voice-command-parser
fix/calendar-sync-timezone
refactor/task-validation
docs/api-v2-update
chore/dependency-updates

# ❌ DON'T: Unclear branch names
new-feature
bugfix
johns-branch
temp
```

## Performance Standards

### React Performance

```typescript
// ✅ DO: Virtualize long lists
import { VirtualList } from '@tanstack/react-virtual';

const TaskList = ({ tasks }: { tasks: Task[] }) => {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
  });
  
  return