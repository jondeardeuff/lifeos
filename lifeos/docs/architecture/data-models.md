# Data Models & Validation

## Overview

This document defines TypeScript interfaces, types, and validation schemas for all data models in Life OS.

## Core Domain Models

### User Models

```typescript
// models/user.ts
import { z } from 'zod';

// User entity
export interface User {
  id: string;
  email: string;
  phoneNumber?: string;
  fullName: string;
  avatarUrl?: string;
  timezone: string;
  role: UserRole;
  settings: UserSettings;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  VIEWER = 'viewer',
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  language: 'en' | 'es';
  notifications: NotificationSettings;
  calendar: CalendarSettings;
  voice: VoiceSettings;
  financial: FinancialSettings;
}

export interface NotificationSettings {
  email: boolean;
  sms: boolean;
  push: boolean;
  taskReminders: boolean;
  dailySummary: boolean;
  weeklyReport: boolean;
  quietHours: {
    enabled: boolean;
    start: string; // HH:mm format
    end: string;   // HH:mm format
  };
}

export interface CalendarSettings {
  defaultView: 'day' | 'week' | 'month';
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6; // Sunday = 0
  workingHours: {
    start: string; // HH:mm
    end: string;   // HH:mm
  };
  showWeekNumbers: boolean;
}

export interface VoiceSettings {
  enabled: boolean;
  language: 'en' | 'es';
  wakeWord: boolean;
  confirmBeforeAction: boolean;
  feedbackSounds: boolean;
}

export interface FinancialSettings {
  currency: string; // ISO 4217 code
  fiscalYearStart: number; // Month (1-12)
  budgetPeriod: 'monthly' | 'quarterly' | 'yearly';
}

// Validation schemas
export const userSettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
  language: z.enum(['en', 'es']),
  notifications: z.object({
    email: z.boolean(),
    sms: z.boolean(),
    push: z.boolean(),
    taskReminders: z.boolean(),
    dailySummary: z.boolean(),
    weeklyReport: z.boolean(),
    quietHours: z.object({
      enabled: z.boolean(),
      start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
      end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    }),
  }),
  calendar: z.object({
    defaultView: z.enum(['day', 'week', 'month']),
    weekStartsOn: z.number().min(0).max(6),
    workingHours: z.object({
      start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
      end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    }),
    showWeekNumbers: z.boolean(),
  }),
  voice: z.object({
    enabled: z.boolean(),
    language: z.enum(['en', 'es']),
    wakeWord: z.boolean(),
    confirmBeforeAction: z.boolean(),
    feedbackSounds: z.boolean(),
  }),
  financial: z.object({
    currency: z.string().length(3),
    fiscalYearStart: z.number().min(1).max(12),
    budgetPeriod: z.enum(['monthly', 'quarterly', 'yearly']),
  }),
});

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  fullName: z.string().min(1).max(255),
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
  timezone: z.string().default('UTC'),
});

export const updateUserSchema = createUserSchema.partial().omit({ password: true });
```

### Task Models

