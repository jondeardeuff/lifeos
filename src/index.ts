import 'dotenv/config';
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { PrismaClient, User as PrismaUser, Priority, TaskStatus } from '@prisma/client';
import { TaskService } from './services/taskService';
import { TagService } from './services/tagService';

import typeDefs from './graphql/schema';

// Auth utilities (CommonJS -> ES import with interop)
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import {
  hashPassword,
  verifyPassword,
  generateTokens,
  verifyToken,
} from './auth';

// --------------------------------------------------
// Context
// --------------------------------------------------

interface Context {
  userId: string | null;
  prisma: PrismaClient;
  taskService: TaskService;
  tagService: TagService;
}

// --------------------------------------------------
// Prisma
// --------------------------------------------------

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

const taskService = new TaskService(prisma);
const tagService = new TagService(prisma);

// --------------------------------------------------
// Resolver helpers
// --------------------------------------------------

const toFullName = (user: PrismaUser): string => `${user.firstName} ${user.lastName}`;

// --------------------------------------------------
// Resolvers (initial implementation; expand per feature needs)
// --------------------------------------------------

const resolvers = {
  Query: {
    health: (): string => 'LifeOS API is running!',

    me: async (_: unknown, __: Record<string, never>, ctx: Context): Promise<PrismaUser | null> => {
      if (!ctx.userId) return null;
      const user = await ctx.prisma.user.findUnique({ where: { id: ctx.userId } });
      if (!user) return null;
      return { ...user, fullName: toFullName(user) } as unknown as PrismaUser; // TODO: replace with GraphQL User type mapping
    },

    tasks: async (
      _: unknown,
      args: {
        limit?: number;
        offset?: number;
      },
      ctx: Context,
    ): Promise<unknown[]> => {
      if (!ctx.userId) return [];
      return ctx.prisma.task.findMany({
        where: { userId: ctx.userId },
        orderBy: { createdAt: 'desc' },
        take: args.limit,
        skip: args.offset,
        include: { tags: true },
      });
    },

    taskTags: async (_: unknown, __: unknown, ctx: Context): Promise<unknown[]> => {
      if (!ctx.userId) return [];
      const tags = await ctx.prisma.taskTag.findMany({ where: { userId: ctx.userId } });
      // Compute taskCount for each tag
      return Promise.all(
        tags.map(async (t) => {
          const taskCount = await ctx.prisma.task.count({ where: { tags: { some: { id: t.id } } } });
          return { ...t, taskCount };
        }),
      );
    },

    taskStats: async (_: unknown, __: unknown, ctx: Context): Promise<unknown> => {
      if (!ctx.userId) return {
        total: 0,
        pending: 0,
        inProgress: 0,
        completed: 0,
        overdue: 0,
        dueToday: 0,
      };
      const tasks = await ctx.prisma.task.findMany({ where: { userId: ctx.userId } });
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const stats = {
        total: tasks.length,
        pending: 0,
        inProgress: 0,
        completed: 0,
        overdue: 0,
        dueToday: 0,
      };
      tasks.forEach((t) => {
        switch (t.status) {
          case TaskStatus.PENDING:
            stats.pending += 1;
            break;
          case TaskStatus.IN_PROGRESS:
            stats.inProgress += 1;
            break;
          case TaskStatus.COMPLETED:
            stats.completed += 1;
            break;
        }
        if (t.dueDate) {
          const taskDate = new Date(t.dueDate);
          if (taskDate < today) stats.overdue += 1;
          else if (taskDate.getTime() === today.getTime()) stats.dueToday += 1;
        }
      });
      return stats;
    },
  },
  Mutation: {
    signup: async (
      _: unknown,
      { input }: { input: { email: string; password: string; firstName: string; lastName: string } },
    ): Promise<unknown> => {
      const { email, password, firstName, lastName } = input;
      // Check if user exists
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        throw new Error('User already exists with this email');
      }

      const hashedPassword = await hashPassword(password);
      const user = await prisma.user.create({
        data: { email, password: hashedPassword, firstName, lastName },
      });

      const { accessToken, refreshToken } = generateTokens(user.id);
      return {
        user: { ...user, fullName: toFullName(user) },
        accessToken,
        refreshToken,
      } as unknown; // GraphQL type mapping handled by Apollo
    },

    login: async (
      _: unknown,
      { email, password }: { email: string; password: string },
    ): Promise<unknown> => {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        throw new Error('Invalid credentials');
      }
      const validPassword = await verifyPassword(password, user.password);
      if (!validPassword) {
        throw new Error('Invalid credentials');
      }
      const { accessToken, refreshToken } = generateTokens(user.id);
      return {
        user: { ...user, fullName: toFullName(user) },
        accessToken,
        refreshToken,
      } as unknown;
    },

    createTask: async (
      _: unknown,
      { input }: { input: any },
      ctx: Context,
    ): Promise<unknown> => {
      if (!ctx.userId) throw new Error('Not authenticated');
      return ctx.taskService.createTask(ctx.userId, input);
    },

    updateTask: async (
      _: unknown,
      { id, input }: { id: string; input: any },
      ctx: Context,
    ): Promise<unknown> => {
      if (!ctx.userId) throw new Error('Not authenticated');
      return ctx.taskService.updateTask(ctx.userId, id, input);
    },

    deleteTask: async (
      _: unknown,
      { id }: { id: string },
      ctx: Context,
    ): Promise<boolean> => {
      if (!ctx.userId) throw new Error('Not authenticated');
      return ctx.taskService.deleteTask(ctx.userId, id);
    },

    createTag: async (
      _: unknown,
      { name, color }: { name: string; color?: string },
      ctx: Context,
    ): Promise<unknown> => {
      if (!ctx.userId) throw new Error('Not authenticated');
      const tag = await ctx.prisma.taskTag.create({
        data: {
          name: name.toLowerCase().trim(),
          userId: ctx.userId,
          color: color ?? TagService.generateRandomColor(),
        },
      });
      return { ...tag, taskCount: 0 };
    },

    updateTag: async (
      _: unknown,
      { id, name, color }: { id: string; name?: string; color?: string },
      ctx: Context,
    ): Promise<unknown> => {
      if (!ctx.userId) throw new Error('Not authenticated');
      const tag = await ctx.prisma.taskTag.update({
        where: { id },
        data: {
          ...(name ? { name: name.toLowerCase().trim() } : {}),
          ...(color ? { color } : {}),
        },
      });
      const count = await ctx.prisma.task.count({
        where: {
          userId: ctx.userId,
          tags: { some: { id } },
        },
      });
      return { ...tag, taskCount: count };
    },

    deleteTag: async (
      _: unknown,
      { id }: { id: string },
      ctx: Context,
    ): Promise<boolean> => {
      if (!ctx.userId) throw new Error('Not authenticated');
      await ctx.prisma.taskTag.delete({ where: { id } });
      return true;
    },
  },

  Task: {
    tagCount: async (parent: any, _: unknown, ctx: Context): Promise<number> => {
      return parent.tags?.length ??
        (await ctx.prisma.taskTag.count({ where: { tasks: { some: { id: parent.id } } } }));
    },
    descriptionWordCount: (parent: any): number => {
      return parent.description ? parent.description.trim().split(/\s+/).length : 0;
    },
    isOverdue: (parent: any): boolean => {
      return parent.dueDate ? new Date(parent.dueDate) < new Date() : false;
    },
    dueDateStatus: (parent: any): string => {
      if (!parent.dueDate) return 'FUTURE';
      const today = new Date();
      const due = new Date(parent.dueDate);
      const dayDiff = Math.floor((due.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
      if (dayDiff < 0) return 'OVERDUE';
      if (dayDiff === 0) return 'DUE_TODAY';
      if (dayDiff <= 7) return 'DUE_SOON';
      return 'FUTURE';
    },
  },

  TaskTag: {
    taskCount: async (parent: any, _: unknown, ctx: Context): Promise<number> => {
      return ctx.prisma.task.count({ where: { tags: { some: { id: parent.id } } } });
    },
  },
};

// --------------------------------------------------
// Server
// --------------------------------------------------

const server = new ApolloServer<Context>({
  typeDefs,
  resolvers,
  introspection: true,
  formatError: (err) => {
    // eslint-disable-next-line no-console
    console.error('GraphQL Error:', err);
    return {
      message: err.message,
      code: err.extensions?.code ?? 'INTERNAL_ERROR',
    };
  },
});

const startServer = async (): Promise<void> => {
  const PORT = Number(process.env.PORT ?? 4000);

  const { url } = await startStandaloneServer(server, {
    listen: { port: PORT, host: '0.0.0.0' },
    context: async ({ req }): Promise<Context> => {
      const token = req.headers.authorization?.replace('Bearer ', '');
      let userId: string | null = null;

      if (token) {
        const decoded = verifyToken(token);
        if (decoded && typeof decoded === 'object' && 'userId' in decoded) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          userId = decoded.userId as string;
        }
      }

      return { userId, prisma, taskService, tagService };
    },
  });

  // eslint-disable-next-line no-console
  console.log(`🚀 LifeOS API Server ready at ${url}`);
};

void startServer();