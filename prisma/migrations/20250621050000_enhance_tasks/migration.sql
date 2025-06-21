-- Add new enum types
CREATE TYPE "Priority" AS ENUM ('LOWEST','LOW','MEDIUM','HIGH','HIGHEST');
CREATE TYPE "TaskStatus" AS ENUM ('PENDING','IN_PROGRESS','COMPLETED','CANCELLED');

-- Add new columns to existing tasks table
ALTER TABLE "tasks" 
  ADD COLUMN IF NOT EXISTS "description" TEXT,
  ADD COLUMN IF NOT EXISTS "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
  ADD COLUMN IF NOT EXISTS "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "dueDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "dueTime" TEXT,
  ADD COLUMN IF NOT EXISTS "timezone" TEXT,
  ADD COLUMN IF NOT EXISTS "metadata" JSONB;

-- Create TaskTag table
CREATE TABLE IF NOT EXISTS "task_tags" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" VARCHAR(50) NOT NULL,
  "color" TEXT NOT NULL DEFAULT '#3B82F6',
  "userId" TEXT NOT NULL,
  CONSTRAINT "task_tags_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create join table for many-to-many relation between tasks and task_tags (implicit in Prisma >=2.30 but explicit here for clarity)
CREATE TABLE IF NOT EXISTS "_TaskToTaskTag" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL,
  CONSTRAINT "_TaskToTaskTag_A_fkey" FOREIGN KEY ("A") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "_TaskToTaskTag_B_fkey" FOREIGN KEY ("B") REFERENCES "task_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS "Task_userId_status_idx" ON "tasks"("userId", "status");
CREATE INDEX IF NOT EXISTS "Task_userId_priority_idx" ON "tasks"("userId", "priority");
CREATE INDEX IF NOT EXISTS "Task_userId_dueDate_idx" ON "tasks"("userId", "dueDate");
CREATE INDEX IF NOT EXISTS "Task_title_idx" ON "tasks"("title");
CREATE INDEX IF NOT EXISTS "TaskTag_userId_idx" ON "task_tags"("userId");

-- Unique constraint for tag names per user
ALTER TABLE "task_tags" ADD CONSTRAINT IF NOT EXISTS "task_tags_userId_name_key" UNIQUE ("userId", "name");