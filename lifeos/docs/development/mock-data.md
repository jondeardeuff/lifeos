# Life OS Mock Data

## Overview

Consistent test data for development, testing, and demos. All IDs use UUID v4 format.

## Test Users

```typescript
export const testUsers = {
  contractor: {
    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    email: "john@builderco.com",
    fullName: "John Builder",
    phone: "+1-555-0123",
    timezone: "America/Denver",
    role: "contractor",
    settings: {
      voiceEnabled: true,
      language: "en-US",
      workingHours: { start: "07:00", end: "17:00" },
      weekends: false
    }
  },
  
  spouse: {
    id: "b2c3d4e5-f6a7-8901-bcde-f23456789012",
    email: "jane@example.com",
    fullName: "Jane Builder",
    phone: "+1-555-0124",
    timezone: "America/Denver",
    role: "family",
    settings: {
      voiceEnabled: true,
      language: "en-US",
      notifications: ["calendar", "tasks"]
    }
  },
  
  teamMember: {
    id: "c3d4e5f6-a7b8-9012-cdef-345678901234",
    email: "jorge@email.com",
    fullName: "Jorge Martinez",
    phone: "+1-555-0125",
    timezone: "America/Denver",
    role: "team",
    specialty: "carpentry",
    hourlyRate: 45
  }
};
```

## Test Projects

```typescript
export const testProjects = {
  mitchellKitchen: {
    id: "d4e5f6a7-b8c9-0123-defa-456789012345",
    name: "Mitchell Kitchen Renovation",
    clientName: "Sarah Mitchell",
    status: "active",
    startDate: "2024-01-15",
    endDate: "2024-03-15",
    budget: 45000,
    currentCost: 12500,
    description: "Complete kitchen remodel including cabinets, countertops, and appliances",
    color: "#4A90E2",
    tasks: ["demo", "electrical", "plumbing", "cabinets", "countertops", "finishing"]
  },
  
  johnsonBathroom: {
    id: "e5f6a7b8-c9d0-1234-efab-567890123456",
    name: "Johnson Master Bath",
    clientName: "Robert Johnson",
    status: "active",
    startDate: "2024-02-01",
    endDate: "2024-02-28",
    budget: 18000,
    currentCost: 3200,
    description: "Master bathroom update with new fixtures and tile",
    color: "#7ED321"
  },
  
  personal: {
    id: "f6a7b8c9-d0e1-2345-fabc-678901234567",
    name: "Home Projects",
    clientName: null,
    status: "active",
    startDate: "2024-01-01",
    endDate: null,
    budget: 5000,
    currentCost: 750,
    description: "Personal home maintenance and improvements",
    color: "#BD10E0"
  }
};
```

## Test Tasks

```typescript
export const testTasks = {
  // Mitchell Kitchen tasks
  demoKitchen: {
    id: "a7b8c9d0-e1f2-3456-abcd-789012345678",
    title: "Demo existing kitchen",
    projectId: testProjects.mitchellKitchen.id,
    assigneeId: testUsers.teamMember.id,
    status: "completed",
    priority: 4,
    dueDate: "2024-01-20",
    completedAt: "2024-01-19T16:30:00Z",
    tags: ["demolition", "milestone"],
    source: "voice"
  },
  
  orderCabinets: {
    id: "b8c9d0e1-f2a3-4567-bcde-890123456789",
    title: "Order kitchen cabinets from supplier",
    projectId: testProjects.mitchellKitchen.id,
    assigneeId: testUsers.contractor.id,
    status: "pending",
    priority: 5,
    dueDate: "2024-01-25",
    description: "Need to finalize cabinet specs with client first",
    tags: ["materials", "urgent"],
    source: "manual"
  },
  
  // Personal tasks
  soccerPractice: {
    id: "c9d0e1f2-a3b4-5678-cdef-901234567890",
    title: "Take Emma to soccer practice",
    projectId: testProjects.personal.id,
    assigneeId: testUsers.contractor.id,
    status: "pending",
    priority: 3,
    dueDate: "2024-01-24T16:00:00Z",
    recurringPattern: {
      frequency: "weekly",
      daysOfWeek: ["wednesday", "saturday"]
    },
    tags: ["family", "recurring"],
    source: "voice"
  },
  
  groceryShopping: {
    id: "d0e1f2a3-b4c5-6789-defa-012345678901",
    title: "Buy groceries",
    projectId: testProjects.personal.id,
    assigneeId: testUsers.spouse.id,
    status: "pending",
    priority: 2,
    dueDate: "2024-01-23",
    description: "Milk, eggs, bread, chicken, vegetables",
    tags: ["errands", "family"],
    source: "voice"
  }
};
```

