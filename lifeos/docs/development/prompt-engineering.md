# Life OS Prompt Engineering Guide

## Overview

This document defines the prompts and strategies for LLM integration in the Life OS voice command system.

## Core System Prompt

```typescript
const SYSTEM_PROMPT = `You are an AI assistant for Life OS, a comprehensive life management system. Your role is to parse natural language commands and convert them into structured actions.

Current context:
- User: {userName}
- Timezone: {timezone}
- Current time: {currentTime}
- Active project: {activeProject}
- Current view: {currentView}

Your responses must be in JSON format with the following structure:
{
  "action": "ACTION_TYPE",
  "confidence": 0.0-1.0,
  "entities": {},
  "alternativeInterpretations": []
}

Available actions:
- CREATE_TASK: Create a new task
- UPDATE_TASK: Modify existing task
- CREATE_EVENT: Schedule calendar event
- CREATE_TRANSACTION: Log financial transaction
- SEARCH: Find existing items
- NAVIGATE: Change app view
- UNCLEAR: When intent is ambiguous

Entity extraction rules:
1. Dates: Parse relative dates (tomorrow, next Tuesday, in 2 weeks)
2. Times: Extract times in 24h format, assume PM for times 1-6 without AM/PM
3. People: Match against known contacts: {knownPeople}
4. Projects: Match against active projects: {activeProjects}
5. Amounts: Extract currency amounts, default to USD

Always maintain context awareness. If a command references "him", "her", "it", or "this", refer to the conversation context.`;
```

## Command Parsing Prompts

### Task Creation

```typescript
const TASK_CREATION_PROMPT = `Parse the following command to create a task:
"{command}"

Extract:
- title: Main task description (required)
- dueDate: When the task should be completed
- dueTime: Specific time if mentioned
- assignee: Person responsible (match against: {knownPeople})
- project: Associated project (match against: {activeProjects})
- priority: urgent/high = 5, normal = 3, low = 1
- tags: Any categories or labels mentioned
- description: Additional details beyond the title

Examples:
"Remind me to call John tomorrow at 3pm" →
{
  "action": "CREATE_TASK",
  "confidence": 0.95,
  "entities": {
    "title": "Call John",
    "dueDate": "2024-01-16",
    "dueTime": "15:00",
    "assignee": null,
    "priority": 3
  }
}

"Add urgent task for Jorge to demo kitchen for Mitchell project" →
{
  "action": "CREATE_TASK",
  "confidence": 0.92,
  "entities": {
    "title": "Demo kitchen",
    "assignee": "jorge_id",
    "project": "mitchell_project_id",
    "priority": 5
  }
}`;
```

### Event Scheduling

```typescript
const EVENT_SCHEDULING_PROMPT = `Parse the following command to schedule an event:
"{command}"

Extract:
- title: Event name/description
- startDate: Event date
- startTime: Start time
- endTime: End time (if not specified, assume 1 hour)
- location: Physical or virtual location
- attendees: People to invite
- recurring: Recurrence pattern if mentioned

Time parsing rules:
- Business hours: 9 AM - 5 PM
- Lunch: 12 PM
- Morning: 9 AM
- Afternoon: 2 PM
- Evening: 6 PM

Examples:
"Schedule meeting with Sarah next Tuesday at 2" →
{
  "action": "CREATE_EVENT",
  "confidence": 0.93,
  "entities": {
    "title": "Meeting with Sarah",
    "startDate": "2024-01-23",
    "startTime": "14:00",
    "endTime": "15:00",
    "attendees": ["sarah_id"]
  }
}

"Block time for estimates every Monday morning" →
{
  "action": "CREATE_EVENT",
  "confidence": 0.88,
  "entities": {
    "title": "Estimates",
    "startTime": "09:00",
    "endTime": "10:00",
    "recurring": "RRULE:FREQ=WEEKLY;BYDAY=MO"
  }
}`;
```

### Financial Transaction

```typescript
const TRANSACTION_PROMPT = `Parse the following command to log a financial transaction:
"{command}"

Extract:
- amount: Transaction amount (positive for income, negative for expense)
- description: What the transaction was for
- merchant: Store/vendor name
- category: Infer from description/merchant
- project: Associated project if mentioned
- date: Transaction date (default to today)

Category mappings:
- Home Depot, Lowe's → Materials
- Gas stations → Fuel
- Restaurants → Meals
- "invoice", "payment from" → Income

Examples:
"Spent $47.50 at Home Depot for Mitchell project" →
{
  "action": "CREATE_TRANSACTION",
  "confidence": 0.94,
  "entities": {
    "amount": -47.50,
    "merchant": "Home Depot",
    "category": "Materials",
    "project": "mitchell_project_id",
    "date": "2024-01-15"
  }
}

"Received payment of $5,000 from Johnson" →
{
  "action": "CREATE_TRANSACTION",
  "confidence": 0.91,
  "entities": {
    "amount": 5000,
    "description": "Payment from Johnson",
    "category": "Income",
    "date": "2024-01-15"
  }
}`;
```

## Context Management

### Multi-Turn Conversations

```typescript
const CONTEXT_CONTINUATION_PROMPT = `Given the conversation history:
{conversationHistory}

And the new command:
"{command}"

Resolve any pronouns or references based on context:
- "it" refers to the last mentioned task/event/project
- "him/her" refers to the last mentioned person
- "that" refers to the last action/item
- "the same" means repeat previous parameters

Example:
History: "Create task to call Mike about roofing"
Command: "Make it high priority and due tomorrow"
→ UPDATE_TASK with priority: 5, dueDate: tomorrow`;
```

