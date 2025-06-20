import { gql } from '@apollo/client';

// Task fragments for reusability
export const TASK_FRAGMENT = gql`
  fragment TaskFragment on Task {
    id
    title
    description
    status
    priority
    dueDate
    completedAt
    createdAt
    updatedAt
    tags
    estimatedHours
    actualHours
    owner {
      id
      firstName
      lastName
      email
      avatar
    }
    assignee {
      id
      firstName
      lastName
      email
      avatar
    }
    project {
      id
      name
      color
    }
    parentTask {
      id
      title
    }
    _count {
      subtasks
      comments
      attachments
    }
  }
`;

export const TASK_DETAIL_FRAGMENT = gql`
  fragment TaskDetailFragment on Task {
    ...TaskFragment
    subtasks {
      id
      title
      status
      priority
      dueDate
      assignee {
        id
        firstName
        lastName
        email
        avatar
      }
    }
    comments {
      id
      comment
      createdAt
      user {
        id
        firstName
        lastName
        email
        avatar
      }
    }
    attachments {
      id
      fileName
      fileSize
      storageUrl
      uploadedAt
      uploadedBy {
        id
        firstName
        lastName
        email
      }
    }
    dependencies {
      id
      dependsOnTask {
        id
        title
        status
      }
      dependencyType
    }
  }
  ${TASK_FRAGMENT}
`;

// Queries
export const TASKS_QUERY = gql`
  query GetTasks($filter: TaskFilterInput, $sort: TaskSortInput, $pagination: PaginationInput) {
    tasks(filter: $filter, sort: $sort, pagination: $pagination) {
      nodes {
        ...TaskFragment
      }
      totalCount
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
  ${TASK_FRAGMENT}
`;

export const MY_TASKS_QUERY = gql`
  query GetMyTasks($filter: TaskFilterInput, $sort: TaskSortInput, $pagination: PaginationInput) {
    myTasks(filter: $filter, sort: $sort, pagination: $pagination) {
      nodes {
        ...TaskFragment
      }
      totalCount
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
  ${TASK_FRAGMENT}
`;

export const TASK_QUERY = gql`
  query GetTask($id: ID!) {
    task(id: $id) {
      ...TaskDetailFragment
    }
  }
  ${TASK_DETAIL_FRAGMENT}
`;

export const TASK_DEPENDENCIES_QUERY = gql`
  query GetTaskDependencies($taskId: ID!) {
    taskDependencies(taskId: $taskId) {
      id
      dependsOnTask {
        id
        title
        status
        priority
        dueDate
      }
      dependencyType
    }
  }
`;

export const TASK_COMMENTS_QUERY = gql`
  query GetTaskComments($taskId: ID!, $pagination: PaginationInput) {
    taskComments(taskId: $taskId, pagination: $pagination) {
      nodes {
        id
        comment
        createdAt
        user {
          id
          firstName
          lastName
          email
          avatar
        }
      }
      totalCount
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`;

export const TASK_ATTACHMENTS_QUERY = gql`
  query GetTaskAttachments($taskId: ID!) {
    taskAttachments(taskId: $taskId) {
      id
      fileName
      fileSize
      storageUrl
      uploadedAt
      uploadedBy {
        id
        firstName
        lastName
        email
      }
    }
  }
`;

// Mutations
export const CREATE_TASK_MUTATION = gql`
  mutation CreateTask($input: CreateTaskInput!) {
    createTask(input: $input) {
      ...TaskFragment
    }
  }
  ${TASK_FRAGMENT}
`;

export const UPDATE_TASK_MUTATION = gql`
  mutation UpdateTask($id: ID!, $input: UpdateTaskInput!) {
    updateTask(id: $id, input: $input) {
      ...TaskFragment
    }
  }
  ${TASK_FRAGMENT}
`;

export const DELETE_TASK_MUTATION = gql`
  mutation DeleteTask($id: ID!) {
    deleteTask(id: $id)
  }
`;

export const COMPLETE_TASK_MUTATION = gql`
  mutation CompleteTask($id: ID!) {
    completeTask(id: $id) {
      ...TaskFragment
    }
  }
  ${TASK_FRAGMENT}
`;

export const ASSIGN_TASK_MUTATION = gql`
  mutation AssignTask($id: ID!, $assigneeId: ID!) {
    assignTask(id: $id, assigneeId: $assigneeId) {
      ...TaskFragment
    }
  }
  ${TASK_FRAGMENT}
`;

export const ADD_TASK_COMMENT_MUTATION = gql`
  mutation AddTaskComment($taskId: ID!, $comment: String!) {
    addTaskComment(taskId: $taskId, comment: $comment) {
      id
      comment
      createdAt
      user {
        id
        firstName
        lastName
        email
        avatar
      }
    }
  }
`;

export const UPDATE_TASK_COMMENT_MUTATION = gql`
  mutation UpdateTaskComment($id: ID!, $comment: String!) {
    updateTaskComment(id: $id, comment: $comment) {
      id
      comment
      createdAt
      user {
        id
        firstName
        lastName
        email
        avatar
      }
    }
  }
`;

export const DELETE_TASK_COMMENT_MUTATION = gql`
  mutation DeleteTaskComment($id: ID!) {
    deleteTaskComment(id: $id)
  }
`;

export const ADD_TASK_ATTACHMENT_MUTATION = gql`
  mutation AddTaskAttachment(
    $taskId: ID!
    $fileName: String!
    $fileSize: Int!
    $storageUrl: String!
    $mimeType: String
  ) {
    addTaskAttachment(
      taskId: $taskId
      fileName: $fileName
      fileSize: $fileSize
      storageUrl: $storageUrl
      mimeType: $mimeType
    ) {
      id
      fileName
      fileSize
      storageUrl
      uploadedAt
      uploadedBy {
        id
        firstName
        lastName
        email
      }
    }
  }
`;

export const DELETE_TASK_ATTACHMENT_MUTATION = gql`
  mutation DeleteTaskAttachment($id: ID!) {
    deleteTaskAttachment(id: $id)
  }
`;

export const ADD_TASK_DEPENDENCY_MUTATION = gql`
  mutation AddTaskDependency($taskId: ID!, $dependsOnTaskId: ID!, $dependencyType: String!) {
    addTaskDependency(taskId: $taskId, dependsOnTaskId: $dependsOnTaskId, dependencyType: $dependencyType) {
      id
      dependsOnTask {
        id
        title
        status
        priority
        dueDate
      }
      dependencyType
    }
  }
`;

export const REMOVE_TASK_DEPENDENCY_MUTATION = gql`
  mutation RemoveTaskDependency($taskId: ID!, $dependsOnTaskId: ID!) {
    removeTaskDependency(taskId: $taskId, dependsOnTaskId: $dependsOnTaskId)
  }
`;

// Input Types (for TypeScript)
export interface TaskFilterInput {
  status?: string[];
  priority?: string[];
  assigneeIds?: string[];
  projectIds?: string[];
  tags?: string[];
  search?: string;
  dueDateStart?: string;
  dueDateEnd?: string;
  isOverdue?: boolean;
}

export interface TaskSortInput {
  field: 'title' | 'status' | 'priority' | 'dueDate' | 'createdAt' | 'updatedAt';
  direction: 'asc' | 'desc';
}

export interface PaginationInput {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: string;
  assigneeId?: string;
  projectId?: string;
  parentTaskId?: string;
  tags?: string[];
  estimatedHours?: number;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: string;
  assigneeId?: string;
  projectId?: string;
  tags?: string[];
  estimatedHours?: number;
  actualHours?: number;
}