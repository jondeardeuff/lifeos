# Life OS - Voice-First Life Management System

A comprehensive, AI-powered life management platform that seamlessly integrates work and personal tasks, calendar, finances, and communication through natural voice interaction.

## 🚀 Quick Start

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 8.0.0
- PostgreSQL 15
- Redis

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/lifeos.git
cd lifeos

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env

# Set up the database
cd packages/database
pnpm db:push
pnpm db:seed

# Start development servers
cd ../..
pnpm dev
```

The application will be available at:
- Web app: http://localhost:3000
- API: http://localhost:4000
- GraphQL Playground: http://localhost:4000/graphql

## 📁 Project Structure

```
lifeos/
├── apps/
│   ├── web/          # React web application
│   ├── api/          # Fastify + GraphQL API server
│   ├── mobile/       # React Native mobile app
│   └── docs/         # Documentation site
├── packages/
│   ├── core/         # Core business logic
│   ├── ui/           # Shared UI components
│   ├── database/     # Prisma database client
│   ├── types/        # Shared TypeScript types
│   ├── utils/        # Shared utilities
│   ├── voice/        # Voice processing logic
│   └── ai/           # AI/LLM integration
├── services/
│   ├── auth/         # Authentication service
│   ├── sync/         # Data sync service
│   └── notifications/ # Notification service
└── tools/
    ├── eslint-config/ # Shared ESLint config
    └── tsconfig/      # Shared TypeScript config
```

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Zustand, React Query
- **Backend**: Node.js, Fastify, GraphQL, Prisma, PostgreSQL
- **Mobile**: React Native, Expo
- **Voice**: Web Speech API, OpenAI Whisper
- **AI**: OpenAI GPT-4, Anthropic Claude
- **Infrastructure**: AWS, Docker, GitHub Actions

## 📝 Available Scripts

```bash
# Development
pnpm dev              # Start all apps in development mode
pnpm dev --filter=web # Start only the web app

# Building
pnpm build            # Build all packages
pnpm build --filter=api # Build only the API

# Testing
pnpm test             # Run all tests
pnpm test:e2e         # Run E2E tests

# Code Quality
pnpm lint             # Lint all packages
pnpm typecheck        # Type check all packages
pnpm format           # Format code with Prettier

# Database
pnpm db:migrate:dev   # Run migrations in development
pnpm db:studio        # Open Prisma Studio
```

## 🔧 Configuration

### Environment Variables

See `.env.example` for all required environment variables.

### Database Setup

```bash
# Create database
createdb lifeos_dev

# Run migrations
cd packages/database
pnpm db:migrate:dev

# Seed with sample data
pnpm db:seed
```

## 🧪 Testing

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Test coverage
pnpm test:coverage
```

## 📚 Documentation

- [Architecture Overview](docs/architecture/README.md)
- [API Documentation](docs/api/README.md)
- [Development Guide](docs/guides/development.md)
- [Deployment Guide](docs/guides/deployment.md)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.