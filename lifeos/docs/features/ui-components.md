# UI Components Library

## Overview

Life OS uses a custom component library built with React, TypeScript, and Tailwind CSS. Components are mobile-first, accessible, and support dark mode.

## Design System

### Color Palette

```typescript
// theme/colors.ts
export const colors = {
  // Brand colors
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6', // Primary
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },
  
  // Semantic colors
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e', // Success
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },
  
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444', // Error
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },
  
  // Neutral colors
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
};

// Dark mode colors
export const darkColors = {
  background: colors.gray[900],
  surface: colors.gray[800],
  border: colors.gray[700],
  text: {
    primary: colors.gray[100],
    secondary: colors.gray[300],
    muted: colors.gray[400],
  },
};

// Light mode colors
export const lightColors = {
  background: '#ffffff',
  surface: colors.gray[50],
  border: colors.gray[200],
  text: {
    primary: colors.gray[900],
    secondary: colors.gray[700],
    muted: colors.gray[500],
  },
};
```

### Typography

```typescript
// theme/typography.ts
export const typography = {
  // Font families
  fonts: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    mono: ['JetBrains Mono', 'monospace'],
  },
  
  // Font sizes
  sizes: {
    xs: ['0.75rem', { lineHeight: '1rem' }],
    sm: ['0.875rem', { lineHeight: '1.25rem' }],
    base: ['1rem', { lineHeight: '1.5rem' }],
    lg: ['1.125rem', { lineHeight: '1.75rem' }],
    xl: ['1.25rem', { lineHeight: '1.75rem' }],
    '2xl': ['1.5rem', { lineHeight: '2rem' }],
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
  },
  
  // Font weights
  weights: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
};
```

### Spacing & Layout

```typescript
// theme/spacing.ts
export const spacing = {
  // Base unit: 4px
  0: '0',
  px: '1px',
  0.5: '0.125rem', // 2px
  1: '0.25rem',    // 4px
  2: '0.5rem',     // 8px
  3: '0.75rem',    // 12px
  4: '1rem',       // 16px
  5: '1.25rem',    // 20px
  6: '1.5rem',     // 24px
  8: '2rem',       // 32px
  10: '2.5rem',    // 40px
  12: '3rem',      // 48px
  16: '4rem',      // 64px
  20: '5rem',      // 80px
};

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};
```

## Core Components

### Button

```typescript
// components/ui/Button.tsx
import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/cn';

const buttonVariants = cva(
  // Base styles
  'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-primary-500 text-white hover:bg-primary-600 focus-visible:ring-primary-500',
        secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus-visible:ring-gray-500 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700',
        outline: 'border border-gray-300 bg-transparent hover:bg-gray-100 focus-visible:ring-gray-500 dark:border-gray-700 dark:hover:bg-gray-800',
        ghost: 'hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-100',
        danger: 'bg-error-500 text-white hover:bg-error-600 focus-visible:ring-error-500',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-base',
        lg: 'h-12 px-6 text-lg',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <Spinner className="mr-2" />
        ) : (
          leftIcon && <span className="mr-2">{leftIcon}</span>
        )}
        {children}
        {rightIcon && <span className="ml-2">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';

// Usage
<Button variant="primary" size="lg" leftIcon={<PlusIcon />}>
  Create Task
</Button>
```

### Input

```typescript
// components/ui/Input.tsx
import { forwardRef } from 'react';
import { cn } from '@/utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, leftIcon, rightElement, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {leftIcon}
            </div>
          )}
          
          <input
            ref={ref}
            className={cn(
              'w-full rounded-md border bg-white px-3 py-2 text-base transition-colors',
              'placeholder:text-gray-400',
              'focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20',
              'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500',
              'dark:bg-gray-800 dark:border-gray-700 dark:text-white',
              leftIcon && 'pl-10',
              rightElement && 'pr-10',
              error && 'border-error-500 focus:border-error-500 focus:ring-error-500/20',
              !error && 'border-gray-300',
              className
            )}
            {...props}
          />
          
          {rightElement && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {rightElement}
            </div>
          )}
        </div>
        
        {(error || hint) && (
          <p className={cn(
            'mt-1 text-sm',
            error ? 'text-error-500' : 'text-gray-500 dark:text-gray-400'
          )}>
            {error || hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
```

### Card

