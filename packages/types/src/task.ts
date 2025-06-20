import { BaseEntity, RecurringPattern } from './common';

export interface Task extends BaseEntity {
  title: string;
  description?: string;
  userId: string;
  projectId?: string;
  parentTaskId?: string;
  assigneeId?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: Date;
  completedAt?: Date;
  recurringPattern?: RecurringPattern;
  tags: string[];
  metadata: Record<string, unknown>;
  source: TaskSource;
}

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum TaskPriority {
  LOW = 1,
  MEDIUM_LOW = 2,
  MEDIUM = 3,
  MEDIUM_HIGH = 4,
  HIGH = 5
}

export enum TaskSource {
  MANUAL = 'manual',
  VOICE = 'voice',
  EMAIL = 'email',
  API = 'api'
}


export interface TaskDependency {
  taskId: string;
  dependsOnTaskId: string;
  dependencyType: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish';
}

export interface TaskComment extends BaseEntity {
  taskId: string;
  userId: string;
  comment: string;
}

export interface TaskAttachment extends BaseEntity {
  taskId: string;
  uploadedBy: string;
  fileName: string;
  fileSize: number;
  fileType?: string;
  storageUrl: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  projectId?: string;
  assigneeId?: string;
  priority?: TaskPriority;
  dueDate?: Date;
  tags?: string[];
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: Date;
  assigneeId?: string;
  tags?: string[];
}