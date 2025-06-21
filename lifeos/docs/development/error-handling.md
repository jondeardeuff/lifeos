# Life OS Error Handling Guide

## Overview

Comprehensive error handling strategy ensuring graceful degradation and excellent user experience.

## Error Categories

### 1. User Errors
- Invalid input
- Permission denied
- Resource not found
- Quota exceeded

### 2. System Errors
- Network failures
- Database errors
- External API failures
- Server errors

### 3. Integration Errors
- Authentication failures
- API rate limits
- Webhook failures
- Sync conflicts

### 4. Voice/AI Errors
- Recording failures
- Transcription errors
- Low confidence results
- Context misunderstanding

## Error Response Format

### API Error Response
```typescript
interface ErrorResponse {
  error: {
    code: string;           // Machine-readable error code
    message: string;        // User-friendly message
    details?: any;          // Additional error context
    field?: string;         // Field that caused error
    suggestion?: string;    // How to fix the error
    retryable?: boolean;    // Can this be retried?
    retryAfter?: number;    // Seconds to wait before retry
  };
  requestId: string;        // For support/debugging
  timestamp: string;        // When error occurred
}

// Example
{
  "error": {
    "code": "TASK_NOT_FOUND",
    "message": "The task you're looking for doesn't exist or has been deleted.",
    "field": "taskId",
    "suggestion": "Check the task ID or refresh your task list.",
    "retryable": false
  },
  "requestId": "req_abc123",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Client Error Display
```typescript
interface UserError {
  id: string;
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  action?: {
    label: string;
    handler: () => void;
  };
  dismissible: boolean;
  autoDismiss?: number; // milliseconds
}
```

## Error Handling Patterns

### 1. API Layer

```typescript
// api/error-handler.ts
export class APIError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export function handleAPIError(error: any): ErrorResponse {
  // Known API errors
  if (error instanceof APIError) {
    return {
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        retryable: error.statusCode >= 500
      },
      requestId: context.requestId,
      timestamp: new Date().toISOString()
    };
  }
  
  // Validation errors
  if (error.name === 'ValidationError') {
    return {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Please check your input and try again.',
        details: error.errors,
        field: error.field,
        retryable: false
      },
      requestId: context.requestId,
      timestamp: new Date().toISOString()
    };
  }
  
  // Database errors
  if (error.code === 'P2002') { // Unique constraint
    return {
      error: {
        code: 'DUPLICATE_ENTRY',
        message: 'This item already exists.',
        field: error.meta?.target,
        retryable: false
      },
      requestId: context.requestId,
      timestamp: new Date().toISOString()
    };
  }
  
  // Default error
  logger.error('Unhandled error', { error, context });
  return {
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong. Please try again.',
      retryable: true
    },
    requestId: context.requestId,
    timestamp: new Date().toISOString()
  };
}
```

### 2. Client Error Boundary

```typescript
// components/ErrorBoundary.tsx
export class ErrorBoundary extends React.Component<Props, State> {
  state = { hasError: false, error: null };
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to error reporting service
    errorReporter.captureException(error, {
      extra: errorInfo,
      tags: {
        component: 'ErrorBoundary'
      }
    });
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          error={this.state.error}
          resetError={() => this.setState({ hasError: false })}
        />
      );
    }
    
    return this.props.children;
  }
}

