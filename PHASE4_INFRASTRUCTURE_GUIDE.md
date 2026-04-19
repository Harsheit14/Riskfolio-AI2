# PHASE 4: INFRASTRUCTURE & SCALABILITY - IMPLEMENTATION GUIDE

## Overview

**Phase 4 marks the transition from application-level production-readiness to infrastructure-scale deployment-ready architecture.**

This phase upgrades the Riskfolio-AI backend from a single-instance, monolithic application to a distributed, containerized system capable of horizontal scaling, multi-instance deployment, and cloud-native orchestration.

---

## 📊 What's New in Phase 4

### 1. **Redis Caching (Distributed Cache)**
- **Problem Solved:** In-memory cache doesn't work across multiple backend instances
- **Solution:** Redis with ioredis client library
- **Key Features:**
  - Connection pooling with automatic reconnection
  - TTL-based expiration (60-second default)
  - Get-or-set pattern for cache warming
  - Graceful degradation if Redis unavailable
  - Batch operations support

**Files:**
- `server/services/redisClient.js` (260 lines)
- Cache key format: `price:<coinId>`, `history:<coinId>-<days>`
- TTL: 60 seconds for price data

### 2. **Database Transactions (ACID Compliance)**
- **Problem Solved:** Race conditions during BUY/SELL operations
- **Solution:** PostgreSQL transactions with row-level locking
- **Key Features:**
  - SELECT FOR UPDATE locking
  - Atomic commit/rollback
  - Automatic error recovery
  - Per-operation rollback handling

**Files:**
- `server/services/transactionService.js` (250 lines)
- Prevents overselling via database-level locking
- Pattern: `BEGIN → SELECT FOR UPDATE → Validate → INSERT → COMMIT`

### 3. **Health Checks (Kubernetes-Ready)**
- **Problem Solved:** No visibility into service health for orchestration
- **Solution:** Multi-endpoint health check system
- **Key Features:**
  - Liveness probe (fast, for restarting crashed processes)
  - Readiness probe (thorough, for load balancing)
  - Detailed health status endpoint
  - Dependency health tracking

**Files:**
- `server/controllers/healthController.js` (150 lines)
- Endpoints:
  - `GET /health` → Simple 200 response
  - `GET /health/live` → Kubernetes liveness probe
  - `GET /health/ready` → Full dependency check (DB + Redis)
  - `GET /health/detailed` → Comprehensive status with metrics

### 4. **Observability & Metrics**
- **Problem Solved:** No insight into request patterns, performance, or system bottlenecks
- **Solution:** Metrics middleware + Prometheus-compatible export
- **Key Features:**
  - Per-endpoint request tracking
  - Response time aggregation
  - Cache hit/miss rates
  - Error counts by type
  - Prometheus format export

**Files:**
- `server/middleware/metricsMiddleware.js` (200 lines)
- `server/controllers/metricsController.js` (50 lines)
- Endpoints:
  - `GET /metrics` → JSON format for dashboards
  - `GET /metrics/prometheus` → Prometheus scrape format

### 5. **Environment Configuration**
- **Problem Solved:** Configuration scattered, no validation
- **Solution:** Centralized environment management with validation
- **Key Features:**
  - Required variable checking in production
  - Type-safe configuration access
  - Multi-environment support (dev, prod, test)
  - Startup validation

**Files:**
- `server/config/environment.js` (200 lines)
- Validates: PORT, DATABASE_URL, REDIS_URL, JWT_SECRET

### 6. **Containerization (Docker)**
- **Problem Solved:** "Works on my machine" syndrome, deployment inconsistency
- **Solution:** Docker containers with multi-stage builds
- **Key Features:**
  - Alpine Linux base (150MB footprint)
  - Multi-stage build optimization
  - Non-root user execution
  - Health check integration
  - dumb-init for signal handling

**Files:**
- `server/Dockerfile` (40 lines)
- `docker-compose.yml` (150 lines)
- `server/.dockerignore` (15 lines)

