# Deployment Strategy

## Overview

Life OS deployment strategy using Google Cloud Platform with Cloud Run for containerized services, self-hosted PostgreSQL, and Cloudflare for CDN and edge functions.

## Infrastructure Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Cloudflare CDN                          │
│                   (Static Assets, DDoS)                      │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                 Google Cloud Load Balancer                   │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┬─────────────────┐
        │             │             │                 │
┌───────▼────┐ ┌──────▼────┐ ┌─────▼──────┐ ┌───────▼───────┐
│  Cloud Run │ │ Cloud Run │ │ Cloud Run  │ │  Cloud Run    │
│    (Web)   │ │   (API)   │ │   (Auth)   │ │ (Background)  │
└────────────┘ └───────────┘ └────────────┘ └───────────────┘
        │             │             │                 │
        └─────────────┴─────────────┴─────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │   Shared Services  │
                    ├────────────────────┤
                    │ PostgreSQL (VM)    │
                    │ Redis (Memorystore)│
                    │ Cloud Storage      │
                    └────────────────────┘
```

## Environments

### Development
- Local Docker containers
- Local PostgreSQL and Redis
- Hot reload enabled
- Mock external services

### Staging
- Google Cloud Run (staging project)
- Shared PostgreSQL instance
- Real external services (sandbox mode)
- Feature flags for testing

### Production
- Google Cloud Run (production project)
- Dedicated PostgreSQL cluster
- Multi-region deployment
- Full monitoring and alerting

## Container Strategy

### Dockerfile (Multi-stage)

```dockerfile
# Base stage
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
RUN npm install -g pnpm
WORKDIR /app

# Dependencies stage
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Builder stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# Runner stage - Web
FROM base AS web-runner
ENV NODE_ENV production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/web/dist ./dist
COPY --from=builder /app/apps/web/package.json ./

USER nextjs
EXPOSE 3000
ENV PORT 3000

CMD ["node", "dist/server.js"]

# Runner stage - API
FROM base AS api-runner
ENV NODE_ENV production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/prisma ./prisma

USER nodejs
EXPOSE 4000
ENV PORT 4000

CMD ["node", "dist/server.js"]
```

### Build Configuration

```yaml
# cloudbuild.yaml
steps:
  # Build images
  - name: 'gcr.io/cloud-builders/docker'
    args: [
      'build',
      '-t', 'gcr.io/$PROJECT_ID/lifeos-web:$COMMIT_SHA',
      '-t', 'gcr.io/$PROJECT_ID/lifeos-web:latest',
      '--target', 'web-runner',
      '--cache-from', 'gcr.io/$PROJECT_ID/lifeos-web:latest',
      '.'
    ]
  
  - name: 'gcr.io/cloud-builders/docker'
    args: [
      'build',
      '-t', 'gcr.io/$PROJECT_ID/lifeos-api:$COMMIT_SHA',
      '-t', 'gcr.io/$PROJECT_ID/lifeos-api:latest',
      '--target', 'api-runner',
      '--cache-from', 'gcr.io/$PROJECT_ID/lifeos-api:latest',
      '.'
    ]
  
  # Push images
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/lifeos-web:$COMMIT_SHA']
  
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/lifeos-api:$COMMIT_SHA']
  
  # Deploy to Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args: [
      'run', 'deploy', 'lifeos-web',
      '--image', 'gcr.io/$PROJECT_ID/lifeos-web:$COMMIT_SHA',
      '--region', 'us-central1',
      '--platform', 'managed',
      '--allow-unauthenticated'
    ]
  
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args: [
      'run', 'deploy', 'lifeos-api',
      '--image', 'gcr.io/$PROJECT_ID/lifeos-api:$COMMIT_SHA',
      '--region', 'us-central1',
      '--platform', 'managed',
      '--allow-unauthenticated',
      '--set-env-vars', 'DATABASE_URL=$$DATABASE_URL',
      '--set-secrets', 'JWT_SECRET=jwt-secret:latest'
    ]

