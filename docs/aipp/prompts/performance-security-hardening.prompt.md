# Performance & Security Hardening Stage Prompt

## ROLE
Senior performance engineer and security architect conducting comprehensive code quality audit, performance optimization, and scalability assessment.

## OBJECTIVE
Analyze the fully tested implementation for performance bottlenecks, security vulnerabilities, scalability issues, and code inefficiencies. Optimize where possible without breaking tests, and raise flags for issues that cannot be resolved without architectural changes.

## STACK CONSTRAINTS (NON-NEGOTIABLE)
- **Performance SLAs:** P50 < 200ms, P95 < 500ms, P99 < 1000ms
- **Scalability:** Must support horizontal scaling (stateless)
- **Resource Limits:** Memory < 512MB per instance, CPU < 1 core baseline
- **Logging:** Structured JSON logs with correlation IDs, no PII
- **Security:** OWASP Top 10 compliance, no secrets in code

## INPUTS
Paste the following from previous stages:
- **Stage 7 Output:** Complete implementation passing all tests
- **Performance Requirements:** SLA documentation and latency budgets
- **Scale Requirements:** Expected load and growth projections
- **Security Requirements:** Compliance and security standards

## CRITICAL: ITERATION LIMIT & TEST PROTECTION

**MANDATORY:** 
- Maximum of 5 optimization iterations to prevent infinite loops
- **ALL UNIT AND INTEGRATION TESTS MUST CONTINUE TO PASS** after each optimization
- If ANY test fails due to optimization, IMMEDIATELY ROLLBACK and try alternative approach
- If issues cannot be resolved within 5 iterations while maintaining test integrity, raise appropriate flags for human intervention

### Test Validation After Each Optimization

**REQUIRED AFTER EVERY OPTIMIZATION CHANGE:**

```bash
# 1. MANDATORY: Run full test suite
npm run test:all

# 2. Check exit codes
UNIT_EXIT=$?
if [ $UNIT_EXIT -ne 0 ]; then
  echo "❌ TESTS FAILED - ROLLBACK REQUIRED"
  git checkout -- . # Rollback changes
  exit 1
fi

# 3. Verify coverage hasn't decreased
npm run test:coverage
# Must maintain ≥90% coverage

# 4. Check TypeScript compilation
npm run type-check

# Only proceed if ALL checks pass
echo "✅ All tests pass - optimization validated"
```

## PERFORMANCE & SECURITY AUDIT PROCESS

### Phase 1: Comprehensive Code Quality Audit

#### Audit Checklist

```markdown
## Code Quality Audit Report

### 1. Logging Audit
- [ ] **Structured Logging:** All logs in JSON format
- [ ] **Correlation IDs:** Propagated through all layers
- [ ] **Log Levels:** Appropriate use of debug/info/warn/error
- [ ] **No PII:** No sensitive data in logs
- [ ] **Performance Impact:** Logging doesn't impact performance

### 2. Scalability Audit
- [ ] **Stateless Design:** No local state, sessions in external store
- [ ] **Database Connections:** Connection pooling configured
- [ ] **Cache Strategy:** Distributed cache for horizontal scaling
- [ ] **File Storage:** External storage (S3) not local filesystem
- [ ] **Message Queues:** Async operations use queues

### 3. Performance Audit
- [ ] **Database Queries:** Optimized with proper indexes
- [ ] **N+1 Queries:** Eliminated with eager loading
- [ ] **Memory Leaks:** No unbounded growth
- [ ] **CPU Usage:** No blocking operations in event loop
- [ ] **Response Times:** Meeting documented SLAs

### 4. Security Audit
- [ ] **Input Validation:** All inputs validated
- [ ] **SQL Injection:** Parameterized queries only
- [ ] **XSS Prevention:** Output encoding implemented
- [ ] **Authentication:** Proper auth checks
- [ ] **Rate Limiting:** DDoS protection in place

### 5. Code Efficiency Audit
- [ ] **Dead Code:** No unused code or imports
- [ ] **Duplicate Code:** No significant duplication
- [ ] **Complex Functions:** Cyclomatic complexity < 10
- [ ] **Error Handling:** Consistent error handling
- [ ] **Resource Cleanup:** Proper cleanup of resources
```

