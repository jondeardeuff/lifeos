# Life OS Monorepo Structure

## Overview

The Life OS project uses a monorepo structure with pnpm workspaces to manage multiple packages and applications.

## Directory Structure

```
lifeos/
├── .github/                    # GitHub specific files
│   ├── workflows/             # CI/CD workflows
│   └── ISSUE_TEMPLATE/        # Issue templates
├── apps/                      # Applications
│   ├── web/                   # Main web application
│   ├── mobile/                # React Native app
│   ├── api/                   # Backend API server
│   └── docs/                  # Documentation site
├── packages/               # Shared packages
│   ├── core/                  # Core business logic
│   ├── ui/                    # Shared UI components
│   ├── database/              # Database client and schemas
│   ├── types/                 # Shared TypeScript types
│   ├── utils/                 # Shared utilities
│   ├── voice/                 # Voice processing logic
│   └── ai/                    # AI/LLM integration
├── services/                  # Microservices
│   ├── auth/                  # Authentication service
│   ├── sync/                  # Data sync service
│   └── notifications/         # Notification service
├── tools/                     # Build and dev tools
│   ├── eslint-config/         # Shared ESLint config
│   ├── tsconfig/              # Shared TypeScript config
│   └── scripts/               # Build and utility scripts
├── docs/                      # Project documentation
│   ├── architecture/          # Architecture decisions
│   ├── api/                   # API documentation
│   └── guides/                # Developer guides
├── docker/                    # Docker configurations
│   ├── dev/                   # Development containers
│   └── prod/                  # Production containers
├── .cursorrules              # Cursor AI rules
├── .env.example              # Environment variables template
├── .gitignore                # Git ignore rules
├── docker-compose.yml        # Docker compose for dev
├── package.json              # Root package.json
├── pnpm-workspace.yaml       # pnpm workspace config
├── README.md                 # Project README
└── turbo.json                # Turborepo config
```

## Package Details

### Apps

#### `apps/web`
```
apps/web/
├── src/
│   ├── components/           # React components
│   ├── pages/               # Page components
│   ├── hooks/               # Custom React hooks
│   ├── stores/              # Zustand stores
│   ├── styles/              # Global styles
│   ├── utils/               # Web-specific utils
│   └── app.tsx              # App entry point
├── public/                  # Static assets
├── index.html               # HTML template
├── package.json             # Package config
├── tsconfig.json            # TypeScript config
└── vite.config.ts           # Vite config
```

#### `apps/mobile`
```
apps/mobile/
├── src/
│   ├── components/          # React Native components
│   ├── screens/             # Screen components
│   ├── navigation/          # Navigation setup
│   ├── services/            # Native services
│   └── App.tsx              # App entry point
├── android/                 # Android specific code
├── ios/                     # iOS specific code
├── package.json             # Package config
└── metro.config.js          # Metro bundler config
```

#### `apps/api`
```
apps/api/
├── src/
│   ├── routes/              # API routes
│   ├── services/            # Business logic
│   ├── middleware/          # Express middleware
│   ├── graphql/             # GraphQL schema & resolvers
│   └── server.ts            # Server entry point
├── prisma/                  # Prisma schema and migrations
├── tests/                   # API tests
├── package.json             # Package config
└── tsconfig.json            # TypeScript config
```

### Packages

#### `packages/core`
```
packages/core/
├── src/
│   ├── task/                # Task management logic
│   ├── calendar/            # Calendar logic
│   ├── finance/             # Financial logic
│   ├── project/             # Project management
│   └── index.ts             # Package exports
├── tests/                   # Unit tests
├── package.json             # Package config
└── tsconfig.json            # TypeScript config
```

#### `packages/ui`
```
packages/ui/
├── src/
│   ├── components/          # Shared UI components
│   │   ├── Button/
│   │   ├── Input/
│   │   ├── Modal/
│   │   └── ...
│   ├── hooks/               # Shared hooks
│   ├── themes/              # Theme definitions
│   └── index.ts             # Package exports
├── stories/                 # Storybook stories
├── package.json             # Package config
└── tsconfig.json            # TypeScript config
```

