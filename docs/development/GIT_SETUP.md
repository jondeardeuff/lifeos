# Git Setup for Background Agents

## Overview
This guide explains how to initialize and configure git for collaborative development by background agents working on LifeOS P0 tasks.

## 🔧 Initial Git Setup

### 1. Repository Structure
The repository is already initialized with git. Here's the branching strategy for agents:

```
main (protected)
├── develop (integration branch)
├── feature/p0-task-1-voice-recording (Agent 1)
├── feature/p0-task-2-speech-to-text (Agent 2)
├── feature/p0-task-3-advanced-tasks (Agent 3)
├── feature/p0-task-4-realtime-infrastructure (Agent 4)
├── feature/p0-task-5-api-gateway (Agent 5)
└── feature/p0-task-6-security (Agent 6)
```

### 2. Create Development Branches
```bash
# Create develop branch (integration branch)
git checkout -b develop
git push -u origin develop

# Create feature branches for each P0 task
git checkout -b feature/p0-task-1-voice-recording
git push -u origin feature/p0-task-1-voice-recording

git checkout develop
git checkout -b feature/p0-task-2-speech-to-text
git push -u origin feature/p0-task-2-speech-to-text

git checkout develop
git checkout -b feature/p0-task-3-advanced-tasks
git push -u origin feature/p0-task-3-advanced-tasks

git checkout develop
git checkout -b feature/p0-task-4-realtime-infrastructure
git push -u origin feature/p0-task-4-realtime-infrastructure

git checkout develop
git checkout -b feature/p0-task-5-api-gateway
git push -u origin feature/p0-task-5-api-gateway

git checkout develop
git checkout -b feature/p0-task-6-security
git push -u origin feature/p0-task-6-security
```

## 👥 Agent Branch Assignment

### Agent 1: Voice Recording Infrastructure
```bash
git checkout feature/p0-task-1-voice-recording
# Work directory: client/src/components/voice/
# Focus: Frontend voice components
```

### Agent 2: Speech-to-Text Integration
```bash
git checkout feature/p0-task-2-speech-to-text
# Work directory: server/services/speech/ + client/src/components/
# Focus: AI/ML integration
```

### Agent 3: Advanced Task Properties
```bash
git checkout feature/p0-task-3-advanced-tasks
# Work directory: prisma/, server/resolvers/, server/types/
# Focus: Backend data models
```

### Agent 4: Real-time Infrastructure
```bash
git checkout feature/p0-task-4-realtime-infrastructure
# Work directory: server/realtime/, client/src/hooks/
# Focus: WebSocket systems
```

### Agent 5: API Gateway & Rate Limiting
```bash
git checkout feature/p0-task-5-api-gateway
# Work directory: server/middleware/, server/services/
# Focus: API infrastructure
```

### Agent 6: Security Implementation
```bash
git checkout feature/p0-task-6-security
# Work directory: server/security/, server/middleware/
# Focus: Security & compliance
```

## 🔄 Development Workflow

### Daily Workflow for Each Agent
```bash
# 1. Start of day - sync with develop
git checkout feature/p0-task-X-your-task
git fetch origin
git merge origin/develop  # Get latest changes

# 2. Work on your task
# Make changes to your assigned files
git add .
git commit -m "feat(task-X): implement specific feature"

# 3. Push your changes
git push origin feature/p0-task-X-your-task

# 4. Create PR when task section is complete
# See PR template below
```

### Commit Message Convention
```bash
# Format: type(scope): description
feat(voice): add push-to-talk recording component
fix(speech): handle Whisper API timeout errors
docs(tasks): update GraphQL schema documentation
test(realtime): add WebSocket connection tests
refactor(security): improve encryption key management
```

### Commit Types:
- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **test**: Adding tests
- **refactor**: Code refactoring
- **style**: Code style changes
- **chore**: Build process or auxiliary tool changes

## 🔀 Integration Strategy

### Regular Integration Points
1. **Daily Sync**: Every morning, merge latest `develop` into your feature branch
2. **Weekly Integration**: Every Friday, merge completed sections to `develop`
3. **Milestone Integration**: After major milestones, full integration testing

### Handling Merge Conflicts
```bash
# When conflicts occur during merge
git checkout feature/your-branch
git fetch origin
git merge origin/develop

# If conflicts:
# 1. Resolve conflicts in your editor
# 2. Test the resolution
# 3. Commit the merge
git add .
git commit -m "merge: resolve conflicts with develop"
git push origin feature/your-branch
```

## 📋 Pull Request Process

