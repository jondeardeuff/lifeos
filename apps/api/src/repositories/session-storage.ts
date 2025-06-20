import { AuthSession } from '@lifeos/types';
import { prisma } from '@lifeos/database';

export interface SessionStorage {
  get(sessionId: string): Promise<AuthSession | null>;
  set(sessionId: string, session: AuthSession): Promise<void>;
  delete(sessionId: string): Promise<void>;
  deleteByUserId(userId: string): Promise<void>;
}

export class PrismaSessionStorage implements SessionStorage {
  async get(sessionId: string): Promise<AuthSession | null> {
    const session = await prisma.authSession.findUnique({
      where: { sessionId },
    });

    if (!session) {
      return null;
    }

    // Map database session to AuthSession type
    return {
      user: {
        id: session.userId,
        email: session.userEmail,
        fullName: '', // Will be populated from user query if needed
        avatarUrl: undefined,
        timezone: 'UTC',
        emailVerified: false,
        phoneVerified: false,
        roles: [],
        settings: {},
        createdAt: session.createdAt,
        updatedAt: session.createdAt,
      },
      tokens: {
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        expiresAt: session.expiresAt,
        tokenType: 'Bearer',
      },
      sessionId: session.sessionId,
      createdAt: session.createdAt,
      lastAccessedAt: session.lastAccessedAt,
      expiresAt: session.expiresAt,
    };
  }

  async set(sessionId: string, session: AuthSession): Promise<void> {
    await prisma.authSession.upsert({
      where: { sessionId },
      create: {
        sessionId,
        userId: session.user.id,
        userEmail: session.user.email,
        accessToken: session.tokens.accessToken,
        refreshToken: session.tokens.refreshToken,
        expiresAt: session.expiresAt,
        lastAccessedAt: session.lastAccessedAt,
      },
      update: {
        accessToken: session.tokens.accessToken,
        refreshToken: session.tokens.refreshToken,
        expiresAt: session.expiresAt,
        lastAccessedAt: session.lastAccessedAt,
      },
    });
  }

  async delete(sessionId: string): Promise<void> {
    await prisma.authSession.delete({
      where: { sessionId },
    }).catch(() => {
      // Ignore if session doesn't exist
    });
  }

  async deleteByUserId(userId: string): Promise<void> {
    await prisma.authSession.deleteMany({
      where: { userId },
    });
  }

  async extend(sessionId: string, expiresAt: Date): Promise<void> {
    await prisma.authSession.update({
      where: { sessionId },
      data: { 
        expiresAt,
        lastAccessedAt: new Date(),
      },
    }).catch(() => {
      // Ignore if session doesn't exist
    });
  }

  async cleanup(): Promise<void> {
    await prisma.authSession.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  }
}