## Test Calendar Events

```typescript
export const testEvents = {
  clientMeeting: {
    id: "e1f2a3b4-c5d6-7890-efab-123456789012",
    title: "Mitchell kitchen walkthrough",
    description: "Review cabinet options with Sarah",
    projectId: testProjects.mitchellKitchen.id,
    startTime: "2024-01-25T14:00:00Z",
    endTime: "2024-01-25T15:00:00Z",
    location: "123 Mitchell Way, Denver, CO",
    attendees: [
      { userId: testUsers.contractor.id, status: "accepted" },
      { email: "sarah.mitchell@email.com", status: "accepted" }
    ]
  },
  
  teamMeeting: {
    id: "f2a3b4c5-d6e7-8901-fabc-234567890123",
    title: "Weekly team sync",
    description: "Review all active projects",
    startTime: "2024-01-22T08:00:00Z",
    endTime: "2024-01-22T09:00:00Z",
    location: "Office",
    recurringPattern: "RRULE:FREQ=WEEKLY;BYDAY=MO",
    attendees: [
      { userId: testUsers.contractor.id, status: "accepted" },
      { userId: testUsers.teamMember.id, status: "accepted" }
    ]
  },
  
  personalEvent: {
    id: "a3b4c5d6-e7f8-9012-abcd-345678901234",
    title: "Date night",
    projectId: testProjects.personal.id,
    startTime: "2024-01-26T19:00:00Z",
    endTime: "2024-01-26T22:00:00Z",
    location: "Downtown restaurant",
    attendees: [
      { userId: testUsers.contractor.id, status: "accepted" },
      { userId: testUsers.spouse.id, status: "accepted" }
    ]
  }
};
```

## Test Financial Data

```typescript
export const testAccounts = {
  businessChecking: {
    id: "b4c5d6e7-f8a9-0123-bcde-456789012345",
    plaidAccountId: "plaid_biz_checking_123",
    institutionName: "Chase Bank",
    accountName: "Business Checking",
    accountType: "checking",
    lastFour: "4567",
    currentBalance: 45678.90,
    availableBalance: 45678.90,
    currency: "USD"
  },
  
  businessCredit: {
    id: "c5d6e7f8-a9b0-1234-cdef-567890123456",
    plaidAccountId: "plaid_biz_credit_456",
    institutionName: "Chase Bank",
    accountName: "Business Credit Card",
    accountType: "credit",
    lastFour: "8901",
    currentBalance: -3456.78,
    availableBalance: 21543.22,
    currency: "USD"
  },
  
  personalChecking: {
    id: "d6e7f8a9-b0c1-2345-defa-678901234567",
    plaidAccountId: "plaid_personal_789",
    institutionName: "Wells Fargo",
    accountName: "Personal Checking",
    accountType: "checking",
    lastFour: "2345",
    currentBalance: 12345.67,
    availableBalance: 12345.67,
    currency: "USD"
  }
};

export const testTransactions = {
  // Business expenses
  homeDemotPurchase: {
    id: "e7f8a9b0-c1d2-3456-efab-789012345678",
    accountId: testAccounts.businessCredit.id,
    amount: -547.32,
    date: "2024-01-18",
    description: "HOME DEPOT #1234",
    merchantName: "Home Depot",
    categoryId: "materials",
    projectId: testProjects.mitchellKitchen.id,
    notes: "Kitchen demo supplies - sledgehammers, tarps, disposal bags"
  },
  
  clientPayment: {
    id: "f8a9b0c1-d2e3-4567-fabc-890123456789",
    accountId: testAccounts.businessChecking.id,
    amount: 15000.00,
    date: "2024-01-15",
    description: "Wire transfer from Sarah Mitchell",
    categoryId: "income",
    projectId: testProjects.mitchellKitchen.id,
    notes: "Kitchen project deposit (33%)"
  },
  
  teamPayroll: {
    id: "a9b0c1d2-e3f4-5678-abcd-901234567890",
    accountId: testAccounts.businessChecking.id,
    amount: -1800.00,
    date: "2024-01-19",
    description: "Payroll - Jorge Martinez",
    merchantName: "Payroll",
    categoryId: "payroll",
    projectId: testProjects.mitchellKitchen.id,
    notes: "40 hours @ $45/hour"
  },
  
  // Personal expenses
  groceries: {
    id: "b0c1d2e3-f4a5-6789-bcde-012345678901",
    accountId: testAccounts.personalChecking.id,
    amount: -156.43,
    date: "2024-01-20",
    description: "KING SOOPERS #045",
    merchantName: "King Soopers",
    categoryId: "groceries",
    notes: "Weekly grocery shopping"
  }
};

export const testCategories = {
  // Business categories
  income: {
    id: "c1d2e3f4-a5b6-7890-cdef-123456789012",
    name: "Income",
    isIncome: true,
    isTaxDeductible: false,
    color: "#00D084",
    icon: "dollar-sign"
  },
  
  materials: {
    id: "d2e3f4a5-b6c7-8901-defa-234567890123",
    name: "Materials",
    isIncome: false,
    isTaxDeductible: true,
    color: "#F78DA7",
    icon: "hammer"
  },
  
  payroll: {
    id: "e3f4a5b6-c7d8-9012-efab-345678901234",
    name: "Payroll",
    isIncome: false,
    isTaxDeductible: true,
    color: "#7BDCB5",
    icon: "users"
  },
  
  // Personal categories
  groceries: {
    id: "f4a5b6c7-d8e9-0123-fabc-456789012345",
    name: "Groceries",
    isIncome: false,
    isTaxDeductible: false,
    color: "#8ED1FC",
    icon: "shopping-cart"
  }
};
```

## Test Voice Commands

```typescript
export const testVoiceCommands = [
  {
    id: "a5b6c7d8-e9f0-1234-abcd-567890123456",
    transcription: "Add task to order kitchen cabinets for Mitchell project",
    parsedIntent: "CREATE_TASK",
    parsedEntities: {
      title: "order kitchen cabinets",
      project: "Mitchell"
    },
    confidence: 0.94,
    actionTaken: "TASK_CREATED",
    createdAt: "2024-01-20T10:30:00Z"
  },
  
  {
    id: "b6c7d8e9-f0a1-2345-bcde-678901234567",
    transcription: "Schedule meeting with Sarah next Tuesday at 2",
    parsedIntent: "CREATE_EVENT",
    parsedEntities: {
      title: "meeting with Sarah",
      date: "next Tuesday",
      time: "2 PM"
    },
    confidence: 0.91,
    actionTaken: "EVENT_CREATED",
    createdAt: "2024-01-20T11:15:00Z"
  },
  
  {
    id: "c7d8e9f0-a1b2-3456-cdef-789012345678",
    transcription: "Spent 547 dollars at Home Depot for kitchen demo",
    parsedIntent: "CREATE_TRANSACTION",
    parsedEntities: {
      amount: 547,
      merchant: "Home Depot",
      category: "materials",
      project: "kitchen"
    },
    confidence: 0.96,
    actionTaken: "TRANSACTION_CREATED",
    createdAt: "2024-01-18T16:45:00Z"
  }
];
```