```typescript
// models/task.ts
import { z } from 'zod';

export interface Task {
  id: string;
  title: string;
  description?: string;
  userId: string;
  projectId?: string;
  parentTaskId?: string;
  assigneeId?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: Date;
  completedAt?: Date;
  tags: string[];
  source: TaskSource;
  recurringPattern?: RecurringPattern;
  metadata: TaskMetadata;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  user?: User;
  project?: Project;
  assignee?: User;
  parentTask?: Task;
  subtasks?: Task[];
  comments?: TaskComment[];
  attachments?: TaskAttachment[];
}

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum TaskPriority {
  LOWEST = 1,
  LOW = 2,
  MEDIUM = 3,
  HIGH = 4,
  HIGHEST = 5,
}

export enum TaskSource {
  MANUAL = 'manual',
  VOICE = 'voice',
  EMAIL = 'email',
  API = 'api',
  RECURRING = 'recurring',
}

export interface RecurringPattern {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number; // Every n days/weeks/months/years
  daysOfWeek?: number[]; // 0-6, Sunday = 0
  dayOfMonth?: number; // 1-31
  monthOfYear?: number; // 1-12
  endDate?: Date;
  occurrences?: number;
}

export interface TaskMetadata {
  voiceTranscription?: string;
  voiceConfidence?: number;
  emailId?: string;
  recurringTaskId?: string;
  estimatedDuration?: number; // minutes
  actualDuration?: number; // minutes
  [key: string]: any;
}

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  user?: User;
  task?: Task;
}

export interface TaskAttachment {
  id: string;
  taskId: string;
  uploadedBy: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  storageUrl: string;
  thumbnailUrl?: string;
  createdAt: Date;
  
  // Relations
  task?: Task;
  uploader?: User;
}

// Validation schemas
export const recurringPatternSchema = z.object({
  frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
  interval: z.number().min(1).max(365),
  daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
  dayOfMonth: z.number().min(1).max(31).optional(),
  monthOfYear: z.number().min(1).max(12).optional(),
  endDate: z.date().optional(),
  occurrences: z.number().min(1).max(999).optional(),
}).refine(data => {
  if (data.frequency === 'weekly' && !data.daysOfWeek?.length) {
    return false;
  }
  if (data.frequency === 'monthly' && !data.dayOfMonth) {
    return false;
  }
  return true;
}, {
  message: "Invalid recurring pattern configuration",
});

export const createTaskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  projectId: z.string().uuid().optional(),
  parentTaskId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().optional(),
  status: z.nativeEnum(TaskStatus).default(TaskStatus.PENDING),
  priority: z.number().min(1).max(5).default(3),
  dueDate: z.date().optional(),
  tags: z.array(z.string()).default([]),
  source: z.nativeEnum(TaskSource).default(TaskSource.MANUAL),
  recurringPattern: recurringPatternSchema.optional(),
  metadata: z.record(z.any()).default({}),
});

export const updateTaskSchema = createTaskSchema.partial();

export const taskFilterSchema = z.object({
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.number().min(1).max(5).optional(),
  projectId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
  dueBefore: z.date().optional(),
  dueAfter: z.date().optional(),
  search: z.string().optional(),
  includeCompleted: z.boolean().default(false),
});
```

### Project Models

```typescript
// models/project.ts
import { z } from 'zod';

export interface Project {
  id: string;
  organizationId?: string;
  name: string;
  description?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  status: ProjectStatus;
  startDate?: Date;
  endDate?: Date;
  budgetAmount?: number;
  currentCost: number;
  color?: string;
  settings: ProjectSettings;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  archivedAt?: Date;
  
  // Relations
  organization?: Organization;
  creator?: User;
  members?: ProjectMember[];
  tasks?: Task[];
  transactions?: Transaction[];
}

export enum ProjectStatus {
  PLANNING = 'planning',
  ACTIVE = 'active',
  ON_HOLD = 'on_hold',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface ProjectMember {
  projectId: string;
  userId: string;
  role: ProjectRole;
  hourlyRate?: number;
  joinedAt: Date;
  
  // Relations
  project?: Project;
  user?: User;
}

export enum ProjectRole {
  OWNER = 'owner',
  MANAGER = 'manager',
  MEMBER = 'member',
  VIEWER = 'viewer',
}

export interface ProjectSettings {
  taskPrefix?: string; // e.g., "PROJ-"
  autoAssignTasks: boolean;
  requireTimeTracking: boolean;
  budgetAlerts: {
    enabled: boolean;
    thresholds: number[]; // e.g., [50, 80, 90]
  };
  completionCriteria?: string[];
}

// Validation schemas
export const projectSettingsSchema = z.object({
  taskPrefix: z.string().max(10).optional(),
  autoAssignTasks: z.boolean().default(false),
  requireTimeTracking: z.boolean().default(false),
  budgetAlerts: z.object({
    enabled: z.boolean().default(true),
    thresholds: z.array(z.number().min(0).max(100)).default([50, 80, 90]),
  }),
  completionCriteria: z.array(z.string()).optional(),
});

export const createProjectSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  clientName: z.string().max(255).optional(),
  clientEmail: z.string().email().optional(),
  clientPhone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
  status: z.nativeEnum(ProjectStatus).default(ProjectStatus.PLANNING),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  budgetAmount: z.number().min(0).optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  settings: projectSettingsSchema.default({}),
}).refine(data => {
  if (data.startDate && data.endDate && data.startDate > data.endDate) {
    return false;
  }
  return true;
}, {
  message: "End date must be after start date",
  path: ["endDate"],
});

export const updateProjectSchema = createProjectSchema.partial();
```

### Calendar Models

