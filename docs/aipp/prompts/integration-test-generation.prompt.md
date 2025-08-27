# Integration Test Generation Stage Prompt

## ROLE

Senior test engineer creating comprehensive integration tests that validate end-to-end functionality, external dependencies, and system boundaries.

## OBJECTIVE

Generate complete integration test suites that validate the entire system working together, including API endpoints, database operations, external services, and cross-component interactions. Create tests that verify the system behaves correctly as an integrated whole while maintaining test isolation and repeatability.

## STACK CONSTRAINTS (NON-NEGOTIABLE)

- **Testing Framework:** Jest with Supertest for API testing
- **Database Testing:** Test containers or in-memory database
- **External Services:** Mock servers or test doubles
- **Environment:** Isolated test environment with transaction rollback
- **Coverage:** ≥80% integration test coverage of critical paths
- **Naming:** `*.integration.test.ts` for integration tests

## INPUTS

Paste the following from previous stages:

- **Stage 3 Output:** Frozen interface definitions and API contracts
- **Stage 5 Output:** Implemented code that passes all unit tests
- **Architecture Context:** Component interactions and data flow
- **External Dependencies:** Third-party services and APIs
- **Database Schema:** Complete schema with relationships

## INTEGRATION TEST GENERATION PROCESS

### Phase 1: Integration Test Strategy

Define comprehensive test coverage strategy:

#### Test Scope Definition

1. **API Integration Tests** - Full HTTP request/response cycle
2. **Database Integration Tests** - Real database operations with transactions
3. **Service Integration Tests** - Multi-service interactions
4. **External Service Tests** - Third-party API integrations
5. **End-to-End Workflows** - Complete user journeys
6. **Error Propagation Tests** - Error handling across layers

#### Test Environment Setup

```typescript
// tests/integration/setup/test-environment.ts
import { Sequelize } from "sequelize";
import { Application } from "express";
import { createApp } from "../../../src/app";
import { initializeDatabase } from "../../../src/config/database";

export class IntegrationTestEnvironment {
  private static instance: IntegrationTestEnvironment;
  private app: Application;
  private database: Sequelize;
  private transaction: any;

  /**
   * Initialize test environment with isolated database
   */
  public static async setup(): Promise<IntegrationTestEnvironment> {
    if (!IntegrationTestEnvironment.instance) {
      IntegrationTestEnvironment.instance = new IntegrationTestEnvironment();
      await IntegrationTestEnvironment.instance.initialize();
    }
    return IntegrationTestEnvironment.instance;
  }

  private async initialize(): Promise<void> {
    // Use test database or in-memory SQLite
    this.database = new Sequelize({
      dialect: "sqlite",
      storage: ":memory:",
      logging: false,
      define: {
        timestamps: true,
        paranoid: true,
        underscored: true,
      },
    });

    // Initialize models
    await initializeDatabase(this.database);

    // Sync database schema
    await this.database.sync({ force: true });

    // Create Express app with test configuration
    this.app = await createApp({
      database: this.database,
      environment: "test",
      logging: { level: "error" },
    });
  }

  /**
   * Start database transaction for test isolation
   */
  public async beginTransaction(): Promise<void> {
    this.transaction = await this.database.transaction();
  }

  /**
   * Rollback transaction to clean up test data
   */
  public async rollbackTransaction(): Promise<void> {
    if (this.transaction) {
      await this.transaction.rollback();
      this.transaction = null;
    }
  }

  /**
   * Get Express app for testing
   */
  public getApp(): Application {
    return this.app;
  }

  /**
   * Get database connection
   */
  public getDatabase(): Sequelize {
    return this.database;
  }

  /**
   * Clean up test environment
   */
  public async teardown(): Promise<void> {
    await this.database.close();
  }
}
```

### Phase 2: API Integration Tests

Generate comprehensive API endpoint integration tests:

