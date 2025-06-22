-- Create new enums for enhanced task system
DROP TYPE IF EXISTS "Priority" CASCADE;
CREATE TYPE "Priority" AS ENUM ('LOWEST', 'LOW', 'MEDIUM', 'HIGH', 'HIGHEST');

-- Update TaskStatus enum
ALTER TYPE "TaskStatus" ADD VALUE 'PENDING';
ALTER TYPE "TaskStatus" ADD VALUE 'CANCELLED';

-- Create TaskTag table
CREATE TABLE "task_tags" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#3B82F6',
    "userId" TEXT NOT NULL,

    CONSTRAINT "task_tags_pkey" PRIMARY KEY ("id")
);

-- Create many-to-many relationship table for tasks and tags
CREATE TABLE "_TaskToTaskTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- Update tasks table structure
ALTER TABLE "tasks" 
    ALTER COLUMN "title" TYPE VARCHAR(500),
    ADD COLUMN "dueDate" TIMESTAMP(3),
    ADD COLUMN "dueTime" TEXT,
    ADD COLUMN "timezone" TEXT,
    ADD COLUMN "metadata" JSONB;

-- Migrate existing priority data
ALTER TABLE "tasks" ADD COLUMN "new_priority" "Priority" DEFAULT 'MEDIUM';

UPDATE "tasks" SET "new_priority" = CASE 
    WHEN "priority" = 'LOW' THEN 'LOW'
    WHEN "priority" = 'HIGH' THEN 'HIGH'
    ELSE 'MEDIUM'
END;

-- Drop old priority column and rename new one
ALTER TABLE "tasks" DROP COLUMN "priority";
ALTER TABLE "tasks" RENAME COLUMN "new_priority" TO "priority";

-- Migrate existing status data - rename TODO to PENDING
UPDATE "tasks" SET "status" = 'PENDING' WHERE "status" = 'TODO';

-- Add indexes for performance
CREATE INDEX "tasks_userId_status_idx" ON "tasks"("userId", "status");
CREATE INDEX "tasks_userId_priority_idx" ON "tasks"("userId", "priority");
CREATE INDEX "tasks_userId_dueDate_idx" ON "tasks"("userId", "dueDate");
CREATE INDEX "tasks_title_idx" ON "tasks"("title");
CREATE INDEX "task_tags_userId_idx" ON "task_tags"("userId");

-- Add foreign key constraints
ALTER TABLE "task_tags" ADD CONSTRAINT "task_tags_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add unique constraint for tag names per user
ALTER TABLE "task_tags" ADD CONSTRAINT "task_tags_userId_name_key" 
    UNIQUE ("userId", "name");

-- Add indexes for many-to-many relationship table
CREATE UNIQUE INDEX "_TaskToTaskTag_AB_unique" ON "_TaskToTaskTag"("A", "B");
CREATE INDEX "_TaskToTaskTag_B_index" ON "_TaskToTaskTag"("B");

-- Add foreign key constraints for relationship table
ALTER TABLE "_TaskToTaskTag" ADD CONSTRAINT "_TaskToTaskTag_A_fkey" 
    FOREIGN KEY ("A") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_TaskToTaskTag" ADD CONSTRAINT "_TaskToTaskTag_B_fkey" 
    FOREIGN KEY ("B") REFERENCES "task_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;