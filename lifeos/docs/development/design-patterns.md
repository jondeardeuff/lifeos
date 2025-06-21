# Design Patterns for Life OS

## Behavioral Patterns

### Observer Pattern

Use for event-driven communication between components.

```typescript
// patterns/event-emitter.ts
export type EventHandler<T = any> = (data: T) => void | Promise<void>;

export class EventEmitter<Events extends Record<string, any>> {
  private handlers: Map<keyof Events, Set<EventHandler>> = new Map();
  
  on<K extends keyof Events>(
    event: K,
    handler: EventHandler<Events[K]>
  ): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    
    this.handlers.get(event)!.add(handler);
    
    // Return unsubscribe function
    return () => {
      this.handlers.get(event)?.delete(handler);
    };
  }
  
  once<K extends keyof Events>(
    event: K,
    handler: EventHandler<Events[K]>
  ): () => void {
    const wrapper = (data: Events[K]) => {
      handler(data);
      this.off(event, wrapper);
    };
    
    return this.on(event, wrapper);
  }
  
  off<K extends keyof Events>(
    event: K,
    handler: EventHandler<Events[K]>
  ): void {
    this.handlers.get(event)?.delete(handler);
  }
  
  async emit<K extends keyof Events>(
    event: K,
    data: Events[K]
  ): Promise<void> {
    const handlers = this.handlers.get(event);
    if (!handlers) return;
    
    await Promise.all(
      Array.from(handlers).map(handler => handler(data))
    );
  }
}

// Define event types
interface TaskEvents {
  'task:created': { task: Task; source: string };
  'task:updated': { task: Task; changes: Partial<Task> };
  'task:deleted': { taskId: string };
  'task:completed': { task: Task; completedBy: string };
}

// Usage
export const taskEvents = new EventEmitter<TaskEvents>();

// Subscribe to events
taskEvents.on('task:created', async ({ task, source }) => {
  if (source === 'voice') {
    await analyticsService.trackVoiceTask(task);
  }
  
  if (task.dueDate) {
    await notificationService.scheduleReminder(task);
  }
});

taskEvents.on('task:completed', async ({ task, completedBy }) => {
  await achievementService.checkAchievements(completedBy);
  await projectService.updateProgress(task.projectId);
});

// Emit events
await taskEvents.emit('task:created', {
  task: newTask,
  source: 'voice',
});
```

### Strategy Pattern

Use for interchangeable algorithms or business rules.

```typescript
// strategies/categorization-strategy.ts
export interface CategorizationStrategy {
  categorize(transaction: Transaction): Promise<Category>;
}

export class RuleBasedCategorization implements CategorizationStrategy {
  constructor(private rules: CategoryRule[]) {}
  
  async categorize(transaction: Transaction): Promise<Category> {
    // Sort rules by priority
    const sortedRules = this.rules.sort((a, b) => b.priority - a.priority);
    
    for (const rule of sortedRules) {
      if (this.matchesRule(transaction, rule)) {
        return rule.category;
      }
    }
    
    return this.getDefaultCategory();
  }
  
  private matchesRule(transaction: Transaction, rule: CategoryRule): boolean {
    if (rule.merchantPattern && !transaction.merchant.match(rule.merchantPattern)) {
      return false;
    }
    
    if (rule.amountRange) {
      const amount = Math.abs(transaction.amount);
      if (amount < rule.amountRange.min || amount > rule.amountRange.max) {
        return false;
      }
    }
    
    return true;
  }
}

export class MLBasedCategorization implements CategorizationStrategy {
  constructor(private model: CategoryModel) {}
  
  async categorize(transaction: Transaction): Promise<Category> {
    const features = this.extractFeatures(transaction);
    const prediction = await this.model.predict(features);
    
    return {
      id: prediction.categoryId,
      name: prediction.categoryName,
      confidence: prediction.confidence,
    };
  }
  
  private extractFeatures(transaction: Transaction): Features {
    return {
      merchant: this.tokenizeMerchant(transaction.merchant),
      amount: this.normalizeAmount(transaction.amount),
      dayOfWeek: transaction.date.getDay(),
      timeOfDay: this.getTimeOfDay(transaction.date),
    };
  }
}

export class HybridCategorization implements CategorizationStrategy {
  constructor(
    private ruleBased: RuleBasedCategorization,
    private mlBased: MLBasedCategorization,
    private confidenceThreshold: number = 0.8
  ) {}
  
  async categorize(transaction: Transaction): Promise<Category> {
    // Try ML first
    const mlCategory = await this.mlBased.categorize(transaction);
    
    if (mlCategory.confidence >= this.confidenceThreshold) {
      return mlCategory;
    }
    
    // Fall back to rules
    return this.ruleBased.categorize(transaction);
  }
}

// Context class that uses strategies
export class TransactionCategorizer {
  private strategy: CategorizationStrategy;
  
  constructor(strategy: CategorizationStrategy) {
    this.strategy = strategy;
  }
  
  setStrategy(strategy: CategorizationStrategy): void {
    this.strategy = strategy;
  }
  
  async categorize(transaction: Transaction): Promise<Category> {
    return this.strategy.categorize(transaction);
  }
}

// Usage
const categorizer = new TransactionCategorizer(
  new HybridCategorization(ruleBased, mlBased)
);

const category = await categorizer.categorize(transaction);
```

