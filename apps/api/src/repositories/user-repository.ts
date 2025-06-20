import { User, UserRole, Prisma, prisma } from '@lifeos/database';

export interface UserRepositoryInterface {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByPhone(phone: string): Promise<User | null>;
  findByPasswordResetToken(token: string): Promise<User | null>;
  findByEmailVerificationToken(token: string): Promise<User | null>;
  create(data: Prisma.UserCreateInput): Promise<User>;
  update(id: string, data: Prisma.UserUpdateInput): Promise<User>;
  setPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void>;
  setEmailVerificationToken(userId: string, token: string, expiresAt: Date): Promise<void>;
  getUserRoles(userId: string): Promise<UserRole[]>;
}

export class UserRepository implements UserRepositoryInterface {
  async findById(id: string): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { id },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  async findByPhone(phone: string): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { phone },
    });
  }

  async findByPasswordResetToken(token: string): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { passwordResetToken: token },
    });
  }

  async findByEmailVerificationToken(token: string): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { emailVerificationToken: token },
    });
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return await prisma.user.create({
      data: {
        ...data,
        email: data.email.toLowerCase(),
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
    });
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return await prisma.user.update({
      where: { id },
      data,
    });
  }

  async setPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordResetToken: token,
        passwordResetExpiresAt: expiresAt,
      },
    });
  }

  async setEmailVerificationToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        emailVerificationToken: token,
        emailVerificationExpiresAt: expiresAt,
      },
    });
  }

  async getUserRoles(userId: string): Promise<UserRole[]> {
    return await prisma.userRole.findMany({
      where: { userId },
    });
  }
}