### Phase 2: Performance Profiling & Analysis

#### Performance Testing Script

```typescript
// performance/profile-endpoints.ts
import autocannon from 'autocannon';
import { performance } from 'perf_hooks';

interface EndpointProfile {
  endpoint: string;
  method: string;
  documentedSLA: { p50: number; p95: number; p99: number };
  measuredLatency?: { p50: number; p95: number; p99: number };
  status: 'PASS' | 'FAIL' | 'WARNING';
}

export class PerformanceProfiler {
  private results: EndpointProfile[] = [];
  
  async profileEndpoints(): Promise<void> {
    const endpoints: EndpointProfile[] = [
      {
        endpoint: '/v1/resources',
        method: 'GET',
        documentedSLA: { p50: 120, p95: 400, p99: 800 }
      },
      {
        endpoint: '/v1/resources',
        method: 'POST',
        documentedSLA: { p50: 150, p95: 500, p99: 1000 }
      },
      {
        endpoint: '/v1/resources/:id',
        method: 'GET',
        documentedSLA: { p50: 100, p95: 300, p99: 600 }
      }
    ];

    for (const endpoint of endpoints) {
      console.log(`🔍 Profiling ${endpoint.method} ${endpoint.endpoint}...`);
      
      const result = await this.runLoadTest(endpoint);
      
      endpoint.measuredLatency = {
        p50: result.latency.p50,
        p95: result.latency.p95,
        p99: result.latency.p99
      };
      
      // Check against SLA
      if (endpoint.measuredLatency.p95 > endpoint.documentedSLA.p95) {
        endpoint.status = 'FAIL';
        console.log(`❌ FAILED SLA: P95 ${endpoint.measuredLatency.p95}ms > ${endpoint.documentedSLA.p95}ms`);
      } else if (endpoint.measuredLatency.p95 > endpoint.documentedSLA.p95 * 0.8) {
        endpoint.status = 'WARNING';
        console.log(`⚠️ WARNING: P95 ${endpoint.measuredLatency.p95}ms approaching SLA limit`);
      } else {
        endpoint.status = 'PASS';
        console.log(`✅ PASS: P95 ${endpoint.measuredLatency.p95}ms within SLA`);
      }
      
      this.results.push(endpoint);
    }
  }

  private async runLoadTest(endpoint: EndpointProfile): Promise<any> {
    return new Promise((resolve) => {
      const instance = autocannon({
        url: `http://localhost:3000${endpoint.endpoint}`,
        method: endpoint.method,
        connections: 10,
        duration: 10,
        pipelining: 1,
        bailout: 1000, // Stop if response > 1000ms
      }, (err, result) => {
        if (err) throw err;
        resolve(result);
      });
    });
  }

  generateReport(): string {
    let report = '# Performance Profile Report\n\n';
    let hasFailures = false;
    
    for (const endpoint of this.results) {
      report += `## ${endpoint.method} ${endpoint.endpoint}\n`;
      report += `**Status:** ${endpoint.status}\n`;
      report += `**Documented SLA:** P50=${endpoint.documentedSLA.p50}ms, P95=${endpoint.documentedSLA.p95}ms\n`;
      report += `**Measured:** P50=${endpoint.measuredLatency?.p50}ms, P95=${endpoint.measuredLatency?.p95}ms\n\n`;
      
      if (endpoint.status === 'FAIL') {
        hasFailures = true;
      }
    }
    
    if (hasFailures) {
      report += '\n🚩 **PERFORMANCE_SLA_VIOLATION** - Some endpoints exceed documented SLAs\n';
    }
    
    return report;
  }
}
```

### Phase 3: Optimization Implementation

#### Optimization Type 1: Query Optimization

```typescript
// ❌ BEFORE: Inefficient query causing SLA violation
export class ResourceRepository {
  async findAndCountAll(options: ListOptions): Promise<Result> {
    // Inefficient: Multiple queries
    const resources = await Resource.findAll(options);
    const count = await Resource.count();
    
    // N+1 problem
    for (const resource of resources) {
      resource.metadata = await Metadata.findByResourceId(resource.id);
    }
    
    return { resources, count };
  }
}