### Command Pattern

Use for encapsulating actions as objects.

```typescript
// commands/command.ts
export interface Command<T = any> {
  execute(): Promise<T>;
  undo?(): Promise<void>;
  canExecute?(): boolean;
}

// commands/task-commands.ts
export class CreateTaskCommand implements Command<Task> {
  constructor(
    private taskService: TaskService,
    private input: CreateTaskInput
  ) {}
  
  async execute(): Promise<Task> {
    const task = await this.taskService.create(this.input);
    this.createdTaskId = task.id;
    return task;
  }
  
  async undo(): Promise<void> {
    if (this.createdTaskId) {
      await this.taskService.delete(this.createdTaskId);
    }
  }
  
  canExecute(): boolean {
    return Boolean(this.input.title && this.input.userId);
  }
  
  private createdTaskId?: string;
}

export class BatchUpdateTasksCommand implements Command<Task[]> {
  private originalStates: Map<string, Task> = new Map();
  
  constructor(
    private taskService: TaskService,
    private updates: Array<{ id: string; changes: Partial<Task> }>
  ) {}
  
  async execute(): Promise<Task[]> {
    // Store original states for undo
    for (const update of this.updates) {
      const original = await this.taskService.findById(update.id);
      if (original) {
        this.originalStates.set(update.id, original);
      }
    }
    
    // Execute updates
    const results = await Promise.all(
      this.updates.map(({ id, changes }) =>
        this.taskService.update(id, changes)
      )
    );
    
    return results;
  }
  
  async undo(): Promise<void> {
    // Restore original states
    await Promise.all(
      Array.from(this.originalStates.entries()).map(([id, original]) =>
        this.taskService.update(id, original)
      )
    );
  }
}

// Command executor with history
export class CommandExecutor {
  private history: Command[] = [];
  private currentIndex = -1;
  
  async execute<T>(command: Command<T>): Promise<T> {
    if (command.canExecute && !command.canExecute()) {
      throw new Error('Command cannot be executed');
    }
    
    const result = await command.execute();
    
    // Remove any commands after current index
    this.history = this.history.slice(0, this.currentIndex + 1);
    
    // Add to history
    this.history.push(command);
    this.currentIndex++;
    
    return result;
  }
  
  async undo(): Promise<void> {
    if (this.currentIndex < 0) {
      throw new Error('Nothing to undo');
    }
    
    const command = this.history[this.currentIndex];
    if (command.undo) {
      await command.undo();
      this.currentIndex--;
    }
  }
  
  async redo(): Promise<void> {
    if (this.currentIndex >= this.history.length - 1) {
      throw new Error('Nothing to redo');
    }
    
    this.currentIndex++;
    const command = this.history[this.currentIndex];
    await command.execute();
  }
  
  canUndo(): boolean {
    return this.currentIndex >= 0 && 
           this.history[this.currentIndex]?.undo !== undefined;
  }
  
  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1;
  }
}

// Usage
const executor = new CommandExecutor();

const createCommand = new CreateTaskCommand(taskService, {
  title: 'New Task',
  userId: 'user123',
});

const task = await executor.execute(createCommand);

// User can undo
if (executor.canUndo()) {
  await executor.undo();
}
```

