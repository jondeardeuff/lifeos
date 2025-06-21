# P0 Task 4: Real-time Infrastructure

## Agent Assignment
**Agent Focus**: Backend Real-time Systems  
**Priority**: P0 (Critical - Phase 1 MVP)  
**Dependencies**: Basic backend infrastructure  
**Estimated Duration**: 4-5 days  

## Objective
Implement comprehensive real-time infrastructure using WebSockets to enable live updates, presence detection, collaborative features, and real-time data synchronization across all connected clients.

## Technical Context
- **WebSocket Library**: Socket.io for cross-browser compatibility
- **Message Broker**: Redis for pub/sub and scaling
- **Framework**: Node.js with existing GraphQL Apollo Server
- **Authentication**: JWT-based authentication for WebSocket connections
- **Scaling**: Support for multiple server instances

## Detailed Subtasks

### 1. Set Up WebSocket Server Infrastructure
```typescript
// Location: server/realtime/socketServer.ts
import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

class RealtimeServer {
  private io: SocketIOServer;
  private redisClient: any;
  
  constructor(httpServer: any) {
    this.setupSocketServer(httpServer);
    this.setupRedisAdapter();
    this.setupAuthMiddleware();
  }
  
  private setupSocketServer(httpServer: any) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000
    });
  }
}
```

**Infrastructure Requirements**:
- Configure Socket.io server with HTTP server
- Set up CORS for client connections
- Implement connection pooling
- Add graceful server shutdown
- Configure production-ready settings

### 2. Implement Real-time Subscriptions
```typescript
// Subscription types and handlers
interface SubscriptionManager {
  // Task subscriptions
  subscribeToTaskUpdates(userId: string, callback: (task: Task) => void): void;
  subscribeToProjectUpdates(projectId: string, callback: (project: Project) => void): void;
  
  // User subscriptions
  subscribeToUserActivity(userId: string, callback: (activity: Activity) => void): void;
  subscribeToTeamUpdates(teamId: string, callback: (update: TeamUpdate) => void): void;
  
  // System subscriptions
  subscribeToNotifications(userId: string, callback: (notification: Notification) => void): void;
}

class SubscriptionService {
  static async handleTaskSubscription(socket: Socket, userId: string) {
    // Join user-specific room
    socket.join(`user:${userId}:tasks`);
    
    // Join project rooms for user's projects
    const userProjects = await getUserProjects(userId);
    userProjects.forEach(project => {
      socket.join(`project:${project.id}:tasks`);
    });
  }
  
  static async handleProjectSubscription(socket: Socket, projectId: string) {
    // Verify user has access to project
    const hasAccess = await verifyProjectAccess(socket.userId, projectId);
    if (hasAccess) {
      socket.join(`project:${projectId}`);
    }
  }
}
```

### 3. Create Event Broadcasting System
```typescript
// Event types and broadcasting
enum RealtimeEvent {
  // Task events
  TASK_CREATED = 'task:created',
  TASK_UPDATED = 'task:updated', 
  TASK_DELETED = 'task:deleted',
  TASK_ASSIGNED = 'task:assigned',
  
  // Project events
  PROJECT_CREATED = 'project:created',
  PROJECT_UPDATED = 'project:updated',
  PROJECT_MEMBER_ADDED = 'project:member_added',
  
  // User events
  USER_ONLINE = 'user:online',
  USER_OFFLINE = 'user:offline',
  USER_ACTIVITY = 'user:activity',
  
  // System events
  NOTIFICATION_SENT = 'notification:sent',
  SYSTEM_UPDATE = 'system:update'
}

class EventBroadcaster {
  constructor(private io: SocketIOServer) {}
  
  // Broadcast to specific user
  async broadcastToUser(userId: string, event: RealtimeEvent, data: any) {
    this.io.to(`user:${userId}`).emit(event, {
      type: event,
      data,
      timestamp: new Date().toISOString()
    });
  }
  
  // Broadcast to project members
  async broadcastToProject(projectId: string, event: RealtimeEvent, data: any) {
    this.io.to(`project:${projectId}`).emit(event, {
      type: event,
      data,
      timestamp: new Date().toISOString()
    });
  }
  
  // Broadcast to all authenticated users
  async broadcastToAll(event: RealtimeEvent, data: any) {
    this.io.emit(event, {
      type: event,
      data,
      timestamp: new Date().toISOString()
    });
  }
}
```