// Fallback UI
function ErrorFallback({ error, resetError }: Props) {
  return (
    <div className="error-fallback">
      <h2>Oops! Something went wrong</h2>
      <details>
        <summary>Error details</summary>
        <pre>{error?.message}</pre>
      </details>
      <button onClick={resetError}>Try again</button>
    </div>
  );
}
```

### 3. Network Error Handling

```typescript
// utils/api-client.ts
export async function apiCall<T>(
  endpoint: string,
  options: RequestOptions
): Promise<{ data?: T; error?: APIError }> {
  try {
    const response = await fetchWithRetry(endpoint, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`,
        ...options.headers
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      return { error: errorData.error };
    }
    
    const data = await response.json();
    return { data };
    
  } catch (error) {
    // Network error
    if (!navigator.onLine) {
      return {
        error: {
          code: 'OFFLINE',
          message: 'You appear to be offline. Changes will sync when reconnected.',
          retryable: true
        }
      };
    }
    
    // Timeout
    if (error.name === 'AbortError') {
      return {
        error: {
          code: 'TIMEOUT',
          message: 'Request took too long. Please try again.',
          retryable: true
        }
      };
    }
    
    // Generic network error
    return {
      error: {
        code: 'NETWORK_ERROR',
        message: 'Unable to reach the server. Please check your connection.',
        retryable: true
      }
    };
  }
}

// Retry logic
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 3
): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(30000) // 30s timeout
      });
      
      // Don't retry client errors
      if (response.status < 500) {
        return response;
      }
      
      // Retry server errors with exponential backoff
      if (i < retries - 1) {
        const delay = Math.min(1000 * Math.pow(2, i), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
    }
  }
  
  throw new Error('Max retries exceeded');
}
```

### 4. Voice Error Handling

```typescript
// voice/error-handler.ts
export function handleVoiceError(error: any): VoiceError {
  // Microphone permission denied
  if (error.name === 'NotAllowedError') {
    return {
      code: 'MIC_PERMISSION_DENIED',
      message: 'Microphone access is required for voice commands.',
      action: {
        label: 'Grant Permission',
        handler: requestMicrophonePermission
      },
      recoverable: true
    };
  }
  
  // No microphone found
  if (error.name === 'NotFoundError') {
    return {
      code: 'NO_MICROPHONE',
      message: 'No microphone found. Please connect a microphone and try again.',
      recoverable: false
    };
  }
  
  // Browser not supported
  if (!('webkitSpeechRecognition' in window)) {
    return {
      code: 'BROWSER_NOT_SUPPORTED',
      message: 'Voice commands are not supported in your browser. Try Chrome or Edge.',
      suggestion: 'Use manual input instead',
      recoverable: false
    };
  }
  
  // Transcription failed
  if (error.code === 'TRANSCRIPTION_FAILED') {
    return {
      code: 'TRANSCRIPTION_FAILED',
      message: 'Could not understand the audio. Please speak clearly and try again.',
      suggestion: 'Reduce background noise',
      recoverable: true
    };
  }
  
  // Low confidence
  if (error.confidence < 0.7) {
    return {
      code: 'LOW_CONFIDENCE',
      message: `Not sure what you meant. Did you mean: "${error.alternatives[0]}"?`,
      alternatives: error.alternatives,
      recoverable: true
    };
  }
  
  return {
    code: 'VOICE_ERROR',
    message: 'Voice command failed. Please try again or use manual input.',
    recoverable: true
  };
}
```

### 5. Offline Error Handling

```typescript
// offline/queue-manager.ts
export class OfflineQueue {
  private queue: QueuedOperation[] = [];
  
  async executeOperation(operation: Operation) {
    if (navigator.onLine) {
      try {
        return await this.performOperation(operation);
      } catch (error) {
        if (this.isRetryable(error)) {
          this.queueOperation(operation);
        }
        throw error;
      }
    } else {
      this.queueOperation(operation);
      return this.createOptimisticResponse(operation);
    }
  }
  
  private queueOperation(operation: Operation) {
    this.queue.push({
      ...operation,
      id: generateId(),
      timestamp: Date.now(),
      retries: 0
    });
    
    this.persistQueue();
    this.showOfflineNotification();
  }
  
  private showOfflineNotification() {
    showNotification({
      type: 'info',
      message: 'You\'re offline. Changes will sync when reconnected.',
      persistent: true,
      id: 'offline-notification'
    });
  }
  
  async syncQueue() {
    if (!navigator.onLine || this.queue.length === 0) return;
    
    const failed: QueuedOperation[] = [];
    
    for (const operation of this.queue) {
      try {
        await this.performOperation(operation);
      } catch (error) {
        if (operation.retries < 3) {
          operation.retries++;
          failed.push(operation);
        } else {
          this.handleSyncFailure(operation, error);
        }
      }
    }
    
    this.queue = failed;
    this.persistQueue();
    
    if (failed.length === 0) {
      dismissNotification('offline-notification');
      showNotification({
        type: 'success',
        message: 'All changes synced successfully!',
        autoDismiss: 3000
      });
    }
  }
}
```

## Error Recovery Strategies

### 1. Graceful Degradation

```typescript
// Feature detection with fallbacks
export function initializeVoice() {
  if (!isVoiceSupported()) {
    // Fallback to text input
    return {
      startRecording: () => showTextInput(),
      stopRecording: () => {},
      isAvailable: false
    };
  }
  
  return createVoiceInterface();
}
```

### 2. Automatic Retry

```typescript
// Exponential backoff retry
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    shouldRetry?: (error: any) => boolean;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    shouldRetry = (error) => error.retryable !== false
  } = options;
  
  let lastError: any;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (!shouldRetry(error) || i === maxRetries - 1) {
        throw error;
      }
      
      const delay = Math.min(initialDelay * Math.pow(2, i), maxDelay);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}
```

### 3. Circuit Breaker

```typescript
// Prevent cascading failures
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  constructor(
    private threshold = 5,
    private timeout = 60000 // 1 minute
  ) {}
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess() {
    this.failures = 0;
    this.state = 'closed';
  }
  
  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = 'open';
    }
  }
}
```

## User-Facing Error Messages

### Message Guidelines

1. **Be Human**: Use conversational language
2. **Be Helpful**: Suggest next steps
3. **Be Honest**: Don't hide problems
4. **Be Brief**: Get to the point quickly

### Error Message Templates

```typescript
export const errorMessages = {
  // Network errors
  offline: {
    title: "You're offline",
    message: "Changes will sync when you're back online.",
    icon: "wifi-off"
  },
  
  // Permission errors
  permissionDenied: {
    title: "Access denied",
    message: "You don't have permission to do that.",
    action: "Request access"
  },
  
  // Not found errors
  taskNotFound: {
    title: "Task not found",
    message: "This task may have been deleted or you may not have access to it.",
    action: "Go to task list"
  },
  
  // Validation errors
  invalidDate: {
    title: "Invalid date",
    message: "Please enter a valid date in the future.",
    field: "dueDate"
  },
  
  // Voice errors
  voiceNotSupported: {
    title: "Voice not supported",
    message: "Your browser doesn't support voice commands. Try Chrome or Edge.",
    fallback: "Use text input"
  },
  
  // Sync errors
  syncFailed: {
    title: "Sync failed",
    message: "Some changes couldn't be saved. We'll keep trying.",
    details: "View conflicts"
  }
};
```

## Error Monitoring

### Logging Strategy

```typescript
// Central error logger
export const errorLogger = {
  log(error: any, context?: any) {
    // Local logging
    console.error(error, context);
    
    // Send to monitoring service
    if (isProduction()) {
      errorReporter.captureException(error, {
        extra: context,
        user: getCurrentUser(),
        tags: {
          feature: context?.feature,
          severity: this.getSeverity(error)
        }
      });
    }
    
    // Track error metrics
    metrics.increment('errors', {
      code: error.code,
      feature: context?.feature
    });
  },
  
  getSeverity(error: any): 'low' | 'medium' | 'high' | 'critical' {
    if (error.code === 'INTERNAL_ERROR') return 'critical';
    if (error.code === 'PERMISSION_DENIED') return 'medium';
    if (error.code === 'VALIDATION_ERROR') return 'low';
    return 'medium';
  }
};
```

### Error Tracking Dashboard

```yaml
metrics:
  - Error rate by type
  - Error frequency over time
  - User impact (affected users)
  - Recovery success rate
  - Mean time to recovery

alerts:
  - Error rate > 1% for 5 minutes
  - New error type detected
  - Critical error occurred
  - Error spike detected
```