timeout: 1200s
```

## Cloud Run Configuration

### Service Configuration

```yaml
# service.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: lifeos-api
  annotations:
    run.googleapis.com/launch-stage: GA
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/minScale: "1"
        autoscaling.knative.dev/maxScale: "100"
        run.googleapis.com/cpu-throttling: "false"
        run.googleapis.com/execution-environment: gen2
    spec:
      containerConcurrency: 1000
      timeoutSeconds: 300
      serviceAccountName: lifeos-api@project.iam.gserviceaccount.com
      containers:
      - image: gcr.io/project/lifeos-api
        ports:
        - name: http1
          containerPort: 4000
        resources:
          limits:
            cpu: "2"
            memory: "2Gi"
        env:
        - name: NODE_ENV
          value: production
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-url
              key: latest
        - name: REDIS_URL
          value: redis://10.0.0.3:6379
        startupProbe:
          httpGet:
            path: /health
            port: 4000
          initialDelaySeconds: 0
          periodSeconds: 1
          timeoutSeconds: 1
          failureThreshold: 20
        livenessProbe:
          httpGet:
            path: /health
            port: 4000
          periodSeconds: 10
          timeoutSeconds: 1
        readinessProbe:
          httpGet:
            path: /ready
            port: 4000
          periodSeconds: 5
          timeoutSeconds: 1
```

### Auto-scaling Configuration

```yaml
# Horizontal Pod Autoscaling
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: lifeos-api-hpa
spec:
  scaleTargetRef:
    apiVersion: serving.knative.dev/v1
    kind: Service
    name: lifeos-api
  minReplicas: 2
  maxReplicas: 100
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  - type: External
    external:
      metric:
        name: custom.googleapis.com|cloud_run|request_count
      target:
        type: AverageValue
        averageValue: "100"
```

## Database Deployment

### PostgreSQL on Compute Engine

```bash
#!/bin/bash
# setup-postgres.sh

# Create VM instance
gcloud compute instances create lifeos-postgres \
  --machine-type=n2-standard-4 \
  --boot-disk-size=100GB \
  --boot-disk-type=pd-ssd \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --tags=postgres-server \
  --metadata-from-file startup-script=postgres-init.sh

# Create firewall rule
gcloud compute firewall-rules create allow-postgres \
  --allow=tcp:5432 \
  --source-ranges=10.0.0.0/8 \
  --target-tags=postgres-server

# Create persistent disk for data
gcloud compute disks create postgres-data \
  --size=500GB \
  --type=pd-ssd \
  --zone=us-central1-a

# Attach disk
gcloud compute instances attach-disk lifeos-postgres \
  --disk=postgres-data \
  --zone=us-central1-a
```

### PostgreSQL Configuration

```bash
# postgres-init.sh
#!/bin/bash

# Install PostgreSQL 15
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt-get update
sudo apt-get -y install postgresql-15 postgresql-contrib-15

# Configure PostgreSQL
sudo -u postgres psql << EOF
CREATE USER lifeos WITH PASSWORD '${DB_PASSWORD}';
CREATE DATABASE lifeos_production OWNER lifeos;
GRANT ALL PRIVILEGES ON DATABASE lifeos_production TO lifeos;
EOF

# Update PostgreSQL configuration
sudo tee -a /etc/postgresql/15/main/postgresql.conf << EOF
# Performance Tuning
shared_buffers = 1GB
effective_cache_size = 3GB
maintenance_work_mem = 256MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 10MB
min_wal_size = 1GB
max_wal_size = 4GB
max_worker_processes = 4
max_parallel_workers_per_gather = 2
max_parallel_workers = 4

# Logging
log_statement = 'mod'
log_duration = on
log_min_duration_statement = 100
log_checkpoints = on
log_connections = on
log_disconnections = on
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
log_timezone = 'UTC'

# Connection Settings
listen_addresses = '*'
max_connections = 200
EOF

# Configure host-based authentication
sudo tee /etc/postgresql/15/main/pg_hba.conf << EOF
# TYPE  DATABASE        USER            ADDRESS                 METHOD
local   all             all                                     peer
host    all             all             10.0.0.0/8              md5
host    all             all             127.0.0.1/32            md5
EOF

# Restart PostgreSQL
sudo systemctl restart postgresql