### 4. Add Connection Management
```typescript
// Connection tracking and management
interface ConnectedUser {
  socketId: string;
  userId: string;
  connectedAt: Date;
  lastActivity: Date;
  userAgent?: string;
  ipAddress?: string;
}

class ConnectionManager {
  private connections = new Map<string, ConnectedUser>();
  private userSockets = new Map<string, Set<string>>(); // userId -> socket IDs
  
  addConnection(socket: Socket, userId: string) {
    const connection: ConnectedUser = {
      socketId: socket.id,
      userId,
      connectedAt: new Date(),
      lastActivity: new Date(),
      userAgent: socket.handshake.headers['user-agent'],
      ipAddress: socket.handshake.address
    };
    
    this.connections.set(socket.id, connection);
    
    // Track multiple connections per user
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(socket.id);
    
    // Join user room
    socket.join(`user:${userId}`);
    
    // Broadcast user online status
    this.broadcastUserStatus(userId, 'online');
  }
  
  removeConnection(socketId: string) {
    const connection = this.connections.get(socketId);
    if (connection) {
      const { userId } = connection;
      
      // Remove from tracking
      this.connections.delete(socketId);
      this.userSockets.get(userId)?.delete(socketId);
      
      // If no more connections, user is offline
      if (this.userSockets.get(userId)?.size === 0) {
        this.userSockets.delete(userId);
        this.broadcastUserStatus(userId, 'offline');
      }
    }
  }
  
  updateActivity(socketId: string) {
    const connection = this.connections.get(socketId);
    if (connection) {
      connection.lastActivity = new Date();
    }
  }
  
  getUserConnections(userId: string): string[] {
    return Array.from(this.userSockets.get(userId) || []);
  }
  
  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId) && this.userSockets.get(userId)!.size > 0;
  }
}
```

### 5. Implement Presence Detection
```typescript
// Presence system for collaborative features
interface UserPresence {
  userId: string;
  status: 'online' | 'away' | 'offline';
  lastSeen: Date;
  currentPage?: string;
  activeTask?: string;
  activeProject?: string;
}

class PresenceService {
  private presenceMap = new Map<string, UserPresence>();
  
  updatePresence(userId: string, data: Partial<UserPresence>) {
    const current = this.presenceMap.get(userId) || {
      userId,
      status: 'offline',
      lastSeen: new Date()
    };
    
    const updated = {
      ...current,
      ...data,
      lastSeen: new Date()
    };
    
    this.presenceMap.set(userId, updated);
    
    // Broadcast presence update to relevant users
    this.broadcastPresenceUpdate(userId, updated);
  }
  
  async broadcastPresenceUpdate(userId: string, presence: UserPresence) {
    // Get user's teams/projects to determine who should see presence
    const relevantUsers = await this.getRelevantUsers(userId);
    
    relevantUsers.forEach(relatedUserId => {
      this.io.to(`user:${relatedUserId}`).emit(RealtimeEvent.USER_ACTIVITY, {
        userId,
        presence
      });
    });
  }
  
  getTeamPresence(teamId: string): UserPresence[] {
    // Return presence data for all team members
    return Array.from(this.presenceMap.values())
      .filter(presence => this.userInTeam(presence.userId, teamId));
  }
  
  // Cleanup offline users periodically
  cleanupStalePresence() {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    for (const [userId, presence] of this.presenceMap) {
      if (presence.lastSeen < fiveMinutesAgo) {
        presence.status = 'offline';
        this.broadcastPresenceUpdate(userId, presence);
      }
    }
  }
}
```

### 6. Create Real-time Data Synchronization
```typescript
// Data sync service for real-time updates
class DataSyncService {
  constructor(private broadcaster: EventBroadcaster) {}
  
  // Task synchronization
  async syncTaskUpdate(task: Task, operation: 'create' | 'update' | 'delete') {
    const event = operation === 'create' ? RealtimeEvent.TASK_CREATED :
                  operation === 'update' ? RealtimeEvent.TASK_UPDATED :
                  RealtimeEvent.TASK_DELETED;
    
    // Broadcast to task owner
    await this.broadcaster.broadcastToUser(task.userId, event, task);
    
    // Broadcast to project members if task has project
    if (task.projectId) {
      await this.broadcaster.broadcastToProject(task.projectId, event, task);
    }
    
    // Broadcast to assigned users
    if (task.assignedTo && task.assignedTo !== task.userId) {
      await this.broadcaster.broadcastToUser(task.assignedTo, event, task);
    }
  }
  
  // Project synchronization  
  async syncProjectUpdate(project: Project, operation: 'create' | 'update' | 'delete') {
    const event = operation === 'create' ? RealtimeEvent.PROJECT_CREATED :
                  operation === 'update' ? RealtimeEvent.PROJECT_UPDATED :
                  'project:deleted';
    
    // Broadcast to all project members
    await this.broadcaster.broadcastToProject(project.id, event, project);
    
    // Broadcast to project owner
    await this.broadcaster.broadcastToUser(project.ownerId, event, project);
  }
  
  // Notification synchronization
  async syncNotification(notification: Notification) {
    await this.broadcaster.broadcastToUser(
      notification.userId,
      RealtimeEvent.NOTIFICATION_SENT,
      notification
    );
  }
}
```

