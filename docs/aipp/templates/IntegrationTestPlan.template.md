# Integration Test Plan: <Feature Name>
**Stage:** 6-7 (Integration Testing) | **Date:** <YYYY-MM-DD>

## Test Scope & Boundaries

### Integration Layers
| Layer | Components | Test Approach |
|-------|------------|---------------|
| **HTTP → Service** | Express routes, middleware, controllers | Supertest with real HTTP calls |
| **Service → Database** | ORM/Query layer, transactions | Testcontainers with real DB |
| **Service → External APIs** | Third-party integrations | WireMock/MSW for mocking |
| **Service → Message Queues** | Event publishing/consuming | Testcontainers with Redis/RabbitMQ |

### Test Environment Architecture
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Test Runner   │───▶│   Application    │───▶│  Testcontainers │
│     (Jest)      │    │   Server         │    │   - PostgreSQL  │
└─────────────────┘    │   (Express)      │    │   - Redis       │
                       └──────────────────┘    │   - WireMock    │
                                               └─────────────────┘
```

## Testcontainers Setup

### Database Container Configuration
```typescript
// tests/setup/database.container.ts
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { Pool } from 'pg';

export class DatabaseTestContainer {
  private container: StartedTestContainer;
  private pool: Pool;

  async start(): Promise<void> {
    this.container = await new GenericContainer('postgres:15-alpine')
      .withEnvironment({
        POSTGRES_DB: 'test_db',
        POSTGRES_USER: 'test_user',
        POSTGRES_PASSWORD: 'test_pass'
      })
      .withExposedPorts(5432)
      .withWaitStrategy(Wait.forLogMessage('database system is ready to accept connections'))
      .start();

    const host = this.container.getHost();
    const port = this.container.getMappedPort(5432);

    this.pool = new Pool({
      host,
      port,
      database: 'test_db',
      user: 'test_user',
      password: 'test_pass'
    });

    await this.runMigrations();
  }

  async stop(): Promise<void> {
    await this.pool?.end();
    await this.container?.stop();
  }

  async cleanup(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('TRUNCATE TABLE items, users RESTART IDENTITY CASCADE');
    } finally {
      client.release();
    }
  }

  private async runMigrations(): Promise<void> {
    // Run database migrations
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) UNIQUE NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        );
        
        CREATE TABLE IF NOT EXISTS items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id),
          title VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);
    } finally {
      client.release();
    }
  }

  getPool(): Pool {
    return this.pool;
  }
}
```

### Redis Container for Caching/Sessions
```typescript
// tests/setup/redis.container.ts
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import Redis from 'ioredis';

export class RedisTestContainer {
  private container: StartedTestContainer;
  private client: Redis;