```typescript
// models/calendar.ts
import { z } from 'zod';

export interface CalendarEvent {
  id: string;
  userId: string;
  externalId?: string;
  externalProvider?: ExternalCalendarProvider;
  title: string;
  description?: string;
  location?: string;
  startTime: Date;
  endTime: Date;
  allDay: boolean;
  timezone: string;
  status: EventStatus;
  visibility: EventVisibility;
  recurringPattern?: RecurringPattern;
  projectId?: string;
  taskId?: string;
  metadata: EventMetadata;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  user?: User;
  project?: Project;
  task?: Task;
  attendees?: EventAttendee[];
}

export enum ExternalCalendarProvider {
  GOOGLE = 'google',
  OUTLOOK = 'outlook',
  APPLE = 'apple',
}

export enum EventStatus {
  CONFIRMED = 'confirmed',
  TENTATIVE = 'tentative',
  CANCELLED = 'cancelled',
}

export enum EventVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
}

export interface EventAttendee {
  eventId: string;
  userId?: string;
  email: string;
  name?: string;
  status: AttendeeStatus;
  isOrganizer: boolean;
  
  // Relations
  event?: CalendarEvent;
  user?: User;
}

export enum AttendeeStatus {
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  TENTATIVE = 'tentative',
  PENDING = 'pending',
}

export interface EventMetadata {
  meetingUrl?: string;
  conferenceData?: {
    provider: string;
    url: string;
    accessCode?: string;
  };
  reminders?: EventReminder[];
  attachments?: string[];
  [key: string]: any;
}

export interface EventReminder {
  method: 'email' | 'popup' | 'sms';
  minutesBefore: number;
}

// Validation schemas
export const eventReminderSchema = z.object({
  method: z.enum(['email', 'popup', 'sms']),
  minutesBefore: z.number().min(0).max(40320), // Max 4 weeks
});

export const createEventSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  location: z.string().max(500).optional(),
  startTime: z.date(),
  endTime: z.date(),
  allDay: z.boolean().default(false),
  timezone: z.string().default('UTC'),
  status: z.nativeEnum(EventStatus).default(EventStatus.CONFIRMED),
  visibility: z.nativeEnum(EventVisibility).default(EventVisibility.PRIVATE),
  recurringPattern: recurringPatternSchema.optional(),
  projectId: z.string().uuid().optional(),
  taskId: z.string().uuid().optional(),
  attendeeEmails: z.array(z.string().email()).optional(),
  metadata: z.object({
    meetingUrl: z.string().url().optional(),
    reminders: z.array(eventReminderSchema).optional(),
  }).passthrough().default({}),
}).refine(data => {
  if (data.startTime >= data.endTime) {
    return false;
  }
  return true;
}, {
  message: "End time must be after start time",
  path: ["endTime"],
});

export const updateEventSchema = createEventSchema.partial();
```

### Financial Models

