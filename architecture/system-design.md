# System Architecture: Todo API

## Overview

The Todo API follows a **Layered Monolith with Service Layer** architecture pattern, providing clean separation of concerns while maintaining deployment simplicity and development velocity.

## High-Level Architecture

```
┌─────────────────────────────────┐
│         Express Server          │
│  ┌─────────────────────────────┐│
│  │     Middleware Stack        ││ ← Auth, CORS, Validation, Logging
│  ├─────────────────────────────┤│
│  │      Route Handlers         ││ ← /v1/auth/*, /v1/tasks/*
│  │  ┌─────────────────────────┐││
│  │  │    Auth Controller      │││ ← JWT validation, user mgmt
│  │  │    Task Controller      │││ ← CRUD, search, pagination
│  │  └─────────────────────────┘││
│  └─────────────────────────────┘│
├─────────────────────────────────┤
│        Service Layer            │
│  ┌─────────────────────────────┐│
│  │     Auth Service            ││ ← Password hashing, JWT logic
│  │     Task Service            ││ ← Business validation, filtering
│  │     User Service            ││ ← User profile management
│  └─────────────────────────────┘│
├─────────────────────────────────┤
│       Repository Layer          │
│  ┌─────────────────────────────┐│
│  │     User Repository         ││ ← Sequelize User model
│  │     Task Repository         ││ ← Sequelize Task model
│  └─────────────────────────────┘│
├─────────────────────────────────┤
│          MySQL Database         │
│  ┌─────────────────────────────┐│
│  │     user, task tables       ││
│  │     Indexes, constraints     ││
│  └─────────────────────────────┘│
└─────────────────────────────────┘
```

## Component Responsibilities

### Middleware Stack
- **Authentication:** JWT token validation and user context injection
- **CORS:** Cross-origin request handling
- **Validation:** Request/response schema validation
- **Logging:** Structured JSON logging with correlation IDs
- **Rate Limiting:** Request throttling and abuse prevention

### Route Handlers (Controllers)
- **Auth Controller:** User registration, login, profile management
- **Task Controller:** Task CRUD operations, search, filtering, pagination
- **Health Controller:** System health and readiness checks

### Service Layer
- **Auth Service:** Password hashing, JWT generation/validation, user authentication
- **Task Service:** Business logic, validation, authorization, filtering logic
- **User Service:** User profile management, account operations

### Repository Layer
- **User Repository:** User data access, query optimization
- **Task Repository:** Task data access, complex queries, search implementation
- **Base Repository:** Common ORM patterns and transaction management

## Data Flow

### Request Processing Pipeline
1. **HTTP Request** → Express middleware stack
2. **Authentication** → JWT validation and user context
3. **Route Handler** → Parameter extraction and validation
4. **Service Layer** → Business logic and authorization
5. **Repository Layer** → Data access and persistence
6. **Database** → Query execution and data retrieval
7. **Response** → Data transformation and HTTP response

### Authentication Flow
```
Client Request
     ↓
JWT Middleware → Validate Token → Extract User Context
     ↓                ↓                    ↓
   401 Error    Token Invalid     Continue to Handler
```

### Authorization Flow
```
Authenticated Request
     ↓
Service Layer → Check User Permissions → Access Resource
     ↓              ↓                      ↓
Controller    403 Forbidden         Process Request
```

## Key Design Decisions

### Architecture Pattern Choice
- **Selected:** Layered Monolith
- **Rationale:** Optimal balance of simplicity, development velocity, and maintainability
- **Trade-offs:** Single deployment unit vs. independent scaling capabilities

### Database Strategy
- **Single MySQL Instance:** ACID compliance, consistent transactions
- **Forward-only Migrations:** Schema evolution without rollback complexity
- **Optimized Indexing:** Performance for common query patterns

### Authentication Strategy
- **Stateless JWT:** No server-side session storage required
- **Short Token Expiry:** 1-hour tokens for security
- **Bearer Token Format:** Standard HTTP authentication

### API Design Philosophy
- **RESTful Endpoints:** Predictable resource-based URLs
- **Versioned APIs:** `/v1/` prefix for backward compatibility
- **Contract-First:** OpenAPI specification drives implementation

## Performance Characteristics

### Latency Targets
- **Authentication:** P95 < 200ms
- **Task Operations:** P95 < 250ms
- **Health Checks:** P95 < 50ms

### Throughput Expectations
- **Normal Load:** 100 requests/minute
- **Peak Load:** 1000 requests/minute
- **Connection Pool:** 50 concurrent database connections

### Resource Requirements
- **Memory:** 2-4GB RAM under normal load
- **CPU:** 2-4 cores, 40-70% utilization
- **Storage:** 100GB initial, with growth planning

## Scalability Strategy

### Vertical Scaling (Phase 1)
- Increase server resources (CPU, memory)
- Database connection pool tuning
- Query optimization and indexing

### Horizontal Scaling (Phase 2)
- Load balancer with multiple server instances
- Redis caching layer for sessions and frequent queries
- Read replicas for database scaling

### Service Extraction (Phase 3)
- Extract Auth Service as independent microservice
- Extract Task Service with dedicated database
- API Gateway for service coordination

## Security Measures

### Input Validation
- OpenAPI schema validation on all endpoints
- Parameterized queries to prevent SQL injection
- Request size limits and rate limiting

### Authentication & Authorization
- JWT with secure signing algorithm (RS256)
- User isolation at database query level
- Least-privilege access patterns

### Data Protection
- No secrets in code, logs, or version control
- Password hashing with bcrypt
- Structured logging without PII

## Monitoring & Observability

### Metrics Collection
- Request duration and throughput
- Error rates by endpoint and status code
- Database connection pool usage
- Business metrics (user signups, task creation)

### Logging Strategy
- Structured JSON logs with correlation IDs
- Different log levels: debug, info, warn, error, fatal
- No sensitive data in logs

### Health Checks
- `/health` endpoint for load balancer checks
- Database connectivity validation
- Service readiness indicators

## Deployment Model

### Environment Strategy
- **Local:** Docker Compose for development
- **Staging:** AWS ECS with MySQL RDS
- **Production:** AWS ECS with Multi-AZ MySQL RDS

### Release Strategy
- Blue-green deployments for zero downtime
- Feature flags for gradual rollouts
- Automated rollback triggers on health check failures

### CI/CD Pipeline
- Automated testing (unit, integration, contract)
- Security scanning and dependency audits
- Performance regression testing

## Future Considerations

### Planned Enhancements
- Redis caching layer for improved performance
- Full-text search with Elasticsearch integration
- Real-time notifications via WebSockets
- Multi-tenant organization support

### Migration Paths
- **To Microservices:** Service extraction when team size grows
- **To Event-Driven:** Add event sourcing for audit requirements
- **To Multi-Region:** Geographic distribution for global users

## Risk Mitigation

### Technical Risks
- **Single Point of Failure:** Health monitoring, auto-restart, backup procedures
- **Database Performance:** Connection pooling, query optimization, scaling plans
- **Memory Leaks:** Profiling, monitoring, restart procedures

### Operational Risks
- **Deployment Failures:** Blue-green deployments, automated rollback
- **Data Loss:** Automated backups, point-in-time recovery
- **Security Vulnerabilities:** Regular audits, dependency scanning

This architecture provides a solid foundation for the Todo API while maintaining simplicity and enabling future growth through well-defined upgrade paths.