### 7. **Database Migrations**
- **Problem Solved:** Schema changes not version-controlled, difficult to rollback
- **Solution:** node-pg-migrate versioned migrations
- **Key Features:**
  - Version-controlled schema changes
  - Reversible migrations (up/down)
  - Transaction-safe execution
  - Migration status tracking

**Files:**
- `server/migrations/001_initial_schema.js` (120 lines)
- `server/migrations.config.js` (35 lines)
- Scripts: migrate, migrate:down, migrate:redo, migrate:status

---

## 🚀 Quick Start - Docker Deployment

### Option 1: Docker Compose (Recommended for Local Development)

```bash
# Navigate to project root
cd /Users/harsheitbharti/Development/Riskfolio-AI/Riskfolio-AI

# Start entire stack (PostgreSQL + Redis + Backend + Frontend)
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down

# Clean up volumes (data reset)
docker-compose down -v
```

### Option 2: Manual Docker Build

```bash
# Build backend image
cd server
docker build -t riskfolio-ai-backend:latest .

# Run with Docker networking
docker run -d \
  --name riskfolio-backend \
  -p 5000:5000 \
  -e DATABASE_URL="postgres://user:pass@postgres:5432/Crypto_db" \
  -e REDIS_URL="redis://redis:6379" \
  -e JWT_SECRET="your-secret-key" \
  --network riskfolio-network \
  riskfolio-ai-backend:latest
```

### Option 3: Kubernetes Deployment

```bash
# Create deployment
kubectl apply -f k8s/deployment.yaml

# Check health
kubectl get pods
kubectl port-forward svc/riskfolio-backend 5000:5000
curl http://localhost:5000/health
```

---

## 🔧 Configuration

### Environment Variables

**Required in Production:**
```env
# Server
PORT=5000
NODE_ENV=production

# Database
DATABASE_URL=postgres://user:password@localhost:5432/Crypto_db
DB_USER=postgres
DB_PASSWORD=password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=Crypto_db

# Redis
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-super-secret-jwt-key-minimum-32-chars

# Frontend
FRONTEND_URL=http://localhost:5173
```

**Optional:**
```env
# Logging
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Using `config/environment.js`

```javascript
import config from "./config/environment.js";

// Type-safe access
const port = config.server.port;        // 5000
const dbUrl = config.database.url;      // postgres://...
const redisUrl = config.redis.url;      // redis://...
const jwtSecret = config.jwt.secret;    // your-secret-key

// Multi-environment support
if (config.isProduction) {
  // Production-only logic
}
```

---

## 💾 Database Migrations

### Running Migrations

```bash
# Run all pending migrations
npm run migrate

# Check migration status
npm run migrate:status

# Rollback last migration
npm run migrate:down

# Redo last migration
npm run migrate:redo
```

### Creating New Migrations

```bash
# Using node-pg-migrate CLI
npx node-pg-migrate create add_new_column

# Manual format: {number}_{description}.js
# Example: 002_add_user_preferences.js
```

**Migration Structure:**
```javascript
export up = (pgm) => {
  // Migration logic (applied)
  pgm.createTable("new_table", { ... });
};

export down = (pgm) => {
  // Rollback logic (reverse)
  pgm.dropTable("new_table");
};
```

---

## 🏥 Health Checks

### Testing Health Endpoints

```bash
# Liveness probe (fast check)
curl http://localhost:5000/health/live
# Response: { status: "OK" }

# Readiness probe (full check)
curl http://localhost:5000/health/ready
# Response: { status: "OK", database: "OK", redis: "OK" }

# Detailed health status
curl http://localhost:5000/health/detailed
# Response: { 
#   status: "OK",
#   timestamp: "2024-01-15T10:30:00Z",
#   uptime: 3600,
#   database: { status: "OK", responseTime: 12 },
#   redis: { status: "OK", responseTime: 5 },
#   memory: { heapUsed: 45, heapTotal: 100 }
# }
```

### Kubernetes Probe Configuration

```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 5000
  initialDelaySeconds: 10
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health/ready
    port: 5000
  initialDelaySeconds: 5
  periodSeconds: 5
```

---

## 📊 Metrics & Observability

### Accessing Metrics

```bash
# JSON format (for dashboards)
curl http://localhost:5000/metrics

