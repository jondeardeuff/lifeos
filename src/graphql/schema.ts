/**
 * GraphQL SDL string covering the enhanced task management domain.
 * This file is kept separate from resolver implementation so that the
 * schema can be consumed by tooling (codegen, tests, etc.).
 */
export const typeDefs = /* GraphQL */ `
  """
  Custom scalar representing ISO-8601 date-time strings.
  """
  scalar DateTime

  """
  Custom scalar representing arbitrary JSON.
  """
  scalar JSON

  # --------------------------------------------------
  # Enums
  # --------------------------------------------------

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

  # --------------------------------------------------
  # Types
  # --------------------------------------------------

  type User {
    id: ID!
    email: String!
    firstName: String!
    lastName: String!
    fullName: String!
    createdAt: DateTime!
  }

  type TaskTag {
    id: ID!
    name: String!
    color: String!
    taskCount: Int!
  }

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

  type TaskStats {
    total: Int!
    pending: Int!
    inProgress: Int!
    completed: Int!
    overdue: Int!
    dueToday: Int!
  }

  # --------------------------------------------------
  # Inputs
  # --------------------------------------------------

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
    timezone: String
    tags: [String!]
    metadata: JSON
  }

  # --------------------------------------------------
  # Queries
  # --------------------------------------------------

  type Query {
    # Health-check endpoint
    health: String!

    # Auth-related
    me: User

    # Task queries
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

  # --------------------------------------------------
  # Mutations
  # --------------------------------------------------

  type Mutation {
    # Auth
    signup(input: SignupInput!): AuthPayload!
    login(email: String!, password: String!): AuthPayload!

    # Task CRUD
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

  # --------------------------------------------------
  # Auth payloads / inputs
  # (kept here to maintain a single SDL file)
  # --------------------------------------------------

  type AuthPayload {
    user: User!
    accessToken: String!
    refreshToken: String!
  }

  input SignupInput {
    email: String!
    password: String!
    firstName: String!
    lastName: String!
  }
`;

export default typeDefs;