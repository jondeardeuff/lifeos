import { GraphQLError } from 'graphql';
import { randomBytes } from 'crypto';
import { 
  GraphQLContext, 
  TasksQueryArgs, 
  TaskCommentsArgs,
  CreateTaskInput,
  UpdateTaskInput,
  AddTaskCommentArgs,
  UpdateTaskCommentArgs,
  AddTaskAttachmentArgs,
  AddTaskDependencyArgs,
  RemoveTaskDependencyArgs
} from '../typeDefs';
import { requireAuth, requireOwnership, buildPaginationQuery, buildCursorConnection } from './index';
import prisma, { Prisma } from '@lifeos/database';

// Helper functions for mapping between database and GraphQL types
const mapPriorityToEnum = (priority: number): string => {
  switch (priority) {
    case 1: return 'LOW';
    case 2: return 'MEDIUM_LOW';
    case 3: return 'MEDIUM';
    case 4: return 'MEDIUM_HIGH';
    case 5: return 'HIGH';
    default: return 'MEDIUM';
  }
};

const mapPriorityToNumber = (priority?: string): number => {
  switch (priority) {
    case 'LOW': return 1;
    case 'MEDIUM_LOW': return 2;
    case 'MEDIUM': return 3;
    case 'MEDIUM_HIGH': return 4;
    case 'HIGH': return 5;
    default: return 3;
  }
};

const mapStatusToDb = (status: string): string => {
  return status.toLowerCase();
};

