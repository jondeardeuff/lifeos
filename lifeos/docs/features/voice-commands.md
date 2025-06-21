# Voice Commands Reference

## Overview

Life OS supports natural language voice commands in English and Spanish, with optional wake word detection and continuous conversation mode.

## Wake Word Detection

### Configuration
```typescript
interface WakeWordConfig {
  enabled: boolean;
  wakeWords: {
    en: string[];
    es: string[];
  };
  sensitivity: number; // 0.0 - 1.0
  timeout: number; // ms to wait for command after wake word
}

const defaultConfig: WakeWordConfig = {
  enabled: true,
  wakeWords: {
    en: ["Hey Life OS", "OK Life OS", "Life OS"],
    es: ["Hola Life OS", "Oye Life OS", "Life OS"],
  },
  sensitivity: 0.7,
  timeout: 5000,
};
```

## Command Categories

### Task Management

#### Create Task
```yaml
English:
  patterns:
    - "Add task to [task]"
    - "Remind me to [task]"
    - "Create task [task]"
    - "I need to [task]"
    - "Add [task] to my list"
    - "Put [task] on my todo list"
  
  examples:
    - "Add task to buy milk"
    - "Remind me to call John tomorrow at 3pm"
    - "Create task review proposal for client by Friday"
    - "I need to pick up dry cleaning"
    - "Add oil change to my list for next week"

Spanish:
  patterns:
    - "Agrega tarea [task]"
    - "Recuérdame [task]"
    - "Crear tarea [task]"
    - "Necesito [task]"
    - "Añade [task] a mi lista"
    
  examples:
    - "Agrega tarea comprar leche"
    - "Recuérdame llamar a Juan mañana a las 3"
    - "Crear tarea revisar propuesta para el viernes"
    - "Necesito recoger la ropa de la tintorería"
```

#### Update Task
```yaml
English:
  patterns:
    - "Mark [task] as [status]"
    - "Change [task] to [status]"
    - "Update [task] [changes]"
    - "Move [task] to [date/project]"
    - "Assign [task] to [person]"
    
  examples:
    - "Mark buy milk as complete"
    - "Change kitchen demo to in progress"
    - "Update proposal review to high priority"
    - "Move team meeting to next Monday"
    - "Assign kitchen demo to Jorge"

Spanish:
  patterns:
    - "Marcar [task] como [status]"
    - "Cambiar [task] a [status]"
    - "Actualizar [task] [changes]"
    - "Mover [task] a [date/project]"
    - "Asignar [task] a [person]"
```

#### Query Tasks
```yaml
English:
  patterns:
    - "What tasks do I have [filter]?"
    - "Show me [filter] tasks"
    - "What's on my list for [time]?"
    - "What do I need to do [time]?"
    - "List all [project/status] tasks"
    
  examples:
    - "What tasks do I have today?"
    - "Show me high priority tasks"
    - "What's on my list for tomorrow?"
    - "What do I need to do this week?"
    - "List all Mitchell project tasks"

Spanish:
  patterns:
    - "¿Qué tareas tengo [filter]?"
    - "Muéstrame tareas [filter]"
    - "¿Qué hay en mi lista para [time]?"
    - "¿Qué necesito hacer [time]?"
    - "Lista todas las tareas de [project/status]"
```

### Calendar Management

#### Schedule Event
```yaml
English:
  patterns:
    - "Schedule [event] [time]"
    - "Set up meeting with [person] [time]"
    - "Book [event] for [time]"
    - "Add [event] to calendar [time]"
    - "Block time for [event] [time]"
    
  examples:
    - "Schedule client meeting tomorrow at 2pm"
    - "Set up meeting with Sarah next Tuesday at 10"
    - "Book dentist appointment for March 15th at 3:30"
    - "Add team standup to calendar every Monday at 9am"
    - "Block time for estimates Friday afternoon"

Spanish:
  patterns:
    - "Programa [event] [time]"
    - "Agenda reunión con [person] [time]"
    - "Reserva [event] para [time]"
    - "Añade [event] al calendario [time]"
    - "Bloquea tiempo para [event] [time]"
```