  async start(): Promise<void> {
    this.container = await new GenericContainer('redis:7-alpine')
      .withExposedPorts(6379)
      .withWaitStrategy(Wait.forLogMessage('Ready to accept connections'))
      .start();

    const host = this.container.getHost();
    const port = this.container.getMappedPort(6379);

    this.client = new Redis({
      host,
      port,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
  }

  async stop(): Promise<void> {
    await this.client?.quit();
    await this.container?.stop();
  }

  async cleanup(): Promise<void> {
    await this.client?.flushall();
  }

  getClient(): Redis {
    return this.client;
  }
}
```

## Mock Service Templates

### WireMock Setup for External APIs
```typescript
// tests/setup/wiremock.container.ts
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import axios, { AxiosInstance } from 'axios';

export class WireMockContainer {
  private container: StartedTestContainer;
  private baseUrl: string;
  private adminClient: AxiosInstance;

  async start(): Promise<void> {
    this.container = await new GenericContainer('wiremock/wiremock:latest')
      .withExposedPorts(8080)
      .withCommand(['--global-response-templating'])
      .withWaitStrategy(Wait.forHttp('/__admin/health', 8080))
      .start();

    const host = this.container.getHost();
    const port = this.container.getMappedPort(8080);
    this.baseUrl = `http://${host}:${port}`;

    this.adminClient = axios.create({
      baseURL: `${this.baseUrl}/__admin`,
      timeout: 5000
    });
  }

  async stop(): Promise<void> {
    await this.container?.stop();
  }

  async reset(): Promise<void> {
    await this.adminClient.post('/reset');
  }

  async stubResponse(stub: WireMockStub): Promise<void> {
    await this.adminClient.post('/mappings', stub);
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }
}

interface WireMockStub {
  request: {
    method: string;
    urlPattern: string;
    headers?: Record<string, any>;
  };
  response: {
    status: number;
    body?: any;
    headers?: Record<string, string>;
    delayDistribution?: {
      type: string;
      median: number;
      sigma: number;
    };
  };
}

// Example usage
export const ExternalApiMocks = {
  userService: {
    getUserSuccess: (): WireMockStub => ({
      request: {
        method: 'GET',
        urlPattern: '/api/users/.*'
      },
      response: {
        status: 200,
        body: {
          id: '{{request.pathSegments.[2]}}',
          email: 'test@example.com',
          active: true
        },
        headers: {
          'Content-Type': 'application/json'
        }
      }
    }),

    getUserNotFound: (): WireMockStub => ({
      request: {
        method: 'GET',
        urlPattern: '/api/users/nonexistent.*'
      },
      response: {
        status: 404,
        body: { error: 'User not found' }
      }
    }),

    getUserTimeout: (): WireMockStub => ({
      request: {
        method: 'GET',
        urlPattern: '/api/users/timeout.*'
      },
      response: {
        status: 200,
        body: { id: 'timeout-user' },
        delayDistribution: {
          type: 'lognormal',
          median: 5000,
          sigma: 0.1
        }
      }
    })
  }
};
```

### MSW (Mock Service Worker) Alternative
```typescript
// tests/setup/msw.handlers.ts
import { rest } from 'msw';
import { setupServer } from 'msw/node';

export const handlers = [
  // Mock external user service
  rest.get('https://api.external.com/users/:userId', (req, res, ctx) => {
    const { userId } = req.params;
    
    if (userId === 'nonexistent') {
      return res(ctx.status(404), ctx.json({ error: 'User not found' }));
    }
    
    if (userId === 'timeout') {
      return res(ctx.delay(5000), ctx.status(200), ctx.json({ id: userId }));
    }
    
    return res(
      ctx.status(200),
      ctx.json({
        id: userId,
        email: `user${userId}@example.com`,
        active: true
      })
    );
  }),

  // Mock payment service
  rest.post('https://api.payments.com/charge', (req, res, ctx) => {
    const body = req.body as any;
    
    if (body.amount > 10000) {
      return res(
        ctx.status(402),
        ctx.json({ error: 'Amount exceeds limit' })
      );
    }
    
    return res(
      ctx.status(200),
      ctx.json({
        id: 'charge_123',
        amount: body.amount,
        status: 'succeeded'
      })
    );
  })
];

export const server = setupServer(...handlers);
```

## Load Testing Framework

### Artillery Configuration
```yaml
# tests/load/basic-load.yml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 30
      arrivalRate: 5
      name: "Warm up"
    - duration: 60
      arrivalRate: 10
      name: "Sustained load"
    - duration: 30
      arrivalRate: 20
      name: "Peak load"
  plugins:
    metrics-by-endpoint:
      useOnlyRequestNames: true

scenarios:
  - name: "List user items"
    weight: 70
    flow:
      - post:
          url: "/auth/login"
          json:
            email: "test@example.com"
            password: "password"
          capture:
            - json: "$.token"
              as: "authToken"
      - get:
          url: "/users/{{ $randomUUID() }}/items"
          headers:
            Authorization: "Bearer {{ authToken }}"
          name: "GET /users/:id/items"

  - name: "Create item"
    weight: 30
    flow:
      - post:
          url: "/users/{{ $randomUUID() }}/items"
          json:
            title: "Test Item {{ $randomString() }}"
          name: "POST /users/:id/items"
```

### K6 Performance Tests
```javascript
// tests/load/performance.k6.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up
    { duration: '60s', target: 50 },  // Stay at 50 users
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests under 500ms
    http_req_failed: ['rate<0.05'],    // Error rate under 5%
  },
};

