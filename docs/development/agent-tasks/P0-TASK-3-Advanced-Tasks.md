# P0 Task 3: Advanced Task Properties

## Agent Assignment
**Agent Focus**: Backend Data Models  
**Priority**: P0 (Critical - Phase 1 MVP)  
**Dependencies**: Current basic task system  
**Estimated Duration**: 3-4 days  

## Objective
Extend the existing basic task system with advanced properties including descriptions, priority levels, due dates, status management, tagging system, and custom metadata to support comprehensive task management.

## Technical Context
- **Database**: PostgreSQL with Prisma ORM
- **Current Schema**: Basic User and Task models exist
- **Framework**: Node.js with GraphQL (Apollo Server)
- **Validation**: Zod schema validation
- **Timezone Support**: UTC storage with user timezone display

## Current Task Model (Baseline)
```prisma
// Current basic model in prisma/schema.prisma
model Task {
  id        String   @id @default(cuid())
  title     String
  status    String   @default("TODO")
  priority  String   @default("MEDIUM")
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

## Detailed Subtasks

### 1. Extend Prisma Schema for Advanced Task Properties
```prisma
// Enhanced Task model - prisma/schema.prisma
model Task {
  id          String   @id @default(cuid())
  title       String   @db.VarChar(500)
  description String?  @db.Text // 5000 char limit enforced in app logic
  priority    Priority @default(MEDIUM)
  status      TaskStatus @default(PENDING)
  dueDate     DateTime?
  dueTime     String?  // Store time separately for timezone handling
  timezone    String?  // User's timezone for due date
  
  // Metadata and organization
  tags        TaskTag[]
  metadata    Json?    // Custom metadata as JSONB
  
  // Relationships
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Audit fields
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([userId, status])
  @@index([userId, priority])
  @@index([userId, dueDate])
  @@index([title])
}

enum Priority {
  LOWEST   // 1
  LOW      // 2
  MEDIUM   // 3
  HIGH     // 4
  HIGHEST  // 5
}

enum TaskStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

model TaskTag {
  id     String @id @default(cuid())
  name   String @db.VarChar(50)
  color  String @default("#3B82F6") // Hex color code
  userId String
  
  // Relationships
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  tasks  Task[]
  
  @@unique([userId, name])
  @@index([userId])
}
```

### 2. Add Description Field (5000 Character Limit)
```typescript
// Validation schema
const taskDescriptionSchema = z.string()
  .max(5000, "Description cannot exceed 5000 characters")
  .optional();

// GraphQL type definition
type Task {
  description: String
  descriptionWordCount: Int
  descriptionCharCount: Int
}
```

**Implementation Requirements**:
- Store as TEXT field in database
- Enforce 5000 character limit in application logic
- Add word and character count utilities
- Support markdown formatting in description
- Implement description search functionality

### 3. Implement Priority Levels (1-5 Scale)
```typescript
// Priority enum with numeric values
enum Priority {
  LOWEST = 1,
  LOW = 2,
  MEDIUM = 3,
  HIGH = 4,
  HIGHEST = 5
}

// GraphQL resolvers
const priorityResolvers = {
  Query: {
    tasksByPriority: async (_, { priority, userId }) => {
      return await prisma.task.findMany({
        where: { userId, priority },
        orderBy: { createdAt: 'desc' }
      });
    }
  },
  Mutation: {
    updateTaskPriority: async (_, { taskId, priority, userId }) => {
      return await prisma.task.update({
        where: { id: taskId, userId },
        data: { priority }
      });
    }
  }
};
```

**Features**:
- Visual priority indicators (colors, icons)
- Priority-based sorting and filtering
- Bulk priority updates
- Priority change history tracking

### 4. Add Due Dates and Times with Timezone Support
```typescript
// Due date handling utilities
class DueDateManager {
  static formatDueDate(dueDate: Date, timezone: string): string {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(dueDate);
  }
  
  static isOverdue(dueDate: Date): boolean {
    return new Date() > dueDate;
  }
  
