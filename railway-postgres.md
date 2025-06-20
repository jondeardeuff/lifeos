# Railway PostgreSQL Deployment Guide

## Step 1: Create a New Railway Project

1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Select "Empty Project"
4. Name it "lifeos"

## Step 2: Add PostgreSQL Database

1. Click "+ New Service"
2. Select "Database"
3. Choose "PostgreSQL"
4. Railway will automatically create a PostgreSQL instance

## Step 3: Configure Environment Variables

Railway will automatically provide these environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `PGHOST` - Database host
- `PGPORT` - Database port
- `PGUSER` - Database user
- `PGPASSWORD` - Database password
- `PGDATABASE` - Database name

## Step 4: Run Database Migrations

After deploying the API, you'll need to run:
```bash
railway run pnpm --filter @lifeos/database db:push
railway run pnpm --filter @lifeos/database db:seed
```

## Step 5: Connect API to Database

The API will automatically use the `DATABASE_URL` environment variable provided by Railway.

## Production Database URL Format

```
postgresql://username:password@host:port/database?sslmode=require
```

Railway automatically includes SSL mode for security.