# Unit Test Generation Stage Prompt

## ROLE
Senior test engineer generating comprehensive unit tests for frozen interfaces and implementation contracts.

## OBJECTIVE
Generate complete unit test suites for all interfaces, services, repositories, and API endpoints from Stage 3 Interface Freeze. Create table-driven tests, mocks, fixtures, and test utilities that ensure 100% interface compliance and behavior validation.

## STACK CONSTRAINTS (NON-NEGOTIABLE)
- **Testing Framework:** Jest with TypeScript support
- **Mocking:** Jest mocks, @types/jest, ts-jest
- **API Testing:** Supertest for HTTP endpoint testing
- **Database Testing:** Jest with in-memory SQLite or test containers
- **Coverage:** ≥90% line coverage, 100% interface coverage
- **Naming:** `*.test.ts` for unit tests, `*.integration.test.ts` for integration tests

## INPUTS
Paste the following from Stage 3 Interface Freeze output:
- Complete TypeScript interface definitions
- API contract (OpenAPI specification)
- Database schema and model interfaces
- Service interface definitions
- Configuration interfaces
- Error handling specifications

## UNIT TEST GENERATION PROCESS

### Phase 1: API Endpoint Test Generation

Generate comprehensive API tests for all endpoints:

```typescript
// tests/api/resource.test.ts
import request from 'supertest';
import { App } from '../../src/app';
import { ResourceService } from '../../src/services/resource-service';
import { CreateResourceRequest, UpdateResourceRequest, ApiResponse, ApiError } from '../../src/types';

describe('Resource API Endpoints', () => {
  let app: App;
  let mockResourceService: jest.Mocked<ResourceService>;

  beforeEach(() => {
    mockResourceService = {
      createResource: jest.fn(),
      getResourceById: jest.fn(),
      updateResource: jest.fn(),
      deleteResource: jest.fn(),
      listResources: jest.fn(),
    } as jest.Mocked<ResourceService>;

    app = new App({ resourceService: mockResourceService });
  });

  describe('POST /v1/resources', () => {
    const validRequest: CreateResourceRequest<{ name: string; type: string }> = {
      resource: {
        name: 'Test Resource',
        type: 'basic'
      },
      by: {
        id: 1,
        email: 'test@example.com',
        name: 'Test User'
      },
      metadata: { source: 'api' }
    };

    it('should create resource with valid request', async () => {
      // Arrange
      const expectedResponse = {
        data: {
          id: 1,
          name: 'Test Resource',
          type: 'basic',
          createdAt: '2024-01-01T00:00:00.000Z'
        },
        respondedAt: '2024-01-01T00:00:00.000Z',
        timeTaken: 150,
        metadata: { source: 'api' }
      };

      mockResourceService.createResource.mockResolvedValue(expectedResponse);

      // Act
      const response = await request(app.getServer())
        .post('/v1/resources')
        .send(validRequest)
        .expect(201);

      // Assert
      expect(response.body).toEqual({
        transaction_id: expect.any(String),
        message: 'Resource created successfully',
        time_taken_ms: expect.any(Number),
        data: expectedResponse.data
      });

      expect(mockResourceService.createResource).toHaveBeenCalledWith(validRequest);
    });

    it('should return 400 for invalid request body', async () => {
      // Arrange
      const invalidRequest = {
        resource: {
          name: '', // Invalid: empty name
          type: 'invalid-type' // Invalid: not in enum
        }
      };

      // Act
      const response = await request(app.getServer())
        .post('/v1/resources')
        .send(invalidRequest)
        .expect(400);

      // Assert
      expect(response.body).toMatchObject({
        transaction_id: expect.any(String),
        message: 'Validation failed',
        error: {
          title: 'Bad Request',
          status: 400,
          detail: 'Request validation failed',
          details: expect.arrayContaining([
            expect.objectContaining({
              message: expect.stringContaining('name'),
              details: expect.arrayContaining([
                { field: 'name', issue: 'must not be empty' }
              ])
            })
          ])
        }
      });
    });

    it('should return 500 for service errors', async () => {
      // Arrange
      mockResourceService.createResource.mockRejectedValue(
        new Error('Database connection failed')
      );

      // Act
      const response = await request(app.getServer())
        .post('/v1/resources')
        .send(validRequest)
        .expect(500);

      // Assert
      expect(response.body).toMatchObject({
        transaction_id: expect.any(String),
        message: 'Internal server error',
        error: {
          title: 'Internal Server Error',
          status: 500,
          detail: expect.any(String)
        }
      });
    });

    // Table-driven test for validation scenarios
    it.each([
      {
        scenario: 'missing name field',
        request: { resource: { type: 'basic' }, by: validRequest.by },
        expectedError: { field: 'resource.name', issue: 'is required' }
      },
      {
        scenario: 'name too long',
        request: { resource: { name: 'x'.repeat(256), type: 'basic' }, by: validRequest.by },
        expectedError: { field: 'resource.name', issue: 'must be 255 characters or less' }
      },
      {
        scenario: 'invalid type',
        request: { resource: { name: 'Test', type: 'invalid' }, by: validRequest.by },
        expectedError: { field: 'resource.type', issue: 'must be one of: basic, premium, enterprise' }
      },
      {
        scenario: 'missing by field',
        request: { resource: { name: 'Test', type: 'basic' } },
        expectedError: { field: 'by', issue: 'is required' }
      }
    ])('should validate request: $scenario', async ({ request, expectedError }) => {
      // Act
      const response = await request(app.getServer())
        .post('/v1/resources')
        .send(request)
        .expect(400);

      // Assert
      expect(response.body.error.details[0].details).toContainEqual(expectedError);
    });
  });

  describe('GET /v1/resources/:id', () => {
    it('should return resource by ID', async () => {
      // Arrange
      const resourceId = 1;
      const expectedResource = {
        data: {
          id: resourceId,
          name: 'Test Resource',
          type: 'basic' as const,
          createdAt: '2024-01-01T00:00:00.000Z'
        },
        respondedAt: '2024-01-01T00:00:00.000Z',
        timeTaken: 50,
        metadata: {}
      };

      mockResourceService.getResourceById.mockResolvedValue(expectedResource);

      // Act
      const response = await request(app.getServer())
        .get(`/v1/resources/${resourceId}`)
        .expect(200);

      // Assert
      expect(response.body).toEqual({
        transaction_id: expect.any(String),
        message: 'OK',
        time_taken_ms: expect.any(Number),
        data: expectedResource.data
      });

      expect(mockResourceService.getResourceById).toHaveBeenCalledWith(resourceId);
    });

    it('should return 404 for non-existent resource', async () => {
      // Arrange
      const resourceId = 999;
      mockResourceService.getResourceById.mockResolvedValue(null);

      // Act
      const response = await request(app.getServer())
        .get(`/v1/resources/${resourceId}`)
        .expect(404);

      // Assert
      expect(response.body).toMatchObject({
        transaction_id: expect.any(String),
        message: 'Resource not found',
        error: {
          title: 'Not Found',
          status: 404,
          detail: `Resource with ID ${resourceId} not found`
        }
      });
    });

    it.each([
      { id: 'invalid', expectedError: 'must be a number' },
      { id: '0', expectedError: 'must be greater than 0' },
      { id: '-1', expectedError: 'must be greater than 0' }
    ])('should validate resource ID parameter: $id', async ({ id, expectedError }) => {
      // Act
      const response = await request(app.getServer())
        .get(`/v1/resources/${id}`)
        .expect(400);

      // Assert
      expect(response.body.error.details[0].details).toContainEqual({
        field: 'id',
        issue: expectedError
      });
    });
  });

  describe('GET /v1/resources', () => {
    it('should return paginated resource list', async () => {
      // Arrange
      const mockResponse = {
        resources: [
          { id: 1, name: 'Resource 1', type: 'basic' as const },
          { id: 2, name: 'Resource 2', type: 'premium' as const }
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1
        }
      };

      mockResourceService.listResources.mockResolvedValue(mockResponse);

      // Act
      const response = await request(app.getServer())
        .get('/v1/resources')
        .expect(200);

      // Assert
      expect(response.body).toEqual({
        transaction_id: expect.any(String),
        message: 'OK',
        time_taken_ms: expect.any(Number),
        data: mockResponse.resources,
        meta: mockResponse.pagination
      });

      expect(mockResourceService.listResources).toHaveBeenCalledWith({});
    });

    it('should handle query parameters', async () => {
      // Arrange
      const queryParams = {
        page: 2,
        limit: 10,
        type: 'premium',
        nameSearch: 'test',
        sortBy: 'createdAt',
        sortOrder: 'desc'
      };

      mockResourceService.listResources.mockResolvedValue({
        resources: [],
        pagination: { page: 2, limit: 10, total: 0, totalPages: 0 }
      });

      // Act
      await request(app.getServer())
        .get('/v1/resources')
        .query(queryParams)
        .expect(200);

      // Assert
      expect(mockResourceService.listResources).toHaveBeenCalledWith(queryParams);
    });
  });
});
```