# Setup backup
sudo tee /usr/local/bin/backup-postgres.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/mnt/postgres-data/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="lifeos_production"

mkdir -p $BACKUP_DIR
pg_dump -U postgres -d $DB_NAME -f "$BACKUP_DIR/backup_$TIMESTAMP.sql"
gsutil cp "$BACKUP_DIR/backup_$TIMESTAMP.sql" gs://lifeos-backups/postgres/

# Keep only last 7 days of local backups
find $BACKUP_DIR -type f -mtime +7 -delete
EOF

chmod +x /usr/local/bin/backup-postgres.sh

# Setup cron for backups
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-postgres.sh") | crontab -
```

## CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  GCP_PROJECT_ID: lifeos-production
  GCP_REGION: us-central1
  IMAGE_REGISTRY: gcr.io

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: pnpm/action-setup@v2
        with:
          version: 8
          
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
          
      - run: pnpm install --frozen-lockfile
      
      - run: pnpm test
      
      - run: pnpm build

  deploy-staging:
    needs: test
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4
      
      - id: 'auth'
        uses: 'google-github-actions/auth@v2'
        with:
          credentials_json: '${{ secrets.GCP_SA_KEY_STAGING }}'
          
      - uses: 'google-github-actions/setup-gcloud@v2'
        
      - name: Configure Docker
        run: gcloud auth configure-docker
        
      - name: Build and Push Images
        run: |
          docker build -t $IMAGE_REGISTRY/$GCP_PROJECT_ID-staging/lifeos-web:${{ github.sha }} --target web-runner .
          docker build -t $IMAGE_REGISTRY/$GCP_PROJECT_ID-staging/lifeos-api:${{ github.sha }} --target api-runner .
          docker push $IMAGE_REGISTRY/$GCP_PROJECT_ID-staging/lifeos-web:${{ github.sha }}
          docker push $IMAGE_REGISTRY/$GCP_PROJECT_ID-staging/lifeos-api:${{ github.sha }}
          
      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy lifeos-web-staging \
            --image $IMAGE_REGISTRY/$GCP_PROJECT_ID-staging/lifeos-web:${{ github.sha }} \
            --region $GCP_REGION \
            --platform managed \
            --allow-unauthenticated
            
          gcloud run deploy lifeos-api-staging \
            --image $IMAGE_REGISTRY/$GCP_PROJECT_ID-staging/lifeos-api:${{ github.sha }} \
            --region $GCP_REGION \
            --platform managed \
            --allow-unauthenticated \
            --set-env-vars NODE_ENV=staging
            
      - name: Run E2E Tests
        run: |
          pnpm test:e2e --env STAGING_URL=${{ steps.deploy.outputs.url }}

  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      
      - id: 'auth'
        uses: 'google-github-actions/auth@v2'
        with:
          credentials_json: '${{ secrets.GCP_SA_KEY_PRODUCTION }}'
          
      - uses: 'google-github-actions/setup-gcloud@v2'
      
      - name: Configure Docker
        run: gcloud auth configure-docker
        
      - name: Build and Push Images
        run: |
          docker build -t $IMAGE_REGISTRY/$GCP_PROJECT_ID/lifeos-web:${{ github.sha }} --target web-runner .
          docker build -t $IMAGE_REGISTRY/$GCP_PROJECT_ID/lifeos-api:${{ github.sha }} --target api-runner .
          docker push $IMAGE_REGISTRY/$GCP_PROJECT_ID/lifeos-web:${{ github.sha }}
          docker push $IMAGE_REGISTRY/$GCP_PROJECT_ID/lifeos-api:${{ github.sha }}
          
      - name: Deploy to Cloud Run (Canary)
        run: |
          # Deploy with 10% traffic
          gcloud run deploy lifeos-api \
            --image $IMAGE_REGISTRY/$GCP_PROJECT_ID/lifeos-api:${{ github.sha }} \
            --region $GCP_REGION \
            --platform managed \
            --tag canary \
            --no-traffic
            
          gcloud run services update-traffic lifeos-api \
            --region $GCP_REGION \
            --to-tags canary=10
            
      - name: Monitor Canary
        run: |
          # Wait 10 minutes and check metrics
          sleep 600
          # Check error rates, latency, etc.
          ./scripts/check-canary-health.sh
          
      - name: Promote to Production
        if: success()
        run: |
          gcloud run services update-traffic lifeos-api \
            --region $GCP_REGION \
            --to-latest
            
          gcloud run deploy lifeos-web \
            --image $IMAGE_REGISTRY/$GCP_PROJECT_ID/lifeos-web:${{ github.sha }} \
            --region $GCP_REGION \
            --platform managed
```