```typescript
// tests/integration/api/resource-api.integration.test.ts
import request from "supertest";
import { IntegrationTestEnvironment } from "../setup/test-environment";
import { Application } from "express";
import { Resource } from "../../../src/models/resource";

describe("Resource API Integration Tests", () => {
  let testEnv: IntegrationTestEnvironment;
  let app: Application;

  beforeAll(async () => {
    testEnv = await IntegrationTestEnvironment.setup();
    app = testEnv.getApp();
  });

  afterAll(async () => {
    await testEnv.teardown();
  });

  beforeEach(async () => {
    await testEnv.beginTransaction();
  });

  afterEach(async () => {
    await testEnv.rollbackTransaction();
  });

  describe("POST /v1/resources - Create Resource", () => {
    it("should create resource and persist to database", async () => {
      // Arrange
      const createRequest = {
        resource: {
          name: "Integration Test Resource",
          type: "basic",
        },
        by: {
          id: 1,
          email: "test@example.com",
          name: "Test User",
        },
        metadata: { source: "integration-test" },
      };

      // Act
      const response = await request(app)
        .post("/v1/resources")
        .send(createRequest)
        .expect(201);

      // Assert API response
      expect(response.body).toMatchObject({
        transaction_id: expect.any(String),
        message: "Resource created successfully",
        time_taken_ms: expect.any(Number),
        data: {
          name: "Integration Test Resource",
          type: "basic",
        },
      });

      // Verify database persistence
      const dbResource = await Resource.findOne({
        where: { name: "Integration Test Resource" },
      });

      expect(dbResource).toBeTruthy();
      expect(dbResource?.name).toBe("Integration Test Resource");
      expect(dbResource?.type).toBe("basic");
      expect(dbResource?.metadata).toEqual({ source: "integration-test" });
    });

    it("should handle database constraint violations", async () => {
      // Arrange - Create first resource
      await Resource.create({
        name: "Duplicate Resource",
        type: "basic",
      });

      const duplicateRequest = {
        resource: {
          name: "Duplicate Resource", // Assuming unique constraint
          type: "premium",
        },
        by: {
          id: 1,
          email: "test@example.com",
          name: "Test User",
        },
      };

      // Act
      const response = await request(app)
        .post("/v1/resources")
        .send(duplicateRequest)
        .expect(422);

      // Assert
      expect(response.body.error).toMatchObject({
        title: "Business Logic Error",
        status: 422,
        detail: expect.stringContaining("unique"),
      });
    });

    it("should validate request payload against schema", async () => {
      // Arrange
      const invalidRequests = [
        {
          scenario: "missing resource name",
          payload: {
            resource: { type: "basic" },
            by: { id: 1, email: "test@example.com", name: "Test" },
          },
          expectedError: "name is required",
        },
        {
          scenario: "invalid type",
          payload: {
            resource: { name: "Test", type: "invalid" },
            by: { id: 1, email: "test@example.com", name: "Test" },
          },
          expectedError: "must be one of: basic, premium, enterprise",
        },
        {
          scenario: "name too long",
          payload: {
            resource: { name: "x".repeat(256), type: "basic" },
            by: { id: 1, email: "test@example.com", name: "Test" },
          },
          expectedError: "must be 255 characters or less",
        },
      ];

      // Act & Assert
      for (const { scenario, payload, expectedError } of invalidRequests) {
        const response = await request(app)
          .post("/v1/resources")
          .send(payload)
          .expect(400);

        expect(response.body.error.detail).toContain(expectedError);
      }
    });
  });

  describe("GET /v1/resources/:id - Get Resource", () => {
    it("should retrieve resource from database", async () => {
      // Arrange - Create resource in database
      const resource = await Resource.create({
        name: "Test Resource",
        type: "premium",
        metadata: { key: "value" },
      });

      // Act
      const response = await request(app)
        .get(`/v1/resources/${resource.id}`)
        .expect(200);

      // Assert
      expect(response.body).toMatchObject({
        transaction_id: expect.any(String),
        message: "OK",
        data: {
          id: resource.id,
          name: "Test Resource",
          type: "premium",
          createdAt: expect.any(String),
        },
      });
    });

    it("should return 404 for non-existent resource", async () => {
      // Act
      const response = await request(app)
        .get("/v1/resources/999999")
        .expect(404);

      // Assert
      expect(response.body.error).toMatchObject({
        title: "Not Found",
        status: 404,
        detail: expect.stringContaining("999999"),
      });
    });

    it("should handle soft-deleted resources", async () => {
      // Arrange - Create and soft-delete resource
      const resource = await Resource.create({
        name: "Deleted Resource",
        type: "basic",
      });

      await resource.destroy(); // Soft delete

      // Act
      const response = await request(app)
        .get(`/v1/resources/${resource.id}`)
        .expect(404);

      // Assert
      expect(response.body.error.detail).toContain("not found");
    });
  });

  describe("GET /v1/resources - List Resources", () => {
    beforeEach(async () => {
      // Create test data
      const resources = [];
      for (let i = 1; i <= 25; i++) {
        resources.push({
          name: `Resource ${i}`,
          type: i % 3 === 0 ? "premium" : i % 2 === 0 ? "enterprise" : "basic",
          metadata: { index: i },
        });
      }
      await Resource.bulkCreate(resources);
    });

    it("should paginate results correctly", async () => {
      // Act - Get first page
      const page1 = await request(app)
        .get("/v1/resources")
        .query({ page: 1, limit: 10 })
        .expect(200);

      // Assert first page
      expect(page1.body.data).toHaveLength(10);
      expect(page1.body.meta).toEqual({
        page: 1,
        limit: 10,
        total: 25,
        totalPages: 3,
      });

      // Act - Get second page
      const page2 = await request(app)
        .get("/v1/resources")
        .query({ page: 2, limit: 10 })
        .expect(200);

      // Assert second page
      expect(page2.body.data).toHaveLength(10);
      expect(page2.body.meta.page).toBe(2);

      // Verify no duplicate data between pages
      const page1Ids = page1.body.data.map((r: any) => r.id);
      const page2Ids = page2.body.data.map((r: any) => r.id);
      const intersection = page1Ids.filter((id: number) =>
        page2Ids.includes(id),
      );
      expect(intersection).toHaveLength(0);
    });

    it("should filter by type correctly", async () => {
      // Act
      const response = await request(app)
        .get("/v1/resources")
        .query({ type: "premium" })
        .expect(200);

      // Assert
      expect(response.body.data.every((r: any) => r.type === "premium")).toBe(
        true,
      );
      expect(response.body.meta.total).toBe(8); // 25/3 rounded
    });

    it("should search by name pattern", async () => {
      // Act
      const response = await request(app)
        .get("/v1/resources")
        .query({ nameSearch: "Resource 1" })
        .expect(200);

      // Assert
      const names = response.body.data.map((r: any) => r.name);
      expect(names).toContain("Resource 1");
      expect(names).toContain("Resource 10");
      expect(names).toContain("Resource 11");
    });

    it("should sort results correctly", async () => {
      // Act - Sort by name descending
      const response = await request(app)
        .get("/v1/resources")
        .query({ sortBy: "name", sortOrder: "desc", limit: 5 })
        .expect(200);

      // Assert
      const names = response.body.data.map((r: any) => r.name);
      expect(names[0]).toBe("Resource 9");
      expect(names[1]).toBe("Resource 8");
    });
  });
});
```

