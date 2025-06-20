import { GraphQLError } from 'graphql';
import { scalarResolvers, GraphQLContext } from '../typeDefs.js';
import { authMockResolvers } from './auth-mock.js';

// Utility function to require authentication
export function requireAuth(context: GraphQLContext) {
  if (!context.isAuthenticated || !context.user) {
    throw new GraphQLError('Authentication required', {
      extensions: {
        code: 'UNAUTHENTICATED',
      },
    });
  }
  return context.user;
}

// Utility function to check if user owns resource
export function requireOwnership(resourceUserId: string, context: GraphQLContext) {
  const user = requireAuth(context);
  if (user.id !== resourceUserId) {
    throw new GraphQLError('Not authorized to access this resource', {
      extensions: {
        code: 'FORBIDDEN',
      },
    });
  }
  return user;
}

// Utility function for pagination
export function buildPaginationQuery(pagination?: {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) {
  const page = pagination?.page || 1;
  const limit = Math.min(pagination?.limit || 10, 100); // Max 100 items per page
  const offset = (page - 1) * limit;
  const sortBy = pagination?.sortBy || 'createdAt';
  const sortOrder = pagination?.sortOrder || 'desc';

  return {
    offset,
    limit,
    orderBy: {
      [sortBy]: sortOrder,
    },
  };
}

// Utility function to build cursor-based pagination
export function buildCursorConnection<T extends { id: string; createdAt: Date }>(
  items: T[],
  totalCount: number,
  limit: number,
  page: number
) {
  const edges = items.map((item) => ({
    node: item,
    cursor: Buffer.from(`${item.createdAt.getTime()}_${item.id}`).toString('base64'),
  }));

  const hasNextPage = page * limit < totalCount;
  const hasPreviousPage = page > 1;

  return {
    edges,
    pageInfo: {
      hasNextPage,
      hasPreviousPage,
      startCursor: edges[0]?.cursor || null,
      endCursor: edges[edges.length - 1]?.cursor || null,
    },
    totalCount,
  };
}

// Main resolver object
export const resolvers = {
  // Scalar resolvers
  ...scalarResolvers,

  // Query resolvers
  Query: {
    // Authentication queries
    me: authMockResolvers.Query.me,

    // Placeholder for other queries
    user: () => {
      throw new GraphQLError('User queries not implemented yet');
    },
    users: () => {
      throw new GraphQLError('User queries not implemented yet');
    },
    task: () => {
      throw new GraphQLError('Task queries not implemented yet');
    },
    tasks: () => {
      throw new GraphQLError('Task queries not implemented yet');
    },
    myTasks: () => {
      throw new GraphQLError('Task queries not implemented yet');
    },
    taskDependencies: () => {
      throw new GraphQLError('Task queries not implemented yet');
    },
    taskComments: () => {
      throw new GraphQLError('Task queries not implemented yet');
    },
    taskAttachments: () => {
      throw new GraphQLError('Task queries not implemented yet');
    },
  },

  // Mutation resolvers
  Mutation: {
    // Authentication mutations
    signup: authMockResolvers.Mutation.signup,
    login: authMockResolvers.Mutation.login,
    refreshToken: authMockResolvers.Mutation.refreshToken,
    logout: authMockResolvers.Mutation.logout,

    // Placeholder for other mutations
    updateProfile: () => {
      throw new GraphQLError('Profile updates not implemented yet');
    },
    updatePreferences: () => {
      throw new GraphQLError('Preferences updates not implemented yet');
    },
    createTask: () => {
      throw new GraphQLError('Task mutations not implemented yet');
    },
    updateTask: () => {
      throw new GraphQLError('Task mutations not implemented yet');
    },
    deleteTask: () => {
      throw new GraphQLError('Task mutations not implemented yet');
    },
    completeTask: () => {
      throw new GraphQLError('Task mutations not implemented yet');
    },
    addTaskComment: () => {
      throw new GraphQLError('Task comment mutations not implemented yet');
    },
    updateTaskComment: () => {
      throw new GraphQLError('Task comment mutations not implemented yet');
    },
    deleteTaskComment: () => {
      throw new GraphQLError('Task comment mutations not implemented yet');
    },
    addTaskAttachment: () => {
      throw new GraphQLError('Task attachment mutations not implemented yet');
    },
    deleteTaskAttachment: () => {
      throw new GraphQLError('Task attachment mutations not implemented yet');
    },
    addTaskDependency: () => {
      throw new GraphQLError('Task dependency mutations not implemented yet');
    },
    removeTaskDependency: () => {
      throw new GraphQLError('Task dependency mutations not implemented yet');
    },
  },
};

export default resolvers;