### Phase 2: Service Interface Test Generation

Generate tests for business logic services:

```typescript
// tests/services/resource-service.test.ts
import { ResourceService } from '../../src/services/resource-service';
import { ResourceRepository } from '../../src/repositories/resource-repository';
import { CreateResourceRequest, UpdateResourceRequest, ResourceModel } from '../../src/types';
import { ValidationError, NotFoundError, BusinessLogicError } from '../../src/errors';

describe('ResourceService', () => {
  let resourceService: ResourceService;
  let mockResourceRepository: jest.Mocked<ResourceRepository>;

  beforeEach(() => {
    mockResourceRepository = {
      create: jest.fn(),
      findByPk: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findAndCountAll: jest.fn(),
    } as jest.Mocked<ResourceRepository>;

    resourceService = new ResourceService(mockResourceRepository);
  });

  describe('createResource', () => {
    const validRequest: CreateResourceRequest<{ name: string; type: string }> = {
      resource: {
        name: 'Test Resource',
        type: 'basic'
      },
      by: {
        id: 1,
        email: 'test@example.com',
        name: 'Test User'
      },
      metadata: { source: 'api' }
    };

    it('should create resource successfully', async () => {
      // Arrange
      const mockCreatedResource: ResourceModel = {
        id: 1,
        name: 'Test Resource',
        type: 'basic',
        metadata: { source: 'api' },
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        deletedAt: null
      };

      mockResourceRepository.create.mockResolvedValue(mockCreatedResource);

      // Act
      const result = await resourceService.createResource(validRequest);

      // Assert
      expect(result).toEqual({
        data: {
          id: 1,
          name: 'Test Resource',
          type: 'basic',
          createdAt: '2024-01-01T00:00:00.000Z'
        },
        respondedAt: expect.any(String),
        timeTaken: expect.any(Number),
        metadata: { source: 'api' }
      });

      expect(mockResourceRepository.create).toHaveBeenCalledWith({
        name: 'Test Resource',
        type: 'basic',
        metadata: { source: 'api' }
      });
    });

    it('should throw ValidationError for invalid input', async () => {
      // Arrange
      const invalidRequest = {
        ...validRequest,
        resource: { name: '', type: 'invalid' as any }
      };

      // Act & Assert
      await expect(resourceService.createResource(invalidRequest))
        .rejects
        .toThrow(ValidationError);
    });

    it('should throw BusinessLogicError for business rule violations', async () => {
      // Arrange
      const duplicateRequest = {
        ...validRequest,
        resource: { name: 'Duplicate Resource', type: 'basic' }
      };

      mockResourceRepository.create.mockRejectedValue(
        new Error('Duplicate key value violates unique constraint')
      );

      // Act & Assert
      await expect(resourceService.createResource(duplicateRequest))
        .rejects
        .toThrow(BusinessLogicError);
    });

    // Table-driven tests for validation scenarios
    it.each([
      {
        scenario: 'empty name',
        request: { resource: { name: '', type: 'basic' }, by: validRequest.by },
        expectedError: 'Resource name cannot be empty'
      },
      {
        scenario: 'name too long',
        request: { resource: { name: 'x'.repeat(256), type: 'basic' }, by: validRequest.by },
        expectedError: 'Resource name cannot exceed 255 characters'
      },
      {
        scenario: 'invalid type',
        request: { resource: { name: 'Test', type: 'invalid' as any }, by: validRequest.by },
        expectedError: 'Resource type must be one of: basic, premium, enterprise'
      }
    ])('should validate: $scenario', async ({ request, expectedError }) => {
      // Act & Assert
      await expect(resourceService.createResource(request))
        .rejects
        .toThrow(expectedError);
    });
  });

  describe('getResourceById', () => {
    it('should return resource when found', async () => {
      // Arrange
      const resourceId = 1;
      const mockResource: ResourceModel = {
        id: resourceId,
        name: 'Test Resource',
        type: 'basic',
        metadata: {},
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        deletedAt: null
      };

      mockResourceRepository.findByPk.mockResolvedValue(mockResource);

      // Act
      const result = await resourceService.getResourceById(resourceId);

      // Assert
      expect(result).toEqual({
        data: {
          id: resourceId,
          name: 'Test Resource',
          type: 'basic',
          createdAt: '2024-01-01T00:00:00.000Z'
        },
        respondedAt: expect.any(String),
        timeTaken: expect.any(Number),
        metadata: {}
      });

      expect(mockResourceRepository.findByPk).toHaveBeenCalledWith(resourceId);
    });

    it('should return null when resource not found', async () => {
      // Arrange
      const resourceId = 999;
      mockResourceRepository.findByPk.mockResolvedValue(null);

      // Act
      const result = await resourceService.getResourceById(resourceId);

      // Assert
      expect(result).toBeNull();
      expect(mockResourceRepository.findByPk).toHaveBeenCalledWith(resourceId);
    });

    it('should throw ValidationError for invalid ID', async () => {
      // Act & Assert
      await expect(resourceService.getResourceById(-1))
        .rejects
        .toThrow('Resource ID must be a positive number');
    });
  });
});
```