  static getDueDateStatus(dueDate: Date): 'overdue' | 'due-today' | 'due-soon' | 'future' {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const taskDate = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    
    if (taskDate < today) return 'overdue';
    if (taskDate.getTime() === today.getTime()) return 'due-today';
    if (taskDate <= new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)) return 'due-soon';
    return 'future';
  }
}
```

**Implementation Requirements**:
- Store due date as UTC in database
- Store user timezone separately
- Display dates in user's local timezone
- Support date and time selection
- Add overdue task detection
- Implement due date notifications

### 5. Create Task Status Enum (PENDING, IN_PROGRESS, COMPLETED, CANCELLED)
```typescript
// Status management
const taskStatusWorkflow = {
  PENDING: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'PENDING', 'CANCELLED'],
  COMPLETED: ['IN_PROGRESS'], // Allow reopening
  CANCELLED: ['PENDING'] // Allow reactivation
};

const validateStatusTransition = (currentStatus: TaskStatus, newStatus: TaskStatus): boolean => {
  return taskStatusWorkflow[currentStatus]?.includes(newStatus) ?? false;
};

// GraphQL mutations
const statusMutations = {
  updateTaskStatus: async (_, { taskId, status, userId }) => {
    const task = await prisma.task.findUnique({
      where: { id: taskId, userId }
    });
    
    if (!task) throw new Error('Task not found');
    
    if (!validateStatusTransition(task.status, status)) {
      throw new Error(`Invalid status transition from ${task.status} to ${status}`);
    }
    
    return await prisma.task.update({
      where: { id: taskId },
      data: { 
        status,
        completedAt: status === 'COMPLETED' ? new Date() : null
      }
    });
  }
};
```

### 6. Implement Tag System (Up to 10 Tags per Task)
```typescript
// Tag management service
class TagService {
  static async createTag(userId: string, name: string, color?: string): Promise<TaskTag> {
    return await prisma.taskTag.create({
      data: {
        userId,
        name: name.toLowerCase().trim(),
        color: color || this.generateRandomColor()
      }
    });
  }
  
  static async addTagsToTask(taskId: string, tagNames: string[], userId: string): Promise<Task> {
    // Validate max 10 tags per task
    if (tagNames.length > 10) {
      throw new Error('Tasks cannot have more than 10 tags');
    }
    
    // Get or create tags
    const tags = await this.getOrCreateTags(tagNames, userId);
    
    return await prisma.task.update({
      where: { id: taskId, userId },
      data: {
        tags: {
          connect: tags.map(tag => ({ id: tag.id }))
        }
      },
      include: { tags: true }
    });
  }
  
