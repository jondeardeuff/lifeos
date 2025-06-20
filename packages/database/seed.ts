import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// System categories for financial transactions
const SYSTEM_CATEGORIES = [
  // Income categories
  {
    name: 'Salary & Wages',
    icon: '💰',
    color: '#10B981',
    isIncome: true,
    isTaxDeductible: false,
  },
  {
    name: 'Freelance Income',
    icon: '💼',
    color: '#059669',
    isIncome: true,
    isTaxDeductible: false,
  },
  {
    name: 'Investment Income',
    icon: '📈',
    color: '#065F46',
    isIncome: true,
    isTaxDeductible: false,
  },
  {
    name: 'Business Income',
    icon: '🏢',
    color: '#047857',
    isIncome: true,
    isTaxDeductible: false,
  },

  // Expense categories
  {
    name: 'Housing',
    icon: '🏠',
    color: '#EF4444',
    isIncome: false,
    isTaxDeductible: false,
  },
  {
    name: 'Transportation',
    icon: '🚗',
    color: '#F97316',
    isIncome: false,
    isTaxDeductible: false,
  },
  {
    name: 'Food & Dining',
    icon: '🍽️',
    color: '#F59E0B',
    isIncome: false,
    isTaxDeductible: false,
  },
  {
    name: 'Groceries',
    icon: '🛒',
    color: '#EAB308',
    isIncome: false,
    isTaxDeductible: false,
  },
  {
    name: 'Utilities',
    icon: '💡',
    color: '#84CC16',
    isIncome: false,
    isTaxDeductible: false,
  },
  {
    name: 'Healthcare',
    icon: '🏥',
    color: '#06B6D4',
    isIncome: false,
    isTaxDeductible: false,
  },
  {
    name: 'Insurance',
    icon: '🛡️',
    color: '#0EA5E9',
    isIncome: false,
    isTaxDeductible: false,
  },
  {
    name: 'Entertainment',
    icon: '🎬',
    color: '#3B82F6',
    isIncome: false,
    isTaxDeductible: false,
  },
  {
    name: 'Shopping',
    icon: '🛍️',
    color: '#6366F1',
    isIncome: false,
    isTaxDeductible: false,
  },
  {
    name: 'Education',
    icon: '📚',
    color: '#8B5CF6',
    isIncome: false,
    isTaxDeductible: true,
  },
  {
    name: 'Travel',
    icon: '✈️',
    color: '#A855F7',
    isIncome: false,
    isTaxDeductible: false,
  },
  {
    name: 'Personal Care',
    icon: '💄',
    color: '#EC4899',
    isIncome: false,
    isTaxDeductible: false,
  },
  {
    name: 'Gifts & Donations',
    icon: '🎁',
    color: '#F43F5E',
    isIncome: false,
    isTaxDeductible: true,
  },
  {
    name: 'Business Expenses',
    icon: '📊',
    color: '#64748B',
    isIncome: false,
    isTaxDeductible: true,
  },
  {
    name: 'Taxes',
    icon: '🏛️',
    color: '#475569',
    isIncome: false,
    isTaxDeductible: false,
  },
  {
    name: 'Miscellaneous',
    icon: '📋',
    color: '#6B7280',
    isIncome: false,
    isTaxDeductible: false,
  },
];

// Subcategories for some main categories
const SUBCATEGORIES = [
  // Housing subcategories
  { parentName: 'Housing', name: 'Rent/Mortgage', icon: '🏠', color: '#DC2626' },
  { parentName: 'Housing', name: 'Property Tax', icon: '🏛️', color: '#B91C1C' },
  { parentName: 'Housing', name: 'Home Maintenance', icon: '🔧', color: '#991B1B' },
  { parentName: 'Housing', name: 'Furniture', icon: '🛋️', color: '#7F1D1D' },

  // Transportation subcategories
  { parentName: 'Transportation', name: 'Gas', icon: '⛽', color: '#EA580C' },
  { parentName: 'Transportation', name: 'Car Payment', icon: '🚗', color: '#C2410C' },
  { parentName: 'Transportation', name: 'Car Insurance', icon: '🛡️', color: '#9A3412' },
  { parentName: 'Transportation', name: 'Maintenance', icon: '🔧', color: '#7C2D12' },
  { parentName: 'Transportation', name: 'Public Transit', icon: '🚌', color: '#F97316' },

  // Food & Dining subcategories
  { parentName: 'Food & Dining', name: 'Restaurants', icon: '🍴', color: '#D97706' },
  { parentName: 'Food & Dining', name: 'Fast Food', icon: '🍔', color: '#B45309' },
  { parentName: 'Food & Dining', name: 'Coffee', icon: '☕', color: '#92400E' },

  // Business Expenses subcategories
  { parentName: 'Business Expenses', name: 'Office Supplies', icon: '📎', color: '#334155' },
  { parentName: 'Business Expenses', name: 'Software', icon: '💻', color: '#1E293B' },
  { parentName: 'Business Expenses', name: 'Marketing', icon: '📢', color: '#0F172A' },
];

