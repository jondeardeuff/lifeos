import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read the schema file
export const typeDefs = readFileSync(
  join(__dirname, 'schema.graphql'),
  'utf-8'
);

// Export GraphQL type definitions as string
export default typeDefs;

// Additional scalar resolvers for custom types
export const scalarResolvers = {
  Date: {
    serialize: (value: Date | string | number) => {
      if (value instanceof Date) {
        return value.toISOString();
      }
      if (typeof value === 'string' || typeof value === 'number') {
        return new Date(value).toISOString();
      }
      throw new Error('Invalid date value');
    },
    parseValue: (value: string | number) => {
      return new Date(value);
    },
    parseLiteral: (ast: any) => {
      if (ast.kind === 'StringValue' || ast.kind === 'IntValue') {
        return new Date(ast.value);
      }
      throw new Error('Invalid date literal');
    }
  },
  JSON: {
    serialize: (value: any) => {
      return value;
    },
    parseValue: (value: any) => {
      return value;
    },
    parseLiteral: (ast: any) => {
      switch (ast.kind) {
        case 'StringValue':
          return JSON.parse(ast.value);
        case 'ObjectValue':
          return ast.fields.reduce((obj: any, field: any) => {
            obj[field.name.value] = parseLiteral(field.value);
            return obj;
          }, {});
        case 'ListValue':
          return ast.values.map(parseLiteral);
        case 'NullValue':
          return null;
        case 'BooleanValue':
        case 'IntValue':
        case 'FloatValue':
          return ast.value;
        default:
          throw new Error(`Unexpected kind in JSON literal: ${ast.kind}`);
      }
    }
  }
};

// Helper function for parsing literals
function parseLiteral(ast: any): any {
  switch (ast.kind) {
    case 'StringValue':
    case 'BooleanValue':
      return ast.value;
    case 'IntValue':
    case 'FloatValue':
      return parseFloat(ast.value);
    case 'ObjectValue':
      return ast.fields.reduce((obj: any, field: any) => {
        obj[field.name.value] = parseLiteral(field.value);
        return obj;
      }, {});
    case 'ListValue':
      return ast.values.map(parseLiteral);
    case 'NullValue':
      return null;
    default:
      throw new Error(`Unexpected kind in literal: ${ast.kind}`);
  }
}

// GraphQL type mappings for TypeScript
export interface GraphQLContext {
  user?: {
    id: string;
    email: string;
    fullName: string;
    timezone: string;
  };
  token?: string;
  isAuthenticated: boolean;
  req?: {
    headers?: {
      authorization?: string;
    };
  };
  res?: any;
}

// Resolver type definitions
export interface Resolvers {
  Query: {
    me: (parent: any, args: any, context: GraphQLContext) => Promise<any>;
    user: (parent: any, args: { id: string }, context: GraphQLContext) => Promise<any>;
    users: (parent: any, args: { pagination?: PaginationInput }, context: GraphQLContext) => Promise<any[]>;
    task: (parent: any, args: { id: string }, context: GraphQLContext) => Promise<any>;
    tasks: (parent: any, args: TasksQueryArgs, context: GraphQLContext) => Promise<any>;
    myTasks: (parent: any, args: TasksQueryArgs, context: GraphQLContext) => Promise<any>;
    taskDependencies: (parent: any, args: { taskId: string }, context: GraphQLContext) => Promise<any[]>;
    taskComments: (parent: any, args: TaskCommentsArgs, context: GraphQLContext) => Promise<any[]>;
    taskAttachments: (parent: any, args: { taskId: string }, context: GraphQLContext) => Promise<any[]>;
  };
  
