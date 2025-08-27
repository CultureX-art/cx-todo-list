# Database Schema Documentation

## Overview

The Todo API uses MySQL 8.0+ as the primary database with a normalized schema optimized for performance and data integrity. The schema follows enterprise-grade practices with proper indexing, constraints, and audit capabilities.

## Database Design Principles

- **Single Source of Truth:** Centralized data storage with ACID compliance
- **User Isolation:** Complete data separation between users at the query level
- **Performance Optimized:** Strategic indexing for common access patterns
- **Audit Ready:** Optional audit logging for compliance requirements
- **Soft Deletes:** Data preservation with `deleted_at` timestamps
- **Forward-Compatible:** Schema supports future feature additions

## Core Tables

### user

Stores user authentication and profile information.

**Columns:**

- `id` - Primary key, auto-incrementing BIGINT
- `email` - Unique user identifier, validated format
- `password_hash` - Bcrypt hashed password (60+ characters)
- `created_at` - Account creation timestamp
- `updated_at` - Last modification timestamp
- `deleted_at` - Soft delete timestamp (NULL = active)

**Constraints:**

- Email format validation via regex
- Password hash minimum length requirement
- Unique email constraint

**Indexes:**

- Primary: `id`
- Unique: `email`
- Performance: `created_at`, `deleted_at`

### task

Stores todo items with user ownership and metadata.

**Columns:**

- `id` - Primary key, auto-incrementing BIGINT
- `user_id` - Foreign key to user table
- `title` - Task title (required, 1-255 characters)
- `description` - Optional detailed description (up to 1000 characters)
- `status` - Task status enum: `not-started`, `in-progress`, `done`
- `due_date` - Optional due date timestamp
- `labels` - JSON array of string labels (up to 10 items)
- `created_at` - Task creation timestamp
- `updated_at` - Last modification timestamp
- `deleted_at` - Soft delete timestamp (NULL = active)

**Constraints:**

- Foreign key to user table with CASCADE delete
- Title minimum length validation
- Description length validation
- Labels JSON validation (array, max 10 items)

**Indexes:**

- Primary: `id`
- Foreign key: `user_id`
- Performance: `status`, `due_date`, `created_at`, `updated_at`, `deleted_at`
- Composite: `(user_id, status)`, `(user_id, created_at)`, `(user_id, due_date)`
- Full-text: `title`, `(title, description)`

## Supporting Tables

### audit_log (Optional)

Tracks all data changes for compliance and debugging.

**Purpose:** Complete audit trail of data modifications
**Retention:** 90 days (configurable)
**Performance Impact:** Minimal (async triggers)

### token_blacklist (Optional)

Manages JWT token revocation for security.

**Purpose:** Token invalidation before natural expiry
**Cleanup:** Automated removal of expired entries
**Use Cases:** Logout, security breaches, password changes

## Performance Optimizations

### Indexing Strategy

1. **Primary Access Patterns**
   - User-specific task queries: `idx_task_user_id`
   - Status filtering: `idx_task_user_status`
   - Date sorting: `idx_task_user_created`, `idx_task_user_due_date`

2. **Search Capabilities**
   - Title search: `idx_task_title_search` (full-text)
   - Content search: `idx_task_content_search` (title + description)

3. **Administrative Queries**
   - Soft delete handling: `idx_task_deleted_at`
   - Audit trail access: `idx_audit_table_record`

### Query Patterns

```sql
-- Most common: Get user's active tasks with pagination
SELECT * FROM task
WHERE user_id = ? AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT ? OFFSET ?;

-- Status filtering
SELECT * FROM task
WHERE user_id = ? AND status = ? AND deleted_at IS NULL;

-- Title search
SELECT * FROM task
WHERE user_id = ? AND MATCH(title) AGAINST(? IN NATURAL LANGUAGE MODE)
AND deleted_at IS NULL;

-- Due date sorting
SELECT * FROM task
WHERE user_id = ? AND deleted_at IS NULL
ORDER BY due_date ASC NULLS LAST;
```

## Data Integrity

### Referential Integrity

- Cascade deletes: User deletion removes all associated tasks
- Foreign key constraints prevent orphaned records
- Consistent updates across related tables

### Data Validation

- Email format validation at database level
- Password hash strength requirements
- JSON schema validation for labels
- Length constraints on text fields

### Concurrency Control

- Optimistic locking via `updated_at` timestamps
- Transaction isolation for multi-table operations
- Deadlock prevention through consistent lock ordering

## Views and Procedures

### active_tasks View

Simplified access to non-deleted tasks, commonly used in application queries.

### task_summary View

Analytics-ready aggregated data for dashboards and reporting.

### Maintenance Procedures

- `CleanupExpiredTokens()` - Remove expired token blacklist entries
- `CleanupAuditLogs()` - Archive old audit records
- `GetDatabaseStats()` - System health metrics

## Security Considerations

### Database User Privileges

- Application user has minimal required permissions
- No DDL privileges in production
- Audit procedures have restricted access
- Connection encryption enforced

### Data Protection

- Password hashes never exposed in queries
- Sensitive data excluded from audit logs
- PII handling compliance ready
- Secure connection requirements

### Access Patterns

- User isolation enforced at query level
- No cross-user data leakage possible
- Authorization checks in application layer
- Audit trail for security events

## Migration Strategy

### Initial Setup

1. Create database and user accounts
2. Run schema creation script
3. Set up indexes and constraints
4. Configure optional features (audit, blacklist)
5. Insert sample data for development

### Schema Evolution

- Forward-only migrations required
- Additive changes preferred
- Column additions with defaults
- Index additions without downtime
- Backward compatibility maintained

### Rollback Procedures

- Schema rollback via version control
- Data rollback via point-in-time recovery
- Application compatibility validation
- Staged deployment with validation

## Performance Monitoring

### Key Metrics

- Query execution time by endpoint
- Index usage statistics
- Connection pool utilization
- Database lock contention
- Storage growth patterns

### Optimization Opportunities

- Query performance analysis
- Index effectiveness review
- Connection pooling tuning
- Cache hit ratio optimization
- Slow query identification

### Scaling Strategies

#### Vertical Scaling (Phase 1)

- Increase CPU and memory resources
- Optimize connection pool settings
- Tune MySQL configuration parameters
- Add more storage capacity

#### Horizontal Scaling (Phase 2)

- Read replicas for query distribution
- Connection routing by operation type
- Master-slave synchronization
- Geographic distribution

#### Service Separation (Phase 3)

- Dedicated auth service database
- Task service database isolation
- Microservice data boundaries
- Event-driven data synchronization

## Development Guidelines

### Local Development

- Use Docker Compose for consistent environment
- Sample data provided for testing
- Database seeding scripts available
- Hot reload support for schema changes

### Testing Strategy

- Isolated test database per test suite
- Transactional rollback for test cleanup
- Sample data generators for load testing
- Schema validation tests

### Production Deployment

- Blue-green deployment support
- Zero-downtime migration procedures
- Automated backup verification
- Performance regression testing

This schema provides a robust foundation for the Todo API with clear paths for future enhancements and scaling requirements.