```typescript
// components/ui/Card.tsx
import { cn } from '@/utils/cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'elevated' | 'outlined' | 'filled';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
}

export function Card({
  className,
  variant = 'elevated',
  padding = 'md',
  interactive = false,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg',
        {
          // Variants
          'bg-white shadow-sm dark:bg-gray-800': variant === 'elevated',
          'border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800': variant === 'outlined',
          'bg-gray-50 dark:bg-gray-800/50': variant === 'filled',
          
          // Padding
          'p-0': padding === 'none',
          'p-3': padding === 'sm',
          'p-4': padding === 'md',
          'p-6': padding === 'lg',
          
          // Interactive
          'cursor-pointer transition-all hover:shadow-md': interactive && variant === 'elevated',
          'cursor-pointer transition-colors hover:border-gray-300 dark:hover:border-gray-600': interactive && variant === 'outlined',
        },
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// Card sub-components
Card.Header = function CardHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('border-b border-gray-200 px-6 py-4 dark:border-gray-700', className)} {...props}>
      {children}
    </div>
  );
};

Card.Body = function CardBody({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-6', className)} {...props}>
      {children}
    </div>
  );
};

Card.Footer = function CardFooter({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('border-t border-gray-200 px-6 py-4 dark:border-gray-700', className)} {...props}>
      {children}
    </div>
  );
};
```

### Modal

```typescript
// components/ui/Modal.tsx
import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { cn } from '@/utils/cn';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  children: React.ReactNode;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  size = 'md',
  children,
}: ModalProps) {
  const maxWidthClass = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full',
  }[size];
  
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
        </Transition.Child>
        
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel
                className={cn(
                  'w-full transform rounded-xl bg-white p-6 shadow-xl transition-all dark:bg-gray-800',
                  maxWidthClass
                )}
              >
                <div className="flex items-start justify-between">
                  {title && (
                    <div>
                      <Dialog.Title className="text-xl font-semibold text-gray-900 dark:text-white">
                        {title}
                      </Dialog.Title>
                      {description && (
                        <Dialog.Description className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          {description}
                        </Dialog.Description>
                      )}
                    </div>
                  )}
                  
                  <button
                    onClick={onClose}
                    className="ml-auto rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-gray-700"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
                
                <div className="mt-4">{children}</div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
```

## Voice Components

### VoiceButton

```typescript
// components/voice/VoiceButton.tsx
import { useState, useRef } from 'react';
import { MicrophoneIcon } from '@heroicons/react/24/solid';
import { cn } from '@/utils/cn';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';

interface VoiceButtonProps {
  onTranscription: (text: string) => void;
  className?: string;
}

export function VoiceButton({ onTranscription, className }: VoiceButtonProps) {
  const { isRecording, startRecording, stopRecording, audioLevel } = useVoiceRecording({
    onTranscription,
  });
  
  const [isPressed, setIsPressed] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  const handlePointerDown = () => {
    setIsPressed(true);
    startRecording();
  };
  
  const handlePointerUp = () => {
    if (isPressed) {
      setIsPressed(false);
      stopRecording();
    }
  };
  
  return (
    <button
      ref={buttonRef}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      className={cn(
        'relative rounded-full p-4 transition-all',
        'focus:outline-none focus:ring-4 focus:ring-primary-500/20',
        isRecording
          ? 'bg-error-500 text-white shadow-lg scale-110'
          : 'bg-primary-500 text-white shadow hover:bg-primary-600',
        className
      )}
      aria-label={isRecording ? 'Recording... Release to stop' : 'Hold to record'}
      aria-pressed={isRecording}
    >
      <MicrophoneIcon className="h-6 w-6" />
      
      {/* Audio level indicator */}
      {isRecording && (
        <div
          className="absolute inset-0 rounded-full bg-white/20"
          style={{
            transform: `scale(${1 + audioLevel * 0.5})`,
            opacity: audioLevel * 0.5,
          }}
        />
      )}
      
      {/* Recording indicator */}
      {isRecording && (
        <div className="absolute -top-1 -right-1">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
          </span>
        </div>
      )}
    </button>
  );
}
```

### TranscriptionDisplay

