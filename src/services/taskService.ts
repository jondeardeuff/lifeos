import { PrismaClient, Priority, TaskStatus } from '@prisma/client';
import { createTaskSchema, updateTaskSchema, CreateTaskInput, UpdateTaskInput } from '../validators/taskValidation';
import { TagService } from './tagService';

export class TaskService {
  private prisma: PrismaClient;
  private tagService: TagService;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.tagService = new TagService(prisma);
  }

  async createTask(userId: string, input: CreateTaskInput) {
    const data = createTaskSchema.parse(input);

    const { tags = [], ...rest } = data;

    const tagConnections = await this.tagService.getOrCreateTags(userId, tags);

    return this.prisma.task.create({
      data: {
        ...rest,
        userId,
        priority: rest.priority ?? Priority.MEDIUM,
        status: rest.status ?? TaskStatus.PENDING,
        tags: {
          connect: tagConnections,
        },
      },
      include: {
        tags: true,
      },
    });
  }

  async updateTask(userId: string, taskId: string, input: UpdateTaskInput) {
    const data = updateTaskSchema.parse(input);

    // Ensure belongs to user
    const existing = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!existing || existing.userId !== userId) {
      throw new Error('Task not found');
    }

    const { tags, ...updateRest } = data as { tags?: string[] } & typeof data;

    let tagConnectData;
    if (tags) {
      if (tags.length > 10) throw new Error('Tasks cannot have more than 10 tags');
      const connections = await this.tagService.getOrCreateTags(userId, tags);
      tagConnectData = {
        set: connections,
      };
    }

    return this.prisma.task.update({
      where: { id: taskId },
      data: {
        ...updateRest,
        ...(tagConnectData ? { tags: tagConnectData } : {}),
      },
      include: { tags: true },
    });
  }

  async deleteTask(userId: string, taskId: string): Promise<boolean> {
    const existing = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!existing || existing.userId !== userId) return false;
    await this.prisma.task.delete({ where: { id: taskId } });
    return true;
  }
}