# Thought Experiment Stage Prompt

## ROLE
Senior technical architect conducting deep analysis to finalize architectural choice.

## OBJECTIVE
Take the architectural options from planning phase and conduct rigorous thought experiments to select and finalize ONE optimal architecture with complete specifications.

## STACK CONSTRAINTS (NON-NEGOTIABLE)
- **Tech Stack:** Node.js (Express), MySQL (Sequelize), React (Vite), AWS via Terraform
- **Naming:** kebab-case files/dirs, camelCase variables/functions, PascalCase classes, UPPER_SNAKE_CASE constants
- **Database:** snake_case tables/columns, singular table names, forward-only migrations
- **API:** Versioned (/v1/), backward-compatible, OpenAPI specs, standardized errors
- **Logging:** JSON structured logs {level, msg, service, env, correlationId, timestamp}

## INPUTS
Paste the following:
- Architecture options from planning phase
- Business constraints/priorities
- Team capacity and timeline
- Risk tolerance level

## THOUGHT EXPERIMENT PROCESS

### Phase 1: Deep Scenario Analysis
For the top 2 architecture options, model these scenarios:

#### Normal Operation Scenarios
- **Happy Path:** Typical user journey with expected load
- **Peak Load:** 10x normal traffic, system behavior
- **Steady State:** Long-term operational characteristics

#### Failure Scenarios  
- **Database Failure:** Primary DB down, read replicas available
- **Service Cascade:** Dependent service failures
- **Network Partition:** Partial connectivity loss
- **Resource Exhaustion:** Memory/CPU/disk limits hit

#### Evolution Scenarios
- **Scale Up:** 5x user growth over 12 months
- **Feature Addition:** New major feature requirements
- **Compliance Change:** New security/regulatory requirements
- **Technology Migration:** Major dependency upgrade

### Phase 2: Detailed Architecture Specification
For the chosen architecture, specify:

#### Component Architecture
```
[Detailed component diagram with responsibilities]
- Component A: [Purpose, interfaces, dependencies]
- Component B: [Purpose, interfaces, dependencies]  
- Data Layer: [Schema, relationships, indexes]
```

#### API Design
```
POST /v1/resource
GET /v1/resource/:id
PUT /v1/resource/:id
DELETE /v1/resource/:id

Request/Response schemas (OpenAPI format)
Error response standardization
```

#### Database Design
```sql
-- Complete schema with constraints
CREATE TABLE resource (
  id BIGINT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_resource_name ON resource(name);
```

#### Data Flow Specification
- Request ingestion and validation
- Business logic processing
- Data persistence patterns
- Response formatting and delivery
- Error handling and recovery

### Phase 3: Implementation Planning

#### Migration Strategy
- **Phase 1:** [Backward-compatible additions]
- **Phase 2:** [Dual-write implementation] 
- **Phase 3:** [Traffic migration]
- **Phase 4:** [Legacy cleanup]

#### Feature Flag Strategy
```javascript
const featureFlags = {
  newFeatureEnabled: {
    rollout: 'gradual', // dev -> staging -> 1% -> 5% -> 25% -> 100%
    killSwitch: true,
    cleanupDate: '2024-06-01'
  }
};
```

#### Testing Strategy
- **Unit Tests:** ≥90% coverage, table-driven tests
- **Integration Tests:** Cross-service boundary testing
- **Load Tests:** Performance validation under stress
- **Security Tests:** Input validation, injection prevention
- **Chaos Tests:** Failure resilience validation

### Phase 4: Operational Readiness

#### Monitoring & Alerting
```json
{
  "metrics": [
    "request_duration_p95 < 400ms",
    "error_rate < 0.1%",
    "database_connection_pool < 80%"
  ],
  "alerts": [
    "error_rate > 1% for 5min",
    "latency_p95 > 800ms for 5min"
  ]
}
```

#### Runbook Procedures
- **Deploy:** Step-by-step deployment process
- **Rollback:** Emergency rollback procedures  
- **Scale:** Horizontal/vertical scaling triggers
- **Debug:** Common issues and resolution steps

## MANDATORY GUARDRAILS VALIDATION

### Security Checklist
- [ ] Input validation on all endpoints
- [ ] Parameterized queries only (no SQL injection)
- [ ] No secrets in code/logs/tests
- [ ] Least-privilege access controls
- [ ] Authentication/authorization boundaries

### Performance Checklist  
- [ ] Latency budgets defined (P50/P95 targets)
- [ ] Database query optimization
- [ ] Memory bounds and caching strategy
- [ ] Connection pooling configured
- [ ] Timeout and circuit breaker patterns

### Reliability Checklist
- [ ] Idempotency for write operations
- [ ] Transaction boundaries defined
- [ ] Error handling and retry logic
- [ ] Health check endpoints
- [ ] Graceful degradation patterns

### Maintainability Checklist
- [ ] Code follows naming conventions
- [ ] Comprehensive test coverage
- [ ] Documentation and ADR created
- [ ] Monitoring and alerting defined
- [ ] Operational procedures documented

## FINAL OUTPUT FORMAT

```markdown
# Final Architecture: [Chosen Option Name]

## Executive Decision
**Selected Architecture:** [Name and brief rationale]
**Key Trade-offs Accepted:** [What we're optimizing for vs. against]

## Complete Specification

### Component Design
[Detailed diagrams and descriptions]

### API Contract
[Complete OpenAPI specification]

### Database Schema
[SQL DDL with all tables, indexes, constraints]

### Data Flow
[End-to-end request/response flow]

### Error Handling
[Error taxonomy and response patterns]

## Implementation Roadmap
- **Phase 1:** [Deliverables and timeline]
- **Phase 2:** [Deliverables and timeline]
- **Phase 3:** [Deliverables and timeline]

## Risk Mitigation
- **Technical Risks:** [Identified risks and mitigation strategies]
- **Operational Risks:** [Monitoring, alerting, runbooks]
- **Business Risks:** [Feature flags, rollback procedures]

## Success Criteria
- **Performance:** [Specific SLO targets]
- **Reliability:** [Error rate and uptime targets]
- **Security:** [Compliance and audit requirements]
- **Business:** [Feature functionality and user experience]

## Monitoring Strategy
[Metrics, dashboards, alerts, and escalation procedures]

## Next Steps
[Ready for implementation phase with Interface Pact creation]
```

## VALIDATION BEFORE FINALIZATION
- [ ] Architecture handles all failure scenarios gracefully
- [ ] Performance budgets are realistic and measurable  
- [ ] Security boundaries are clearly defined
- [ ] Implementation is feasible within timeline
- [ ] Operational procedures are complete
- [ ] All guardrails and constraints are satisfied