```typescript
// components/voice/TranscriptionDisplay.tsx
import { useEffect, useState } from 'react';
import { cn } from '@/utils/cn';

interface TranscriptionDisplayProps {
  text: string;
  confidence?: number;
  isProcessing?: boolean;
  className?: string;
}

export function TranscriptionDisplay({
  text,
  confidence = 1,
  isProcessing = false,
  className,
}: TranscriptionDisplayProps) {
  const [displayText, setDisplayText] = useState('');
  
  // Typewriter effect
  useEffect(() => {
    if (!text) {
      setDisplayText('');
      return;
    }
    
    let index = 0;
    const interval = setInterval(() => {
      if (index <= text.length) {
        setDisplayText(text.slice(0, index));
        index++;
      } else {
        clearInterval(interval);
      }
    }, 30);
    
    return () => clearInterval(interval);
  }, [text]);
  
  return (
    <div className={cn('relative', className)}>
      <div className="rounded-lg bg-gray-100 p-4 dark:bg-gray-800">
        {isProcessing ? (
          <div className="flex items-center space-x-2">
            <div className="flex space-x-1">
              <span className="animate-bounce delay-0 h-2 w-2 rounded-full bg-primary-500"></span>
              <span className="animate-bounce delay-100 h-2 w-2 rounded-full bg-primary-500"></span>
              <span className="animate-bounce delay-200 h-2 w-2 rounded-full bg-primary-500"></span>
            </div>
            <span className="text-sm text-gray-500">Processing...</span>
          </div>
        ) : (
          <>
            <p className="text-gray-900 dark:text-white">
              {displayText || 'Speak your command...'}
            </p>
            
            {confidence < 0.8 && text && (
              <div className="mt-2 flex items-center text-sm text-warning-600">
                <ExclamationTriangleIcon className="mr-1 h-4 w-4" />
                Low confidence ({Math.round(confidence * 100)}%)
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
```

## Task Components

### TaskItem

```typescript
// components/task/TaskItem.tsx
import { useState } from 'react';
import { CheckCircleIcon, ClockIcon, FlagIcon } from '@heroicons/react/24/outline';
import { cn } from '@/utils/cn';
import type { Task } from '@/types';

interface TaskItemProps {
  task: Task;
  onUpdate: (task: Task) => void;
  onDelete: (id: string) => void;
  showProject?: boolean;
  className?: string;
}

export function TaskItem({
  task,
  onUpdate,
  onDelete,
  showProject = true,
  className,
}: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  
  const priorityColors = {
    1: 'text-gray-400',
    2: 'text-gray-500',
    3: 'text-blue-500',
    4: 'text-orange-500',
    5: 'text-red-500',
  };
  
  const statusIcons = {
    pending: <ClockIcon className="h-5 w-5 text-gray-400" />,
    in_progress: <div className="h-5 w-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />,
    completed: <CheckCircleIcon className="h-5 w-5 text-success-500" />,
  };
  
  return (
    <div
      className={cn(
        'group flex items-center gap-3 rounded-lg border p-3 transition-all',
        'hover:border-gray-300 hover:shadow-sm dark:hover:border-gray-600',
        task.status === 'completed' && 'opacity-60',
        className
      )}
    >
      {/* Status Icon */}
      <button
        onClick={() => {
          const newStatus = task.status === 'completed' ? 'pending' : 'completed';
          onUpdate({ ...task, status: newStatus });
        }}
        className="flex-shrink-0"
        aria-label={`Mark as ${task.status === 'completed' ? 'incomplete' : 'complete'}`}
      >
        {statusIcons[task.status]}
      </button>
      
      {/* Task Content */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <input
            type="text"
            value={task.title}
            onChange={(e) => onUpdate({ ...task, title: e.target.value })}
            onBlur={() => setIsEditing(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setIsEditing(false);
              if (e.key === 'Escape') setIsEditing(false);
            }}
            className="w-full bg-transparent text-gray-900 dark:text-white focus:outline-none"
            autoFocus
          />
        ) : (
          <h3
            onClick={() => setIsEditing(true)}
            className={cn(
              'cursor-text text-gray-900 dark:text-white',
              task.status === 'completed' && 'line-through'
            )}
          >
            {task.title}
          </h3>
        )}
        
        <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
          {task.dueDate && (
            <span className="flex items-center gap-1">
              <ClockIcon className="h-4 w-4" />
              {formatDate(task.dueDate)}
            </span>
          )}
          
          {showProject && task.project && (
            <span className="flex items-center gap-1">
              <FolderIcon className="h-4 w-4" />
              {task.project.name}
            </span>
          )}
          
          {task.assignee && (
            <span className="flex items-center gap-1">
              <UserIcon className="h-4 w-4" />
              {task.assignee.name}
            </span>
          )}
        </div>
      </div>
      
      {/* Priority & Actions */}
      <div className="flex items-center gap-2">
        <FlagIcon className={cn('h-5 w-5', priorityColors[task.priority])} />
        
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onDelete(task.id)}
            className="p-1 text-gray-400 hover:text-error-500"
            aria-label="Delete task"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
```

### TaskList