### Phase 3: Database Integration Tests

Test database operations and transactions:

```typescript
// tests/integration/database/resource-repository.integration.test.ts
import { IntegrationTestEnvironment } from "../setup/test-environment";
import { ResourceRepository } from "../../../src/repositories/resource-repository";
import { Resource } from "../../../src/models/resource";
import { Sequelize, Transaction } from "sequelize";

describe("Resource Repository Database Integration", () => {
  let testEnv: IntegrationTestEnvironment;
  let database: Sequelize;
  let repository: ResourceRepository;

  beforeAll(async () => {
    testEnv = await IntegrationTestEnvironment.setup();
    database = testEnv.getDatabase();
    repository = new ResourceRepository();
  });

  afterAll(async () => {
    await testEnv.teardown();
  });

  beforeEach(async () => {
    await database.sync({ force: true });
  });

  describe("Transaction Management", () => {
    it("should rollback transaction on error", async () => {
      // Arrange
      const correlationId = "test-transaction-123";
      let transaction: Transaction;

      try {
        // Act - Start transaction
        transaction = await database.transaction();

        // Create resource within transaction
        await Resource.create(
          {
            name: "Transaction Test",
            type: "basic",
          },
          { transaction },
        );

        // Verify resource exists in transaction
        const inTransaction = await Resource.findOne({
          where: { name: "Transaction Test" },
          transaction,
        });
        expect(inTransaction).toBeTruthy();

        // Simulate error
        throw new Error("Simulated error");
      } catch (error) {
        // Rollback transaction
        if (transaction!) {
          await transaction!.rollback();
        }
      }

      // Assert - Resource should not exist after rollback
      const afterRollback = await Resource.findOne({
        where: { name: "Transaction Test" },
      });
      expect(afterRollback).toBeNull();
    });

    it("should handle concurrent transactions correctly", async () => {
      // Arrange
      const promises = [];

      // Act - Create multiple resources concurrently
      for (let i = 0; i < 10; i++) {
        promises.push(
          repository.create(
            {
              name: `Concurrent Resource ${i}`,
              type: "basic",
            },
            `correlation-${i}`,
          ),
        );
      }

      const results = await Promise.all(promises);

      // Assert - All resources should be created
      expect(results).toHaveLength(10);

      const count = await Resource.count();
      expect(count).toBe(10);

      // Verify unique IDs
      const ids = results.map((r) => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(10);
    });
  });

  describe("Database Constraints", () => {
    it("should enforce unique constraints", async () => {
      // Arrange - Create first resource
      await repository.create(
        {
          name: "Unique Resource",
          type: "basic",
        },
        "correlation-1",
      );

      // Act & Assert - Attempt duplicate
      await expect(
        repository.create(
          {
            name: "Unique Resource",
            type: "premium",
          },
          "correlation-2",
        ),
      ).rejects.toThrow(/unique/i);
    });

    it("should enforce check constraints", async () => {
      // Act & Assert - Invalid type
      await expect(
        Resource.create({
          name: "Invalid Type Resource",
          type: "invalid" as any,
        }),
      ).rejects.toThrow(/constraint/i);
    });

    it("should handle cascade deletes correctly", async () => {
      // This would test relationships if they exist
      // Example with related models
    });
  });

  describe("Query Performance", () => {
    beforeEach(async () => {
      // Create large dataset
      const resources = [];
      for (let i = 0; i < 1000; i++) {
        resources.push({
          name: `Perf Test Resource ${i}`,
          type: ["basic", "premium", "enterprise"][i % 3],
          metadata: { index: i },
        });
      }
      await Resource.bulkCreate(resources);
    });

    it("should use indexes for type queries", async () => {
      // Act
      const startTime = Date.now();
      const results = await repository.findAndCountAll(
        {
          type: "premium",
          limit: 100,
        },
        "perf-test-1",
      );
      const queryTime = Date.now() - startTime;

      // Assert
      expect(results.total).toBeGreaterThan(300);
      expect(queryTime).toBeLessThan(100); // Should be fast with index
    });

    it("should handle pagination efficiently", async () => {
      // Act - Query different pages
      const page1Time = Date.now();
      const page1 = await repository.findAndCountAll(
        {
          page: 1,
          limit: 50,
        },
        "perf-test-2",
      );
      const page1Duration = Date.now() - page1Time;

      const page10Time = Date.now();
      const page10 = await repository.findAndCountAll(
        {
          page: 10,
          limit: 50,
        },
        "perf-test-3",
      );
      const page10Duration = Date.now() - page10Time;

      // Assert - Later pages shouldn't be significantly slower
      expect(page10Duration).toBeLessThan(page1Duration * 2);
    });
  });
});
```