// ✅ AFTER: Optimized query meeting SLA
export class ResourceRepository {
  async findAndCountAll(options: ListOptions): Promise<Result> {
    // Single query with count
    const { rows: resources, count } = await Resource.findAndCountAll({
      ...options,
      // Eager load related data
      include: [{
        model: Metadata,
        as: 'metadata',
        required: false,
        attributes: ['key', 'value'] // Only needed fields
      }],
      // Use subquery for better performance
      subQuery: false,
      // Add index hints
      indexHints: [{
        type: 'USE',
        values: ['idx_resource_type_created']
      }]
    });
    
    return { resources, count };
  }
}
```

#### Optimization Type 2: Caching Strategy

```typescript
// ✅ Adding caching for horizontal scalability
import Redis from 'ioredis';

export class CachedResourceService {
  private cache: Redis;
  private readonly CACHE_TTL = 300; // 5 minutes
  
  constructor(private resourceService: ResourceService) {
    this.cache = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true
    });
  }
  
  async getResourceById(id: number, correlationId: string): Promise<Resource | null> {
    const cacheKey = `resource:${id}`;
    
    // Try cache first
    try {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        logger.debug('Cache hit', { correlationId, resourceId: id });
        return JSON.parse(cached);
      }
    } catch (error) {
      logger.warn('Cache read failed, falling back to database', { correlationId, error });
    }
    
    // Fetch from database
    const resource = await this.resourceService.getResourceById(id, correlationId);
    
    // Cache for next time (async, don't wait)
    if (resource) {
      this.cache
        .setex(cacheKey, this.CACHE_TTL, JSON.stringify(resource))
        .catch(err => logger.warn('Cache write failed', { correlationId, err }));
    }
    
    return resource;
  }
  
  async invalidateCache(id: number): Promise<void> {
    await this.cache.del(`resource:${id}`);
  }
}
```

#### Optimization Type 3: Logging Efficiency

```typescript
// ❌ BEFORE: Inefficient logging impacting performance
export class ResourceService {
  async processRequest(data: any): Promise<void> {
    console.log('Processing request:', JSON.stringify(data)); // Blocks event loop
    logger.info(`Request received for ${data.id}`); // String concatenation
    logger.debug('Full request data: ' + util.inspect(data, { depth: 10 })); // Heavy operation
  }
}

// ✅ AFTER: Efficient structured logging
export class ResourceService {
  private readonly logger = logger.child({ service: 'ResourceService' });
  
  async processRequest(data: any, correlationId: string): Promise<void> {
    // Structured logging with lazy evaluation
    this.logger.info('Processing request', {
      correlationId,
      resourceId: data.id,
      operation: 'process',
      // Don't log full objects in production
      ...(process.env.NODE_ENV === 'development' && { data })
    });
    
    // Use debug level appropriately
    if (this.logger.isDebugEnabled()) {
      this.logger.debug('Request details', {
        correlationId,
        resourceId: data.id,
        metadata: data.metadata
      });
    }
  }
}
```

#### Optimization Type 4: Memory Management

```typescript
// ❌ BEFORE: Memory leak potential
export class ResourceProcessor {
  private cache = new Map(); // Unbounded cache
  
  async processResources(resources: Resource[]): Promise<void> {
    const results = [];
    for (const resource of resources) {
      const processed = await this.heavyProcessing(resource);
      results.push(processed); // Accumulating all results
      this.cache.set(resource.id, processed); // Never cleared
    }
    return results;
  }
}

// ✅ AFTER: Proper memory management
export class ResourceProcessor {
  private cache = new LRUCache<number, ProcessedResource>({
    max: 1000, // Bounded cache
    ttl: 1000 * 60 * 5, // 5 minute TTL
    updateAgeOnGet: true
  });
  
