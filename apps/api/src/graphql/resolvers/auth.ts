import { GraphQLError } from 'graphql';
import { GraphQLContext, SignupInput, LoginInput, RefreshTokenInput } from '../typeDefs';
import { AuthService, AuthenticationError } from '../../services/auth-service';
import { UserRepository } from '../../repositories/user-repository';
import { PrismaSessionStorage } from '../../repositories/session-storage';
import { PrismaRefreshTokenStorage } from '../../repositories/refresh-token-storage';
import { authConfig } from '../../config/auth';
import { verifyAccessToken, extractTokenFromHeader } from '../../utils/jwt';

// Initialize auth service
const userRepository = new UserRepository();
const sessionStorage = new PrismaSessionStorage();
const refreshTokenStorage = new PrismaRefreshTokenStorage();

const authService = new AuthService({
  userRepository,
  sessionStorage,
  refreshTokenStorage,
  config: authConfig,
});

export const authResolvers = {
  Query: {
    me: async (
      _: any,
      __: any,
      { req }: GraphQLContext
    ) => {
      try {
        // Extract token from context or headers
        const authHeader = req?.headers?.authorization;
        const token = extractTokenFromHeader(authHeader);
        
        if (!token) {
          throw new GraphQLError('Authentication required', {
            extensions: {
              code: 'UNAUTHENTICATED',
            },
          });
        }

        // Verify token
        const payload = verifyAccessToken(token, authConfig.jwt.secret);
        
        // Get user profile
        const user = await authService.getProfile(payload.sub);
        
        return user;
      } catch (error) {
        if (error instanceof GraphQLError) {
          throw error;
        }
        if (error instanceof AuthenticationError) {
          throw new GraphQLError(error.message, {
            extensions: {
              code: error.code,
              field: error.field,
            },
          });
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

        // Check email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(input.email)) {
          throw new GraphQLError('Invalid email format', {
            extensions: {
              code: 'BAD_USER_INPUT',
              field: 'email',
            },
          });
        }

        // Register user using auth service
        await authService.register({
          email: input.email,
          password: input.password,
          fullName: input.fullName,
          timezone: input.timezone || 'UTC',
        });

        // Automatically login the user after successful registration
        const loginResult = await authService.login({
          email: input.email,
          password: input.password,
          rememberMe: false,
        });

        return {
          token: loginResult.tokens.accessToken,
          refreshToken: loginResult.tokens.refreshToken,
          user: loginResult.user,
          expiresAt: loginResult.tokens.expiresAt,
        };
      } catch (error) {
        if (error instanceof GraphQLError) {
          throw error;
        }
        if (error instanceof AuthenticationError) {
          throw new GraphQLError(error.message, {
            extensions: {
              code: error.code,
              field: error.field,
            },
          });
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

        // Login using auth service
        const result = await authService.login({
          email: input.email,
          password: input.password,
          rememberMe: false,
        });

        return {
          token: result.tokens.accessToken,
          refreshToken: result.tokens.refreshToken,
          user: result.user,
          expiresAt: result.tokens.expiresAt,
        };
      } catch (error) {
        if (error instanceof GraphQLError) {
          throw error;
        }
        if (error instanceof AuthenticationError) {
          throw new GraphQLError(error.message, {
            extensions: {
              code: error.code,
              field: error.field,
            },
          });
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

        // Refresh tokens using auth service
        const tokens = await authService.refreshToken({
          refreshToken: input.refreshToken,
        });

        // Get user info from the new access token
        const payload = verifyAccessToken(tokens.accessToken, authConfig.jwt.secret);
        const user = await authService.getProfile(payload.sub);

        return {
          token: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          user: user,
          expiresAt: tokens.expiresAt,
        };
      } catch (error) {
        if (error instanceof GraphQLError) {
          throw error;
        }
        if (error instanceof AuthenticationError) {
          throw new GraphQLError(error.message, {
            extensions: {
              code: error.code,
              field: error.field,
            },
          });
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
        // Extract token to get session ID
        const authHeader = req?.headers?.authorization;
        const token = extractTokenFromHeader(authHeader);
        
        if (token) {
          const payload = verifyAccessToken(token, authConfig.jwt.secret);
          await authService.logout(payload.sessionId);
        }

        return true;
      } catch (error) {
        // Even if logout fails, we return true for security
        // The client should clear their tokens regardless
        return true;
      }
    },
  },
};