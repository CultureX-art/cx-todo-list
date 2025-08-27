# Stage 8: Performance & Security Hardening

## Overview

Stage 8 focuses on optimization and security hardening after core functionality is complete. This stage ensures production readiness through systematic performance analysis and security controls.

## Performance Optimization Framework

### Performance Profiling Tools

#### Node.js Application Profiling

```javascript
// scripts/performance/profiler.js
const clinic = require("@clinic/doctor");
const autocannon = require("autocannon");

class PerformanceProfiler {
  constructor(appPath, port = 3000) {
    this.appPath = appPath;
    this.port = port;
    this.baseUrl = `http://localhost:${port}`;
  }

  async profileCPU() {
    console.log("Starting CPU profiling...");

    return new Promise((resolve, reject) => {
      const doctor = clinic.doctor({
        dest: "./performance-reports/cpu",
      });

      doctor.spawn(["node", this.appPath], (err, proc) => {
        if (err) return reject(err);

        // Wait for app to start
        setTimeout(async () => {
          try {
            await this.runLoadTest("cpu-profile");
            proc.kill("SIGINT");
            resolve();
          } catch (error) {
            reject(error);
          }
        }, 2000);
      });
    });
  }

  async profileMemory() {
    console.log("Starting memory profiling...");

    const heapdump = require("heapdump");
    const startTime = Date.now();

    // Take baseline heap snapshot
    heapdump.writeSnapshot(
      `./performance-reports/memory/baseline-${startTime}.heapsnapshot`,
    );

    // Run load test
    await this.runLoadTest("memory-profile");

    // Take post-load heap snapshot
    heapdump.writeSnapshot(
      `./performance-reports/memory/postload-${startTime}.heapsnapshot`,
    );

    console.log("Memory snapshots saved to ./performance-reports/memory/");
  }

  async runLoadTest(testName) {
    const instance = autocannon({
      url: this.baseUrl,
      connections: 100,
      duration: 30,
      requests: [
        {
          method: "GET",
          path: "/health",
        },
        {
          method: "GET",
          path: "/users/test-user/items",
        },
      ],
    });

    return new Promise((resolve, reject) => {
      autocannon.track(instance);

      instance.on("done", (result) => {
        console.log(`Load test ${testName} completed:`);
        console.log(`RPS: ${result.requests.average}`);
        console.log(`Latency P95: ${result.latency.p95}ms`);
        resolve(result);
      });

      instance.on("error", reject);
    });
  }
}

module.exports = PerformanceProfiler;
```

#### Database Query Analysis

```typescript
// scripts/performance/database-analyzer.ts
import { Pool } from "pg";

export class DatabaseAnalyzer {
  constructor(private pool: Pool) {}

  async analyzeSlowQueries(): Promise<SlowQuery[]> {
    const result = await this.pool.query(`
      SELECT 
        query,
        calls,
        total_time,
        mean_time,
        rows,
        100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
      FROM pg_stat_statements 
      WHERE calls > 10
      ORDER BY mean_time DESC 
      LIMIT 20;
    `);

    return result.rows.map((row) => ({
      query: row.query,
      avgExecutionTime: parseFloat(row.mean_time),
      callCount: parseInt(row.calls),
      cacheHitRatio: parseFloat(row.hit_percent) || 0,
    }));
  }

  async analyzeIndexUsage(): Promise<IndexUsage[]> {
    const result = await this.pool.query(`
      SELECT
        schemaname,
        tablename,
        indexname,
        idx_tup_read,
        idx_tup_fetch,
        idx_scan
      FROM pg_stat_user_indexes
      WHERE idx_scan = 0
      ORDER BY schemaname, tablename;
    `);

    return result.rows;
  }

  async generateOptimizationReport(): Promise<string> {
    const slowQueries = await this.analyzeSlowQueries();
    const unusedIndexes = await this.analyzeIndexUsage();

    return `
# Database Performance Report

## Slow Queries (>10 calls)
${slowQueries
  .map(
    (q) => `
- **Query**: \`${q.query.substring(0, 100)}...\`
- **Avg Time**: ${q.avgExecutionTime.toFixed(2)}ms
- **Call Count**: ${q.callCount}
- **Cache Hit**: ${q.cacheHitRatio.toFixed(1)}%
`,
  )
  .join("\n")}

## Unused Indexes
${unusedIndexes
  .map(
    (idx) => `
- **Table**: ${idx.tablename}
- **Index**: ${idx.indexname}
- **Scan Count**: ${idx.idx_scan}
`,
  )
  .join("\n")}

