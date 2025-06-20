import { type Task, type TaskComment, type Prisma } from '@prisma/client';
import prisma from '../client';

export interface CreateTaskData {
  title: string;
  description?: string;
  userId: string;
  projectId?: string;
  parentTaskId?: string;
  assigneeId?: string;
  status?: string;
  priority?: number;
  dueDate?: Date;
  recurringPattern?: Prisma.JsonValue;
  tags?: string[];
  metadata?: Prisma.JsonValue;
  source?: string;
}

export interface TaskFilters {
  userId?: string;
  projectId?: string;
  assigneeId?: string;
  status?: string;
  priority?: number;
  dueBefore?: Date;
  dueAfter?: Date;
  tags?: string[];
  search?: string;
  hasParent?: boolean;
}

/**
 * Create a new task
 */
export async function createTask(data: CreateTaskData): Promise<Task> {
  return await prisma.task.create({
    data: {
      ...data,
      status: data.status || 'pending',
      priority: data.priority || 3,
      tags: data.tags || [],
      metadata: data.metadata || {},
      source: data.source || 'manual',
    },
    include: {
      owner: {
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
        },
      },
      assignee: {
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
        },
      },
      project: {
        select: {
          id: true,
          name: true,
          color: true,
        },
      },
      parentTask: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });
}

/**
 * Get tasks with filtering and pagination
 */
export async function getTasks(
  filters: TaskFilters = {},
  options: {
    page?: number;
    limit?: number;
    orderBy?: Prisma.TaskOrderByWithRelationInput[];
  } = {}
): Promise<{
  tasks: Task[];
  total: number;
  page: number;
  totalPages: number;
}> {
  const { page = 1, limit = 50, orderBy = [{ dueDate: 'asc' }, { priority: 'asc' }] } = options;
  const skip = (page - 1) * limit;

  const where: Prisma.TaskWhereInput = {};

  // Apply filters
  if (filters.userId) where.userId = filters.userId;
  if (filters.projectId) where.projectId = filters.projectId;
  if (filters.assigneeId) where.assigneeId = filters.assigneeId;
  if (filters.status) where.status = filters.status;
  if (filters.priority) where.priority = filters.priority;
  if (filters.hasParent !== undefined) {
    where.parentTaskId = filters.hasParent ? { not: null } : null;
  }

  // Date filters
  if (filters.dueBefore || filters.dueAfter) {
    where.dueDate = {};
    if (filters.dueBefore) where.dueDate.lte = filters.dueBefore;
    if (filters.dueAfter) where.dueDate.gte = filters.dueAfter;
  }

  // Tags filter
  if (filters.tags && filters.tags.length > 0) {
    where.tags = {
      hasEvery: filters.tags,
    };
  }

  // Search filter
  if (filters.search) {
    where.OR = [
      {
        title: {
          contains: filters.search,
          mode: 'insensitive',
        },
      },
      {
        description: {
          contains: filters.search,
          mode: 'insensitive',
        },
      },
    ];
  }

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        owner: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          },
        },
        assignee: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        parentTask: {
          select: {
            id: true,
            title: true,
          },
        },
        _count: {
          select: {
            subTasks: true,
            comments: true,
            attachments: true,
          },
        },
      },
    }),
    prisma.task.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    tasks,
    total,
    page,
    totalPages,
  };
}

/**
 * Get task by ID with full details
 */
