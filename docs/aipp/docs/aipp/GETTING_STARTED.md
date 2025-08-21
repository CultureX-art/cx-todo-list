# Getting Started with AIPP

## Overview
This guide walks you through your first AIPP (AI Pair Programming) implementation, from writing a PRD to deploying production-ready code through all 8 stages.

## Prerequisites
- Node.js 18+
- TypeScript knowledge
- Basic understanding of your AI assistant capabilities
- Access to your codebase and development environment

## Your First AIPP Feature: User Profile Update

Let's implement a user profile update feature using the complete AIPP workflow.

---

## Stage 1: PRD (Product Requirements Document)

Create a new PRD using the template:

```markdown
# PRD: User Profile Update Feature
**Owner:** [Your Name] | **Date:** 2024-XX-XX

## Goal
Allow users to update their profile information (name, email, bio) with validation and audit logging.

## Users & Value
- Primary user: Authenticated application users
- Value hypothesis: Users can maintain current profile data, improving engagement

## Acceptance Criteria (testable)
1. **Given** authenticated user **When** they submit valid profile data **Then** profile is updated and success message shown
2. **Given** invalid email format **When** user submits **Then** validation error displayed
3. **Given** profile update **When** successful **Then** audit log entry created
4. **Given** concurrent updates **When** multiple requests **Then** last-write-wins with proper conflict handling

## Non-Functional Requirements
- Performance: P95 < 200ms for profile update endpoint
- Security: Input validation, no PII in logs, audit trail for changes
- Reliability: Idempotent updates, database transaction safety

## Constraints
- Use existing User model and authentication middleware
- Maintain backward compatibility with current API
- Follow established error response format

## Out of Scope
- Profile picture upload
- Email verification workflow
- Account deletion functionality

## Risks & Mitigations
- **Risk**: Concurrent updates causing data loss
  **Mitigation**: Use database-level optimistic locking
- **Risk**: Malicious input injection
  **Mitigation**: Strict input validation and sanitization
```

---

## Stage 2: Thought Experimentation

Present multiple approaches to your AI assistant:

**Prompt Example:**
```
I need to implement the user profile update feature described in the PRD. 
Consider these approaches:

1. Direct database update with validation
2. Event-sourced approach with profile update events  
3. CQRS pattern with separate read/write models

Analyze each approach considering:
- Implementation complexity
- Performance implications  
- Maintainability
- Alignment with existing codebase patterns

Recommend the best approach with rationale.
```

**Expected AI Response:** AI will analyze trade-offs and recommend an approach. Choose the recommendation that best fits your context.

---

## Stage 3: Function Signatures & Docstrings (INTERFACE FREEZE)

Create the interface contract using the template:

```typescript
// File: src/services/userProfileService.ts

export interface UpdateProfileInput {
  userId: string;
  name?: string;
  email?: string;
  bio?: string;
  correlationId: string;
}

export interface UpdateProfileOutput {
  user: {
    id: string;
    name: string;
    email: string;
    bio: string | null;
    updatedAt: string;
  };
  auditId: string;
}

/**
 * Updates user profile information with validation and audit logging.
 * 
 * Preconditions:
 * - userId must exist in database
 * - email must be valid format if provided
 * - user must be authenticated (handled by caller)
 * 
 * Postconditions:
 * - User profile updated in database
 * - Audit log entry created
 * - Response includes updated user data
 * 
 * Errors:
 * - UserError: Invalid input data or user not found
 * - SystemError: Database or audit service failures
 * 
 * @param input - Profile update data with correlation ID
 * @returns Promise resolving to updated user data and audit ID
 * @throws UserError on invalid input; SystemError on system failures
 */
export async function updateUserProfile(input: UpdateProfileInput): Promise<UpdateProfileOutput> {
  throw new Error("Not implemented (Stage 3)");
}
```

**🔒 INTERFACE FREEZE**: After this stage, public interfaces cannot change without returning to Stage 3.

---

## Stage 4: Unit Tests First

**Prompt for AI:**
```
Generate comprehensive unit tests for the updateUserProfile function based on the interface contract.
Cover:
- Happy path with all fields
- Happy path with partial updates  
- Input validation errors
- User not found scenarios
- Database failure scenarios
- Email format validation

Use table-driven tests where appropriate. Target ≥90% coverage.
```