  Mutation: {
    signup: (parent: any, args: { input: SignupInput }, context: GraphQLContext) => Promise<any>;
    login: (parent: any, args: { input: LoginInput }, context: GraphQLContext) => Promise<any>;
    refreshToken: (parent: any, args: { input: RefreshTokenInput }, context: GraphQLContext) => Promise<any>;
    logout: (parent: any, args: any, context: GraphQLContext) => Promise<boolean>;
    updateProfile: (parent: any, args: { input: UpdateProfileInput }, context: GraphQLContext) => Promise<any>;
    updatePreferences: (parent: any, args: { input: UpdatePreferencesInput }, context: GraphQLContext) => Promise<any>;
    createTask: (parent: any, args: { input: CreateTaskInput }, context: GraphQLContext) => Promise<any>;
    updateTask: (parent: any, args: { id: string; input: UpdateTaskInput }, context: GraphQLContext) => Promise<any>;
    deleteTask: (parent: any, args: { id: string }, context: GraphQLContext) => Promise<boolean>;
    completeTask: (parent: any, args: { id: string }, context: GraphQLContext) => Promise<any>;
    addTaskComment: (parent: any, args: AddTaskCommentArgs, context: GraphQLContext) => Promise<any>;
    updateTaskComment: (parent: any, args: UpdateTaskCommentArgs, context: GraphQLContext) => Promise<any>;
    deleteTaskComment: (parent: any, args: { id: string }, context: GraphQLContext) => Promise<boolean>;
    addTaskAttachment: (parent: any, args: AddTaskAttachmentArgs, context: GraphQLContext) => Promise<any>;
    deleteTaskAttachment: (parent: any, args: { id: string }, context: GraphQLContext) => Promise<boolean>;
    addTaskDependency: (parent: any, args: AddTaskDependencyArgs, context: GraphQLContext) => Promise<any>;
    removeTaskDependency: (parent: any, args: RemoveTaskDependencyArgs, context: GraphQLContext) => Promise<boolean>;
  };
  
  // Field resolvers
  Task: {
    user: (parent: any, args: any, context: GraphQLContext) => Promise<any>;
    assignee: (parent: any, args: any, context: GraphQLContext) => Promise<any>;
    parentTask: (parent: any, args: any, context: GraphQLContext) => Promise<any>;
    subtasks: (parent: any, args: any, context: GraphQLContext) => Promise<any[]>;
    comments: (parent: any, args: any, context: GraphQLContext) => Promise<any[]>;
    attachments: (parent: any, args: any, context: GraphQLContext) => Promise<any[]>;
    dependencies: (parent: any, args: any, context: GraphQLContext) => Promise<any[]>;
  };
  
  TaskComment: {
    task: (parent: any, args: any, context: GraphQLContext) => Promise<any>;
    user: (parent: any, args: any, context: GraphQLContext) => Promise<any>;
  };
  
  TaskAttachment: {
    task: (parent: any, args: any, context: GraphQLContext) => Promise<any>;
    user: (parent: any, args: any, context: GraphQLContext) => Promise<any>;
  };
}

// Input type definitions
export interface PaginationInput {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface TaskFilterInput {
  status?: string;
  priority?: string;
  assigneeId?: string;
  projectId?: string;
  tags?: string[];
  dueBefore?: Date;
  dueAfter?: Date;
}

export interface TasksQueryArgs {
  filter?: TaskFilterInput;
  pagination?: PaginationInput;
}

export interface TaskCommentsArgs {
  taskId: string;
  pagination?: PaginationInput;
}

export interface SignupInput {
  email: string;
  password: string;
  fullName: string;
  timezone: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RefreshTokenInput {
  refreshToken: string;
}

export interface UpdateProfileInput {
  fullName?: string;
  phone?: string;
  avatarUrl?: string;
  timezone?: string;
  settings?: Record<string, any>;
}

export interface UpdatePreferencesInput {
  voiceEnabled?: boolean;
  voiceLanguage?: string;
  notificationSettings?: NotificationSettingsInput;
  calendarSettings?: CalendarSettingsInput;
  financialSettings?: FinancialSettingsInput;
}

export interface NotificationSettingsInput {
  email?: boolean;
  sms?: boolean;
  push?: boolean;
  taskReminders?: boolean;
  eventReminders?: boolean;
  dailySummary?: boolean;
}

export interface CalendarSettingsInput {
  defaultView?: string;
  weekStartsOn?: number;
  workingHours?: WorkingHoursInput;
  timeZone?: string;
}

export interface WorkingHoursInput {
  start?: string;
  end?: string;
}

export interface FinancialSettingsInput {
  currency?: string;
  fiscalYearStart?: number;
  taxRate?: number;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  projectId?: string;
  assigneeId?: string;
  priority?: string;
  dueDate?: Date;
  tags?: string[];
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: Date;
  assigneeId?: string;
  tags?: string[];
}

export interface AddTaskCommentArgs {
  taskId: string;
  comment: string;
}

export interface UpdateTaskCommentArgs {
  id: string;
  comment: string;
}

export interface AddTaskAttachmentArgs {
  taskId: string;
  fileName: string;
  fileSize: number;
  fileType?: string;
  storageUrl: string;
}

export interface AddTaskDependencyArgs {
  taskId: string;
  dependsOnTaskId: string;
  dependencyType: string;
}

export interface RemoveTaskDependencyArgs {
  taskId: string;
  dependsOnTaskId: string;
}