## Test Context Learning

```typescript
export const testUserContext = {
  people: {
    "Jorge": {
      type: "person",
      fullName: "Jorge Martinez",
      userId: testUsers.teamMember.id,
      role: "carpenter",
      confidence: 0.98,
      usageCount: 45
    },
    "Sarah": {
      type: "person",
      fullName: "Sarah Mitchell",
      email: "sarah.mitchell@email.com",
      role: "client",
      project: "Mitchell Kitchen",
      confidence: 0.95,
      usageCount: 23
    }
  },
  
  projects: {
    "Mitchell": {
      type: "project",
      projectId: testProjects.mitchellKitchen.id,
      fullName: "Mitchell Kitchen Renovation",
      confidence: 0.97,
      usageCount: 67
    },
    "kitchen": {
      type: "project_reference",
      likelyProject: "Mitchell Kitchen",
      confidence: 0.85,
      usageCount: 34
    }
  },
  
  patterns: {
    "demo": {
      type: "abbreviation",
      expansion: "demolition",
      confidence: 0.93,
      usageCount: 12
    },
    "HD": {
      type: "merchant",
      expansion: "Home Depot",
      confidence: 0.99,
      usageCount: 89
    }
  }
};
```

## Test Scenarios

### Scenario 1: Morning Routine
```typescript
export const morningRoutineScenario = {
  time: "2024-01-24T07:00:00Z",
  user: testUsers.contractor,
  commands: [
    "What's on my schedule today?",
    "Add task to pick up materials for Mitchell kitchen",
    "Remind me to call Sarah about cabinet colors at 10 AM",
    "How much have we spent on the Mitchell project so far?"
  ],
  expectedOutcomes: [
    "Shows 3 meetings and 5 tasks",
    "Creates task with Home Depot location",
    "Creates task with reminder for 10 AM",
    "Shows $12,500 spent of $45,000 budget"
  ]
};
```

### Scenario 2: End of Day Wrap-up
```typescript
export const endOfDayScenario = {
  time: "2024-01-24T17:30:00Z",
  user: testUsers.contractor,
  commands: [
    "Mark kitchen demo as complete",
    "Log 8 hours for Jorge on Mitchell project",
    "Schedule team meeting for tomorrow at 8 AM",
    "What tasks are due tomorrow?"
  ],
  expectedOutcomes: [
    "Task marked complete",
    "Time entry created",
    "Recurring meeting instance created",
    "Shows 4 tasks due tomorrow"
  ]
};
```

## Data Generation Utilities

```typescript
// Generate random transactions
export function generateTransactions(count: number, accountId: string) {
  const merchants = [
    { name: "Home Depot", category: "materials", avgAmount: 245 },
    { name: "Lowe's", category: "materials", avgAmount: 189 },
    { name: "Gas Station", category: "fuel", avgAmount: 65 },
    { name: "Office Supply", category: "office", avgAmount: 87 }
  ];
  
  return Array.from({ length: count }, (_, i) => {
    const merchant = merchants[Math.floor(Math.random() * merchants.length)];
    const variance = 0.5 + Math.random(); // 50% to 150% of average
    
    return {
      id: generateUUID(),
      accountId,
      amount: -(merchant.avgAmount * variance).toFixed(2),
      date: new Date(Date.now() - i * 86400000).toISOString().split('T')[0],
      merchantName: merchant.name,
      categoryId: merchant.category,
      description: `${merchant.name.toUpperCase()} #${Math.floor(Math.random() * 9999)}`
    };
  });
}

// Generate recurring tasks
export function generateRecurringTasks(template: any, count: number) {
  const dates = [];
  const baseDate = new Date(template.dueDate);
  
  for (let i = 0; i < count; i++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + (i * 7)); // Weekly
    
    dates.push({
      ...template,
      id: generateUUID(),
      dueDate: date.toISOString(),
      title: `${template.title} - ${date.toLocaleDateString()}`
    });
  }
  
  return dates;
}
```