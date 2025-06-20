import { Task, TaskStatus, TaskPriority, User, CreateTaskInput, UpdateTaskInput } from '@lifeos/types';

// Re-export existing types for convenience
export type {
  Task,
  TaskStatus,
  TaskPriority,
  User,
  CreateTaskInput,
  UpdateTaskInput,
};

// Component-specific interfaces
export interface TaskCardProps {
  task: Task;
  assignee?: User;
  onClick?: (task: Task) => void;
  onStatusChange?: (task: Task, status: TaskStatus) => void;
  className?: string;
}

export interface TaskFilters {
  status: TaskStatus[];
  priority: TaskPriority[];
  assigneeIds: string[];
  tags: string[];
  dueDateRange: {
    start?: Date;
    end?: Date;
  };
  searchQuery: string;
}

export interface TaskSortOption {
  field: 'title' | 'dueDate' | 'priority' | 'status' | 'createdAt' | 'updatedAt';
  direction: 'asc' | 'desc';
}

export interface TaskListProps {
  tasks: Task[];
  users?: User[];
  loading?: boolean;
  error?: string;
  onTaskClick?: (task: Task) => void;
  onTaskStatusChange?: (task: Task, status: TaskStatus) => void;
  onCreateTask?: () => void;
  className?: string;
}

export interface TaskFiltersProps {
  filters: TaskFilters;
  onChange: (filters: TaskFilters) => void;
  users: User[];
  availableTags: string[];
  className?: string;
}

export interface TaskSortingProps {
  sortOption: TaskSortOption;
  onChange: (sortOption: TaskSortOption) => void;
  className?: string;
}

export interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (task: CreateTaskInput) => Promise<void>;
  users?: User[];
  loading?: boolean;
  error?: string;
  className?: string;
}

export interface TaskDetailModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (taskId: string, updates: UpdateTaskInput) => Promise<void>;
  onDelete?: (taskId: string) => Promise<void>;
  users?: User[];
  loading?: boolean;
  error?: string;
  className?: string;
}

// Utility types for task operations
export interface TaskOperationResult {
  success: boolean;
  error?: string;
  data?: Task;
}

export interface TaskListState {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  filters: TaskFilters;
  sortOption: TaskSortOption;
  selectedTask: Task | null;
}

export interface TaskFormData {
  title: string;
  description?: string;
  priority: TaskPriority;
  status?: TaskStatus;
  dueDate?: Date;
  assigneeId?: string;
  tags: string[];
}

export interface TaskFormErrors {
  title?: string;
  description?: string;
  dueDate?: string;
  tags?: string;
  general?: string;
}

// Hook return types
export interface UseTasksReturn {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  createTask: (input: CreateTaskInput) => Promise<TaskOperationResult>;
  updateTask: (id: string, input: UpdateTaskInput) => Promise<TaskOperationResult>;
  deleteTask: (id: string) => Promise<TaskOperationResult>;
  refreshTasks: () => Promise<void>;
}

export interface UseTaskFiltersReturn {
  filters: TaskFilters;
  setFilters: (filters: TaskFilters) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
}

export interface UseTaskSortingReturn {
  sortOption: TaskSortOption;
  setSortOption: (option: TaskSortOption) => void;
  sortTasks: (tasks: Task[]) => Task[];
}

// Event handler types
export type TaskClickHandler = (task: Task) => void;
export type TaskStatusChangeHandler = (task: Task, status: TaskStatus) => void;
export type TaskSubmitHandler = (input: CreateTaskInput) => Promise<void>;
export type TaskUpdateHandler = (id: string, input: UpdateTaskInput) => Promise<void>;
export type TaskDeleteHandler = (id: string) => Promise<void>;

// Filter and search utility types
export interface TaskSearchOptions {
  query: string;
  includeDescription: boolean;
  includeTags: boolean;
  caseSensitive: boolean;
}

export interface TaskGroupingOptions {
  groupBy: 'status' | 'priority' | 'assignee' | 'dueDate' | 'none';
  sortGroups: boolean;
}

export interface TaskViewOptions {
  viewMode: 'grid' | 'list' | 'kanban';
  itemsPerPage: number;
  showCompleted: boolean;
  showDeleted: boolean;
}

// API response types
export interface TaskListResponse {
  tasks: Task[];
  total: number;
  hasMore: boolean;
  nextCursor?: string;
}

export interface TaskMutationResponse {
  task?: Task;
  error?: {
    code: string;
    message: string;
    field?: string;
  };
}

// Component state management types
export interface TaskModalState {
  createModal: {
    isOpen: boolean;
    loading: boolean;
    error?: string;
  };
  detailModal: {
    isOpen: boolean;
    task: Task | null;
    loading: boolean;
    error?: string;
  };
}

export interface TaskActionMenuProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onDuplicate?: (task: Task) => void;
  onAssign?: (task: Task) => void;
  className?: string;
}

// Validation types
export interface TaskValidationRules {
  title: {
    required: boolean;
    minLength: number;
    maxLength: number;
  };
  description: {
    maxLength: number;
  };
  tags: {
    maxCount: number;
    maxLength: number;
  };
  dueDate: {
    allowPast: boolean;
  };
}

// Performance optimization types
export interface TaskListVirtualizationOptions {
  enabled: boolean;
  itemHeight: number;
  overscan: number;
}

export interface TaskCacheOptions {
  ttl: number; // Time to live in milliseconds
  maxSize: number; // Maximum number of cached items
  staleWhileRevalidate: boolean;
}