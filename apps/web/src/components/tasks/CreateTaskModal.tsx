import React, { useState, useRef, useEffect } from 'react';
import { CreateTaskInput, TaskPriority, User } from '@lifeos/types';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label } from '@lifeos/ui';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (task: CreateTaskInput) => Promise<void>;
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

const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  users = [],
  loading = false,
  error,
  className = '',
}) => {
  const [formData, setFormData] = useState<CreateTaskInput>({
    title: '',
    description: '',
    priority: TaskPriority.MEDIUM,
    tags: [],
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [tagInput, setTagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const modalRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Focus title input when modal opens
  useEffect(() => {
    if (isOpen && titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, [isOpen]);

  // Handle escape key and outside clicks
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
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
  }, [isOpen, onClose]);

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

  const handleInputChange = (field: keyof CreateTaskInput, value: any) => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setFormErrors({});

    try {
      // Clean up form data
      const cleanedData: CreateTaskInput = {
        ...formData,
        title: formData.title?.trim() || '',
        description: formData.description?.trim() || undefined,
        tags: formData.tags?.filter(tag => tag.trim()) || [],
      };

      await onSubmit(cleanedData);
      
      // Reset form on success
      setFormData({
        title: '',
        description: '',
        priority: TaskPriority.MEDIUM,
        tags: [],
      });
      setTagInput('');
      onClose();
    } catch (err) {
      setFormErrors({
        general: err instanceof Error ? err.message : 'Failed to create task',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      priority: TaskPriority.MEDIUM,
      tags: [],
    });
    setTagInput('');
    setFormErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
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

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.HIGH:
        return 'text-red-600';
      case TaskPriority.MEDIUM_HIGH:
        return 'text-orange-600';
      case TaskPriority.MEDIUM:
        return 'text-yellow-600';
      case TaskPriority.MEDIUM_LOW:
        return 'text-blue-600';
      case TaskPriority.LOW:
        return 'text-gray-600';
      default:
        return 'text-yellow-600';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card 
        ref={modalRef}
        className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto ${className}`}
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Create New Task</CardTitle>
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
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
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

            {/* Title */}
            <div>
              <Label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </Label>
              <Input
                ref={titleInputRef}
                id="title"
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Enter task title..."
                className={`w-full ${formErrors.title ? 'border-red-300' : ''}`}
                disabled={isSubmitting}
              />
              {formErrors.title && (
                <p className="mt-1 text-sm text-red-600">{formErrors.title}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </Label>
              <textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Enter task description..."
                rows={4}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  formErrors.description ? 'border-red-300' : ''
                }`}
                disabled={isSubmitting}
              />
              {formErrors.description && (
                <p className="mt-1 text-sm text-red-600">{formErrors.description}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Priority */}
              <div>
                <Label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </Label>
                <select
                  id="priority"
                  value={formData.priority}
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
                <div className={`mt-1 text-sm ${getPriorityColor(formData.priority || TaskPriority.MEDIUM)}`}>
                  Current: {getPriorityLabel(formData.priority || TaskPriority.MEDIUM)}
                </div>
              </div>

              {/* Due Date */}
              <div>
                <Label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date
                </Label>
                <Input
                  id="dueDate"
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
            </div>

            {/* Assignee */}
            {users.length > 0 && (
              <div>
                <Label htmlFor="assigneeId" className="block text-sm font-medium text-gray-700 mb-2">
                  Assignee
                </Label>
                <select
                  id="assigneeId"
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
              </div>
            )}

            {/* Tags */}
            <div>
              <Label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
                Tags
              </Label>
              <div className="flex gap-2 mb-2">
                <Input
                  id="tags"
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

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-3 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || loading}
                className="min-w-[100px]"
              >
                {isSubmitting || loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Creating...
                  </div>
                ) : (
                  'Create Task'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateTaskModal;