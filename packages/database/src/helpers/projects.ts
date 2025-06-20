import { type Project, type ProjectMember, type Prisma } from '@prisma/client';
import prisma from '../client';

export interface CreateProjectData {
  organizationId?: string;
  name: string;
  description?: string;
  clientName?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  budgetAmount?: number;
  color?: string;
  settings?: Prisma.JsonValue;
  createdBy: string;
}

export interface ProjectFilters {
  organizationId?: string;
  status?: string;
  createdBy?: string;
  clientName?: string;
  search?: string;
}

/**
 * Create a new project
 */
export async function createProject(data: CreateProjectData): Promise<Project> {
  return await prisma.project.create({
    data: {
      ...data,
      status: data.status || 'active',
      settings: data.settings || {},
    },
    include: {
      organization: true,
      members: {
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
  });
}

/**
 * Get projects with filtering and pagination
 */
export async function getProjects(
  filters: ProjectFilters = {},
  options: {
    page?: number;
    limit?: number;
    orderBy?: Prisma.ProjectOrderByWithRelationInput[];
  } = {}
): Promise<{
  projects: Project[];
  total: number;
  page: number;
  totalPages: number;
}> {
  const { page = 1, limit = 20, orderBy = [{ createdAt: 'desc' }] } = options;
  const skip = (page - 1) * limit;

  const where: Prisma.ProjectWhereInput = {};

  // Apply filters
  if (filters.organizationId) where.organizationId = filters.organizationId;
  if (filters.status) where.status = filters.status;
  if (filters.createdBy) where.createdBy = filters.createdBy;
  if (filters.clientName) {
    where.clientName = {
      contains: filters.clientName,
      mode: 'insensitive',
    };
  }

  // Search filter
  if (filters.search) {
    where.OR = [
      {
        name: {
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
      {
        clientName: {
          contains: filters.search,
          mode: 'insensitive',
        },
      },
    ];
  }

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
        _count: {
          select: {
            tasks: true,
            transactions: true,
            events: true,
          },
        },
      },
    }),
    prisma.project.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    projects,
    total,
    page,
    totalPages,
  };
}

/**
 * Get project by ID with full details
 */
export async function getProjectById(id: string): Promise<Project | null> {
  return await prisma.project.findUnique({
    where: { id },
    include: {
      organization: true,
      members: {
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      },
      tasks: {
        where: {
          status: {
            not: 'completed',
          },
        },
        take: 10,
        orderBy: {
          dueDate: 'asc',
        },
        include: {
          assignee: {
            select: {
              id: true,
              fullName: true,
              avatarUrl: true,
            },
          },
        },
      },
      transactions: {
        take: 5,
        orderBy: {
          transactionDate: 'desc',
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
        },
      },
      _count: {
        select: {
          tasks: true,
          transactions: true,
          events: true,
          budgets: true,
        },
      },
    },
  });
}

/**
 * Update project
 */
export async function updateProject(
  id: string,
  data: Partial<CreateProjectData>
): Promise<Project> {
  return await prisma.project.update({
    where: { id },
    data,
    include: {
      organization: true,
      members: {
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
  });
}

/**
 * Archive project (soft delete)
 */
export async function archiveProject(id: string): Promise<Project> {
  return await prisma.project.update({
    where: { id },
    data: {
      archivedAt: new Date(),
      status: 'archived',
    },
  });
}

/**
 * Add member to project
 */
export async function addProjectMember(
  projectId: string,
  userId: string,
  role: string = 'member',
  hourlyRate?: number
): Promise<ProjectMember> {
  return await prisma.projectMember.create({
    data: {
      projectId,
      userId,
      role,
      hourlyRate,
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          avatarUrl: true,
        },
      },
    },
  });
}

/**
 * Remove member from project
 */
export async function removeProjectMember(
  projectId: string,
  userId: string
): Promise<void> {
  await prisma.projectMember.delete({
    where: {
      projectId_userId: {
        projectId,
        userId,
      },
    },
  });
}

/**
 * Update project member role or hourly rate
 */
export async function updateProjectMember(
  projectId: string,
  userId: string,
  data: {
    role?: string;
    hourlyRate?: number;
  }
): Promise<ProjectMember> {
  return await prisma.projectMember.update({
    where: {
      projectId_userId: {
        projectId,
        userId,
      },
    },
    data,
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          avatarUrl: true,
        },
      },
    },
  });
}

/**
 * Get projects for a specific user
 */
export async function getUserProjects(userId: string): Promise<Project[]> {
  return await prisma.project.findMany({
    where: {
      OR: [
        { createdBy: userId },
        {
          members: {
            some: {
              userId,
            },
          },
        },
      ],
      archivedAt: null,
    },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
        },
      },
      members: {
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              avatarUrl: true,
            },
          },
        },
      },
      _count: {
        select: {
          tasks: {
            where: {
              status: {
                not: 'completed',
              },
            },
          },
        },
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });
}

/**
 * Get project statistics
 */
export async function getProjectStatistics(projectId: string) {
  const [taskStats, transactionStats, budgetStats] = await Promise.all([
    // Task statistics
    prisma.task.groupBy({
      by: ['status'],
      where: { projectId },
      _count: {
        id: true,
      },
    }),
    
    // Transaction statistics
    prisma.transaction.aggregate({
      where: { projectId },
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    }),
    
    // Budget statistics
    prisma.budget.aggregate({
      where: { projectId },
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    }),
  ]);

  return {
    tasks: taskStats,
    transactions: transactionStats,
    budgets: budgetStats,
  };
}