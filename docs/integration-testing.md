# Integration Testing Guide

This document describes the integration testing strategy and setup for the Todo List API.

## Overview

Integration tests verify that all layers of the application work correctly together, including:

- Service layer business logic with real database operations
- Database repository layer with actual MySQL queries
- HTTP API endpoints with full request/response cycles
- End-to-end user workflows and scenarios

## Test Structure

```
__tests__/integration/
├── setup/
│   ├── test-environment.ts      # Test environment setup and teardown
│   └── jest.setup.ts            # Jest global configuration
├── database/
│   └── task-repository.integration.test.ts  # Database layer tests
├── services/
│   └── task-service.integration.test.ts     # Service layer tests
├── api/
│   └── task-api.integration.test.ts         # HTTP API tests
└── workflows/
    └── task-lifecycle.integration.test.ts   # End-to-end scenarios
```

## Test Environment Setup

### Database Configuration

Integration tests use a separate test database. Configure these environment variables:

```bash
# Test database configuration
TEST_DB_HOST=localhost
TEST_DB_PORT=3306
TEST_DB_NAME=todo_test
TEST_DB_USER=test
TEST_DB_PASSWORD=test
```

### Database Schema

The test environment automatically creates required tables:

- `user` table for authentication
- `task` table for todo items
- Proper indexes and foreign key constraints

### Test Isolation

Each test uses database transactions for complete isolation:

- `beforeEach` starts a transaction and creates test users
- `afterEach` rolls back the transaction (or commits if testing success)
- No test data persists between test runs

## Running Integration Tests

### Commands

```bash
# Run only integration tests
npm run test:integration

# Run integration tests in watch mode
npm run test:watch:integration

# Run unit tests only (excluding integration)
npm run test:unit

# Run all tests (unit + integration)
npm run test:all

# Run all tests with coverage
npm run test:coverage:all
```

### Test Execution

Integration tests run sequentially (`maxWorkers: 1`) to avoid database conflicts.
Each test suite is isolated and can be run independently.

## Test Categories

### 1. Database Integration Tests

**File:** `database/task-repository.integration.test.ts`

Tests the repository layer with real database operations:

```typescript
describe("Transaction Management", () => {
  it("should rollback transaction on error", async () => {
    await database.beginTransaction();
    const task = await repository.create(taskData);
    // Simulate error
    await database.rollback();
    // Verify task doesn't exist
  });
});
```

**Coverage:**

- CRUD operations with real MySQL queries
- Transaction management (commit/rollback)
- Database constraints and validation
- Query performance and optimization
- Concurrent operations
- Bulk operations

### 2. Service Layer Integration Tests

**File:** `services/task-service.integration.test.ts`

Tests business logic with real database and validation:

```typescript
describe("Business Logic with Database", () => {
  it("should enforce business rules during task creation", async () => {
    const result = await service.createTask(request, context);
    // Verify in database
    const dbTask = await repository.findById(result.id);
    expect(dbTask?.title).toBe("Expected Title");
  });
});
```

**Coverage:**

- Business rule enforcement
- Authentication and authorization
- Input validation with database persistence
- Complex queries and filtering
- Statistics and analytics
- Error handling and propagation

### 3. API Integration Tests

**File:** `api/task-api.integration.test.ts`

Tests HTTP endpoints with full request/response cycle:

```typescript
describe("POST /api/v1/tasks", () => {
  it("should create task with valid data", async () => {
    const response = await request(app)
      .post("/api/v1/tasks")
      .set("Authorization", `Bearer ${authToken}`)
      .send(taskData)
      .expect(201);
  });
});
```

**Coverage:**

- HTTP request/response handling
- Authentication middleware
- Input validation and sanitization
- Rate limiting
- CORS and security headers
- Content negotiation
- Error response formats

### 4. End-to-End Workflow Tests

**File:** `workflows/task-lifecycle.integration.test.ts`

Tests complete user scenarios from start to finish:

```typescript
describe('Personal Task Management Workflow', () => {
  it('should handle complete personal task lifecycle', async () => {
    // Create task
    const createResponse = await request(app).post('/api/v1/tasks')...

    // Update task
    await request(app).put(`/api/v1/tasks/${taskId}`)...

    // Complete task
    await request(app).put(`/api/v1/tasks/${taskId}`)...

    // Verify statistics
    const stats = await request(app).get('/api/v1/tasks/statistics')...
  });
});
```