### Chain of Responsibility Pattern

Use for processing requests through a chain of handlers.

```typescript
// middleware/validation-chain.ts
export abstract class ValidationHandler<T> {
  private nextHandler?: ValidationHandler<T>;
  
  setNext(handler: ValidationHandler<T>): ValidationHandler<T> {
    this.nextHandler = handler;
    return handler;
  }
  
  async validate(data: T): Promise<ValidationResult> {
    const result = await this.handle(data);
    
    if (!result.isValid || !this.nextHandler) {
      return result;
    }
    
    return this.nextHandler.validate(data);
  }
  
  protected abstract handle(data: T): Promise<ValidationResult>;
}

// Concrete handlers
export class RequiredFieldsValidator extends ValidationHandler<TaskInput> {
  protected async handle(data: TaskInput): Promise<ValidationResult> {
    if (!data.title || data.title.trim().length === 0) {
      return {
        isValid: false,
        errors: ['Title is required'],
      };
    }
    
    if (!data.userId) {
      return {
        isValid: false,
        errors: ['User ID is required'],
      };
    }
    
    return { isValid: true };
  }
}

export class DateValidator extends ValidationHandler<TaskInput> {
  protected async handle(data: TaskInput): Promise<ValidationResult> {
    if (!data.dueDate) {
      return { isValid: true }; // Due date is optional
    }
    
    const dueDate = new Date(data.dueDate);
    const now = new Date();
    
    if (dueDate < now) {
      return {
        isValid: false,
        errors: ['Due date cannot be in the past'],
      };
    }
    
    return { isValid: true };
  }
}

export class ProjectAccessValidator extends ValidationHandler<TaskInput> {
  constructor(private projectService: ProjectService) {
    super();
  }
  
  protected async handle(data: TaskInput): Promise<ValidationResult> {
    if (!data.projectId) {
      return { isValid: true }; // Project is optional
    }
    
    const hasAccess = await this.projectService.userHasAccess(
      data.userId,
      data.projectId
    );
    
    if (!hasAccess) {
      return {
        isValid: false,
        errors: ['User does not have access to this project'],
      };
    }
    
    return { isValid: true };
  }
}

// Build validation chain
export function createTaskValidationChain(
  projectService: ProjectService
): ValidationHandler<TaskInput> {
  const requiredFields = new RequiredFieldsValidator();
  const dateValidator = new DateValidator();
  const projectValidator = new ProjectAccessValidator(projectService);
  
  requiredFields
    .setNext(dateValidator)
    .setNext(projectValidator);
  
  return requiredFields;
}

// Usage
const validationChain = createTaskValidationChain(projectService);

const result = await validationChain.validate(taskInput);
if (!result.isValid) {
  throw new ValidationError(result.errors);
}
```

### Template Method Pattern

Use for defining algorithm skeletons with customizable steps.

