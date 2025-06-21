const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const { prisma } = require('./prisma-client');
const { hashPassword, verifyPassword, generateTokens, verifyToken } = require('./auth');

// GraphQL type definitions
const typeDefs = `
  type User {
    id: ID!
    email: String!
    firstName: String!
    lastName: String!
    fullName: String!
    createdAt: String!
  }

  type AuthPayload {
    user: User!
    accessToken: String!
    refreshToken: String!
  }

  type Task {
    id: ID!
    title: String!
    description: String
    status: String!
    priority: String!
    createdAt: String!
    updatedAt: String!
  }

  type Query {
    me: User
    tasks: [Task!]!
    health: String!
  }

  type Mutation {
    login(email: String!, password: String!): AuthPayload!
    signup(input: SignupInput!): AuthPayload!
    createTask(input: CreateTaskInput!): Task!
    updateTask(id: ID!, input: UpdateTaskInput!): Task!
    deleteTask(id: ID!): Boolean!
  }

  input SignupInput {
    email: String!
    password: String!
    firstName: String!
    lastName: String!
  }

  input CreateTaskInput {
    title: String!
    description: String
    priority: String
  }

  input UpdateTaskInput {
    title: String
    description: String
    status: String
    priority: String
  }
`;

// GraphQL resolvers
const resolvers = {
  Query: {
    health: () => "LifeOS API is running!",
    
    me: async (_, __, { userId }) => {
      if (!userId) return null;
      
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });
      
      if (!user) return null;
      
      return {
        ...user,
        fullName: `${user.firstName} ${user.lastName}`,
      };
    },
    
    tasks: async (_, __, { userId }) => {
      if (!userId) return [];
      
      return await prisma.task.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
    },
  },
  
  Mutation: {
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
        },
        accessToken,
        refreshToken,
      };
    },
    
    createTask: async (_, { input }, { userId }) => {
      if (!userId) throw new Error('Not authenticated');
      
      return await prisma.task.create({
        data: {
          ...input,
          userId,
          priority: input.priority || 'MEDIUM',
        },
      });
    },
    
    updateTask: async (_, { id, input }, { userId }) => {
      if (!userId) throw new Error('Not authenticated');
      
      // Verify task belongs to user
      const task = await prisma.task.findFirst({
        where: { id, userId },
      });
      
      if (!task) {
        throw new Error('Task not found');
      }
      
      return await prisma.task.update({
        where: { id },
        data: input,
      });
    },
    
    deleteTask: async (_, { id }, { userId }) => {
      if (!userId) throw new Error('Not authenticated');
      
      // Verify task belongs to user
      const task = await prisma.task.findFirst({
        where: { id, userId },
      });
      
      if (!task) {
        throw new Error('Task not found');
      }
      
      await prisma.task.delete({ where: { id } });
      return true;
    },
  },
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
    
    console.log(`🚀 LifeOS API Server ready at ${url}`);
    console.log(`📊 GraphQL Playground available at ${url}graphql`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🗄️  Database connected via Prisma`);
    
    // Create a demo user on startup if none exists
    try {
      await prisma.$connect();
      console.log('✅ Database connected successfully');
      
      const demoUser = await prisma.user.findUnique({
        where: { email: 'test@lifeos.dev' },
      });
      
      if (!demoUser) {
        const hashedPassword = await hashPassword('password123');
        await prisma.user.create({
          data: {
            email: 'test@lifeos.dev',
            password: hashedPassword,
            firstName: 'Test',
            lastName: 'User',
          },
        });
        console.log(`✅ Demo user created: test@lifeos.dev / password123`);
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