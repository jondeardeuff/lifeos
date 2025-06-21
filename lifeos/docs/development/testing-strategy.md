# Life OS Testing Strategy

## Overview

Comprehensive testing approach ensuring reliability, performance, and user satisfaction across all features.

## Testing Principles

1. **Test Pyramid**: Unit > Integration > E2E
2. **Shift Left**: Test early in development
3. **Automate Everything**: Manual testing only for exploratory
4. **Test in Production**: Feature flags and monitoring
5. **Data-Driven**: Use realistic test data

## Testing Levels

### 1. Unit Tests

**Coverage Target**: 80% minimum, 100% for financial calculations

#### What to Test
- Pure functions
- React component logic
- State management actions/reducers
- Utility functions
- API response transformers

#### Tools
- **Vitest**: Test runner
- **React Testing Library**: Component testing
- **MSW**: API mocking
- **Faker.js**: Test data generation

#### Example Test Structure
```typescript
// task-parser.test.ts
describe('TaskParser', () => {
  describe('parseVoiceCommand', () => {
    it('should extract basic task information', () => {
      const input = "Remind me to call John tomorrow at 3pm";
      const result = parseVoiceCommand(input);
      
      expect(result).toEqual({
        action: 'CREATE_TASK',
        task: {
          title: 'call John',
          dueDate: expect.any(Date),
          dueTime: '15:00'
        },
        confidence: 0.95
      });
    });

    it('should handle project context', () => {
      const input = "Add demolish kitchen to Mitchell project";
      const context = { currentProject: 'mitchell-uuid' };
      const result = parseVoiceCommand(input, context);
      
      expect(result.task.projectId).toBe('mitchell-uuid');
    });
  });
});
```

### 2. Integration Tests

**Coverage Target**: All critical user flows

#### What to Test
- API endpoints
- Database operations
- External service integrations
- Authentication flows
- WebSocket connections

#### Tools
- **Supertest**: HTTP assertions
- **Test containers**: Database testing
- **Nock**: External API mocking

#### Example Test
```typescript
// api.integration.test.ts
describe('Task API', () => {
  beforeEach(async () => {
    await resetDatabase();
    await seedTestData();
  });

  it('should create task with voice command', async () => {
    const response = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        query: `
          mutation ProcessVoice($input: VoiceCommandInput!) {
            processVoiceCommand(input: $input) {
              success
              action
              result
            }
          }
        `,
        variables: {
          input: {
            transcription: "Schedule meeting with Sarah next Tuesday at 2pm"
          }
        }
      });

    expect(response.status).toBe(200);
    expect(response.body.data.processVoiceCommand.success).toBe(true);
    
    // Verify task was created
    const task = await db.task.findFirst({
      where: { title: { contains: 'meeting with Sarah' } }
    });
    expect(task).toBeDefined();
  });
});
```

### 3. End-to-End Tests

**Coverage Target**: Critical user journeys

#### What to Test
- Complete user workflows
- Cross-feature interactions
- Real browser behavior
- Mobile app flows

#### Tools
- **Playwright**: Web E2E testing
- **Detox**: React Native testing
- **Percy**: Visual regression

#### Test Scenarios
```typescript
// voice-to-task.e2e.test.ts
test('Create task via voice command', async ({ page }) => {
  await page.goto('/dashboard');
  await login(page, testUser);
  
  // Start voice recording
  await page.click('[data-testid="voice-button"]');
  await page.waitForSelector('[data-testid="recording-indicator"]');
  
  // Simulate voice input
  await page.evaluate(() => {
    window.simulateVoiceInput("Add task to buy groceries tomorrow");
  });
  
  // Stop recording
  await page.click('[data-testid="voice-button"]');
  
  // Verify task creation
  await page.waitForSelector('text=buy groceries');
  const task = page.locator('[data-testid="task-item"]').filter({
    hasText: 'buy groceries'
  });
  
  await expect(task).toBeVisible();
  await expect(task).toContainText('Tomorrow');
});
```

### 4. Performance Tests

**Targets**:
- API response time < 200ms (p95)
- Voice processing < 500ms
- Page load < 2s
- 1000 concurrent users

#### Tools
- **k6**: Load testing
- **Lighthouse CI**: Frontend performance
- **New Relic**: Production monitoring

#### Example Load Test
```javascript
// load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '5m', target: 100 },
    { duration: '10m', target: 100 },
    { duration: '5m', target: 500 },
    { duration: '10m', target: 500 },
    { duration: '5m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function() {
  const payload = JSON.stringify({
    query: `query { tasks { id title } }`
  });

  const response = http.post('https://api.lifeos.app/graphql', payload, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${__ENV.TEST_TOKEN}`,
    },
  });

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });

  sleep(1);
}
```

### 5. Voice Recognition Tests

**Accuracy Target**: 95%+ for common commands

#### Test Corpus
```yaml
# voice-test-corpus.yaml
commands:
  - category: task_creation
    samples:
      - text: "Add task to buy milk"
        expected:
          action: CREATE_TASK
          title: "buy milk"
      - text: "Remind me to call mom tomorrow"
        expected:
          action: CREATE_TASK
          title: "call mom"
          due: TOMORROW
      - text: "Create task for Jorge to demo kitchen"
        expected:
          action: CREATE_TASK
          title: "demo kitchen"
          assignee: "Jorge"

  - category: project_assignment
    samples:
      - text: "Add this to the Mitchell project"
        expected:
          action: UPDATE_CONTEXT
          project: "Mitchell"
```

#### Dialect Testing
- American English (various regions)
- British English
- Australian English
- Non-native speakers
- Background noise conditions

### 6. Security Tests

#### OWASP Top 10 Coverage
- SQL Injection
- XSS
- CSRF
- Authentication bypass
- Sensitive data exposure

#### Tools
- **OWASP ZAP**: Automated scanning
- **Burp Suite**: Manual testing
- **npm audit**: Dependency scanning

#### Example Security Test
```typescript
// security.test.ts
describe('Security', () => {
  it('should prevent SQL injection in search', async () => {
    const maliciousInput = "'; DROP TABLE tasks; --";
    
    const response = await request(app)
      .get('/api/tasks')
      .query({ search: maliciousInput })
      .set('Authorization', `Bearer ${testToken}`);
    
    expect(response.status).toBe(200);
    
    // Verify tables still exist
    const tablesExist = await db.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'tasks'
      );
    `;
    expect(tablesExist[0].exists).toBe(true);
  });
});
```

### 7. Accessibility Tests

**WCAG 2.1 AA Compliance**

#### Tools
- **axe-core**: Automated accessibility testing
- **Pa11y**: CI accessibility testing
- **NVDA/JAWS**: Screen reader testing

#### Test Cases
```typescript
// accessibility.test.ts
describe('Accessibility', () => {
  it('should have no WCAG violations on dashboard', async () => {
    const { container } = render(<Dashboard />);
    const results = await axe(container);
    
    expect(results).toHaveNoViolations();
  });

  it('should announce voice recording state', async () => {
    const { getByRole } = render(<VoiceButton />);
    const button = getByRole('button');
    
    fireEvent.click(button);
    
    expect(button).toHaveAttribute('aria-label', 'Recording. Press to stop.');
    expect(button).toHaveAttribute('aria-pressed', 'true');
  });
});
```

## Test Data Management

### Test Data Categories

1. **Seed Data**: Consistent baseline
2. **Randomized Data**: Faker.js generated
3. **Edge Cases**: Boundary conditions
4. **Production-like**: Anonymized real data

### Test User Personas

```typescript
const testUsers = {
  contractor: {
    name: "John Builder",
    projects: 5,
    team: 3,
    monthlyTransactions: 150
  },
  smallBusiness: {
    name: "Sarah Owner",
    projects: 12,
    team: 8,
    monthlyTransactions: 300
  },
  personal: {
    name: "Mike User",
    projects: 0,
    team: 0,
    monthlyTransactions: 50
  }
};
```

## CI/CD Integration

### Pipeline Stages

```yaml
# .github/workflows/test.yml
name: Test Pipeline

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Unit Tests
        run: |
          pnpm install
          pnpm test:unit
      - name: Upload Coverage
        uses: codecov/codecov-action@v3

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v3
      - name: Run Integration Tests
        run: |
          pnpm install
          pnpm test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run E2E Tests
        run: |
          pnpm install
          pnpm playwright install
          pnpm test:e2e

  performance-tests:
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v3
      - name: Run Performance Tests
        run: |
          pnpm install
          pnpm test:performance
      - name: Comment Results
        uses: actions/github-script@v6
        with:
          script: |
            // Post performance results to PR
```

## Test Environments

### Environment Strategy

1. **Local**: Developer machine
2. **CI**: Automated testing
3. **Staging**: Production-like
4. **Production**: Monitoring only

### Environment Configuration

```typescript
// test-config.ts
export const testConfig = {
  local: {
    apiUrl: 'http://localhost:4000',
    database: 'postgresql://localhost/lifeos_test',
    redis: 'redis://localhost:6379'
  },
  ci: {
    apiUrl: process.env.CI_API_URL,
    database: process.env.CI_DATABASE_URL,
    redis: process.env.CI_REDIS_URL
  },
  staging: {
    apiUrl: 'https://staging-api.lifeos.app',
    database: process.env.STAGING_DATABASE_URL,
    redis: process.env.STAGING_REDIS_URL
  }
};
```

## Monitoring & Alerting

### Key Metrics

1. **Test Coverage**: Minimum 80%
2. **Test Execution Time**: < 10 minutes
3. **Flaky Test Rate**: < 1%
4. **Production Error Rate**: < 0.1%

### Alert Conditions

```yaml
alerts:
  - name: High Error Rate
    condition: error_rate > 1%
    window: 5m
    severity: critical
    
  - name: Voice Command Failures
    condition: voice_success_rate < 90%
    window: 15m
    severity: warning
    
  - name: API Performance
    condition: p95_response_time > 500ms
    window: 10m
    severity: warning
```

## Test Reporting

### Dashboard Metrics

- Test pass rate by feature
- Coverage trends
- Performance benchmarks
- Voice accuracy by dialect
- Accessibility score

### Weekly Test Report

```markdown
## Test Summary - Week 2024-W01

### Coverage
- Overall: 87% (+2%)
- Unit: 92%
- Integration: 78%
- E2E: 100% critical paths

### Voice Recognition
- Overall accuracy: 96.2%
- Improvement areas:
  - Non-native accents: 91%
  - Noisy environments: 88%

### Performance
- API p95: 145ms ✓
- Voice processing: 423ms ✓
- Page load: 1.8s ✓

### Issues Found
- Critical: 0
- High: 2 (fixed)
- Medium: 5 (in progress)
```