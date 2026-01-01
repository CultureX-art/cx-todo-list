# Interface Freeze Stage Prompt

## ROLE

Senior software architect translating system designs into concrete, frozen interfaces with comprehensive documentation.

## OBJECTIVE

Transform the finalized architecture specification from Stage 2 into concrete, documented interfaces that serve as the implementation contract. Create type-safe interfaces that adheres to API contracts, database schemas, and configuration specifications from stage 2.

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

Paste the following from Stage 2 Planning output:

- Final selected architecture specification
- Component design and data flow
- API contract definition
- Database schema design
- Configuration requirements
- Vendor integrations (if any)

## INTERFACE FREEZE PROCESS

### Phase 1: API Interface Definition

Create complete OpenAPI 3.0 specification with:

#### Request/Response Type Definitions

```typescript
/**
 * Standard error codes for programmatic handling
 */
export type ErrorCode =
  | "validation_failed"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "rate_limited"
  | "internal_error";

/**
 * Detailed validation error information
 */
export interface ValidationDetail {
  /** Field name that failed validation */
  field: string;
  /** Description of validation failure */
  issue: string;
}

/**
 * Standard API error structure
 */
export interface ApiError {
  code: ErrorCode;
  message: string;
}

/**
 * Validation error structure with details
 */
export interface ValidationError extends ApiError {
  details: ValidationDetail[];
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Standard API response wrapper with correlation tracking
 */
export interface ApiResponse {
  /** Request correlation ID for tracing */
  correlationId: string;
  /** Human-readable status message */
  message: string;
  /** Timestamp of the response in ISO 8601 format */
  timestamp: string;
  /** Response time in milliseconds (optional) */
  responseTimeMs?: number;
  /** Metadata (pagination, etc.) */
  meta?: PaginationMeta | Record<string, string | number | boolean> | undefined;
}

/**
 * Standard error response structure
 */
export interface ErrorApiResponse extends ApiResponse {
  /** Error information */
  errors: ApiError[];
  /** Request path where error occurred */
  path: string;
}

/**
 * Success response structure
 */
export interface SuccessApiResponse<
  TData = Record<string, string | number | boolean | null>,
> extends ApiResponse {
  /** Response data payload */
  data: TData;
  /** Only validation errors possible in case of success response */
  errors?: ValidationError[];
}

/**
 * Pagination information
 */
export interface PaginationInfo {
  /** Current page number (1-based) */
  page: number;
  /** Number of items per page */
  limit: number;
  /** Total number of items */
  total: number;
  /** Total number of pages */
  totalPages: number;
}

/**
 * Paginated response structure
 */
export interface PaginatedResponse<
  TData = Record<string, string | number | boolean | null>,
> extends SuccessApiResponse<TData[]> {
  /** Array of data items */
  data: TData[];
  /** Pagination information */
  pagination: PaginationInfo;
}

/**
 * Options for pagination
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}
```

### Phase 2: Database Interface Definition

Create complete SQL schema with constraints and documentation:

```sql
-- Complete database schema with all tables, indexes, and constraints

-- Resource management table
CREATE TABLE resource (
  -- Primary identifier
  id BIGINT PRIMARY KEY AUTO_INCREMENT,

  -- Business fields
  name VARCHAR(255) NOT NULL COMMENT 'Resource display name',
  type ENUM('basic', 'premium', 'enterprise') NOT NULL COMMENT 'Resource tier type',

  -- JSON metadata storage
  metadata JSON NULL COMMENT 'Flexible metadata storage',

  -- Standard audit fields
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation timestamp',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update timestamp',
  deleted_at TIMESTAMP NULL COMMENT 'Soft delete timestamp',

  -- Constraints
  CONSTRAINT chk_resource_name_length CHECK (CHAR_LENGTH(name) BETWEEN 1 AND 255),
  CONSTRAINT chk_resource_type_valid CHECK (type IN ('basic', 'premium', 'enterprise'))
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Primary resource storage table';


based on access patterns indexes should be created
-- Performance indexes
CREATE INDEX idx_resource_type ON resource(type) COMMENT 'Query by resource type';
CREATE INDEX idx_resource_name ON resource(name) COMMENT 'Search by resource name';
CREATE INDEX idx_resource_created_at ON resource(created_at) COMMENT 'Query by creation date';
CREATE INDEX idx_resource_soft_delete ON resource(deleted_at) COMMENT 'Filter non-deleted resources';

-- Composite indexes for common queries
CREATE INDEX idx_resource_type_created ON resource(type, created_at) COMMENT 'Type-based pagination';
```