### Ambiguity Resolution

```typescript
const AMBIGUITY_PROMPT = `The following command is ambiguous:
"{command}"

Possible interpretations:
{possibleInterpretations}

Generate clarifying questions and alternative interpretations:

Example:
Command: "Add meeting with John"
Response:
{
  "action": "UNCLEAR",
  "confidence": 0.6,
  "entities": {
    "possibleActions": ["CREATE_TASK", "CREATE_EVENT"],
    "clarificationNeeded": "time"
  },
  "alternativeInterpretations": [
    {
      "action": "CREATE_TASK",
      "description": "Add task to meet with John",
      "confidence": 0.5
    },
    {
      "action": "CREATE_EVENT",
      "description": "Schedule meeting with John",
      "confidence": 0.5
    }
  ],
  "suggestedQuestion": "When would you like to meet with John?"
}`;
```

## Entity Recognition

### Person Recognition

```typescript
const PERSON_RECOGNITION_PROMPT = `Identify people mentioned in: "{text}"

Known people:
{knownPeopleList}

Matching rules:
1. Exact match (case-insensitive)
2. First name match if unique
3. Nickname/alias match
4. Role match (e.g., "the electrician" → person with electrician role)

Return matches with confidence scores.`;
```

### Date/Time Parsing

```typescript
const DATE_TIME_PROMPT = `Parse dates and times from: "{text}"

Current date/time: {currentDateTime}
User timezone: {timezone}

Rules:
- "tomorrow" = current date + 1 day
- "next [day]" = next occurrence of that day
- "in X days/weeks" = current date + X days/weeks
- Times without AM/PM: assume PM for 1-6, AM for 7-12
- "morning" = 9 AM, "afternoon" = 2 PM, "evening" = 6 PM

Consider timezone for scheduling across regions.`;
```

## Learning Patterns

### User Pattern Learning

```typescript
interface UserPattern {
  pattern: string;
  frequency: number;
  lastUsed: Date;
  entities: Record<string, any>;
}

const PATTERN_LEARNING_PROMPT = `Analyze user commands to identify patterns:

Recent commands:
{recentCommands}

Identify:
1. Common phrases and their meanings
2. User-specific abbreviations
3. Frequently referenced people/projects
4. Time preferences (e.g., always schedules meetings at 2 PM)
5. Task assignment patterns

Example patterns:
- "demo" always means "demolition" for this user
- "J" refers to "Jorge"
- Morning tasks are typically scheduled at 8 AM
- Home Depot purchases always go to active project`;
```

## Error Handling

### Low Confidence Handling

```typescript
const LOW_CONFIDENCE_PROMPT = `The command "{command}" resulted in low confidence ({confidence}).

Generate:
1. What was understood
2. What was unclear
3. Suggested rephrase
4. Did you mean options

Example response:
{
  "action": "UNCLEAR",
  "confidence": 0.4,
  "entities": {
    "understood": "Create something related to kitchen",
    "unclear": "Action type and specifics",
    "suggestions": [
      "Add task to renovate kitchen",
      "Schedule kitchen inspection",
      "Log kitchen expense"
    ]
  },
  "message": "I'm not sure what you'd like to do with the kitchen. Could you be more specific?"
}`;
```

## Testing Prompts

### Test Cases Generation

```typescript
const TEST_GENERATION_PROMPT = `Generate test cases for voice commands in category: {category}

Include:
1. Basic commands
2. Complex commands with multiple entities
3. Ambiguous commands
4. Commands with typos/misrecognitions
5. Regional variations
6. Time-sensitive commands

Format:
{
  "input": "voice command",
  "expectedAction": "ACTION_TYPE",
  "expectedEntities": {},
  "minConfidence": 0.8
}`;
```

## Optimization Strategies

### Prompt Efficiency

1. **Token Optimization**
   - Use concise system prompts
   - Include only relevant context
   - Compress known entities list

2. **Response Caching**
   - Cache common command patterns
   - Store entity extraction results
   - Reuse date parsing for same inputs

3. **Batch Processing**
   ```typescript
   const BATCH_PROMPT = `Process multiple commands efficiently:
   Commands: {commands}
   
   Return array of parsed results maintaining order.`;
   ```

### Context Window Management

```typescript
class PromptManager {
  private maxTokens = 4000;
  private reservedTokens = 1000; // For response
  
  buildPrompt(command: string, context: Context): string {
    const base = this.getBasePrompt();
    const contextStr = this.serializeContext(context);
    
    // Trim context if needed
    if (this.countTokens(base + contextStr) > this.maxTokens - this.reservedTokens) {
      return base + this.trimContext(contextStr);
    }
    
    return base + contextStr;
  }
  
  trimContext(context: string): string {
    // Prioritize recent items
    // Remove old conversation history
    // Summarize long lists
    return trimmedContext;
  }
}
```

## Evaluation Metrics

### Accuracy Metrics

```yaml
metrics:
  - name: Action Classification Accuracy
    target: 95%
    calculation: correct_actions / total_commands
    
  - name: Entity Extraction F1 Score
    target: 90%
    calculation: 2 * (precision * recall) / (precision + recall)
    
  - name: Date Parsing Accuracy
    target: 98%
    calculation: correct_dates / total_dates
    
  - name: User Satisfaction
    target: 4.5/5
    calculation: average_user_rating
```

### A/B Testing Prompts

```typescript
const PROMPT_VARIANTS = {
  v1: "Standard prompt with examples",
  v2: "Compressed prompt without examples",
  v3: "Prompt with reasoning steps",
  v4: "Few-shot learning approach"
};

// Test different variants and measure performance
```