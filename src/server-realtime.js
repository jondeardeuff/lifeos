const { ApolloServer } = require('@apollo/server');
const { createServer } = require('http');
const express = require('express');
const { expressMiddleware } = require('@apollo/server/express4');
const { ApolloServerPluginDrainHttpServer } = require('@apollo/server/plugin/drainHttpServer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { prisma } = require('../prisma-client');
const { hashPassword, verifyPassword, generateTokens, verifyToken } = require('../auth');
const { taskResolvers } = require('./resolvers/taskResolvers');

// Real-time infrastructure
const { RealtimeServer } = require('./realtime/socketServer');
const { EventBroadcaster } = require('./realtime/eventBroadcaster');
const { PresenceService } = require('./realtime/presenceService');
const { DataSyncService } = require('./realtime/dataSyncService');
const { SocketRateLimiter } = require('./realtime/rateLimiter');

// Load GraphQL schema from file
const typeDefs = fs.readFileSync(path.join(__dirname, '../schema.graphql'), 'utf8');

/**
 * Enhanced GraphQL resolvers with real-time integration
 */
function createEnhancedResolvers(dataSyncService) {
  return {
    ...taskResolvers,
    
    // Override with auth resolvers
    Query: {
      ...taskResolvers.Query,
      
      health: () => "LifeOS Real-time API is running!",
      
      me: async (_, __, { userId }) => {
        if (!userId) return null;
        
        const user = await prisma.user.findUnique({
          where: { id: userId },
        });
        
        if (!user) return null;
        
        return {
          ...user,
          fullName: `${user.firstName} ${user.lastName}`,
          createdAt: user.createdAt.toISOString(),
        };
      },
    },
    
    Mutation: {
      ...taskResolvers.Mutation,
      
      // Enhanced task mutations with real-time sync
      createTask: async (_, { input }, { userId, dataSyncService }) => {
        if (!userId) throw new Error('Not authenticated');
        
        const { TaskService } = require('./services/taskService');
        const task = await TaskService.createTask(input, userId);
        
        // Trigger real-time sync
        await dataSyncService.syncTaskCreate(task, userId);
        
        return TaskService.enrichTask(task);
      },
      
      updateTask: async (_, { id, input }, { userId, dataSyncService }) => {
        if (!userId) throw new Error('Not authenticated');
        
        // Get previous task state for change tracking
        const { TaskService } = require('./services/taskService');
        const previousTask = await TaskService.getTask(id, userId);
        
        if (!previousTask) {
          throw new Error('Task not found');
        }
        
        const updatedTask = await TaskService.updateTask(id, input, userId);
        
        // Trigger real-time sync with change information
        await dataSyncService.syncTaskUpdate(updatedTask, previousTask, userId);
        
        return TaskService.enrichTask(updatedTask);
      },
      
      deleteTask: async (_, { id }, { userId, dataSyncService }) => {
        if (!userId) throw new Error('Not authenticated');
        
        // Get task before deletion for sync
        const { TaskService } = require('./services/taskService');
        const task = await TaskService.getTask(id, userId);
        
        if (!task) {
          throw new Error('Task not found');
        }
        
        const result = await TaskService.deleteTask(id, userId);
        
        // Trigger real-time sync
        await dataSyncService.syncTaskDelete(task, userId);
        
        return result;
      },
      
      // Enhanced tag mutations with real-time sync
      createTag: async (_, { input }, { userId, dataSyncService }) => {
        if (!userId) throw new Error('Not authenticated');
        
        const { TagService } = require('./services/tagService');
        const { name, color } = input;
        const tag = await TagService.createTag(userId, name, color);
        
        // Trigger real-time sync
        await dataSyncService.syncTagCreate(tag, userId);
        
        return tag;
      },
      
      updateTag: async (_, { id, input }, { userId, dataSyncService }) => {
        if (!userId) throw new Error('Not authenticated');
        
        const { TagService } = require('./services/tagService');
        const tag = await TagService.updateTag(id, userId, input);
        
        // Trigger real-time sync
        await dataSyncService.syncTagUpdate(tag, userId);
        
        return tag;
      },
      
      deleteTag: async (_, { id }, { userId, dataSyncService }) => {
        if (!userId) throw new Error('Not authenticated');
        
        const { TagService } = require('./services/tagService');
        
        // Get tag before deletion for sync
        const tag = await prisma.taskTag.findFirst({
          where: { id, userId }
        });
        
        if (!tag) {
          throw new Error('Tag not found');
        }
        
        const result = await TagService.deleteTag(id, userId);
        
        // Trigger real-time sync
        await dataSyncService.syncTagDelete(tag, userId);
        
        return result;
      },
      
      // Bulk operations with real-time sync
      bulkUpdateTasks: async (_, { ids, input }, { userId, dataSyncService }) => {
        if (!userId) throw new Error('Not authenticated');
        
        const { TaskService } = require('./services/taskService');
        const tasks = await TaskService.bulkUpdateTasks(ids, input, userId);
        
        // Trigger real-time sync for bulk operation
        await dataSyncService.syncBulkOperation('update', tasks, userId);
        
        return tasks.map(task => TaskService.enrichTask(task));
      },
      
      bulkDeleteTasks: async (_, { ids }, { userId, dataSyncService }) => {
        if (!userId) throw new Error('Not authenticated');
        
        // Get tasks before deletion for sync
        const tasksToDelete = await prisma.task.findMany({
          where: { 
            id: { in: ids },
            userId 
          }
        });
        
        const { TaskService } = require('./services/taskService');
        const result = await TaskService.bulkDeleteTasks(ids, userId);
        
        // Trigger real-time sync for bulk operation
        await dataSyncService.syncBulkOperation('delete', tasksToDelete, userId);
        
        return result;
      },
      
      // Authentication mutations (unchanged)
      signup: async (_, { input }) => {
        const { email, password, firstName, lastName } = input;
        
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
          where: { email },
        });
        
        if (existingUser) {
          throw new Error('User already exists with this email');
        }
        
        // Hash password and create user
        const hashedPassword = await hashPassword(password);
        const user = await prisma.user.create({
          data: {
            email,
            password: hashedPassword,
            firstName,
            lastName,
          },
        });
        
        const { accessToken, refreshToken } = generateTokens(user.id);
        
        return {
          user: {
            ...user,
            fullName: `${user.firstName} ${user.lastName}`,
            createdAt: user.createdAt.toISOString(),
          },
          accessToken,
          refreshToken,
        };
      },
      
      login: async (_, { email, password }) => {
        const user = await prisma.user.findUnique({
          where: { email },
        });
        
        if (!user) {
          throw new Error('Invalid credentials');
        }
        
        const validPassword = await verifyPassword(password, user.password);
        if (!validPassword) {
          throw new Error('Invalid credentials');
        }
        
        const { accessToken, refreshToken } = generateTokens(user.id);
        
        return {
          user: {
            ...user,
            fullName: `${user.firstName} ${user.lastName}`,
            createdAt: user.createdAt.toISOString(),
          },
          accessToken,
          refreshToken,
        };
      },
    }
  };
}

