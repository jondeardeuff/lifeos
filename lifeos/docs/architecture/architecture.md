# Life OS Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
├─────────────┬─────────────┬─────────────┬──────────────────┤
│   Web App   │ Mobile App  │   Widget    │  Voice Assistant │
└──────┬──────┴──────┬──────┴──────┬──────┴──────────┬───────┘
       │             │             │                  │
       └─────────────┴─────────────┴──────────────────┘
                            │
                    ┌───────▼────────┐
                    │   API Gateway   │
                    │  (Rate Limit)   │
                    └───────┬────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼────────┐ ┌────────▼────────┐ ┌───────▼────────┐
│  Auth Service  │ │   Core API      │ │  Voice/AI API  │
│    (JWT)       │ │   (GraphQL)     │ │   (WebSocket)  │
└───────┬────────┘ └────────┬────────┘ └───────┬────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                    ┌───────▼────────┐
                    │  Service Layer  │
                    └───────┬────────┘
                            │
     ┌──────────────────────┼──────────────────────┐
     │                      │                      │
┌────▼─────┐ ┌─────────────▼──────────┐ ┌────────▼────────┐
│  Tasks   │ │      Calendar          │ │    Finance      │
│ Service  │ │      Service           │ │    Service      │
└────┬─────┘ └─────────────┬──────────┘ └────────┬────────┘
     │                      │                      │
     └──────────────────────┼──────────────────────┘
                            │
                    ┌───────▼────────┐
                    │  Data Layer     │
                    ├─────────────────┤
                    │   PostgreSQL    │
                    │   Redis Cache   │
                    │   S3 Storage    │
                    └─────────────────┘
```

## Core Components

### 1. Client Layer
- **Web App**: React-based PWA with offline support
- **Mobile App**: React Native with native modules
- **Widget**: Native widget implementations
- **Voice Assistant**: Platform-specific integrations

### 2. API Gateway
- **Kong/Envoy** for routing and rate limiting
- JWT validation
- Request/response transformation
- API versioning

### 3. Authentication Service
- **Supabase Auth** or **Auth0**
- JWT token generation
- OAuth providers
- Permission management
- Session handling

### 4. Core API (GraphQL)
- **Apollo Server** with schema stitching
- Type-safe API contracts
- Real-time subscriptions
- Batching and caching

### 5. Voice/AI API
- **WebSocket** for streaming
- **OpenAI/Anthropic** integration
- Context management
- Response streaming

### 6. Service Layer

#### Task Service
```typescript
interface TaskService {
  create(input: CreateTaskInput): Promise<Task>
  update(id: string, input: UpdateTaskInput): Promise<Task>
  delete(id: string): Promise<void>
  search(query: TaskSearchQuery): Promise<Task[]>
  parseVoiceCommand(audio: Buffer): Promise<ParsedCommand>
}
```

#### Calendar Service
```typescript
interface CalendarService {
  syncExternalCalendar(provider: Provider): Promise<void>
  createEvent(input: CreateEventInput): Promise<Event>
  findConflicts(timeRange: TimeRange): Promise<Conflict[]>
  suggestOptimalTime(duration: number): Promise<TimeSlot[]>
}
```

#### Finance Service
```typescript
interface FinanceService {
  connectBank(credentials: PlaidCredentials): Promise<void>
  categorizeTransaction(tx: Transaction): Promise<Category>
  generateInvoice(project: Project): Promise<Invoice>
  calculateJobCosting(projectId: string): Promise<CostAnalysis>
}
```

## Data Flow

### Voice Command Flow
```
Voice Input → Speech-to-Text → NLP Parser → Intent Extraction
     ↓                                              ↓
Audio Buffer                                  Command Object
                                                    ↓
                                            Entity Recognition
                                                    ↓
                                            Context Injection
                                                    ↓
                                            Action Execution
                                                    ↓
                                            Response Generation
```

### State Management Flow
```
User Action → Local State Update → Optimistic UI Update
     ↓                                      ↓
API Request                          Immediate Feedback
     ↓                                      
Server Processing                           
     ↓                                      
Database Update                            
     ↓                                      
Sync Response → Reconciliation → Final UI State
```

## Database Schema

### Core Tables
```sql
-- Users and Authentication
users (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE,
  settings JSONB,
  created_at TIMESTAMP
)

-- Task Management
tasks (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users,
  title TEXT,
  description TEXT,
  project_id UUID,
  assignee_id UUID,
  due_date TIMESTAMP,
  priority INTEGER,
  status VARCHAR,
  metadata JSONB
)

-- Calendar
events (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users,
  title TEXT,
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  location TEXT,
  attendees JSONB,
  recurrence JSONB
)

-- Financial
transactions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users,
  account_id UUID,
  amount DECIMAL,
  date DATE,
  description TEXT,
  category_id UUID,
  project_id UUID,
  receipt_url TEXT
)
```

## Scaling Strategy

### Horizontal Scaling
- Stateless services behind load balancer
- Database read replicas
- Sharded by user_id for multi-tenancy

### Caching Strategy
- **Redis** for session data
- **CDN** for static assets
- **Database query cache** for expensive operations
- **Client-side cache** with service workers

### Performance Targets
- API response time: < 200ms (p95)
- Voice processing: < 500ms
- Page load time: < 2s
- Offline capability: Full CRUD operations

## Security Architecture

### Data Protection
- Encryption at rest (AES-256)
- TLS 1.3 for transport
- Field-level encryption for PII
- Encrypted backups

### Access Control
```typescript
// Role-based permissions
enum Role {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
  VIEWER = 'viewer'
}

// Resource-based permissions
interface Permission {
  resource: string
  action: string
  conditions?: Record<string, any>
}
```

### Audit Trail
```typescript
interface AuditLog {
  id: string
  userId: string
  action: string
  resource: string
  timestamp: Date
  metadata: Record<string, any>
  ipAddress: string
}
```

## Integration Points

### External Services
- **Plaid**: Banking data
- **Twilio**: SMS notifications
- **SendGrid**: Email delivery
- **Google/Apple/Microsoft**: Calendar sync
- **OpenAI/Anthropic**: AI processing
- **AWS S3**: File storage

### Webhook System
```typescript
interface Webhook {
  id: string
  url: string
  events: string[]
  secret: string
  retryPolicy: RetryPolicy
}
```

## Monitoring & Observability

### Metrics
- **Prometheus** for metrics collection
- **Grafana** for visualization
- Custom business metrics dashboard

### Logging
- **Structured logging** with context
- **Centralized log aggregation** (ELK stack)
- **Distributed tracing** (Jaeger)

### Alerts
- API error rate > 1%
- Response time > 500ms
- Failed voice commands > 5%
- Database connection pool exhaustion

## Deployment Architecture

### Environments
- **Development**: Feature branches auto-deploy
- **Staging**: Main branch auto-deploy
- **Production**: Tagged releases with approval

### Infrastructure as Code
```yaml
# Kubernetes deployment example
apiVersion: apps/v1
kind: Deployment
metadata:
  name: lifeos-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: lifeos-api
  template:
    metadata:
      labels:
        app: lifeos-api
    spec:
      containers:
      - name: api
        image: lifeos/api:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: url
```

## Disaster Recovery

### Backup Strategy
- Database: Daily automated backups, 30-day retention
- Files: S3 versioning enabled
- Configuration: Git repository

### Recovery Targets
- RTO (Recovery Time Objective): 4 hours
- RPO (Recovery Point Objective): 1 hour
- Automated failover for critical services