# Response:
{
  "totalRequests": 1500,
  "totalErrorCount": 3,
  "averageResponseTime": 45.2,
  "cacheHitRate": 0.75,
  "endpoints": {
    "GET /api/transactions": { requests: 500, avgTime: 50 },
    "GET /api/portfolio": { requests: 400, avgTime: 40 }
  }
}

# Prometheus format (for Prometheus server)
curl http://localhost:5000/metrics/prometheus

# Response:
# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total 1500

# HELP http_response_time_ms Response time in milliseconds
# TYPE http_response_time_ms summary
http_response_time_ms 45.2

# HELP cache_hit_rate Cache hit rate
# TYPE cache_hit_rate gauge
cache_hit_rate 0.75
```

### Prometheus Configuration

```yaml
# prometheus.yml
scrape_configs:
  - job_name: "riskfolio-backend"
    static_configs:
      - targets: ["localhost:5000"]
    metrics_path: "/metrics/prometheus"
    scrape_interval: 15s
```

### Grafana Dashboard Setup

1. Add Prometheus as data source
2. Create dashboards with metrics:
   - Request rate: `increase(http_requests_total[1m])`
   - Response time: `histogram_quantile(0.95, http_response_time_ms)`
   - Cache hit rate: `cache_hit_rate`
   - Error rate: `increase(http_errors_total[1m])`

---

## 🔄 Caching Strategy

### Redis Integration in Price Service

**Cache Key Format:**
```javascript
price:<coinId>              // Current price cache
history:<coinId>-<days>     // Historical price cache
```

**Cache Flow:**
```
Request → Check Redis (TTL: 60s)
  ↓ (Miss)
Fetch from CoinGecko API
  ↓
Store in Redis (with TTL)
  ↓
Return to client
```

**Graceful Degradation:**
```javascript
try {
  const cached = await redisClient.get(cacheKey);
  if (cached) return JSON.parse(cached);
} catch (redisError) {
  // Redis down? Fetch fresh data
  console.warn("Redis unavailable, fetching fresh data");
}
```

### Cache Warming Pattern

```javascript
// Get-or-set pattern
const data = await redisClient.getOrSet(
  cacheKey,
  async () => {
    // Fetch fresh data if not in cache
    return await fetchFromAPI();
  },
  60  // TTL in seconds
);
```

---

## 🔒 Transaction-Safe Operations

### BUY Transaction Pattern

```javascript
import * as transactionService from "./services/transactionService.js";

// Wrap in database transaction
await transactionService.createBuyTransaction({
  userId: 123,
  assetId: 1,
  quantity: 0.5,
  priceAtTransaction: 45000,
  callback: async (client) => {
    // All DB operations use this client
    // Everything commits together or rolls back together
  }
});
```

### SELL Transaction Pattern

```javascript
await transactionService.createSellTransaction({
  userId: 123,
  assetId: 1,
  quantity: 0.3,
  priceAtTransaction: 46000,
  callback: async (client) => {
    // Validation: Check holdings with SELECT FOR UPDATE
    // Prevents race conditions at database level
  }
});
```

### Race Condition Prevention

```sql
-- Inside transaction:
BEGIN;
SELECT SUM(CASE WHEN type='BUY' THEN qty ELSE -qty END) 
FROM transactions 
WHERE user_id = 123 AND asset_id = 1 
FOR UPDATE;  -- Row-level lock acquired

-- Check: available >= selling quantity
-- INSERT INTO transactions (...)
-- COMMIT;  (or ROLLBACK on error)
```

---

## 📦 Files & Architecture

### New Files Created (Phase 4)

```
server/
├── services/
│   ├── redisClient.js           # Redis caching service
│   └── transactionService.js    # Transaction-safe operations
├── middleware/
│   └── metricsMiddleware.js     # Observability middleware
├── controllers/
│   ├── healthController.js      # Health check endpoints
│   └── metricsController.js     # Metrics endpoints
├── routes/
│   ├── healthRoutes.js          # Health routes
│   └── metricsRoutes.js         # Metrics routes
├── config/
│   └── environment.js           # Centralized configuration
├── migrations/
│   └── 001_initial_schema.js    # Database schema migration
├── Dockerfile                   # Multi-stage Docker image
├── .dockerignore                # Docker build optimization
└── migrations.config.js         # Migration configuration

