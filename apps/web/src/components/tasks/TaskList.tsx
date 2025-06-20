import React, { useState, useMemo } from 'react';
import { Task, TaskStatus, TaskPriority, User } from '@lifeos/types';
import TaskCard from './TaskCard';
import TaskFilters from './TaskFilters';
import TaskSorting from './TaskSorting';
import { Card, CardContent, CardHeader, CardTitle } from '@lifeos/ui';

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

interface TaskListProps {
  tasks: Task[];
  users?: User[];
  loading?: boolean;
  error?: string;
  onTaskClick?: (task: Task) => void;
  onTaskStatusChange?: (task: Task, status: TaskStatus) => void;
  onCreateTask?: () => void;
  className?: string;
}

const TaskList: React.FC<TaskListProps> = ({
  tasks,
  users = [],
  loading = false,
  error,
  onTaskClick,
  onTaskStatusChange,
  onCreateTask,
  className = '',
}) => {
  const [filters, setFilters] = useState<TaskFilters>({
    status: [],
    priority: [],
    assigneeIds: [],
    tags: [],
    dueDateRange: {},
    searchQuery: '',
  });

  const [sortOption, setSortOption] = useState<TaskSortOption>({
    field: 'dueDate',
    direction: 'asc',
  });

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Create a lookup map for users
  const userMap = useMemo(() => {
    return users.reduce((map, user) => {
      map[user.id] = user;
      return map;
    }, {} as Record<string, User>);
  }, [users]);

  // Filter and sort tasks
  const filteredAndSortedTasks = useMemo(() => {
    let filtered = tasks.filter(task => {
      // Search query filter
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const searchableText = [
          task.title,
          task.description || '',
          ...task.tags,
        ].join(' ').toLowerCase();
        
        if (!searchableText.includes(query)) {
          return false;
        }
      }

      // Status filter
      if (filters.status.length > 0 && !filters.status.includes(task.status)) {
        return false;
      }

      // Priority filter
      if (filters.priority.length > 0 && !filters.priority.includes(task.priority)) {
        return false;
      }

      // Assignee filter
      if (filters.assigneeIds.length > 0) {
        if (!task.assigneeId || !filters.assigneeIds.includes(task.assigneeId)) {
          return false;
        }
      }

      // Tags filter
      if (filters.tags.length > 0) {
        const hasMatchingTag = filters.tags.some(filterTag => 
          task.tags.some(taskTag => taskTag.toLowerCase().includes(filterTag.toLowerCase()))
        );
        if (!hasMatchingTag) {
          return false;
        }
      }

      // Due date range filter
      if (filters.dueDateRange.start || filters.dueDateRange.end) {
        if (!task.dueDate) return false;
        
        const dueDate = new Date(task.dueDate);
        
        if (filters.dueDateRange.start && dueDate < filters.dueDateRange.start) {
          return false;
        }
        
        if (filters.dueDateRange.end && dueDate > filters.dueDateRange.end) {
          return false;
        }
      }

      return true;
    });

    // Sort tasks
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortOption.field) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'dueDate':
          aValue = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          bValue = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          break;
        case 'priority':
          aValue = a.priority;
          bValue = b.priority;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'updatedAt':
          aValue = new Date(a.updatedAt).getTime();
          bValue = new Date(b.updatedAt).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) {
        return sortOption.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortOption.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return filtered;
  }, [tasks, filters, sortOption]);

  // Group tasks by status for better organization
  const groupedTasks = useMemo(() => {
    return filteredAndSortedTasks.reduce((groups, task) => {
      const status = task.status;
      if (!groups[status]) {
        groups[status] = [];
      }
      groups[status].push(task);
      return groups;
    }, {} as Record<TaskStatus, Task[]>);
  }, [filteredAndSortedTasks]);

  const getStatusDisplayName = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.PENDING:
        return 'To Do';
      case TaskStatus.IN_PROGRESS:
        return 'In Progress';
      case TaskStatus.COMPLETED:
        return 'Completed';
      case TaskStatus.CANCELLED:
        return 'Cancelled';
      default:
        return status;
    }
  };

  const getStatusCount = (status: TaskStatus) => {
    return groupedTasks[status]?.length || 0;
  };

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="h-8 bg-gray-200 rounded w-32 animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded w-24 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-full mt-2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className={`border-red-200 ${className}`}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center text-red-600">
            <svg className="w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Tasks</h2>
          <p className="text-gray-600 mt-1">
            {filteredAndSortedTasks.length} of {tasks.length} tasks
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center border rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
          </div>

          {/* Create Task Button */}
          {onCreateTask && (
            <button
              onClick={onCreateTask}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Task
            </button>
          )}
        </div>
      </div>

      {/* Filters and Sorting */}
      <div className="flex flex-col lg:flex-row gap-4">
        <TaskFilters
          filters={filters}
          onChange={setFilters}
          users={users}
          availableTags={[...new Set(tasks.flatMap(task => task.tags))]}
        />
        <TaskSorting
          sortOption={sortOption}
          onChange={setSortOption}
        />
      </div>

      {/* Tasks Display */}
      {filteredAndSortedTasks.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
              <p className="text-gray-500 mb-4">
                {tasks.length === 0 
                  ? "Get started by creating your first task."
                  : "Try adjusting your filters to see more tasks."
                }
              </p>
              {onCreateTask && (
                <button
                  onClick={onCreateTask}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Task
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedTasks).map(([status, statusTasks]) => (
            <div key={status}>
              <div className="flex items-center gap-3 mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {getStatusDisplayName(status as TaskStatus)}
                </h3>
                <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-sm">
                  {getStatusCount(status as TaskStatus)}
                </span>
              </div>
              
              <div className={
                viewMode === 'grid' 
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                  : "space-y-3"
              }>
                {statusTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    assignee={task.assigneeId ? userMap[task.assigneeId] : undefined}
                    onClick={onTaskClick}
                    onStatusChange={onTaskStatusChange}
                    className={viewMode === 'list' ? 'max-w-none' : ''}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TaskList;