#### Database Model Interfaces

```typescript
// Database model interfaces with ORM mapping

interface ResourceModel {
  /** Primary key identifier */
  id: number;
  /** Resource display name */
  name: string;
  /** Resource tier type */
  type: "basic" | "premium" | "enterprise";
  /** JSON metadata storage */
  metadata: Record<string, unknown> | null;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
  /** Soft delete timestamp */
  deletedAt: Date | null;
}

// Sequelize model definition interface
interface ResourceAttributes {
  id: number;
  name: string;
  type: "basic" | "premium" | "enterprise";
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

interface ResourceCreationAttributes {
  name: string;
  type: "basic" | "premium" | "enterprise";
  metadata?: Record<string, unknown> | null;
}

export interface BaseRow {
  id: number;
  created_at: Date | string;
  updated_at: Date | string;
  deleted_at: Date | string | null;
}

export interface QueryResult {
  insertId?: number;
  affectedRows?: number;
  changedRows?: number;
  warningCount?: number;
  message?: string;
  protocol41?: boolean;
}

export type DatabaseQueryResult<T> = [T[], QueryResult];

// ============================================================================
// TASK TABLE TYPES
// ============================================================================

export interface TaskRow extends BaseRow {
  user_id: number;
  title: string;
  description: string | null;
  due_date: Date | string | null;
  status: "not-started" | "in-progress" | "done";
  labels: string; // JSON string representation
}

// TODO: requires further thought, total_count cannot be at the same level as other fields, also TasRowWithCount doesnot make sense, conider TaskRowsWithCount, it can have array of tasks and total_count, offset, limit etc
export interface TaskRowWithCount extends TaskRow {
  total_count?: number; // For pagination queries
}

// ============================================================================
// USER TABLE TYPES
// ============================================================================

export interface UserRow extends BaseRow {
  email: string;
  password_hash: string;
  first_name: string | null;
  last_name: string | null;
  is_active: boolean;
  last_login_at: Date | string | null;
}

// ============================================================================
// GENERIC QUERY PARAMETER TYPES
// ============================================================================

export type QueryParameter =
  | string
  | number
  | boolean
  | Date
  | null
  | undefined;
export type QueryParameters = QueryParameter[];

// ============================================================================
// COUNT QUERY RESULT TYPES
// ============================================================================

export interface CountResult {
  count: number;
}

export interface StatusCountResult {
  status: string;
  count: number;
}

/**
 * User signup request payload
 */
export interface SignupRequest {
  /** Valid email address for user account */
  email: string;
  /** Password with minimum 8 characters, at least one uppercase, lowercase, and number */
  password: string;
}

/**
 * User signup response
 */
export interface SignupResponse {
  /** Unique user identifier */
  id: number;
  /** User email address */
  email: string;
  /** Account creation timestamp in ISO 8601 format */
  createdAt: string;
}

/**
 * User login request payload
 */
export interface LoginRequest {
  /** Registered email address */
  email: string;
  /** User password */
  password: string;
}

/**
 * User login response with JWT token
 */
export interface LoginResponse {
  /** JWT access token for authentication */
  token: string;
  /** Token expiration timestamp in ISO 8601 format */
  expiresAt: string;
  /** User profile information */
  user: UserProfile;
}

/**
 * User profile information
 */
export interface UserProfile {
  /** Unique user identifier */
  id: number;
  /** User email address */
  email: string;
  /** Account creation timestamp in ISO 8601 format */
  createdAt: string;
}

// ============================================================================
// JWT TYPES
// ============================================================================

/**
 * JWT token payload structure
 */
export interface JwtPayload {
  /** User ID (subject) */
  sub: number;
  /** User email */
  email: string;
  /** Token issued at timestamp (Unix) */
  iat: number;
  /** Token expiration timestamp (Unix) */
  exp: number;
  /** JWT ID for token revocation */
  jti: string;
  /** Token issuer */
  iss: string;
  /** Token audience */
  aud: string;
}

// ============================================================================
// CONTEXT TYPES
// ============================================================================

/**
 * Authenticated user context
 */
export interface AuthenticatedUser {
  /** User ID from JWT token */
  id: number;
  /** User email from JWT token */
  email: string;
  /** Token jti */
  jti: string;
}

/**
 * Express request with authenticated user context
 */
export interface AuthenticatedRequest<
  TBody = Record<string, string | number | boolean>,
  TQuery = Record<string, string>,
> {
  /** Request body payload */
  body: TBody;
  /** Query parameters */
  query: TQuery;
  /** Route parameters */
  params: Record<string, string>;
  /** Authenticated user information */
  user: AuthenticatedUser;
  /** Request correlation ID */
  correlationId: string;
  /** Request headers */
  headers: Record<string, string | string[]>;
}

/**
 * Authentication middleware request extension
 */
export interface AuthenticatedRequestExtension {
  /** Authenticated user context */
  user: AuthenticatedUser;
}


// ============================================================================
// MODEL ATTRIBUTES
// ============================================================================

/**
 * User model attributes as stored in database
 */
export interface UserAttributes {
  /** Primary key identifier */
  id: number;
  /** Unique email address */
  email: string;
  /** Bcrypt hashed password */
  passwordHash: string;
  /** Account creation timestamp */
  createdAt: Date;
  /** Last modification timestamp */
  updatedAt: Date;
  /** Soft delete timestamp (null = active) */
  deletedAt: Date | null;
}

/**
 * User creation attributes (excludes auto-generated fields)
 */
export interface UserCreationAttributes {
  /** Unique email address */
  email: string;
  /** Bcrypt hashed password */
  passwordHash: string;
}

// ============================================================================
// QUERY FILTERS
// ============================================================================

/**
 * User query filters for repository operations
 */
export interface UserFilters {
  /** Number of items to skip (offset) */
  offset?: number;
  /** Maximum number of items to return */
  limit?: number;
  /** Filter by email pattern */
  emailPattern?: string;
  /** Filter by creation date range */
  createdBefore?: Date;
  /** Filter by creation date range */
  createdAfter?: Date;
  /** Include soft-deleted records */
  includeSoftDeleted?: boolean;
}

/**
 * Authentication event for audit logging
 */
export interface AuthEvent {
  /** Event type */
  type: "login" | "logout" | "signup" | "token_refresh" | "password_change";
  /** User ID involved in event */
  userId: number;
  /** User email involved in event */
  email: string;
  /** Success status of the event */
  success: boolean;
  /** Failure reason if unsuccessful */
  failureReason?: string;
  /** Client IP address */
  clientIp: string;
  /** User agent string */
  userAgent: string;
}

```

