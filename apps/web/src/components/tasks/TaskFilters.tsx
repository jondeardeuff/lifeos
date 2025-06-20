import React, { useState } from 'react';
import { TaskStatus, TaskPriority, User } from '@lifeos/types';
import { Card, CardContent, CardHeader, CardTitle, Button, Input } from '@lifeos/ui';
import { TaskFilters as TaskFiltersType } from './TaskList';

interface TaskFiltersProps {
  filters: TaskFiltersType;
  onChange: (filters: TaskFiltersType) => void;
  users: User[];
  availableTags: string[];
  className?: string;
}

const TaskFilters: React.FC<TaskFiltersProps> = ({
  filters,
  onChange,
  users,
  availableTags,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleStatusChange = (status: TaskStatus, checked: boolean) => {
    const newStatus = checked
      ? [...filters.status, status]
      : filters.status.filter(s => s !== status);
    
    onChange({ ...filters, status: newStatus });
  };

  const handlePriorityChange = (priority: TaskPriority, checked: boolean) => {
    const newPriority = checked
      ? [...filters.priority, priority]
      : filters.priority.filter(p => p !== priority);
    
    onChange({ ...filters, priority: newPriority });
  };

  const handleAssigneeChange = (assigneeId: string, checked: boolean) => {
    const newAssigneeIds = checked
      ? [...filters.assigneeIds, assigneeId]
      : filters.assigneeIds.filter(id => id !== assigneeId);
    
    onChange({ ...filters, assigneeIds: newAssigneeIds });
  };

  const handleTagChange = (tag: string, checked: boolean) => {
    const newTags = checked
      ? [...filters.tags, tag]
      : filters.tags.filter(t => t !== tag);
    
    onChange({ ...filters, tags: newTags });
  };

  const handleSearchChange = (searchQuery: string) => {
    onChange({ ...filters, searchQuery });
  };

  const handleDueDateRangeChange = (field: 'start' | 'end', value: string) => {
    const date = value ? new Date(value) : undefined;
    onChange({
      ...filters,
      dueDateRange: {
        ...filters.dueDateRange,
        [field]: date,
      },
    });
  };

  const clearAllFilters = () => {
    onChange({
      status: [],
      priority: [],
      assigneeIds: [],
      tags: [],
      dueDateRange: {},
      searchQuery: '',
    });
  };

  const hasActiveFilters = 
    filters.status.length > 0 ||
    filters.priority.length > 0 ||
    filters.assigneeIds.length > 0 ||
    filters.tags.length > 0 ||
    filters.dueDateRange.start ||
    filters.dueDateRange.end ||
    filters.searchQuery.trim() !== '';

  const getStatusLabel = (status: TaskStatus) => {
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

  const getPriorityLabel = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.HIGH:
        return 'High';
      case TaskPriority.MEDIUM_HIGH:
        return 'Medium High';
      case TaskPriority.MEDIUM:
        return 'Medium';
      case TaskPriority.MEDIUM_LOW:
        return 'Medium Low';
      case TaskPriority.LOW:
        return 'Low';
      default:
        return `Priority ${priority}`;
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Filters</CardTitle>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="text-sm"
              >
                Clear All
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Search */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search
          </label>
          <Input
            placeholder="Search tasks..."
            value={filters.searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full"
          />
        </div>

        {/* Quick Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => handleStatusChange(TaskStatus.PENDING, !filters.status.includes(TaskStatus.PENDING))}
            className={`px-3 py-1 text-sm rounded-full border transition-colors ${
              filters.status.includes(TaskStatus.PENDING)
                ? 'bg-blue-100 text-blue-800 border-blue-200'
                : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
            }`}
          >
            To Do
          </button>
          <button
            onClick={() => handleStatusChange(TaskStatus.IN_PROGRESS, !filters.status.includes(TaskStatus.IN_PROGRESS))}
            className={`px-3 py-1 text-sm rounded-full border transition-colors ${
              filters.status.includes(TaskStatus.IN_PROGRESS)
                ? 'bg-blue-100 text-blue-800 border-blue-200'
                : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
            }`}
          >
            In Progress
          </button>
          <button
            onClick={() => handlePriorityChange(TaskPriority.HIGH, !filters.priority.includes(TaskPriority.HIGH))}
            className={`px-3 py-1 text-sm rounded-full border transition-colors ${
              filters.priority.includes(TaskPriority.HIGH)
                ? 'bg-red-100 text-red-800 border-red-200'
                : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
            }`}
          >
            High Priority
          </button>
        </div>

        {/* Expanded Filters */}
        {isExpanded && (
          <div className="space-y-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <div className="space-y-2">
                {Object.values(TaskStatus).map(status => (
                  <label key={status} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.status.includes(status)}
                      onChange={(e) => handleStatusChange(status, e.target.checked)}
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">
                      {getStatusLabel(status)}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Priority Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <div className="space-y-2">
                {Object.values(TaskPriority)
                  .filter(priority => typeof priority === 'number')
                  .sort((a, b) => (b as number) - (a as number))
                  .map(priority => (
                    <label key={priority} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.priority.includes(priority as TaskPriority)}
                        onChange={(e) => handlePriorityChange(priority as TaskPriority, e.target.checked)}
                        className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700">
                        {getPriorityLabel(priority as TaskPriority)}
                      </span>
                    </label>
                  ))}
              </div>
            </div>

            {/* Assignee Filter */}
            {users.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assignee
                </label>
                <div className="space-y-2">
                  {users.map(user => (
                    <label key={user.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.assigneeIds.includes(user.id)}
                        onChange={(e) => handleAssigneeChange(user.id, e.target.checked)}
                        className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <div className="flex items-center gap-2">
                        {user.avatarUrl && (
                          <img
                            src={user.avatarUrl}
                            alt={user.fullName}
                            className="w-5 h-5 rounded-full"
                          />
                        )}
                        <span className="text-sm text-gray-700">
                          {user.fullName}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Tags Filter */}
            {availableTags.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => handleTagChange(tag, !filters.tags.includes(tag))}
                      className={`px-2 py-1 text-xs rounded-md border transition-colors ${
                        filters.tags.includes(tag)
                          ? 'bg-blue-100 text-blue-800 border-blue-200'
                          : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                      }`}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Due Date Range Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Due Date Range
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">From</label>
                  <Input
                    type="date"
                    value={filters.dueDateRange.start ? filters.dueDateRange.start.toISOString().split('T')[0] : ''}
                    onChange={(e) => handleDueDateRangeChange('start', e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">To</label>
                  <Input
                    type="date"
                    value={filters.dueDateRange.end ? filters.dueDateRange.end.toISOString().split('T')[0] : ''}
                    onChange={(e) => handleDueDateRangeChange('end', e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <div className="mt-4 pt-4 border-t">
            <div className="text-sm text-gray-600 mb-2">Active filters:</div>
            <div className="flex flex-wrap gap-1">
              {filters.status.map(status => (
                <span key={status} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-md">
                  {getStatusLabel(status)}
                </span>
              ))}
              {filters.priority.map(priority => (
                <span key={priority} className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-md">
                  {getPriorityLabel(priority)}
                </span>
              ))}
              {filters.assigneeIds.map(assigneeId => {
                const user = users.find(u => u.id === assigneeId);
                return (
                  <span key={assigneeId} className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-md">
                    {user?.fullName || 'Unknown User'}
                  </span>
                );
              })}
              {filters.tags.map(tag => (
                <span key={tag} className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-md">
                  #{tag}
                </span>
              ))}
              {filters.searchQuery && (
                <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-md">
                  Search: "{filters.searchQuery}"
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TaskFilters;