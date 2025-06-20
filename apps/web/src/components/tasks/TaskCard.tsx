import React from 'react';
import { Task, TaskStatus, TaskPriority, User } from '@lifeos/types';
import { Card, CardContent, CardFooter, CardHeader } from '@lifeos/ui';
import { formatDistanceToNow, format, isToday, isTomorrow, isYesterday } from 'date-fns';

interface TaskCardProps {
  task: Task;
  assignee?: User;
  onClick?: (task: Task) => void;
  onStatusChange?: (task: Task, status: TaskStatus) => void;
  className?: string;
}

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  assignee,
  onClick,
  onStatusChange,
  className = '',
}) => {
  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.HIGH:
        return 'bg-red-100 text-red-800 border-red-200';
      case TaskPriority.MEDIUM_HIGH:
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case TaskPriority.MEDIUM:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case TaskPriority.MEDIUM_LOW:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case TaskPriority.LOW:
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
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
        return 'Medium';
    }
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.PENDING:
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case TaskStatus.IN_PROGRESS:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case TaskStatus.COMPLETED:
        return 'bg-green-100 text-green-800 border-green-200';
      case TaskStatus.CANCELLED:
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.PENDING:
        return 'Pending';
      case TaskStatus.IN_PROGRESS:
        return 'In Progress';
      case TaskStatus.COMPLETED:
        return 'Completed';
      case TaskStatus.CANCELLED:
        return 'Cancelled';
      default:
        return 'Pending';
    }
  };

  const getDueDateDisplay = (dueDate: Date | undefined) => {
    if (!dueDate) return null;

    const date = new Date(dueDate);
    const now = new Date();

    if (isToday(date)) {
      return { text: 'Today', color: 'text-orange-600' };
    } else if (isTomorrow(date)) {
      return { text: 'Tomorrow', color: 'text-blue-600' };
    } else if (isYesterday(date)) {
      return { text: 'Yesterday', color: 'text-red-600' };
    } else if (date < now) {
      return { text: `Overdue (${formatDistanceToNow(date)} ago)`, color: 'text-red-600' };
    } else {
      return { text: format(date, 'MMM d, yyyy'), color: 'text-gray-600' };
    }
  };

  const handleStatusChange = (e: React.MouseEvent, newStatus: TaskStatus) => {
    e.stopPropagation();
    if (onStatusChange) {
      onStatusChange(task, newStatus);
    }
  };

  const handleCardClick = () => {
    if (onClick) {
      onClick(task);
    }
  };

  const dueDateDisplay = getDueDateDisplay(task.dueDate);

  return (
    <Card 
      className={`cursor-pointer hover:shadow-md transition-shadow duration-200 ${className}`}
      onClick={handleCardClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <h3 className="font-semibold text-lg text-gray-900 line-clamp-2">
            {task.title}
          </h3>
          <div className="flex items-center gap-2 ml-4">
            <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(task.priority)}`}>
              {getPriorityLabel(task.priority)}
            </span>
            <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(task.status)}`}>
              {getStatusLabel(task.status)}
            </span>
          </div>
        </div>
        {task.description && (
          <p className="text-sm text-gray-600 mt-2 line-clamp-3">
            {task.description}
          </p>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        {/* Tags */}
        {task.tags && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {task.tags.map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-md"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Due Date */}
        {dueDateDisplay && (
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className={`text-sm font-medium ${dueDateDisplay.color}`}>
              {dueDateDisplay.text}
            </span>
          </div>
        )}

        {/* Assignee */}
        {assignee && (
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <div className="flex items-center gap-2">
              {assignee.avatarUrl && (
                <img
                  src={assignee.avatarUrl}
                  alt={assignee.fullName}
                  className="w-6 h-6 rounded-full"
                />
              )}
              <span className="text-sm text-gray-600">{assignee.fullName}</span>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-0">
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-gray-500">
            Created {formatDistanceToNow(new Date(task.createdAt))} ago
          </div>
          
          {/* Quick Status Actions */}
          <div className="flex items-center gap-1">
            {task.status !== TaskStatus.COMPLETED && (
              <button
                onClick={(e) => handleStatusChange(e, TaskStatus.COMPLETED)}
                className="p-1 text-green-600 hover:bg-green-50 rounded-md transition-colors"
                title="Mark as completed"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </button>
            )}
            
            {task.status === TaskStatus.PENDING && (
              <button
                onClick={(e) => handleStatusChange(e, TaskStatus.IN_PROGRESS)}
                className="p-1 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                title="Start working"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.5a2.5 2.5 0 002.5-2.5V6a2.5 2.5 0 00-2.5-2.5H9V10z" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </CardFooter>
    </Card>
  );
};

export default TaskCard;