**Example Generated Test:**
```typescript
// File: src/services/__tests__/userProfileService.test.ts

import { updateUserProfile, UpdateProfileInput } from '../userProfileService';
import { UserError, SystemError } from '../lib/errors';

describe('updateUserProfile', () => {
  const baseInput: UpdateProfileInput = {
    userId: 'user-123',
    correlationId: 'corr-456'
  };

  describe('happy path', () => {
    test.each([
      { 
        scenario: 'full update',
        input: { ...baseInput, name: 'John Doe', email: 'john@example.com', bio: 'Developer' }
      },
      { 
        scenario: 'partial update - name only',
        input: { ...baseInput, name: 'John Smith' }
      },
      { 
        scenario: 'partial update - email only',
        input: { ...baseInput, email: 'john.smith@example.com' }
      }
    ])('should update profile for $scenario', async ({ input }) => {
      // Will implement after Stage 5
      await expect(updateUserProfile(input)).rejects.toThrow('Not implemented');
    });
  });

  describe('validation errors', () => {
    test.each([
      { 
        scenario: 'invalid email format',
        input: { ...baseInput, email: 'invalid-email' },
        expectedError: UserError
      },
      { 
        scenario: 'empty userId',
        input: { ...baseInput, userId: '' },
        expectedError: UserError
      }
    ])('should throw $expectedError.name for $scenario', async ({ input, expectedError }) => {
      await expect(updateUserProfile(input)).rejects.toBeInstanceOf(expectedError);
    });
  });
});
```

---

## Stage 5: Implementation to Green

**Prompt for AI:**
```
Implement the updateUserProfile function to make all unit tests pass.
Follow these constraints:
- Use Sequelize for database operations
- Validate email format using validator library
- Create audit log entry for each update
- Handle concurrent updates with optimistic locking
- Use structured logging with correlation IDs
- Return appropriate UserError/SystemError types

Keep implementation ≤150 lines of code.
```

**Review the AI's implementation** and ensure it:
- ✅ Makes all tests pass
- ✅ Follows error taxonomy (UserError/SystemError)
- ✅ Includes proper logging with correlation IDs
- ✅ Handles edge cases identified in tests

---

## Stage 6: Integration Tests

**Prompt for AI:**
```
Create integration tests for updateUserProfile that test the full stack:
- HTTP endpoint → service → database
- Use test database or testcontainers
- Include authentication middleware testing
- Test audit log creation
- Test concurrent update scenarios
- Verify no PII in logs
```

**Example Integration Test:**
```typescript
// File: src/routes/__tests__/userProfile.int.test.ts

import request from 'supertest';
import { buildApp } from '../../app';
import { setupTestDatabase, cleanupTestDatabase } from '../../test/helpers';

describe('PUT /api/users/:userId/profile (integration)', () => {
  let app: any;

  beforeAll(async () => {
    app = buildApp();
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  it('should update user profile successfully', async () => {
    const response = await request(app)
      .put('/api/users/test-user-123/profile')
      .set('Authorization', 'Bearer valid-token')
      .set('x-correlation-id', 'int-test-456')
      .send({
        name: 'Updated Name',
        email: 'updated@example.com'
      });

    expect(response.status).toBe(200);
    expect(response.body.user.name).toBe('Updated Name');
    expect(response.body.auditId).toBeDefined();
  });
});
```

---

## Stage 7: Integration to Green

Run integration tests and fix any issues:
```bash
npm run test:int
```

Common fixes needed:
- Database transaction handling
- Authentication middleware integration
- Error response formatting
- Audit service configuration

---

## Stage 8: Efficiency & Hardening

**Prompt for AI:**
```
Review the implementation for:
1. Performance optimizations
2. Security hardening opportunities
3. Code maintainability improvements
4. Production readiness

Suggest specific optimizations while maintaining test compatibility.
```

**Typical Stage 8 improvements:**
- Add database indexes for query optimization
- Implement caching for frequently accessed data
- Add rate limiting for the endpoint
- Enhance error messages for better debugging
- Add performance monitoring

---

## Quality Gates Checklist

Before considering the feature complete:

- [ ] All unit tests pass (≥90% coverage)
- [ ] All integration tests pass
- [ ] Manual testing completed
- [ ] Code review using `ReviewerChecklist.md`
- [ ] Security scan passed (no secrets, input validation)
- [ ] Performance within budgets (P95 < 200ms)
- [ ] Operational tooling configured (feature flags if needed)

---

## Deployment Readiness

1. **Feature Flag Setup** (if using progressive rollout):
   ```typescript
   const enableNewProfileUpdate = await featureFlags.isEnabled('profile-update-v2', userId);
   ```

2. **Monitoring Configuration**:
   - Error rate alerts
   - Latency monitoring  
   - Audit log verification

3. **Rollback Plan**:
   - Feature flag disable procedure
   - Database rollback scripts (if schema changed)
   - Communication plan

---

## Next Steps

Congratulations! You've completed your first AIPP feature. Next:

1. **Scale Up**: Try a more complex feature with multiple services
2. **Team Adoption**: Onboard team members using this guide
3. **Process Refinement**: Collect feedback and adjust templates
4. **Metrics Collection**: Track velocity and quality improvements

For troubleshooting common issues, see `TROUBLESHOOTING.md`.