### Phase 3: Service Interface Definition

Create internal service interfaces for business logic:

```typescript

/**
 * Database connection interface for executing queries and managing transactions
*/
export interface IDatabaseConnection {
  connect(): Promise<void>;

  // Task operations
  queryTasks(
    sql: string,
    params?: QueryParameters,
  ): Promise<DatabaseQueryResult<TaskRow>>;
  queryTasksWithCount(
    sql: string,
    params?: QueryParameters,
  ): Promise<DatabaseQueryResult<TaskRowWithCount>>;
  queryTaskCount(
    sql: string,
    params?: QueryParameters,
  ): Promise<DatabaseQueryResult<CountResult>>;
  queryTaskStatusCounts(
    sql: string,
    params?: QueryParameters,
  ): Promise<DatabaseQueryResult<StatusCountResult>>;

  // User operations
  queryUsers(
    sql: string,
    params?: QueryParameters,
  ): Promise<DatabaseQueryResult<UserRow>>;

  // Generic operations for inserts/updates/deletes
  execute(
    sql: string,
    params?: QueryParameters,
  ): Promise<[QueryResult[], QueryResult]>;

  beginTransaction(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  ping(): Promise<{ responseTimeMs: number }>;
  end(): Promise<void>;
  getStats(): { active: number; idle: number; max: number };
  isConnected(): boolean;
}

/**
 * User repository interface for user data access
 */
export interface IUserRepository {
  /**
   * Create a new user in the database
   *
   * @param attributes - User creation data
   * @param options - Transaction options
   * @returns Promise resolving to created user
   *
   * @throws {Error} When email already exists or database error occurs
   */
  create(
    attributes: UserCreationAttributes,
    options?: TransactionOptions,
  ): Promise<UserAttributes>;

  /**
   * Find user by primary key
   *
   * @param id - User identifier
   * @param options - Transaction options
   * @returns Promise resolving to user or null if not found
   */
  findByPk(
    id: number,
    options?: TransactionOptions,
  ): Promise<UserAttributes | null>;

  /**
   * Find user by email address
   *
   * @param email - User email address
   * @param options - Transaction options
   * @returns Promise resolving to user or null if not found
   */
  findByEmail(
    email: string,
    options?: TransactionOptions,
  ): Promise<UserAttributes | null>;

  /**
   * Update user by primary key
   *
   * @param id - User identifier
   * @param updates - Fields to update
   * @param options - Transaction options
   * @returns Promise resolving to updated user
   *
   * @throws {Error} When user not found or update fails
   */
  update(
    id: number,
    updates: Partial<UserCreationAttributes>,
    options?: TransactionOptions,
  ): Promise<UserAttributes>;

  /**
   * Soft delete user by primary key
   *
   * @param id - User identifier
   * @param options - Transaction options
   * @returns Promise resolving when deletion is complete
   *
   * @throws {Error} When user not found or deletion fails
   */
  delete(id: number, options?: TransactionOptions): Promise<void>;

  /**
   * Find users with filtering and pagination
   *
   * @param filters - Query filters and pagination options
   * @param options - Transaction options
   * @returns Promise resolving to paginated user results
   */
  findAndCountAll(
    filters: UserFilters,
    options?: TransactionOptions,
  ): Promise<PaginatedResult<UserAttributes>>;

  /**
   * Check if email address exists
   *
   * @param email - Email address to check
   * @param excludeUserId - User ID to exclude from check (for updates)
   * @param options - Transaction options
   * @returns Promise resolving to true if email exists
   */
  emailExists(
    email: string,
    excludeUserId?: number,
    options?: TransactionOptions,
  ): Promise<boolean>;
}

/**
 * Authentication service interface for user management and JWT operations
 */
export interface IAuthService {
  /**
   * Register a new user account
   *
   * @param request - User registration data
   * @param context - Service execution context
   * @returns Promise resolving to created user information
   *
   * @throws {ValidationError} When email format is invalid or password is weak
   * @throws {ConflictError} When email address is already registered
   * @throws {InternalServiceError} When user creation fails
   */
  signup(
    request: SignupRequest,
    context: ServiceContext,
  ): Promise<SignupResponse>;

  /**
   * Authenticate user and generate JWT token
   *
   * @param request - Login credentials
   * @param context - Service execution context
   * @returns Promise resolving to authentication token and user profile
   *
   * @throws {ValidationError} When email or password is missing
   * @throws {AuthenticationError} When credentials are invalid
   * @throws {InternalServiceError} When token generation fails
   */
  login(request: LoginRequest, context: ServiceContext): Promise<LoginResponse>;

  /**
   * Get user profile by ID
   *
   * @param userId - User identifier
   * @param context - Service execution context
   * @returns Promise resolving to user profile or null if not found
   *
   * @throws {NotFoundError} When user doesn't exist
   * @throws {InternalServiceError} When profile retrieval fails
   */
  getUserProfile(
    userId: number,
    context: ServiceContext,
  ): Promise<UserProfile | null>;

  /**
   * Validate JWT token and extract payload
   *
   * @param token - JWT token to validate
   * @param context - Service execution context
   * @returns Promise resolving to decoded token payload
   *
   * @throws {AuthenticationError} When token is invalid, expired, or malformed
   * @throws {InternalServiceError} When token validation fails
   */
  validateToken(token: string, context: ServiceContext): Promise<JwtPayload>;

  /**
   * Generate new JWT token for user
   *
   * @param userId - User identifier
   * @param email - User email address
   * @param context - Service execution context
   * @returns Promise resolving to signed JWT token
   *
   * @throws {InternalServiceError} When token generation fails
   */
  generateToken(
    userId: number,
    email: string,
    context: ServiceContext,
  ): Promise<string>;

  /**
   * Revoke JWT token (add to blacklist)
   *
   * @param tokenId - JWT ID (jti claim)
   * @param context - Service execution context
   * @returns Promise resolving when token is revoked
   *
   * @throws {InternalServiceError} When token revocation fails
   */
  revokeToken(tokenId: string, context: ServiceContext): Promise<void>;

  /**
   * Check if JWT token is revoked
   *
   * @param tokenId - JWT ID (jti claim)
   * @param context - Service execution context
   * @returns Promise resolving to true if token is revoked
   *
   * @throws {InternalServiceError} When blacklist check fails
   */
  isTokenRevoked(tokenId: string, context: ServiceContext): Promise<boolean>;
}

```