/**
 * Start the enhanced server with real-time capabilities
 */
async function startEnhancedServer() {
  try {
    const app = express();
    const httpServer = createServer(app);
    
    // Initialize real-time infrastructure
    console.log('🔌 Initializing real-time infrastructure...');
    
    const realtimeServer = new RealtimeServer();
    await realtimeServer.initialize(httpServer);
    
    const io = realtimeServer.getIO();
    const eventBroadcaster = new EventBroadcaster(io);
    const presenceService = new PresenceService(eventBroadcaster);
    const dataSyncService = new DataSyncService(eventBroadcaster);
    const rateLimiter = new SocketRateLimiter();
    
    // Apply rate limiting middleware to WebSocket server
    io.use(rateLimiter.middleware());
    
    console.log('✅ Real-time infrastructure initialized');
    
    // Create enhanced resolvers with real-time services
    const resolvers = createEnhancedResolvers(dataSyncService);
    
    // Create Apollo Server
    const server = new ApolloServer({
      typeDefs,
      resolvers,
      introspection: true,
      plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
      formatError: (err) => {
        console.error('GraphQL Error:', err);
        return {
          message: err.message,
          code: err.extensions?.code || 'INTERNAL_ERROR',
          path: err.path,
        };
      },
    });
    
    await server.start();
    
    // Apply middleware
    app.use(
      '/graphql',
      cors({
        origin: process.env.CORS_ORIGIN?.split(',') || ["http://localhost:3000"],
        credentials: true,
      }),
      express.json(),
      expressMiddleware(server, {
        context: async ({ req }) => {
          // Get the user token from the headers
          const token = req.headers.authorization?.replace('Bearer ', '');
          let userId = null;
          
          if (token) {
            try {
              const decoded = verifyToken(token);
              if (decoded) {
                userId = decoded.userId;
              }
            } catch (error) {
              console.warn('Invalid token in GraphQL context:', error.message);
            }
          }
          
          return { 
            userId,
            dataSyncService,
            presenceService,
            eventBroadcaster,
            realtimeServer
          };
        },
      })
    );
    
    // Health check endpoint
    app.get('/health', (req, res) => {
      const stats = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        websocket: realtimeServer.getStats(),
        presence: presenceService.getStats(),
        rateLimiter: rateLimiter.getStats(),
        dataSync: dataSyncService.getStats()
      };
      res.json(stats);
    });
    
    // Start the HTTP server
    const PORT = process.env.PORT || 4000;
    
    await new Promise(resolve => {
      httpServer.listen({ port: Number(PORT), host: '0.0.0.0' }, resolve);
    });
    
    console.log(`🚀 LifeOS Real-time API Server ready at http://localhost:${PORT}/graphql`);
    console.log(`🔌 WebSocket server ready at ws://localhost:${PORT}`);
    console.log(`📊 GraphQL Playground available at http://localhost:${PORT}/graphql`);
    console.log(`🩺 Health check available at http://localhost:${PORT}/health`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🗄️  Database connected via Prisma`);
    console.log(`✨ Real-time features: WebSocket, Presence, Data Sync, Rate Limiting`);
    
    // Test database connection and create demo data
    try {
      await prisma.$connect();
      console.log('✅ Database connected successfully');
      
      // Create demo user if none exists
      const demoUser = await prisma.user.findUnique({
        where: { email: 'test@lifeos.dev' },
      });
      
      if (!demoUser) {
        const hashedPassword = await hashPassword('password123');
        const user = await prisma.user.create({
          data: {
            email: 'test@lifeos.dev',
            password: hashedPassword,
            firstName: 'Test',
            lastName: 'User',
          },
        });
        console.log(`✅ Demo user created: test@lifeos.dev / password123`);
        
        // Create some demo tags
        const demoTags = [
          { name: 'work', color: '#3B82F6' },
          { name: 'personal', color: '#10B981' },
          { name: 'urgent', color: '#EF4444' }
        ];
        
        for (const tagData of demoTags) {
          await prisma.taskTag.create({
            data: {
              ...tagData,
              userId: user.id
            }
          });
        }
        
        console.log(`✅ Demo tags created: work, personal, urgent`);
        
        // Create some demo tasks
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const demoTasks = [
          {
            title: 'Test real-time task updates',
            description: 'Create a task and watch it update in real-time across multiple browser tabs.',
            priority: 'HIGH',
            status: 'PENDING',
            dueDate: tomorrow,
            userId: user.id,
            metadata: {
              source: 'demo',
              realTimeEnabled: true
            }
          },
          {
            title: 'Explore presence detection',
            description: 'Open multiple tabs and see real-time presence indicators.',
            priority: 'MEDIUM',
            status: 'PENDING',
            userId: user.id,
            metadata: {
              source: 'demo',
              feature: 'presence'
            }
          }
        ];
        
        for (const taskData of demoTasks) {
          await prisma.task.create({
            data: taskData
          });
        }
        
        console.log(`✅ Demo tasks created for real-time testing`);
      }
    } catch (dbError) {
      console.error('❌ Database connection error:', dbError.message);
      console.log('⚠️  Server will continue without database functionality');
    }
    
    // Graceful shutdown
    const shutdown = async () => {
      console.log('🔌 Shutting down server...');
      
      try {
        await server.stop();
        httpServer.close();
        
        // Cleanup real-time services
        presenceService.destroy();
        rateLimiter.destroy();
        
        await prisma.$disconnect();
        
        console.log('✅ Server shutdown complete');
        process.exit(0);
      } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
      }
    };
    
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    
  } catch (err) {
    console.error('Server startup error:', err);
    process.exit(1);
  }
}

// Start the server
if (require.main === module) {
  startEnhancedServer();
}

module.exports = { startEnhancedServer };