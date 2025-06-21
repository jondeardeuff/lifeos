# Background Agent Onboarding Guide

## 🚀 For New Background Agents Using Cursor

### Step 1: Clone the Repository

```bash
# Clone the repository
git clone https://github.com/jondeardeuff/lifeos.git
cd lifeos
```

### Step 2: Identify Your Agent Number

You've been assigned as **Agent [X]** working on:
- Agent 1: Voice Recording Infrastructure
- Agent 2: Speech-to-Text Integration  
- Agent 3: Advanced Task Properties
- Agent 4: Real-time Infrastructure
- Agent 5: API Gateway & Rate Limiting
- Agent 6: Security Implementation

### Step 3: Initialize Your Agent

```bash
# Run the initialization script with your agent number
./init-agent.sh <your-agent-number> "Your Name"

# Example for Agent 1:
./init-agent.sh 1 "John Doe"
```

This will:
- ✅ Switch you to your feature branch
- ✅ Configure git with your agent identity
- ✅ Show your task assignment
- ✅ Provide specific setup instructions

### Step 4: Open in Cursor

1. Open Cursor
2. File → Open Folder → Select the `lifeos` directory
3. Trust the folder when prompted
4. Install recommended extensions if prompted

### Step 5: Read Your Task Assignment

Your task specification is located at:
```
docs/development/agent-tasks/P0-TASK-[X]-*.md
```

Open this file in Cursor to see:
- Your 8 detailed subtasks
- Technical requirements
- Dependencies on other agents
- Acceptance criteria

### Step 6: Set Up Your Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your API keys (if needed for your task)
# For example, Agent 2 needs OPENAI_API_KEY
```

### Step 7: Install Dependencies

```bash
# For backend agents (3, 4, 5, 6):
npm install

# For frontend agent (1):
cd client && npm install

# For Agent 2 (both frontend and backend):
npm install
cd client && npm install
```

### Step 8: Start Development

Follow the specific commands for your agent:

**Agent 1 (Voice Recording):**
```bash
cd client
npm run dev
# Work in client/src/components/voice/
```

**Agent 2 (Speech-to-Text):**
```bash
npm run dev:server
# Work in server/services/speech/
```

**Agent 3 (Advanced Tasks):**
```bash
npx prisma migrate dev
# Work in prisma/ and server/resolvers/
```

**Agent 4 (Real-time):**
```bash
docker run -d --name redis -p 6379:6379 redis:latest
npm run dev:realtime
# Work in server/realtime/
```

**Agent 5 (API Gateway):**
```bash
npm run dev:server
# Work in server/middleware/
```

**Agent 6 (Security):**
```bash
npm run dev:server
# Work in server/security/
```

## 📋 Daily Workflow

### Morning Sync
```bash
# Get latest changes from develop branch
git fetch origin
git merge origin/develop
```

### During Development
```bash
# Make your changes
# Test your code
npm test

# Commit frequently with descriptive messages
git add .
git commit -m "feat(task-X): implement [specific feature]"
```

### End of Day
```bash
# Push your changes
git push origin feature/p0-task-X-[your-task-name]
```

### When Ready for Review
1. Complete all subtasks in your task file
2. Ensure tests pass with >80% coverage
3. Create a Pull Request on GitHub
4. Use the PR template provided
5. Tag other agents if integration is needed

## 🤝 Coordination

### Dependencies
- **Agent 1**: No dependencies - start immediately
- **Agent 2**: Depends on Agent 1's audio output
- **Agent 3**: Can start immediately 
- **Agent 4**: Needs Agent 3's basic models
- **Agent 5**: Can start immediately
- **Agent 6**: Integrates with Agent 5

### Communication
- Check `docs/development/agent-tasks/` for updates
- Use GitHub Issues for blockers
- Create draft PRs early for visibility
- Comment on integration points

## 🎯 Success Criteria

Each agent must deliver:
1. ✅ All 8 subtasks completed
2. ✅ Tests with >80% coverage
3. ✅ Documentation updated
4. ✅ Performance benchmarks met
5. ✅ Integration points tested
6. ✅ PR ready for review

## 🆘 Troubleshooting

### Common Issues

**"Permission denied" when running scripts:**
```bash
chmod +x init-agent.sh
```

**Branch doesn't exist:**
```bash
git fetch origin
git checkout -b feature/p0-task-X-name origin/feature/p0-task-X-name
```

**Merge conflicts:**
```bash
# Discuss with the integration coordinator
# Resolve conflicts carefully
git add .
git commit -m "merge: resolve conflicts with develop"
```

**Can't push to remote:**
- Ensure you have write access to the repository
- Check your GitHub authentication
- Use SSH keys or personal access tokens

## 📚 Resources

- **Task Specifications**: `docs/development/agent-tasks/`
- **Git Workflow**: `docs/development/GIT_SETUP.md`
- **Architecture**: `docs/architecture/`
- **Development Standards**: `docs/development/`

---

**Welcome to the LifeOS development team! 🎉**

Your contribution as Agent [X] is crucial for building the voice-first life management system. Follow this guide, complete your tasks, and help us achieve the Phase 1 MVP!

If you have any questions, check the documentation or reach out to the integration coordinator.