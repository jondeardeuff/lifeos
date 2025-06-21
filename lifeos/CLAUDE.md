# Claude.md - AI Agent Instructions

## Project Philosophy

You are building a voice-first, AI-powered life management system that seamlessly integrates work and personal life. This is not just another task manager - it's a comprehensive life operating system that understands context, learns patterns, and proactively helps users manage their complex lives.

## Core Principles

1. **Voice-First, Not Voice-Only**: Every feature must be accessible via natural voice commands, but also have efficient GUI alternatives
2. **Context is King**: The system should understand relationships between people, projects, and tasks without explicit linking
3. **Zero Friction**: Adding a task should be as easy as speaking a thought
4. **Unified Life View**: Work and personal are separate but equal - no bias toward either
5. **Financial Awareness**: Money flows through everything - track it naturally
6. **Progressive Disclosure**: Simple by default, powerful when needed

## Coding Standards

### Architecture Rules
- **Separation of Concerns**: Business logic, UI, and data layers must be clearly separated
- **Dependency Injection**: No hard dependencies between modules
- **Event-Driven**: Features communicate through events, not direct calls
- **Fail Gracefully**: Every external call must have fallback behavior
- **Test First**: Write tests before implementation

### Code Quality
- **Readability > Cleverness**: Code should be obvious to a junior developer
- **Single Responsibility**: Each function/component does ONE thing well
- **Immutability First**: Prefer immutable data structures
- **Type Safety**: Full TypeScript coverage, no `any` types
- **Documentation**: Every public API must have JSDoc comments

### State Management
- **Single Source of Truth**: One store for each domain (tasks, calendar, finances)
- **Predictable Updates**: All state changes through actions/reducers
- **Optimistic Updates**: UI updates immediately, syncs in background
- **Conflict Resolution**: Last-write-wins with conflict detection

### Performance Requirements
- **Voice Response**: < 500ms from speech end to UI feedback
- **Task Creation**: < 100ms for local save, background sync
- **Page Load**: < 2s initial load, < 200ms route changes
- **Offline First**: Full functionality without internet

## AI Integration Guidelines

### Natural Language Processing
- Parse commands in stages: intent → entities → context → action
- Maintain conversation context for 5 minutes
- Learn user patterns but store privately
- Always provide confirmation before destructive actions

### Error Handling
- If confidence < 80%, show interpretation and ask for confirmation
- Provide alternative interpretations when ambiguous
- Never fail silently - always give feedback
- Log all interpretations for pattern learning

### Privacy First
- All learning is local to user
- No voice data leaves device without permission
- Financial data encrypted at rest and in transit
- Audit log for all data access

## Feature Development Process

1. **Prototype in Isolation**: Build feature in `/packages/features/[name]`
2. **Define Events**: What events does it emit? What does it listen for?
3. **Test Harness**: Full test coverage before integration
4. **Progressive Integration**: Feature flag from day one
5. **Documentation**: Update all relevant .md files

## Common Pitfalls to Avoid

- **Don't assume context**: User might say "him" - always clarify if uncertain
- **Don't over-engineer**: Start simple, iterate based on usage
- **Don't break existing flows**: New features must not disrupt current UX
- **Don't ignore edge cases**: Timezones, currencies, languages matter
- **Don't trust external services**: Always have fallbacks

## Success Metrics

Every feature must improve at least one:
- Time to complete common tasks
- Accuracy of voice interpretation
- User confidence in system reliability
- Reduction in forgotten tasks/appointments
- Financial visibility and control

## Remember

You're not building software - you're building a trusted life assistant. Every decision should be made through the lens of: "Would I trust this with managing my life?"