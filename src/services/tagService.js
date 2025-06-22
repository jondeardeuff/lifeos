const { prisma } = require('../../prisma-client');
const { validateTaskTag } = require('../validation/taskValidation');

/**
 * Tag management service with color support
 */
class TagService {
  /**
   * Creates a new tag for a user
   * @param {string} userId - User ID
   * @param {string} name - Tag name
   * @param {string} color - Hex color code (optional)
   * @returns {Promise<Object>} Created tag
   */
  static async createTag(userId, name, color) {
    const validation = validateTaskTag({ name, color });
    
    if (!validation.success) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }
    
    const tagData = validation.data;
    
    try {
      // Check if tag already exists for this user
      const existingTag = await prisma.taskTag.findUnique({
        where: {
          userId_name: {
            userId,
            name: tagData.name
          }
        }
      });
      
      if (existingTag) {
        throw new Error(`Tag "${tagData.name}" already exists`);
      }
      
      return await prisma.taskTag.create({
        data: {
          userId,
          name: tagData.name,
          color: tagData.color
        }
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new Error(`Tag "${tagData.name}" already exists`);
      }
      throw error;
    }
  }
  
  /**
   * Gets all tags for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} User's tags
   */
  static async getUserTags(userId) {
    return await prisma.taskTag.findMany({
      where: { userId },
      include: {
        _count: {
          select: { tasks: true }
        }
      },
      orderBy: { name: 'asc' }
    });
  }
  
  /**
   * Updates a tag
   * @param {string} tagId - Tag ID
   * @param {string} userId - User ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object>} Updated tag
   */
  static async updateTag(tagId, userId, updates) {
    const validation = validateTaskTag(updates);
    
    if (!validation.success) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }
    
    // Verify tag belongs to user
    const tag = await prisma.taskTag.findFirst({
      where: { id: tagId, userId }
    });
    
    if (!tag) {
      throw new Error('Tag not found');
    }
    
    // Check if new name conflicts with existing tag
    if (updates.name && updates.name !== tag.name) {
      const existingTag = await prisma.taskTag.findUnique({
        where: {
          userId_name: {
            userId,
            name: updates.name.toLowerCase().trim()
          }
        }
      });
      
      if (existingTag) {
        throw new Error(`Tag "${updates.name}" already exists`);
      }
    }
    
    return await prisma.taskTag.update({
      where: { id: tagId },
      data: validation.data
    });
  }
  
  /**
   * Deletes a tag
   * @param {string} tagId - Tag ID
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Success status
   */
  static async deleteTag(tagId, userId) {
    // Verify tag belongs to user
    const tag = await prisma.taskTag.findFirst({
      where: { id: tagId, userId }
    });
    
    if (!tag) {
      throw new Error('Tag not found');
    }
    
    await prisma.taskTag.delete({
      where: { id: tagId }
    });
    
    return true;
  }
  
  /**
   * Adds tags to a task, creating tags if they don't exist
   * @param {string} taskId - Task ID
   * @param {Array<string>} tagNames - Array of tag names
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Updated task with tags
   */
  static async addTagsToTask(taskId, tagNames, userId) {
    if (!tagNames || tagNames.length === 0) {
      return await prisma.task.findUnique({
        where: { id: taskId },
        include: { tags: true }
      });
    }
    
    // Validate max 10 tags per task
    if (tagNames.length > 10) {
      throw new Error('Tasks cannot have more than 10 tags');
    }
    
    // Get or create tags
    const tags = await this.getOrCreateTags(tagNames, userId);
    
    return await prisma.task.update({
      where: { id: taskId, userId },
      data: {
        tags: {
          set: [], // Clear existing tags
          connect: tags.map(tag => ({ id: tag.id }))
        }
      },
      include: { tags: true }
    });
  }
  
  /**
   * Gets existing tags or creates new ones
   * @param {Array<string>} tagNames - Array of tag names
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of tag objects
   */
  static async getOrCreateTags(tagNames, userId) {
    const normalizedNames = tagNames.map(name => name.toLowerCase().trim());
    const uniqueNames = [...new Set(normalizedNames)];
    
    // Get existing tags
    const existingTags = await prisma.taskTag.findMany({
      where: {
        userId,
        name: { in: uniqueNames }
      }
    });
    
    const existingTagNames = existingTags.map(tag => tag.name);
    const newTagNames = uniqueNames.filter(name => !existingTagNames.includes(name));
    
    // Create new tags
    const newTags = [];
    for (const name of newTagNames) {
      try {
        const newTag = await this.createTag(userId, name);
        newTags.push(newTag);
      } catch (error) {
        // If tag creation fails (e.g., due to race condition), try to fetch it
        const existingTag = await prisma.taskTag.findUnique({
          where: {
            userId_name: {
              userId,
              name
            }
          }
        });
        
        if (existingTag) {
          newTags.push(existingTag);
        } else {
          throw error;
        }
      }
    }
    
    return [...existingTags, ...newTags];
  }
  
  /**
   * Generates a random color for tags
   * @returns {string} Hex color code
   */
  static generateRandomColor() {
    const colors = [
      '#3B82F6', // Blue
      '#EF4444', // Red
      '#10B981', // Green
      '#F59E0B', // Yellow
      '#8B5CF6', // Purple
      '#EC4899', // Pink
      '#06B6D4', // Cyan
      '#84CC16', // Lime
      '#F97316', // Orange
      '#6366F1'  // Indigo
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }
  
  /**
   * Gets popular tags for a user (most used)
   * @param {string} userId - User ID
   * @param {number} limit - Number of tags to return
   * @returns {Promise<Array>} Popular tags
   */
  static async getPopularTags(userId, limit = 10) {
    return await prisma.taskTag.findMany({
      where: { userId },
      include: {
        _count: {
          select: { tasks: true }
        }
      },
      orderBy: {
        tasks: {
          _count: 'desc'
        }
      },
      take: limit
    });
  }
}

module.exports = { TagService };