```typescript
// templates/sync-service.ts
export abstract class SyncService<T> {
  async sync(userId: string): Promise<SyncResult> {
    const startTime = Date.now();
    
    try {
      // Step 1: Authenticate
      await this.authenticate(userId);
      
      // Step 2: Fetch remote data
      const remoteData = await this.fetchRemoteData();
      
      // Step 3: Fetch local data
      const localData = await this.fetchLocalData(userId);
      
      // Step 4: Compare and merge
      const changes = this.compareData(localData, remoteData);
      
      // Step 5: Apply changes
      await this.applyChanges(userId, changes);
      
      // Step 6: Update sync metadata
      await this.updateSyncMetadata(userId, new Date());
      
      return {
        success: true,
        itemsSynced: changes.length,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return this.handleSyncError(error);
    }
  }
  
  // Abstract methods that subclasses must implement
  protected abstract authenticate(userId: string): Promise<void>;
  protected abstract fetchRemoteData(): Promise<T[]>;
  protected abstract fetchLocalData(userId: string): Promise<T[]>;
  protected abstract compareData(local: T[], remote: T[]): SyncChange<T>[];
  protected abstract applyChanges(userId: string, changes: SyncChange<T>[]): Promise<void>;
  
  // Hook methods with default implementations
  protected async updateSyncMetadata(userId: string, timestamp: Date): Promise<void> {
    await db.syncMetadata.upsert({
      where: { userId_service: { userId, service: this.serviceName } },
      update: { lastSync: timestamp },
      create: { userId, service: this.serviceName, lastSync: timestamp },
    });
  }
  
  protected handleSyncError(error: any): SyncResult {
    logger.error('Sync failed', { error, service: this.serviceName });
    
    return {
      success: false,
      error: error.message,
      duration: 0,
    };
  }
  
  protected abstract serviceName: string;
}

// Concrete implementations
export class CalendarSyncService extends SyncService<CalendarEvent> {
  protected serviceName = 'calendar';
  
  constructor(
    private calendarAdapter: CalendarAdapter,
    private eventService: EventService
  ) {
    super();
  }
  
  protected async authenticate(userId: string): Promise<void> {
    const credentials = await this.getStoredCredentials(userId);
    await this.calendarAdapter.connect(credentials);
  }
  
  protected async fetchRemoteData(): Promise<CalendarEvent[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);
    
    return this.calendarAdapter.getEvents({
      start: thirtyDaysAgo,
      end: ninetyDaysFromNow,
    });
  }
  
  protected async fetchLocalData(userId: string): Promise<CalendarEvent[]> {
    return this.eventService.getUserEvents(userId);
  }
  
  protected compareData(
    local: CalendarEvent[],
    remote: CalendarEvent[]
  ): SyncChange<CalendarEvent>[] {
    const changes: SyncChange<CalendarEvent>[] = [];
    const localMap = new Map(local.map(e => [e.externalId, e]));
    const remoteMap = new Map(remote.map(e => [e.id, e]));
    
    // Find new and updated events
    for (const remoteEvent of remote) {
      const localEvent = localMap.get(remoteEvent.id);
      
      if (!localEvent) {
        changes.push({ type: 'create', data: remoteEvent });
      } else if (this.hasChanged(localEvent, remoteEvent)) {
        changes.push({ type: 'update', data: remoteEvent });
      }
    }
    
    // Find deleted events
    for (const localEvent of local) {
      if (!remoteMap.has(localEvent.externalId)) {
        changes.push({ type: 'delete', data: localEvent });
      }
    }
    
    return changes;
  }
  
  protected async applyChanges(
    userId: string,
    changes: SyncChange<CalendarEvent>[]
  ): Promise<void> {
    for (const change of changes) {
      switch (change.type) {
        case 'create':
          await this.eventService.create({ ...change.data, userId });
          break;
        case 'update':
          await this.eventService.update(change.data.id, change.data);
          break;
        case 'delete':
          await this.eventService.delete(change.data.id);
          break;
      }
    }
  }
  
  private hasChanged(local: CalendarEvent, remote: CalendarEvent): boolean {
    return local.updatedAt < remote.updatedAt;
  }
}
```

## Architectural Patterns

### Repository Pattern

Use for abstracting data access logic.