## Recommendations
${this.generateRecommendations(slowQueries, unusedIndexes)}
    `;
  }

  private generateRecommendations(
    slowQueries: SlowQuery[],
    unusedIndexes: any[],
  ): string {
    const recommendations: string[] = [];

    if (slowQueries.length > 0) {
      recommendations.push(
        "- Review and optimize slow queries with EXPLAIN ANALYZE",
      );
      recommendations.push(
        "- Consider adding indexes for frequently queried columns",
      );
    }

    if (unusedIndexes.length > 0) {
      recommendations.push(
        "- Remove unused indexes to improve write performance",
      );
    }

    return recommendations.join("\n");
  }
}

interface SlowQuery {
  query: string;
  avgExecutionTime: number;
  callCount: number;
  cacheHitRatio: number;
}
```

### Performance Optimization Checklist

#### Application Layer

- [ ] **Bundle Analysis**: Analyze and minimize JavaScript bundle size

  ```bash
  npm run build:analyze
  webpack-bundle-analyzer dist/static/js/*.js
  ```

- [ ] **Code Splitting**: Implement route-based and component-based code splitting
- [ ] **Lazy Loading**: Implement lazy loading for non-critical components
- [ ] **Caching Strategy**: Implement appropriate caching headers and service worker
- [ ] **Image Optimization**: Compress and serve images in modern formats (WebP, AVIF)

#### API Performance

- [ ] **Response Compression**: Enable gzip/brotli compression
- [ ] **Connection Pooling**: Optimize database connection pool settings
- [ ] **Query Optimization**: Review and optimize all database queries
- [ ] **Pagination**: Implement cursor-based pagination for large datasets
- [ ] **Rate Limiting**: Implement rate limiting to prevent abuse

#### Infrastructure

- [ ] **CDN Setup**: Configure CDN for static assets
- [ ] **Load Balancing**: Configure load balancer with health checks
- [ ] **Auto-scaling**: Set up horizontal pod autoscaling
- [ ] **Monitoring**: Implement APM and alerting

## Security Hardening Framework

### Security Scanning Tools

#### SAST (Static Application Security Testing)

```yaml
# .github/workflows/security-scan.yml
name: Security Scan

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Run Semgrep
        uses: returntocorp/semgrep-action@v1
        with:
          config: >-
            p/security-audit
            p/secrets
            p/owasp-top-ten

      - name: Run CodeQL
        uses: github/codeql-action/init@v2
        with:
          languages: javascript, typescript

      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v2

  dependency-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Run npm audit
        run: npm audit --audit-level=high

      - name: Run Snyk
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

#### Container Security Scanning

```dockerfile
# Use specific, minimal base image
FROM node:18-alpine3.17

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodeuser -u 1001

# Install security updates
RUN apk update && apk upgrade

# Copy package files
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy application files
COPY --chown=nodeuser:nodejs . .

# Remove unnecessary packages
RUN apk del apk-tools

# Run as non-root user
USER nodeuser

EXPOSE 3000

# Use specific command
CMD ["node", "dist/app.js"]
```

### Security Controls Implementation

#### Input Validation & Sanitization

```typescript
// src/middleware/validation.ts
import Joi from "joi";
import DOMPurify from "isomorphic-dompurify";
import { rateLimit } from "express-rate-limit";

export const validateInput = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        error: "Validation failed",
        details: error.details.map((d) => d.message),
      });
    }

    req.body = value;
    next();
  };
};

export const sanitizeHtml = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  next();
};

function sanitizeObject(obj: any): any {
  if (typeof obj === "string") {
    return DOMPurify.sanitize(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  if (obj && typeof obj === "object") {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }

  return obj;
}

// Rate limiting
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP",
  standardHeaders: true,
  legacyHeaders: false,
});
```

#### Authentication & Authorization

```typescript
// src/middleware/auth.ts
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { randomBytes, scrypt } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

export class SecurityService {
  private readonly jwtSecret = process.env.JWT_SECRET!;
  private readonly saltRounds = 12;

  async hashPassword(password: string): Promise<string> {
    // Use bcrypt for password hashing
    return bcrypt.hash(password, this.saltRounds);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  generateSecureToken(): string {
    return randomBytes(32).toString("hex");
  }

  async generateApiKey(userId: string): Promise<string> {
    const salt = randomBytes(16);
    const key = (await scryptAsync(userId, salt, 32)) as Buffer;
    return `${salt.toString("hex")}.${key.toString("hex")}`;
  }

  generateJWT(payload: object, expiresIn = "1h"): string {
    return jwt.sign(payload, this.jwtSecret, { expiresIn });
  }

  verifyJWT(token: string): any {
    return jwt.verify(token, this.jwtSecret);
  }
}

// Middleware for JWT authentication
export const authenticateJWT = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  try {
    const user = new SecurityService().verifyJWT(token);
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};
```

#### Secure Headers Configuration

```typescript
// src/middleware/security.ts
import helmet from "helmet";
import { Request, Response, NextFunction } from "express";

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});