  static generateRandomColor(): string {
    const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}
```

**Tag Features**:
- Color-coded tags
- Tag autocomplete
- Popular tags suggestions
- Tag-based filtering and search
- Bulk tag operations

### 7. Add Custom Metadata JSONB Field
```typescript
// Metadata schema validation
const metadataSchema = z.object({
  // Voice command context
  voiceCommand?: z.string(),
  confidence?: z.number().min(0).max(1),
  
  // External integrations
  externalId?: z.string(),
  source?: z.enum(['voice', 'manual', 'email', 'calendar']),
  
  // Custom fields
  customFields?: z.record(z.string(), z.any()),
  
  // Tracking data
  timeEstimate?: z.number(), // minutes
  actualTime?: z.number(),   // minutes
  difficulty?: z.number().min(1).max(5),
  
  // Additional properties
  location?: z.string(),
  urls?: z.array(z.string().url()),
  attachments?: z.array(z.string())
}).optional();

// Usage in resolvers
const taskWithMetadata = await prisma.task.create({
  data: {
    title,
    description,
    userId,
    metadata: {
      source: 'voice',
      confidence: 0.95,
      timeEstimate: 30,
      customFields: {
        client: 'Acme Corp',
        projectCode: 'PROJ-001'
      }
    }
  }
});
```

### 8. Create Task Validation Rules
```typescript
// Comprehensive validation schema
const taskValidationSchema = z.object({
  title: z.string()
    .min(1, "Title is required")
    .max(500, "Title cannot exceed 500 characters")
    .trim(),
    
  description: z.string()
    .max(5000, "Description cannot exceed 5000 characters")
    .optional(),
    
  priority: z.nativeEnum(Priority),
  
  status: z.nativeEnum(TaskStatus),
  
  dueDate: z.date().optional(),
  
  tags: z.array(z.string())
    .max(10, "Tasks cannot have more than 10 tags")
    .optional(),
    
  metadata: metadataSchema
});

// Validation middleware
const validateTaskInput = (input: any) => {
  try {
    return taskValidationSchema.parse(input);
  } catch (error) {
    throw new Error(`Validation failed: ${error.message}`);
  }
};
```

## GraphQL Schema Updates

```graphql
# Enhanced Task type
type Task {
  id: ID!
  title: String!
  description: String
  priority: Priority!
  status: TaskStatus!
  dueDate: DateTime
  dueTime: String
  timezone: String
  tags: [TaskTag!]!
  metadata: JSON
  
  # Computed fields
  isOverdue: Boolean!
  dueDateStatus: DueDateStatus!
  tagCount: Int!
  descriptionWordCount: Int!
  
  # Relationships
  user: User!
  
  # Audit
  createdAt: DateTime!
  updatedAt: DateTime!
}

enum Priority {
  LOWEST
  LOW
  MEDIUM
  HIGH
  HIGHEST
}

enum TaskStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

enum DueDateStatus {
  OVERDUE
  DUE_TODAY
  DUE_SOON
  FUTURE
}

type TaskTag {
  id: ID!
  name: String!
  color: String!
  taskCount: Int!
}

# Input types
input CreateTaskInput {
  title: String!
  description: String
  priority: Priority
  status: TaskStatus
  dueDate: DateTime
  dueTime: String
  timezone: String
  tags: [String!]
  metadata: JSON
}

input UpdateTaskInput {
  title: String
  description: String
  priority: Priority
  status: TaskStatus
  dueDate: DateTime
  dueTime: String
  tags: [String!]
  metadata: JSON
}

# Queries
type Query {
  tasks(
    status: TaskStatus
    priority: Priority
    tags: [String!]
    dueDateStatus: DueDateStatus
    search: String
    limit: Int
    offset: Int
  ): [Task!]!
  
  task(id: ID!): Task
  taskTags: [TaskTag!]!
  taskStats: TaskStats!
}

# Mutations
type Mutation {
  createTask(input: CreateTaskInput!): Task!
  updateTask(id: ID!, input: UpdateTaskInput!): Task!
  deleteTask(id: ID!): Boolean!
  
  # Tag management
  createTag(name: String!, color: String): TaskTag!
  updateTag(id: ID!, name: String, color: String): TaskTag!
  deleteTag(id: ID!): Boolean!
  
  # Bulk operations
  bulkUpdateTasks(ids: [ID!]!, input: UpdateTaskInput!): [Task!]!
  bulkDeleteTasks(ids: [ID!]!): Boolean!
}

type TaskStats {
  total: Int!
  pending: Int!
  inProgress: Int!
  completed: Int!
  overdue: Int!
  dueToday: Int!
}
```

## Database Migration

```sql
-- Migration to extend task table
-- File: prisma/migrations/xxx_enhance_tasks/migration.sql

-- Add new columns to existing tasks table
ALTER TABLE "Task" 
ADD COLUMN "description" TEXT,
ADD COLUMN "dueDate" TIMESTAMP(3),
ADD COLUMN "dueTime" TEXT,
ADD COLUMN "timezone" TEXT,
ADD COLUMN "metadata" JSONB;

-- Update existing data
UPDATE "Task" SET 
  "priority" = CASE 
    WHEN "priority" = 'LOW' THEN 'LOW'
    WHEN "priority" = 'HIGH' THEN 'HIGH'
    ELSE 'MEDIUM'
  END,
  "status" = CASE
    WHEN "status" = 'TODO' THEN 'PENDING'
    WHEN "status" = 'DONE' THEN 'COMPLETED'
    ELSE 'PENDING'
  END;

-- Create TaskTag table
CREATE TABLE "TaskTag" (
  "id" TEXT NOT NULL,
  "name" VARCHAR(50) NOT NULL,
  "color" TEXT NOT NULL DEFAULT '#3B82F6',
  "userId" TEXT NOT NULL,
  
  CONSTRAINT "TaskTag_pkey" PRIMARY KEY ("id")
);

-- Create many-to-many relationship table
CREATE TABLE "_TaskToTaskTag" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL
);