export const taskResolvers = {
  Query: {
    task: async (
      _: any,
      { id }: { id: string },
      context: GraphQLContext
    ) => {
      requireAuth(context);

      try {
        const task = await prisma.task.findUnique({
          where: { id },
          include: {
            owner: true,
            assignee: true,
            parentTask: true,
            project: true,
          },
        });

        if (!task) {
          throw new GraphQLError('Task not found', {
            extensions: {
              code: 'NOT_FOUND',
            },
          });
        }

        // Check if user has access to this task
        if (task.userId !== context.user?.id && task.assigneeId !== context.user?.id) {
          throw new GraphQLError('Not authorized to access this task', {
            extensions: {
              code: 'FORBIDDEN',
            },
          });
        }

        // Map database fields to GraphQL schema
        return {
          ...task,
          user: task.owner,
          priority: mapPriorityToEnum(task.priority),
          status: task.status.toUpperCase(),
          source: task.source.toUpperCase(),
        };
      } catch (error) {
        if (error instanceof GraphQLError) {
          throw error;
        }
        throw new GraphQLError('Failed to fetch task', {
          extensions: {
            code: 'INTERNAL_SERVER_ERROR',
            originalError: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }
    },

    tasks: async (
      _: any,
      { filter, pagination }: TasksQueryArgs,
      context: GraphQLContext
    ) => {
      const user = requireAuth(context);

      try {
        const { offset, limit, orderBy } = buildPaginationQuery(pagination);

        // Build filter conditions
        const where: Prisma.TaskWhereInput = {
          // Only show tasks the user owns or is assigned to
          OR: [
            { userId: user.id },
            { assigneeId: user.id },
          ],
        };
        
        if (filter?.status) {
          where.status = mapStatusToDb(filter.status);
        }
        if (filter?.priority) {
          where.priority = mapPriorityToNumber(filter.priority);
        }
        if (filter?.assigneeId) {
          where.assigneeId = filter.assigneeId;
        }
        if (filter?.projectId) {
          where.projectId = filter.projectId;
        }
        if (filter?.tags && filter.tags.length > 0) {
          where.tags = {
            hasSome: filter.tags,
          };
        }
        if (filter?.dueBefore) {
          where.dueDate = { ...where.dueDate, lte: filter.dueBefore };
        }
        if (filter?.dueAfter) {
          where.dueDate = { ...where.dueDate, gte: filter.dueAfter };
        }

        const [tasks, totalCount] = await Promise.all([
          prisma.task.findMany({
            where,
            skip: offset,
            take: limit,
            orderBy,
            include: {
              owner: true,
              assignee: true,
              project: true,
            },
          }),
          prisma.task.count({ where }),
        ]);

        // Map database fields to GraphQL schema
        const mappedTasks = tasks.map(task => ({
          ...task,
          user: task.owner,
          priority: mapPriorityToEnum(task.priority),
          status: task.status.toUpperCase(),
          source: task.source.toUpperCase(),
        }));

        return buildCursorConnection(
          mappedTasks,
          totalCount,
          limit,
          Math.floor(offset / limit) + 1
        );
      } catch (error) {
        if (error instanceof GraphQLError) {
          throw error;
        }
        throw new GraphQLError('Failed to fetch tasks', {
          extensions: {
            code: 'INTERNAL_SERVER_ERROR',
            originalError: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }
    },

    myTasks: async (
      _: any,
      { filter, pagination }: TasksQueryArgs,
      context: GraphQLContext
    ) => {
      const user = requireAuth(context);

      try {
        const { offset, limit, orderBy } = buildPaginationQuery(pagination);

        // Build filter conditions for user's tasks
        const where: Prisma.TaskWhereInput = {
          OR: [
            { userId: user.id },
            { assigneeId: user.id },
          ],
        };

        if (filter?.status) {
          where.status = mapStatusToDb(filter.status);
        }
        if (filter?.priority) {
          where.priority = mapPriorityToNumber(filter.priority);
        }
        if (filter?.projectId) {
          where.projectId = filter.projectId;
        }
        if (filter?.tags && filter.tags.length > 0) {
          where.tags = {
            hasSome: filter.tags,
          };
        }
        if (filter?.dueBefore) {
          where.dueDate = { ...where.dueDate, lte: filter.dueBefore };
        }
        if (filter?.dueAfter) {
          where.dueDate = { ...where.dueDate, gte: filter.dueAfter };
        }

        const [tasks, totalCount] = await Promise.all([
          prisma.task.findMany({
            where,
            skip: offset,
            take: limit,
            orderBy,
            include: {
              owner: true,
              assignee: true,
              project: true,
            },
          }),
          prisma.task.count({ where }),
        ]);

        // Map database fields to GraphQL schema
        const mappedTasks = tasks.map(task => ({
          ...task,
          user: task.owner,
          priority: mapPriorityToEnum(task.priority),
          status: task.status.toUpperCase(),
          source: task.source.toUpperCase(),
        }));

        return buildCursorConnection(
          mappedTasks,
          totalCount,
          limit,
          Math.floor(offset / limit) + 1
        );
      } catch (error) {
        if (error instanceof GraphQLError) {
          throw error;
        }
        throw new GraphQLError('Failed to fetch your tasks', {
          extensions: {
            code: 'INTERNAL_SERVER_ERROR',
            originalError: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }
    },

    taskDependencies: async (
      _: any,
      { taskId }: { taskId: string },
      context: GraphQLContext
    ) => {
      const user = requireAuth(context);

      try {
        // First verify the user has access to the task
        const task = await prisma.task.findUnique({
          where: { id: taskId },
          select: { userId: true, assigneeId: true },
        });

        if (!task) {
          throw new GraphQLError('Task not found', {
            extensions: { code: 'NOT_FOUND' },
          });
        }

        if (task.userId !== user.id && task.assigneeId !== user.id) {
          throw new GraphQLError('Not authorized to view this task dependencies', {
            extensions: { code: 'FORBIDDEN' },
          });
        }

        const dependencies = await prisma.taskDependency.findMany({
          where: { taskId },
        });

        return dependencies;
      } catch (error) {
        if (error instanceof GraphQLError) {
          throw error;
        }
        throw new GraphQLError('Failed to fetch task dependencies', {
          extensions: {
            code: 'INTERNAL_SERVER_ERROR',
            originalError: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }
    },

    taskComments: async (
      _: any,
      { taskId, pagination }: TaskCommentsArgs,
      context: GraphQLContext
    ) => {
      const user = requireAuth(context);

      try {
        // First verify the user has access to the task
        const task = await prisma.task.findUnique({
          where: { id: taskId },
          select: { userId: true, assigneeId: true },
        });

        if (!task) {
          throw new GraphQLError('Task not found', {
            extensions: { code: 'NOT_FOUND' },
          });
        }

        if (task.userId !== user.id && task.assigneeId !== user.id) {
          throw new GraphQLError('Not authorized to view this task comments', {
            extensions: { code: 'FORBIDDEN' },
          });
        }

        const { offset, limit, orderBy } = buildPaginationQuery(pagination);

        const comments = await prisma.taskComment.findMany({
          where: { taskId },
          skip: offset,
          take: limit,
          orderBy,
          include: {
            user: true,
          },
        });

        return comments;
      } catch (error) {
        if (error instanceof GraphQLError) {
          throw error;
        }
        throw new GraphQLError('Failed to fetch task comments', {
          extensions: {
            code: 'INTERNAL_SERVER_ERROR',
            originalError: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }
    },

    taskAttachments: async (
      _: any,
      { taskId }: { taskId: string },
      context: GraphQLContext
    ) => {
      const user = requireAuth(context);

      try {
        // First verify the user has access to the task
        const task = await prisma.task.findUnique({
          where: { id: taskId },
          select: { userId: true, assigneeId: true },
        });

        if (!task) {
          throw new GraphQLError('Task not found', {
            extensions: { code: 'NOT_FOUND' },
          });
        }

        if (task.userId !== user.id && task.assigneeId !== user.id) {
          throw new GraphQLError('Not authorized to view this task attachments', {
            extensions: { code: 'FORBIDDEN' },
          });
        }

        const attachments = await prisma.taskAttachment.findMany({
          where: { taskId },
          include: {
            user: true,
          },
        });

        return attachments;
      } catch (error) {
        if (error instanceof GraphQLError) {
          throw error;
        }
        throw new GraphQLError('Failed to fetch task attachments', {
          extensions: {
            code: 'INTERNAL_SERVER_ERROR',
            originalError: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }
    },
  },

  Mutation: {
    createTask: async (
      _: any,
      { input }: { input: CreateTaskInput },
      context: GraphQLContext
    ) => {
      const user = requireAuth(context);

      try {
        // Validate input
        if (!input.title.trim()) {
          throw new GraphQLError('Task title is required', {
            extensions: {
              code: 'BAD_USER_INPUT',
              field: 'title',
            },
          });
        }

        // Validate assignee exists if provided
        if (input.assigneeId) {
          const assignee = await prisma.user.findUnique({
            where: { id: input.assigneeId },
            select: { id: true },
          });
          if (!assignee) {
            throw new GraphQLError('Assignee not found', {
              extensions: {
                code: 'BAD_USER_INPUT',
                field: 'assigneeId',
              },
            });
          }
        }

        // Validate project exists if provided
        if (input.projectId) {
          const project = await prisma.project.findUnique({
            where: { id: input.projectId },
            select: { id: true },
          });
          if (!project) {
            throw new GraphQLError('Project not found', {
              extensions: {
                code: 'BAD_USER_INPUT',
                field: 'projectId',
              },
            });
          }
        }

        const task = await prisma.task.create({
          data: {
            title: input.title.trim(),
            description: input.description?.trim(),
            userId: user.id,
            projectId: input.projectId,
            assigneeId: input.assigneeId,
            status: 'pending',
            priority: mapPriorityToNumber(input.priority),
            dueDate: input.dueDate,
            tags: input.tags || [],
            metadata: {},
            source: 'manual',
          },
          include: {
            owner: true,
            assignee: true,
            project: true,
          },
        });

        // Map database fields to GraphQL schema
        return {
          ...task,
          user: task.owner,
          priority: mapPriorityToEnum(task.priority),
          status: task.status.toUpperCase(),
          source: task.source.toUpperCase(),
        };
      } catch (error) {
        if (error instanceof GraphQLError) {
          throw error;
        }
        throw new GraphQLError('Failed to create task', {
          extensions: {
            code: 'INTERNAL_SERVER_ERROR',
            originalError: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }
    },

    updateTask: async (
      _: any,
      { id, input }: { id: string; input: UpdateTaskInput },
      context: GraphQLContext
    ) => {
      const user = requireAuth(context);

      try {
        // First, check if task exists and user has permission
        const existingTask = await prisma.task.findUnique({
          where: { id },
          select: { userId: true, assigneeId: true, status: true },
        });

        if (!existingTask) {
          throw new GraphQLError('Task not found', {
            extensions: {
              code: 'NOT_FOUND',
            },
          });
        }

        // Check permission - user must be owner or assignee
        if (existingTask.userId !== user.id && existingTask.assigneeId !== user.id) {
          throw new GraphQLError('Not authorized to update this task', {
            extensions: {
              code: 'FORBIDDEN',
            },
          });
        }

        // Validate assignee exists if provided
        if (input.assigneeId) {
          const assignee = await prisma.user.findUnique({
            where: { id: input.assigneeId },
            select: { id: true },
          });
          if (!assignee) {
            throw new GraphQLError('Assignee not found', {
              extensions: {
                code: 'BAD_USER_INPUT',
                field: 'assigneeId',
              },
            });
          }
        }

        // Prepare update data
        const updateData: Prisma.TaskUpdateInput = {};
        
        if (input.title !== undefined) updateData.title = input.title.trim();
        if (input.description !== undefined) updateData.description = input.description?.trim();
        if (input.status !== undefined) {
          updateData.status = mapStatusToDb(input.status);
          // Set completedAt when status changes to completed
          if (input.status === 'COMPLETED' && existingTask.status !== 'completed') {
            updateData.completedAt = new Date();
          } else if (input.status !== 'COMPLETED') {
            updateData.completedAt = null;
          }
        }
        if (input.priority !== undefined) updateData.priority = mapPriorityToNumber(input.priority);
        if (input.dueDate !== undefined) updateData.dueDate = input.dueDate;
        if (input.assigneeId !== undefined) updateData.assigneeId = input.assigneeId;
        if (input.tags !== undefined) updateData.tags = input.tags;

        const updatedTask = await prisma.task.update({
          where: { id },
          data: updateData,
          include: {
            owner: true,
            assignee: true,
            project: true,
          },
        });

        // Map database fields to GraphQL schema
        return {
          ...updatedTask,
          user: updatedTask.owner,
          priority: mapPriorityToEnum(updatedTask.priority),
          status: updatedTask.status.toUpperCase(),
          source: updatedTask.source.toUpperCase(),
        };
      } catch (error) {
        if (error instanceof GraphQLError) {
          throw error;
        }
        throw new GraphQLError('Failed to update task', {
          extensions: {
            code: 'INTERNAL_SERVER_ERROR',
            originalError: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }
    },

    deleteTask: async (
      _: any,
      { id }: { id: string },
      context: GraphQLContext
    ) => {
      const user = requireAuth(context);

      try {
        const task = await prisma.task.findUnique({
          where: { id },
          select: { userId: true },
        });

        if (!task) {
          throw new GraphQLError('Task not found', {
            extensions: {
              code: 'NOT_FOUND',
            },
          });
        }

        // Check permission - only task owner can delete
        if (task.userId !== user.id) {
          throw new GraphQLError('Not authorized to delete this task', {
            extensions: {
              code: 'FORBIDDEN',
            },
          });
        }

        // Delete task and all related data (cascade deletes)
        await prisma.task.delete({
          where: { id },
        });

        return true;
      } catch (error) {
        if (error instanceof GraphQLError) {
          throw error;
        }
        throw new GraphQLError('Failed to delete task', {
          extensions: {
            code: 'INTERNAL_SERVER_ERROR',
            originalError: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }
    },

    completeTask: async (
      _: any,
      { id }: { id: string },
      context: GraphQLContext
    ) => {
      const user = requireAuth(context);

      try {
        const task = await prisma.task.findUnique({
          where: { id },
          select: { userId: true, assigneeId: true, status: true },
        });

        if (!task) {
          throw new GraphQLError('Task not found', {
            extensions: {
              code: 'NOT_FOUND',
            },
          });
        }

        // Check permission - user must be owner or assignee
        if (task.userId !== user.id && task.assigneeId !== user.id) {
          throw new GraphQLError('Not authorized to complete this task', {
            extensions: {
              code: 'FORBIDDEN',
            },
          });
        }

        // Check if task is already completed
        if (task.status === 'completed') {
          throw new GraphQLError('Task is already completed', {
            extensions: {
              code: 'BAD_USER_INPUT',
            },
          });
        }

        const completedTask = await prisma.task.update({
          where: { id },
          data: {
            status: 'completed',
            completedAt: new Date(),
          },
          include: {
            owner: true,
            assignee: true,
            project: true,
          },
        });

        // Map database fields to GraphQL schema
        return {
          ...completedTask,
          user: completedTask.owner,
          priority: mapPriorityToEnum(completedTask.priority),
          status: completedTask.status.toUpperCase(),
          source: completedTask.source.toUpperCase(),
        };
      } catch (error) {
        if (error instanceof GraphQLError) {
          throw error;
        }
        throw new GraphQLError('Failed to complete task', {
          extensions: {
            code: 'INTERNAL_SERVER_ERROR',
            originalError: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }
    },

    assignTask: async (
      _: any,
      { id, assigneeId }: { id: string; assigneeId: string },
      context: GraphQLContext
    ) => {
      const user = requireAuth(context);

      try {
        const task = await prisma.task.findUnique({
          where: { id },
          select: { userId: true },
        });

        if (!task) {
          throw new GraphQLError('Task not found', {
            extensions: {
              code: 'NOT_FOUND',
            },
          });
        }

        // Check permission - only task owner can assign
        if (task.userId !== user.id) {
          throw new GraphQLError('Not authorized to assign this task', {
            extensions: {
              code: 'FORBIDDEN',
            },
          });
        }

        // Validate assignee exists
        const assignee = await prisma.user.findUnique({
          where: { id: assigneeId },
          select: { id: true },
        });
        if (!assignee) {
          throw new GraphQLError('Assignee not found', {
            extensions: {
              code: 'BAD_USER_INPUT',
              field: 'assigneeId',
            },
          });
        }

        const updatedTask = await prisma.task.update({
          where: { id },
          data: {
            assigneeId,
          },
          include: {
            owner: true,
            assignee: true,
            project: true,
          },
        });

        // Map database fields to GraphQL schema
        return {
          ...updatedTask,
          user: updatedTask.owner,
          priority: mapPriorityToEnum(updatedTask.priority),
          status: updatedTask.status.toUpperCase(),
          source: updatedTask.source.toUpperCase(),
        };
      } catch (error) {
        if (error instanceof GraphQLError) {
          throw error;
        }
        throw new GraphQLError('Failed to assign task', {
          extensions: {
            code: 'INTERNAL_SERVER_ERROR',
            originalError: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }
    },

    addTaskComment: async (
      _: any,
      { taskId, comment }: AddTaskCommentArgs,
      context: GraphQLContext
    ) => {
      const user = requireAuth(context);

      try {
        // Verify task exists and user has access
        const task = await prisma.task.findUnique({
          where: { id: taskId },
          select: { userId: true, assigneeId: true },
        });

        if (!task) {
          throw new GraphQLError('Task not found', {
            extensions: {
              code: 'NOT_FOUND',
            },
          });
        }

        // Check permission - user must be owner or assignee
        if (task.userId !== user.id && task.assigneeId !== user.id) {
          throw new GraphQLError('Not authorized to comment on this task', {
            extensions: {
              code: 'FORBIDDEN',
            },
          });
        }

        // Validate comment content
        if (!comment.trim()) {
          throw new GraphQLError('Comment cannot be empty', {
            extensions: {
              code: 'BAD_USER_INPUT',
              field: 'comment',
            },
          });
        }

        const taskComment = await prisma.taskComment.create({
          data: {
            taskId,
            userId: user.id,
            comment: comment.trim(),
          },
          include: {
            user: true,
            task: true,
          },
        });

        return taskComment;
      } catch (error) {
        if (error instanceof GraphQLError) {
          throw error;
        }
        throw new GraphQLError('Failed to add comment', {
          extensions: {
            code: 'INTERNAL_SERVER_ERROR',
            originalError: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }
    },

    updateTaskComment: async (
      _: any,
      { id, comment }: UpdateTaskCommentArgs,
      context: GraphQLContext
    ) => {
      const user = requireAuth(context);

      try {
        const existingComment = await prisma.taskComment.findUnique({
          where: { id },
          select: { userId: true, taskId: true },
        });

        if (!existingComment) {
          throw new GraphQLError('Comment not found', {
            extensions: {
              code: 'NOT_FOUND',
            },
          });
        }

        // Check permission - only comment author can update
        if (existingComment.userId !== user.id) {
          throw new GraphQLError('Not authorized to update this comment', {
            extensions: {
              code: 'FORBIDDEN',
            },
          });
        }

        // Validate comment content
        if (!comment.trim()) {
          throw new GraphQLError('Comment cannot be empty', {
            extensions: {
              code: 'BAD_USER_INPUT',
              field: 'comment',
            },
          });
        }

        const updatedComment = await prisma.taskComment.update({
          where: { id },
          data: {
            comment: comment.trim(),
          },
          include: {
            user: true,
            task: true,
          },
        });

        return updatedComment;
      } catch (error) {
        if (error instanceof GraphQLError) {
          throw error;
        }
        throw new GraphQLError('Failed to update comment', {
          extensions: {
            code: 'INTERNAL_SERVER_ERROR',
            originalError: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }
    },

    deleteTaskComment: async (
      _: any,
      { id }: { id: string },
      context: GraphQLContext
    ) => {
      const user = requireAuth(context);

      try {
        const comment = await prisma.taskComment.findUnique({
          where: { id },
          select: { userId: true },
        });

        if (!comment) {
          throw new GraphQLError('Comment not found', {
            extensions: {
              code: 'NOT_FOUND',
            },
          });
        }

        // Check permission - only comment author can delete
        if (comment.userId !== user.id) {
          throw new GraphQLError('Not authorized to delete this comment', {
            extensions: {
              code: 'FORBIDDEN',
            },
          });
        }

        await prisma.taskComment.delete({
          where: { id },
        });

        return true;
      } catch (error) {
        if (error instanceof GraphQLError) {
          throw error;
        }
        throw new GraphQLError('Failed to delete comment', {
          extensions: {
            code: 'INTERNAL_SERVER_ERROR',
            originalError: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }
    },

    addTaskAttachment: async (
      _: any,
      { taskId, fileName, fileSize, fileType, storageUrl }: AddTaskAttachmentArgs,
      context: GraphQLContext
    ) => {
      const user = requireAuth(context);

      try {
        // Verify task exists and user has access
        const task = await prisma.task.findUnique({
          where: { id: taskId },
          select: { userId: true, assigneeId: true },
        });

        if (!task) {
          throw new GraphQLError('Task not found', {
            extensions: {
              code: 'NOT_FOUND',
            },
          });
        }

        // Check permission - user must be owner or assignee
        if (task.userId !== user.id && task.assigneeId !== user.id) {
          throw new GraphQLError('Not authorized to add attachments to this task', {
            extensions: {
              code: 'FORBIDDEN',
            },
          });
        }

        // Validate input
        if (!fileName.trim()) {
          throw new GraphQLError('File name is required', {
            extensions: {
              code: 'BAD_USER_INPUT',
              field: 'fileName',
            },
          });
        }

        if (!storageUrl.trim()) {
          throw new GraphQLError('Storage URL is required', {
            extensions: {
              code: 'BAD_USER_INPUT',
              field: 'storageUrl',
            },
          });
        }

        if (fileSize <= 0) {
          throw new GraphQLError('File size must be greater than 0', {
            extensions: {
              code: 'BAD_USER_INPUT',
              field: 'fileSize',
            },
          });
        }

        const attachment = await prisma.taskAttachment.create({
          data: {
            taskId,
            uploadedBy: user.id,
            fileName: fileName.trim(),
            fileSize,
            fileType,
            storageUrl: storageUrl.trim(),
          },
          include: {
            user: true,
            task: true,
          },
        });

        return attachment;
      } catch (error) {
        if (error instanceof GraphQLError) {
          throw error;
        }
        throw new GraphQLError('Failed to add attachment', {
          extensions: {
            code: 'INTERNAL_SERVER_ERROR',
            originalError: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }
    },

    deleteTaskAttachment: async (
      _: any,
      { id }: { id: string },
      context: GraphQLContext
    ) => {
      const user = requireAuth(context);

      try {
        const attachment = await prisma.taskAttachment.findUnique({
          where: { id },
          select: { uploadedBy: true },
        });

        if (!attachment) {
          throw new GraphQLError('Attachment not found', {
            extensions: {
              code: 'NOT_FOUND',
            },
          });
        }

        // Check permission - only uploader can delete
        if (attachment.uploadedBy !== user.id) {
          throw new GraphQLError('Not authorized to delete this attachment', {
            extensions: {
              code: 'FORBIDDEN',
            },
          });
        }

        await prisma.taskAttachment.delete({
          where: { id },
        });

        return true;
      } catch (error) {
        if (error instanceof GraphQLError) {
          throw error;
        }
        throw new GraphQLError('Failed to delete attachment', {
          extensions: {
            code: 'INTERNAL_SERVER_ERROR',
            originalError: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }
    },

    addTaskDependency: async (
      _: any,
      { taskId, dependsOnTaskId, dependencyType }: AddTaskDependencyArgs,
      context: GraphQLContext
    ) => {
      const user = requireAuth(context);

      try {
        // Verify both tasks exist and user has access
        const [task, dependsOnTask] = await Promise.all([
          prisma.task.findUnique({ 
            where: { id: taskId },
            select: { userId: true, assigneeId: true }
          }),
          prisma.task.findUnique({ 
            where: { id: dependsOnTaskId },
            select: { userId: true, assigneeId: true }
          }),
        ]);

        if (!task || !dependsOnTask) {
          throw new GraphQLError('One or both tasks not found', {
            extensions: {
              code: 'NOT_FOUND',
            },
          });
        }

        // Check permission - user must have access to the main task
        if (task.userId !== user.id && task.assigneeId !== user.id) {
          throw new GraphQLError('Not authorized to modify dependencies for this task', {
            extensions: {
              code: 'FORBIDDEN',
            },
          });
        }

        // Prevent circular dependencies
        if (taskId === dependsOnTaskId) {
          throw new GraphQLError('A task cannot depend on itself', {
            extensions: {
              code: 'BAD_USER_INPUT',
            },
          });
        }

        // Check if dependency already exists
        const existingDependency = await prisma.taskDependency.findUnique({
          where: {
            taskId_dependsOnTaskId: {
              taskId,
              dependsOnTaskId,
            },
          },
        });

        if (existingDependency) {
          throw new GraphQLError('Dependency already exists', {
            extensions: {
              code: 'BAD_USER_INPUT',
            },
          });
        }

        const dependency = await prisma.taskDependency.create({
          data: {
            taskId,
            dependsOnTaskId,
            dependencyType,
          },
        });

        return dependency;
      } catch (error) {
        if (error instanceof GraphQLError) {
          throw error;
        }
        throw new GraphQLError('Failed to add task dependency', {
          extensions: {
            code: 'INTERNAL_SERVER_ERROR',
            originalError: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }
    },

    removeTaskDependency: async (
      _: any,
      { taskId, dependsOnTaskId }: RemoveTaskDependencyArgs,
      context: GraphQLContext
    ) => {
      const user = requireAuth(context);

      try {
        // Verify task exists and user has permission
        const task = await prisma.task.findUnique({
          where: { id: taskId },
          select: { userId: true, assigneeId: true },
        });

        if (!task) {
          throw new GraphQLError('Task not found', {
            extensions: {
              code: 'NOT_FOUND',
            },
          });
        }

        // Check permission - user must have access to the task
        if (task.userId !== user.id && task.assigneeId !== user.id) {
          throw new GraphQLError('Not authorized to modify dependencies for this task', {
            extensions: {
              code: 'FORBIDDEN',
            },
          });
        }

        const dependency = await prisma.taskDependency.findUnique({
          where: {
            taskId_dependsOnTaskId: {
              taskId,
              dependsOnTaskId,
            },
          },
        });

        if (!dependency) {
          throw new GraphQLError('Dependency not found', {
            extensions: {
              code: 'NOT_FOUND',
            },
          });
        }

        await prisma.taskDependency.delete({
          where: {
            taskId_dependsOnTaskId: {
              taskId,
              dependsOnTaskId,
            },
          },
        });

        return true;
      } catch (error) {
        if (error instanceof GraphQLError) {
          throw error;
        }
        throw new GraphQLError('Failed to remove task dependency', {
          extensions: {
            code: 'INTERNAL_SERVER_ERROR',
            originalError: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }
    },
  },

  // Field resolvers
  Task: {
    user: async (parent: any, _: any, context: GraphQLContext) => {
      // Return already loaded data from includes, or fetch if needed
      if (parent.owner) {
        return parent.owner;
      }
      
      return await prisma.user.findUnique({
        where: { id: parent.userId },
      });
    },

    assignee: async (parent: any, _: any, context: GraphQLContext) => {
      if (!parent.assigneeId) return null;

      // Return already loaded data from includes, or fetch if needed
      if (parent.assignee) {
        return parent.assignee;
      }

      return await prisma.user.findUnique({
        where: { id: parent.assigneeId },
      });
    },

    parentTask: async (parent: any, _: any, context: GraphQLContext) => {
      if (!parent.parentTaskId) return null;

      // Return already loaded data from includes, or fetch if needed
      if (parent.parentTask) {
        return parent.parentTask;
      }

      return await prisma.task.findUnique({
        where: { id: parent.parentTaskId },
        include: {
          owner: true,
          assignee: true,
        },
      });
    },

    subtasks: async (parent: any, _: any, context: GraphQLContext) => {
      // Return already loaded data from includes, or fetch if needed
      if (parent.subTasks) {
        return parent.subTasks;
      }

      return await prisma.task.findMany({
        where: { parentTaskId: parent.id },
        include: {
          owner: true,
          assignee: true,
        },
      });
    },

    comments: async (parent: any, _: any, context: GraphQLContext) => {
      // Return already loaded data from includes, or fetch if needed
      if (parent.comments) {
        return parent.comments;
      }

      return await prisma.taskComment.findMany({
        where: { taskId: parent.id },
        include: { user: true },
        orderBy: { createdAt: 'desc' },
      });
    },

    attachments: async (parent: any, _: any, context: GraphQLContext) => {
      // Return already loaded data from includes, or fetch if needed
      if (parent.attachments) {
        return parent.attachments;
      }

      return await prisma.taskAttachment.findMany({
        where: { taskId: parent.id },
        include: { user: true },
        orderBy: { uploadedAt: 'desc' },
      });
    },

    dependencies: async (parent: any, _: any, context: GraphQLContext) => {
      // Return already loaded data from includes, or fetch if needed
      if (parent.dependencies) {
        return parent.dependencies;
      }

      return await prisma.taskDependency.findMany({
        where: { taskId: parent.id },
      });
    },

    project: async (parent: any, _: any, context: GraphQLContext) => {
      if (!parent.projectId) return null;

      // Return already loaded data from includes, or fetch if needed
      if (parent.project) {
        return parent.project;
      }

      return await prisma.project.findUnique({
        where: { id: parent.projectId },
      });
    },
  },

  TaskComment: {
    task: async (parent: any, _: any, context: GraphQLContext) => {
      // Return already loaded data from includes, or fetch if needed
      if (parent.task) {
        return parent.task;
      }

      return await prisma.task.findUnique({
        where: { id: parent.taskId },
      });
    },

    user: async (parent: any, _: any, context: GraphQLContext) => {
      // Return already loaded data from includes, or fetch if needed
      if (parent.user) {
        return parent.user;
      }

      return await prisma.user.findUnique({
        where: { id: parent.userId },
      });
    },
  },

  TaskAttachment: {
    task: async (parent: any, _: any, context: GraphQLContext) => {
      // Return already loaded data from includes, or fetch if needed
      if (parent.task) {
        return parent.task;
      }

      return await prisma.task.findUnique({
        where: { id: parent.taskId },
      });
    },

    user: async (parent: any, _: any, context: GraphQLContext) => {
      // Return already loaded data from includes, or fetch if needed
      if (parent.user) {
        return parent.user;
      }

      return await prisma.user.findUnique({
        where: { id: parent.uploadedBy },
      });
    },
  },
};