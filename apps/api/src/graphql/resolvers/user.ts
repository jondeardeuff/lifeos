import { GraphQLError } from 'graphql';
import { GraphQLContext, PaginationInput, UpdateProfileInput, UpdatePreferencesInput } from '../typeDefs.js';
import { requireAuth, requireOwnership, buildPaginationQuery } from './index.js';
// Note: You'll need to import your database client
// import { db } from '@lifeos/database';

export const userResolvers = {
  Query: {
    me: async (
      _: any,
      __: any,
      context: GraphQLContext
    ) => {
      const user = requireAuth(context);
      
      try {
        // TODO: Implement database operations
        // const userData = await db.user.findUnique({
        //   where: { id: user.id },
        //   select: {
        //     id: true,
        //     email: true,
        //     phone: true,
        //     fullName: true,
        //     avatarUrl: true,
        //     timezone: true,
        //     settings: true,
        //     createdAt: true,
        //     updatedAt: true,
        //     deletedAt: true,
        //   },
        // });

        // Mock user data for development
        const userData = {
          id: user.id,
          email: user.email,
          phone: null,
          fullName: user.fullName,
          avatarUrl: null,
          timezone: user.timezone,
          settings: {},
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date(),
          deletedAt: null,
        };

        if (!userData) {
          throw new GraphQLError('User not found', {
            extensions: {
              code: 'NOT_FOUND',
            },
          });
        }

        return userData;
      } catch (error) {
        if (error instanceof GraphQLError) {
          throw error;
        }
        throw new GraphQLError('Failed to fetch user profile', {
          extensions: {
            code: 'INTERNAL_SERVER_ERROR',
          },
        });
      }
    },

    user: async (
      _: any,
      { id }: { id: string },
      context: GraphQLContext
    ) => {
      requireAuth(context);

      try {
        // TODO: Implement database operations
        // const user = await db.user.findUnique({
        //   where: { id },
        //   select: {
        //     id: true,
        //     email: true,
        //     phone: true,
        //     fullName: true,
        //     avatarUrl: true,
        //     timezone: true,
        //     settings: true,
        //     createdAt: true,
        //     updatedAt: true,
        //     deletedAt: true,
        //   },
        // });

        // Mock user data for development
        const user = {
          id,
          email: 'user@example.com',
          phone: null,
          fullName: 'Example User',
          avatarUrl: null,
          timezone: 'UTC',
          settings: {},
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date(),
          deletedAt: null,
        };

        if (!user) {
          throw new GraphQLError('User not found', {
            extensions: {
              code: 'NOT_FOUND',
            },
          });
        }

        return user;
      } catch (error) {
        if (error instanceof GraphQLError) {
          throw error;
        }
        throw new GraphQLError('Failed to fetch user', {
          extensions: {
            code: 'INTERNAL_SERVER_ERROR',
          },
        });
      }
    },

    users: async (
      _: any,
      { pagination }: { pagination?: PaginationInput },
      context: GraphQLContext
    ) => {
      requireAuth(context);

      try {
        const { offset, limit, orderBy } = buildPaginationQuery(pagination);

        // TODO: Implement database operations
        // const users = await db.user.findMany({
        //   skip: offset,
        //   take: limit,
        //   orderBy,
        //   select: {
        //     id: true,
        //     email: true,
        //     phone: true,
        //     fullName: true,
        //     avatarUrl: true,
        //     timezone: true,
        //     settings: true,
        //     createdAt: true,
        //     updatedAt: true,
        //     deletedAt: true,
        //   },
        // });

        // Mock users data for development
        const users = [
          {
            id: '1',
            email: 'user1@example.com',
            phone: null,
            fullName: 'User One',
            avatarUrl: null,
            timezone: 'UTC',
            settings: {},
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date(),
            deletedAt: null,
          },
          {
            id: '2',
            email: 'user2@example.com',
            phone: null,
            fullName: 'User Two',
            avatarUrl: null,
            timezone: 'EST',
            settings: {},
            createdAt: new Date('2024-01-02'),
            updatedAt: new Date(),
            deletedAt: null,
          },
        ];

        return users;
      } catch (error) {
        throw new GraphQLError('Failed to fetch users', {
          extensions: {
            code: 'INTERNAL_SERVER_ERROR',
          },
        });
      }
    },
  },

  Mutation: {
    updateProfile: async (
      _: any,
      { input }: { input: UpdateProfileInput },
      context: GraphQLContext
    ) => {
      const user = requireAuth(context);

      try {
        // Validate input
        if (input.email) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(input.email)) {
            throw new GraphQLError('Invalid email format', {
              extensions: {
                code: 'BAD_USER_INPUT',
                field: 'email',
              },
            });
          }
        }

        // TODO: Implement database operations
        // const updatedUser = await db.user.update({
        //   where: { id: user.id },
        //   data: {
        //     ...input,
        //     updatedAt: new Date(),
        //   },
        //   select: {
        //     id: true,
        //     email: true,
        //     phone: true,
        //     fullName: true,
        //     avatarUrl: true,
        //     timezone: true,
        //     settings: true,
        //     createdAt: true,
        //     updatedAt: true,
        //     deletedAt: true,
        //   },
        // });

        // Mock updated user for development
        const updatedUser = {
          id: user.id,
          email: input.email || user.email,
          phone: input.phone || null,
          fullName: input.fullName || user.fullName,
          avatarUrl: input.avatarUrl || null,
          timezone: input.timezone || user.timezone,
          settings: input.settings || {},
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date(),
          deletedAt: null,
        };

        return updatedUser;
      } catch (error) {
        if (error instanceof GraphQLError) {
          throw error;
        }
        throw new GraphQLError('Failed to update profile', {
          extensions: {
            code: 'INTERNAL_SERVER_ERROR',
          },
        });
      }
    },

    updatePreferences: async (
      _: any,
      { input }: { input: UpdatePreferencesInput },
      context: GraphQLContext
    ) => {
      const user = requireAuth(context);

      try {
        // TODO: Implement database operations
        // let preferences = await db.userPreferences.findUnique({
        //   where: { userId: user.id },
        // });

        // if (!preferences) {
        //   // Create default preferences if they don't exist
        //   preferences = await db.userPreferences.create({
        //     data: {
        //       userId: user.id,
        //       voiceEnabled: false,
        //       voiceLanguage: 'en-US',
        //       notificationSettings: {
        //         email: true,
        //         sms: false,
        //         push: true,
        //         taskReminders: true,
        //         eventReminders: true,
        //         dailySummary: false,
        //       },
        //       calendarSettings: {
        //         defaultView: 'week',
        //         weekStartsOn: 0,
        //         workingHours: {
        //           start: '09:00',
        //           end: '17:00',
        //         },
        //         timeZone: user.timezone,
        //       },
        //       financialSettings: {
        //         currency: 'USD',
        //         fiscalYearStart: 1,
        //       },
        //       updatedAt: new Date(),
        //     },
        //   });
        // } else {
        //   // Update existing preferences
        //   preferences = await db.userPreferences.update({
        //     where: { userId: user.id },
        //     data: {
        //       ...input,
        //       updatedAt: new Date(),
        //     },
        //   });
        // }

        // Mock preferences for development
        const preferences = {
          userId: user.id,
          voiceEnabled: input.voiceEnabled ?? false,
          voiceLanguage: input.voiceLanguage ?? 'en-US',
          notificationSettings: input.notificationSettings ?? {
            email: true,
            sms: false,
            push: true,
            taskReminders: true,
            eventReminders: true,
            dailySummary: false,
          },
          calendarSettings: input.calendarSettings ?? {
            defaultView: 'week',
            weekStartsOn: 0,
            workingHours: {
              start: '09:00',
              end: '17:00',
            },
            timeZone: user.timezone,
          },
          financialSettings: input.financialSettings ?? {
            currency: 'USD',
            fiscalYearStart: 1,
          },
          updatedAt: new Date(),
        };

        return preferences;
      } catch (error) {
        if (error instanceof GraphQLError) {
          throw error;
        }
        throw new GraphQLError('Failed to update preferences', {
          extensions: {
            code: 'INTERNAL_SERVER_ERROR',
          },
        });
      }
    },
  },
};