### Phase 3: Repository Interface Test Generation

Generate tests for data access layer:

```typescript
// tests/repositories/resource-repository.test.ts
import { ResourceRepository } from '../../src/repositories/resource-repository';
import { ResourceModel, ResourceCreationAttributes } from '../../src/types';
import { setupTestDatabase, cleanupTestDatabase } from '../helpers/test-database';

describe('ResourceRepository', () => {
  let resourceRepository: ResourceRepository;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  beforeEach(async () => {
    resourceRepository = new ResourceRepository();
    // Clear test data
    await resourceRepository.truncate();
  });

  describe('create', () => {
    it('should create resource with valid attributes', async () => {
      // Arrange
      const attributes: ResourceCreationAttributes = {
        name: 'Test Resource',
        type: 'basic',
        metadata: { source: 'test' }
      };

      // Act
      const result = await resourceRepository.create(attributes);

      // Assert
      expect(result).toMatchObject({
        id: expect.any(Number),
        name: 'Test Resource',
        type: 'basic',
        metadata: { source: 'test' },
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        deletedAt: null
      });
    });

    it('should enforce database constraints', async () => {
      // Arrange
      const invalidAttributes = {
        name: 'x'.repeat(256), // Exceeds max length
        type: 'basic' as const
      };

      // Act & Assert
      await expect(resourceRepository.create(invalidAttributes))
        .rejects
        .toThrow(/constraint/i);
    });

    // Table-driven tests for constraint validation
    it.each([
      {
        scenario: 'empty name',
        attributes: { name: '', type: 'basic' as const },
        expectedError: /name.*empty/i
      },
      {
        scenario: 'invalid type',
        attributes: { name: 'Test', type: 'invalid' as any },
        expectedError: /type.*invalid/i
      },
      {
        scenario: 'null metadata',
        attributes: { name: 'Test', type: 'basic' as const, metadata: null },
        expectedError: null // Should not throw, null is allowed
      }
    ])('should handle constraint: $scenario', async ({ attributes, expectedError }) => {
      // Act & Assert
      if (expectedError) {
        await expect(resourceRepository.create(attributes))
          .rejects
          .toThrow(expectedError);
      } else {
        await expect(resourceRepository.create(attributes))
          .resolves
          .toBeTruthy();
      }
    });
  });

  describe('findByPk', () => {
    it('should find existing resource', async () => {
      // Arrange
      const created = await resourceRepository.create({
        name: 'Test Resource',
        type: 'basic'
      });

      // Act
      const found = await resourceRepository.findByPk(created.id);

      // Assert
      expect(found).toEqual(created);
    });

    it('should return null for non-existent resource', async () => {
      // Act
      const result = await resourceRepository.findByPk(999);

      // Assert
      expect(result).toBeNull();
    });

    it('should exclude soft-deleted resources', async () => {
      // Arrange
      const created = await resourceRepository.create({
        name: 'Test Resource',
        type: 'basic'
      });

      await resourceRepository.delete(created.id);

      // Act
      const result = await resourceRepository.findByPk(created.id);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findAndCountAll', () => {
    beforeEach(async () => {
      // Create test data
      await Promise.all([
        resourceRepository.create({ name: 'Basic Resource 1', type: 'basic' }),
        resourceRepository.create({ name: 'Basic Resource 2', type: 'basic' }),
        resourceRepository.create({ name: 'Premium Resource', type: 'premium' }),
        resourceRepository.create({ name: 'Enterprise Resource', type: 'enterprise' })
      ]);
    });

    it('should return all resources with default options', async () => {
      // Act
      const result = await resourceRepository.findAndCountAll({});

      // Assert
      expect(result.total).toBe(4);
      expect(result.resources).toHaveLength(4);
      expect(result.resources[0]).toMatchObject({
        id: expect.any(Number),
        name: expect.any(String),
        type: expect.any(String)
      });
    });

    it('should filter by type', async () => {
      // Act
      const result = await resourceRepository.findAndCountAll({ type: 'basic' });

      // Assert
      expect(result.total).toBe(2);
      expect(result.resources).toHaveLength(2);
      expect(result.resources.every(r => r.type === 'basic')).toBe(true);
    });

    it('should paginate results', async () => {
      // Act
      const result = await resourceRepository.findAndCountAll({
        page: 2,
        limit: 2
      });

      // Assert
      expect(result.total).toBe(4);
      expect(result.resources).toHaveLength(2);
    });

    it('should search by name', async () => {
      // Act
      const result = await resourceRepository.findAndCountAll({
        nameSearch: 'Premium'
      });

      // Assert
      expect(result.total).toBe(1);
      expect(result.resources[0].name).toBe('Premium Resource');
    });

    it('should sort results', async () => {
      // Act
      const result = await resourceRepository.findAndCountAll({
        sortBy: 'name',
        sortOrder: 'desc'
      });

      // Assert
      expect(result.resources[0].name).toBe('Premium Resource');
      expect(result.resources[3].name).toBe('Basic Resource 1');
    });
  });
});
```

