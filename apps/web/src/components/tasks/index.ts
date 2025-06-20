// Main components
export { default as TaskCard } from './TaskCard';
export { default as TaskList } from './TaskList';
export { default as TaskFilters } from './TaskFilters';
export { default as TaskSorting } from './TaskSorting';
export { default as CreateTaskModal } from './CreateTaskModal';
export { default as TaskDetailModal } from './TaskDetailModal';

// Loading and skeleton components
export {
  TaskSkeleton,
  TaskListSkeleton,
  TaskModalSkeleton,
} from './TaskSkeleton';

// Error handling components
export {
  TaskError,
  TaskListError,
  TaskNotFound,
  NetworkError,
} from './TaskError';

// Types and interfaces
export type {
  TaskCardProps,
  TaskListProps,
  TaskFiltersProps,
  TaskSortingProps,
  CreateTaskModalProps,
  TaskDetailModalProps,
  TaskFilters,
  TaskSortOption,
  TaskFormData,
  TaskFormErrors,
  TaskOperationResult,
  TaskListState,
  UseTasksReturn,
  UseTaskFiltersReturn,
  UseTaskSortingReturn,
  TaskClickHandler,
  TaskStatusChangeHandler,
  TaskSubmitHandler,
  TaskUpdateHandler,
  TaskDeleteHandler,
  TaskSearchOptions,
  TaskGroupingOptions,
  TaskViewOptions,
  TaskListResponse,
  TaskMutationResponse,
  TaskModalState,
  TaskActionMenuProps,
  TaskValidationRules,
  TaskListVirtualizationOptions,
  TaskCacheOptions,
} from './types';

// Re-export types from @lifeos/types for convenience
export type {
  Task,
  TaskStatus,
  TaskPriority,
  User,
  CreateTaskInput,
  UpdateTaskInput,
} from '@lifeos/types';