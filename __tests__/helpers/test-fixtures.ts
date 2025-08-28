/**
 * Test Fixtures
 *
 * Centralized test data fixtures and factory functions for consistent testing.
 */

import {
  SignupRequest,
  SignupResponse,
  LoginRequest,
  LoginResponse,
  UserProfile,
  JwtPayload,
  AuthenticatedUser,
} from "../../src/auth/api/types";
import {
  CreateTaskRequest,
  UpdateTaskRequest,
  Task,
  TaskStatus,
  TaskListResponse,
} from "../../src/task/api/types";
import { HealthCheckResponse, SystemMetrics } from "../../src/health/api/types";
import { ServiceContext } from "../../src/common/types/service";

/**
 * Test fixture factory for creating consistent test data
 */
export class TestFixtures {
  // ============================================================================
  // AUTH FIXTURES
  // ============================================================================

  /**
   * Create a valid signup request
   */
  static createSignupRequest(
    overrides: Partial<SignupRequest> = {},
  ): SignupRequest {
    return {
      email: "user@example.com",
      password: "SecurePass123",
      ...overrides,
    };
  }

  /**
   * Create a signup response
   */
  static createSignupResponse(
    overrides: Partial<SignupResponse> = {},
  ): SignupResponse {
    return {
      id: 1,
      email: "user@example.com",
      createdAt: "2024-01-01T00:00:00.000Z",
      ...overrides,
    };
  }

  /**
   * Create a valid login request
   */
  static createLoginRequest(
    overrides: Partial<LoginRequest> = {},
  ): LoginRequest {
    return {
      email: "user@example.com",
      password: "SecurePass123",
      ...overrides,
    };
  }

  /**
   * Create a login response
   */
  static createLoginResponse(
    overrides: Partial<LoginResponse> = {},
  ): LoginResponse {
    return {
      token:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImVtYWlsIjoidXNlckBleGFtcGxlLmNvbSIsImlhdCI6MTY0MDk5NTIwMCwiZXhwIjoxNjQxMDgxNjAwfQ.signature",
      expiresAt: "2024-01-01T01:00:00.000Z",
      user: this.createUserProfile(),
      ...overrides,
    };
  }

  /**
   * Create a user profile
   */
  static createUserProfile(overrides: Partial<UserProfile> = {}): UserProfile {
    return {
      id: 1,
      email: "user@example.com",
      createdAt: "2024-01-01T00:00:00.000Z",
      ...overrides,
    };
  }

  /**
   * Create a JWT payload
   */
  static createJwtPayload(overrides: Partial<JwtPayload> = {}): JwtPayload {
    return {
      sub: 1,
      email: "user@example.com",
      iat: 1640995200,
      exp: 1641081600,
      jti: "token-id",
      iss: "todo-api",
      aud: "todo-app",
      ...overrides,
    };
  }

  /**
   * Create user attributes for database operations
   */
  static createUserAttributes(
    overrides: Partial<{
      id: number;
      email: string;
      password_hash: string;
      created_at: Date;
      updated_at: Date;
    }> = {},
  ): {
    id: number;
    email: string;
    password_hash: string;
    created_at: Date;
    updated_at: Date;
  } {
    return {
      id: 1,
      email: "user@example.com",
      password_hash: "$2b$12$hashedPasswordMock",
      created_at: new Date("2024-01-01T00:00:00.000Z"),
      updated_at: new Date("2024-01-01T00:00:00.000Z"),
      ...overrides,
    };
  }

  /**
   * Create multiple user fixtures
   */
  static createUsers(count: number): UserProfile[] {
    return Array.from({ length: count }, (_, index) =>
      this.createUserProfile({
        id: index + 1,
        email: `user${index + 1}@example.com`,
      }),
    );
  }

  /**
   * create authenticated user info
   */
  static createAuthenticatedUser(): AuthenticatedUser {
    return {
      id: 1,
      email: "user@example.com",
      jti: "token-id",
    };
  }
  // ============================================================================
  // TASK FIXTURES
  // ============================================================================

  /**
   * Create a valid task creation request
   */
  static createTaskRequest(
    overrides: Partial<CreateTaskRequest> = {},
  ): CreateTaskRequest {
    return {
      title: "Complete project documentation",
      description: "Write comprehensive API documentation for the todo service",
      dueDate: "2024-12-31T23:59:59.000Z",
      status: "not-started",
      labels: ["documentation", "api"],
      ...overrides,
    };
  }

  /**
   * Create a minimal task creation request
   */
  static createMinimalTaskRequest(
    overrides: Partial<CreateTaskRequest> = {},
  ): CreateTaskRequest {
    return {
      title: "Simple task",
      ...overrides,
    };
  }