### Phase 4: Configuration Interface Definition

Define all configuration structures:

```typescript

/**
 * Application environment enumeration
 */
export type Environment = "development" | "test" | "staging" | "production";

/**
 * Log level enumeration
 */
export type LogLevel = "silly" | "debug" | "info" | "warn" | "error" | "fatal";

// ============================================================================
// MAIN APPLICATION CONFIGURATION
// ============================================================================

/**
 * HTTP server configuration
 */
export interface ServerConfig {
  /** Server port number (default: 3000) */
  port: number;
  /** Host to bind server to (default: '0.0.0.0') */
  host: string;
  /** Application environment */
  env: Environment;
  /** Request timeout in milliseconds (default: 30000) */
  requestTimeoutMs: number;
  /** Maximum request payload size (default: '10mb') */
  maxPayloadSize: string;
  /** Enable request logging (default: true) */
  enableRequestLogging: boolean;
  /** Trust proxy headers (default: false) */
  trustProxy: boolean;
}

/**
 * Database connection configuration
 */
export interface DatabaseConfig {
  /** Database host (default: 'localhost') */
  host: string;
  /** Database port (default: 3306 for MySQL) */
  port: number;
  /** Database name */
  database: string;
  /** Database username */
  username: string;
  /** Database password */
  password: string;
  /** Connection pool configuration */
  pool: {
    /** Maximum number of connections in pool (default: 10) */
    max: number;
    /** Minimum number of connections in pool (default: 2) */
    min: number;
    /** Connection idle timeout in milliseconds (default: 30000) */
    idleTimeoutMs: number;
    /** Connection acquire timeout in milliseconds (default: 60000) */
    acquireTimeoutMs: number;
  };
  /** Enable query logging (default: false for production) */
  logging: boolean;
}

/**
 * Authentication and JWT configuration
 */
export interface AuthConfig {
  /** JWT configuration */
  jwt: {
    /** JWT signing secret */
    secret: string;
    /** JWT signing algorithm (default: 'HS256') */
    algorithm: "HS256" | "HS384" | "HS512";
    /** Token expiration time (default: '1h') */
    expiresIn: string;
    /** Token issuer (default: 'todo-api') */
    issuer: string;
    /** Token audience (default: 'todo-app') */
    audience: string;
  };
  /** Password hashing configuration */
  password: {
    /** Bcrypt salt rounds (default: 12) */
    saltRounds: number;
  };
}

/**
 * Logging configuration
 */
export interface LoggingConfig {
  /** Log level (default: 'info') */
  level: LogLevel;
  /** Service name for structured logs */
  service: string;
  /** Application version for logs */
  version: string;
  /** Correlation ID header name (default: 'x-correlation-id') */
  correlationIdHeader: string;
}

/**
 * Feature flags configuration
 */
export interface FeatureConfig {
  /** Task creation feature enabled (default: true) */
  taskCreationEnabled: boolean;
  /** Task search feature enabled (default: true) */
  taskSearchEnabled: boolean;
  /** Task labels feature enabled (default: true) */
  taskLabelsEnabled: boolean;
  /** Bulk task operations enabled (default: false) */
  bulkOperationsEnabled: boolean;
  /** API documentation enabled (default: true for development) */
  apiDocsEnabled: boolean;
  /** Health check endpoints enabled (default: true) */
  healthCheckEnabled: boolean;
}

// ============================================================================
// ENVIRONMENT VARIABLE MAPPING
// ============================================================================

/**
 * Environment variable mapping interface
 */
export interface EnvironmentVariables {
  // Server
  PORT?: string;
  HOST?: string;
  NODE_ENV?: string;
  REQUEST_TIMEOUT?: string;
  MAX_PAYLOAD_SIZE?: string;

  // Database
  DB_HOST?: string;
  DB_PORT?: string;
  DB_NAME?: string;
  DB_USERNAME?: string;
  DB_PASSWORD?: string;
  DB_POOL_MAX?: string;
  DB_POOL_MIN?: string;

  // Authentication
  JWT_SECRET?: string;
  JWT_EXPIRES_IN?: string;
  JWT_ISSUER?: string;
  JWT_AUDIENCE?: string;
  PASSWORD_SALT_ROUNDS?: string;

  // Logging
  LOG_LEVEL?: string;
  LOG_SERVICE?: string;

  // Features
  FEATURE_TASK_CREATION?: string;
  FEATURE_TASK_SEARCH?: string;
  FEATURE_BULK_OPERATIONS?: string;
  FEATURE_AUDIT_LOGGING?: string;
}

/**
 * Complete application configuration
 */
export interface AppConfig {
  readonly nodeEnv: "development" | "test" | "staging" | "production";
  readonly port: number;
  readonly allowedOrigins: string[];
  readonly version: string;
  readonly rateLimitWindow: number;
  readonly rateLimitMax: number;
  readonly server: ServerConfig;
  readonly database: DatabaseConfig;
  readonly auth: AuthConfig;
  readonly logging: LoggingConfig;
  readonly features: FeatureConfig;
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Type guard to check if environment is valid
 */
export const isValidEnvironment = (env: string): env is Environment => {
  return ["development", "testing", "staging", "production"].includes(env);
};

/**
 * Type guard to check if log level is valid
 */
export const isValidLogLevel = (level: string): level is LogLevel => {
  return ["debug", "info", "warn", "error", "fatal"].includes(level);
};
```