export default function () {
  const userId = 'test-user-' + Math.floor(Math.random() * 1000);
  
  let response = http.get(`http://localhost:3000/users/${userId}/items`);
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
    'has items array': (r) => JSON.parse(r.body).hasOwnProperty('items'),
  });
  
  sleep(1);
}
```

## Test Data Management

### Seed Data Factories
```typescript
// tests/factories/seedData.ts
export class SeedDataFactory {
  constructor(private db: Pool) {}

  async createUser(overrides: Partial<User> = {}): Promise<User> {
    const userData = {
      id: randomUUID(),
      email: faker.internet.email(),
      created_at: new Date(),
      ...overrides
    };

    const result = await this.db.query(
      'INSERT INTO users (id, email, created_at) VALUES ($1, $2, $3) RETURNING *',
      [userData.id, userData.email, userData.created_at]
    );

    return result.rows[0];
  }

  async createItems(userId: string, count: number): Promise<Item[]> {
    const items: Item[] = [];
    
    for (let i = 0; i < count; i++) {
      const itemData = {
        id: randomUUID(),
        user_id: userId,
        title: faker.lorem.sentence(),
        created_at: new Date(Date.now() - i * 1000) // Stagger creation times
      };

      const result = await this.db.query(
        'INSERT INTO items (id, user_id, title, created_at) VALUES ($1, $2, $3, $4) RETURNING *',
        [itemData.id, itemData.user_id, itemData.title, itemData.created_at]
      );

      items.push(result.rows[0]);
    }

    return items;
  }

  async createTestScenario(scenario: 'empty' | 'few' | 'many'): Promise<TestScenario> {
    const user = await this.createUser();
    
    let items: Item[];
    switch (scenario) {
      case 'empty':
        items = [];
        break;
      case 'few':
        items = await this.createItems(user.id, 5);
        break;
      case 'many':
        items = await this.createItems(user.id, 100);
        break;
    }

    return { user, items };
  }
}
```

## Integration Test Templates

### API Integration Test Template
```typescript
// tests/integration/userItems.integration.test.ts
import request from 'supertest';
import { app } from '../../src/app';
import { DatabaseTestContainer } from '../setup/database.container';
import { SeedDataFactory } from '../factories/seedData';