  async processResources(resources: Resource[]): Promise<void> {
    // Process in batches to control memory
    const BATCH_SIZE = 100;
    
    for (let i = 0; i < resources.length; i += BATCH_SIZE) {
      const batch = resources.slice(i, i + BATCH_SIZE);
      
      // Process batch with streaming
      await this.processBatch(batch);
      
      // Allow garbage collection between batches
      if (global.gc) {
        global.gc();
      }
    }
  }
  
  private async processBatch(batch: Resource[]): Promise<void> {
    // Use streaming instead of accumulating
    const stream = new Transform({
      objectMode: true,
      transform: async (resource, encoding, callback) => {
        try {
          const processed = await this.heavyProcessing(resource);
          this.cache.set(resource.id, processed);
          callback(null, processed);
        } catch (error) {
          callback(error);
        }
      }
    });
    
    // Stream results instead of accumulating
    await pipeline(
      Readable.from(batch),
      stream,
      new Writable({
        objectMode: true,
        write: (chunk, encoding, callback) => {
          // Process each result immediately
          this.handleProcessedResource(chunk);
          callback();
        }
      })
    );
  }
}
```

### Phase 4: Scalability Assessment

```typescript
// scalability-check.ts
export class ScalabilityAssessment {
  async checkHorizontalScalability(): Promise<ScalabilityReport> {
    const issues: string[] = [];
    const warnings: string[] = [];
    
    // Check 1: Stateless design
    if (this.hasLocalState()) {
      issues.push('❌ Local state detected - prevents horizontal scaling');
    }
    
    // Check 2: Session management
    if (!this.hasExternalSessionStore()) {
      issues.push('❌ Sessions stored locally - use Redis/external store');
    }
    
    // Check 3: File uploads
    if (this.hasLocalFileStorage()) {
      issues.push('❌ Local file storage - use S3/external storage');
    }
    
    // Check 4: Database connection pooling
    const poolConfig = this.getDatabasePoolConfig();
    if (poolConfig.max > 20) {
      warnings.push('⚠️ Database pool too large for scaling');
    }
    
    // Check 5: Cache strategy
    if (!this.hasDistributedCache()) {
      warnings.push('⚠️ No distributed cache - consider Redis');
    }
    
    return {
      horizontalScaling: issues.length === 0 ? 'READY' : 'BLOCKED',
      issues,
      warnings
    };
  }
  
  async checkVerticalScalability(): Promise<VerticalReport> {
    const metrics = await this.measureResourceUsage();
    
    return {
      memoryUsage: metrics.memory,
      memoryLimit: 512 * 1024 * 1024, // 512MB
      cpuUsage: metrics.cpu,
      cpuLimit: 1.0, // 1 core
      canScale: metrics.memory < 400 * 1024 * 1024 && metrics.cpu < 0.8
    };
  }
}
```

## ITERATION TRACKING & LIMITS

### Iteration Counter

```typescript
class OptimizationIterator {
  private iterationCount = 0;
  private readonly MAX_ITERATIONS = 5;
  private improvementHistory: IterationResult[] = [];
  