async function seedCategories() {
  console.log('🌱 Seeding categories...');

  // Create main categories first
  const createdCategories = new Map<string, string>(); // name -> id mapping

  for (const category of SYSTEM_CATEGORIES) {
    const existing = await prisma.category.findFirst({
      where: {
        name: category.name,
        userId: null,
      },
    });

    let created;
    if (existing) {
      created = existing;
    } else {
      created = await prisma.category.create({
        data: {
          name: category.name,
          icon: category.icon,
          color: category.color,
          isIncome: category.isIncome,
          isTaxDeductible: category.isTaxDeductible,
          userId: null, // System categories
        },
      });
    }
    createdCategories.set(category.name, created.id);
  }

  // Create subcategories
  for (const subcategory of SUBCATEGORIES) {
    const parentId = createdCategories.get(subcategory.parentName);
    if (parentId) {
      const existing = await prisma.category.findFirst({
        where: {
          name: subcategory.name,
          userId: null,
          parentCategoryId: parentId,
        },
      });

      if (!existing) {
        await prisma.category.create({
          data: {
            name: subcategory.name,
            icon: subcategory.icon,
            color: subcategory.color,
            parentCategoryId: parentId,
            isIncome: false, // Subcategories are typically expenses
            isTaxDeductible: false,
            userId: null, // System categories
          },
        });
      }
    }
  }

  console.log(`✅ Created ${SYSTEM_CATEGORIES.length + SUBCATEGORIES.length} categories`);
}

async function seedTestUser() {
  console.log('🌱 Seeding test user...');

  const existing = await prisma.user.findUnique({
    where: {
      email: 'test@lifeos.dev',
    },
  });

  let testUser;
  if (existing) {
    testUser = existing;
    console.log(`✅ Using existing test user: ${testUser.email}`);
  } else {
    testUser = await prisma.user.create({
      data: {
        email: 'test@lifeos.dev',
        fullName: 'Test User',
        timezone: 'America/New_York',
        settings: {
          theme: 'light',
          notifications: true,
        },
        preferences: {
          create: {
            voiceEnabled: true,
            voiceLanguage: 'en-US',
            notificationSettings: {
              email: true,
              push: true,
              taskReminders: true,
              budgetAlerts: true,
            },
            calendarSettings: {
              defaultView: 'week',
              workingHours: {
                start: '09:00',
                end: '17:00',
              },
            },
            financialSettings: {
              defaultCurrency: 'USD',
              budgetPeriod: 'monthly',
            },
          },
        },
        roles: {
          create: {
            role: 'user',
            scopeType: 'global',
          },
        },
      },
      include: {
        preferences: true,
        roles: true,
      },
    });

    console.log(`✅ Created test user: ${testUser.email}`);
  }
  return testUser;
}

async function seedSampleProjects(userId: string) {
  console.log('🌱 Seeding sample projects...');

  const projects = [
    {
      name: 'Personal Website Redesign',
      description: 'Complete redesign of personal portfolio website with modern UI/UX',
      clientName: 'Personal',
      status: 'active',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-03-31'),
      budgetAmount: 5000,
      color: '#3B82F6',
      createdBy: userId,
    },
    {
      name: 'Mobile App Development',
      description: 'Native iOS and Android app for task management',
      clientName: 'Startup XYZ',
      status: 'active',
      startDate: new Date('2024-02-01'),
      endDate: new Date('2024-06-30'),
      budgetAmount: 25000,
      color: '#10B981',
      createdBy: userId,
    },
    {
      name: 'E-commerce Platform',
      description: 'Full-stack e-commerce solution with payment integration',
      clientName: 'RetailCorp',
      status: 'planning',
      startDate: new Date('2024-04-01'),
      endDate: new Date('2024-08-31'),
      budgetAmount: 40000,
      color: '#F59E0B',
      createdBy: userId,
    },
  ];

  const createdProjects = [];
  for (const project of projects) {
    const created = await prisma.project.create({
      data: project,
    });
    createdProjects.push(created);
  }

  console.log(`✅ Created ${createdProjects.length} sample projects`);
  return createdProjects;
}