### Phase 4: Configuration Interface Test Generation

Generate tests for configuration validation:

```typescript
// tests/config/app-config.test.ts
import { AppConfig, validateConfig } from '../../src/config/app-config';
import { ValidationError } from '../../src/errors';

describe('AppConfig', () => {
  const validConfig: AppConfig = {
    server: {
      port: 3000,
      host: 'localhost',
      env: 'development',
      requestTimeout: 30000,
      maxPayloadSize: '10mb'
    },
    database: {
      host: 'localhost',
      port: 5432,
      database: 'test_db',
      username: 'test_user',
      password: 'test_password',
      pool: {
        max: 10,
        min: 2,
        idle: 10000,
        acquire: 20000
      },
      logging: false
    },
    logging: {
      level: 'info',
      format: 'json',
      service: 'test-service',
      correlationIdHeader: 'x-correlation-id'
    },
    features: {
      resourceCreationEnabled: true,
      advancedResourceTypesEnabled: false,
      metadataStorageEnabled: true
    },
    external: {}
  };

  describe('validateConfig', () => {
    it('should validate valid configuration', () => {
      // Act & Assert
      expect(() => validateConfig(validConfig)).not.toThrow();
    });

    // Table-driven tests for configuration validation
    it.each([
      {
        scenario: 'invalid server port',
        config: { ...validConfig, server: { ...validConfig.server, port: -1 } },
        expectedError: /port.*positive/i
      },
      {
        scenario: 'invalid environment',
        config: { ...validConfig, server: { ...validConfig.server, env: 'invalid' as any } },
        expectedError: /env.*development|testing|staging|production/i
      },
      {
        scenario: 'invalid log level',
        config: { ...validConfig, logging: { ...validConfig.logging, level: 'invalid' as any } },
        expectedError: /level.*debug|info|warn|error|fatal/i
      },
      {
        scenario: 'missing required field',
        config: { ...validConfig, server: { ...validConfig.server, port: undefined as any } },
        expectedError: /port.*required/i
      }
    ])('should reject: $scenario', ({ config, expectedError }) => {
      // Act & Assert
      expect(() => validateConfig(config))
        .toThrow(expectedError);
    });
  });

  describe('environment variable mapping', () => {
    it('should load config from environment variables', () => {
      // Arrange
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        PORT: '4000',
        HOST: '0.0.0.0',
        NODE_ENV: 'production',
        DB_HOST: 'prod-db',
        LOG_LEVEL: 'warn'
      };

      // Act
      const config = loadConfigFromEnv();

      // Assert
      expect(config.server.port).toBe(4000);
      expect(config.server.host).toBe('0.0.0.0');
      expect(config.server.env).toBe('production');
      expect(config.database.host).toBe('prod-db');
      expect(config.logging.level).toBe('warn');

      // Cleanup
      process.env = originalEnv;
    });
  });
});
```

