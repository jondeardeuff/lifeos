import { type Category, type Prisma } from '@prisma/client';
import prisma from '../client';

export interface CreateCategoryData {
  name: string;
  userId?: string; // null for system categories
  parentCategoryId?: string;
  icon?: string;
  color?: string;
  isIncome?: boolean;
  isTaxDeductible?: boolean;
}

/**
 * Create a new category
 */
export async function createCategory(data: CreateCategoryData): Promise<Category> {
  return await prisma.category.create({
    data,
  });
}

/**
 * Create multiple categories in batch
 */
export async function createCategories(categories: CreateCategoryData[]): Promise<Category[]> {
  const result = await prisma.$transaction(
    categories.map((category) =>
      prisma.category.create({
        data: category,
      })
    )
  );
  return result;
}

/**
 * Get all categories for a user (including system categories)
 */
export async function getUserCategories(userId?: string): Promise<Category[]> {
  return await prisma.category.findMany({
    where: {
      OR: [
        { userId: null }, // System categories
        { userId }, // User categories
      ],
    },
    include: {
      parentCategory: true,
      subCategories: true,
      _count: {
        select: {
          transactions: true,
        },
      },
    },
    orderBy: [
      { userId: 'desc' }, // System categories first
      { name: 'asc' },
    ],
  });
}

/**
 * Get category hierarchy (parent categories with their children)
 */
export async function getCategoryHierarchy(userId?: string) {
  const categories = await prisma.category.findMany({
    where: {
      OR: [
        { userId: null }, // System categories
        { userId }, // User categories (if provided)
      ],
      parentCategoryId: null, // Only root categories
    },
    include: {
      subCategories: {
        include: {
          subCategories: true, // Support 2-level nesting
          _count: {
            select: {
              transactions: true,
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      },
      _count: {
        select: {
          transactions: true,
        },
      },
    },
    orderBy: [
      { userId: 'desc' }, // System categories first
      { name: 'asc' },
    ],
  });

  return categories;
}

/**
 * Find category by name (case-insensitive)
 */
export async function findCategoryByName(
  name: string,
  userId?: string
): Promise<Category | null> {
  return await prisma.category.findFirst({
    where: {
      name: {
        equals: name,
        mode: 'insensitive',
      },
      OR: [
        { userId: null }, // System categories
        { userId }, // User categories
      ],
    },
  });
}

/**
 * Get category with transaction count and recent transactions
 */
export async function getCategoryWithStats(id: string) {
  return await prisma.category.findUnique({
    where: { id },
    include: {
      parentCategory: true,
      subCategories: true,
      transactions: {
        take: 5,
        orderBy: {
          transactionDate: 'desc',
        },
        include: {
          user: {
            select: {
              fullName: true,
            },
          },
        },
      },
      _count: {
        select: {
          transactions: true,
          transactionRules: true,
          budgets: true,
        },
      },
    },
  });
}

/**
 * Update category
 */
export async function updateCategory(
  id: string,
  data: Partial<CreateCategoryData>
): Promise<Category> {
  return await prisma.category.update({
    where: { id },
    data,
  });
}

/**
 * Delete category (only if no transactions exist)
 */
export async function deleteCategory(id: string): Promise<void> {
  // Check if category has transactions
  const transactionCount = await prisma.transaction.count({
    where: { categoryId: id },
  });

  if (transactionCount > 0) {
    throw new Error('Cannot delete category with existing transactions');
  }

  // Check if category has subcategories
  const subCategoryCount = await prisma.category.count({
    where: { parentCategoryId: id },
  });

  if (subCategoryCount > 0) {
    throw new Error('Cannot delete category with subcategories');
  }

  await prisma.category.delete({
    where: { id },
  });
}

/**
 * Get system categories (predefined categories available to all users)
 */
export async function getSystemCategories(): Promise<Category[]> {
  return await prisma.category.findMany({
    where: {
      userId: null,
    },
    include: {
      subCategories: {
        orderBy: {
          name: 'asc',
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });
}