### Phase 5: Vendor Integration Interfaces

Define vendor-specific interfaces if applicable:

```typescript
// Example: AWS S3 integration interface
interface S3StorageInterface {
  /**
   * Upload file to S3 bucket
   * @param key - S3 object key
   * @param content - File content
   * @param metadata - Optional metadata
   * @returns Promise resolving to upload result
   */
  uploadFile(
    key: string,
    content: Buffer | string,
    metadata?: Record<string, string>,
  ): Promise<S3UploadResult>;

  /**
   * Download file from S3 bucket
   * @param key - S3 object key
   * @returns Promise resolving to file content
   */
  downloadFile(key: string): Promise<Buffer>;

  /**
   * Delete file from S3 bucket
   * @param key - S3 object key
   * @returns Promise resolving when deletion is complete
   */
  deleteFile(key: string): Promise<void>;

  /**
   * Generate presigned URL for file access
   * @param key - S3 object key
   * @param expirationSeconds - URL expiration time
   * @returns Promise resolving to presigned URL
   */
  generatePresignedUrl(key: string, expirationSeconds: number): Promise<string>;
}

interface S3UploadResult {
  /** S3 object key */
  key: string;
  /** S3 bucket name */
  bucket: string;
  /** Object ETag */
  etag: string;
  /** Upload timestamp */
  uploadedAt: Date;
}
```

