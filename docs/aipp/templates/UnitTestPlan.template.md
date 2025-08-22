# Unit Test Plan: <Feature Name>
**Stage:** 4 (Test-First Development) | **Date:** <YYYY-MM-DD>

## Functions Under Test
- listUserItems
- <Add other functions from Interface Pact>

## Testing Strategy Overview

### Test Types & Coverage Goals
| Test Type | Target Coverage | Tool/Framework |
|-----------|----------------|----------------|
| Unit Tests | ≥90% line coverage | Jest |
| Mutation Testing | ≥60% mutation score | Stryker |
| Property-Based Tests | 100% invariants | fast-check |
| Snapshot Tests | UI components | Jest snapshots |
| Contract Tests | 100% interface compliance | Custom validators |

### Test Pyramid Distribution
- **70% Unit Tests**: Fast, isolated, deterministic
- **20% Integration Tests**: API endpoints, database interactions  
- **10% End-to-End Tests**: Critical user journeys

## Detailed Test Categories

### 1. Input Validation Tests
Test all input boundary conditions and validation rules:

#### Equivalence Classes
- **Valid userId**: Non-empty string, UUID format, existing user
- **Invalid userId**: Empty string, null, undefined, non-existent user
- **Valid limit**: 1-100, default 20 when missing
- **Invalid limit**: 0, negative, >100, non-integer, string
- **Valid correlationId**: Non-empty string, UUID format
- **Invalid correlationId**: Empty, null, undefined

#### Property-Based Test Examples
```typescript
// Property: limit should always be between 1-100 after validation
property('limit validation', fc.integer(), (limit) => {
  const result = validateLimit(limit);
  if (result.isValid) {
    expect(result.value).toBeGreaterThanOrEqual(1);
    expect(result.value).toBeLessThanOrEqual(100);
  }
});

// Property: userId validation should be consistent
property('userId consistency', fc.string(), (userId) => {
  const result1 = validateUserId(userId);
  const result2 = validateUserId(userId);
  expect(result1.isValid).toBe(result2.isValid);
});
```

### 2. Business Logic Tests

#### Core Functionality
- **Pagination logic**: First page, middle pages, last page
- **Sorting behavior**: Default order, custom sorting
- **Filtering logic**: Active filters, empty results
- **Data transformation**: Input mapping, output formatting

#### Edge Cases
- **Empty datasets**: 0 items returned
- **Boundary conditions**: Exactly limit items, limit+1 items
- **Cursor handling**: Valid cursors, invalid cursors, expired cursors
- **Data consistency**: Concurrent modifications, stale data

### 3. Error Handling Tests

#### Error Categories
- **UserError**: Invalid input, authorization failures
- **SystemError**: Database timeouts, network failures
- **ValidationError**: Schema violations, type mismatches

#### Error Path Coverage
```typescript
describe('Error Handling', () => {
  test('should throw UserError for invalid userId', async () => {
    await expect(listUserItems({ userId: '', correlationId: 'test' }))
      .rejects.toThrow(UserError);
  });

  test('should throw SystemError for database timeout', async () => {
    jest.spyOn(db, 'query').mockRejectedValue(new Error('TIMEOUT'));
    await expect(listUserItems(validInput))
      .rejects.toThrow(SystemError);
  });
});
```

## Advanced Testing Techniques

### Mutation Testing Configuration
```javascript
// stryker.conf.js
module.exports = {
  mutate: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.test.ts'
  ],
  testRunner: 'jest',
  thresholds: {
    high: 80,
    low: 60,
    break: 50
  },
  mutator: {
    plugins: ['@stryker-mutator/typescript-checker'],
    excludedMutations: ['StringLiteral', 'BooleanLiteral']
  }
};
```

### Property-Based Testing Setup
```typescript
// tests/properties/listUserItems.property.test.ts
import fc from 'fast-check';
import { listUserItems } from '../../src/services/exampleService';

describe('Property-Based Tests: listUserItems', () => {
  test('should maintain invariants for all valid inputs', () => {
    fc.assert(fc.property(
      fc.record({
        userId: fc.string({ minLength: 1 }),
        limit: fc.integer({ min: 1, max: 100 }),
        correlationId: fc.string({ minLength: 1 })
      }),
      async (input) => {
        const result = await listUserItems(input);
        
        // Invariant: result should always have items array
        expect(Array.isArray(result.items)).toBe(true);
        
        // Invariant: items length should not exceed limit
        expect(result.items.length).toBeLessThanOrEqual(input.limit);
        
        // Invariant: all items should have required fields
        result.items.forEach(item => {
          expect(item).toHaveProperty('id');
          expect(item).toHaveProperty('title');
          expect(item).toHaveProperty('createdAt');
        });
      }
    ));
  });
});
```

### Test Data Factories
```typescript
// tests/factories/testData.ts
export const UserDataFactory = {
  validInput: (): ExampleInput => ({
    userId: faker.datatype.uuid(),
    limit: faker.datatype.number({ min: 1, max: 100 }),
    correlationId: faker.datatype.uuid()
  }),

  invalidInput: (): Partial<ExampleInput> => ({
    userId: faker.helpers.arrayElement(['', null, undefined]),
    limit: faker.helpers.arrayElement([0, -1, 101, 'invalid']),
    correlationId: ''
  }),

  mockOutput: (itemCount: number = 3): ExampleOutput => ({
    items: Array.from({ length: itemCount }, () => ({
      id: faker.datatype.uuid(),
      title: faker.lorem.sentence(),
      createdAt: faker.date.recent().toISOString()
    })),
    nextCursor: itemCount > 0 ? faker.datatype.uuid() : undefined
  })
};
```

## Test Quality Assurance

### Code Review Checklist
- [ ] All equivalence classes covered
- [ ] All error paths tested
- [ ] Property-based tests for complex logic
- [ ] Mutation testing score ≥60%
- [ ] No flaky or non-deterministic tests
- [ ] Clear test names describing behavior
- [ ] Minimal test setup and teardown

### Coverage Requirements
| Metric | Threshold | Tool |
|--------|-----------|------|
| Line Coverage | ≥90% | Jest |
| Branch Coverage | ≥85% | Jest |
| Function Coverage | 100% | Jest |
| Mutation Score | ≥60% | Stryker |

### Performance Benchmarks
- Unit test suite should run in <30 seconds
- Individual tests should complete in <100ms
- Memory usage should not exceed 512MB during test execution

## Test Templates by Type

### API Endpoint Test Template
```typescript
describe('API: GET /users/:id/items', () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  afterEach(async () => {
    await cleanupTestDatabase();
  });

  test('should return user items successfully', async () => {
    // Arrange
    const testUser = await createTestUser();
    const testItems = await createTestItems(testUser.id, 5);

    // Act
    const response = await request(app)
      .get(`/users/${testUser.id}/items`)
      .expect(200);

    // Assert
    expect(response.body.items).toHaveLength(5);
    expect(response.body.items[0]).toMatchSchema(ItemSchema);
  });
});
```

### Database Layer Test Template
```typescript
describe('Repository: UserItemsRepository', () => {
  test('should handle database connection errors', async () => {
    // Arrange
    jest.spyOn(database, 'connect').mockRejectedValue(new Error('Connection failed'));

    // Act & Assert
    await expect(userItemsRepository.findByUserId('user-123'))
      .rejects.toThrow(SystemError);
  });
});
```

## Implementation Notes
1. Write tests BEFORE implementation (TDD approach)
2. Run tests frequently during development
3. Use descriptive test names that explain the behavior
4. Keep tests isolated and independent
5. Mock external dependencies consistently
6. Regularly review and refactor test code