  /**
   * Create a task update request
   */
  static createUpdateTaskRequest(
    overrides: Partial<UpdateTaskRequest> = {},
  ): UpdateTaskRequest {
    return {
      title: "Updated task title",
      description: "Updated task description",
      status: "in-progress",
      labels: ["updated"],
      ...overrides,
    };
  }

  /**
   * Create a task entity
   */
  static createTask(overrides: Partial<Task> = {}): Task {
    return {
      id: 1,
      title: "Complete project documentation",
      description: "Write comprehensive API documentation for the todo service",
      dueDate: "2024-12-31T23:59:59.000Z",
      status: "not-started",
      labels: ["documentation", "api"],
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
      ...overrides,
    };
  }

  /**
   * Create an array of tasks
   */
  static createTaskArray(count: number, overrides: Partial<Task> = {}): Task[] {
    return Array.from({ length: count }, (_, index) =>
      this.createTask({
        id: index + 1,
        title: `Task ${index + 1}`,
        ...overrides,
      }),
    );
  }

  /**
   * Create multiple tasks with different statuses
   */
  static createTasksWithStatuses(): Task[] {
    const baseTask = this.createTask({ status: "not-started" });

    return [
      {
        ...baseTask,
        id: 1,
        title: "Not started task",
        status: "not-started" as TaskStatus,
      },
      {
        ...baseTask,
        id: 2,
        title: "In progress task",
        status: "in-progress" as TaskStatus,
      },
      {
        ...baseTask,
        id: 3,
        title: "Completed task",
        status: "done" as TaskStatus,
      },
    ];
  }

  /**
   * Create tasks with various labels
   */
  static createTasksWithLabels(): Task[] {
    const baseTask = this.createTask({ labels: [] });

    return [
      { ...baseTask, id: 1, title: "Bug fix task", labels: ["bug", "urgent"] },
      {
        ...baseTask,
        id: 2,
        title: "Feature task",
        labels: ["feature", "enhancement"],
      },
      {
        ...baseTask,
        id: 3,
        title: "Documentation task",
        labels: ["docs", "low-priority"],
      },
    ];
  }

  /**
   * Create tasks for different users
   */
  static createTasksForUsers(userIds: number[]): Task[] {
    return userIds.flatMap((userId, userIndex) =>
      Array.from({ length: 3 }, (_, taskIndex) =>
        this.createTask({
          id: userIndex * 3 + taskIndex + 1,
          title: `User ${userId} Task ${taskIndex + 1}`,
          description: `Task ${taskIndex + 1} belonging to user ${userId}`,
        }),
      ),
    );
  }