#### Query Calendar
```yaml
English:
  patterns:
    - "What's on my calendar [time]?"
    - "Do I have anything scheduled [time]?"
    - "When is my [event]?"
    - "What meetings do I have [time]?"
    - "Am I free [time]?"
    
  examples:
    - "What's on my calendar today?"
    - "Do I have anything scheduled this afternoon?"
    - "When is my next meeting with Sarah?"
    - "What meetings do I have this week?"
    - "Am I free tomorrow at 3pm?"

Spanish:
  patterns:
    - "¿Qué hay en mi calendario [time]?"
    - "¿Tengo algo programado [time]?"
    - "¿Cuándo es mi [event]?"
    - "¿Qué reuniones tengo [time]?"
    - "¿Estoy libre [time]?"
```

### Financial Commands

#### Log Transaction
```yaml
English:
  patterns:
    - "I spent [amount] at [merchant] for [description]"
    - "Log expense [amount] for [description]"
    - "Add transaction [amount] at [merchant]"
    - "Received payment of [amount] from [source]"
    - "Got paid [amount] for [project]"
    
  examples:
    - "I spent $47.50 at Home Depot for kitchen supplies"
    - "Log expense $120 for Jorge's hours today"
    - "Add transaction $15.99 at Starbucks"
    - "Received payment of $5000 from Mitchell project"
    - "Got paid $2500 for Johnson bathroom"

Spanish:
  patterns:
    - "Gasté [amount] en [merchant] para [description]"
    - "Registra gasto [amount] para [description]"
    - "Añade transacción [amount] en [merchant]"
    - "Recibí pago de [amount] de [source]"
    - "Me pagaron [amount] por [project]"
```

#### Financial Queries
```yaml
English:
  patterns:
    - "How much have I spent on [category/project]?"
    - "What's my balance?"
    - "Show me expenses for [time period]"
    - "What's the profit on [project]?"
    - "How much did [person] cost this month?"
    
  examples:
    - "How much have I spent on the Mitchell project?"
    - "What's my business checking balance?"
    - "Show me expenses for last week"
    - "What's the profit on the kitchen renovation?"
    - "How much did Jorge cost this month?"

Spanish:
  patterns:
    - "¿Cuánto he gastado en [category/project]?"
    - "¿Cuál es mi saldo?"
    - "Muéstrame gastos de [time period]"
    - "¿Cuál es la ganancia en [project]?"
    - "¿Cuánto costó [person] este mes?"
```

### Project Management

#### Project Commands
```yaml
English:
  patterns:
    - "Create project [name] for [client]"
    - "Start new project called [name]"
    - "Add [person] to [project] team"
    - "Set [project] budget to [amount]"
    - "Mark [project] as [status]"
    
  examples:
    - "Create project Smith Kitchen for Bob Smith"
    - "Start new project called Master Bathroom Remodel"
    - "Add Jorge to Mitchell project team"
    - "Set Smith Kitchen budget to $35,000"
    - "Mark Johnson Bathroom as completed"

Spanish:
  patterns:
    - "Crea proyecto [name] para [client]"
    - "Inicia nuevo proyecto llamado [name]"
    - "Añade [person] al equipo de [project]"
    - "Establece presupuesto de [project] en [amount]"
    - "Marca [project] como [status]"
```

### Navigation & Queries

#### App Navigation
```yaml
English:
  patterns:
    - "Show me [view]"
    - "Go to [view]"
    - "Open [feature]"
    - "Take me to [view]"
    
  examples:
    - "Show me dashboard"
    - "Go to calendar"
    - "Open Mitchell project"
    - "Take me to settings"

Spanish:
  patterns:
    - "Muéstrame [view]"
    - "Ve a [view]"
    - "Abre [feature]"
    - "Llévame a [view]"
```

#### General Queries
```yaml
English:
  patterns:
    - "What should I do today?"
    - "What's my schedule like [time]?"
    - "Give me a summary of [project/time]"
    - "What's the status of [project]?"
    - "How busy am I [time]?"
    
  examples:
    - "What should I do today?"
    - "What's my schedule like this week?"
    - "Give me a summary of the Mitchell project"
    - "What's the status of all active projects?"
    - "How busy am I next week?"

Spanish:
  patterns:
    - "¿Qué debo hacer hoy?"
    - "¿Cómo está mi agenda [time]?"
    - "Dame un resumen de [project/time]"
    - "¿Cuál es el estado de [project]?"
    - "¿Qué tan ocupado estoy [time]?"
```