**Coverage:**

- Complete user workflows
- Multi-step task management scenarios
- User isolation and data privacy
- Productivity workflows (GTD, Sprint Planning)
- Performance with large datasets
- Error recovery scenarios

## Test Data Management

### Test Users

Each test creates isolated test users:

```typescript
beforeEach(async () => {
  testUser = await testEnv.createTestUser("test@example.com");
  authToken = await testEnv.generateAuthToken(testUser.id, testUser.email);
});
```

### Data Cleanup

All test data is automatically cleaned up:

- Transaction rollback removes all created data
- No manual cleanup required
- Tests are completely isolated

### Fixtures

Use deterministic test data:

```typescript
const taskData = {
  title: "Integration Test Task",
  description: "Created during integration test",
  status: "not-started",
  labels: ["test", "integration"],
};
```

## Performance Testing

Integration tests include performance verification:

```typescript
it('should handle large datasets efficiently', async () => {
  // Create 200 tasks
  for (let i = 0; i < 200; i++) { ... }

  const startTime = Date.now();
  const response = await request(app).get('/api/v1/tasks')...
  const queryTime = Date.now() - startTime;

  expect(queryTime).toBeLessThan(200); // Should be fast
});
```

## Error Scenarios

Tests include comprehensive error handling:

- Database connection failures
- Invalid authentication tokens
- Concurrent operation conflicts
- Malformed request data
- Business rule violations

## Debugging Integration Tests

### Enable Debug Logging

```bash
DEBUG_TESTS=true npm run test:integration
```

### Database Inspection

During development, you can inspect the test database:

```sql
-- Connect to test database
mysql -u test -p todo_test

-- View test data (during transaction)
SELECT * FROM task WHERE title LIKE '%test%';
```

### Transaction Debugging

To inspect data during tests, add temporary commits:

```typescript
// For debugging only - remove before commit
await database.commit();
console.log("Data committed for inspection");
await database.beginTransaction(); // Restart transaction
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Integration Tests
on: [push, pull_request]

jobs:
  integration-tests:
    runs-on: ubuntu-latest
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: root
          MYSQL_DATABASE: todo_test
          MYSQL_USER: test
          MYSQL_PASSWORD: test
        ports:
          - 3306:3306
        options: --health-cmd="mysqladmin ping" --health-interval=10s --health-timeout=5s --health-retries=3

    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"

      - run: npm ci
      - run: npm run test:integration
        env:
          TEST_DB_HOST: localhost
          TEST_DB_PORT: 3306
          TEST_DB_NAME: todo_test
          TEST_DB_USER: test
          TEST_DB_PASSWORD: test
```

## Best Practices

### Test Organization

1. **Arrange-Act-Assert**: Clear test structure
2. **Descriptive Names**: Test names describe the scenario
3. **Single Responsibility**: One concept per test
4. **Test Isolation**: No dependencies between tests

### Database Testing

1. **Use Transactions**: For complete isolation
2. **Test Constraints**: Verify database rules
3. **Performance Aware**: Include timing assertions
4. **Realistic Data**: Use representative test data

### API Testing

1. **Authentication**: Test both authorized and unauthorized access
2. **Input Validation**: Test edge cases and invalid data
3. **Response Format**: Verify complete response structure
4. **Error Handling**: Test all error scenarios

### Maintenance

1. **Keep Tests Current**: Update tests when APIs change
2. **Monitor Performance**: Watch for test execution time increases
3. **Review Coverage**: Ensure all integration paths are tested
4. **Document Changes**: Update this guide when adding new tests

## Troubleshooting

### Common Issues

**Database Connection Errors:**

- Verify test database is running
- Check environment variables
- Ensure test database user has proper permissions

**Transaction Errors:**

- Make sure each test properly cleans up transactions
- Check for nested transaction issues
- Verify transaction isolation levels

**Performance Issues:**

- Monitor database query performance
- Check for missing indexes
- Consider test data size

**Authentication Errors:**

- Verify JWT token generation
- Check token expiration settings
- Ensure user creation in tests

### Getting Help

1. Check test logs for specific error messages
2. Run tests individually to isolate issues
3. Use database inspection during debugging
4. Review integration test environment setup