### Phase 4: Service Integration Tests

Test service layer with real dependencies:

```typescript
// tests/integration/services/resource-service.integration.test.ts
import { IntegrationTestEnvironment } from "../setup/test-environment";
import { ResourceService } from "../../../src/services/resource-service";
import { ResourceRepository } from "../../../src/repositories/resource-repository";
import { Resource } from "../../../src/models/resource";

describe("Resource Service Integration", () => {
  let testEnv: IntegrationTestEnvironment;
  let service: ResourceService;
  let repository: ResourceRepository;

  beforeAll(async () => {
    testEnv = await IntegrationTestEnvironment.setup();
    repository = new ResourceRepository();
    service = new ResourceService(repository);
  });

  afterAll(async () => {
    await testEnv.teardown();
  });

  beforeEach(async () => {
    await testEnv.beginTransaction();
  });

  afterEach(async () => {
    await testEnv.rollbackTransaction();
  });

  describe("Business Logic with Database", () => {
    it("should enforce business rules during creation", async () => {
      // Arrange
      const request = {
        resource: {
          name: "Business Rule Test",
          type: "premium",
        },
        by: {
          id: 1,
          email: "admin@example.com",
          name: "Admin User",
        },
        metadata: { validated: true },
      };

      // Act
      const result = await service.createResource(request, "test-correlation");

      // Assert - Service response
      expect(result.data).toMatchObject({
        name: "Business Rule Test",
        type: "premium",
      });

      // Verify database state
      const dbResource = await Resource.findOne({
        where: { name: "Business Rule Test" },
      });
      expect(dbResource?.metadata).toEqual({ validated: true });
    });

    it("should handle complex queries correctly", async () => {
      // Arrange - Create test data
      for (let i = 0; i < 20; i++) {
        await Resource.create({
          name: `Complex Query ${i}`,
          type: i < 10 ? "basic" : "premium",
          metadata: { category: i < 5 ? "A" : i < 15 ? "B" : "C" },
        });
      }

      // Act - Complex filter
      const results = await service.listResources(
        {
          type: "basic",
          nameSearch: "Query",
          sortBy: "name",
          sortOrder: "asc",
          limit: 5,
        },
        "complex-query",
      );

      // Assert
      expect(results.resources).toHaveLength(5);
      expect(results.pagination.total).toBe(10);
      expect(results.resources[0].name).toBe("Complex Query 0");
    });
  });

  describe("Error Handling Integration", () => {
    it("should properly propagate database errors", async () => {
      // Arrange - Force database error
      const request = {
        resource: {
          name: null as any, // Will violate NOT NULL constraint
          type: "basic",
        },
        by: {
          id: 1,
          email: "test@example.com",
          name: "Test",
        },
      };

      // Act & Assert
      await expect(
        service.createResource(request, "error-test"),
      ).rejects.toThrow("Resource name is required");
    });

    it("should handle transaction failures gracefully", async () => {
      // Test transaction rollback on service errors
      // Implementation depends on specific business logic
    });
  });
});
```

