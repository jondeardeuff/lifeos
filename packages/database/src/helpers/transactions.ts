import { type Transaction, type Prisma } from '@prisma/client';
import prisma from '../client';

export interface CreateTransactionData {
  userId: string;
  accountId?: string;
  externalId?: string;
  amount: number;
  currency?: string;
  transactionDate: Date;
  description?: string;
  merchantName?: string;
  categoryId?: string;
  projectId?: string;
  isPending?: boolean;
  isTransfer?: boolean;
  receiptUrl?: string;
  notes?: string;
}

export interface TransactionFilters {
  userId?: string;
  accountId?: string;
  categoryId?: string;
  projectId?: string;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  isPending?: boolean;
  isTransfer?: boolean;
  search?: string; // Search in description or merchant name
}

/**
 * Create a new transaction
 */
export async function createTransaction(data: CreateTransactionData): Promise<Transaction> {
  return await prisma.transaction.create({
    data: {
      ...data,
      currency: data.currency || 'USD',
    },
    include: {
      category: true,
      project: true,
      account: true,
    },
  });
}

/**
 * Create multiple transactions in batch
 */
export async function createTransactions(transactions: CreateTransactionData[]): Promise<Transaction[]> {
  const result = await prisma.$transaction(
    transactions.map((transaction) =>
      prisma.transaction.create({
        data: {
          ...transaction,
          currency: transaction.currency || 'USD',
        },
      })
    )
  );
  return result;
}

/**
 * Get transactions with filtering and pagination
 */
export async function getTransactions(
  filters: TransactionFilters = {},
  options: {
    page?: number;
    limit?: number;
    orderBy?: Prisma.TransactionOrderByWithRelationInput[];
  } = {}
): Promise<{
  transactions: Transaction[];
  total: number;
  page: number;
  totalPages: number;
}> {
  const { page = 1, limit = 50, orderBy = [{ transactionDate: 'desc' }] } = options;
  const skip = (page - 1) * limit;

  const where: Prisma.TransactionWhereInput = {};

  // Apply filters
  if (filters.userId) where.userId = filters.userId;
  if (filters.accountId) where.accountId = filters.accountId;
  if (filters.categoryId) where.categoryId = filters.categoryId;
  if (filters.projectId) where.projectId = filters.projectId;
  if (filters.isPending !== undefined) where.isPending = filters.isPending;
  if (filters.isTransfer !== undefined) where.isTransfer = filters.isTransfer;

  // Date range filter
  if (filters.startDate || filters.endDate) {
    where.transactionDate = {};
    if (filters.startDate) where.transactionDate.gte = filters.startDate;
    if (filters.endDate) where.transactionDate.lte = filters.endDate;
  }

  // Amount range filter
  if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
    where.amount = {};
    if (filters.minAmount !== undefined) where.amount.gte = filters.minAmount;
    if (filters.maxAmount !== undefined) where.amount.lte = filters.maxAmount;
  }

  // Search filter
  if (filters.search) {
    where.OR = [
      {
        description: {
          contains: filters.search,
          mode: 'insensitive',
        },
      },
      {
        merchantName: {
          contains: filters.search,
          mode: 'insensitive',
        },
      },
    ];
  }

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        category: true,
        project: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        account: {
          select: {
            id: true,
            accountName: true,
            institutionName: true,
          },
        },
      },
    }),
    prisma.transaction.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    transactions,
    total,
    page,
    totalPages,
  };
}

/**
 * Get transaction by ID with full details
 */
export async function getTransactionById(id: string): Promise<Transaction | null> {
  return await prisma.transaction.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      category: true,
      project: true,
      account: true,
    },
  });
}

/**
 * Update transaction
 */
export async function updateTransaction(
  id: string,
  data: Partial<CreateTransactionData>
): Promise<Transaction> {
  return await prisma.transaction.update({
    where: { id },
    data,
    include: {
      category: true,
      project: true,
      account: true,
    },
  });
}

/**
 * Delete transaction
 */
export async function deleteTransaction(id: string): Promise<void> {
  await prisma.transaction.delete({
    where: { id },
  });
}

/**
 * Get transaction summary by category for a user
 */
export async function getTransactionSummaryByCategory(
  userId: string,
  startDate?: Date,
  endDate?: Date
) {
  const where: Prisma.TransactionWhereInput = {
    userId,
  };

  if (startDate || endDate) {
    where.transactionDate = {};
    if (startDate) where.transactionDate.gte = startDate;
    if (endDate) where.transactionDate.lte = endDate;
  }

  return await prisma.transaction.groupBy({
    by: ['categoryId'],
    where,
    _sum: {
      amount: true,
    },
    _count: {
      id: true,
    },
    orderBy: {
      _sum: {
        amount: 'desc',
      },
    },
  });
}

/**
 * Get transaction summary by month
 */
export async function getTransactionSummaryByMonth(
  userId: string,
  year: number
) {
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year + 1, 0, 1);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      transactionDate: {
        gte: startDate,
        lt: endDate,
      },
    },
    select: {
      amount: true,
      transactionDate: true,
      categoryId: true,
    },
  });

  // Group by month
  const monthlyData = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    income: 0,
    expenses: 0,
    transactionCount: 0,
  }));

  transactions.forEach((transaction) => {
    const month = transaction.transactionDate.getMonth();
    const amount = Number(transaction.amount);
    
    monthlyData[month].transactionCount++;
    
    if (amount > 0) {
      monthlyData[month].income += amount;
    } else {
      monthlyData[month].expenses += Math.abs(amount);
    }
  });

  return monthlyData;
}

/**
 * Get recent transactions for a user
 */
export async function getRecentTransactions(
  userId: string,
  limit: number = 10
): Promise<Transaction[]> {
  return await prisma.transaction.findMany({
    where: { userId },
    take: limit,
    orderBy: [
      { transactionDate: 'desc' },
      { createdAt: 'desc' },
    ],
    include: {
      category: {
        select: {
          id: true,
          name: true,
          icon: true,
          color: true,
        },
      },
      project: {
        select: {
          id: true,
          name: true,
          color: true,
        },
      },
      account: {
        select: {
          id: true,
          accountName: true,
          institutionName: true,
        },
      },
    },
  });
}