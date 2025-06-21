import 'dotenv/config';
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { PrismaClient, User as PrismaUser, Task as PrismaTask } from '@prisma/client';

import typeDefs from './graphql/schema';

// Auth utilities (CommonJS -> ES import with interop)
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import {
  hashPassword,
  verifyPassword,
  generateTokens,
  verifyToken,
} from '../auth';

// --------------------------------------------------
// Context
// --------------------------------------------------

interface Context {
  userId: string | null;
  prisma: PrismaClient;
}

// --------------------------------------------------
// Prisma
// --------------------------------------------------

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

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
        status?: string;
        priority?: string;
        tags?: string[];
        dueDateStatus?: string;
        search?: string;
        limit?: number;
        offset?: number;
      },
      ctx: Context,
    ): Promise<PrismaTask[]> => {
      if (!ctx.userId) return [];

      // Basic filter implementation (enhance later)
      return ctx.prisma.task.findMany({
        where: { userId: ctx.userId },
        orderBy: { createdAt: 'desc' },
        take: args.limit,
        skip: args.offset,
      });
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

      return { userId, prisma };
    },
    cors: {
      origin: [
        'https://lifeos-frontend-production.up.railway.app',
        'http://localhost:3000',
      ],
      credentials: true,
    },
  });

  // eslint-disable-next-line no-console
  console.log(`🚀 LifeOS API Server ready at ${url}`);
};

void startServer();