describe('Integration: User Items API', () => {
  let dbContainer: DatabaseTestContainer;
  let seedFactory: SeedDataFactory;

  beforeAll(async () => {
    dbContainer = new DatabaseTestContainer();
    await dbContainer.start();
    seedFactory = new SeedDataFactory(dbContainer.getPool());
  });

  afterAll(async () => {
    await dbContainer.stop();
  });

  beforeEach(async () => {
    await dbContainer.cleanup();
  });

  describe('GET /users/:id/items', () => {
    test('should return empty array for user with no items', async () => {
      // Arrange
      const { user } = await seedFactory.createTestScenario('empty');

      // Act
      const response = await request(app)
        .get(`/users/${user.id}/items`)
        .set('correlation-id', 'test-123')
        .expect(200);

      // Assert
      expect(response.body).toEqual({
        items: [],
        nextCursor: undefined
      });
    });

    test('should return paginated items with cursor', async () => {
      // Arrange
      const { user, items } = await seedFactory.createTestScenario('many');

      // Act
      const response = await request(app)
        .get(`/users/${user.id}/items?limit=10`)
        .set('correlation-id', 'test-456')
        .expect(200);

      // Assert
      expect(response.body.items).toHaveLength(10);
      expect(response.body.nextCursor).toBeDefined();
      expect(response.body.items[0]).toMatchObject({
        id: expect.any(String),
        title: expect.any(String),
        createdAt: expect.any(String)
      });
    });

    test('should handle database connection errors gracefully', async () => {
      // Arrange: Stop database to simulate connection error
      await dbContainer.stop();

      // Act
      const response = await request(app)
        .get('/users/test-user/items')
        .set('correlation-id', 'test-error')
        .expect(500);

      // Assert
      expect(response.body).toEqual({
        error: 'Internal server error',
        correlationId: 'test-error'
      });

      // Cleanup: Restart database for other tests
      await dbContainer.start();
    });
  });
});
```

### External Service Integration Test
```typescript
// tests/integration/externalServices.integration.test.ts
describe('Integration: External Services', () => {
  let wireMock: WireMockContainer;

  beforeAll(async () => {
    wireMock = new WireMockContainer();
    await wireMock.start();
    
    // Configure app to use mock endpoints
    process.env.USER_SERVICE_URL = wireMock.getBaseUrl();
  });

  afterAll(async () => {
    await wireMock.stop();
  });

  beforeEach(async () => {
    await wireMock.reset();
  });

  test('should handle external service success response', async () => {
    // Arrange
    await wireMock.stubResponse(ExternalApiMocks.userService.getUserSuccess());

    // Act
    const response = await request(app)
      .get('/users/123/profile')
      .expect(200);

    // Assert
    expect(response.body.id).toBe('123');
    expect(response.body.email).toBe('test@example.com');
  });

  test('should handle external service timeout', async () => {
    // Arrange
    await wireMock.stubResponse(ExternalApiMocks.userService.getUserTimeout());

    // Act
    const response = await request(app)
      .get('/users/timeout-user/profile')
      .expect(504);

    // Assert
    expect(response.body.error).toContain('timeout');
  });
});
```

## Observability & Monitoring

### Log Assertion Helpers
```typescript
// tests/helpers/logAssertions.ts
export class LogAssertions {
  private logs: any[] = [];

  constructor() {
    // Capture logs during tests
    jest.spyOn(console, 'log').mockImplementation((message) => {
      try {
        this.logs.push(JSON.parse(message));
      } catch {
        this.logs.push({ raw: message });
      }
    });
  }

  assertLogContains(level: string, message: string): void {
    const matchingLog = this.logs.find(log => 
      log.level === level && log.message?.includes(message)
    );
    expect(matchingLog).toBeDefined();
  }

  assertCorrelationIdPresent(correlationId: string): void {
    const logsWithCorrelation = this.logs.filter(log => 
      log.correlationId === correlationId
    );
    expect(logsWithCorrelation.length).toBeGreaterThan(0);
  }

  assertNoSecretsInLogs(): void {
    const secretPatterns = [
      /password/i,
      /token/i,
      /api[_-]?key/i,
      /secret/i
    ];

    this.logs.forEach(log => {
      const logString = JSON.stringify(log);
      secretPatterns.forEach(pattern => {
        expect(logString).not.toMatch(pattern);
      });
    });
  }

  clear(): void {
    this.logs = [];
  }
}
```

## Jest Configuration for Integration Tests

```javascript
// jest.integration.config.js
module.exports = {
  displayName: 'Integration Tests',
  testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup/integration.setup.ts'],
  testEnvironment: 'node',
  testTimeout: 30000,
  maxWorkers: 1, // Run integration tests sequentially
  forceExit: true,
  detectOpenHandles: true
};
```

## Performance Benchmarks

### Expected Performance Targets
| Metric | Target | Measurement Method |
|--------|--------|--------------------|
| Response Time (P95) | <500ms | Artillery/K6 |
| Throughput | >100 RPS | Artillery/K6 |
| Error Rate | <1% | HTTP status codes |
| Database Connections | <50 concurrent | Connection pool monitoring |
| Memory Usage | <512MB | Process monitoring |

### Test Execution Strategy
1. **Smoke Tests**: Basic functionality verification
2. **Load Tests**: Normal traffic simulation  
3. **Stress Tests**: Peak traffic simulation
4. **Spike Tests**: Traffic burst scenarios
5. **Volume Tests**: Large dataset handling