  /**
   * Create a task list response
   */
  static createTaskListResponse(
    tasks: Task[],
    page: number = 1,
    limit: number = 20,
  ): TaskListResponse {
    const total = tasks.length;
    const totalPages = Math.ceil(total / limit);

    return {
      data: tasks,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Create tasks with various due dates
   */
  static createTasksWithDueDates(): Task[] {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    return [
      this.createTask({
        id: 1,
        title: "Overdue task",
        dueDate: lastWeek.toISOString(),
        status: "not-started",
      }),
      this.createTask({
        id: 2,
        title: "Due tomorrow",
        dueDate: tomorrow.toISOString(),
        status: "in-progress",
      }),
      this.createTask({
        id: 3,
        title: "Due next week",
        dueDate: nextWeek.toISOString(),
        status: "not-started",
      }),
      this.createTask({
        id: 4,
        title: "No due date",
        dueDate: null,
      }),
    ];
  }

  // ============================================================================
  // HEALTH FIXTURES
  // ============================================================================

  /**
   * Create a healthy system response
   */
  static createHealthyResponse(
    overrides: Partial<HealthCheckResponse> = {},
  ): HealthCheckResponse {
    return {
      status: "healthy",
      timestamp: "2024-01-01T00:00:00.000Z",
      version: "1.0.0",
      uptime: 3600,
      services: {
        database: { status: "healthy", responseTimeMs: 15 },
        cache: { status: "healthy", responseTimeMs: 5 },
        external: { status: "healthy", responseTimeMs: 250 },
      },
      metrics: this.createSystemMetrics(),
      ...overrides,
    };
  }

  /**
   * Create a degraded system response
   */
  static createDegradedResponse(
    overrides: Partial<HealthCheckResponse> = {},
  ): HealthCheckResponse {
    return {
      ...this.createHealthyResponse(),
      status: "degraded",
      services: {
        database: { status: "healthy", responseTimeMs: 15 },
        cache: { status: "healthy", responseTimeMs: 5 },
        external: {
          status: "unhealthy",
          responseTimeMs: 0,
          error: "External service timeout",
        },
      },
      ...overrides,
    };
  }

  /**
   * Create an unhealthy system response
   */
  static createUnhealthyResponse(
    overrides: Partial<HealthCheckResponse> = {},
  ): HealthCheckResponse {
    return {
      ...this.createHealthyResponse(),
      status: "unhealthy",
      services: {
        database: {
          status: "unhealthy",
          responseTimeMs: 0,
          error: "Connection refused",
        },
        cache: {
          status: "unhealthy",
          responseTimeMs: 0,
          error: "Cache unavailable",
        },
        external: { status: "healthy", responseTimeMs: 100 },
      },
      ...overrides,
    };
  }

  /**
   * Create system metrics
   */
  static createSystemMetrics(
    overrides: Partial<SystemMetrics> = {},
  ): SystemMetrics {
    return {
      memory: {
        used: 52428800,
        total: 134217728,
        percentage: 39.1,
      },
      cpu: {
        usage: 15.5,
        loadAverage: [1.2, 1.1, 0.9],
      },
      requests: {
        total: 1500,
        successful: 1475,
        failed: 25,
        averageResponseTime: 125,
      },
      ...overrides,
    };
  }

  // ============================================================================
  // SERVICE CONTEXT FIXTURES
  // ============================================================================

  /**
   * Create a service context
   */
  static createServiceContext(
    overrides: Partial<ServiceContext> = {},
  ): ServiceContext {
    return {
      user: { id: 1, email: "user@example.com" },
      correlationId: "test-correlation-id",
      timestamp: new Date("2024-01-01T00:00:00.000Z"),
      ...overrides,
    };
  }

  /**
   * Create multiple service contexts for different users
   */
  static createServiceContexts(userIds: number[]): ServiceContext[] {
    return userIds.map((userId, index) =>
      this.createServiceContext({
        user: { id: userId, email: `user${userId}@example.com` },
        correlationId: `test-correlation-id-${index + 1}`,
        timestamp: new Date(`2024-01-0${index + 1}T00:00:00.000Z`),
      }),
    );
  }

  // ============================================================================
  // VALIDATION ERROR FIXTURES
  // ============================================================================

  /**
   * Create validation errors for signup
   */
  static createSignupValidationErrors(): Array<{
    field: string;
    issue: string;
  }> {
    return [
      { field: "email", issue: "Email is required" },
      { field: "password", issue: "Password must be at least 8 characters" },
    ];
  }

  /**
   * Create validation errors for task creation
   */
  static createTaskValidationErrors(): Array<{ field: string; issue: string }> {
    return [
      { field: "title", issue: "Title is required" },
      { field: "dueDate", issue: "Invalid date format" },
      { field: "labels", issue: "Maximum 10 labels allowed" },
    ];
  }

  /**
   * Create single field validation error
   */
  static createFieldValidationError(
    field: string,
    issue: string,
  ): Array<{
    field: string;
    issue: string;
  }> {
    return [{ field, issue }];
  }

  // ============================================================================
  // DATABASE FIXTURES
  // ============================================================================

  /**
   * Create database row representation of a user
   */
  static createUserDbRow(overrides: Record<string, unknown> = {}): {
    id: number;
    email: string;
    password_hash: string;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
  } {
    return {
      id: 1,
      email: "user@example.com",
      password_hash:
        "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3QBTz9RBQC",
      created_at: new Date("2024-01-01T00:00:00.000Z"),
      updated_at: new Date("2024-01-01T00:00:00.000Z"),
      deleted_at: null,
      ...overrides,
    };
  }

  /**
   * Create database row representation of a task
   */
  static createTaskDbRow(overrides: Record<string, unknown> = {}): {
    id: number;
    user_id: number;
    title: string;
    description: string;
    due_date: Date;
    status: string;
    labels: string;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
  } {
    return {
      id: 1,
      user_id: 1,
      title: "Complete project documentation",
      description: "Write comprehensive API documentation for the todo service",
      due_date: new Date("2024-12-31T23:59:59.000Z"),
      status: "not-started",
      labels: JSON.stringify(["documentation", "api"]),
      created_at: new Date("2024-01-01T00:00:00.000Z"),
      updated_at: new Date("2024-01-01T00:00:00.000Z"),
      deleted_at: null,
      ...overrides,
    };
  }

  // ============================================================================
  // HTTP REQUEST/RESPONSE FIXTURES
  // ============================================================================

  /**
   * Create mock Express request
   */
  static createMockRequest(overrides: Record<string, unknown> = {}): {
    body: Record<string, unknown>;
    params: Record<string, string>;
    query: Record<string, string>;
    headers: Record<string, string>;
    method: string;
    path: string;
  } {
    return {
      body: {},
      params: {},
      query: {},
      headers: {
        "content-type": "application/json",
        "x-correlation-id": "test-correlation-id",
      },
      method: "GET",
      path: "/v1/test",
      ...overrides,
    };
  }

  /**
   * Create mock Express response
   */
  static createMockResponse(): Record<string, jest.MockedFunction<any>> {
    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
    };

    return response;
  }

  // ============================================================================
  // TIME-BASED FIXTURES
  // ============================================================================

  /**
   * Create timestamps for testing time-sensitive operations
   */
  static createTimestamps(): {
    now: Date;
    past: Date;
    future: Date;
    today: Date;
    tomorrow: Date;
    nextWeek: Date;
    lastWeek: Date;
  } {
    const now = new Date("2024-01-01T12:00:00.000Z");

    // 1 hour before and after
    const past = new Date(now.getTime() - 60 * 60 * 1000);
    const future = new Date(now.getTime() + 60 * 60 * 1000);

    // 1 day before and after
    const today = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // 7 days before and after
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    return {
      now,
      past,
      future,
      today,
      tomorrow,
      nextWeek,
      lastWeek,
    };
  }

  // ============================================================================
  // BULK OPERATION FIXTURES
  // ============================================================================

  /**
   * Create fixtures for bulk operations
   */
  static createBulkTaskData(count: number = 5): Task[] {
    return Array.from({ length: count }, (_, index) =>
      this.createTask({
        id: index + 1,
        title: `Bulk Task ${index + 1}`,
        description: `Description for bulk task ${index + 1}`,
        labels: [`bulk-${index}`, "test"],
      }),
    );
  }

  /**
   * Create bulk update data
   */
  static createBulkUpdateData(): { status: TaskStatus; labels: string[] } {
    return {
      status: "in-progress" as TaskStatus,
      labels: ["bulk-updated", "processed"],
    };
  }

  // ============================================================================
  // ERROR SCENARIO FIXTURES
  // ============================================================================

  /**
   * Create fixtures for testing error scenarios
   */
  static createErrorScenarios(): Record<string, unknown> {
    return {
      networkError: new Error("Network request failed"),
      timeoutError: new Error("Request timeout"),
      validationError: new Error("Validation failed"),
      authError: new Error("Authentication failed"),
      notFoundError: new Error("Resource not found"),
      conflictError: new Error("Resource conflict"),
      internalError: new Error("Internal server error"),
    };
  }

  // ============================================================================
  // SEARCH AND FILTER FIXTURES
  // ============================================================================

  /**
   * Create search query fixtures
   */
  static createSearchQueries(): Record<string, string> {
    return {
      simple: "documentation",
      multiWord: "api documentation",
      partial: "doc",
      specialChars: "api-docs@2024",
      unicode: "документация",
      empty: "",
      tooLong: "a".repeat(1000),
    };
  }

  /**
   * Create filter option fixtures
   */
  static createFilterOptions(): Record<string, unknown> {
    return {
      byStatus: { status: "in-progress" as TaskStatus },
      byLabels: { labels: ["urgent", "bug"] },
      bySearch: { search: "documentation" },
      combined: {
        status: "not-started" as TaskStatus,
        labels: ["feature"],
        search: "new",
      },
      pagination: { page: 2, limit: 10 },
      sorting: { sortBy: "dueDate" as const, sortOrder: "asc" as const },
    };
  }

  // ============================================================================
  // CONFIGURATION FIXTURES
  // ============================================================================

  /**
   * Create application configuration for testing
   */
  static createAppConfig(
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> {
    return {
      server: {
        port: 3000,
        host: "0.0.0.0",
        env: "test",
        requestTimeoutMs: 30000,
        maxPayloadSize: "10mb",
        enableRequestLogging: false,
        trustProxy: false,
      },
      database: {
        host: "localhost",
        port: 3306,
        database: "test_db",
        username: "test",
        password: "test",
        pool: {
          max: 10,
          min: 2,
          idleTimeoutMs: 30000,
          acquireTimeoutMs: 60000,
        },
        logging: false,
      },
      auth: {
        jwt: {
          secret: "test-secret-key",
          algorithm: "HS256",
          expiresIn: "1h",
          issuer: "todo-api",
          audience: "todo-app",
        },
        password: { saltRounds: 10 },
      },
      logging: {
        level: "error",
        service: "todo-api-test",
        version: "1.0.0-test",
        correlationIdHeader: "x-correlation-id",
      },
      features: {
        taskCreationEnabled: true,
        taskSearchEnabled: true,
        taskLabelsEnabled: true,
        bulkOperationsEnabled: true,
        auditLoggingEnabled: false,
        apiDocsEnabled: false,
        healthCheckEnabled: true,
      },
      ...overrides,
    };
  }
}
