import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@lifeos/ui';
import { TaskSortOption } from './TaskList';

interface TaskSortingProps {
  sortOption: TaskSortOption;
  onChange: (sortOption: TaskSortOption) => void;
  className?: string;
}

const TaskSorting: React.FC<TaskSortingProps> = ({
  sortOption,
  onChange,
  className = '',
}) => {
  const sortFields = [
    { field: 'dueDate' as const, label: 'Due Date' },
    { field: 'priority' as const, label: 'Priority' },
    { field: 'status' as const, label: 'Status' },
    { field: 'title' as const, label: 'Title' },
    { field: 'createdAt' as const, label: 'Created Date' },
    { field: 'updatedAt' as const, label: 'Updated Date' },
  ];

  const handleFieldChange = (field: TaskSortOption['field']) => {
    onChange({ ...sortOption, field });
  };

  const handleDirectionToggle = () => {
    onChange({
      ...sortOption,
      direction: sortOption.direction === 'asc' ? 'desc' : 'asc',
    });
  };

  const getSortLabel = (field: TaskSortOption['field']) => {
    const fieldData = sortFields.find(f => f.field === field);
    return fieldData?.label || field;
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Sort</CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* Sort Field Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sort by
            </label>
            <div className="grid grid-cols-2 gap-2">
              {sortFields.map(({ field, label }) => (
                <button
                  key={field}
                  onClick={() => handleFieldChange(field)}
                  className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                    sortOption.field === field
                      ? 'bg-blue-100 text-blue-800 border-blue-200'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Sort Direction */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Direction
            </label>
            <button
              onClick={handleDirectionToggle}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors"
            >
              {sortOption.direction === 'asc' ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                  Ascending
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  Descending
                </>
              )}
            </button>
          </div>

          {/* Current Sort Display */}
          <div className="pt-3 border-t">
            <div className="text-sm text-gray-600">
              Currently sorting by{' '}
              <span className="font-medium text-gray-900">
                {getSortLabel(sortOption.field)}
              </span>
              {' '}in{' '}
              <span className="font-medium text-gray-900">
                {sortOption.direction === 'asc' ? 'ascending' : 'descending'}
              </span>
              {' '}order
            </div>
          </div>

          {/* Quick Sort Buttons */}
          <div className="pt-3 border-t">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quick Sort
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onChange({ field: 'dueDate', direction: 'asc' })}
                className={`px-2 py-1 text-xs rounded-md border transition-colors ${
                  sortOption.field === 'dueDate' && sortOption.direction === 'asc'
                    ? 'bg-blue-100 text-blue-800 border-blue-200'
                    : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                }`}
              >
                Due Soon
              </button>
              <button
                onClick={() => onChange({ field: 'priority', direction: 'desc' })}
                className={`px-2 py-1 text-xs rounded-md border transition-colors ${
                  sortOption.field === 'priority' && sortOption.direction === 'desc'
                    ? 'bg-blue-100 text-blue-800 border-blue-200'
                    : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                }`}
              >
                High Priority
              </button>
              <button
                onClick={() => onChange({ field: 'createdAt', direction: 'desc' })}
                className={`px-2 py-1 text-xs rounded-md border transition-colors ${
                  sortOption.field === 'createdAt' && sortOption.direction === 'desc'
                    ? 'bg-blue-100 text-blue-800 border-blue-200'
                    : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                }`}
              >
                Newest
              </button>
              <button
                onClick={() => onChange({ field: 'title', direction: 'asc' })}
                className={`px-2 py-1 text-xs rounded-md border transition-colors ${
                  sortOption.field === 'title' && sortOption.direction === 'asc'
                    ? 'bg-blue-100 text-blue-800 border-blue-200'
                    : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                }`}
              >
                A to Z
              </button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TaskSorting;