## Infrastructure as Code

### Terraform Configuration

```hcl
# main.tf
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
  
  backend "gcs" {
    bucket = "lifeos-terraform-state"
    prefix = "production"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Cloud Run Services
resource "google_cloud_run_service" "web" {
  name     = "lifeos-web"
  location = var.region
  
  template {
    spec {
      containers {
        image = "gcr.io/${var.project_id}/lifeos-web:latest"
        
        resources {
          limits = {
            cpu    = "1"
            memory = "512Mi"
          }
        }
        
        env {
          name  = "API_URL"
          value = google_cloud_run_service.api.status[0].url
        }
      }
    }
    
    metadata {
      annotations = {
        "autoscaling.knative.dev/minScale"     = "1"
        "autoscaling.knative.dev/maxScale"     = "100"
        "run.googleapis.com/startup-cpu-boost" = "true"
      }
    }
  }
  
  traffic {
    percent         = 100
    latest_revision = true
  }
}

resource "google_cloud_run_service" "api" {
  name     = "lifeos-api"
  location = var.region
  
  template {
    spec {
      service_account_name = google_service_account.api.email
      
      containers {
        image = "gcr.io/${var.project_id}/lifeos-api:latest"
        
        resources {
          limits = {
            cpu    = "2"
            memory = "2Gi"
          }
        }
        
        env {
          name = "DATABASE_URL"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.database_url.secret_id
              key  = "latest"
            }
          }
        }
        
        env {
          name  = "REDIS_URL"
          value = "redis://${google_redis_instance.cache.host}:${google_redis_instance.cache.port}"
        }
      }
    }
  }
}

# Redis Instance
resource "google_redis_instance" "cache" {
  name               = "lifeos-cache"
  memory_size_gb     = 1
  redis_version      = "REDIS_7_0"
  tier               = "STANDARD_HA"
  
  location_id             = "${var.region}-a"
  alternative_location_id = "${var.region}-b"
  
  auth_enabled            = true
  transit_encryption_mode = "SERVER_AUTHENTICATION"
  
  persistence_config {
    persistence_mode    = "RDB"
    rdb_snapshot_period = "ONE_HOUR"
  }
}

# Cloud Storage Buckets
resource "google_storage_bucket" "uploads" {
  name          = "${var.project_id}-uploads"
  location      = var.region
  force_destroy = false
  
  uniform_bucket_level_access = true
  
  cors {
    origin          = ["https://lifeos.app"]
    method          = ["GET", "HEAD", "PUT", "POST", "DELETE"]
    response_header = ["*"]
    max_age_seconds = 3600
  }
  
  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type = "Delete"
    }
  }
}

# Load Balancer
resource "google_compute_global_address" "default" {
  name = "lifeos-ip"
}

resource "google_compute_global_forwarding_rule" "default" {
  name       = "lifeos-forwarding-rule"
  target     = google_compute_target_https_proxy.default.id
  port_range = "443"
  ip_address = google_compute_global_address.default.address
}

# Monitoring and Alerting
resource "google_monitoring_alert_policy" "api_latency" {
  display_name = "API High Latency"
  combiner     = "OR"
  
  conditions {
    display_name = "95th percentile latency > 500ms"
    
    condition_threshold {
      filter          = "resource.type = \"cloud_run_revision\" AND metric.type = \"run.googleapis.com/request_latencies\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 500
      
      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_PERCENTILE_95"
        cross_series_reducer = "REDUCE_MEAN"
        group_by_fields      = ["resource.service_name"]
      }
    }
  }
  
  notification_channels = [google_monitoring_notification_channel.email.name]
}
```

