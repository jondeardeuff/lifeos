const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');

// Simple type definitions for demonstration
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
  }

  input SignupInput {
    email: String!
    password: String!
    firstName: String!
    lastName: String!
  }
`;

// Simple resolvers for demonstration
const resolvers = {
  Query: {
    health: () => "LifeOS API is running!",
    me: () => {
      return {
        id: "1",
        email: "demo@lifeos.dev",
        firstName: "Demo",
        lastName: "User",
        fullName: "Demo User",
        createdAt: new Date().toISOString(),
      };
    },
    tasks: () => {
      return [
        {
          id: "1",
          title: "Complete project setup",
          description: "Set up the initial project structure",
          status: "IN_PROGRESS",
          priority: "HIGH",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "2",
          title: "Deploy to Railway",
          description: "Deploy the application to Railway platform",
          status: "TODO",
          priority: "MEDIUM",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "3",
          title: "Add database integration",
          description: "Connect PostgreSQL database for persistent storage",
          status: "TODO",
          priority: "HIGH",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
    },
  },
  Mutation: {
    login: (_, { email, password }) => {
      // Simple demo login - in real app this would validate against database
      if (email === "test@lifeos.dev" && password === "password123") {
        return {
          user: {
            id: "1",
            email: email,
            firstName: "Test",
            lastName: "User",
            fullName: "Test User",
            createdAt: new Date().toISOString(),
          },
          accessToken: "demo-access-token-" + Date.now(),
          refreshToken: "demo-refresh-token-" + Date.now(),
        };
      }
      throw new Error("Invalid credentials");
    },
    signup: (_, { input }) => {
      // Simple demo signup - in real app this would create user in database
      return {
        user: {
          id: Date.now().toString(),
          email: input.email,
          firstName: input.firstName,
          lastName: input.lastName,
          fullName: `${input.firstName} ${input.lastName}`,
          createdAt: new Date().toISOString(),
        },
        accessToken: "demo-access-token-" + Date.now(),
        refreshToken: "demo-refresh-token-" + Date.now(),
      };
    },
  },
};

// Create Apollo Server
const server = new ApolloServer({
  typeDefs,
  resolvers,
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
      context: async ({ req, res }) => {
        return {
          req,
          res,
        };
      },
    });
    
    console.log(`🚀 LifeOS API Server ready at ${url}`);
    console.log(`📊 GraphQL Playground available at ${url}graphql`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`⚡ Demo credentials: test@lifeos.dev / password123`);
  } catch (err) {
    console.error('Server startup error:', err);
    process.exit(1);
  }
};

start();