### Phase 5: External Service Integration Tests

Test third-party integrations with mock servers:

```typescript
// tests/integration/external/s3-storage.integration.test.ts
import nock from "nock";
import { S3StorageService } from "../../../src/services/s3-storage";
import { IntegrationTestEnvironment } from "../setup/test-environment";

describe("S3 Storage Integration", () => {
  let testEnv: IntegrationTestEnvironment;
  let s3Service: S3StorageService;

  beforeAll(async () => {
    testEnv = await IntegrationTestEnvironment.setup();
    s3Service = new S3StorageService({
      region: "us-east-1",
      bucket: "test-bucket",
      accessKeyId: "test-key",
      secretAccessKey: "test-secret",
    });
  });

  afterAll(async () => {
    await testEnv.teardown();
  });

  beforeEach(() => {
    // Setup mock S3 endpoints
    nock("https://test-bucket.s3.amazonaws.com")
      .persist()
      .put(/.*/)
      .reply(200, "", {
        ETag: '"mock-etag-123"',
        "x-amz-request-id": "mock-request-id",
      });

    nock("https://test-bucket.s3.amazonaws.com")
      .persist()
      .get(/.*/)
      .reply(200, Buffer.from("mock file content"));

    nock("https://test-bucket.s3.amazonaws.com")
      .persist()
      .delete(/.*/)
      .reply(204);
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe("S3 Operations", () => {
    it("should upload file to S3", async () => {
      // Act
      const result = await s3Service.uploadFile(
        "test-file.txt",
        Buffer.from("test content"),
        { contentType: "text/plain" },
      );

      // Assert
      expect(result).toMatchObject({
        key: "test-file.txt",
        bucket: "test-bucket",
        etag: '"mock-etag-123"',
      });
    });

    it("should handle S3 errors gracefully", async () => {
      // Arrange - Mock S3 error
      nock.cleanAll();
      nock("https://test-bucket.s3.amazonaws.com")
        .put("/error-file.txt")
        .reply(
          403,
          '<?xml version="1.0" encoding="UTF-8"?><Error><Code>AccessDenied</Code></Error>',
        );

      // Act & Assert
      await expect(
        s3Service.uploadFile("error-file.txt", Buffer.from("content")),
      ).rejects.toThrow(/access denied/i);
    });

    it("should retry on transient failures", async () => {
      // Arrange - Mock transient failure then success
      nock.cleanAll();
      nock("https://test-bucket.s3.amazonaws.com")
        .put("/retry-file.txt")
        .reply(503, "Service Unavailable")
        .put("/retry-file.txt")
        .reply(200, "", { ETag: '"success-etag"' });

      // Act
      const result = await s3Service.uploadFile(
        "retry-file.txt",
        Buffer.from("retry content"),
      );

      // Assert
      expect(result.etag).toBe('"success-etag"');
    });
  });
});
```