```typescript
// models/financial.ts
import { z } from 'zod';

export interface BankAccount {
  id: string;
  userId: string;
  plaidAccountId?: string;
  institutionName: string;
  accountName: string;
  accountType: AccountType;
  accountSubtype?: string;
  mask: string; // Last 4 digits
  currentBalance: number;
  availableBalance?: number;
  currency: string;
  isActive: boolean;
  lastSyncAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  user?: User;
  transactions?: Transaction[];
}

export enum AccountType {
  CHECKING = 'checking',
  SAVINGS = 'savings',
  CREDIT = 'credit',
  LOAN = 'loan',
  INVESTMENT = 'investment',
}

export interface Transaction {
  id: string;
  userId: string;
  accountId: string;
  externalId?: string;
  amount: number;
  currency: string;
  date: Date;
  description: string;
  merchantName?: string;
  categoryId?: string;
  projectId?: string;
  isPending: boolean;
  isTransfer: boolean;
  location?: TransactionLocation;
  receiptUrl?: string;
  notes?: string;
  metadata: TransactionMetadata;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  user?: User;
  account?: BankAccount;
  category?: Category;
  project?: Project;
}

export interface TransactionLocation {
  address?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
  lat?: number;
  lon?: number;
}

export interface TransactionMetadata {
  originalDescription?: string;
  plaidCategoryId?: string;
  confidence?: number;
  tags?: string[];
  [key: string]: any;
}

export interface Category {
  id: string;
  userId?: string; // null for system categories
  name: string;
  parentCategoryId?: string;
  icon?: string;
  color?: string;
  isIncome: boolean;
  isTaxDeductible: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  user?: User;
  parentCategory?: Category;
  subcategories?: Category[];
  transactions?: Transaction[];
}

export interface Budget {
  id: string;
  userId: string;
  name: string;
  categoryId?: string;
  projectId?: string;
  amount: number;
  period: BudgetPeriod;
  startDate: Date;
  endDate?: Date;
  alertThreshold: number; // Percentage
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  user?: User;
  category?: Category;
  project?: Project;
}

export enum BudgetPeriod {
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
  CUSTOM = 'custom',
}

export interface Invoice {
  id: string;
  userId: string;
  projectId?: string;
  invoiceNumber: string;
  clientName: string;
  clientEmail?: string;
  clientAddress?: string;
  issueDate: Date;
  dueDate: Date;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  status: InvoiceStatus;
  paidAt?: Date;
  notes?: string;
  terms?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  user?: User;
  project?: Project;
  items?: InvoiceItem[];
  payments?: Payment[];
}

export enum InvoiceStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  VIEWED = 'viewed',
  PAID = 'paid',
  PARTIAL = 'partial',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  taxRate?: number;
  taskId?: string;
  sortOrder: number;
  
  // Relations
  invoice?: Invoice;
  task?: Task;
}

// Validation schemas
export const createTransactionSchema = z.object({
  accountId: z.string().uuid(),
  amount: z.number(),
  date: z.date(),
  description: z.string().min(1).max(500),
  merchantName: z.string().max(255).optional(),
  categoryId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  isPending: z.boolean().default(false),
  isTransfer: z.boolean().default(false),
  location: z.object({
    address: z.string().optional(),
    city: z.string().optional(),
    region: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
    lat: z.number().min(-90).max(90).optional(),
    lon: z.number().min(-180).max(180).optional(),
  }).optional(),
  notes: z.string().max(1000).optional(),
  metadata: z.record(z.any()).default({}),
});

export const createBudgetSchema = z.object({
  name: z.string().min(1).max(255),
  categoryId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  amount: z.number().min(0),
  period: z.nativeEnum(BudgetPeriod),
  startDate: z.date(),
  endDate: z.date().optional(),
  alertThreshold: z.number().min(0).max(100).default(80),
  isActive: z.boolean().default(true),
}).refine(data => {
  if (data.period === BudgetPeriod.CUSTOM && !data.endDate) {
    return false;
  }
  if (data.endDate && data.startDate > data.endDate) {
    return false;
  }
  return true;
}, {
  message: "Invalid budget period configuration",
});

export const createInvoiceSchema = z.object({
  projectId: z.string().uuid().optional(),
  clientName: z.string().min(1).max(255),
  clientEmail: z.string().email().optional(),
  clientAddress: z.string().max(500).optional(),
  issueDate: z.date(),
  dueDate: z.date(),
  currency: z.string().length(3).default('USD'),
  status: z.nativeEnum(InvoiceStatus).default(InvoiceStatus.DRAFT),
  notes: z.string().max(2000).optional(),
  terms: z.string().max(2000).optional(),
  items: z.array(z.object({
    description: z.string().min(1).max(500),
    quantity: z.number().min(0),
    unitPrice: z.number().min(0),
    taxRate: z.number().min(0).max(100).optional(),
    taskId: z.string().uuid().optional(),
  })).min(1),
}).refine(data => {
  if (data.dueDate < data.issueDate) {
    return false;
  }
  return true;
}, {
  message: "Due date must be after issue date",
  path: ["dueDate"],
});
```

## API Request/Response Models

### Common API Models

```typescript
// models/api.ts
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  metadata?: Record<string, any>;
}

export interface ApiError {
  code: string;
  message: string;
  field?: string;
  details?: any;
  suggestion?: string;
  retryable?: boolean;
}

export interface BatchOperation<T> {
  operation: 'create' | 'update' | 'delete';
  data: T;
  id?: string;
}

export interface BatchResult<T> {
  success: T[];
  failed: Array<{
    operation: BatchOperation<T>;
    error: ApiError;
  }>;
}
```

### Voice Command Models

