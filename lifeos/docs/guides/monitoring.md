# Monitoring & Observability Guide

## Overview

Life OS implements comprehensive monitoring across application performance, business metrics, and system health using open-source solutions for cost efficiency.

## Monitoring Stack

```
┌─────────────────────────────────────────────────────────────┐
│                     Grafana Dashboard                        │
│              (Metrics, Logs, Traces, Alerts)                 │
└─────────────────┬───────────────┬───────────────────────────┘
                  │               │
    ┌─────────────▼────┐   ┌─────▼──────┐   ┌────────────────┐
    │   Prometheus     │   │    Loki    │   │     Tempo      │
    │   (Metrics)      │   │   (Logs)   │   │   (Traces)     │
    └─────────┬────────┘   └─────┬──────┘   └───────┬────────┘
              │                  │                    │
    ┌─────────▼────────┐   ┌─────▼──────┐   ┌───────▼────────┐
    │  Node Exporter   │   │  Promtail  │   │  OpenTelemetry │
    │  App Metrics     │   │  Fluentd   │   │    Jaeger      │
    └──────────────────┘   └────────────┘   └────────────────┘
              │                  │                    │
    └─────────┴──────────────────┴────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │    Application     │
                    │  - Express/Fastify │
                    │  - React          │
                    │  - PostgreSQL     │
                    └────────────────────┘
```

## Application Metrics

### Custom Metrics Collection

```typescript
// metrics/prometheus.ts
import { register, Counter, Histogram, Gauge, Summary } from 'prom-client';

// Business Metrics
export const metrics = {
  // Task metrics
  tasksCreated: new Counter({
    name: 'lifeos_tasks_created_total',
    help: 'Total number of tasks created',
    labelNames: ['source', 'user_type'],
  }),
  
  taskCompletionTime: new Histogram({
    name: 'lifeos_task_completion_duration_seconds',
    help: 'Time taken to complete tasks',
    labelNames: ['priority', 'project_type'],
    buckets: [300, 900, 1800, 3600, 7200, 14400, 28800, 86400], // 5m to 1d
  }),
  
  activeTasksGauge: new Gauge({
    name: 'lifeos_active_tasks',
    help: 'Number of active tasks',
    labelNames: ['status', 'priority'],
  }),
  
  // Voice command metrics
  voiceCommands: new Counter({
    name: 'lifeos_voice_commands_total',
    help: 'Total voice commands processed',
    labelNames: ['language', 'action', 'status'],
  }),
  
  voiceProcessingTime: new Summary({
    name: 'lifeos_voice_processing_duration_seconds',
    help: 'Time to process voice commands',
    labelNames: ['language'],
    percentiles: [0.5, 0.9, 0.95, 0.99],
  }),
  
  voiceAccuracy: new Gauge({
    name: 'lifeos_voice_accuracy_ratio',
    help: 'Voice recognition accuracy',
    labelNames: ['language'],
  }),
  
  // Financial metrics
  transactionsProcessed: new Counter({
    name: 'lifeos_transactions_processed_total',
    help: 'Total transactions processed',
    labelNames: ['type', 'source', 'status'],
  }),
  
  transactionVolume: new Counter({
    name: 'lifeos_transaction_volume_dollars',
    help: 'Total transaction volume in dollars',
    labelNames: ['type', 'category'],
  }),
  
  // API metrics
  httpRequestDuration: new Histogram({
    name: 'lifeos_http_request_duration_seconds',
    help: 'Duration of HTTP requests',
    labelNames: ['method', 'route', 'status'],
    buckets: [0.001, 0.01, 0.1, 0.5, 1, 2, 5],
  }),
  
  httpRequestTotal: new Counter({
    name: 'lifeos_http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'route', 'status'],
  }),
  
  // Database metrics
  dbQueryDuration: new Histogram({
    name: 'lifeos_db_query_duration_seconds',
    help: 'Database query duration',
    labelNames: ['operation', 'table'],
    buckets: [0.001, 0.01, 0.1, 0.5, 1, 2],
  }),
  
  dbConnectionPool: new Gauge({
    name: 'lifeos_db_connection_pool_size',
    help: 'Database connection pool metrics',
    labelNames: ['state'], // active, idle, waiting
  }),
  
  // Cache metrics
  cacheHits: new Counter({
    name: 'lifeos_cache_hits_total',
    help: 'Cache hit count',
    labelNames: ['cache_name'],
  }),
  
  cacheMisses: new Counter({
    name: 'lifeos_cache_misses_total',
    help: 'Cache miss count',
    labelNames: ['cache_name'],
  }),
};

// Register all metrics
Object.values(metrics).forEach(metric => register.registerMetric(metric));
```