### Phase 6: End-to-End Workflow Tests

Test complete user journeys:

```typescript
// tests/integration/workflows/resource-lifecycle.integration.test.ts
import request from "supertest";
import { IntegrationTestEnvironment } from "../setup/test-environment";
import { Application } from "express";

describe("Resource Lifecycle E2E Workflow", () => {
  let testEnv: IntegrationTestEnvironment;
  let app: Application;

  beforeAll(async () => {
    testEnv = await IntegrationTestEnvironment.setup();
    app = testEnv.getApp();
  });

  afterAll(async () => {
    await testEnv.teardown();
  });

  it("should complete full resource lifecycle", async () => {
    // Step 1: Create resource
    const createResponse = await request(app)
      .post("/v1/resources")
      .send({
        resource: { name: "Lifecycle Test", type: "basic" },
        by: { id: 1, email: "test@example.com", name: "Test User" },
      })
      .expect(201);

    const resourceId = createResponse.body.data.id;
    expect(resourceId).toBeDefined();

    // Step 2: Retrieve created resource
    const getResponse = await request(app)
      .get(`/v1/resources/${resourceId}`)
      .expect(200);

    expect(getResponse.body.data.name).toBe("Lifecycle Test");

    // Step 3: Update resource
    const updateResponse = await request(app)
      .put(`/v1/resources/${resourceId}`)
      .send({
        resource: { name: "Updated Lifecycle Test", type: "premium" },
        by: { id: 1, email: "test@example.com", name: "Test User" },
      })
      .expect(200);

    expect(updateResponse.body.data.name).toBe("Updated Lifecycle Test");
    expect(updateResponse.body.data.type).toBe("premium");

    // Step 4: List resources (verify it appears)
    const listResponse = await request(app)
      .get("/v1/resources")
      .query({ nameSearch: "Updated Lifecycle" })
      .expect(200);

    expect(listResponse.body.data).toHaveLength(1);
    expect(listResponse.body.data[0].id).toBe(resourceId);

    // Step 5: Delete resource
    await request(app).delete(`/v1/resources/${resourceId}`).expect(204);

    // Step 6: Verify deletion
    await request(app).get(`/v1/resources/${resourceId}`).expect(404);
  });

  it("should handle concurrent operations correctly", async () => {
    // Create multiple resources concurrently
    const createPromises = [];
    for (let i = 0; i < 10; i++) {
      createPromises.push(
        request(app)
          .post("/v1/resources")
          .send({
            resource: { name: `Concurrent ${i}`, type: "basic" },
            by: { id: 1, email: "test@example.com", name: "Test" },
          }),
      );
    }

    const createResults = await Promise.all(createPromises);

    // Verify all succeeded
    expect(createResults.every((r) => r.status === 201)).toBe(true);

    // Verify all have unique IDs
    const ids = createResults.map((r) => r.body.data.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(10);
  });
});
```

## MANDATORY INTEGRATION TEST CHECKLIST

### Test Coverage Requirements