## Deployment Scripts

### Deployment Script

```bash
#!/bin/bash
# scripts/deploy.sh

set -euo pipefail

ENVIRONMENT=${1:-staging}
VERSION=${2:-$(git rev-parse --short HEAD)}

echo "Deploying version $VERSION to $ENVIRONMENT"

# Load environment variables
source .env.$ENVIRONMENT

# Build and push images
echo "Building Docker images..."
docker build -t gcr.io/$PROJECT_ID/lifeos-web:$VERSION --target web-runner .
docker build -t gcr.io/$PROJECT_ID/lifeos-api:$VERSION --target api-runner .

echo "Pushing images to registry..."
docker push gcr.io/$PROJECT_ID/lifeos-web:$VERSION
docker push gcr.io/$PROJECT_ID/lifeos-api:$VERSION

# Run database migrations
echo "Running database migrations..."
docker run --rm \
  -e DATABASE_URL=$DATABASE_URL \
  gcr.io/$PROJECT_ID/lifeos-api:$VERSION \
  pnpm prisma migrate deploy

# Deploy services
echo "Deploying services..."
gcloud run deploy lifeos-web-$ENVIRONMENT \
  --image gcr.io/$PROJECT_ID/lifeos-web:$VERSION \
  --region $REGION \
  --project $PROJECT_ID

gcloud run deploy lifeos-api-$ENVIRONMENT \
  --image gcr.io/$PROJECT_ID/lifeos-api:$VERSION \
  --region $REGION \
  --project $PROJECT_ID

echo "Deployment complete!"
```

### Rollback Script

```bash
#!/bin/bash
# scripts/rollback.sh

set -euo pipefail

ENVIRONMENT=${1:-staging}
SERVICE=${2:-api}

echo "Rolling back $SERVICE in $ENVIRONMENT"

# Get previous revision
PREVIOUS_REVISION=$(gcloud run revisions list \
  --service lifeos-$SERVICE-$ENVIRONMENT \
  --region $REGION \
  --format "value(name)" \
  --limit 2 | tail -1)

echo "Rolling back to revision: $PREVIOUS_REVISION"

# Update traffic
gcloud run services update-traffic \
  lifeos-$SERVICE-$ENVIRONMENT \
  --to-revisions $PREVIOUS_REVISION=100 \
  --region $REGION

echo "Rollback complete!"
```

## Monitoring Setup

### Health Check Endpoints

```typescript
// api/health.ts
export async function healthCheck(req: Request, res: Response) {
  const checks = {
    server: 'ok',
    database: 'checking',
    redis: 'checking',
    timestamp: new Date().toISOString(),
  };
  
  try {
    // Check database
    await db.$queryRaw`SELECT 1`;
    checks.database = 'ok';
  } catch (error) {
    checks.database = 'error';
  }
  
  try {
    // Check Redis
    await redis.ping();
    checks.redis = 'ok';
  } catch (error) {
    checks.redis = 'error';
  }
  
  const allHealthy = Object.values(checks).every(
    status => status === 'ok' || typeof status === 'string'
  );
  
  res.status(allHealthy ? 200 : 503).json(checks);
}

export async function readinessCheck(req: Request, res: Response) {
  try {
    // Check if migrations are complete
    await db.$queryRaw`SELECT 1 FROM _prisma_migrations LIMIT 1`;
    
    // Check if critical services are configured
    if (!process.env.DATABASE_URL || !process.env.REDIS_URL) {
      throw new Error('Missing critical configuration');
    }
    
    res.status(200).json({ ready: true });
  } catch (error) {
    res.status(503).json({ ready: false, error: error.message });
  }
}
```

## Security Configuration

### Secrets Management

```bash
# Create secrets
gcloud secrets create database-url --data-file=- <<< "$DATABASE_URL"
gcloud secrets create jwt-secret --data-file=- <<< "$JWT_SECRET"
gcloud secrets create plaid-secret --data-file=- <<< "$PLAID_SECRET"

# Grant access to service account
gcloud secrets add-iam-policy-binding database-url \
  --member="serviceAccount:lifeos-api@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### Network Security

```yaml
# firewall-rules.yaml
- name: allow-cloud-run-to-postgres
  allow:
    - IPProtocol: tcp
      ports: ["5432"]
  sourceRanges:
    - 10.0.0.0/8  # Cloud Run IP range
  targetTags:
    - postgres-server

