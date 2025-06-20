# Task Management Components

A comprehensive set of React components for task management in the LifeOS application. These components provide a complete task management interface with filtering, sorting, creation, editing, and deletion capabilities.

## Components

### Core Components

#### `TaskCard`
Individual task display component with status, priority, assignee, and due date information.

```tsx
import { TaskCard } from './components/tasks';

<TaskCard
  task={task}
  assignee={user}
  onClick={handleTaskClick}
  onStatusChange={handleStatusChange}
/>
```

#### `TaskList`
Main task list component with filtering, sorting, and grouping capabilities.

```tsx
import { TaskList } from './components/tasks';

<TaskList
  tasks={tasks}
  users={users}
  loading={loading}
  error={error}
  onTaskClick={handleTaskClick}
  onTaskStatusChange={handleStatusChange}
  onCreateTask={handleCreateTask}
/>
```

#### `CreateTaskModal`
Modal for creating new tasks with form validation.

```tsx
import { CreateTaskModal } from './components/tasks';

<CreateTaskModal
  isOpen={isCreateModalOpen}
  onClose={handleCloseCreateModal}
  onSubmit={handleCreateTask}
  users={users}
  loading={loading}
  error={error}
/>
```

#### `TaskDetailModal`
Modal for viewing and editing task details.

```tsx
import { TaskDetailModal } from './components/tasks';

<TaskDetailModal
  task={selectedTask}
  isOpen={isDetailModalOpen}
  onClose={handleCloseDetailModal}
  onUpdate={handleUpdateTask}
  onDelete={handleDeleteTask}
  users={users}
  loading={loading}
  error={error}
/>
```

### Supporting Components

#### `TaskFilters`
Filtering interface for tasks by status, priority, assignee, tags, and due date.

#### `TaskSorting`
Sorting controls for tasks by various fields.

#### `TaskSkeleton`, `TaskListSkeleton`, `TaskModalSkeleton`
Loading state components.

#### `TaskError`, `TaskListError`, `TaskNotFound`, `NetworkError`
Error state components.

## Usage Example

```tsx
import React, { useState, useEffect } from 'react';
import {
  TaskList,
  CreateTaskModal,
  TaskDetailModal,
  TaskListSkeleton,
  TaskListError,
  type Task,
  type User,
  type CreateTaskInput,
  type UpdateTaskInput,
} from './components/tasks';

const TasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Load tasks and users
  useEffect(() => {
    loadTasks();
    loadUsers();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tasks');
      const data = await response.json();
      setTasks(data.tasks);
      setError(null);
    } catch (err) {
      setError('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      setUsers(data.users);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  const handleCreateTask = async (input: CreateTaskInput) => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      
      if (!response.ok) throw new Error('Failed to create task');
      
      const newTask = await response.json();
      setTasks(prev => [newTask, ...prev]);
      setIsCreateModalOpen(false);
    } catch (err) {
      throw new Error('Failed to create task');
    }
  };

  const handleUpdateTask = async (taskId: string, updates: UpdateTaskInput) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) throw new Error('Failed to update task');
      
      const updatedTask = await response.json();
      setTasks(prev => prev.map(task => 
        task.id === taskId ? updatedTask : task
      ));
    } catch (err) {
      throw new Error('Failed to update task');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete task');
      
      setTasks(prev => prev.filter(task => task.id !== taskId));
      setIsDetailModalOpen(false);
      setSelectedTask(null);
    } catch (err) {
      throw new Error('Failed to delete task');
    }
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsDetailModalOpen(true);
  };

  const handleStatusChange = async (task: Task, newStatus: TaskStatus) => {
    await handleUpdateTask(task.id, { status: newStatus });
  };

  if (loading) {
    return <TaskListSkeleton />;
  }

  if (error) {
    return (
      <TaskListError
        error={error}
        onRetry={loadTasks}
        onCreateTask={() => setIsCreateModalOpen(true)}
      />
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <TaskList
        tasks={tasks}
        users={users}
        onTaskClick={handleTaskClick}
        onTaskStatusChange={handleStatusChange}
        onCreateTask={() => setIsCreateModalOpen(true)}
      />

      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateTask}
        users={users}
      />

      <TaskDetailModal
        task={selectedTask}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedTask(null);
        }}
        onUpdate={handleUpdateTask}
        onDelete={handleDeleteTask}
        users={users}
      />
    </div>
  );
};

export default TasksPage;
```

## Features

- **Complete Task Management**: Create, read, update, and delete tasks
- **Advanced Filtering**: Filter by status, priority, assignee, tags, and due date
- **Flexible Sorting**: Sort by date, priority, status, title, and more
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Loading States**: Skeleton components for better UX
- **Error Handling**: Comprehensive error states and recovery options
- **Form Validation**: Client-side validation with helpful error messages
- **Accessibility**: ARIA labels and keyboard navigation support
- **TypeScript**: Fully typed with comprehensive interfaces

## Styling

All components use Tailwind CSS classes and follow the existing design system. The components integrate seamlessly with the `@lifeos/ui` component library.

## Integration with GraphQL

These components are designed to work with any data fetching solution. For GraphQL integration, you can use Apollo Client, Relay, or any other GraphQL client:

```tsx
import { useQuery, useMutation } from '@apollo/client';
import { GET_TASKS, CREATE_TASK, UPDATE_TASK, DELETE_TASK } from './graphql/tasks';

const TasksPageWithGraphQL: React.FC = () => {
  const { data, loading, error, refetch } = useQuery(GET_TASKS);
  const [createTask] = useMutation(CREATE_TASK);
  const [updateTask] = useMutation(UPDATE_TASK);
  const [deleteTask] = useMutation(DELETE_TASK);

  const handleCreateTask = async (input: CreateTaskInput) => {
    const result = await createTask({ variables: { input } });
    if (result.errors) {
      throw new Error(result.errors[0].message);
    }
  };

  // ... rest of the component
};
```

## Performance Considerations

- Components are optimized with React.memo where appropriate
- Large task lists can be virtualized using libraries like `react-window`
- Filtering and sorting operations are optimized with useMemo
- Skeleton components provide immediate feedback during loading

## Customization

All components accept a `className` prop for custom styling. You can also override the default styles by providing more specific CSS classes or using CSS-in-JS solutions.