### PR Template
```markdown
## P0 Task: [Task Name]
**Agent**: [Agent Number]  
**Task File**: P0-TASK-X-[name].md  
**Dependencies**: [List any dependencies]

### Completed Subtasks
- [ ] Subtask 1: Description
- [ ] Subtask 2: Description
- [ ] etc.

### Testing
- [ ] Unit tests added (>80% coverage)
- [ ] Integration tests passing
- [ ] Performance benchmarks met
- [ ] Cross-agent integration points tested

### Changes Made
- **Files Added**: List new files
- **Files Modified**: List modified files
- **Database Changes**: Any schema changes
- **API Changes**: Any API modifications

### Integration Notes
- **Dependencies**: What other agents need to know
- **Breaking Changes**: Any breaking changes
- **Configuration**: New environment variables or setup

### Checklist
- [ ] Code follows project standards
- [ ] Tests are passing
- [ ] Documentation updated
- [ ] No security vulnerabilities
- [ ] Performance requirements met
- [ ] Ready for integration testing
```

### PR Review Process
1. **Self-Review**: Agent reviews their own code
2. **Automated Checks**: CI/CD runs tests and linting
3. **Peer Review**: Another agent reviews for integration points
4. **Integration Testing**: Test with other completed features
5. **Merge to Develop**: After approval, merge to develop branch

## 🚨 Emergency Procedures

### Hotfix Process
```bash
# For critical bugs that block other agents
git checkout main
git checkout -b hotfix/critical-bug-description
# Fix the issue
git add .
git commit -m "hotfix: fix critical bug description"
git push origin hotfix/critical-bug-description
# Create PR to main and develop immediately
```

### Rollback Process
```bash
# If a merge breaks develop
git checkout develop
git revert <commit-hash>
git push origin develop
# Notify all agents of the rollback
```

## 📊 Branch Protection Rules

### Main Branch Protection
- **Require PR reviews**: 2 reviewers
- **Require status checks**: All CI tests must pass
- **Require branches to be up to date**: Yes
- **Restrict force pushes**: Yes
- **Restrict deletions**: Yes

### Develop Branch Protection
- **Require PR reviews**: 1 reviewer
- **Require status checks**: Basic tests must pass
- **Allow force pushes**: No
- **Allow deletions**: No

## 🔧 Git Configuration for Agents

### Required Git Config
```bash
# Set user information
git config user.name "Agent [X] - [Task Name]"
git config user.email "agent[X]@lifeos.dev"

# Set up useful aliases
git config alias.co checkout
git config alias.br branch
git config alias.ci commit
git config alias.st status
git config alias.unstage 'reset HEAD --'
git config alias.last 'log -1 HEAD'
git config alias.visual '!gitk'
```

### Recommended Git Hooks
```bash
# Pre-commit hook (saves in .git/hooks/pre-commit)
#!/bin/sh
npm run lint
npm run test:quick
```

## 📁 File Organization by Agent

### Directory Structure
```
lifeos/
├── client/src/
│   ├── components/voice/          # Agent 1
│   ├── components/transcription/  # Agent 2
│   ├── hooks/realtime/            # Agent 4
│   └── services/                  # Multiple agents
├── server/
│   ├── middleware/                # Agent 5, 6
│   ├── realtime/                  # Agent 4
│   ├── resolvers/                 # Agent 3
│   ├── security/                  # Agent 6
│   └── services/                  # Multiple agents
├── prisma/                        # Agent 3 (primary)
├── docs/                          # All agents update
└── tests/                         # All agents add tests
```

### File Ownership Guidelines
- **Primary Owner**: Agent responsible for initial implementation
- **Secondary Contributors**: Agents who make modifications
- **Shared Files**: Files requiring coordination between agents

## 🎯 Success Metrics

### Git Workflow Success Indicators
- [ ] All agents can commit without conflicts
- [ ] Daily integration successful
- [ ] No force pushes to protected branches
- [ ] All PRs have proper reviews
- [ ] CI/CD pipeline passes consistently
- [ ] Integration branch stays stable
- [ ] Documentation stays current

### Troubleshooting Common Issues

**Issue**: Merge conflicts on shared files
**Solution**: Coordinate changes in advance, use smaller commits

**Issue**: Agent branch behind develop
**Solution**: Regular daily syncing with develop branch

**Issue**: Breaking changes affecting other agents
**Solution**: Coordinate breaking changes, update all dependent code

**Issue**: Lost commits or work
**Solution**: Use `git reflog` to recover, maintain regular backups

## 📞 Git Support Contacts

- **Git Issues**: [Technical Lead]
- **Merge Conflicts**: [Integration Coordinator] 
- **CI/CD Problems**: [DevOps Lead]
- **Branch Strategy**: [Project Manager]

---

**🔄 This git setup ensures all 6 background agents can work simultaneously on P0 tasks while maintaining code quality and integration stability.**