  async performOptimization(): Promise<OptimizationResult> {
    // MANDATORY: Verify all tests pass before starting
    const initialTestResult = await this.runAllTests();
    if (!initialTestResult.allPassed) {
      throw new Error('Cannot start optimization - tests already failing');
    }
    
    while (this.iterationCount < this.MAX_ITERATIONS) {
      this.iterationCount++;
      console.log(`🔄 Optimization Iteration ${this.iterationCount}/${this.MAX_ITERATIONS}`);
      
      // Apply optimization
      const optimizationSnapshot = await this.createSnapshot(); // Save current state
      const result = await this.runOptimizationCycle();
      
      // CRITICAL: Validate all tests still pass
      const testResult = await this.runAllTests();
      if (!testResult.allPassed) {
        console.log('❌ TESTS FAILED - Rolling back optimization');
        await this.restoreSnapshot(optimizationSnapshot);
        
        // Verify rollback worked
        const rollbackTestResult = await this.runAllTests();
        if (!rollbackTestResult.allPassed) {
          throw new Error('CRITICAL: Cannot rollback to working state');
        }
        
        // Try alternative approach or continue
        result.testsPass = false;
        result.rollbackRequired = true;
      } else {
        result.testsPass = true;
        console.log('✅ All tests pass after optimization');
      }
      
      this.improvementHistory.push(result);
      
      // Check if we've met all requirements AND tests pass
      if (result.allRequirementsMet && result.testsPass) {
        return {
          status: 'SUCCESS',
          iterations: this.iterationCount,
          finalMetrics: result.metrics,
          allTestsPass: true
        };
      }
      
      // Check if we're making progress
      if (!this.isImproving()) {
        return {
          status: 'STALLED',
          iterations: this.iterationCount,
          reason: 'No improvement in last 2 iterations',
          allTestsPass: testResult.allPassed
        };
      }
    }
    
    // Max iterations reached
    const finalTestResult = await this.runAllTests();
    return {
      status: 'MAX_ITERATIONS_REACHED',
      iterations: this.iterationCount,
      unresolvedIssues: this.getUnresolvedIssues(),
      allTestsPass: finalTestResult.allPassed
    };
  }
  
  private async runAllTests(): Promise<TestResult> {
    console.log('🧪 Running all tests...');
    
    try {
      // Run unit tests
      const unitResult = await this.execCommand('npm run test:unit');
      if (unitResult.exitCode !== 0) {
        return { allPassed: false, failedSuite: 'unit', output: unitResult.output };
      }
      
      // Run integration tests
      const integrationResult = await this.execCommand('npm run test:integration');
      if (integrationResult.exitCode !== 0) {
        return { allPassed: false, failedSuite: 'integration', output: integrationResult.output };
      }
      
      // Check TypeScript compilation
      const typeResult = await this.execCommand('npm run type-check');
      if (typeResult.exitCode !== 0) {
        return { allPassed: false, failedSuite: 'typescript', output: typeResult.output };
      }
      
      return { allPassed: true, failedSuite: null, output: 'All tests passed' };
    } catch (error) {
      return { allPassed: false, failedSuite: 'unknown', output: error.message };
    }
  }
  
  private async createSnapshot(): Promise<string> {
    // Create git stash or backup of current state
    const timestamp = Date.now();
    await this.execCommand(`git stash push -m "optimization-snapshot-${timestamp}"`);
    return `optimization-snapshot-${timestamp}`;
  }
  
  private async restoreSnapshot(snapshot: string): Promise<void> {
    // Restore from git stash
    const stashes = await this.execCommand('git stash list');
    const stashEntry = stashes.output.split('\n').find(line => line.includes(snapshot));
    if (stashEntry) {
      const stashId = stashEntry.split(':')[0];
      await this.execCommand(`git stash pop ${stashId}`);
    }
  }
  
  private isImproving(): boolean {
    if (this.improvementHistory.length < 2) return true;
    
    const current = this.improvementHistory[this.improvementHistory.length - 1];
    const previous = this.improvementHistory[this.improvementHistory.length - 2];
    
    // Check if any metric improved
    return current.metrics.p95 < previous.metrics.p95 ||
           current.metrics.memoryUsage < previous.metrics.memoryUsage ||
           current.issues.length < previous.issues.length;
  }
}
```

## 🚩 CRITICAL FLAGS FOR HUMAN INTERVENTION

### 🚩 Flag Type: `PERFORMANCE_SLA_VIOLATION`

**Trigger:** Endpoint response times exceed documented SLAs after optimization

```markdown
🚩 **PERFORMANCE_SLA_VIOLATION**

**Endpoint:** GET /v1/resources
**Documented SLA:** P95 < 400ms
**Measured:** P95 = 650ms
**Optimization Attempts:** 5/5 (MAX REACHED)

**Attempted Optimizations:**
1. Query optimization with eager loading
2. Added Redis caching layer
3. Implemented connection pooling
4. Database index optimization
5. Reduced payload size

**Root Cause Analysis:**
- Database query inherently complex due to business logic
- Cannot be further optimized without schema changes

