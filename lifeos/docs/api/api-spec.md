# Life OS API Specification

## Overview

The Life OS API uses GraphQL as the primary interface with REST endpoints for webhooks and file uploads.

Base URLs:
- Production: `https://api.lifeos.app/graphql`
- Staging: `https://staging-api.lifeos.app/graphql`
- Development: `http://localhost:4000/graphql`

## Authentication

All requests require a valid JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

Token structure:
```json
{
  "sub": "user_id",
  "email": "user@example.com",
  "org_id": "organization_id",
  "roles": ["user", "admin"],
  "exp": 1234567890
}
```

## GraphQL Schema

### Core Types

```graphql
scalar DateTime
scalar JSON
scalar UUID

type User {
  id: UUID!
  email: String!
  fullName: String!
  phone: String
  avatarUrl: String
  timezone: String!
  settings: JSON!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type Task {
  id: UUID!
  title: String!
  description: String
  status: TaskStatus!
  priority: Int!
  dueDate: DateTime
  completedAt: DateTime
  project: Project
  assignee: User
  creator: User!
  parent: Task
  subtasks: [Task!]!
  tags: [String!]!
  attachments: [TaskAttachment!]!
  comments: [TaskComment!]!
  metadata: JSON!
  createdAt: DateTime!
  updatedAt: DateTime!
}

enum TaskStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

type Project {
  id: UUID!
  name: String!
  description: String
  clientName: String
  status: ProjectStatus!
  startDate: DateTime
  endDate: DateTime
  budget: Float
  currentCost: Float!
  progress: Float!
  color: String
  members: [ProjectMember!]!
  tasks: [Task!]!
  transactions: [Transaction!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}

enum ProjectStatus {
  ACTIVE
  COMPLETED
  ON_HOLD
  CANCELLED
}

type Event {
  id: UUID!
  title: String!
  description: String
  location: String
  startTime: DateTime!
  endTime: DateTime!
  allDay: Boolean!
  status: EventStatus!
  project: Project
  task: Task
  attendees: [EventAttendee!]!
  creator: User!
  createdAt: DateTime!
  updatedAt: DateTime!
}

enum EventStatus {
  CONFIRMED
  TENTATIVE
  CANCELLED
}

type Transaction {
  id: UUID!
  amount: Float!
  currency: String!
  date: DateTime!
  description: String!
  merchantName: String
  category: Category
  project: Project
  account: BankAccount!
  isPending: Boolean!
  receiptUrl: String
  notes: String
  createdAt: DateTime!
  updatedAt: DateTime!
}
```

### Query Operations

```graphql
type Query {
  # User queries
  me: User!
  user(id: UUID!): User
  
  # Task queries
  tasks(
    filter: TaskFilter
    sort: TaskSort
    pagination: PaginationInput
  ): TaskConnection!
  task(id: UUID!): Task
  
  # Project queries
  projects(
    filter: ProjectFilter
    sort: ProjectSort
    pagination: PaginationInput
  ): ProjectConnection!
  project(id: UUID!): Project
  
  # Calendar queries
  events(
    startDate: DateTime!
    endDate: DateTime!
    filter: EventFilter
  ): [Event!]!
  event(id: UUID!): Event
  
  # Financial queries
  transactions(
    filter: TransactionFilter
    sort: TransactionSort
    pagination: PaginationInput
  ): TransactionConnection!
  transaction(id: UUID!): Transaction
  
  accounts: [BankAccount!]!
  account(id: UUID!): BankAccount
  
  # Analytics queries
  taskAnalytics(timeframe: Timeframe!): TaskAnalytics!
  financialAnalytics(timeframe: Timeframe!): FinancialAnalytics!
  projectAnalytics(projectId: UUID!): ProjectAnalytics!
}

# Filter inputs
input TaskFilter {
  status: TaskStatus
  assigneeId: UUID
  projectId: UUID
  tags: [String!]
  dueBefore: DateTime
  dueAfter: DateTime
  search: String
}

input TransactionFilter {
  accountId: UUID
  categoryId: UUID
  projectId: UUID
  startDate: DateTime
  endDate: DateTime
  minAmount: Float
  maxAmount: Float
  search: String
}

# Sorting
input TaskSort {
  field: TaskSortField!
  direction: SortDirection!
}

enum TaskSortField {
  CREATED_AT
  UPDATED_AT
  DUE_DATE
  PRIORITY
  TITLE
}

enum SortDirection {
  ASC
  DESC
}

# Pagination
input PaginationInput {
  limit: Int = 20
  offset: Int = 0
}

type TaskConnection {
  nodes: [Task!]!
  totalCount: Int!
  pageInfo: PageInfo!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  totalPages: Int!
  currentPage: Int!
}
```

### Mutation Operations