```typescript
// repositories/base-repository.ts
export interface Repository<T, ID = string> {
  findById(id: ID): Promise<T | null>;
  findAll(): Promise<T[]>;
  find(criteria: Partial<T>): Promise<T[]>;
  create(data: Omit<T, 'id'>): Promise<T>;
  update(id: ID, data: Partial<T>): Promise<T>;
  delete(id: ID): Promise<void>;
  exists(id: ID): Promise<boolean>;
}

export abstract class BaseRepository<T extends { id: string }>
  implements Repository<T> {
  
  constructor(protected db: PrismaClient, protected modelName: string) {}
  
  async findById(id: string): Promise<T | null> {
    return this.db[this.modelName].findUnique({ where: { id } });
  }
  
  async findAll(): Promise<T[]> {
    return this.db[this.modelName].findMany();
  }
  
  async find(criteria: Partial<T>): Promise<T[]> {
    return this.db[this.modelName].findMany({ where: criteria });
  }
  
  async create(data: Omit<T, 'id'>): Promise<T> {
    return this.db[this.modelName].create({ data });
  }
  
  async update(id: string, data: Partial<T>): Promise<T> {
    return this.db[this.modelName].update({
      where: { id },
      data,
    });
  }
  
  async delete(id: string): Promise<void> {
    await this.db[this.modelName].delete({ where: { id } });
  }
  
  async exists(id: string): Promise<boolean> {
    const count = await this.db[this.modelName].count({ where: { id } });
    return count > 0;
  }
}

// Specific repository
export class TaskRepository extends BaseRepository<Task> {
  constructor(db: PrismaClient) {
    super(db, 'task');
  }
  
  async findByUser(userId: string): Promise<Task[]> {
    return this.db.task.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
  
  async findOverdue(userId: string): Promise<Task[]> {
    return this.db.task.findMany({
      where: {
        userId,
        dueDate: { lt: new Date() },
        status: { not: 'completed' },
      },
    });
  }
  
  async bulkUpdateStatus(
    taskIds: string[],
    status: TaskStatus
  ): Promise<number> {
    const result = await this.db.task.updateMany({
      where: { id: { in: taskIds } },
      data: { status },
    });
    
    return result.count;
  }
}
```

### Unit of Work Pattern

Use for managing database transactions across multiple operations.

```typescript
// patterns/unit-of-work.ts
export class UnitOfWork {
  private operations: Array<() => Promise<any>> = [];
  
  constructor(private db: PrismaClient) {}
  
  addOperation(operation: () => Promise<any>): void {
    this.operations.push(operation);
  }
  
  async commit(): Promise<void> {
    await this.db.$transaction(async (tx) => {
      for (const operation of this.operations) {
        await operation.call(tx);
      }
    });
    
    this.operations = [];
  }
  
  rollback(): void {
    this.operations = [];
  }
}

// Usage
const uow = new UnitOfWork(db);

// Add multiple operations
uow.addOperation(async function() {
  await this.task.create({
    data: { title: 'New Task', userId: 'user123' }
  });
});

uow.addOperation(async function() {
  await this.project.update({
    where: { id: 'project123' },
    data: { taskCount: { increment: 1 } }
  });
});

uow.addOperation(async function() {
  await this.notification.create({
    data: {
      userId: 'user123',
      message: 'Task created',
      type: 'task_created'
    }
  });
});

// Commit all operations in a single transaction
try {
  await uow.commit();
} catch (error) {
  console.error('Transaction failed:', error);
  uow.rollback();
}
``` Overview

This document outlines approved design patterns for common scenarios in the Life OS codebase, ensuring consistent and maintainable solutions.

## Creational Patterns

### Factory Pattern

Use for creating complex objects with multiple configurations.

```typescript
// factories/task-factory.ts
export class TaskFactory {
  static createFromVoiceCommand(
    command: VoiceCommand,
    context: UserContext
  ): Task {
    const task = new Task({
      title: command.extractedTitle,
      userId: context.userId,
      source: 'voice',
      metadata: {
        transcription: command.rawText,
        confidence: command.confidence,
      },
    });
    
    // Apply context-aware defaults
    if (context.activeProject) {
      task.projectId = context.activeProject.id;
    }
    
    // Parse and apply due date
    if (command.timeExpression) {
      task.dueDate = this.parseTimeExpression(
        command.timeExpression,
        context.timezone
      );
    }
    
    return task;
  }
  
  static createFromEmail(
    email: ParsedEmail,
    userId: string
  ): Task {
    return new Task({
      title: email.subject,
      description: email.body,
      userId,
      source: 'email',
      metadata: {
        emailId: email.id,
        sender: email.from,
      },
    });
  }
  
  static createRecurring(
    template: TaskTemplate,
    date: Date
  ): Task {
    return new Task({
      ...template,
      dueDate: date,
      recurringId: template.id,
      metadata: {
        ...template.metadata,
        generatedFrom: template.id,
      },
    });
  }
}

// Usage
const task = TaskFactory.createFromVoiceCommand(voiceCommand, context);
```

### Builder Pattern

Use for constructing complex queries or configurations.