## Time Expression Parsing

### Relative Time
```typescript
const relativeTimePatterns = {
  en: {
    // Future
    "today": () => startOfDay(new Date()),
    "tomorrow": () => addDays(startOfDay(new Date()), 1),
    "next week": () => addWeeks(startOfDay(new Date()), 1),
    "next month": () => addMonths(startOfDay(new Date()), 1),
    "in (\\d+) days?": (match) => addDays(new Date(), parseInt(match[1])),
    "in (\\d+) weeks?": (match) => addWeeks(new Date(), parseInt(match[1])),
    
    // Past
    "yesterday": () => subDays(startOfDay(new Date()), 1),
    "last week": () => subWeeks(startOfDay(new Date()), 1),
    "(\\d+) days? ago": (match) => subDays(new Date(), parseInt(match[1])),
  },
  
  es: {
    "hoy": () => startOfDay(new Date()),
    "mañana": () => addDays(startOfDay(new Date()), 1),
    "próxima semana": () => addWeeks(startOfDay(new Date()), 1),
    "próximo mes": () => addMonths(startOfDay(new Date()), 1),
    "en (\\d+) días?": (match) => addDays(new Date(), parseInt(match[1])),
    "ayer": () => subDays(startOfDay(new Date()), 1),
    "hace (\\d+) días?": (match) => subDays(new Date(), parseInt(match[1])),
  },
};
```

### Specific Days
```typescript
const dayPatterns = {
  en: {
    "monday": 1, "tuesday": 2, "wednesday": 3, "thursday": 4,
    "friday": 5, "saturday": 6, "sunday": 0,
    
    // With "next"
    "next (monday|tuesday|wednesday|thursday|friday|saturday|sunday)": (match) => {
      return getNextDayOfWeek(dayPatterns.en[match[1]]);
    },
  },
  
  es: {
    "lunes": 1, "martes": 2, "miércoles": 3, "jueves": 4,
    "viernes": 5, "sábado": 6, "domingo": 0,
    
    "próximo (lunes|martes|miércoles|jueves|viernes|sábado|domingo)": (match) => {
      return getNextDayOfWeek(dayPatterns.es[match[1]]);
    },
  },
};
```

## Continuous Conversation Mode

### Context Management
```typescript
interface ConversationContext {
  lastCommand: string;
  lastCommandTime: Date;
  lastEntity: {
    type: 'task' | 'event' | 'project' | 'person';
    id: string;
    name: string;
  } | null;
  conversationMode: boolean;
  language: 'en' | 'es';
}

// Context-aware command processing
function processWithContext(
  command: string,
  context: ConversationContext
): ParsedCommand {
  // Replace pronouns with context
  if (context.lastEntity) {
    command = command
      .replace(/\b(it|that)\b/gi, context.lastEntity.name)
      .replace(/\b(him|her)\b/gi, context.lastEntity.name);
  }
  
  // Handle follow-up commands
  if (isFollowUpCommand(command)) {
    return processFollowUp(command, context);
  }
  
  return parseCommand(command);
}
```

### Follow-up Commands
```yaml
English:
  patterns:
    - "Make it [modification]"
    - "Change that to [value]"
    - "Also [additional action]"
    - "And [additional action]"
    - "Cancel that"
    - "Never mind"
    
  examples:
    - User: "Create task to call John"
      Assistant: "Created task: Call John"
      User: "Make it high priority"
      Result: Updates task priority
      
    - User: "Schedule meeting tomorrow at 2"
      Assistant: "Scheduled meeting for tomorrow at 2 PM"
      User: "Change that to 3pm"
      Result: Updates meeting time

Spanish:
  patterns:
    - "Hazlo [modification]"
    - "Cambia eso a [value]"
    - "También [additional action]"
    - "Y [additional action]"
    - "Cancela eso"
    - "Olvídalo"
```

## Entity Recognition

