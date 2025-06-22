const { prisma } = require('../../prisma-client');
const { validateTaskInput, validateTaskUpdate, validateStatusTransition, getWordCount, getCharacterCount } = require('../validation/taskValidation');
const { TagService } = require('./tagService');
const { DueDateManager } = require('../utils/dueDateUtils');

/**
 * Enhanced task service with advanced properties
 */
class TaskService {
  /**
   * Creates a new task with validation
   * @param {Object} input - Task creation input
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Created task
   */
  static async createTask(input, userId) {
    const validation = validateTaskInput(input);
    
    if (!validation.success) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }
    
    const taskData = validation.data;
    const { tags, ...taskFields } = taskData;
    
    // Convert due date to UTC if provided
    if (taskFields.dueDate) {
      taskFields.dueDate = DueDateManager.toUTC(taskFields.dueDate, taskFields.timezone);
    }
    
    // Create task without tags first
    const task = await prisma.task.create({
      data: {
        ...taskFields,
        userId
      },
      include: {
        tags: true,
        user: true
      }
    });
    
    // Add tags if provided
    if (tags && tags.length > 0) {
      return await TagService.addTagsToTask(task.id, tags, userId);
    }
    
    return task;
  }
  
  /**
   * Updates a task with validation
   * @param {string} taskId - Task ID
   * @param {Object} input - Update input
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Updated task
   */
  static async updateTask(taskId, input, userId) {
    const validation = validateTaskUpdate(input);
    
    if (!validation.success) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }
    
    // Verify task belongs to user
    const existingTask = await prisma.task.findFirst({
      where: { id: taskId, userId }
    });
    
    if (!existingTask) {
      throw new Error('Task not found');
    }
    
    const updateData = validation.data;
    const { tags, status, ...taskFields } = updateData;
    
    // Validate status transition if status is being updated
    if (status && status !== existingTask.status) {
      const statusValidation = validateStatusTransition(existingTask.status, status);
      if (!statusValidation.valid) {
        throw new Error(statusValidation.message);
      }
      taskFields.status = status;
      
      // Set completion timestamp if completing task
      if (status === 'COMPLETED') {
        taskFields.completedAt = new Date();
      }
    }
    
    // Convert due date to UTC if provided
    if (taskFields.dueDate) {
      taskFields.dueDate = DueDateManager.toUTC(taskFields.dueDate, taskFields.timezone);
    }
    
    // Update task fields
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: taskFields,
      include: {
        tags: true,
        user: true
      }
    });
    
    // Update tags if provided
    if (tags !== undefined) {
      return await TagService.addTagsToTask(taskId, tags, userId);
    }
    
    return updatedTask;
  }
  
  /**
   * Gets tasks with filtering and pagination
   * @param {Object} filters - Query filters
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Filtered tasks
   */
  static async getTasks(filters, userId) {
    const {
      status,
      priority,
      tags,
      dueDateStatus,
      search,
      limit = 50,
      offset = 0
    } = filters;
    
    const where = { userId };
    
    // Apply filters
    if (status) {
      where.status = status;
    }
    
    if (priority) {
      where.priority = priority;
    }
    
    if (tags && tags.length > 0) {
      where.tags = {
        some: {
          name: { in: tags.map(tag => tag.toLowerCase()) }
        }
      };
    }
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    // Handle due date status filter
    if (dueDateStatus) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      switch (dueDateStatus) {
        case 'OVERDUE':
          where.dueDate = { lt: today };
          break;
        case 'DUE_TODAY':
          where.dueDate = {
            gte: today,
            lt: tomorrow
          };
          break;
        case 'DUE_SOON':
          where.dueDate = {
            gte: tomorrow,
            lte: weekFromNow
          };
          break;
        case 'FUTURE':
          where.dueDate = { gt: weekFromNow };
          break;
      }
    }
    
    const tasks = await prisma.task.findMany({
      where,
      include: {
        tags: true,
        user: true
      },
      orderBy: [
        { status: 'asc' }, // Pending first
        { priority: 'desc' }, // High priority first
        { dueDate: 'asc' }, // Earliest due dates first
        { createdAt: 'desc' } // Newest first
      ],
      skip: offset,
      take: limit
    });
    
    return tasks;
  }
  
  /**
   * Gets a single task by ID
   * @param {string} taskId - Task ID
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Task or null
   */
  static async getTask(taskId, userId) {
    return await prisma.task.findFirst({
      where: { id: taskId, userId },
      include: {
        tags: true,
        user: true
      }
    });
  }
  
  /**
   * Deletes a task
   * @param {string} taskId - Task ID
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Success status
   */
  static async deleteTask(taskId, userId) {
    const task = await prisma.task.findFirst({
      where: { id: taskId, userId }
    });
    
    if (!task) {
      throw new Error('Task not found');
    }
    
    await prisma.task.delete({
      where: { id: taskId }
    });
    
    return true;
  }
  
  /**
   * Bulk update tasks
   * @param {Array<string>} taskIds - Array of task IDs
   * @param {Object} input - Update input
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Updated tasks
   */
  static async bulkUpdateTasks(taskIds, input, userId) {
    // Validate input
    const validation = validateTaskUpdate(input);
    
    if (!validation.success) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }
    
    // Verify all tasks belong to user
    const tasks = await prisma.task.findMany({
      where: {
        id: { in: taskIds },
        userId
      }
    });
    
    if (tasks.length !== taskIds.length) {
      throw new Error('One or more tasks not found');
    }
    
    const updateData = validation.data;
    const { tags, ...taskFields } = updateData;
    
    // Update tasks
    const updatedTasks = [];
    
    for (const taskId of taskIds) {
      const updatedTask = await this.updateTask(taskId, input, userId);
      updatedTasks.push(updatedTask);
    }
    
    return updatedTasks;
  }
  
  /**
   * Bulk delete tasks
   * @param {Array<string>} taskIds - Array of task IDs
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Success status
   */
  static async bulkDeleteTasks(taskIds, userId) {
    // Verify all tasks belong to user
    const tasks = await prisma.task.findMany({
      where: {
        id: { in: taskIds },
        userId
      }
    });
    
    if (tasks.length !== taskIds.length) {
      throw new Error('One or more tasks not found');
    }
    
    await prisma.task.deleteMany({
      where: {
        id: { in: taskIds },
        userId
      }
    });
    
    return true;
  }
  
  /**
   * Gets task statistics for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Task statistics
   */
  static async getTaskStats(userId) {
    const [
      total,
      pending,
      inProgress,
      completed,
      cancelled,
      overdue,
      dueToday
    ] = await Promise.all([
      prisma.task.count({ where: { userId } }),
      prisma.task.count({ where: { userId, status: 'PENDING' } }),
      prisma.task.count({ where: { userId, status: 'IN_PROGRESS' } }),
      prisma.task.count({ where: { userId, status: 'COMPLETED' } }),
      prisma.task.count({ where: { userId, status: 'CANCELLED' } }),
      this.getOverdueCount(userId),
      this.getDueTodayCount(userId)
    ]);
    
    return {
      total,
      pending,
      inProgress,
      completed,
      cancelled,
      overdue,
      dueToday
    };
  }
  
  /**
   * Gets count of overdue tasks
   * @param {string} userId - User ID
   * @returns {Promise<number>} Count of overdue tasks
   */
  static async getOverdueCount(userId) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return await prisma.task.count({
      where: {
        userId,
        dueDate: { lt: today },
        status: { not: 'COMPLETED' }
      }
    });
  }
  
  /**
   * Gets count of tasks due today
   * @param {string} userId - User ID
   * @returns {Promise<number>} Count of tasks due today
   */
  static async getDueTodayCount(userId) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    
    return await prisma.task.count({
      where: {
        userId,
        dueDate: {
          gte: today,
          lt: tomorrow
        },
        status: { not: 'COMPLETED' }
      }
    });
  }
  
  /**
   * Enriches task with computed fields
   * @param {Object} task - Task object
   * @returns {Object} Enriched task
   */
  static enrichTask(task) {
    return {
      ...task,
      isOverdue: DueDateManager.isOverdue(task.dueDate),
      dueDateStatus: DueDateManager.getDueDateStatus(task.dueDate),
      tagCount: task.tags ? task.tags.length : 0,
      descriptionWordCount: getWordCount(task.description),
      descriptionCharCount: getCharacterCount(task.description)
    };
  }
}

module.exports = { TaskService };