### Phase 5: Test Utilities and Fixtures

Generate reusable test utilities:

```typescript
// tests/helpers/test-fixtures.ts
import { CreateResourceRequest, ResourceModel, User } from '../../src/types';

export class TestFixtures {
  static createUser(overrides: Partial<User> = {}): User {
    return {
      id: 1,
      email: 'test@example.com',
      name: 'Test User',
      ...overrides
    };
  }

  static createResourceRequest<T>(
    resource: T,
    overrides: Partial<CreateResourceRequest<T>> = {}
  ): CreateResourceRequest<T> {
    return {
      resource,
      by: this.createUser(),
      metadata: { source: 'test' },
      ...overrides
    };
  }

  static createResourceModel(overrides: Partial<ResourceModel> = {}): ResourceModel {
    return {
      id: 1,
      name: 'Test Resource',
      type: 'basic',
      metadata: {},
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      deletedAt: null,
      ...overrides
    };
  }

  static createResourceArray(count: number, overrides: Partial<ResourceModel> = {}): ResourceModel[] {
    return Array.from({ length: count }, (_, index) =>
      this.createResourceModel({
        id: index + 1,
        name: `Resource ${index + 1}`,
        ...overrides
      })
    );
  }
}

// tests/helpers/test-database.ts
import { Sequelize } from 'sequelize';
import { ResourceModel } from '../../src/models/resource';

let testDatabase: Sequelize;

export async function setupTestDatabase(): Promise<void> {
  testDatabase = new Sequelize('sqlite::memory:', {
    logging: false,
    define: {
      timestamps: true,
      paranoid: true,
      underscored: true
    }
  });

  // Initialize models
  ResourceModel.init(testDatabase);

  // Sync database
  await testDatabase.sync({ force: true });
}

export async function cleanupTestDatabase(): Promise<void> {
  if (testDatabase) {
    await testDatabase.close();
  }
}

export function getTestDatabase(): Sequelize {
  return testDatabase;
}

// tests/helpers/api-test-helpers.ts
import { Application } from 'express';
import request from 'supertest';
import { ApiResponse, ApiError } from '../../src/types';

export class ApiTestHelpers {
  static async expectSuccessResponse<T>(
    app: Application,
    method: 'get' | 'post' | 'put' | 'delete',
    path: string,
    expectedStatus: number = 200,
    body?: any
  ): Promise<ApiResponse<T>> {
    const req = request(app)[method](path);
    
    if (body) {
      req.send(body);
    }

    const response = await req.expect(expectedStatus);
    
    expect(response.body).toMatchObject({
      transaction_id: expect.any(String),
      message: expect.any(String),
      time_taken_ms: expect.any(Number)
    });

    return response.body;
  }

  static async expectErrorResponse(
    app: Application,
    method: 'get' | 'post' | 'put' | 'delete',
    path: string,
    expectedStatus: number,
    body?: any
  ): Promise<ApiError> {
    const req = request(app)[method](path);
    
    if (body) {
      req.send(body);
    }

    const response = await req.expect(expectedStatus);
    
    expect(response.body).toMatchObject({
      transaction_id: expect.any(String),
      message: expect.any(String),
      error: {
        title: expect.any(String),
        status: expectedStatus,
        detail: expect.any(String)
      }
    });

    return response.body.error;
  }

  static validateApiResponse<T>(response: any): ApiResponse<T> {
    expect(response).toMatchObject({
      transaction_id: expect.stringMatching(/^[a-f0-9-]{36}$/), // UUID format
      message: expect.any(String),
      time_taken_ms: expect.any(Number)
    });

    if (response.data) {
      expect(response.data).toBeDefined();
    }

    if (response.meta) {
      expect(response.meta).toBeDefined();
    }

    return response;
  }
}

// tests/helpers/mock-factories.ts
import { jest } from '@jest/globals';
import { ResourceService, ResourceRepository } from '../../src/types';

export class MockFactories {
  static createMockResourceService(): jest.Mocked<ResourceService> {
    return {
      createResource: jest.fn(),
      getResourceById: jest.fn(),
      updateResource: jest.fn(),
      deleteResource: jest.fn(),
      listResources: jest.fn(),
    } as jest.Mocked<ResourceService>;
  }

  static createMockResourceRepository(): jest.Mocked<ResourceRepository> {
    return {
      create: jest.fn(),
      findByPk: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findAndCountAll: jest.fn(),
    } as jest.Mocked<ResourceRepository>;
  }
}
```