- [ ] **API Integration:** All endpoints tested with real HTTP requests
- [ ] **Database Integration:** Real database operations with transactions
- [ ] **Service Integration:** Multi-layer interactions tested
- [ ] **External Services:** Third-party APIs mocked and tested
- [ ] **E2E Workflows:** Complete user journeys validated
- [ ] **Error Scenarios:** Error propagation across layers tested

### Test Quality Standards

- [ ] **Test Isolation:** Each test is independent and repeatable
- [ ] **Transaction Rollback:** Database state cleaned between tests
- [ ] **Mock Cleanup:** External service mocks reset between tests
- [ ] **Deterministic Results:** Tests produce consistent results
- [ ] **Performance Validation:** Response times within SLA

### Environment Standards

- [ ] **Test Database:** Isolated test database or in-memory DB
- [ ] **Configuration:** Test-specific configuration loaded
- [ ] **External Mocks:** All external services properly mocked
- [ ] **Seed Data:** Consistent test data setup
- [ ] **Cleanup:** Proper teardown after test completion

## FINAL OUTPUT FORMAT

````markdown
# Integration Test Suite: [Feature Name]

## Test Coverage Summary

**Total Integration Tests:** [Count] tests across [Count] test files
**API Coverage:** [Count] endpoints tested
**Database Operations:** [Count] repository methods tested
**External Services:** [Count] integrations tested
**E2E Workflows:** [Count] complete journeys tested

## Generated Test Files

### Test Infrastructure

- `tests/integration/setup/test-environment.ts` - Test environment configuration
- `tests/integration/setup/test-database.ts` - Database setup utilities
- `tests/integration/setup/mock-services.ts` - External service mocks

### API Integration Tests

- `tests/integration/api/resource-api.integration.test.ts` - Resource API tests
- `tests/integration/api/validation.integration.test.ts` - Request validation tests
- `tests/integration/api/error-handling.integration.test.ts` - Error response tests

### Database Integration Tests

- `tests/integration/database/resource-repository.integration.test.ts` - Repository tests
- `tests/integration/database/transactions.integration.test.ts` - Transaction tests
- `tests/integration/database/constraints.integration.test.ts` - Constraint tests

### Service Integration Tests

- `tests/integration/services/resource-service.integration.test.ts` - Service layer tests
- `tests/integration/services/business-logic.integration.test.ts` - Business rule tests

### External Service Tests

- `tests/integration/external/s3-storage.integration.test.ts` - S3 integration tests
- `tests/integration/external/third-party-api.integration.test.ts` - API integration tests

### E2E Workflow Tests

- `tests/integration/workflows/resource-lifecycle.integration.test.ts` - Complete lifecycle
- `tests/integration/workflows/user-journey.integration.test.ts` - User journey tests

## Test Execution Commands

```bash
# Run all integration tests
npm run test:integration

# Run specific integration test suite
npm run test:integration -- resource-api

# Run with coverage
npm run test:integration:coverage

# Run in watch mode
npm run test:integration:watch
```
````

## Integration Test Results

- ✅ All API endpoints return correct status codes
- ✅ Database operations commit/rollback correctly
- ✅ External service failures handled gracefully
- ✅ Concurrent operations handled without conflicts
- ✅ Performance within acceptable thresholds

## Test Environment Configuration

```json
{
  "database": "sqlite::memory:",
  "logging": { "level": "error" },
  "external": {
    "s3": { "mock": true },
    "emailService": { "mock": true }
  },
  "features": {
    "rateLimit": false,
    "authentication": "mock"
  }
}
```

## Next Steps

- Integration tests ready for Stage 7 implementation
- All system boundaries properly tested
- External dependencies mocked and validated
- Ready for integration implementation phase

```

## SUCCESS CRITERIA
- [ ] ≥80% integration test coverage of critical paths
- [ ] All API endpoints have integration tests
- [ ] Database operations tested with real transactions
- [ ] External services properly mocked and tested
- [ ] Complete E2E workflows validated
- [ ] Test isolation and repeatability ensured
- [ ] Performance thresholds validated
- [ ] Error scenarios properly tested across layers
- [ ] Test environment properly configured and isolated
```