async function seedSampleTasks(userId: string, projects: any[]) {
  console.log('🌱 Seeding sample tasks...');

  const tasks = [
    // Personal Website Redesign tasks
    {
      title: 'Research design trends and competitors',
      description: 'Analyze current design trends and competitor websites for inspiration',
      userId,
      projectId: projects[0].id,
      status: 'completed',
      priority: 2,
      dueDate: new Date('2024-01-15'),
      completedAt: new Date('2024-01-14'),
      tags: ['research', 'design'],
    },
    {
      title: 'Create wireframes and mockups',
      description: 'Design low and high-fidelity wireframes for all pages',
      userId,
      projectId: projects[0].id,
      status: 'completed',
      priority: 1,
      dueDate: new Date('2024-01-30'),
      completedAt: new Date('2024-01-28'),
      tags: ['design', 'wireframes'],
    },
    {
      title: 'Develop homepage layout',
      description: 'Implement responsive homepage with hero section and portfolio grid',
      userId,
      projectId: projects[0].id,
      status: 'in_progress',
      priority: 1,
      dueDate: new Date('2024-02-15'),
      tags: ['development', 'frontend'],
    },
    {
      title: 'Implement contact form',
      description: 'Create functional contact form with validation and email integration',
      userId,
      projectId: projects[0].id,
      status: 'pending',
      priority: 2,
      dueDate: new Date('2024-02-28'),
      tags: ['development', 'backend'],
    },

    // Mobile App Development tasks
    {
      title: 'Set up development environment',
      description: 'Configure React Native, Xcode, and Android Studio',
      userId,
      projectId: projects[1].id,
      status: 'completed',
      priority: 1,
      dueDate: new Date('2024-02-05'),
      completedAt: new Date('2024-02-03'),
      tags: ['setup', 'environment'],
    },
    {
      title: 'Design app architecture',
      description: 'Define app structure, navigation flow, and state management',
      userId,
      projectId: projects[1].id,
      status: 'completed',
      priority: 1,
      dueDate: new Date('2024-02-12'),
      completedAt: new Date('2024-02-10'),
      tags: ['architecture', 'planning'],
    },
    {
      title: 'Implement user authentication',
      description: 'Create login, signup, and password reset functionality',
      userId,
      projectId: projects[1].id,
      status: 'in_progress',
      priority: 1,
      dueDate: new Date('2024-02-25'),
      tags: ['authentication', 'security'],
    },
    {
      title: 'Develop task creation flow',
      description: 'Build UI and logic for creating and editing tasks',
      userId,
      projectId: projects[1].id,
      status: 'pending',
      priority: 2,
      dueDate: new Date('2024-03-10'),
      tags: ['features', 'ui'],
    },

    // E-commerce Platform tasks
    {
      title: 'Requirements gathering',
      description: 'Meet with client to define detailed project requirements',
      userId,
      projectId: projects[2].id,
      status: 'pending',
      priority: 1,
      dueDate: new Date('2024-04-05'),
      tags: ['planning', 'client'],
    },
    {
      title: 'Database schema design',
      description: 'Design database structure for products, orders, and users',
      userId,
      projectId: projects[2].id,
      status: 'pending',
      priority: 1,
      dueDate: new Date('2024-04-15'),
      tags: ['database', 'design'],
    },
  ];

  const createdTasks = [];
  for (const task of tasks) {
    const created = await prisma.task.create({
      data: task,
    });
    createdTasks.push(created);
  }

  // Create some subtasks
  const subtasks = [
    {
      title: 'Research color schemes',
      description: 'Find modern color palettes that work well for portfolio sites',
      userId,
      projectId: projects[0].id,
      parentTaskId: createdTasks[0].id, // Child of "Research design trends"
      status: 'completed',
      priority: 3,
      completedAt: new Date('2024-01-12'),
      tags: ['research', 'colors'],
    },
    {
      title: 'Analyze competitor navigation',
      description: 'Study how top portfolio sites structure their navigation',
      userId,
      projectId: projects[0].id,
      parentTaskId: createdTasks[0].id, // Child of "Research design trends"
      status: 'completed',
      priority: 3,
      completedAt: new Date('2024-01-13'),
      tags: ['research', 'navigation'],
    },
  ];

  for (const subtask of subtasks) {
    await prisma.task.create({
      data: subtask,
    });
  }

  console.log(`✅ Created ${createdTasks.length + subtasks.length} sample tasks`);
  return createdTasks;
}