### People Recognition
```typescript
const personPatterns = {
  // Direct mentions
  fullName: /\b([A-Z][a-z]+ [A-Z][a-z]+)\b/,
  firstName: /\b([A-Z][a-z]+)\b/,
  
  // Contextual mentions
  roles: {
    en: ["the plumber", "the electrician", "the client", "my assistant"],
    es: ["el plomero", "el electricista", "el cliente", "mi asistente"],
  },
  
  // Possessive
  possessive: {
    en: /(\w+)'s/,
    es: /de (\w+)/,
  },
};
```

### Amount Recognition
```typescript
const amountPatterns = {
  en: {
    currency: /\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/,
    written: /(one|two|three|four|five|ten|twenty|fifty|hundred|thousand)/,
  },
  
  es: {
    currency: /\$?(\d+(?:\.\d{3})*(?:,\d{2})?)/,
    written: /(uno|dos|tres|cuatro|cinco|diez|veinte|cincuenta|cien|mil)/,
  },
};
```

## Error Recovery

### Low Confidence Handling
```yaml
responses:
  en:
    low_confidence:
      - "I'm not sure I understood. Did you mean {suggestion}?"
      - "Could you rephrase that? Maybe try saying {alternative}"
      - "I didn't quite catch that. You can say things like {example}"
    
    ambiguous:
      - "Did you want to {option1} or {option2}?"
      - "I found multiple matches. Which one: {matches}?"
      
  es:
    low_confidence:
      - "No estoy seguro de entender. ¿Quisiste decir {suggestion}?"
      - "¿Podrías reformular eso? Intenta decir {alternative}"
      - "No entendí bien. Puedes decir cosas como {example}"
    
    ambiguous:
      - "¿Querías {option1} o {option2}?"
      - "Encontré varias opciones. ¿Cuál: {matches}?"
```

## Command Shortcuts

### Quick Commands
```yaml
English:
  shortcuts:
    "status": "What's my status today?"
    "summary": "Give me a summary of all active projects"
    "urgent": "Show me all urgent tasks"
    "today": "What do I need to do today?"
    "expenses": "Show me today's expenses"
    
Spanish:
  shortcuts:
    "estado": "¿Cuál es mi estado hoy?"
    "resumen": "Dame un resumen de todos los proyectos activos"
    "urgente": "Muéstrame todas las tareas urgentes"
    "hoy": "¿Qué necesito hacer hoy?"
    "gastos": "Muéstrame los gastos de hoy"
```

## Voice Feedback

### Confirmation Messages
```typescript
const confirmationTemplates = {
  en: {
    task_created: "Created task: {title}",
    task_updated: "Updated {title}",
    event_scheduled: "Scheduled {title} for {time}",
    transaction_logged: "Logged ${amount} at {merchant}",
    command_unclear: "I didn't understand that command",
  },
  
  es: {
    task_created: "Tarea creada: {title}",
    task_updated: "Actualizado {title}",
    event_scheduled: "Programado {title} para {time}",
    transaction_logged: "Registrado ${amount} en {merchant}",
    command_unclear: "No entendí ese comando",
  },
};
```

## Testing Voice Commands

### Test Corpus
```typescript
const testCommands = [
  // English
  {
    input: "Add task to buy milk tomorrow",
    expected: {
      action: "CREATE_TASK",
      entities: {
        title: "buy milk",
        dueDate: "tomorrow",
      },
    },
  },
  {
    input: "Schedule meeting with Sarah next Tuesday at 2pm",
    expected: {
      action: "CREATE_EVENT",
      entities: {
        title: "meeting with Sarah",
        date: "next Tuesday",
        time: "14:00",
      },
    },
  },
  
  // Spanish
  {
    input: "Agrega tarea comprar leche mañana",
    expected: {
      action: "CREATE_TASK",
      entities: {
        title: "comprar leche",
        dueDate: "mañana",
      },
    },
  },
  {
    input: "Programa reunión con Sarah el próximo martes a las 2",
    expected: {
      action: "CREATE_EVENT",
      entities: {
        title: "reunión con Sarah",
        date: "próximo martes",
        time: "14:00",
      },
    },
  },
];
```