export async function getTaskById(id: string): Promise<Task | null> {
  return await prisma.task.findUnique({
    where: { id },
    include: {
      owner: {
        select: {
          id: true,
          fullName: true,
          email: true,
          avatarUrl: true,
        },
      },
      assignee: {
        select: {
          id: true,
          fullName: true,
          email: true,
          avatarUrl: true,
        },
      },
      project: {
        select: {
          id: true,
          name: true,
          color: true,
          clientName: true,
        },
      },
      parentTask: {
        select: {
          id: true,
          title: true,
          status: true,
        },
      },
      subTasks: {
        include: {
          assignee: {
            select: {
              id: true,
              fullName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      },
      comments: {
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
      attachments: {
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
        orderBy: {
          uploadedAt: 'desc',
        },
      },
      dependencies: {
        include: {
          dependsOn: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
        },
      },
      dependents: {
        include: {
          task: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
        },
      },
    },
  });
}

/**
 * Update task
 */
export async function updateTask(
  id: string,
  data: Partial<CreateTaskData>
): Promise<Task> {
  const updateData: any = { ...data };
  
  // If marking as completed, set completedAt timestamp
  if (data.status === 'completed') {
    updateData.completedAt = new Date();
  } else if (data.status && data.status !== 'completed') {
    updateData.completedAt = null;
  }

  return await prisma.task.update({
    where: { id },
    data: updateData,
    include: {
      owner: {
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
        },
      },
      assignee: {
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
        },
      },
      project: {
        select: {
          id: true,
          name: true,
          color: true,
        },
      },
    },
  });
}

/**
 * Delete task and all its subtasks
 */
export async function deleteTask(id: string): Promise<void> {
  await prisma.task.delete({
    where: { id },
  });
}

/**
 * Add comment to task
 */
export async function addTaskComment(
  taskId: string,
  userId: string,
  comment: string
): Promise<TaskComment> {
  return await prisma.taskComment.create({
    data: {
      taskId,
      userId,
      comment,
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
        },
      },
    },
  });
}

/**
 * Get tasks assigned to a user
 */
export async function getAssignedTasks(
  userId: string,
  status?: string
): Promise<Task[]> {
  const where: Prisma.TaskWhereInput = {
    assigneeId: userId,
  };

  if (status) {
    where.status = status;
  }

  return await prisma.task.findMany({
    where,
    include: {
      owner: {
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
        },
      },
      project: {
        select: {
          id: true,
          name: true,
          color: true,
        },
      },
      _count: {
        select: {
          subTasks: true,
          comments: true,
        },
      },
    },
    orderBy: [
      { dueDate: 'asc' },
      { priority: 'asc' },
    ],
  });
}

/**
 * Get tasks owned by a user
 */
export async function getOwnedTasks(
  userId: string,
  status?: string
): Promise<Task[]> {
  const where: Prisma.TaskWhereInput = {
    userId,
  };

  if (status) {
    where.status = status;
  }

  return await prisma.task.findMany({
    where,
    include: {
      assignee: {
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
        },
      },
      project: {
        select: {
          id: true,
          name: true,
          color: true,
        },
      },
      _count: {
        select: {
          subTasks: true,
          comments: true,
        },
      },
    },
    orderBy: [
      { dueDate: 'asc' },
      { priority: 'asc' },
    ],
  });
}

/**
 * Get overdue tasks
 */
export async function getOverdueTasks(userId?: string): Promise<Task[]> {
  const where: Prisma.TaskWhereInput = {
    dueDate: {
      lt: new Date(),
    },
    status: {
      not: 'completed',
    },
  };

  if (userId) {
    where.OR = [
      { userId },
      { assigneeId: userId },
    ];
  }

  return await prisma.task.findMany({
    where,
    include: {
      owner: {
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
        },
      },
      assignee: {
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
        },
      },
      project: {
        select: {
          id: true,
          name: true,
          color: true,
        },
      },
    },
    orderBy: {
      dueDate: 'asc',
    },
  });
}

/**
 * Get task statistics for a user
 */
export async function getUserTaskStatistics(userId: string) {
  const [owned, assigned, overdue, completed] = await Promise.all([
    prisma.task.count({
      where: {
        userId,
        status: { not: 'completed' },
      },
    }),
    prisma.task.count({
      where: {
        assigneeId: userId,
        status: { not: 'completed' },
      },
    }),
    prisma.task.count({
      where: {
        OR: [
          { userId },
          { assigneeId: userId },
        ],
        dueDate: { lt: new Date() },
        status: { not: 'completed' },
      },
    }),
    prisma.task.count({
      where: {
        OR: [
          { userId },
          { assigneeId: userId },
        ],
        status: 'completed',
        completedAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
    }),
  ]);

  return {
    owned,
    assigned,
    overdue,
    completedLastMonth: completed,
  };
}