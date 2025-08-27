# AIPP Troubleshooting Guide

## Common Issues and Solutions

### Stage 2: Thought Experimentation Issues

#### Issue: AI Recommends Overly Complex Architecture

**Symptoms:**

- AI suggests microservices for simple features
- Recommends enterprise patterns for small changes
- Proposes technology stack changes

**Solutions:**

- Be specific about constraints in your prompt:
  ```
  Consider these constraints:
  - Must use existing Express/Sequelize stack
  - Feature should be implementable in <150 LOC
  - No new external dependencies allowed
  ```
- Ask for "simplest approach that meets requirements"
- Request trade-off analysis between simple vs complex approaches

#### Issue: AI Doesn't Consider Existing Codebase Patterns

**Symptoms:**

- Recommendations conflict with current architecture
- Suggests different error handling than established patterns
- Ignores existing utility functions

**Solutions:**

- Include relevant code snippets in your prompt:

  ```
  Our current error handling pattern:
  [paste existing error types]

  Our current service pattern:
  [paste example service structure]
  ```

- Ask AI to "follow existing patterns in this codebase"

---

### Stage 3: Interface Design Issues

#### Issue: Interface Changes Required After Freeze

**Symptoms:**

- Tests reveal missing parameters
- Integration requirements not captured
- Return type insufficient for use cases

**Solutions:**

- **DO NOT** modify interfaces after freeze
- Return to Stage 1/2 to reassess requirements
- Use ADR to document why interface change is necessary
- Regenerate affected tests after interface changes

#### Issue: AI Generates Overly Generic Interfaces

**Symptoms:**

- Parameters typed as `any` or `unknown`
- Missing validation constraints in types
- Vague error descriptions

**Solutions:**

- Request specific types in your prompt:
  ```
  Generate TypeScript interfaces with:
  - Specific string literal types where applicable
  - Validation constraints as JSDoc comments
  - Detailed error type specifications
  ```
- Provide examples of well-typed interfaces from your codebase

---

### Stage 4: Unit Test Issues

#### Issue: Tests Don't Cover Edge Cases

**Symptoms:**

- Missing boundary value tests
- No error path testing
- Insufficient mocking of dependencies

**Solutions:**

- Request specific test categories:
  ```
  Generate tests covering:
  - Happy path with minimum/maximum values
  - All validation error scenarios
  - Database failure mocking
  - Concurrent access patterns
  ```
- Use the test plan template to guide AI

#### Issue: Tests Are Too Tightly Coupled to Implementation

**Symptoms:**

- Tests break when refactoring internal logic
- Excessive mocking of internal functions
- Tests verify implementation details not behavior

**Solutions:**

- Focus AI on testing public interfaces:
  ```
  Generate tests that:
  - Only test public function behavior
  - Mock external dependencies (DB, APIs) not internal functions
  - Use table-driven tests for multiple scenarios
  ```

#### Issue: Flaky Tests Due to Async Operations

**Symptoms:**

- Tests pass/fail intermittently
- Timeouts in CI/CD
- Race conditions in setup/teardown

**Solutions:**

- Request proper async handling:
  ```
  Ensure all tests:
  - Properly await async operations
  - Use beforeEach/afterEach for setup/teardown
  - Include timeout handling for external services
  ```

---

### Stage 5: Implementation Issues

#### Issue: AI Implementation Doesn't Pass Its Own Tests

**Symptoms:**

- Generated code fails generated tests
- Logic errors in implementation
- Missing error handling

**Solutions:**

- Run tests immediately after implementation
- Provide failing test output to AI for fixes:

  ```
  The implementation fails these tests:
  [paste test failures]

  Fix the implementation to make all tests pass.
  ```

- Break down complex functions into smaller pieces

#### Issue: Code Exceeds 150 LOC Limit

**Symptoms:**

- Implementation is too complex
- Multiple responsibilities in one function
- Extensive inline validation

**Solutions:**

- Request refactoring:
  ```
  The function is >150 LOC. Refactor by:
  - Extracting validation logic to separate functions
  - Creating helper functions for common operations
  - Maintaining the same public interface
  ```