## MANDATORY TEST QUALITY CHECKLIST

### Test Coverage Requirements
- [ ] ≥90% line coverage for all service methods
- [ ] 100% interface method coverage
- [ ] All error conditions tested
- [ ] All validation scenarios covered
- [ ] Edge cases and boundary conditions tested

### Test Organization Standards
- [ ] Descriptive test names following "should [action] when [condition]" pattern
- [ ] Arrange-Act-Assert structure in all tests
- [ ] Table-driven tests for multiple similar scenarios
- [ ] Proper test grouping with describe blocks
- [ ] Clean setup/teardown with beforeEach/afterEach

### Mock and Fixture Standards
- [ ] Type-safe mocks using jest.Mocked<T>
- [ ] Reusable test fixtures and builders
- [ ] Proper mock isolation between tests
- [ ] No shared mutable state between tests
- [ ] Database tests using isolated test database

### API Testing Standards
- [ ] All HTTP status codes tested
- [ ] Request/response validation tested
- [ ] Error response format validation
- [ ] Header validation (correlation ID, response time)
- [ ] Content-type and payload validation

## FINAL OUTPUT FORMAT

```markdown
# Unit Test Suite: [Feature Name]

## Test Coverage Summary
**Total Tests:** [Count] unit tests, [Count] integration tests
**Coverage:** [%] line coverage, 100% interface coverage
**Test Files:** [Count] test files generated

## Generated Test Files

### API Endpoint Tests
- `tests/api/resource.test.ts` - Complete API endpoint test suite
- `tests/api/validation.test.ts` - Request validation test suite

### Service Layer Tests  
- `tests/services/resource-service.test.ts` - Business logic test suite
- `tests/services/error-handling.test.ts` - Error scenario test suite

### Repository Layer Tests
- `tests/repositories/resource-repository.test.ts` - Data access test suite
- `tests/repositories/database-constraints.test.ts` - Database constraint tests

### Configuration Tests
- `tests/config/app-config.test.ts` - Configuration validation tests

### Test Utilities
- `tests/helpers/test-fixtures.ts` - Reusable test data builders
- `tests/helpers/test-database.ts` - Database setup/teardown utilities
- `tests/helpers/api-test-helpers.ts` - API testing utilities
- `tests/helpers/mock-factories.ts` - Mock object factories

## Test Execution Commands
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test suite
npm test -- resource

# Run in watch mode
npm run test:watch
```

## Quality Assurance
- ✅ 90%+ line coverage achieved
- ✅ 100% interface coverage achieved
- ✅ All error scenarios tested
- ✅ Type-safe mocks implemented
- ✅ Table-driven tests for validation
- ✅ Isolated test database setup

## Next Steps
- Tests are ready for implementation validation
- Set up continuous integration test execution
- Configure coverage reporting and thresholds
- Implement test-driven development workflow
```

## SUCCESS CRITERIA
- [ ] ≥90% line coverage across all interface implementations
- [ ] 100% of interface methods have corresponding tests
- [ ] All error conditions and edge cases covered
- [ ] Type-safe mocks and fixtures generated
- [ ] Reusable test utilities and helpers created
- [ ] Database tests with proper isolation
- [ ] API tests covering all endpoints and status codes
- [ ] Configuration validation tests complete