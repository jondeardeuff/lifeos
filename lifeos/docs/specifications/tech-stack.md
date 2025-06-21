# Life OS Tech Stack

## Frontend

### Core Framework
- **React 18** - UI library
- **TypeScript 5** - Type safety
- **Vite** - Build tool and dev server

### State Management
- **Zustand** - Global state management
- **React Query (TanStack Query)** - Server state management
- **Immer** - Immutable state updates

### UI/UX
- **Tailwind CSS** - Utility-first styling
- **Radix UI** - Accessible component primitives
- **Framer Motion** - Animations
- **React Hook Form** - Form management
- **Zod** - Schema validation

### Voice/Audio
- **Web Speech API** - Browser speech recognition
- **Whisper API** - Advanced transcription
- **Tone.js** - Audio feedback
- **WaveSurfer.js** - Audio visualization

### Development Tools
- **Storybook** - Component development
- **Playwright** - E2E testing
- **Vitest** - Unit testing
- **MSW** - API mocking

## Backend

### Runtime & Framework
- **Node.js 20 LTS** - JavaScript runtime
- **Fastify** - Web framework
- **Apollo Server** - GraphQL server
- **TypeScript** - Type safety

### Database
- **PostgreSQL 15** - Primary database
- **Prisma** - ORM and migrations
- **Redis** - Caching and sessions
- **TimescaleDB** - Time-series data (analytics)

### Authentication
- **Supabase Auth** - Authentication service
- **jose** - JWT handling
- **argon2** - Password hashing

### AI/ML Services
- **OpenAI API** - GPT-4 for task parsing
- **Anthropic Claude API** - Alternative LLM
- **Pinecone** - Vector database for context

### External Integrations
- **Plaid** - Banking integration
- **Twilio** - SMS service
- **SendGrid** - Email service
- **Google Calendar API** - Calendar sync
- **Microsoft Graph API** - Outlook integration

### Infrastructure Services
- **AWS S3** - File storage
- **CloudFront** - CDN
- **Temporal** - Workflow orchestration
- **BullMQ** - Job queues

## DevOps & Infrastructure

### Hosting
- **AWS ECS** - Container orchestration
- **AWS RDS** - Managed PostgreSQL
- **AWS ElastiCache** - Managed Redis
- **Cloudflare** - DNS and edge functions

### CI/CD
- **GitHub Actions** - CI/CD pipelines
- **Docker** - Containerization
- **Terraform** - Infrastructure as code
- **AWS CDK** - AWS resource management

### Monitoring
- **DataDog** - APM and logging
- **Sentry** - Error tracking
- **Prometheus** - Metrics collection
- **Grafana** - Metrics visualization

## Mobile (React Native)

### Core
- **React Native 0.73** - Mobile framework
- **Expo 50** - Development platform
- **React Navigation 6** - Navigation

### Native Modules
- **react-native-voice** - Speech recognition
- **react-native-background-task** - Background sync
- **react-native-push-notification** - Notifications
- **react-native-keychain** - Secure storage

### Platform Specific
- **WidgetKit** (iOS) - Widget support
- **Android App Widgets** - Android widgets

## Development Environment

### Version Control
- **Git** - Source control
- **GitHub** - Repository hosting
- **Conventional Commits** - Commit standard

### Code Quality
- **ESLint** - Linting
- **Prettier** - Code formatting
- **Husky** - Git hooks
- **lint-staged** - Pre-commit checks

### Documentation
- **TypeDoc** - API documentation
- **Docusaurus** - Documentation site
- **Mermaid** - Diagrams
- **OpenAPI** - API specification

## Data Formats & Protocols

### APIs
- **GraphQL** - Primary API
- **REST** - Legacy/webhook endpoints
- **WebSocket** - Real-time updates
- **Server-Sent Events** - Live notifications

### Data Formats
- **JSON** - API communication
- **Protocol Buffers** - Internal services
- **MessagePack** - Mobile sync
- **iCal** - Calendar data

## Security

### Encryption
- **TLS 1.3** - Transport security
- **libsodium** - Crypto operations
- **WebCrypto API** - Client-side encryption

### Security Tools
- **OWASP ZAP** - Security scanning
- **npm audit** - Dependency scanning
- **Snyk** - Vulnerability monitoring

## Analytics

### Product Analytics
- **PostHog** - Product analytics
- **Amplitude** - User behavior
- **LogRocket** - Session replay

### Performance
- **Web Vitals** - Performance metrics
- **Lighthouse CI** - Performance testing

## Testing

### Testing Frameworks
- **Vitest** - Unit tests
- **React Testing Library** - Component tests
- **Playwright** - E2E tests
- **k6** - Load testing

### Testing Services
- **BrowserStack** - Cross-browser testing
- **Percy** - Visual regression testing

## Package Management

### Dependencies
- **pnpm** - Package manager
- **Renovate** - Dependency updates
- **npm workspaces** - Monorepo management

## Locked Decisions

These technology choices are final and should not be changed without team consensus:

1. **TypeScript everywhere** - No plain JavaScript
2. **PostgreSQL** for primary data - No MongoDB/MySQL
3. **React** for all UIs - No Vue/Angular
4. **GraphQL** for main API - REST only for webhooks
5. **Zustand** for state - No Redux/MobX
6. **Tailwind** for styling - No CSS-in-JS
7. **Prisma** for ORM - No TypeORM/Sequelize
8. **pnpm** for packages - No npm/yarn
9. **AWS** for cloud - No GCP/Azure
10. **Fastify** for backend - No Express/Koa

## Version Policy

- Use LTS versions for Node.js
- Stay within one major version of latest for frameworks
- Security updates applied within 48 hours
- Breaking changes require migration guide

## Future Considerations

Technologies we may adopt later:
- **Bun** - When stable for production
- **Edge Functions** - For global low latency
- **WebAssembly** - For compute-intensive tasks
- **tRPC** - For type-safe APIs