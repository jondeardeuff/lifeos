import { GraphQLError } from 'graphql';
import { GraphQLContext, SignupInput, LoginInput, RefreshTokenInput } from '../typeDefs.js';

// Mock user data
const mockUsers = new Map([
  ['test@example.com', {
    id: '1',
    email: 'test@example.com',
    fullName: 'Test User',
    avatarUrl: null,
    timezone: 'UTC',
    settings: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    password: 'password123', // In real app, this would be hashed
  }],
]);

// Mock tokens storage
const mockTokens = new Map<string, {
  userId: string;
  email: string;
  expiresAt: Date;
}>();

// Mock refresh tokens storage  
const mockRefreshTokens = new Map<string, {
  userId: string;
  email: string;
  expiresAt: Date;
}>();

function generateMockToken(userId: string, email: string): string {
  return `mock_access_token_${userId}_${Date.now()}`;
}

function generateMockRefreshToken(userId: string, email: string): string {
  return `mock_refresh_token_${userId}_${Date.now()}`;
}

export const authMockResolvers = {
  Query: {
    me: async (
      _: any,
      __: any,
      { req }: GraphQLContext
    ) => {
      try {
        // Extract token from authorization header
        const authHeader = req?.headers?.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
          throw new GraphQLError('Authentication required', {
            extensions: {
              code: 'UNAUTHENTICATED',
            },
          });
        }

        const token = authHeader.substring(7);
        const tokenData = mockTokens.get(token);
        
        if (!tokenData || tokenData.expiresAt < new Date()) {
          throw new GraphQLError('Invalid or expired token', {
            extensions: {
              code: 'UNAUTHENTICATED',
            },
          });
        }

        const user = mockUsers.get(tokenData.email);
        if (!user) {
          throw new GraphQLError('User not found', {
            extensions: {
              code: 'UNAUTHENTICATED',
            },
          });
        }

        return {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          avatarUrl: user.avatarUrl,
          timezone: user.timezone,
          settings: user.settings,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        };
      } catch (error) {
        if (error instanceof GraphQLError) {
          throw error;
        }
        throw new GraphQLError('Failed to get user profile', {
          extensions: {
            code: 'INTERNAL_SERVER_ERROR',
          },
        });
      }
    },
  },

  Mutation: {
    signup: async (
      _: any,
      { input }: { input: SignupInput },
      _context: GraphQLContext
    ) => {
      try {
        // Validate input
        if (!input.email || !input.password || !input.fullName) {
          throw new GraphQLError('Missing required fields', {
            extensions: {
              code: 'BAD_USER_INPUT',
              field: 'input',
            },
          });
        }

        // Check if user already exists
        if (mockUsers.has(input.email)) {
          throw new GraphQLError('User with this email already exists', {
            extensions: {
              code: 'BAD_USER_INPUT',
              field: 'email',
            },
          });
        }

        // Create new user
        const newUser = {
          id: String(mockUsers.size + 1),
          email: input.email,
          fullName: input.fullName,
          avatarUrl: null,
          timezone: input.timezone || 'UTC',
          settings: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          password: input.password, // In real app, this would be hashed
        };

        mockUsers.set(input.email, newUser);

        // Generate tokens
        const accessToken = generateMockToken(newUser.id, newUser.email);
        const refreshToken = generateMockRefreshToken(newUser.id, newUser.email);
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
        const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        // Store tokens
        mockTokens.set(accessToken, {
          userId: newUser.id,
          email: newUser.email,
          expiresAt,
        });

        mockRefreshTokens.set(refreshToken, {
          userId: newUser.id,
          email: newUser.email,
          expiresAt: refreshExpiresAt,
        });

        return {
          token: accessToken,
          refreshToken: refreshToken,
          user: {
            id: newUser.id,
            email: newUser.email,
            fullName: newUser.fullName,
            avatarUrl: newUser.avatarUrl,
            timezone: newUser.timezone,
            settings: newUser.settings,
            createdAt: newUser.createdAt,
            updatedAt: newUser.updatedAt,
          },
          expiresAt: expiresAt.toISOString(),
        };
      } catch (error) {
        if (error instanceof GraphQLError) {
          throw error;
        }
        throw new GraphQLError('Failed to create user', {
          extensions: {
            code: 'INTERNAL_SERVER_ERROR',
          },
        });
      }
    },

    login: async (
      _: any,
      { input }: { input: LoginInput },
      _context: GraphQLContext
    ) => {
      try {
        // Validate input
        if (!input.email || !input.password) {
          throw new GraphQLError('Email and password are required', {
            extensions: {
              code: 'BAD_USER_INPUT',
            },
          });
        }

        // Find user
        const user = mockUsers.get(input.email);
        if (!user || user.password !== input.password) {
          throw new GraphQLError('Invalid email or password', {
            extensions: {
              code: 'BAD_USER_INPUT',
              field: 'credentials',
            },
          });
        }

        // Generate tokens
        const accessToken = generateMockToken(user.id, user.email);
        const refreshToken = generateMockRefreshToken(user.id, user.email);
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
        const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        // Store tokens
        mockTokens.set(accessToken, {
          userId: user.id,
          email: user.email,
          expiresAt,
        });

        mockRefreshTokens.set(refreshToken, {
          userId: user.id,
          email: user.email,
          expiresAt: refreshExpiresAt,
        });

        return {
          token: accessToken,
          refreshToken: refreshToken,
          user: {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            avatarUrl: user.avatarUrl,
            timezone: user.timezone,
            settings: user.settings,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          },
          expiresAt: expiresAt.toISOString(),
        };
      } catch (error) {
        if (error instanceof GraphQLError) {
          throw error;
        }
        throw new GraphQLError('Failed to login', {
          extensions: {
            code: 'INTERNAL_SERVER_ERROR',
          },
        });
      }
    },

    refreshToken: async (
      _: any,
      { input }: { input: RefreshTokenInput },
      _context: GraphQLContext
    ) => {
      try {
        if (!input.refreshToken) {
          throw new GraphQLError('Refresh token is required', {
            extensions: {
              code: 'BAD_USER_INPUT',
            },
          });
        }

        const tokenData = mockRefreshTokens.get(input.refreshToken);
        if (!tokenData || tokenData.expiresAt < new Date()) {
          throw new GraphQLError('Invalid or expired refresh token', {
            extensions: {
              code: 'BAD_USER_INPUT',
              field: 'refreshToken',
            },
          });
        }

        const user = mockUsers.get(tokenData.email);
        if (!user) {
          throw new GraphQLError('User not found', {
            extensions: {
              code: 'INTERNAL_SERVER_ERROR',
            },
          });
        }

        // Generate new tokens
        const accessToken = generateMockToken(user.id, user.email);
        const newRefreshToken = generateMockRefreshToken(user.id, user.email);
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
        const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        // Remove old refresh token
        mockRefreshTokens.delete(input.refreshToken);

        // Store new tokens
        mockTokens.set(accessToken, {
          userId: user.id,
          email: user.email,
          expiresAt,
        });

        mockRefreshTokens.set(newRefreshToken, {
          userId: user.id,
          email: user.email,
          expiresAt: refreshExpiresAt,
        });

        return {
          token: accessToken,
          refreshToken: newRefreshToken,
          user: {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            avatarUrl: user.avatarUrl,
            timezone: user.timezone,
            settings: user.settings,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          },
          expiresAt: expiresAt.toISOString(),
        };
      } catch (error) {
        if (error instanceof GraphQLError) {
          throw error;
        }
        throw new GraphQLError('Failed to refresh token', {
          extensions: {
            code: 'INTERNAL_SERVER_ERROR',
          },
        });
      }
    },

    logout: async (
      _: any,
      __: any,
      { req }: GraphQLContext
    ) => {
      try {
        // Extract token from authorization header
        const authHeader = req?.headers?.authorization;
        if (authHeader?.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          mockTokens.delete(token);
        }

        return true;
      } catch (error) {
        // Even if logout fails, we return true for security
        return true;
      }
    },
  },
};