- name: allow-health-checks
  allow:
    - IPProtocol: tcp
      ports: ["80", "443"]
  sourceRanges:
    - 35.191.0.0/16     # Google Health Check IPs
    - 130.211.0.0/22
  targetTags:
    - http-server
```

## Disaster Recovery

### Backup Strategy

```yaml
# backup-policy.yaml
backupPolicies:
  - name: postgres-daily
    schedule: "0 2 * * *"  # 2 AM daily
    retention: 30          # days
    target:
      type: postgres
      connectionString: $DATABASE_URL
    destination:
      type: gcs
      bucket: lifeos-backups
      path: postgres/daily/
      
  - name: postgres-weekly
    schedule: "0 3 * * 0"  # 3 AM Sunday
    retention: 180         # days
    target:
      type: postgres
      connectionString: $DATABASE_URL
    destination:
      type: gcs
      bucket: lifeos-backups
      path: postgres/weekly/
```

### Recovery Procedures

```bash
#!/bin/bash
# scripts/disaster-recovery.sh

# Restore database from backup
restore_database() {
  BACKUP_DATE=${1:-$(date -d "yesterday" +%Y%m%d)}
  
  echo "Restoring database from $BACKUP_DATE"
  
  # Download backup
  gsutil cp gs://lifeos-backups/postgres/daily/backup_$BACKUP_DATE.sql.gz /tmp/
  
  # Restore
  gunzip -c /tmp/backup_$BACKUP_DATE.sql.gz | psql $DATABASE_URL
  
  echo "Database restored successfully"
}

# Failover to DR region
failover_to_dr() {
  echo "Initiating failover to DR region"
  
  # Update DNS
  gcloud dns record-sets transaction start --zone=lifeos-app
  gcloud dns record-sets transaction remove \
    --name=api.lifeos.app. \
    --ttl=300 \
    --type=A \
    --zone=lifeos-app \
    --rrdatas=$PRIMARY_IP
  gcloud dns record-sets transaction add \
    --name=api.lifeos.app. \
    --ttl=300 \
    --type=A \
    --zone=lifeos-app \
    --rrdatas=$DR_IP
  gcloud dns record-sets transaction execute --zone=lifeos-app
  
  echo "Failover complete"
}
```

## Performance Optimization

### CDN Configuration

```javascript
// cloudflare-worker.js
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  
  // Cache static assets
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2)$/)) {
    const cache = caches.default;
    let response = await cache.match(request);
    
    if (!response) {
      response = await fetch(request);
      const headers = new Headers(response.headers);
      headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      
      response = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: headers,
      });
      
      event.waitUntil(cache.put(request, response.clone()));
    }
    
    return response;
  }
  
  // Pass through API requests
  if (url.pathname.startsWith('/api/')) {
    return fetch(request);
  }
  
  // Default handling
  return fetch(request);
}
```

## Cost Optimization

### Resource Allocation

```yaml
# Resource recommendations by service
services:
  web:
    cpu: 0.5-1
    memory: 256Mi-512Mi
    minInstances: 1
    maxInstances: 50
    
  api:
    cpu: 1-2
    memory: 1Gi-2Gi
    minInstances: 2
    maxInstances: 100
    
  background:
    cpu: 0.5-1
    memory: 512Mi-1Gi
    minInstances: 1
    maxInstances: 10
```

### Cost Monitoring

```sql
-- BigQuery cost analysis query
SELECT
  service_name,
  DATE(usage_time) as usage_date,
  SUM(cost) as daily_cost,
  SUM(cpu_seconds) as cpu_usage,
  SUM(memory_gb_seconds) as memory_usage,
  COUNT(DISTINCT revision_name) as active_revisions
FROM
  `project.billing.cloud_run_usage`
WHERE
  usage_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
GROUP BY
  service_name, usage_date
ORDER BY
  usage_date DESC, daily_cost DESC;
```