```typescript
// builders/query-builder.ts
export class TaskQueryBuilder {
  private query: TaskQuery = {};
  
  forUser(userId: string): this {
    this.query.userId = userId;
    return this;
  }
  
  inProject(projectId: string): this {
    this.query.projectId = projectId;
    return this;
  }
  
  withStatus(status: TaskStatus | TaskStatus[]): this {
    this.query.status = Array.isArray(status) ? { in: status } : status;
    return this;
  }
  
  dueBefore(date: Date): this {
    this.query.dueDate = { ...this.query.dueDate, lte: date };
    return this;
  }
  
  dueAfter(date: Date): this {
    this.query.dueDate = { ...this.query.dueDate, gte: date };
    return this;
  }
  
  withTags(tags: string[]): this {
    this.query.tags = { hasSome: tags };
    return this;
  }
  
  orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): this {
    this.query.orderBy = { [field]: direction };
    return this;
  }
  
  paginate(page: number, limit: number): this {
    this.query.skip = (page - 1) * limit;
    this.query.take = limit;
    return this;
  }
  
  build(): TaskQuery {
    return this.query;
  }
}

// Usage
const query = new TaskQueryBuilder()
  .forUser(userId)
  .withStatus(['pending', 'in_progress'])
  .dueBefore(nextWeek)
  .orderBy('dueDate', 'asc')
  .paginate(1, 20)
  .build();

const tasks = await taskRepository.find(query);
```

### Singleton Pattern

Use sparingly, only for truly global services.

```typescript
// services/voice-engine.ts
export class VoiceEngine {
  private static instance: VoiceEngine;
  private recognizer: SpeechRecognition;
  private isInitialized = false;
  
  private constructor() {
    // Private constructor prevents direct instantiation
  }
  
  static getInstance(): VoiceEngine {
    if (!VoiceEngine.instance) {
      VoiceEngine.instance = new VoiceEngine();
    }
    return VoiceEngine.instance;
  }
  
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    this.recognizer = new (window.SpeechRecognition || 
                           window.webkitSpeechRecognition)();
    this.recognizer.continuous = true;
    this.recognizer.interimResults = true;
    
    this.isInitialized = true;
  }
  
  startRecognition(options: RecognitionOptions): void {
    if (!this.isInitialized) {
      throw new Error('VoiceEngine not initialized');
    }
    
    this.recognizer.lang = options.language;
    this.recognizer.start();
  }
}

// Usage
const voiceEngine = VoiceEngine.getInstance();
await voiceEngine.initialize();
```

## Structural Patterns

### Adapter Pattern

Use to integrate third-party services with consistent interfaces.

```typescript
// adapters/calendar-adapter.ts
export interface CalendarAdapter {
  connect(credentials: any): Promise<void>;
  getEvents(dateRange: DateRange): Promise<CalendarEvent[]>;
  createEvent(event: CalendarEvent): Promise<string>;
  updateEvent(id: string, event: Partial<CalendarEvent>): Promise<void>;
  deleteEvent(id: string): Promise<void>;
}

export class GoogleCalendarAdapter implements CalendarAdapter {
  private client: any;
  
  async connect(credentials: GoogleCredentials): Promise<void> {
    this.client = await google.auth.getClient({
      credentials,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });
  }
  
  async getEvents(dateRange: DateRange): Promise<CalendarEvent[]> {
    const response = await this.client.events.list({
      calendarId: 'primary',
      timeMin: dateRange.start.toISOString(),
      timeMax: dateRange.end.toISOString(),
    });
    
    return response.data.items.map(this.transformGoogleEvent);
  }
  
  private transformGoogleEvent(googleEvent: any): CalendarEvent {
    return {
      id: googleEvent.id,
      title: googleEvent.summary,
      description: googleEvent.description,
      startTime: new Date(googleEvent.start.dateTime),
      endTime: new Date(googleEvent.end.dateTime),
      location: googleEvent.location,
      attendees: googleEvent.attendees?.map(a => a.email),
    };
  }
  
  // ... other methods
}

export class OutlookCalendarAdapter implements CalendarAdapter {
  // Different implementation for Outlook
}

// Factory for creating adapters
export class CalendarAdapterFactory {
  static create(provider: 'google' | 'outlook'): CalendarAdapter {
    switch (provider) {
      case 'google':
        return new GoogleCalendarAdapter();
      case 'outlook':
        return new OutlookCalendarAdapter();
      default:
        throw new Error(`Unknown calendar provider: ${provider}`);
    }
  }
}
```