## MANDATORY VALIDATION CHECKLIST

### Interface Completeness

- [ ] All API endpoints have complete OpenAPI definitions
- [ ] All request/response types are strongly typed
- [ ] All database tables have complete schema definitions
- [ ] All service interfaces have comprehensive docstrings
- [ ] All configuration options are typed and documented
- [ ] All error scenarios have defined error types

### Documentation Standards

- [ ] Every interface method has TSDoc comments
- [ ] Parameter types and constraints are documented
- [ ] Return types and error conditions are specified
- [ ] Business logic constraints are clearly stated
- [ ] Database constraints match application logic

### Type Safety

- [ ] No `any` types in interface definitions
- [ ] Enums used instead of string literals where appropriate
- [ ] Optional vs required fields clearly marked
- [ ] Generic types properly constrained
- [ ] Union types used appropriately

### Security Compliance

- [ ] No sensitive data in examples
- [ ] Input validation constraints defined
- [ ] Authentication/authorization requirements documented
- [ ] Rate limiting specifications included

## FINAL OUTPUT FORMAT

````markdown
# Interface Freeze: [Feature Name]

## Executive Summary

**Frozen Interfaces:** [Count] API endpoints, [Count] database tables, [Count] service interfaces
**Documentation Status:** Complete with TSDoc comments and constraints
**Type Safety:** 100% strongly typed, no `any` types

