import { type User, type UserPreferences, type Prisma } from '@prisma/client';
import prisma from '../client';

export interface CreateUserData {
  email: string;
  phone?: string;
  fullName: string;
  avatarUrl?: string;
  timezone?: string;
  settings?: Prisma.JsonValue;
}

export interface UpdateUserData {
  email?: string;
  phone?: string;
  fullName?: string;
  avatarUrl?: string;
  timezone?: string;
  settings?: Prisma.JsonValue;
}

/**
 * Create a new user with default preferences
 */
export async function createUser(data: CreateUserData): Promise<User> {
  return await prisma.user.create({
    data: {
      ...data,
      preferences: {
        create: {
          voiceEnabled: true,
          voiceLanguage: 'en-US',
          notificationSettings: {},
          calendarSettings: {},
          financialSettings: {},
        },
      },
    },
    include: {
      preferences: true,
    },
  });
}

/**
 * Find user by email
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  return await prisma.user.findUnique({
    where: { email },
    include: {
      preferences: true,
    },
  });
}

/**
 * Find user by ID with optional includes
 */
export async function findUserById(
  id: string,
  include?: Prisma.UserInclude
): Promise<User | null> {
  return await prisma.user.findUnique({
    where: { id },
    include,
  });
}

/**
 * Update user data
 */
export async function updateUser(
  id: string,
  data: UpdateUserData
): Promise<User> {
  return await prisma.user.update({
    where: { id },
    data,
  });
}

/**
 * Update user preferences
 */
export async function updateUserPreferences(
  userId: string,
  preferences: Partial<Omit<UserPreferences, 'userId' | 'updatedAt'>>
): Promise<UserPreferences> {
  return await prisma.userPreferences.upsert({
    where: { userId },
    create: {
      userId,
      voiceEnabled: preferences.voiceEnabled ?? true,
      voiceLanguage: preferences.voiceLanguage ?? 'en-US',
      notificationSettings: preferences.notificationSettings ?? {},
      calendarSettings: preferences.calendarSettings ?? {},
      financialSettings: preferences.financialSettings ?? {},
    },
    update: preferences,
  });
}

/**
 * Soft delete user (set deletedAt timestamp)
 */
export async function softDeleteUser(id: string): Promise<User> {
  return await prisma.user.update({
    where: { id },
    data: {
      deletedAt: new Date(),
    },
  });
}

/**
 * Get user with all related data
 */
export async function getUserWithRelations(id: string) {
  return await prisma.user.findUnique({
    where: { id },
    include: {
      preferences: true,
      roles: true,
      ownedOrganizations: true,
      organizationMember: {
        include: {
          organization: true,
        },
      },
      projects: {
        include: {
          project: true,
        },
      },
      tasks: {
        where: {
          status: {
            not: 'completed',
          },
        },
        orderBy: {
          dueDate: 'asc',
        },
        take: 10,
      },
      bankAccounts: {
        where: {
          isActive: true,
        },
      },
    },
  });
}