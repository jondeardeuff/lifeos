const { z } = require('zod');

// Priority enum schema
const PrioritySchema = z.enum(['LOWEST', 'LOW', 'MEDIUM', 'HIGH', 'HIGHEST']);

// Task status enum schema
const TaskStatusSchema = z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']);

// Due date status enum
const DueDateStatusSchema = z.enum(['OVERDUE', 'DUE_TODAY', 'DUE_SOON', 'FUTURE']);

// Metadata schema with various optional fields
const MetadataSchema = z.object({
  // Voice command context
  voiceCommand: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  
  // External integrations
  externalId: z.string().optional(),
  source: z.enum(['voice', 'manual', 'email', 'calendar']).optional(),
  
  // Custom fields - allow any key-value pairs
  customFields: z.record(z.string(), z.any()).optional(),
  
  // Tracking data
  timeEstimate: z.number().positive().optional(), // minutes
  actualTime: z.number().positive().optional(),   // minutes
  difficulty: z.number().min(1).max(5).optional(),
  
  // Additional properties
  location: z.string().optional(),
  urls: z.array(z.string().url()).optional(),
  attachments: z.array(z.string()).optional()
}).optional();

// Task description validation
const TaskDescriptionSchema = z.string()
  .max(5000, "Description cannot exceed 5000 characters")
  .optional();

// Tag validation
const TagSchema = z.string()
  .min(1, "Tag name cannot be empty")
  .max(50, "Tag name cannot exceed 50 characters")
  .regex(/^[a-zA-Z0-9\s\-_]+$/, "Tag name can only contain letters, numbers, spaces, hyphens and underscores");

// Comprehensive task validation schema
const TaskValidationSchema = z.object({
  title: z.string()
    .min(1, "Title is required")
    .max(500, "Title cannot exceed 500 characters")
    .trim(),
    
  description: TaskDescriptionSchema,
  
  priority: PrioritySchema.default('MEDIUM'),
  
  status: TaskStatusSchema.default('PENDING'),
  
  dueDate: z.date().optional(),
  
  dueTime: z.string().optional(),
  
  timezone: z.string().optional(),
  
  tags: z.array(TagSchema)
    .max(10, "Tasks cannot have more than 10 tags")
    .optional(),
    
  metadata: MetadataSchema
});

// Create task input schema
const CreateTaskInputSchema = TaskValidationSchema.extend({
  title: z.string()
    .min(1, "Title is required")
    .max(500, "Title cannot exceed 500 characters")
    .trim()
});

// Update task input schema (all fields optional except validations)
const UpdateTaskInputSchema = TaskValidationSchema.partial().extend({
  title: z.string()
    .min(1, "Title cannot be empty")
    .max(500, "Title cannot exceed 500 characters")
    .trim()
    .optional(),
});

// Task tag validation schema
const TaskTagValidationSchema = z.object({
  name: z.string()
    .min(1, "Tag name is required")
    .max(50, "Tag name cannot exceed 50 characters")
    .regex(/^[a-zA-Z0-9\s\-_]+$/, "Tag name can only contain letters, numbers, spaces, hyphens and underscores")
    .transform(str => str.toLowerCase().trim()),
    
  color: z.string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex color code")
    .default("#3B82F6")
});

// Validation functions
const validateTaskInput = (input) => {
  try {
    return {
      success: true,
      data: CreateTaskInputSchema.parse(input)
    };
  } catch (error) {
    return {
      success: false,
      errors: error.errors?.map(err => ({
        field: err.path.join('.'),
        message: err.message
      })) || [{ field: 'unknown', message: error.message }]
    };
  }
};

const validateTaskUpdate = (input) => {
  try {
    return {
      success: true,
      data: UpdateTaskInputSchema.parse(input)
    };
  } catch (error) {
    return {
      success: false,
      errors: error.errors?.map(err => ({
        field: err.path.join('.'),
        message: err.message
      })) || [{ field: 'unknown', message: error.message }]
    };
  }
};

const validateTaskTag = (input) => {
  try {
    return {
      success: true,
      data: TaskTagValidationSchema.parse(input)
    };
  } catch (error) {
    return {
      success: false,
      errors: error.errors?.map(err => ({
        field: err.path.join('.'),
        message: err.message
      })) || [{ field: 'unknown', message: error.message }]
    };
  }
};

// Status transition validation
const taskStatusWorkflow = {
  PENDING: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'PENDING', 'CANCELLED'],
  COMPLETED: ['IN_PROGRESS'], // Allow reopening
  CANCELLED: ['PENDING'] // Allow reactivation
};

const validateStatusTransition = (currentStatus, newStatus) => {
  if (currentStatus === newStatus) {
    return { valid: true };
  }
  
  const allowedTransitions = taskStatusWorkflow[currentStatus];
  if (!allowedTransitions || !allowedTransitions.includes(newStatus)) {
    return {
      valid: false,
      message: `Invalid status transition from ${currentStatus} to ${newStatus}`
    };
  }
  
  return { valid: true };
};

// Utility functions for word and character count
const getWordCount = (text) => {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
};

const getCharacterCount = (text) => {
  return text ? text.length : 0;
};

module.exports = {
  // Schemas
  PrioritySchema,
  TaskStatusSchema,
  DueDateStatusSchema,
  MetadataSchema,
  TaskDescriptionSchema,
  TagSchema,
  TaskValidationSchema,
  CreateTaskInputSchema,
  UpdateTaskInputSchema,
  TaskTagValidationSchema,
  
  // Validation functions
  validateTaskInput,
  validateTaskUpdate,
  validateTaskTag,
  validateStatusTransition,
  
  // Utility functions
  getWordCount,
  getCharacterCount,
  
  // Constants
  taskStatusWorkflow
};