```typescript
// components/task/TaskList.tsx
import { useMemo } from 'react';
import { TaskItem } from './TaskItem';
import { EmptyState } from '../ui/EmptyState';
import type { Task, TaskFilter } from '@/types';

interface TaskListProps {
  tasks: Task[];
  filter?: TaskFilter;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  emptyMessage?: string;
  className?: string;
}

export function TaskList({
  tasks,
  filter,
  onUpdateTask,
  onDeleteTask,
  emptyMessage = 'No tasks found',
  className,
}: TaskListProps) {
  const filteredTasks = useMemo(() => {
    if (!filter) return tasks;
    
    return tasks.filter(task => {
      if (filter.status && task.status !== filter.status) return false;
      if (filter.projectId && task.projectId !== filter.projectId) return false;
      if (filter.assigneeId && task.assigneeId !== filter.assigneeId) return false;
      if (filter.search) {
        const searchLower = filter.search.toLowerCase();
        return task.title.toLowerCase().includes(searchLower) ||
               task.description?.toLowerCase().includes(searchLower);
      }
      return true;
    });
  }, [tasks, filter]);
  
  const groupedTasks = useMemo(() => {
    const groups: Record<string, Task[]> = {
      overdue: [],
      today: [],
      upcoming: [],
      'no-date': [],
    };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    filteredTasks.forEach(task => {
      if (!task.dueDate) {
        groups['no-date'].push(task);
      } else {
        const dueDate = new Date(task.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        
        if (dueDate < today && task.status !== 'completed') {
          groups.overdue.push(task);
        } else if (dueDate.getTime() === today.getTime()) {
          groups.today.push(task);
        } else {
          groups.upcoming.push(task);
        }
      }
    });
    
    return groups;
  }, [filteredTasks]);
  
  if (filteredTasks.length === 0) {
    return (
      <EmptyState
        icon={<InboxIcon className="h-12 w-12 text-gray-400" />}
        title="No tasks"
        description={emptyMessage}
      />
    );
  }
  
  return (
    <div className={className}>
      {Object.entries(groupedTasks).map(([group, tasks]) => {
        if (tasks.length === 0) return null;
        
        const groupTitles = {
          overdue: 'Overdue',
          today: 'Today',
          upcoming: 'Upcoming',
          'no-date': 'No due date',
        };
        
        return (
          <div key={group} className="mb-6">
            <h2 className="mb-3 text-sm font-medium text-gray-500 dark:text-gray-400">
              {groupTitles[group]} ({tasks.length})
            </h2>
            
            <div className="space-y-2">
              {tasks.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onUpdate={onUpdateTask}
                  onDelete={onDeleteTask}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

## Calendar Components

### CalendarView

```typescript
// components/calendar/CalendarView.tsx
import { useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday } from 'date-fns';
import { cn } from '@/utils/cn';
import type { CalendarEvent } from '@/types';

interface CalendarViewProps {
  events: CalendarEvent[];
  onDateClick: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
  className?: string;
}

