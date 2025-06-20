import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { typeDefs } from './graphql/typeDefs';
import { resolvers } from './graphql/resolvers/index';

// Create Apollo Server
const server = new ApolloServer({
  typeDefs,
  resolvers,
  formatError: (err) => {
    // Log errors on server
    console.error('GraphQL Error:', err);
    
    // Return formatted error to client
    return {
      message: err.message,
      code: err.extensions?.code || 'INTERNAL_ERROR',
      path: err.path,
      locations: err.locations,
    };
  },
});

// Start server
const start = async () => {
  try {
    const PORT = process.env.PORT || 4000;
    
    const { url } = await startStandaloneServer(server, {
      listen: { port: Number(PORT) },
      context: async ({ req, res }) => {
        return {
          req,
          res,
        };
      },
    });
    
    console.log(`🚀 Server ready at ${url}`);
  } catch (err) {
    console.error('Server startup error:', err);
    process.exit(1);
  }
};

start();