async function seedSampleTransactions(userId: string, projects: any[]) {
  console.log('🌱 Seeding sample transactions...');

  // Get some categories for the transactions
  const categories = await prisma.category.findMany({
    where: {
      userId: null, // System categories
    },
    take: 10,
  });

  const foodCategory = categories.find(c => c.name === 'Food & Dining');
  const transportCategory = categories.find(c => c.name === 'Transportation');
  const businessCategory = categories.find(c => c.name === 'Business Expenses');
  const incomeCategory = categories.find(c => c.name === 'Salary & Wages');

  const transactions = [
    // Income transactions
    {
      userId,
      amount: 5000.00,
      currency: 'USD',
      transactionDate: new Date('2024-01-01'),
      description: 'Freelance payment - Website project',
      merchantName: 'Client ABC',
      categoryId: incomeCategory?.id,
      projectId: projects[0].id,
      isPending: false,
      isTransfer: false,
    },
    {
      userId,
      amount: 2500.00,
      currency: 'USD',
      transactionDate: new Date('2024-01-15'),
      description: 'Monthly salary',
      merchantName: 'TechCorp Inc',
      categoryId: incomeCategory?.id,
      isPending: false,
      isTransfer: false,
    },

    // Expense transactions
    {
      userId,
      amount: -45.67,
      currency: 'USD',
      transactionDate: new Date('2024-01-02'),
      description: 'Lunch at downtown restaurant',
      merchantName: 'The Bistro',
      categoryId: foodCategory?.id,
      isPending: false,
      isTransfer: false,
    },
    {
      userId,
      amount: -85.00,
      currency: 'USD',
      transactionDate: new Date('2024-01-03'),
      description: 'Gas station fill-up',
      merchantName: 'Shell Station',
      categoryId: transportCategory?.id,
      isPending: false,
      isTransfer: false,
    },
    {
      userId,
      amount: -29.99,
      currency: 'USD',
      transactionDate: new Date('2024-01-05'),
      description: 'Adobe Creative Suite subscription',
      merchantName: 'Adobe Systems',
      categoryId: businessCategory?.id,
      projectId: projects[0].id,
      isPending: false,
      isTransfer: false,
    },
    {
      userId,
      amount: -120.00,
      currency: 'USD',
      transactionDate: new Date('2024-01-08'),
      description: 'Team dinner',
      merchantName: 'Olive Garden',
      categoryId: foodCategory?.id,
      projectId: projects[1].id,
      isPending: false,
      isTransfer: false,
    },
    {
      userId,
      amount: -12.50,
      currency: 'USD',
      transactionDate: new Date('2024-01-10'),
      description: 'Coffee meeting with client',
      merchantName: 'Starbucks',
      categoryId: foodCategory?.id,
      projectId: projects[2].id,
      isPending: false,
      isTransfer: false,
    },
  ];

  const createdTransactions = [];
  for (const transaction of transactions) {
    const created = await prisma.transaction.create({
      data: transaction,
    });
    createdTransactions.push(created);
  }

  console.log(`✅ Created ${createdTransactions.length} sample transactions`);
  return createdTransactions;
}

async function main() {
  console.log('🚀 Starting database seeding...');

  try {
    // Seed in order due to dependencies
    await seedCategories();
    const testUser = await seedTestUser();
    const projects = await seedSampleProjects(testUser.id);
    const tasks = await seedSampleTasks(testUser.id, projects);
    const transactions = await seedSampleTransactions(testUser.id, projects);

    console.log('✨ Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`- Categories: ${SYSTEM_CATEGORIES.length + SUBCATEGORIES.length}`);
    console.log(`- Users: 1`);
    console.log(`- Projects: ${projects.length}`);
    console.log(`- Tasks: ${tasks.length + 2} (including subtasks)`);
    console.log(`- Transactions: ${transactions.length}`);
    console.log('\n🔐 Test User Credentials:');
    console.log('Email: test@lifeos.dev');
    console.log('(No password required for development)');

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });