# Life OS Database Schema

## Overview

Database: PostgreSQL 15 with extensions:
- uuid-ossp (UUID generation)
- pg_trgm (text search)
- timescaledb (time-series data)

## Naming Conventions

- Tables: snake_case, plural (e.g., `users`, `tasks`)
- Columns: snake_case (e.g., `created_at`, `user_id`)
- Indexes: `idx_table_column` (e.g., `idx_tasks_user_id`)
- Foreign keys: `fk_table_reference` (e.g., `fk_tasks_user`)
- Constraints: `chk_table_condition` (e.g., `chk_tasks_due_date`)

## Core Schema

### Users & Authentication

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    timezone VARCHAR(50) DEFAULT 'UTC',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- User authentication (managed by Supabase Auth)
-- Stores in auth.users table

-- User roles
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    scope_type VARCHAR(50), -- 'global', 'project', 'organization'
    scope_id UUID, -- Reference to project/org if scoped
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    granted_by UUID REFERENCES users(id),
    UNIQUE(user_id, role, scope_type, scope_id)
);

-- User preferences
CREATE TABLE user_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    voice_enabled BOOLEAN DEFAULT true,
    voice_language VARCHAR(10) DEFAULT 'en-US',
    notification_settings JSONB DEFAULT '{}',
    calendar_settings JSONB DEFAULT '{}',
    financial_settings JSONB DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Organizations & Teams

```sql
-- Organizations (for business accounts)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    owner_id UUID NOT NULL REFERENCES users(id),
    settings JSONB DEFAULT '{}',
    subscription_tier VARCHAR(50) DEFAULT 'free',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Organization members
CREATE TABLE organization_members (
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (organization_id, user_id)
);

-- Teams within organizations
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Team members
CREATE TABLE team_members (
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member',
    PRIMARY KEY (team_id, user_id)
);
```

### Projects

```sql
-- Projects
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    client_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active', -- active, completed, on_hold, cancelled
    start_date DATE,
    end_date DATE,
    budget_amount DECIMAL(12,2),
    color VARCHAR(7), -- Hex color for UI
    settings JSONB DEFAULT '{}',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    archived_at TIMESTAMP WITH TIME ZONE
);

-- Project members
CREATE TABLE project_members (
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member',
    hourly_rate DECIMAL(10,2),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (project_id, user_id)
);
```

### Task Management

```sql
-- Tasks
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    user_id UUID NOT NULL REFERENCES users(id),
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    assignee_id UUID REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed, cancelled
    priority INTEGER DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
    due_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    recurring_pattern JSONB, -- RRULE or custom pattern
    tags TEXT[],
    metadata JSONB DEFAULT '{}',
    source VARCHAR(50) DEFAULT 'manual', -- manual, voice, email, api
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Task dependencies
CREATE TABLE task_dependencies (
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    depends_on_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    dependency_type VARCHAR(50) DEFAULT 'finish_to_start',
    PRIMARY KEY (task_id, depends_on_task_id)
);

-- Task comments
CREATE TABLE task_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    comment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Task attachments
CREATE TABLE task_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES users(id),
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL,
    file_type VARCHAR(100),
    storage_url TEXT NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Calendar & Events

```sql
-- Calendar events
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    external_id VARCHAR(255), -- ID from external calendar
    external_provider VARCHAR(50), -- google, outlook, apple
    title VARCHAR(500) NOT NULL,
    description TEXT,
    location TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    all_day BOOLEAN DEFAULT false,
    timezone VARCHAR(50),
    status VARCHAR(50) DEFAULT 'confirmed', -- confirmed, tentative, cancelled
    visibility VARCHAR(50) DEFAULT 'private', -- public, private
    recurring_pattern JSONB,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Event attendees
CREATE TABLE event_attendees (
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255),
    name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending', -- accepted, declined, tentative, pending
    is_organizer BOOLEAN DEFAULT false,
    PRIMARY KEY (event_id, COALESCE(user_id, email::uuid))
);

-- Calendar sync status
CREATE TABLE calendar_sync_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    provider VARCHAR(50) NOT NULL,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    sync_token TEXT,
    is_active BOOLEAN DEFAULT true,
    error_message TEXT,
    UNIQUE(user_id, provider)
);
```

### Financial Management

```sql
-- Bank accounts
CREATE TABLE bank_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    plaid_account_id VARCHAR(255) UNIQUE,
    institution_name VARCHAR(255),
    account_name VARCHAR(255) NOT NULL,
    account_type VARCHAR(50), -- checking, savings, credit, loan
    account_subtype VARCHAR(50),
    last_four VARCHAR(4),
    current_balance DECIMAL(12,2),
    available_balance DECIMAL(12,2),
    currency VARCHAR(3) DEFAULT 'USD',
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Financial transactions
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    account_id UUID REFERENCES bank_accounts(id) ON DELETE CASCADE,
    external_id VARCHAR(255), -- Plaid transaction ID
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    transaction_date DATE NOT NULL,
    description TEXT,
    merchant_name VARCHAR(255),
    category_id UUID REFERENCES categories(id),
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    is_pending BOOLEAN DEFAULT false,
    is_transfer BOOLEAN DEFAULT false,
    receipt_url TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Transaction categories
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id), -- NULL for system categories
    name VARCHAR(100) NOT NULL,
    parent_category_id UUID REFERENCES categories(id),
    icon VARCHAR(50),
    color VARCHAR(7),
    is_income BOOLEAN DEFAULT false,
    is_tax_deductible BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Transaction rules for auto-categorization
CREATE TABLE transaction_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    rule_name VARCHAR(255),
    conditions JSONB NOT NULL, -- e.g., {"merchant": "Home Depot", "amount": {">": 100}}
    category_id UUID REFERENCES categories(id),
    project_id UUID REFERENCES projects(id),
    priority INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Budgets
CREATE TABLE budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    category_id UUID REFERENCES categories(id),
    project_id UUID REFERENCES projects(id),
    amount DECIMAL(12,2) NOT NULL,
    period VARCHAR(50) NOT NULL, -- monthly, quarterly, yearly, custom
    start_date DATE NOT NULL,
    end_date DATE,
    alert_threshold DECIMAL(5,2) DEFAULT 80.00, -- Percentage
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Invoices
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    project_id UUID REFERENCES projects(id),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    client_email VARCHAR(255),
    client_address TEXT,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'draft', -- draft, sent, paid, overdue, cancelled
    paid_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Invoice line items
CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    task_id UUID REFERENCES tasks(id),
    sort_order INTEGER DEFAULT 0
);
```

### Voice & AI Context

```sql
-- Voice commands history
CREATE TABLE voice_commands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    audio_duration INTEGER, -- milliseconds
    transcription TEXT NOT NULL,
    confidence_score DECIMAL(3,2),
    parsed_intent VARCHAR(100),
    parsed_entities JSONB,
    action_taken VARCHAR(100),
    action_result JSONB,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User context learning
CREATE TABLE user_context (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    context_type VARCHAR(50), -- person, project, location, pattern
    key VARCHAR(255) NOT NULL, -- e.g., "Jorge", "Home Depot"
    value JSONB NOT NULL, -- e.g., {"type": "person", "full_name": "Jorge Martinez", "role": "contractor"}
    confidence_score DECIMAL(3,2) DEFAULT 1.0,
    usage_count INTEGER DEFAULT 1,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, context_type, key)
);

-- AI conversation memory
CREATE TABLE ai_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    session_id UUID NOT NULL,
    role VARCHAR(50) NOT NULL, -- user, assistant, system
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Indexes

```sql
-- Performance indexes
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_created_at ON tasks(created_at DESC);

CREATE INDEX idx_events_user_id ON events(user_id);
CREATE INDEX idx_events_start_time ON events(start_time);
CREATE INDEX idx_events_project_id ON events(project_id);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_account_id ON transactions(account_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date DESC);
CREATE INDEX idx_transactions_project_id ON transactions(project_id);

-- Full-text search indexes
CREATE INDEX idx_tasks_search ON tasks USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));
CREATE INDEX idx_projects_search ON projects USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- JSONB indexes
CREATE INDEX idx_tasks_metadata ON tasks USING gin(metadata);
CREATE INDEX idx_user_settings ON users USING gin(settings);
```

### Audit & History

```sql
-- Audit log for all changes
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL, -- INSERT, UPDATE, DELETE
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable row-level security
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create policies (example for tasks)
CREATE POLICY tasks_user_policy ON tasks
    FOR ALL
    TO authenticated
    USING (user_id = current_user_id() OR 
           assignee_id = current_user_id() OR
           project_id IN (
               SELECT project_id FROM project_members 
               WHERE user_id = current_user_id()
           ));
```

### Functions & Triggers

```sql
-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables with updated_at
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add similar triggers for other tables...

-- Function to calculate project progress
CREATE OR REPLACE FUNCTION calculate_project_progress(p_project_id UUID)
RETURNS DECIMAL AS $$
DECLARE
    total_tasks INTEGER;
    completed_tasks INTEGER;
BEGIN
    SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'completed')
    INTO total_tasks, completed_tasks
    FROM tasks
    WHERE project_id = p_project_id;
    
    IF total_tasks = 0 THEN
        RETURN 0;
    END IF;
    
    RETURN (completed_tasks::DECIMAL / total_tasks) * 100;
END;
$$ LANGUAGE plpgsql;
```

## Migration Strategy

1. Use Prisma for schema migrations
2. Never modify existing migrations
3. Always include rollback scripts
4. Test migrations on copy of production data
5. Version all schema changes

## Performance Considerations

1. Partition large tables by date (transactions, events)
2. Use materialized views for complex reports
3. Implement database connection pooling
4. Regular VACUUM and ANALYZE
5. Monitor slow queries with pg_stat_statements