### 7. Add Connection Recovery
```typescript
// Connection recovery and resilience
class ConnectionRecovery {
  private reconnectAttempts = new Map<string, number>();
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  
  handleDisconnection(socket: Socket) {
    const userId = socket.userId;
    if (userId) {
      // Set timeout to mark user as away
      setTimeout(() => {
        if (!this.connectionManager.isUserOnline(userId)) {
          this.presenceService.updatePresence(userId, { status: 'away' });
        }
      }, 30000); // 30 seconds grace period
    }
  }
  
  handleReconnection(socket: Socket, userId: string) {
    // Reset reconnect attempts
    this.reconnectAttempts.delete(userId);
    
    // Update presence
    this.presenceService.updatePresence(userId, { status: 'online' });
    
    // Re-subscribe to relevant rooms
    this.resubscribeToRooms(socket, userId);
    
    // Send missed updates
    this.sendMissedUpdates(socket, userId);
  }
  
  async sendMissedUpdates(socket: Socket, userId: string) {
    // Get updates that happened while user was disconnected
    const lastActivity = await this.getLastUserActivity(userId);
    const missedUpdates = await this.getMissedUpdates(userId, lastActivity);
    
    missedUpdates.forEach(update => {
      socket.emit('missed_update', update);
    });
  }
  
  private calculateBackoffDelay(attempts: number): number {
    return Math.min(this.reconnectDelay * Math.pow(2, attempts), 30000); // Max 30 seconds
  }
}
```

### 8. Implement Rate Limiting
```typescript
// Rate limiting for WebSocket events
class SocketRateLimiter {
  private userLimits = new Map<string, { count: number; resetTime: number }>();
  private readonly maxEventsPerMinute = 60;
  private readonly windowMs = 60000; // 1 minute
  
  checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const userLimit = this.userLimits.get(userId);
    
    if (!userLimit || now > userLimit.resetTime) {
      // Reset or initialize counter
      this.userLimits.set(userId, {
        count: 1,
        resetTime: now + this.windowMs
      });
      return true;
    }
    
    if (userLimit.count >= this.maxEventsPerMinute) {
      return false; // Rate limit exceeded
    }
    
    userLimit.count++;
    return true;
  }
  
  middleware() {
    return (socket: Socket, next: Function) => {
      socket.use((packet, next) => {
        const userId = socket.userId;
        if (userId && !this.checkRateLimit(userId)) {
          next(new Error('Rate limit exceeded'));
        } else {
          next();
        }
      });
      next();
    };
  }
}
```

## Integration Points

### GraphQL Integration
```typescript
// Integration with existing GraphQL resolvers
const taskResolvers = {
  Mutation: {
    createTask: async (_, args, context) => {
      const task = await createTask(args.input, context.userId);
      
      // Trigger real-time sync
      await context.dataSyncService.syncTaskUpdate(task, 'create');
      
      return task;
    },
    
    updateTask: async (_, args, context) => {
      const task = await updateTask(args.id, args.input, context.userId);
      
      // Trigger real-time sync
      await context.dataSyncService.syncTaskUpdate(task, 'update');
      
      return task;
    }
  }
};
```

### Authentication Integration
```typescript
// JWT authentication for WebSocket connections
class SocketAuth {
  static async authenticateSocket(socket: Socket, next: Function) {
    try {
      const token = socket.handshake.auth.token || 
                   socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        throw new Error('No authentication token provided');
      }
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET!);
      const user = await getUserById(decoded.userId);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      socket.userId = user.id;
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  }
}
```

## Client-Side Integration