#### Issue: Security Vulnerabilities in Generated Code

**Symptoms:**

- SQL injection risks
- Missing input sanitization
- Secrets in code/logs

**Solutions:**

- Use security-focused prompts:
  ```
  Implement with security requirements:
  - Use parameterized queries only
  - Validate and sanitize all inputs
  - No secrets or PII in logs
  - Follow OWASP guidelines
  ```

---

### Stage 6-7: Integration Test Issues

#### Issue: Integration Tests Fail Due to Environment Setup

**Symptoms:**

- Database connection errors
- Missing test data
- Authentication failures

**Solutions:**

- Verify test environment setup:
  ```bash
  npm run test:setup
  npm run test:db:migrate
  npm run test:db:seed
  ```
- Check test configuration files
- Ensure test database is isolated from development

#### Issue: Tests Pass Locally But Fail in CI

**Symptoms:**

- Different behavior in CI environment
- Timing issues in automated tests
- Resource constraints in CI

**Solutions:**

- Add CI-specific configuration
- Use deterministic test data
- Increase timeouts for CI environment:
  ```javascript
  jest.setTimeout(30000); // 30 seconds for CI
  ```

---

### Stage 8: Performance and Production Issues

#### Issue: Performance Degrades Under Load

**Symptoms:**

- Slow response times
- Database query timeouts
- Memory leaks

**Solutions:**

- Profile the implementation:
  ```bash
  npm run profile
  npm run test:load
  ```
- Request AI optimization:
  ```
  Optimize this implementation for:
  - Database query efficiency
  - Memory usage
  - Response time under concurrent load
  ```

#### Issue: Monitoring Alerts in Production

**Symptoms:**

- High error rates
- Latency spikes
- Resource exhaustion

**Solutions:**

- Use operational tooling for rollback:
  ```bash
  # Emergency rollback
  curl -X POST /api/feature-flags/disable \
    -d '{"flag": "feature-name"}'
  ```
- Check audit logs for patterns
- Scale resources if needed

---

## AI Prompting Best Practices

### Effective Prompt Structure

```
CONTEXT: Brief description of what you're building
CONSTRAINTS: Technical limitations, existing patterns, performance requirements
TASK: Specific request (implement, test, review, optimize)
FORMAT: Desired output format
VALIDATION: How to verify the result
```

### Example of Good vs Bad Prompts

**❌ Bad Prompt:**
"Write a function to update users"

**✅ Good Prompt:**

```
CONTEXT: Building user profile update feature for Express/Sequelize app
CONSTRAINTS:
- Must use existing User model
- Follow established error patterns (UserError/SystemError)
- Keep function under 150 LOC
- Include audit logging

TASK: Implement updateUserProfile function matching this interface:
[paste interface]

FORMAT: Return TypeScript implementation with JSDoc comments

VALIDATION: Implementation must pass these specific test cases:
[paste key test scenarios]
```

---

## Getting Help

### Internal Resources

1. **Code Review**: Use `ReviewerChecklist.md` for systematic review
2. **Templates**: Reference all template files for guidance
3. **Examples**: Check existing AIPP implementations in your codebase

### External Resources

1. **AI Provider Documentation**: Understand your AI's capabilities and limitations
2. **Stack-Specific Guides**: Framework documentation for implementation details
3. **Security Resources**: OWASP guidelines, security scanning tools

### Escalation Path

1. **Developer Discussion**: Team review of AI recommendations
2. **Architecture Review**: For significant design decisions
3. **Security Review**: For any security-sensitive changes
4. **Performance Review**: For performance-critical implementations

---

## Process Improvements

### Feedback Loop

After completing features, document:

- What prompts worked well
- Common AI mistakes to avoid
- Template improvements needed
- Process bottlenecks encountered

### Team Learning

- Share effective prompts with team
- Create team-specific troubleshooting addendums
- Regular retrospectives on AIPP effectiveness

This troubleshooting guide should be updated based on real-world usage patterns and team feedback.