export const securityLogger = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Log security events
  if (req.path.includes("admin") || req.path.includes("auth")) {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        type: "SECURITY_EVENT",
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        path: req.path,
        method: req.method,
        correlationId: req.headers["correlation-id"],
      }),
    );
  }
  next();
};
```

### Security Hardening Checklist

#### Application Security

- [ ] **Input Validation**: Validate all user inputs with Joi/Yup schemas
- [ ] **Output Encoding**: Encode all outputs to prevent XSS
- [ ] **SQL Injection Prevention**: Use parameterized queries/ORM
- [ ] **CSRF Protection**: Implement CSRF tokens for state-changing operations
- [ ] **Authentication**: Strong password policies and MFA
- [ ] **Authorization**: Role-based access control (RBAC)
- [ ] **Session Management**: Secure session handling and timeout

#### Infrastructure Security

- [ ] **HTTPS Everywhere**: Enforce HTTPS with HSTS headers
- [ ] **Security Headers**: Implement comprehensive security headers
- [ ] **Secrets Management**: Use secure secret management (Vault, AWS Secrets)
- [ ] **Container Security**: Scan containers and use minimal base images
- [ ] **Network Security**: Configure firewalls and network segmentation
- [ ] **Logging & Monitoring**: Implement security event logging
- [ ] **Backup Security**: Encrypt backups and test restore procedures

#### Data Protection

- [ ] **Data Encryption**: Encrypt sensitive data at rest and in transit
- [ ] **PII Handling**: Implement data minimization and retention policies
- [ ] **Database Security**: Secure database access and audit logs
- [ ] **API Security**: Rate limiting, authentication, and input validation
- [ ] **File Upload Security**: Validate file types and scan for malware

## Optimization Scripts

### Package.json Scripts

```json
{
  "scripts": {
    "perf:profile": "node scripts/performance/profiler.js",
    "perf:memory": "node --inspect scripts/performance/memory-profiler.js",
    "perf:load-test": "artillery run tests/load/basic-load.yml",
    "perf:db-analyze": "ts-node scripts/performance/database-analyzer.ts",
    "security:audit": "npm audit --audit-level=high",
    "security:scan": "semgrep --config=p/security-audit src/",
    "security:container": "docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy image",
    "optimize:bundle": "webpack-bundle-analyzer dist/static/js/*.js",
    "optimize:images": "imagemin src/assets/images/* --out-dir=dist/assets/images",
    "hardening:check": "npm run security:audit && npm run security:scan"
  }
}
```

### Automated Performance Monitoring

```typescript
// src/monitoring/performance.ts
import { performance, PerformanceObserver } from "perf_hooks";

export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();

  constructor() {
    this.setupObservers();
  }

  private setupObservers() {
    const obs = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === "measure") {
          this.recordMetric(entry.name, entry.duration);
        }
      }
    });

    obs.observe({ entryTypes: ["measure"] });
  }

  startTimer(name: string): string {
    const markName = `${name}-start`;
    performance.mark(markName);
    return markName;
  }

  endTimer(name: string, startMark: string) {
    const endMark = `${name}-end`;
    performance.mark(endMark);
    performance.measure(name, startMark, endMark);
  }

  private recordMetric(name: string, duration: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(duration);
  }

  getMetricsSummary(): Record<string, MetricSummary> {
    const summary: Record<string, MetricSummary> = {};

    for (const [name, values] of this.metrics) {
      summary[name] = {
        count: values.length,
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        p95: this.percentile(values, 0.95),
      };
    }

    return summary;
  }

  private percentile(values: number[], p: number): number {
    const sorted = values.sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[index];
  }
}

interface MetricSummary {
  count: number;
  avg: number;
  min: number;
  max: number;
  p95: number;
}
```

## Success Criteria for Stage 8

### Performance Targets

- **Response Time**: P95 < 500ms for all API endpoints
- **Throughput**: Handle >100 RPS under normal load
- **Memory Usage**: <512MB heap size under normal operation
- **Bundle Size**: <500KB gzipped for main JavaScript bundle
- **Database**: <100ms P95 query response time

### Security Requirements

- **Zero Critical Vulnerabilities**: No critical security issues in dependencies
- **Security Headers**: All security headers properly configured
- **Authentication**: Strong authentication with session management
- **Input Validation**: 100% of user inputs validated and sanitized
- **Audit Trail**: All security events properly logged

### Monitoring & Alerting

- **Uptime**: 99.9% availability target
- **Error Rate**: <1% 5xx error rate
- **Response Time Alerts**: Alert if P95 > 1s for 5 minutes
- **Security Alerts**: Real-time alerts for security events
- **Resource Alerts**: Memory/CPU usage alerts

This framework ensures systematic optimization and security hardening while maintaining measurable success criteria for production readiness.
