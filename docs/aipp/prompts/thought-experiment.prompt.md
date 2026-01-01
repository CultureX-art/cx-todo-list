# Planning Stage Prompt

## ROLE

Senior software architect generating multiple architectural approaches for evaluation.

## OBJECTIVE

Generate 3-5 different architectural options for the given feature/requirement. Each option should explore different trade-offs in complexity, performance, scalability, and maintainability.

## STACK CONSTRAINTS (NON-NEGOTIABLE)

- **Tech Stack**: 
    - ***code***:
        - ***Runtime***: Node.js, 
        - ***Database***: MySQL, ORM: Sequelize,
        - ***Frontend***: React (Vite)
        - ***Languages***: JavaScript/TypeScript for backend/frontend, SQL for database
        - ***Frameworks/Libraries***: Express for Backend, React with hooks for frontend, Jest for testing
        - ***Infrastructure***: AWS services (Lambda, S3, RDS, CloudFront, API Gateway, VPC, LOAD Balancer, IAM, Route 53, SNS, SQS)
        - ***DevOps***: GitHub for version control, Terraform for infrastructure as code
        - ***Testing***: Unit tests, integration tests, end-to-end tests with Jest
    - ***Monitoring***: CloudWatch
- **Naming:** kebab-case files/dirs, camelCase variables/functions, PascalCase classes, UPPER_SNAKE_CASE constants
    - ***Database***: snake_case tables/columns, singular table names, forward-only migrations
- **API**: Versioned (/v1/), backward-compatible, OpenAPI specs, standardized errors

## INPUTS

Paste the following:

- Feature requirements/user story
- Current system context/constraints
- Performance/SLO requirements
- Security/compliance requirements

## DELIVERABLES

### Generate Multiple Architecture Options

For each architectural approach (3-5 options), provide:

#### Option X: [Descriptive Name]

**Philosophy:** One-sentence architectural philosophy (e.g., "Event-driven with async processing", "Monolithic with cached reads")

**High-Level Design:**

- Component diagram (ASCII or mermaid)
- Data flow overview
- Key technology choices

**Trade-offs:**

- **Pros:** What this approach excels at
- **Cons:** Limitations and risks
- **Complexity:** Development/operational complexity score (1-10)

**Performance Characteristics:**

- Expected latency profile
- Scalability ceiling
- Resource consumption pattern

**Implementation Effort:**

- Development timeline estimate
- Required team skills
- Migration complexity (if applicable)

**Risk Profile:**

- Technical risks
- Operational risks
- Business risks

## ARCHITECTURAL PATTERNS TO CONSIDER

### Pattern Options:

- **Monolithic:** Single deployable unit
- **Microservices:** Service decomposition
- **Event-Driven:** Async message-based
- **CRUD + Cache:** Simple data access with caching
- **Command/Query Separation:** Read/write path separation
- **Pipeline:** Sequential processing stages

### Data Patterns:

- **Single Source of Truth:** Centralized data store
- **Event Sourcing:** Immutable event log
- **CQRS:** Separate read/write models
- **Data Lake:** Centralized analytics store
- **Federated:** Distributed data ownership

### Scalability Patterns:

- **Vertical:** Scale up resources
- **Horizontal:** Scale out instances
- **Sharding:** Data partitioning
- **Caching:** Memory-based acceleration
- **CDN:** Geographic distribution

## MANDATORY CONSTRAINTS

Each option must respect:

- **Backward Compatibility:** No breaking API changes
- **Security:** Input validation, parameterized queries, no secrets in code
- **Observability:** Structured JSON logs, correlation IDs, metrics
- **Database Safety:** Forward-only migrations, transactional integrity
- **Feature Flags:** Gradual rollout capability
- **Performance:** Meet stated SLO requirements

## OUTPUT FORMAT

```markdown
# Architecture Options for [Feature Name]

## Requirements Summary

[Brief restatement of requirements]

## Option 1: [Name]

**Philosophy:** [One sentence]
**Design:** [Component diagram + description]
**Pros/Cons:** [Trade-offs]
**Complexity:** [Score + rationale]
**Performance:** [Characteristics]
**Effort:** [Timeline + skills]
**Risks:** [Key concerns]

## Option 2: [Name]

[Same structure...]

## Option 3: [Name]

[Same structure...]

## Comparison Matrix

| Aspect      | Option 1       | Option 2       | Option 3       |
| ----------- | -------------- | -------------- | -------------- |
| Complexity  | X/10           | Y/10           | Z/10           |
| Performance | [Brief]        | [Brief]        | [Brief]        |
| Timeline    | [Estimate]     | [Estimate]     | [Estimate]     |
| Risk Level  | [Low/Med/High] | [Low/Med/High] | [Low/Med/High] |

## Recommendation for Thought Experiment

[Which 1-2 options deserve deeper analysis and why]
```

## EVALUATION CRITERIA

Rate each option on:

- **Feasibility:** Can we build this with current team/timeline?
- **Performance:** Will it meet SLO requirements?
- **Maintainability:** Long-term operational burden
- **Extensibility:** Future feature development ease
- **Risk:** Technical and business risk level
