# Interface Freeze Stage Prompt

## ROLE

Senior software architect translating system designs into concrete, frozen interfaces with comprehensive documentation.

## OBJECTIVE

Transform the finalized architecture specification from Stage 2 into concrete, documented interfaces that serve as the implementation contract. Create type-safe interfaces that adheres to API contracts, database schemas, and configuration specifications from stage 2.

## STACK CONSTRAINTS (NON-NEGOTIABLE)

- **Tech Stack:** Node.js (Express), MySQL (Sequelize), React (Vite), AWS via Terraform
- **Naming:** kebab-case files/dirs, camelCase variables/functions, PascalCase classes, UPPER_SNAKE_CASE constants
- **Database:** snake_case tables/columns, singular table names, forward-only migrations
- **API:** Versioned (/v1/), backward-compatible, OpenAPI specs, standardized errors
- **Logging:** JSON structured logs {level, msg, service, env, correlationId, timestamp}

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

#### REST Endpoints

```yaml
# Complete OpenAPI spec with all endpoints
openapi: 3.0.3
info:
  title: [Service Name] API
  version: 1.0.0
  description: [Purpose and scope]

paths:
  /v1/resource:
    post:
      summary: Create new resource
      operationId: createResource
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateResourceRequest'
      responses:
        '201':
          description: Resource created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ResourceResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '500':
          $ref: '#/components/responses/InternalError'

components:
  schemas:
    CreateResourceRequest:
      type: object
      required: [name, type]
      properties:
        name:
          type: string
          minLength: 1
          maxLength: 255
          description: Resource display name
        type:
          type: string
          enum: [basic, premium, enterprise]
          description: Resource tier type

    ResourceResponse:
      type: object
      required: [id, name, type, createdAt]
      properties:
        id:
          type: integer
          format: int64
          description: Unique resource identifier
        name:
          type: string
          description: Resource display name
        type:
          type: string
          enum: [basic, premium, enterprise]
          description: Resource tier type
        createdAt:
          type: string
          format: date-time
          description: ISO 8601 creation timestamp

  responses:
    BadRequest:
      description: Invalid request parameters
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'

    InternalError:
      description: Internal server error
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'

    ErrorResponse:
      type: object
      required: [error]
      properties:
        error:
          type: object
          required: [code, message]
          properties:
            code:
              type: string
              description: Machine-readable error code
            message:
              type: string
              description: Human-readable error message
            details:
              type: array
              items:
                type: object
                properties:
                  field:
                    type: string
                  issue:
                    type: string
```

#### Request/Response Type Definitions

```typescript
// Complete TypeScript interfaces for all API contracts

// Request Types
interface CreateResourceRequest<T> {
  /** Resource */
  resource: T;

  /** Resource created by */
  by: User;

  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

interface UpdateResourceRequest<T> {
  /** Partial Resource */
  resource: Partial<T>;

  /** Resource updated by */
  by: User;

  /** Updated metadata */
  metadata?: Record<string, unknown>;
}

interface ApiResponse {
  transaction_id: string; // mirrors X-Request-Id / traceparent
  message: string; // e.g., "OK", "Created", or human context
  time_taken_ms?: number; // optional; mirrors X-Response-Time
  data?: TData; // resource | array | null
  meta?: TMeta;
  error?: ApiError;
}

// Error Types
interface ApiError {
  title: string;
  status: number;
  detail?: string;
  type?: string;
  instance?: string;
  code?: string; // machine code
  transaction_id?: string; // mirror header
  time_taken_ms?: number;
  details?: Array<{
    message: string;
    details?: Array<{ field: string; issue: string }>;
  }>;
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
```

### Phase 3: Service Interface Definition

Create internal service interfaces for business logic:

```typescript
// Business logic service interfaces

interface ResourceService {
  /**
   * Create a new resource
   * @param request - Resource creation parameters
   * @returns Promise resolving to created resource
   * @throws {ValidationError} When input validation fails
   * @throws {BusinessLogicError} When business rules are violated
   */
  createResource(request: CreateResourceRequest): Promise<ResourceResponse>;

  /**
   * Retrieve resource by ID
   * @param id - Resource identifier
   * @returns Promise resolving to resource or null if not found
   * @throws {NotFoundError} When resource doesn't exist
   */
  getResourceById(id: number): Promise<ResourceResponse | null>;

  /**
   * Update existing resource
   * @param id - Resource identifier
   * @param request - Update parameters
   * @returns Promise resolving to updated resource
   * @throws {NotFoundError} When resource doesn't exist
   * @throws {ValidationError} When input validation fails
   */
  updateResource(
    id: number,
    request: UpdateResourceRequest,
  ): Promise<ResourceResponse>;

  /**
   * Soft delete resource
   * @param id - Resource identifier
   * @returns Promise resolving when deletion is complete
   * @throws {NotFoundError} When resource doesn't exist
   */
  deleteResource(id: number): Promise<void>;

  /**
   * List resources with pagination
   * @param options - Query options
   * @returns Promise resolving to paginated resource list
   */
  listResources(options: ResourceListOptions): Promise<ResourceListResponse>;
}

interface ResourceListOptions {
  /** Page number (1-based) */
  page?: number;
  /** Items per page (default: 20, max: 100) */
  limit?: number;
  /** Filter by resource type */
  type?: "basic" | "premium" | "enterprise";
  /** Search by name (partial match) */
  nameSearch?: string;
  /** Sort by field */
  sortBy?: "name" | "createdAt" | "updatedAt";
  /** Sort direction */
  sortOrder?: "asc" | "desc";
}

// Repository interface for data access
interface ResourceRepository {
  /**
   * Create resource in database
   * @param attributes - Resource creation attributes
   * @returns Promise resolving to created resource model
   */
  create(attributes: ResourceCreationAttributes): Promise<ResourceModel>;

  /**
   * Find resource by primary key
   * @param id - Resource identifier
   * @returns Promise resolving to resource model or null
   */
  findByPk(id: number): Promise<ResourceModel | null>;

  /**
   * Update resource by primary key
   * @param id - Resource identifier
   * @param updates - Fields to update
   * @returns Promise resolving to updated resource model
   */
  update(
    id: number,
    updates: Partial<ResourceCreationAttributes>,
  ): Promise<ResourceModel>;

  /**
   * Soft delete resource by primary key
   * @param id - Resource identifier
   * @returns Promise resolving when deletion is complete
   */
  delete(id: number): Promise<void>;

  /**
   * Find resources with filtering and pagination
   * @param options - Query options
   * @returns Promise resolving to resources and total count
   */
  findAndCountAll(options: ResourceListOptions): Promise<{
    resources: ResourceModel[];
    total: number;
  }>;
}
```

### Phase 4: Configuration Interface Definition

Define all configuration structures:

```typescript
// Application configuration interfaces

interface AppConfig {
  /** Server configuration */
  server: ServerConfig;
  /** Database configuration */
  database: DatabaseConfig;
  /** Logging configuration */
  logging: LoggingConfig;
  /** Feature flags */
  features: FeatureConfig;
  /** External service configuration */
  external: ExternalConfig;
}

interface ServerConfig {
  /** Server port number */
  port: number;
  /** Server host binding */
  host: string;
  /** Environment name */
  env: "development" | "testing" | "staging" | "production";
  /** Request timeout in milliseconds */
  requestTimeout: number;
  /** Maximum request payload size */
  maxPayloadSize: string;
}

interface DatabaseConfig {
  /** Database host */
  host: string;
  /** Database port */
  port: number;
  /** Database name */
  database: string;
  /** Database username */
  username: string;
  /** Database password (from secret manager) */
  password: string;
  /** Connection pool configuration */
  pool: {
    /** Maximum number of connections */
    max: number;
    /** Minimum number of connections */
    min: number;
    /** Connection idle timeout */
    idle: number;
    /** Connection acquire timeout */
    acquire: number;
  };
  /** Query logging enabled */
  logging: boolean;
}

interface LoggingConfig {
  /** Log level */
  level: "debug" | "info" | "warn" | "error" | "fatal";
  /** Log format */
  format: "json" | "text";
  /** Service name for structured logs */
  service: string;
  /** Correlation ID header name */
  correlationIdHeader: string;
}

interface FeatureConfig {
  /** Resource creation enabled */
  resourceCreationEnabled: boolean;
  /** Advanced resource types enabled */
  advancedResourceTypesEnabled: boolean;
  /** Metadata storage enabled */
  metadataStorageEnabled: boolean;
}

interface ExternalConfig {
  /** Third-party service configurations */
  [serviceName: string]: {
    /** Service base URL */
    baseUrl: string;
    /** API key (from secret manager) */
    apiKey: string;
    /** Request timeout */
    timeout: number;
    /** Retry configuration */
    retry: {
      attempts: number;
      delay: number;
    };
  };
}
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

- [ ] No sensitive data in interface examples
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
