import { PrismaClient } from '@prisma/client';

export class TagService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async getOrCreateTags(userId: string, names: string[]): Promise<{ id: string }[]> {
    const cleaned = names.map((n) => n.toLowerCase().trim()).slice(0, 10);

    const existing = await this.prisma.taskTag.findMany({
      where: {
        userId,
        name: { in: cleaned },
      },
    });

    const existingNames = new Set(existing.map((t) => t.name));

    const toCreate = cleaned.filter((n) => !existingNames.has(n));

    const created = await Promise.all(
      toCreate.map((name) =>
        this.prisma.taskTag.create({
          data: {
            name,
            userId,
            color: TagService.generateRandomColor(),
          },
        }),
      ),
    );

    return [...existing, ...created].map((t) => ({ id: t.id }));
  }

  static generateRandomColor(): string {
    const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}