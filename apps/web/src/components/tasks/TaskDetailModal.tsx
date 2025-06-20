import React, { useState, useRef, useEffect } from 'react';
import { Task, UpdateTaskInput, TaskStatus, TaskPriority, User } from '@lifeos/types';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label } from '@lifeos/ui';
import { formatDistanceToNow, format } from 'date-fns';

interface TaskDetailModalProps {
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

interface FormErrors {
  title?: string;
  description?: string;
  dueDate?: string;
  tags?: string;
  general?: string;
}

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  users = [],
  loading = false,
  error,
  className = '',
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<UpdateTaskInput>({});
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [tagInput, setTagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);

  // Initialize form data when task changes
  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate,
        assigneeId: task.assigneeId,
        tags: [...task.tags],
      });
    }
  }, [task]);

  // Handle escape key and outside clicks
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (showDeleteConfirm) {
          setShowDeleteConfirm(false);
        } else {
          handleClose();
        }
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        if (!showDeleteConfirm) {
          handleClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, showDeleteConfirm]);

  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!formData.title?.trim()) {
      errors.title = 'Title is required';
    } else if (formData.title.trim().length < 3) {
      errors.title = 'Title must be at least 3 characters long';
    } else if (formData.title.trim().length > 200) {
      errors.title = 'Title must be less than 200 characters';
    }

    if (formData.description && formData.description.length > 1000) {
      errors.description = 'Description must be less than 1000 characters';
    }

    if (formData.dueDate) {
      const dueDate = new Date(formData.dueDate);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      
      if (dueDate < now) {
        errors.dueDate = 'Due date cannot be in the past';
      }
    }

    if (formData.tags && formData.tags.length > 10) {
      errors.tags = 'Maximum 10 tags allowed';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field: keyof UpdateTaskInput, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Clear field error when user starts typing
    if (formErrors[field as keyof FormErrors]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  const handleTagAdd = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !formData.tags?.includes(tag)) {
      const newTags = [...(formData.tags || []), tag];
      handleInputChange('tags', newTags);
      setTagInput('');
    }
  };

  const handleTagRemove = (tagToRemove: string) => {
    const newTags = formData.tags?.filter(tag => tag !== tagToRemove) || [];
    handleInputChange('tags', newTags);
  };

  const handleTagInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTagAdd();
    }
  };

  const handleSave = async () => {
    if (!task || !onUpdate) return;

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setFormErrors({});

    try {
      // Only include changed fields
      const updates: UpdateTaskInput = {};
      
      if (formData.title !== task.title) {
        updates.title = formData.title?.trim();
      }
      if (formData.description !== task.description) {
        updates.description = formData.description?.trim() || undefined;
      }
      if (formData.status !== task.status) {
        updates.status = formData.status;
      }
      if (formData.priority !== task.priority) {
        updates.priority = formData.priority;
      }
      if (formData.dueDate?.getTime() !== task.dueDate?.getTime()) {
        updates.dueDate = formData.dueDate;
      }
      if (formData.assigneeId !== task.assigneeId) {
        updates.assigneeId = formData.assigneeId;
      }
      if (JSON.stringify(formData.tags) !== JSON.stringify(task.tags)) {
        updates.tags = formData.tags?.filter(tag => tag.trim()) || [];
      }

      await onUpdate(task.id, updates);
      setIsEditing(false);
    } catch (err) {
      setFormErrors({
        general: err instanceof Error ? err.message : 'Failed to update task',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!task || !onDelete) return;

    setIsSubmitting(true);
    try {
      await onDelete(task.id);
      handleClose();
    } catch (err) {
      setFormErrors({
        general: err instanceof Error ? err.message : 'Failed to delete task',
      });
    } finally {
      setIsSubmitting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleClose = () => {
    setIsEditing(false);
    setFormErrors({});
    setTagInput('');
    setShowDeleteConfirm(false);
    onClose();
  };

  const handleCancelEdit = () => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate,
        assigneeId: task.assigneeId,
        tags: [...task.tags],
      });
    }
    setFormErrors({});
    setIsEditing(false);
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

  const assignedUser = users.find(user => user.id === task?.assigneeId);

  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card 
        ref={modalRef}
        className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto ${className}`}
      >
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {isEditing ? (
                <div>
                  <Input
                    value={formData.title || ''}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    className={`text-xl font-semibold ${formErrors.title ? 'border-red-300' : ''}`}
                    disabled={isSubmitting}
                  />
                  {formErrors.title && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.title}</p>
                  )}
                </div>
              ) : (
                <CardTitle className="text-xl">{task.title}</CardTitle>
              )}
              
              <div className="flex items-center gap-3 mt-3">
                <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(isEditing ? formData.status || task.status : task.status)}`}>
                  {getStatusLabel(isEditing ? formData.status || task.status : task.status)}
                </span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(isEditing ? formData.priority || task.priority : task.priority)}`}>
                  {getPriorityLabel(isEditing ? formData.priority || task.priority : task.priority)}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2 ml-4">
              {!isEditing && onUpdate && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  disabled={loading}
                >
                  Edit
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* General Error */}
          {(error || formErrors.general) && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-red-700">
                  {error || formErrors.general}
                </span>
              </div>
            </div>
          )}

          {/* Task Details */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Description */}
              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </Label>
                {isEditing ? (
                  <div>
                    <textarea
                      value={formData.description || ''}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="Enter task description..."
                      rows={6}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        formErrors.description ? 'border-red-300' : ''
                      }`}
                      disabled={isSubmitting}
                    />
                    {formErrors.description && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.description}</p>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-md min-h-[120px]">
                    {task.description ? (
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {task.description}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-500 italic">No description provided</p>
                    )}
                  </div>
                )}
              </div>

              {/* Tags */}
              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags
                </Label>
                {isEditing ? (
                  <div>
                    <div className="flex gap-2 mb-2">
                      <Input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyPress={handleTagInputKeyPress}
                        placeholder="Add tags..."
                        className="flex-1"
                        disabled={isSubmitting}
                      />
                      <Button
                        type="button"
                        onClick={handleTagAdd}
                        variant="outline"
                        disabled={!tagInput.trim() || isSubmitting}
                      >
                        Add
                      </Button>
                    </div>
                    
                    {formData.tags && formData.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.tags.map(tag => (
                          <span
                            key={tag}
                            className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-md"
                          >
                            #{tag}
                            <button
                              type="button"
                              onClick={() => handleTagRemove(tag)}
                              className="ml-1 text-blue-600 hover:text-blue-800"
                              disabled={isSubmitting}
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {formErrors.tags && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.tags}</p>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {task.tags.length > 0 ? (
                      task.tags.map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-md"
                        >
                          #{tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-gray-500 italic">No tags</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Status and Priority */}
              {isEditing && (
                <div className="space-y-4">
                  <div>
                    <Label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </Label>
                    <select
                      value={formData.status || task.status}
                      onChange={(e) => handleInputChange('status', e.target.value as TaskStatus)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={isSubmitting}
                    >
                      {Object.values(TaskStatus).map(status => (
                        <option key={status} value={status}>
                          {getStatusLabel(status)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority
                    </Label>
                    <select
                      value={formData.priority || task.priority}
                      onChange={(e) => handleInputChange('priority', Number(e.target.value) as TaskPriority)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={isSubmitting}
                    >
                      {Object.values(TaskPriority)
                        .filter(priority => typeof priority === 'number')
                        .map(priority => (
                          <option key={priority} value={priority}>
                            {getPriorityLabel(priority as TaskPriority)}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Due Date */}
              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date
                </Label>
                {isEditing ? (
                  <div>
                    <Input
                      type="date"
                      value={formData.dueDate ? new Date(formData.dueDate).toISOString().split('T')[0] : ''}
                      onChange={(e) => handleInputChange('dueDate', e.target.value ? new Date(e.target.value) : undefined)}
                      className={`w-full ${formErrors.dueDate ? 'border-red-300' : ''}`}
                      disabled={isSubmitting}
                    />
                    {formErrors.dueDate && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.dueDate}</p>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-gray-700">
                    {task.dueDate ? format(new Date(task.dueDate), 'PPP') : 'No due date'}
                  </div>
                )}
              </div>

              {/* Assignee */}
              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-2">
                  Assignee
                </Label>
                {isEditing ? (
                  <select
                    value={formData.assigneeId || ''}
                    onChange={(e) => handleInputChange('assigneeId', e.target.value || undefined)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={isSubmitting}
                  >
                    <option value="">Unassigned</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.fullName}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div>
                    {assignedUser ? (
                      <div className="flex items-center gap-2">
                        {assignedUser.avatarUrl && (
                          <img
                            src={assignedUser.avatarUrl}
                            alt={assignedUser.fullName}
                            className="w-8 h-8 rounded-full"
                          />
                        )}
                        <span className="text-sm text-gray-700">{assignedUser.fullName}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500 italic">Unassigned</span>
                    )}
                  </div>
                )}
              </div>

              {/* Metadata */}
              <div className="pt-4 border-t">
                <div className="space-y-2 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Created:</span>{' '}
                    {formatDistanceToNow(new Date(task.createdAt))} ago
                  </div>
                  <div>
                    <span className="font-medium">Updated:</span>{' '}
                    {formatDistanceToNow(new Date(task.updatedAt))} ago
                  </div>
                  {task.completedAt && (
                    <div>
                      <span className="font-medium">Completed:</span>{' '}
                      {formatDistanceToNow(new Date(task.completedAt))} ago
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-6 border-t">
            <div>
              {onDelete && !isEditing && (
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={loading || isSubmitting}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  Delete Task
                </Button>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              {isEditing ? (
                <>
                  <Button
                    variant="outline"
                    onClick={handleCancelEdit}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={isSubmitting}
                    className="min-w-[100px]"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Saving...
                      </div>
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  onClick={handleClose}
                >
                  Close
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-60">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-lg text-red-600">Delete Task</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700 mb-4">
                Are you sure you want to delete this task? This action cannot be undone.
              </p>
              <div className="flex items-center justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDelete}
                  disabled={isSubmitting}
                  className="bg-red-600 hover:bg-red-700 text-white min-w-[100px]"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Deleting...
                    </div>
                  ) : (
                    'Delete'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default TaskDetailModal;