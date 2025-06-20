# @lifeos/database

Database package for Life OS with Prisma ORM, helper functions, and seeding utilities.

## Setup

1. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Update DATABASE_URL with your PostgreSQL connection string
   ```

2. **Database Initialization**
   ```bash
   # Generate Prisma client
   pnpm db:generate
   
   # Push schema to database (for development)
   pnpm db:push
   
   # Or run migrations (for production)
   pnpm db:migrate:deploy
   
   # Seed the database with initial data
   pnpm db:seed
   ```

## Database Schema

The database includes the following main entities:

- **Users & Authentication**: User profiles, roles, and preferences
- **Organizations & Teams**: Multi-tenant organization support
- **Projects**: Project management with members and budgets
- **Tasks**: Hierarchical task management with dependencies
- **Calendar & Events**: Event scheduling and calendar integration
- **Financial Management**: Transactions, categories, budgets, and invoices
- **Voice & AI**: Voice commands and AI conversation history
- **Audit**: Comprehensive audit logging

## Helper Functions

The package includes comprehensive helper functions for common database operations:

### User Helpers
```typescript
import { createUser, findUserByEmail, updateUser } from '@lifeos/database';

// Create a new user
const user = await createUser({
  email: 'user@example.com',
  fullName: 'John Doe',
  timezone: 'America/New_York',
});

// Find user by email
const user = await findUserByEmail('user@example.com');

// Update user
await updateUser(userId, { fullName: 'Jane Doe' });
```

### Category Helpers
```typescript
import { getUserCategories, createCategory, getCategoryHierarchy } from '@lifeos/database';

// Get all categories (system + user categories)
const categories = await getUserCategories(userId);

// Create custom category
const category = await createCategory({
  name: 'Custom Category',
  userId,
  icon: '📁',
  color: '#3B82F6',
});

// Get category hierarchy
const hierarchy = await getCategoryHierarchy(userId);
```

### Transaction Helpers
```typescript
import { 
  createTransaction, 
  getTransactions, 
  getTransactionSummaryByCategory 
} from '@lifeos/database';

// Create transaction
const transaction = await createTransaction({
  userId,
  amount: -45.67,
  transactionDate: new Date(),
  description: 'Coffee purchase',
  categoryId,
});

// Get transactions with filtering
const { transactions, total } = await getTransactions({
  userId,
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
}, {
  page: 1,
  limit: 50,
});

// Get spending summary by category
const summary = await getTransactionSummaryByCategory(userId);
```

### Project Helpers
```typescript
import { 
  createProject, 
  getProjects, 
  addProjectMember 
} from '@lifeos/database';

// Create project
const project = await createProject({
  name: 'Website Redesign',
  description: 'Complete website overhaul',
  createdBy: userId,
  budgetAmount: 10000,
});

// Add team member
await addProjectMember(projectId, memberId, 'developer', 75.00);

// Get user's projects
const projects = await getUserProjects(userId);
```

### Task Helpers
```typescript
import { 
  createTask, 
  getTasks, 
  getAssignedTasks, 
  addTaskComment 
} from '@lifeos/database';

// Create task
const task = await createTask({
  title: 'Implement user authentication',
  description: 'Add login and signup functionality',
  userId,
  projectId,
  priority: 1,
  dueDate: new Date('2024-03-01'),
});

// Get assigned tasks
const assignedTasks = await getAssignedTasks(userId, 'in_progress');

// Add comment to task
await addTaskComment(taskId, userId, 'Making good progress on this!');
```

## Seeded Data

The seed script creates:

- **System Categories**: 20+ predefined financial categories with subcategories
- **Test User**: `test@lifeos.dev` for development
- **Sample Projects**: 3 example projects with different statuses
- **Sample Tasks**: 10+ tasks with various states and hierarchies
- **Sample Transactions**: Income and expense transactions across different categories

### Test User Credentials
- **Email**: `test@lifeos.dev`
- **Name**: Test User
- **Timezone**: America/New_York

## Scripts

- `pnpm build` - Build TypeScript files
- `pnpm dev` - Watch mode for development
- `pnpm db:generate` - Generate Prisma client
- `pnpm db:push` - Push schema changes to database
- `pnpm db:migrate:dev` - Create and apply new migration
- `pnpm db:migrate:deploy` - Apply migrations in production
- `pnpm db:seed` - Seed database with initial data
- `pnpm db:studio` - Open Prisma Studio
- `pnpm typecheck` - Type check without emitting files

## Environment Variables

```env
# Required
DATABASE_URL="postgresql://username:password@localhost:5432/lifeos_dev?schema=public"

# Optional (for development)
NODE_ENV="development"
```

## Database Connection

The package uses a singleton Prisma client with connection pooling and logging configured based on the environment:

- **Development**: Logs queries, errors, and warnings
- **Production**: Logs only errors
- **Connection Pooling**: Automatically managed by Prisma

## TypeScript Support

All helper functions are fully typed with TypeScript, providing excellent IntelliSense and type safety when working with database operations.

## Best Practices

1. **Use Transactions**: For operations that modify multiple tables
2. **Implement Soft Deletes**: Use `deletedAt` timestamps instead of hard deletes
3. **Index Optimization**: The schema includes optimized indexes for common queries
4. **Validation**: Validate data before database operations
5. **Error Handling**: Always handle database errors gracefully

## Contributing

When adding new helper functions:

1. Follow the existing naming conventions
2. Include proper TypeScript types
3. Add error handling
4. Update the exports in `src/helpers/index.ts`
5. Document the function with JSDoc comments