```graphql
type Mutation {
  # Task mutations
  createTask(input: CreateTaskInput!): Task!
  updateTask(id: UUID!, input: UpdateTaskInput!): Task!
  deleteTask(id: UUID!): Boolean!
  completeTask(id: UUID!): Task!
  assignTask(taskId: UUID!, userId: UUID!): Task!
  
  # Voice command
  processVoiceCommand(input: VoiceCommandInput!): VoiceCommandResult!
  
  # Project mutations
  createProject(input: CreateProjectInput!): Project!
  updateProject(id: UUID!, input: UpdateProjectInput!): Project!
  archiveProject(id: UUID!): Project!
  
  # Calendar mutations
  createEvent(input: CreateEventInput!): Event!
  updateEvent(id: UUID!, input: UpdateEventInput!): Event!
  deleteEvent(id: UUID!): Boolean!
  
  # Financial mutations
  createTransaction(input: CreateTransactionInput!): Transaction!
  updateTransaction(id: UUID!, input: UpdateTransactionInput!): Transaction!
  deleteTransaction(id: UUID!): Boolean!
  categorizeTransaction(id: UUID!, categoryId: UUID!): Transaction!
  
  connectBankAccount(input: ConnectBankAccountInput!): BankAccount!
  syncBankAccount(id: UUID!): SyncResult!
  
  # User settings
  updateUserSettings(input: UpdateUserSettingsInput!): User!
  updateUserPreferences(input: UpdateUserPreferencesInput!): UserPreferences!
}

# Input types
input CreateTaskInput {
  title: String!
  description: String
  projectId: UUID
  assigneeId: UUID
  dueDate: DateTime
  priority: Int = 3
  tags: [String!]
  parentTaskId: UUID
}

input VoiceCommandInput {
  audioUrl: String
  transcription: String
  context: VoiceContextInput
}

input VoiceContextInput {
  currentProjectId: UUID
  currentView: String
  timezone: String
}

type VoiceCommandResult {
  success: Boolean!
  action: String!
  confidence: Float!
  result: JSON
  alternativeInterpretations: [AlternativeInterpretation!]
}

input CreateProjectInput {
  name: String!
  description: String
  clientName: String
  startDate: DateTime
  endDate: DateTime
  budget: Float
  color: String
}

input CreateEventInput {
  title: String!
  description: String
  location: String
  startTime: DateTime!
  endTime: DateTime!
  allDay: Boolean = false
  projectId: UUID
  taskId: UUID
  attendeeEmails: [String!]
}

input CreateTransactionInput {
  amount: Float!
  date: DateTime!
  description: String!
  merchantName: String
  categoryId: UUID
  projectId: UUID
  accountId: UUID!
  notes: String
}
```

### Subscription Operations

```graphql
type Subscription {
  # Real-time task updates
  taskUpdated(projectId: UUID): Task!
  taskCreated(projectId: UUID): Task!
  taskDeleted(projectId: UUID): UUID!
  
  # Calendar updates
  eventUpdated(userId: UUID!): Event!
  eventCreated(userId: UUID!): Event!
  
  # Financial updates
  transactionCreated(accountId: UUID): Transaction!
  accountBalanceUpdated(accountId: UUID!): BankAccount!
  
  # Voice processing
  voiceCommandProcessing(userId: UUID!): VoiceProcessingUpdate!
}

type VoiceProcessingUpdate {
  status: ProcessingStatus!
  message: String
  progress: Float
}

enum ProcessingStatus {
  RECORDING
  TRANSCRIBING
  PROCESSING
  COMPLETED
  FAILED
}
```

## REST Endpoints

### File Upload

```
POST /api/upload
Content-Type: multipart/form-data

Parameters:
- file: File data
- type: "avatar" | "receipt" | "attachment" | "document"
- entityType: "task" | "project" | "transaction"
- entityId: UUID

Response:
{
  "url": "https://storage.lifeos.app/...",
  "fileId": "uuid",
  "size": 1234567,
  "mimeType": "image/jpeg"
}
```

### Webhook Registration

```
POST /api/webhooks
Content-Type: application/json

{
  "url": "https://your-domain.com/webhook",
  "events": ["task.created", "transaction.created"],
  "secret": "your-secret-key"
}

Response:
{
  "id": "webhook-id",
  "url": "https://your-domain.com/webhook",
  "events": ["task.created", "transaction.created"],
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### Voice Recording

```
POST /api/voice/record
Content-Type: multipart/form-data

Parameters:
- audio: Audio file (webm, mp3, wav)
- context: JSON context object

Response:
{
  "transcription": "Add task to buy milk",
  "confidence": 0.95,
  "commandId": "uuid"
}
```

## Error Handling

All errors follow this format:

```json
{
  "errors": [
    {
      "message": "Task not found",
      "code": "NOT_FOUND",
      "path": ["task"],
      "extensions": {
        "taskId": "invalid-uuid"
      }
    }
  ]
}
```

Error codes:
- `UNAUTHENTICATED`: Missing or invalid token
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Input validation failed
- `INTERNAL_ERROR`: Server error
- `RATE_LIMITED`: Too many requests

## Rate Limiting

- Authenticated requests: 1000/hour
- Voice commands: 100/hour
- File uploads: 50/hour
- Webhook calls: 10,000/hour

Headers:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 950
X-RateLimit-Reset: 1640995200
```

## Pagination

All list queries support cursor-based pagination:

```graphql
query GetTasks($cursor: String, $limit: Int = 20) {
  tasks(after: $cursor, first: $limit) {
    edges {
      cursor
      node {
        id
        title
      }
    }
    pageInfo {
      endCursor
      hasNextPage
    }
  }
}
```

## Versioning

API version is specified in the URL:
- Current: `/graphql` (v1)
- Future: `/v2/graphql`

Deprecation notices are included in response headers:
```
X-API-Deprecation-Date: 2024-12-31
X-API-Deprecation-Info: https://docs.lifeos.app/deprecations
```

## WebSocket Protocol

For subscriptions, connect to:
```
wss://api.lifeos.app/graphql-ws
```

Connection protocol:
1. Connect with subprotocol `graphql-ws`
2. Send connection_init with auth token
3. Subscribe to events
4. Handle connection_ack, next, error, complete messages

Example:
```json
{
  "type": "connection_init",
  "payload": {
    "authorization": "Bearer <token>"
  }
}
```
  