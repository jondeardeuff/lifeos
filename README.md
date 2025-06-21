# 🧬 LifeOS - Voice-First Life Management System

A comprehensive, AI-powered life management platform that seamlessly integrates work and personal tasks, calendar, finances, and communication through natural voice interaction.

## ✨ Current Implementation (Phase 1)

- 🔐 **Authentication System** - JWT-based signup/login with user management
- 📋 **Basic Task Management** - Create, read, update, delete tasks with status/priority
- 🗄️ **PostgreSQL Database** - User and task tables with Prisma ORM
- 🚀 **GraphQL API** - Apollo Server with 8 core operations
- 🎨 **React Frontend** - Responsive UI with Tailwind CSS and TypeScript
- 🐳 **Production Ready** - Docker and Railway deployment configured

## 🚧 Planned Features (See Documentation)

The complete LifeOS vision includes voice-first interface, AI automation, financial management, team collaboration, mobile apps, and advanced analytics. See the [comprehensive documentation](docs/) for the full roadmap and specifications.

## 📖 Documentation

**[View Complete Documentation →](docs/)**

All project specifications, architecture, and development guidelines are organized in the `docs/` directory:

- **Specifications**: Project overview, features, roadmap, tech stack
- **Architecture**: System design, database schema, data models  
- **Development**: Coding standards, testing, deployment, patterns
- **Features**: Voice commands, UI components, feature breakdown
- **Guides**: Authentication, security, monitoring implementation
- **API**: GraphQL specs and external integrations

**AI Development**: The `CLAUDE.md` file contains instructions for AI-assisted development.

## 🚀 Quick Deploy to Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/lifeos)

1. Click the deploy button above
2. Set environment variables:
   ```
   NODE_ENV=production
   PORT=4000
   JWT_SECRET=your-super-secret-jwt-key
   CORS_ORIGIN=*
   ```
3. Your LifeOS API will be live at `https://your-app.railway.app/graphql`

## 🛠️ Local Development

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 8.0.0
- PostgreSQL 15

### Installation

```bash
# Clone the repository
git clone https://github.com/jondeardeuff/lifeos.git
cd lifeos

# Install dependencies
pnpm install

# Set up the database
cd packages/database
cp .env.example .env
# Edit .env with your database credentials
pnpm db:push
pnpm db:seed

# Start development servers
cd ../..
pnpm dev
```

## 🌐 API Endpoints

### GraphQL Playground
Visit `/graphql` on your deployed URL for interactive API exploration.

### Example Queries

**Health Check:**
```graphql
query {
  health
}
```

**User Login:**
```graphql
mutation {
  login(email: "test@lifeos.dev", password: "password123") {
    user {
      firstName
      lastName
      email
    }
    accessToken
  }
}
```

**Get Tasks:**
```graphql
query {
  tasks {
    id
    title
    status
    priority
    dueDate
  }
}
```

## 📁 Project Structure

```
lifeos/
├── client/           # React web application
├── docs/             # 📖 Comprehensive project documentation
│   ├── specifications/  # Project vision and feature specs
│   ├── architecture/    # System architecture and data models
│   ├── api/            # API documentation and integrations
│   ├── development/    # Coding standards and development guides
│   ├── features/       # Feature-specific documentation
│   └── guides/         # Implementation guides
├── prisma/           # Database schema and migrations
├── services/         # Backend services (auth, notifications, sync)
├── CLAUDE.md         # 🤖 AI development assistant instructions
├── .cursorrules      # Cursor IDE rules
└── server.js         # Main GraphQL server
```

## 🗄️ Database Schema

**Current Implementation:**
- 👥 Users (authentication and profiles)
- 📋 Tasks (basic task management)

**Planned Entities** (See [database schema docs](docs/architecture/database-schema.md)):
- 📅 Calendar & Events
- 💰 Financial Management
- 🎙️ Voice & AI Context
- 📊 Audit Logging
- 🏢 Projects & Teams
- 💬 Communication Hub

## 🚀 Deployment

### Railway (Recommended)

1. Fork this repository
2. Connect to [Railway](https://railway.app)
3. Deploy from GitHub repo
4. Add PostgreSQL database service
5. Set environment variables

### Docker

```bash
docker build -t lifeos .
docker run -p 4000:4000 lifeos
```

## 🧪 Testing

```bash
# Run tests
pnpm test

# Type checking
pnpm typecheck

# Linting
pnpm lint
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Apollo Server](https://www.apollographql.com/docs/apollo-server/)
- UI powered by [React](https://reactjs.org/) and [Tailwind CSS](https://tailwindcss.com/)
- Database with [Prisma](https://www.prisma.io/) and [PostgreSQL](https://www.postgresql.org/)
- Deployed on [Railway](https://railway.app/)

---

**🤖 Generated with [Claude Code](https://claude.ai/code)**