-- Create indexes
CREATE INDEX "Task_userId_status_idx" ON "Task"("userId", "status");
CREATE INDEX "Task_userId_priority_idx" ON "Task"("userId", "priority");
CREATE INDEX "Task_userId_dueDate_idx" ON "Task"("userId", "dueDate");
CREATE INDEX "Task_title_idx" ON "Task"("title");
CREATE INDEX "TaskTag_userId_idx" ON "TaskTag"("userId");

-- Add foreign key constraints
ALTER TABLE "TaskTag" ADD CONSTRAINT "TaskTag_userId_fkey" 
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add unique constraint for tag names per user
ALTER TABLE "TaskTag" ADD CONSTRAINT "TaskTag_userId_name_key" 
  UNIQUE ("userId", "name");
```

## Testing Requirements

### Unit Tests
```typescript
describe('Enhanced Task Model', () => {
  test('creates task with all properties', async () => {
    const task = await taskService.createTask({
      title: 'Test Task',
      description: 'Test description',
      priority: Priority.HIGH,
      dueDate: new Date(),
      tags: ['urgent', 'work'],
      metadata: { source: 'test' }
    });
    
    expect(task.title).toBe('Test Task');
    expect(task.priority).toBe(Priority.HIGH);
    expect(task.tags).toHaveLength(2);
  });
  
  test('validates task input correctly', () => {
    expect(() => validateTaskInput({
      title: '', // Should fail - empty title
      description: 'x'.repeat(5001) // Should fail - too long
    })).toThrow();
  });
  
  test('enforces tag limit', async () => {
    const manyTags = Array.from({length: 11}, (_, i) => `tag${i}`);
    await expect(taskService.createTask({
      title: 'Test',
      tags: manyTags
    })).rejects.toThrow('more than 10 tags');
  });
});
```

### Integration Tests
- GraphQL resolver testing
- Database constraint validation
- Tag creation and assignment
- Due date timezone handling
- Metadata storage and retrieval

## Acceptance Criteria

### Functional Requirements
✅ Tasks support 500-character titles and 5000-character descriptions  
✅ Priority system (1-5) works with proper validation  
✅ Status transitions follow defined workflow  
✅ Due dates handle timezones correctly  
✅ Tag system supports up to 10 tags per task with colors  
✅ Custom metadata stores arbitrary JSON data  
✅ All validations prevent invalid data entry  

### Performance Requirements
✅ Task queries with filters complete in <200ms  
✅ Bulk operations handle 100+ tasks efficiently  
✅ Database indexes optimize common queries  
✅ Tag autocomplete responds in <100ms  

### Data Integrity Requirements
✅ All foreign key constraints enforced  
✅ Status transitions validated at database level  
✅ Tag uniqueness per user maintained  
✅ Timezone data stored consistently  

## Deployment Instructions

1. **Database Migration**:
   ```bash
   npx prisma migrate dev --name enhance-tasks
   npx prisma generate
   ```

2. **Update GraphQL Schema**:
   - Update type definitions
   - Implement new resolvers
   - Add validation middleware

3. **Update Frontend Integration**:
   - Update GraphQL queries/mutations
   - Add new UI components for advanced properties
   - Implement proper validation on client side

4. **Testing & Validation**:
   - Run full test suite
   - Validate migration with existing data
   - Test performance with large datasets

## Success Validation

Agent should provide:
- [ ] Updated Prisma schema with all enhancements
- [ ] Complete database migration scripts
- [ ] Updated GraphQL schema and resolvers
- [ ] Comprehensive validation system
- [ ] Test suite with >90% coverage
- [ ] Performance benchmark results
- [ ] Documentation for all new features

**This task provides the foundation for advanced task management and is critical for supporting voice command task creation in subsequent phases.**