export function CalendarView({
  events,
  onDateClick,
  onEventClick,
  className,
}: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  const getEventsForDay = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.startTime);
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      );
    });
  };
  
  return (
    <div className={cn('bg-white rounded-lg shadow dark:bg-gray-800', className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))}
            className="p-2 hover:bg-gray-100 rounded dark:hover:bg-gray-700"
            aria-label="Previous month"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="px-3 py-1 text-sm hover:bg-gray-100 rounded dark:hover:bg-gray-700"
          >
            Today
          </button>
          
          <button
            onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))}
            className="p-2 hover:bg-gray-100 rounded dark:hover:bg-gray-700"
            aria-label="Next month"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      {/* Calendar Grid */}
      <div className="p-4">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-sm font-medium text-gray-500 dark:text-gray-400">
              {day}
            </div>
          ))}
        </div>
        
        {/* Days */}
        <div className="grid grid-cols-7 gap-1">
          {days.map(day => {
            const dayEvents = getEventsForDay(day);
            const hasEvents = dayEvents.length > 0;
            
            return (
              <button
                key={day.toISOString()}
                onClick={() => onDateClick(day)}
                className={cn(
                  'aspect-square p-2 rounded-lg border transition-colors',
                  'hover:bg-gray-50 dark:hover:bg-gray-700',
                  isToday(day) && 'border-primary-500 bg-primary-50 dark:bg-primary-900/20',
                  !isToday(day) && 'border-transparent',
                  !isSameMonth(day, currentMonth) && 'text-gray-400 dark:text-gray-600'
                )}
              >
                <div className="text-sm">{format(day, 'd')}</div>
                
                {hasEvents && (
                  <div className="mt-1 flex justify-center gap-1">
                    {dayEvents.slice(0, 3).map((event, i) => (
                      <div
                        key={i}
                        className="h-1 w-1 rounded-full bg-primary-500"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick(event);
                        }}
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

## Layout Components

### Sidebar

```typescript
// components/layout/Sidebar.tsx
import { NavLink } from 'react-router-dom';
import {
  HomeIcon,
  CheckCircleIcon,
  CalendarIcon,
  FolderIcon,
  BanknotesIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/utils/cn';

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Tasks', href: '/tasks', icon: CheckCircleIcon },
  { name: 'Calendar', href: '/calendar', icon: CalendarIcon },
  { name: 'Projects', href: '/projects', icon: FolderIcon },
  { name: 'Finance', href: '/finance', icon: BanknotesIcon },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
];

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r bg-white transition-all dark:bg-gray-800 dark:border-gray-700',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b dark:border-gray-700">
        {!collapsed && (
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Life OS</h1>
        )}
        
        <button
          onClick={onToggle}
          className="p-1 hover:bg-gray-100 rounded dark:hover:bg-gray-700"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <MenuIcon className="h-5 w-5" />
        </button>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        {navigation.map(item => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                'hover:bg-gray-100 dark:hover:bg-gray-700',
                isActive
                  ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400'
                  : 'text-gray-700 dark:text-gray-300'
              )
            }
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>{item.name}</span>}
          </NavLink>
        ))}
      </nav>
      
      {/* User Menu */}
      <div className="border-t p-4 dark:border-gray-700">
        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">
          <img
            src="/avatar.jpg"
            alt="User"
            className="h-8 w-8 rounded-full"
          />
          {!collapsed && (
            <div className="text-left">
              <p className="text-sm font-medium text-gray-900 dark:text-white">John Builder</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">john@builderco.com</p>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
}
```

## Mobile Components

### BottomNavigation

```typescript
// components/mobile/BottomNavigation.tsx
import { NavLink } from 'react-router-dom';
import {
  HomeIcon,
  CheckCircleIcon,
  CalendarIcon,
  BanknotesIcon,
  MicrophoneIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/utils/cn';

const tabs = [
  { name: 'Home', href: '/', icon: HomeIcon },
  { name: 'Tasks', href: '/tasks', icon: CheckCircleIcon },
  { name: 'Calendar', href: '/calendar', icon: CalendarIcon },
  { name: 'Finance', href: '/finance', icon: BanknotesIcon },
];

interface BottomNavigationProps {
  onVoiceClick: () => void;
}

export function BottomNavigation({ onVoiceClick }: BottomNavigationProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t dark:bg-gray-800 dark:border-gray-700 md:hidden">
      <div className="grid grid-cols-5 h-16">
        {tabs.map((tab, index) => (
          <NavLink
            key={tab.name}
            to={tab.href}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center text-xs',
                isActive
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-gray-500 dark:text-gray-400'
              )
            }
          >
            <tab.icon className="h-6 w-6" />
            <span className="mt-1">{tab.name}</span>
          </NavLink>
        ))}
        
        {/* Voice Button */}
        <button
          onClick={onVoiceClick}
          className="flex flex-col items-center justify-center text-xs text-gray-500 dark:text-gray-400"
        >
          <MicrophoneIcon className="h-6 w-6" />
          <span className="mt-1">Voice</span>
        </button>
      </div>
    </div>
  );
}
```

## Utility Components

### LoadingSpinner

```typescript
// components/ui/LoadingSpinner.tsx
import { cn } from '@/utils/cn';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };
  
  return (
    <div className={cn('animate-spin rounded-full border-2 border-gray-300 border-t-primary-500', sizeClasses[size], className)} />
  );
}
```

### EmptyState

```typescript
// components/ui/EmptyState.tsx
import { cn } from '@/utils/cn';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
      {icon && <div className="mb-4 text-gray-400">{icon}</div>}
      
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">{title}</h3>
      
      {description && (
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-md">
          {description}
        </p>
      )}
      
      {action && (
        <Button onClick={action.onClick} className="mt-4">
          {action.label}
        </Button>
      )}
    </div>
  );
}
```

## Theme Provider

```typescript
// components/theme/ThemeProvider.tsx
import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('theme');
    return (stored as Theme) || 'system';
  });
  
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
    
    localStorage.setItem('theme', theme);
  }, [theme]);
  
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
```