import { z } from 'zod';

export enum Priority {
  LOWEST = 'LOWEST',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  HIGHEST = 'HIGHEST',
}

export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export const metadataSchema = z
  .object({
    voiceCommand: z.string().optional(),
    confidence: z.number().min(0).max(1).optional(),
    externalId: z.string().optional(),
    source: z.enum(['voice', 'manual', 'email', 'calendar']).optional(),
    customFields: z.record(z.string(), z.any()).optional(),
    timeEstimate: z.number().optional(),
    actualTime: z.number().optional(),
    difficulty: z.number().min(1).max(5).optional(),
    location: z.string().optional(),
    urls: z.array(z.string().url()).optional(),
    attachments: z.array(z.string()).optional(),
  })
  .optional();

export const createTaskSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(500, 'Title cannot exceed 500 characters')
    .trim(),
  description: z.string().max(5000, 'Description cannot exceed 5000 characters').optional(),
  priority: z.nativeEnum(Priority).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  dueDate: z.date().optional(),
  dueTime: z.string().optional(),
  timezone: z.string().optional(),
  tags: z.array(z.string()).max(10, 'Tasks cannot have more than 10 tags').optional(),
  metadata: metadataSchema,
});

export const updateTaskSchema = createTaskSchema.partial();

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;