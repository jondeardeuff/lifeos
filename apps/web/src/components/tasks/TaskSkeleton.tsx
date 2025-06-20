import React from 'react';
import { Card, CardContent, CardHeader, CardFooter } from '@lifeos/ui';

interface TaskSkeletonProps {
  count?: number;
  className?: string;
}

const TaskSkeleton: React.FC<TaskSkeletonProps> = ({ 
  count = 1, 
  className = '' 
}) => {
  return (
    <>
      {[...Array(count)].map((_, index) => (
        <Card key={index} className={`animate-pulse ${className}`}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {/* Title */}
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                {/* Description */}
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                {/* Priority badge */}
                <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                {/* Status badge */}
                <div className="h-6 bg-gray-200 rounded-full w-20"></div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            {/* Tags */}
            <div className="flex flex-wrap gap-1 mb-3">
              <div className="h-5 bg-gray-200 rounded w-12"></div>
              <div className="h-5 bg-gray-200 rounded w-16"></div>
              <div className="h-5 bg-gray-200 rounded w-14"></div>
            </div>

            {/* Due Date */}
            <div className="flex items-center gap-2 mb-2">
              <div className="w-4 h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-24"></div>
            </div>

            {/* Assignee */}
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-200 rounded"></div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gray-200 rounded-full"></div>
                <div className="h-4 bg-gray-200 rounded w-20"></div>
              </div>
            </div>
          </CardContent>

          <CardFooter className="pt-0">
            <div className="flex items-center justify-between w-full">
              <div className="h-3 bg-gray-200 rounded w-28"></div>
              <div className="flex items-center gap-1">
                <div className="w-6 h-6 bg-gray-200 rounded"></div>
                <div className="w-6 h-6 bg-gray-200 rounded"></div>
              </div>
            </div>
          </CardFooter>
        </Card>
      ))}
    </>
  );
};

interface TaskListSkeletonProps {
  className?: string;
}

const TaskListSkeleton: React.FC<TaskListSkeletonProps> = ({ 
  className = ''
}) => {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 bg-gray-200 rounded w-32 mb-2 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center border rounded-lg p-1">
            <div className="w-8 h-8 bg-gray-200 rounded-md animate-pulse"></div>
            <div className="w-8 h-8 bg-gray-200 rounded-md animate-pulse ml-1"></div>
          </div>

          {/* Create Task Button */}
          <div className="h-10 bg-gray-200 rounded-lg w-28 animate-pulse"></div>
        </div>
      </div>

      {/* Filters and Sorting */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <Card className="animate-pulse">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="h-5 bg-gray-200 rounded w-16"></div>
                <div className="h-8 bg-gray-200 rounded w-20"></div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="h-10 bg-gray-200 rounded w-full"></div>
                <div className="flex flex-wrap gap-2">
                  <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                  <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                  <div className="h-6 bg-gray-200 rounded-full w-24"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="w-full lg:w-80">
          <Card className="animate-pulse">
            <CardHeader className="pb-3">
              <div className="h-5 bg-gray-200 rounded w-12"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-8 bg-gray-200 rounded"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                </div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Task Groups */}
      <div className="space-y-6">
        {/* Group 1 */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-6 bg-gray-200 rounded w-20 animate-pulse"></div>
            <div className="h-6 bg-gray-200 rounded-full w-8 animate-pulse"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <TaskSkeleton count={3} />
          </div>
        </div>

        {/* Group 2 */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-6 bg-gray-200 rounded w-24 animate-pulse"></div>
            <div className="h-6 bg-gray-200 rounded-full w-8 animate-pulse"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <TaskSkeleton count={2} />
          </div>
        </div>
      </div>
    </div>
  );
};

interface TaskModalSkeletonProps {
  className?: string;
}

const TaskModalSkeleton: React.FC<TaskModalSkeletonProps> = ({ 
  className = '' 
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-pulse ${className}`}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="h-7 bg-gray-200 rounded w-3/4 mb-3"></div>
              <div className="flex items-center gap-3">
                <div className="h-5 bg-gray-200 rounded-full w-16"></div>
                <div className="h-5 bg-gray-200 rounded-full w-20"></div>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <div className="h-8 bg-gray-200 rounded w-12"></div>
              <div className="w-8 h-8 bg-gray-200 rounded"></div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Description */}
              <div>
                <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                <div className="h-32 bg-gray-200 rounded"></div>
              </div>

              {/* Tags */}
              <div>
                <div className="h-4 bg-gray-200 rounded w-12 mb-2"></div>
                <div className="flex flex-wrap gap-2">
                  <div className="h-6 bg-gray-200 rounded w-16"></div>
                  <div className="h-6 bg-gray-200 rounded w-20"></div>
                  <div className="h-6 bg-gray-200 rounded w-14"></div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <div>
                <div className="h-4 bg-gray-200 rounded w-16 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </div>
              
              <div>
                <div className="h-4 bg-gray-200 rounded w-14 mb-2"></div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                  <div className="h-4 bg-gray-200 rounded w-28"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-6 border-t">
            <div className="h-10 bg-gray-200 rounded w-24"></div>
            <div className="flex items-center gap-3">
              <div className="h-10 bg-gray-200 rounded w-16"></div>
              <div className="h-10 bg-gray-200 rounded w-20"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export { TaskSkeleton, TaskListSkeleton, TaskModalSkeleton };