const { TaskService } = require('../services/taskService');
const { TagService } = require('../services/tagService');
const { GraphQLScalarType } = require('graphql');
const { Kind } = require('graphql/language');

// Custom scalar types
const DateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  description: 'DateTime custom scalar type',
  serialize(value) {
    return value instanceof Date ? value.toISOString() : value;
  },
  parseValue(value) {
    return new Date(value);
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value);
    }
    return null;
  },
});

const JSONScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'JSON custom scalar type',
  serialize(value) {
    return value;
  },
  parseValue(value) {
    return value;
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      try {
        return JSON.parse(ast.value);
      } catch (error) {
        return null;
      }
    }
    return null;
  },
});

// Task resolvers
const taskResolvers = {
  // Custom scalars
  DateTime: DateTimeScalar,
  JSON: JSONScalar,
  
  // Task type resolvers
  Task: {
    isOverdue: (parent) => {
      return TaskService.enrichTask(parent).isOverdue;
    },
    dueDateStatus: (parent) => {
      return TaskService.enrichTask(parent).dueDateStatus;
    },
    tagCount: (parent) => {
      return parent.tags ? parent.tags.length : 0;
    },
    descriptionWordCount: (parent) => {
      return TaskService.enrichTask(parent).descriptionWordCount;
    },
    descriptionCharCount: (parent) => {
      return TaskService.enrichTask(parent).descriptionCharCount;
    },
    user: async (parent, _, { userId }) => {
      if (parent.user) return parent.user;
      
      const { prisma } = require('../../prisma-client');
      return await prisma.user.findUnique({
        where: { id: parent.userId }
      });
    },
    tags: async (parent) => {
      if (parent.tags) return parent.tags;
      
      const { prisma } = require('../../prisma-client');
      const task = await prisma.task.findUnique({
        where: { id: parent.id },
        include: { tags: true }
      });
      return task.tags || [];
    }
  },
  
  // TaskTag type resolvers
  TaskTag: {
    taskCount: async (parent) => {
      const { prisma } = require('../../prisma-client');
      return await prisma.task.count({
        where: {
          tags: {
            some: { id: parent.id }
          }
        }
      });
    },
    user: async (parent) => {
      if (parent.user) return parent.user;
      
      const { prisma } = require('../../prisma-client');
      return await prisma.user.findUnique({
        where: { id: parent.userId }
      });
    }
  },
  
  // Query resolvers
  Query: {
    tasks: async (_, args, { userId }) => {
      if (!userId) return [];
      
      const tasks = await TaskService.getTasks(args, userId);
      return tasks.map(task => TaskService.enrichTask(task));
    },
    
    task: async (_, { id }, { userId }) => {
      if (!userId) return null;
      
      const task = await TaskService.getTask(id, userId);
      return task ? TaskService.enrichTask(task) : null;
    },
    
    taskTags: async (_, __, { userId }) => {
      if (!userId) return [];
      
      return await TagService.getUserTags(userId);
    },
    
    taskStats: async (_, __, { userId }) => {
      if (!userId) {
        return {
          total: 0,
          pending: 0,
          inProgress: 0,
          completed: 0,
          cancelled: 0,
          overdue: 0,
          dueToday: 0
        };
      }
      
      return await TaskService.getTaskStats(userId);
    }
  },
  
  // Mutation resolvers
  Mutation: {
    createTask: async (_, { input }, { userId }) => {
      if (!userId) throw new Error('Not authenticated');
      
      const task = await TaskService.createTask(input, userId);
      return TaskService.enrichTask(task);
    },
    
    updateTask: async (_, { id, input }, { userId }) => {
      if (!userId) throw new Error('Not authenticated');
      
      const task = await TaskService.updateTask(id, input, userId);
      return TaskService.enrichTask(task);
    },
    
    deleteTask: async (_, { id }, { userId }) => {
      if (!userId) throw new Error('Not authenticated');
      
      return await TaskService.deleteTask(id, userId);
    },
    
    createTag: async (_, { input }, { userId }) => {
      if (!userId) throw new Error('Not authenticated');
      
      const { name, color } = input;
      return await TagService.createTag(userId, name, color);
    },
    
    updateTag: async (_, { id, input }, { userId }) => {
      if (!userId) throw new Error('Not authenticated');
      
      return await TagService.updateTag(id, userId, input);
    },
    
    deleteTag: async (_, { id }, { userId }) => {
      if (!userId) throw new Error('Not authenticated');
      
      return await TagService.deleteTag(id, userId);
    },
    
    bulkUpdateTasks: async (_, { ids, input }, { userId }) => {
      if (!userId) throw new Error('Not authenticated');
      
      const tasks = await TaskService.bulkUpdateTasks(ids, input, userId);
      return tasks.map(task => TaskService.enrichTask(task));
    },
    
    bulkDeleteTasks: async (_, { ids }, { userId }) => {
      if (!userId) throw new Error('Not authenticated');
      
      return await TaskService.bulkDeleteTasks(ids, userId);
    }
  }
};

module.exports = { taskResolvers };