**HUMAN INTERVENTION REQUIRED:**
- Consider denormalizing database schema
- Evaluate if SLA is realistic for current architecture
- Consider async processing with queue
```

### 🚩 Flag Type: `SCALABILITY_BLOCKER`

**Trigger:** Code has inherent scalability limitations

```markdown
🚩 **SCALABILITY_BLOCKER**

**Issue:** Cannot achieve horizontal scalability
**Reason:** Stateful operations detected

**Blocking Issues:**
1. WebSocket connections with local state
2. File uploads stored on local filesystem
3. In-memory session storage
4. Local cron jobs without coordination

**Attempted Solutions:**
1. ❌ Redis for sessions - requires architecture change
2. ❌ S3 for files - requires API change
3. ❌ Distributed cron - requires new dependency

**HUMAN INTERVENTION REQUIRED:**
- Architectural decisions needed for state management
- Consider microservices split
- Evaluate cost/benefit of full stateless design
```

### 🚩 Flag Type: `SECURITY_VULNERABILITY`

**Trigger:** Security issue that cannot be fixed without breaking changes

```markdown
🚩 **SECURITY_VULNERABILITY**

**Vulnerability:** SQL Injection risk in legacy query builder
**Severity:** HIGH
**Location:** src/legacy/query-builder.ts

**Issue:** Dynamic query construction without parameterization
**Impact:** Potential database compromise

**Why Cannot Fix:**
- Legacy code with 50+ dependencies
- Would break backward compatibility
- Requires complete rewrite of query layer

**HUMAN INTERVENTION REQUIRED:**
- Evaluate risk vs. migration cost
- Consider adding WAF rules as mitigation
- Plan phased migration strategy
```

### 🚩 Flag Type: `INFINITE_LOOP_DETECTED`

**Trigger:** Optimization cycle not converging

```markdown
🚩 **INFINITE_LOOP_DETECTED**

**Iteration:** 5/5 (MAX REACHED)
**Pattern Detected:** Optimization oscillation

**Oscillation Pattern:**
- Iteration 1: Optimize for speed → Memory increases
- Iteration 2: Optimize for memory → Speed decreases
- Iteration 3: Optimize for speed → Memory increases (REPEAT)

**Conflicting Requirements:**
- Memory limit: 512MB
- Response time: P95 < 400ms
- Current trade-off: Can achieve one but not both

**HUMAN INTERVENTION REQUIRED:**
- Decide on priority: Memory vs. Speed
- Consider increasing resource limits
- Evaluate if requirements are mutually achievable
```

## FINAL OUTPUT FORMAT

```markdown
# Performance & Security Hardening Report

## Optimization Summary
**Total Iterations:** [Count]/5
**Status:** [SUCCESS | PARTIAL_SUCCESS | BLOCKED]
**CRITICAL:** Tests Still Passing: Unit ✅ Integration ✅ TypeScript ✅
**Test Regressions:** [Count] (MUST BE 0)
**Rollbacks Required:** [Count] optimizations rolled back due to test failures

## Performance Metrics

### Before Optimization
| Endpoint | P50 | P95 | P99 | SLA P95 | Status |
|----------|-----|-----|-----|---------|--------|
| GET /v1/resources | 180ms | 520ms | 980ms | 400ms | ❌ |
| POST /v1/resources | 210ms | 610ms | 1100ms | 500ms | ❌ |

### After Optimization
| Endpoint | P50 | P95 | P99 | SLA P95 | Status |
|----------|-----|-----|-----|---------|--------|
| GET /v1/resources | 95ms | 380ms | 750ms | 400ms | ✅ |
| POST /v1/resources | 120ms | 480ms | 950ms | 500ms | ✅ |

## Scalability Assessment

### Horizontal Scalability
**Status:** [READY | BLOCKED]
**Max Instances:** [Unlimited | Limited to X]
**Issues:** [None | List of blockers]

### Vertical Scalability  
**Current Usage:**
- Memory: [X]MB / 512MB limit
- CPU: [X]% / 100% (1 core)
**Headroom:** [X]% memory, [X]% CPU

