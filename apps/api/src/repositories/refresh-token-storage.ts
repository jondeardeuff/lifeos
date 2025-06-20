import { RefreshTokenStorage } from '@lifeos/types';
import { prisma } from '@lifeos/database';

export class PrismaRefreshTokenStorage implements RefreshTokenStorage {
  async get(tokenFamily: string): Promise<{ token: string; userId: string; expiresAt: Date } | null> {
    const refreshToken = await prisma.refreshToken.findUnique({
      where: { tokenFamily },
    });

    if (!refreshToken) {
      return null;
    }

    return {
      token: refreshToken.token,
      userId: refreshToken.userId,
      expiresAt: refreshToken.expiresAt,
    };
  }

  async set(tokenFamily: string, token: string, userId: string, expiresAt: Date): Promise<void> {
    await prisma.refreshToken.upsert({
      where: { tokenFamily },
      create: {
        tokenFamily,
        token,
        userId,
        expiresAt,
      },
      update: {
        token,
        expiresAt,
      },
    });
  }

  async delete(tokenFamily: string): Promise<void> {
    await prisma.refreshToken.delete({
      where: { tokenFamily },
    }).catch(() => {
      // Ignore if token doesn't exist
    });
  }

  async deleteByUserId(userId: string): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }

  async cleanup(): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  }
}