```typescript
// models/voice.ts
export interface VoiceCommand {
  id: string;
  userId: string;
  audioUrl?: string;
  audioDuration?: number;
  transcription: string;
  language: string;
  confidence: number;
  parsedIntent: VoiceIntent;
  parsedEntities: ParsedEntities;
  actionTaken?: string;
  actionResult?: any;
  error?: string;
  createdAt: Date;
}

export enum VoiceIntent {
  CREATE_TASK = 'CREATE_TASK',
  UPDATE_TASK = 'UPDATE_TASK',
  CREATE_EVENT = 'CREATE_EVENT',
  LOG_TRANSACTION = 'LOG_TRANSACTION',
  SEARCH = 'SEARCH',
  NAVIGATE = 'NAVIGATE',
  HELP = 'HELP',
  UNCLEAR = 'UNCLEAR',
}

export interface ParsedEntities {
  // Task entities
  title?: string;
  description?: string;
  dueDate?: Date;
  priority?: number;
  assignee?: string;
  project?: string;
  
  // Event entities
  eventTitle?: string;
  startTime?: Date;
  endTime?: Date;
  location?: string;
  attendees?: string[];
  
  // Transaction entities
  amount?: number;
  merchant?: string;
  category?: string;
  
  // Common entities
  action?: string;
  target?: string;
  modifier?: string;
  
  // Raw entities for debugging
  raw?: Record<string, any>;
}

export interface VoiceContext {
  currentView?: string;
  currentProjectId?: string;
  currentTaskId?: string;
  recentEntities?: Array<{
    type: string;
    id: string;
    name: string;
    timestamp: Date;
  }>;
  timezone: string;
  language: string;
}

export interface VoiceProcessingResult {
  success: boolean;
  intent: VoiceIntent;
  confidence: number;
  entities: ParsedEntities;
  action?: string;
  result?: any;
  alternatives?: Array<{
    intent: VoiceIntent;
    confidence: number;
    description: string;
  }>;
  clarificationNeeded?: {
    field: string;
    question: string;
    options?: string[];
  };
}
```

## Utility Types

```typescript
// types/utilities.ts

// Make all properties optional recursively
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Omit multiple properties
export type OmitMultiple<T, K extends keyof T> = Omit<T, K>;

// Pick nullable properties
export type NullableKeys<T> = {
  [K in keyof T]: null extends T[K] ? K : never;
}[keyof T];

// Pick required properties
export type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];

// Make specific properties required
export type RequireFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Extract promise type
export type PromiseType<T extends Promise<any>> = T extends Promise<infer U> ? U : never;

// Value of object
export type ValueOf<T> = T[keyof T];

// Strict extract
export type StrictExtract<T, U extends T> = U;

// Non-empty array
export type NonEmptyArray<T> = [T, ...T[]];

// Branded types for type safety
export type Brand<K, T> = K & { __brand: T };

export type UserId = Brand<string, 'UserId'>;
export type TaskId = Brand<string, 'TaskId'>;
export type ProjectId = Brand<string, 'ProjectId'>;

// Date range type
export interface DateRange {
  start: Date;
  end: Date;
}

// Time range type
export interface TimeRange {
  start: string; // HH:mm format
  end: string;   // HH:mm format
}

// Coordinate type
export interface Coordinates {
  latitude: number;
  longitude: number;
}

// File upload type
export interface FileUpload {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}
```

## Constants

```typescript
// constants/index.ts

export const CONSTANTS = {
  // Limits
  MAX_TASK_TITLE_LENGTH: 500,
  MAX_DESCRIPTION_LENGTH: 5000,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_FILES_PER_UPLOAD: 5,
  MAX_TAGS_PER_TASK: 10,
  MAX_ATTENDEES_PER_EVENT: 100,
  
  // Defaults
  DEFAULT_TASK_PRIORITY: 3,
  DEFAULT_CURRENCY: 'USD',
  DEFAULT_TIMEZONE: 'UTC',
  DEFAULT_LANGUAGE: 'en',
  DEFAULT_PAGE_SIZE: 20,
  
  // Time
  MILLISECONDS_PER_MINUTE: 60 * 1000,
  MILLISECONDS_PER_HOUR: 60 * 60 * 1000,
  MILLISECONDS_PER_DAY: 24 * 60 * 60 * 1000,
  
  // Regex patterns
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_REGEX: /^\+?[1-9]\d{1,14}$/,
  TIME_REGEX: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
  HEX_COLOR_REGEX: /^#[0-9A-F]{6}$/i,
  UUID_REGEX: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  
  // File types
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  ALLOWED_SPREADSHEET_TYPES: ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
} as const;
```