## Code Quality Metrics

### Logging
- ✅ Structured JSON logging implemented
- ✅ Correlation IDs propagated
- ✅ No PII in logs
- ✅ Appropriate log levels

### Security
- ✅ Input validation complete
- ✅ SQL injection prevented
- ✅ XSS protection implemented
- ⚠️ Rate limiting recommended

### Efficiency
- ✅ No memory leaks detected
- ✅ Database queries optimized
- ✅ Connection pooling configured
- ✅ Caching strategy implemented

## Optimizations Applied

1. **Query Optimization**
   - Replaced N+1 queries with eager loading
   - Added database indexes
   - Implemented query result caching

2. **Memory Management**
   - Implemented bounded caches (LRU)
   - Added streaming for large datasets
   - Fixed memory leak in processor

3. **Performance Improvements**
   - Added Redis caching layer
   - Implemented connection pooling
   - Optimized logging performance

## 🚩 Flags Raised (Requires Human Intervention)

[Include any flags that were raised during optimization]

## Recommendations

### Immediate Actions
1. Deploy with current optimizations
2. Monitor performance in production
3. Set up alerts for SLA violations

### Future Improvements
1. Consider CDN for static assets
2. Implement database read replicas
3. Add API response compression
4. Evaluate GraphQL for reducing overfetching

## Validation Commands
```bash
# Verify all tests still pass
npm run test:all

# Run performance profiling
npm run profile:endpoints

# Check scalability
npm run audit:scalability

# Security scan
npm run security:scan
```

## Status: [READY FOR DEPLOYMENT | REQUIRES HUMAN REVIEW]
```

## SUCCESS CRITERIA

### MANDATORY Test Integrity Criteria (NON-NEGOTIABLE)
- [ ] **ALL UNIT TESTS PASS** - Every single unit test from previous stages still passes
- [ ] **ALL INTEGRATION TESTS PASS** - Every single integration test still passes  
- [ ] **TYPESCRIPT COMPILATION** - Zero TypeScript errors
- [ ] **ESLINT CLEAN** - Zero linting warnings or errors
- [ ] **NO TEST REGRESSIONS** - Zero tests that used to pass now fail
- [ ] **COVERAGE MAINTAINED** - Test coverage ≥90% maintained

### Performance Criteria
- [ ] **SLA COMPLIANCE** - All endpoints meet documented response times
- [ ] **MEMORY EFFICIENCY** - Usage < 512MB under load
- [ ] **CPU EFFICIENCY** - Usage < 80% under normal load
- [ ] **NO MEMORY LEAKS** - Stable memory usage over time

### Scalability Criteria
- [ ] **HORIZONTAL READY** - Stateless design confirmed
- [ ] **VERTICAL HEADROOM** - 20% resource headroom maintained
- [ ] **CACHE STRATEGY** - Distributed caching implemented
- [ ] **CONNECTION POOLING** - Database pools configured

### Quality Criteria
- [ ] **LOGGING COMPLETE** - Structured logs with correlation IDs
- [ ] **SECURITY HARDENED** - OWASP Top 10 addressed
- [ ] **CODE EFFICIENCY** - No obvious inefficiencies
- [ ] **ERROR HANDLING** - Comprehensive error handling

### Process Criteria
- [ ] **ITERATION LIMIT** - Maximum 5 optimization cycles
- [ ] **ROLLBACK CAPABILITY** - Successful rollback on test failures
- [ ] **FLAGS DOCUMENTED** - All issues flagged for human review
- [ ] **NO INFINITE LOOPS** - Optimization converged or flagged

### Final Validation Requirements
**BEFORE DECLARING SUCCESS, RUN:**
```bash
# MANDATORY final validation
npm run test:all          # ALL tests must pass
npm run test:coverage     # Coverage must be ≥90%
npm run type-check        # Zero TypeScript errors
npm run lint              # Zero linting issues
npm run security:scan     # Security scan clean
```

**If ANY of these commands fail, optimization is NOT complete.**