docker-compose.yml              # Service orchestration
```

### Modified Files

```
server/
├── index.js                     # Added Redis, metrics, health routes
├── services/priceService.js     # Integrated Redis caching
└── package.json                 # Added ioredis, node-pg-migrate
```

---

## 🛠️ Troubleshooting

### Redis Connection Issues

```bash
# Check Redis status
redis-cli ping
# Should return: PONG

# Check Redis in Docker
docker exec riskfolio-redis redis-cli ping

# View Redis logs
docker logs riskfolio-redis
```

### Database Connection Issues

```bash
# Check PostgreSQL status
psql -U postgres -d Crypto_db -c "SELECT 1;"

# View database logs
docker logs riskfolio-postgres

# Check migrations status
npm run migrate:status
```

### Docker Compose Issues

```bash
# Rebuild images
docker-compose build --no-cache

# View all service logs
docker-compose logs -f

# Check service health
docker-compose ps

# Restart specific service
docker-compose restart backend
```

---

## 📈 Performance Tuning

### Redis Optimization

```javascript
// Connection pooling (automatic in ioredis)
const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  enableOfflineQueue: true,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});
```

### Database Optimization

```sql
-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM transactions WHERE user_id = 123;

-- Check index usage
SELECT * FROM pg_stat_user_indexes WHERE schemaname = 'public';

-- Vacuum to maintain performance
VACUUM ANALYZE transactions;
```

### Metrics-Based Tuning

```bash
# Monitor response times
curl http://localhost:5000/metrics | jq '.averageResponseTime'

# Check cache hit rate
curl http://localhost:5000/metrics | jq '.cacheHitRate'

# Identify slow endpoints
curl http://localhost:5000/metrics | jq '.endpoints' | sort
```

---

## 🔐 Security Considerations

1. **Environment Variables:** Never commit `.env` files
2. **Redis Auth:** Use password protection in production
3. **Database SSL:** Enable SSL for database connections
4. **Rate Limiting:** Configured in 3 tiers (global, auth, API)
5. **Input Validation:** Joi schema validation on all inputs
6. **Helmet.js:** Security headers enabled

---

## ✅ Deployment Checklist

- [ ] All environment variables set correctly
- [ ] Database migrations run successfully (`npm run migrate`)
- [ ] Redis connection tested and working
- [ ] Health checks passing (`curl http://localhost:5000/health/ready`)
- [ ] Metrics endpoint accessible (`curl http://localhost:5000/metrics`)
- [ ] Docker images built successfully
- [ ] Docker Compose services healthy and connected
- [ ] Logs reviewed for errors
- [ ] Rate limiting configured appropriately
- [ ] SSL/TLS certificates ready for production
- [ ] Backup strategy in place (database + Redis)
- [ ] Monitoring alerts configured

---

## 📚 Additional Resources

- **node-pg-migrate:** https://github.com/salsita/node-pg-migrate
- **ioredis:** https://github.com/luin/ioredis
- **Docker Best Practices:** https://docs.docker.com/develop/dev-best-practices/
- **Kubernetes Health Checks:** https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- **Prometheus Metrics:** https://prometheus.io/docs/concepts/metric_types/

---

## Summary

Phase 4 transforms Riskfolio-AI from a single-instance application into a production-grade, cloud-ready infrastructure. With Redis caching, database transactions, health checks, observability, Docker containerization, and database migrations, the system is now ready for:

- ✅ Horizontal scaling (multiple backend instances)
- ✅ Kubernetes orchestration
- ✅ Multi-datacenter deployment
- ✅ Real-time monitoring and observability
- ✅ Zero-downtime deployments
- ✅ Disaster recovery and rollback

**Next Steps:**
1. Run `docker-compose up` to verify the full stack
2. Test all health endpoints
3. Review metrics for baseline performance
4. Configure monitoring and alerting
5. Plan cloud deployment (AWS/GCP/Azure)