### Decorator Pattern

Use for adding behavior to objects dynamically.

```typescript
// decorators/cached.ts
export function Cached(ttl: number = 300) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const cacheKey = `${target.constructor.name}.${propertyKey}`;
    
    descriptor.value = async function (...args: any[]) {
      const argsKey = JSON.stringify(args);
      const cached = await cache.get(`${cacheKey}:${argsKey}`);
      
      if (cached) {
        return cached;
      }
      
      const result = await originalMethod.apply(this, args);
      await cache.set(`${cacheKey}:${argsKey}`, result, ttl);
      
      return result;
    };
    
    return descriptor;
  };
}

// decorators/retry.ts
export function Retry(attempts: number = 3, delay: number = 1000) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      let lastError: Error;
      
      for (let i = 0; i < attempts; i++) {
        try {
          return await originalMethod.apply(this, args);
        } catch (error) {
          lastError = error;
          
          if (i < attempts - 1) {
            await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
          }
        }
      }
      
      throw lastError!;
    };
    
    return descriptor;
  };
}

// Usage
export class TransactionService {
  @Cached(600) // Cache for 10 minutes
  @Retry(3, 2000) // Retry 3 times with exponential backoff
  async getTransactionSummary(userId: string, period: string) {
    return await this.complexCalculation(userId, period);
  }
}
```

### Facade Pattern

Use to provide simplified interfaces to complex subsystems.

```typescript
// facades/financial-facade.ts
export class FinancialFacade {
  constructor(
    private bankService: BankService,
    private transactionService: TransactionService,
    private categoryService: CategoryService,
    private reportService: ReportService
  ) {}
  
  async connectBankAccount(userId: string, publicToken: string) {
    // Handle the complex flow of connecting a bank account
    const accessToken = await this.bankService.exchangeToken(publicToken);
    const accounts = await this.bankService.getAccounts(accessToken);
    
    // Store accounts
    await Promise.all(
      accounts.map(account => 
        this.bankService.saveAccount(userId, account)
      )
    );
    
    // Initial sync
    await this.syncTransactions(userId);
    
    // Setup webhook
    await this.bankService.registerWebhook(userId);
    
    return accounts;
  }
  
  async syncTransactions(userId: string) {
    const accounts = await this.bankService.getUserAccounts(userId);
    
    for (const account of accounts) {
      const transactions = await this.bankService.getTransactions(
        account.accessToken,
        account.lastSync
      );
      
      for (const transaction of transactions) {
        // Auto-categorize
        const category = await this.categoryService.categorize(transaction);
        
        // Save with enrichment
        await this.transactionService.create({
          ...transaction,
          userId,
          accountId: account.id,
          categoryId: category.id,
        });
      }
      
      // Update sync timestamp
      await this.bankService.updateLastSync(account.id);
    }
  }
  
  async getFinancialDashboard(userId: string, period: Period) {
    // Aggregate data from multiple services
    const [
      accounts,
      transactions,
      categories,
      budgets,
    ] = await Promise.all([
      this.bankService.getUserAccounts(userId),
      this.transactionService.getForPeriod(userId, period),
      this.categoryService.getUserCategories(userId),
      this.reportService.getBudgetStatus(userId, period),
    ]);
    
    return {
      totalBalance: accounts.reduce((sum, acc) => sum + acc.balance, 0),
      income: this.calculateIncome(transactions),
      expenses: this.calculateExpenses(transactions),
      byCategory: this.groupByCategory(transactions, categories),
      budgets: budgets,
      recentTransactions: transactions.slice(0, 10),
    };
  }
}

// Usage - much simpler than dealing with individual services
const financial = new FinancialFacade(
  bankService,
  transactionService,
  categoryService,
  reportService
);

const dashboard = await financial.getFinancialDashboard(userId, 'thisMonth');
```

##