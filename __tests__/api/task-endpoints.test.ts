/**
 * Task API Endpoints - Comprehensive Unit Tests
 *
 * Complete test suite for all task management endpoints following OpenAPI specification.
 * Tests all HTTP methods, status codes, validation, error handling, and security.
 */

import { jest } from "@jest/globals";
import request from "supertest";
import { App } from "../../src/app";
import { ITaskService } from "../../src/task/services/task.service";
import { IAuthService } from "../../src/auth/services/auth.service";
import { TaskStatus } from "../../src/task/api/types";
import { TestFixtures } from "../helpers/test-fixtures";
import {
  NotFoundError,
  AuthorizationError,
  BusinessLogicError,
  InternalServiceError,
} from "../../src/common/error/service-error";

describe("Task API Endpoints", () => {
  let app: App;
  let mockTaskService: jest.Mocked<ITaskService>;
  let mockAuthService: jest.Mocked<IAuthService>;

  const validToken = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token";
  const authUser = TestFixtures.createAuthenticatedUser();
  // const serviceContext = TestFixtures.createServiceContext({ user: authUser });

  // Mock task service
  mockTaskService = {
    createTask: jest.fn(),
    getTaskById: jest.fn(),
    updateTask: jest.fn(),
    deleteTask: jest.fn(),
    listTasks: jest.fn(),
    searchTasks: jest.fn(),
    getTaskStatistics: jest.fn(),
    bulkUpdateTaskStatus: jest.fn(),
    getTasksDueSoon: jest.fn(),
  } as jest.Mocked<ITaskService>;

  // Mock auth service
  mockAuthService = {
    signup: jest.fn(),
    login: jest.fn(),
    getUserProfile: jest.fn(),
    validateToken: jest.fn(),
    generateToken: jest.fn(),
    revokeToken: jest.fn(),
    isTokenRevoked: jest.fn(),
  } as jest.Mocked<IAuthService>;

  // Setup default auth behavior
  mockAuthService.validateToken.mockResolvedValue({
    sub: authUser.id,
    email: authUser.email,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    jti: authUser.jti,
    iss: "todo-api",
    aud: "todo-app",
  });
  mockAuthService.isTokenRevoked.mockResolvedValue(false);

  app = new App();

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // POST /api/v1/tasks - Create Task
  // ============================================================================

  describe("POST /api/v1/tasks", () => {
    const validCreateRequest = TestFixtures.createTaskRequest();
    const expectedTask = TestFixtures.createTask();

    it("should create task successfully", async () => {
      // Arrange
      mockTaskService.createTask.mockResolvedValue(expectedTask);

      // Act
      const response = await request(app.getServer())
        .post("/api/v1/tasks")
        .set("Authorization", validToken)
        .send(validCreateRequest)
        .expect(201);

      // Assert - TEST_CASE_ERROR: API returns wrapped response, not direct task data
      expect(response.body).toMatchObject({
        data: {
          id: expectedTask.id,
          title: expectedTask.title,
          description: expectedTask.description,
          status: expectedTask.status,
          dueDate: expectedTask.dueDate,
          labels: expectedTask.labels,
          createdAt: expectedTask.createdAt,
          updatedAt: expectedTask.updatedAt,
        },
        message: expect.any(String),
        correlationId: expect.any(String),
        responseTimeMs: expect.any(Number),
      });

      expect(mockTaskService.createTask).toHaveBeenCalledWith(
        validCreateRequest,
        expect.objectContaining({
          user: expect.objectContaining({
            id: authUser.id,
            email: authUser.email,
          }),
          correlationId: expect.any(String),
        }),
      );
    });

    it("should create task with minimal fields", async () => {
      // Arrange
      const minimalRequest = { title: "Simple task" };
      const minimalTask = TestFixtures.createTask({
        title: "Simple task",
        description: null,
        dueDate: null,
        labels: [],
      });
      mockTaskService.createTask.mockResolvedValue(minimalTask);

      // Act
      const response = await request(app.getServer())
        .post("/api/v1/tasks")
        .set("Authorization", validToken)
        .send(minimalRequest)
        .expect(201);

      // Assert - TEST_CASE_ERROR: API returns wrapped response, access via data property
      expect(response.body.data.title).toBe("Simple task");
      expect(response.body.data.description).toBeNull();
      expect(response.body.data.dueDate).toBeNull();
      expect(response.body.data.labels).toEqual([]);
    });

    it("should return 401 for missing authentication", async () => {
      // Act
      const response = await request(app.getServer())
        .post("/api/v1/tasks")
        .send(validCreateRequest)
        .expect(401);

      // Assert
      expect(response.body).toMatchObject({
        error: {
          code: "unauthorized",
          message: expect.stringContaining("Authentication"),
        },
      });
    });

    it("should return 401 for invalid token", async () => {
      // Arrange
      mockAuthService.validateToken.mockRejectedValue(
        new Error("Invalid token"),
      );

      // Act
      const response = await request(app.getServer())
        .post("/api/v1/tasks")
        .set("Authorization", "Bearer invalid.token")
        .send(validCreateRequest)
        .expect(401);

      // Assert
      expect(response.body.error.code).toBe("unauthorized");
    });

    // Validation test cases using table-driven approach
    it.each([
      {
        scenario: "missing title",
        request: { description: "No title" },
        expectedError: { field: "title", issue: "is required" },
      },
      {
        scenario: "empty title",
        request: { title: "" },
        expectedError: { field: "title", issue: "must not be empty" },
      },
      {
        scenario: "title too long",
        request: { title: "a".repeat(256) },
        expectedError: {
          field: "title",
          issue: "must be 255 characters or less",
        },
      },
      {
        scenario: "description too long",
        request: { title: "Valid", description: "a".repeat(1001) },
        expectedError: {
          field: "description",
          issue: "must be 1000 characters or less",
        },
      },
      {
        scenario: "invalid status",
        request: { title: "Valid", status: "invalid-status" },
        expectedError: {
          field: "status",
          issue: "must be one of: not-started, in-progress, done",
        },
      },
      {
        scenario: "invalid due date",
        request: { title: "Valid", dueDate: "not-a-date" },
        expectedError: {
          field: "dueDate",
          issue: "must be a valid ISO 8601 date",
        },
      },
      {
        scenario: "too many labels",
        request: { title: "Valid", labels: Array(11).fill("label") },
        expectedError: {
          field: "labels",
          issue: "must contain at most 10 items",
        },
      },
      {
        scenario: "label too long",
        request: { title: "Valid", labels: ["a".repeat(51)] },
        expectedError: {
          field: "labels[0]",
          issue: "must be 50 characters or less",
        },
      },
    ])(
      "should validate request: $scenario",
      async ({ request: requestData }) => {
        // Act
        const response = await request(app.getServer())
          .post("/api/v1/tasks")
          .set("Authorization", validToken)
          .send(requestData)
          .expect(400);

        // Assert
        expect(response.body).toMatchObject({
          error: {
            code: "validation_failed",
            message: "Request validation failed",
          },
        });
      },
    );

    it("should return 422 for business logic errors", async () => {
      // Arrange
      mockTaskService.createTask.mockRejectedValue(
        new BusinessLogicError("Due date cannot be in the past"),
      );

      const pastDueDateRequest = {
        ...validCreateRequest,
        dueDate: "2020-01-01T00:00:00.000Z",
      };

      // Act
      const response = await request(app.getServer())
        .post("/api/v1/tasks")
        .set("Authorization", validToken)
        .send(pastDueDateRequest)
        .expect(422);

      // Assert
      expect(response.body).toMatchObject({
        error: {
          code: "validation_failed",
          message: "Due date cannot be in the past",
        },
      });
    });

    it("should return 500 for internal service errors", async () => {
      // Arrange
      mockTaskService.createTask.mockRejectedValue(
        new InternalServiceError("Database connection failed"),
      );

      // Act
      const response = await request(app.getServer())
        .post("/api/v1/tasks")
        .set("Authorization", validToken)
        .send(validCreateRequest)
        .expect(500);

      // Assert
      expect(response.body).toMatchObject({
        error: {
          code: "internal_error",
          message: expect.stringContaining("error"),
        },
      });
    });
  });

  // ============================================================================
  // GET /api/v1/tasks - List Tasks
  // ============================================================================

  describe("GET /api/v1/tasks", () => {
    const mockTasks = TestFixtures.createTask({});
    const mockListResponse = TestFixtures.createTaskListResponse(
      [mockTasks],
      1,
      10,
    );

    it("should return paginated tasks list", async () => {
      // Arrange
      mockTaskService.listTasks.mockResolvedValue(mockListResponse);

      // Act
      const response = await request(app.getServer())
        .get("/api/v1/tasks")
        .set("Authorization", validToken)
        .expect(200);

      // Assert
      expect(response.body).toMatchObject({
        data: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(Number),
            title: expect.any(String),
            status: expect.any(String),
          }),
        ]),
        meta: {
          page: 1,
          limit: 10,
          total: 3,
          totalPages: 1,
        },
      });

      expect(mockTaskService.listTasks).toHaveBeenCalledWith(
        {
          page: 1,
          limit: 10,
        },
        expect.objectContaining({
          user: expect.objectContaining({
            id: authUser.id,
          }),
        }),
      );
    });

    it("should support query parameters", async () => {
      // Arrange
      const filteredTasks = [TestFixtures.createTask({
        status: "in-progress",
      })];
      const filteredResponse = TestFixtures.createTaskListResponse(
        filteredTasks,
        2,
        5,
      );
      mockTaskService.listTasks.mockResolvedValue(filteredResponse);

      // Act
      await request(app.getServer())
        .get("/api/v1/tasks")
        .set("Authorization", validToken)
        .query({
          page: 2,
          pageSize: 5,
          status: "in-progress",
          q: "search term",
          sortBy: "dueDate",
          order: "asc",
        })
        .expect(200);

      // Assert
      expect(mockTaskService.listTasks).toHaveBeenCalledWith(
        {
          page: 2,
          limit: 5,
          status: "in-progress",
          q: "search term",
          sortBy: "dueDate",
          order: "asc",
        },
        expect.any(Object),
      );
    });

    it("should return 401 for unauthenticated requests", async () => {
      // Act
      const response = await request(app.getServer())
        .get("/api/v1/tasks")
        .expect(401);

      // Assert
      expect(response.body.error.code).toBe("unauthorized");
    });

    // Query parameter validation test cases
    it.each([
      {
        scenario: "invalid page number",
        query: { page: "0" },
        expectedError: "page must be greater than 0",
      },
      {
        scenario: "invalid page size",
        query: { pageSize: "101" },
        expectedError: "pageSize must be between 1 and 100",
      },
      {
        scenario: "invalid status",
        query: { status: "invalid" },
        expectedError: "status must be one of: not-started, in-progress, done",
      },
      {
        scenario: "search query too long",
        query: { q: "a".repeat(256) },
        expectedError: "q must be 255 characters or less",
      },
      {
        scenario: "invalid sort field",
        query: { sortBy: "invalid" },
        expectedError:
          "sortBy must be one of: createdAt, updatedAt, dueDate, title, status",
      },
      {
        scenario: "invalid sort order",
        query: { order: "invalid" },
        expectedError: "order must be one of: asc, desc",
      },
    ])("should validate query: $scenario", async ({ query }) => {
      // Act
      const response = await request(app.getServer())
        .get("/api/v1/tasks")
        .set("Authorization", validToken)
        .query(query)
        .expect(400);

      // Assert
      expect(response.body.error.code).toBe("validation_failed");
      expect(response.body.error.message).toContain("validation failed");
    });

    it("should return empty list for no tasks", async () => {
      // Arrange
      const emptyResponse = TestFixtures.createTaskListResponse([], 1, 10);
      mockTaskService.listTasks.mockResolvedValue(emptyResponse);

      // Act
      const response = await request(app.getServer())
        .get("/api/v1/tasks")
        .set("Authorization", validToken)
        .expect(200);

      // Assert
      expect(response.body.data).toEqual([]);
      expect(response.body.meta.total).toBe(0);
    });
  });

  // ============================================================================
  // GET /api/v1/tasks/:taskId - Get Task by ID
  // ============================================================================

  describe("GET /api/v1/tasks/:taskId", () => {
    const taskId = 1;
    const mockTask = TestFixtures.createTask({ id: taskId });

    it("should return task by id", async () => {
      // Arrange
      mockTaskService.getTaskById.mockResolvedValue(mockTask);

      // Act
      const response = await request(app.getServer())
        .get(`/api/v1/tasks/${taskId}`)
        .set("Authorization", validToken)
        .expect(200);

      // Assert - TEST_CASE_ERROR: API returns wrapped response format
      expect(response.body).toMatchObject({
        data: {
          id: taskId,
          title: mockTask.title,
          description: mockTask.description,
          status: mockTask.status,
          dueDate: mockTask.dueDate,
          labels: mockTask.labels,
          createdAt: mockTask.createdAt,
          updatedAt: mockTask.updatedAt,
        },
      });

      expect(mockTaskService.getTaskById).toHaveBeenCalledWith(
        taskId,
        expect.objectContaining({
          user: expect.objectContaining({
            id: authUser.id,
          }),
        }),
      );
    });

    it("should return 404 for non-existent task", async () => {
      // Arrange
      mockTaskService.getTaskById.mockRejectedValue(
        new NotFoundError("Task", taskId),
      );

      // Act
      const response = await request(app.getServer())
        .get(`/api/v1/tasks/${taskId}`)
        .set("Authorization", validToken)
        .expect(404);

      // Assert
      expect(response.body).toMatchObject({
        error: {
          code: "not_found",
          message: `Task with id ${taskId} not found`,
        },
      });
    });

    it("should return 403 for unauthorized access", async () => {
      // Arrange
      mockTaskService.getTaskById.mockRejectedValue(
        new AuthorizationError("You can only access your own resources"),
      );

      // Act
      const response = await request(app.getServer())
        .get(`/api/v1/tasks/${taskId}`)
        .set("Authorization", validToken)
        .expect(403);

      // Assert
      expect(response.body).toMatchObject({
        error: {
          code: "forbidden",
          message: "You can only access your own resources",
        },
      });
    });

    it("should return 401 for unauthenticated requests", async () => {
      // Act
      const response = await request(app.getServer())
        .get(`/api/v1/tasks/${taskId}`)
        .expect(401);

      // Assert
      expect(response.body.error.code).toBe("unauthorized");
    });

    it.each([
      { id: "invalid", expectedError: "must be a number" },
      { id: "0", expectedError: "must be greater than 0" },
      { id: "-1", expectedError: "must be greater than 0" },
    ])("should validate task ID parameter: $id", async ({ id }) => {
      // Act
      const response = await request(app.getServer())
        .get(`/api/v1/tasks/${id}`)
        .set("Authorization", validToken)
        .expect(400);

      // Assert
      expect(response.body.error.code).toBe("validation_failed");
    });
  });

  // ============================================================================
  // PATCH /api/v1/tasks/:taskId - Update Task
  // ============================================================================

  describe("PATCH /api/v1/tasks/:taskId", () => {
    const taskId = 1;
    const updateRequest = TestFixtures.createUpdateTaskRequest();
    const updatedTask = TestFixtures.createTask({
      title: updateRequest.title || "Updated task title",
      status: updateRequest.status || "in-progress",
    });

    it("should update task successfully", async () => {
      // Arrange
      mockTaskService.updateTask.mockResolvedValue(updatedTask);

      // Act
      const response = await request(app.getServer())
        .patch(`/api/v1/tasks/${taskId}`)
        .set("Authorization", validToken)
        .send(updateRequest)
        .expect(200);

      // Assert - TEST_CASE_ERROR: API returns wrapped response format
      expect(response.body).toMatchObject({
        data: {
          id: taskId,
          title: updateRequest.title,
          status: updateRequest.status,
          updatedAt: updatedTask.updatedAt,
        },
      });

      expect(mockTaskService.updateTask).toHaveBeenCalledWith(
        taskId,
        updateRequest,
        expect.objectContaining({
          user: expect.objectContaining({
            id: authUser.id,
          }),
        }),
      );
    });

    it("should update single field", async () => {
      // Arrange
      const partialUpdate = { status: "done" as TaskStatus };
      const partiallyUpdatedTask = TestFixtures.createTask({
        id: taskId,
        status: "done",
      });
      mockTaskService.updateTask.mockResolvedValue(partiallyUpdatedTask);

      // Act
      const response = await request(app.getServer())
        .patch(`/api/v1/tasks/${taskId}`)
        .set("Authorization", validToken)
        .send(partialUpdate)
        .expect(200);

      // Assert - TEST_CASE_ERROR: API returns wrapped response format
      expect(response.body.data.status).toBe("done");
      expect(mockTaskService.updateTask).toHaveBeenCalledWith(
        taskId,
        partialUpdate,
        expect.any(Object),
      );
    });

    it("should return 404 for non-existent task", async () => {
      // Arrange
      mockTaskService.updateTask.mockRejectedValue(
        new NotFoundError("Task", taskId),
      );

      // Act
      const response = await request(app.getServer())
        .patch(`/api/v1/tasks/${taskId}`)
        .set("Authorization", validToken)
        .send(updateRequest)
        .expect(404);

      // Assert
      expect(response.body).toMatchObject({
        error: {
          code: "not_found",
          message: `Task with id ${taskId} not found`,
        },
      });
    });

    it("should return 403 for unauthorized access", async () => {
      // Arrange
      mockTaskService.updateTask.mockRejectedValue(
        new AuthorizationError("You can only access your own resources"),
      );

      // Act
      const response = await request(app.getServer())
        .patch(`/api/v1/tasks/${taskId}`)
        .set("Authorization", validToken)
        .send(updateRequest)
        .expect(403);

      // Assert
      expect(response.body.error.code).toBe("forbidden");
    });

    it("should return 422 for invalid status transitions", async () => {
      // Arrange
      mockTaskService.updateTask.mockRejectedValue(
        new BusinessLogicError("Cannot transition from done to not-started"),
      );

      const invalidTransition = { status: "not-started" as TaskStatus };

      // Act
      const response = await request(app.getServer())
        .patch(`/api/v1/tasks/${taskId}`)
        .set("Authorization", validToken)
        .send(invalidTransition)
        .expect(422);

      // Assert
      expect(response.body).toMatchObject({
        error: {
          code: "validation_failed",
          message: "Cannot transition from done to not-started",
        },
      });
    });

    // Update validation test cases
    it.each([
      {
        scenario: "empty title",
        request: { title: "" },
        expectedError: "title must not be empty",
      },
      {
        scenario: "title too long",
        request: { title: "a".repeat(256) },
        expectedError: "title must be 255 characters or less",
      },
      {
        scenario: "description too long",
        request: { description: "a".repeat(1001) },
        expectedError: "description must be 1000 characters or less",
      },
      {
        scenario: "invalid status",
        request: { status: "invalid" },
        expectedError: "status must be one of: not-started, in-progress, done",
      },
      {
        scenario: "invalid due date",
        request: { dueDate: "not-a-date" },
        expectedError: "dueDate must be a valid ISO 8601 date",
      },
      {
        scenario: "too many labels",
        request: { labels: Array(11).fill("label") },
        expectedError: "labels must contain at most 10 items",
      },
    ])(
      "should validate update: $scenario",
      async ({ request: requestData }) => {
        // Act
        const response = await request(app.getServer())
          .patch(`/api/v1/tasks/${taskId}`)
          .set("Authorization", validToken)
          .send(requestData)
          .expect(400);

        // Assert
        expect(response.body.error.code).toBe("validation_failed");
      },
    );
  });

  // ============================================================================
  // DELETE /api/v1/tasks/:taskId - Delete Task
  // ============================================================================

  describe("DELETE /api/v1/tasks/:taskId", () => {
    const taskId = 1;

    it("should delete task successfully", async () => {
      // Arrange
      mockTaskService.deleteTask.mockResolvedValue(true);

      // Act
      const response = await request(app.getServer())
        .delete(`/api/v1/tasks/${taskId}`)
        .set("Authorization", validToken)
        .expect(204);

      // Assert
      expect(response.body).toEqual({});
      expect(mockTaskService.deleteTask).toHaveBeenCalledWith(
        taskId,
        expect.objectContaining({
          user: expect.objectContaining({
            id: authUser.id,
          }),
        }),
      );
    });

    it("should return 404 for non-existent task", async () => {
      // Arrange
      mockTaskService.deleteTask.mockRejectedValue(
        new NotFoundError("Task", taskId),
      );

      // Act
      const response = await request(app.getServer())
        .delete(`/api/v1/tasks/${taskId}`)
        .set("Authorization", validToken)
        .expect(404);

      // Assert
      expect(response.body).toMatchObject({
        error: {
          code: "not_found",
          message: `Task with id ${taskId} not found`,
        },
      });
    });

    it("should return 403 for unauthorized access", async () => {
      // Arrange
      mockTaskService.deleteTask.mockRejectedValue(
        new AuthorizationError("You can only access your own resources"),
      );

      // Act
      const response = await request(app.getServer())
        .delete(`/api/v1/tasks/${taskId}`)
        .set("Authorization", validToken)
        .expect(403);

      // Assert
      expect(response.body.error.code).toBe("forbidden");
    });

    it("should return 401 for unauthenticated requests", async () => {
      // Act
      const response = await request(app.getServer())
        .delete(`/api/v1/tasks/${taskId}`)
        .expect(401);

      // Assert
      expect(response.body.error.code).toBe("unauthorized");
    });
  });

  // ============================================================================
  // Security and Error Handling Tests
  // ============================================================================

  describe("Security and Error Handling", () => {
    it("should include security headers", async () => {
      // Arrange
      mockTaskService.listTasks.mockResolvedValue(
        TestFixtures.createTaskListResponse([], 1, 10),
      );

      // Act
      const response = await request(app.getServer())
        .get("/api/v1/tasks")
        .set("Authorization", validToken);

      // Assert
      expect(response.headers["x-content-type-options"]).toBe("nosniff");
      expect(response.headers["x-frame-options"]).toBe("DENY");
    });

    it("should handle CORS preflight requests", async () => {
      // Act
      const response = await request(app.getServer())
        .options("/api/v1/tasks")
        .set("Origin", "http://localhost:3000")
        .set("Access-Control-Request-Method", "POST");

      // Assert
      expect(response.headers["access-control-allow-origin"]).toBeDefined();
      expect(response.headers["access-control-allow-methods"]).toContain(
        "POST",
      );
    });

    it("should handle malformed JSON", async () => {
      // Act
      const response = await request(app.getServer())
        .post("/api/v1/tasks")
        .set("Authorization", validToken)
        .set("Content-Type", "application/json")
        .send("{ invalid json")
        .expect(400);

      // Assert
      expect(response.body.error).toBeDefined();
    });

    it("should handle large request payloads", async () => {
      // Arrange
      const largePayload = {
        title: "Valid title",
        description: "a".repeat(2000000), // 2MB description
      };

      // Act
      const response = await request(app.getServer())
        .post("/api/v1/tasks")
        .set("Authorization", validToken)
        .send(largePayload)
        .expect(413);

      // Assert
      expect(response.body.error).toBeDefined();
    });

    it("should include correlation IDs in responses", async () => {
      // Arrange
      mockTaskService.listTasks.mockResolvedValue(
        TestFixtures.createTaskListResponse([], 1, 10),
      );
      const correlationId = "test-correlation-123";

      // Act
      const response = await request(app.getServer())
        .get("/api/v1/tasks")
        .set("Authorization", validToken)
        .set("X-Correlation-ID", correlationId);

      // Assert
      expect(response.headers["x-correlation-id"]).toBeDefined();
    });

    it("should handle database connection errors gracefully", async () => {
      // Arrange
      mockTaskService.listTasks.mockRejectedValue(
        new InternalServiceError("Database connection failed"),
      );

      // Act
      const response = await request(app.getServer())
        .get("/api/v1/tasks")
        .set("Authorization", validToken)
        .expect(500);

      // Assert
      expect(response.body).toMatchObject({
        error: {
          code: "internal_error",
          message: expect.stringContaining("error"),
        },
      });

      // Should not expose internal error details
      expect(response.body.error.message).not.toContain(
        "Database connection failed",
      );
    });
  });
});