#### `packages/database`
```
packages/database/
├── src/
│   ├── client.ts            # Database client
│   ├── queries/             # Common queries
│   ├── migrations/          # Migration scripts
│   └── seed.ts              # Seed data
├── prisma/
│   └── schema.prisma        # Database schema
├── package.json             # Package config
└── tsconfig.json            # TypeScript config
```

## Configuration Files

### Root `package.json`
```json
{
  "name": "lifeos",
  "version": "1.0.0",
  "private": true,
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=8.0.0"
  },
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "test": "turbo test",
    "lint": "turbo lint",
    "format": "prettier --write \"**/*.{ts,tsx,md,json}\"",
    "prepare": "husky install",
    "clean": "turbo clean && rm -rf node_modules",
    "changeset": "changeset",
    "version-packages": "changeset version",
    "release": "turbo build --filter=./packages/* && changeset publish"
  },
  "devDependencies": {
    "@changesets/cli": "^2.27.0",
    "@lifeos/eslint-config": "workspace:*",
    "@lifeos/tsconfig": "workspace:*",
    "husky": "^8.0.0",
    "lint-staged": "^15.0.0",
    "prettier": "^3.0.0",
    "turbo": "^1.11.0"
  }
}
```

### `pnpm-workspace.yaml`
```yaml
packages:
  - "apps/*"
  - "packages/*"
  - "services/*"
  - "tools/*"
```

### `turbo.json`
```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "build/**"],
      "env": ["NODE_ENV", "API_URL", "DATABASE_URL"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"],
      "env": ["NODE_ENV"]
    },
    "lint": {
      "outputs": []
    },
    "type-check": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "clean": {
      "cache": false
    }
  }
}
```

### Shared TypeScript Config

`tools/tsconfig/base.json`
```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "incremental": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "exclude": ["node_modules", "dist", "build", ".turbo"]
}
```

`tools/tsconfig/react.json`
```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "./base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vite/client", "@testing-library/jest-dom"]
  }
}
```

`tools/tsconfig/node.json`
```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "./base.json",
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "types": ["node"]
  }
}
```

## Development Workflow

### Getting Started
```bash
# Install dependencies
pnpm install

# Start development servers
pnpm dev

# Run specific app
pnpm dev --filter=@lifeos/web

# Build all packages
pnpm build

# Run tests
pnpm test

# Type check
pnpm type-check
```

### Adding a New Package
```bash
# Create package directory
mkdir packages/new-package
cd packages/new-package

# Initialize package
pnpm init

# Add to workspace
# Update package.json name to @lifeos/new-package
```

### Dependency Management
```bash
# Add dependency to root
pnpm add -w -D prettier

# Add dependency to specific package
pnpm add react --filter @lifeos/web

# Add workspace dependency
pnpm add @lifeos/core --filter @lifeos/api
```

## CI/CD Pipeline

### GitHub Actions Workflow
```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: pnpm/action-setup@v2
        with:
          version: 8
          
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
          
      - run: pnpm install --frozen-lockfile
      
      - run: pnpm lint
      
      - run: pnpm type-check
      
      - run: pnpm test
      
      - run: pnpm build
```

## Best Practices

### 1. Package Dependencies
- Keep packages focused and single-purpose
- Minimize circular dependencies
- Use `workspace:*` for internal dependencies
- Export only what's needed

### 2. Code Sharing
- Share types through `@lifeos/types`
- Share UI components through `@lifeos/ui`
- Share business logic through `@lifeos/core`
- Keep app-specific code in apps

### 3. Configuration
- Use shared configs from `tools/`
- Override only when necessary
- Keep environment variables at root
- Use `.env.local` for local overrides

### 4. Testing
- Unit tests in each package
- Integration tests in apps
- E2E tests in separate workflow
- Share test utilities

### 5. Versioning
- Use changesets for package versioning
- Follow semantic versioning
- Document breaking changes
- Coordinate releases

## Deployment

### Docker Setup
```dockerfile
# docker/prod/Dockerfile.web
FROM node:20-alpine AS base
RUN npm install -g pnpm

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build --filter=@lifeos/web

FROM nginx:alpine AS runner
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
```

### Environment Configuration
```bash
# Production
API_URL=https://api.lifeos.app
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# Staging
API_URL=https://staging-api.lifeos.app
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# Development
API_URL=http://localhost:4000
DATABASE_URL=postgresql://localhost/lifeos_dev
REDIS_URL=redis://localhost:6379
```