## API Contract (OpenAPI 3.0)

```yaml
[Complete OpenAPI specification]
```
````

## Database Schema (SQL DDL)

```sql
[Complete SQL schema with all tables, indexes, constraints]
```

## TypeScript Interface Definitions

```typescript
// API Types
[All request/response interfaces]

// Service Types
[All business logic service interfaces]

// Repository Types
[All data access interfaces]

// Configuration Types
[All configuration interfaces]

// Vendor Integration Types
[All external service interfaces]
```

## Implementation Contract

- **API Stability:** These endpoint signatures are frozen and backward-compatible
- **Database Schema:** Migration scripts must maintain these constraints
- **Service Interfaces:** Business logic must implement these exact method signatures
- **Configuration:** Environment variables must match these type definitions
- **Documentation:** All implementations must maintain TSDoc compatibility

## Validation Results

- ✅ Interface completeness check passed
- ✅ Documentation standards check passed
- ✅ Type safety check passed
- ✅ Security compliance check passed

## Next Steps

- Interfaces are frozen and ready for parallel implementation
- Generate implementation scaffolding from interfaces
- Begin test-driven development against interface contracts
- Set up continuous integration to validate interface compliance

```

## INTERFACE FREEZE RULES

1. **Immutability:** Once frozen, interfaces can only have additive changes
2. **Backward Compatibility:** All changes must be backward-compatible
3. **Documentation Completeness:** Every public method must have complete documentation
4. **Type Safety:** All interfaces must be strongly typed with no `any` types
5. **Contract Testing:** Interface compliance must be validated in CI/CD
6. **Version Control:** Interface changes require ADR and approval process

## SUCCESS CRITERIA
- [ ] 100% of system boundaries have frozen, documented interfaces
- [ ] All interfaces are strongly typed with comprehensive documentation
- [ ] API contracts are complete and validation-ready
- [ ] Database schemas are fully specified with constraints
- [ ] Configuration interfaces cover all environment variables
- [ ] Vendor integrations have complete interface definitions
- [ ] Implementation teams can begin parallel development
```
