const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const fs = require('fs');
const path = require('path');
const { prisma } = require('../prisma-client');
const { hashPassword, verifyPassword, generateTokens, verifyToken } = require('../auth');
const { taskResolvers } = require('./resolvers/taskResolvers');

// Load GraphQL schema from file
const typeDefs = fs.readFileSync(path.join(__dirname, '../schema.graphql'), 'utf8');

// Combine all resolvers
const resolvers = {
  ...taskResolvers,
  
  // Override with auth resolvers
  Query: {
    ...taskResolvers.Query,
    
    health: () => "LifeOS Enhanced API is running!",
    
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

// Create Apollo Server
const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true,
  formatError: (err) => {
    console.error('GraphQL Error:', err);
    return {
      message: err.message,
      code: err.extensions?.code || 'INTERNAL_ERROR',
      path: err.path,
    };
  },
});

// Start server
const start = async () => {
  try {
    const PORT = process.env.PORT || 4000;
    
    const { url } = await startStandaloneServer(server, {
      listen: { port: Number(PORT), host: '0.0.0.0' },
      context: async ({ req }) => {
        // Get the user token from the headers
        const token = req.headers.authorization?.replace('Bearer ', '');
        let userId = null;
        
        if (token) {
          const decoded = verifyToken(token);
          if (decoded) {
            userId = decoded.userId;
          }
        }
        
        return { userId };
      },
      cors: {
        origin: ['https://lifeos-frontend-production.up.railway.app', 'http://localhost:3000'],
        credentials: true,
      },
    });
    
    console.log(`🚀 LifeOS Enhanced API Server ready at ${url}`);
    console.log(`📊 GraphQL Playground available at ${url}graphql`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🗄️  Database connected via Prisma`);
    console.log(`✨ Enhanced features: Advanced tasks, tags, due dates, metadata`);
    
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
            title: 'Complete project proposal',
            description: 'Write and review the Q1 project proposal for the new client.',
            priority: 'HIGH',
            status: 'PENDING',
            dueDate: tomorrow,
            userId: user.id,
            metadata: {
              source: 'manual',
              timeEstimate: 120,
              difficulty: 4
            }
          },
          {
            title: 'Team standup meeting',
            description: 'Daily team sync to discuss progress and blockers.',
            priority: 'MEDIUM',
            status: 'PENDING',
            userId: user.id,
            metadata: {
              source: 'calendar',
              recurring: true
            }
          },
          {
            title: 'Review code PRs',
            description: 'Review pending pull requests from the development team.',
            priority: 'MEDIUM',
            status: 'IN_PROGRESS',
            userId: user.id,
            metadata: {
              source: 'manual',
              timeEstimate: 45
            }
          }
        ];
        
        for (const taskData of demoTasks) {
          await prisma.task.create({
            data: taskData
          });
        }
        
        console.log(`✅ Demo tasks created`);
      }
    } catch (dbError) {
      console.error('❌ Database connection error:', dbError.message);
      console.log('⚠️  Server will continue without database functionality');
    }
  } catch (err) {
    console.error('Server startup error:', err);
    process.exit(1);
  }
};

start();