### React Hook for Real-time Updates
```typescript
// Location: client/src/hooks/useRealtime.ts
import { useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export const useRealtime = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    
    const newSocket = io(process.env.REACT_APP_WS_URL!, {
      auth: { token },
      transports: ['websocket', 'polling']
    });
    
    newSocket.on('connect', () => setIsConnected(true));
    newSocket.on('disconnect', () => setIsConnected(false));
    
    setSocket(newSocket);
    
    return () => newSocket.close();
  }, []);
  
  const subscribe = useCallback((event: string, callback: Function) => {
    if (socket) {
      socket.on(event, callback);
      return () => socket.off(event, callback);
    }
  }, [socket]);
  
  return { socket, isConnected, subscribe };
};
```

## File Structure
```
server/
├── realtime/
│   ├── socketServer.ts          # Main WebSocket server setup
│   ├── connectionManager.ts     # Connection tracking
│   ├── presenceService.ts       # User presence management
│   ├── eventBroadcaster.ts      # Event broadcasting
│   ├── dataSyncService.ts       # Data synchronization
│   ├── rateLimiter.ts          # Rate limiting
│   └── auth.ts                 # Socket authentication
├── services/
│   └── realtime/
│       ├── subscriptions.ts     # Subscription management
│       └── recovery.ts          # Connection recovery
└── types/
    └── realtime.ts             # TypeScript interfaces

client/src/
├── hooks/
│   ├── useRealtime.ts          # Main realtime hook
│   ├── usePresence.ts          # Presence hook
│   └── useSubscription.ts      # Subscription hook
└── services/
    └── socket.ts               # Socket client service
```

## Testing Requirements

### Unit Tests
```typescript
describe('RealtimeServer', () => {
  test('handles socket connections', async () => {
    // Test socket connection handling
  });
  
  test('authenticates users correctly', async () => {
    // Test authentication middleware
  });
  
  test('manages user presence', async () => {
    // Test presence system
  });
});

describe('EventBroadcaster', () => {
  test('broadcasts to correct rooms', async () => {
    // Test room-based broadcasting
  });
  
  test('handles rate limiting', async () => {
    // Test rate limiting functionality
  });
});
```

### Integration Tests
- WebSocket connection flow
- Real-time data synchronization
- Cross-user event broadcasting
- Connection recovery scenarios
- Rate limiting enforcement

### Load Tests
- 1000 concurrent connections
- High-frequency event broadcasting
- Memory usage under load
- Connection recovery performance

## Acceptance Criteria

### Functional Requirements
✅ WebSocket server handles concurrent connections reliably  
✅ Real-time subscriptions work for tasks, projects, and users  
✅ Event broadcasting reaches correct recipients  
✅ Connection management tracks online/offline status  
✅ Presence detection shows user activity accurately  
✅ Data synchronization keeps all clients updated  
✅ Connection recovery handles network interruptions  
✅ Rate limiting prevents abuse  

### Performance Requirements
✅ Server handles 1000+ concurrent connections  
✅ Events broadcast in <100ms  
✅ Memory usage scales linearly with connections  
✅ CPU usage remains under 70% under normal load  

### Reliability Requirements
✅ 99.9% uptime for WebSocket service  
✅ Graceful handling of server restarts  
✅ Automatic reconnection on client disconnect  
✅ No message loss during network interruptions  

## Security Considerations

### Authentication & Authorization
- JWT token validation for all connections
- Room-based access control
- User permission verification for subscriptions

### Rate Limiting & DDoS Protection
- Per-user event rate limiting
- Connection limits per IP address
- Automatic blocking of abusive clients

### Data Privacy
- Encrypted WebSocket connections (WSS)
- No sensitive data in client-side logs
- Audit logging for all real-time events

## Deployment Instructions

1. **Redis Setup**:
   ```bash
   # Install Redis for pub/sub
   docker run -d --name redis -p 6379:6379 redis:latest
   ```

2. **Environment Variables**:
   ```bash
   REDIS_URL=redis://localhost:6379
   WEBSOCKET_PORT=3001
   JWT_SECRET=your_jwt_secret
   ```

3. **Integration**:
   - Add WebSocket server to existing HTTP server
   - Update GraphQL resolvers with real-time triggers
   - Deploy client-side real-time hooks

4. **Monitoring**:
   - Set up WebSocket connection monitoring
   - Add performance metrics collection
   - Configure alerting for connection issues

## Success Validation

Agent should provide:
- [ ] Complete WebSocket server implementation
- [ ] Connection management and presence system
- [ ] Event broadcasting and data sync services
- [ ] Rate limiting and security measures
- [ ] Client-side integration hooks
- [ ] Comprehensive test suite
- [ ] Performance benchmarks under load
- [ ] Documentation and deployment guide

**This real-time infrastructure is critical for collaborative features and will be used by all other P0 and P1 tasks for live updates.**