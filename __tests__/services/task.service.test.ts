/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * Task Service - Comprehensive Unit Tests
 *
 * Complete test suite for business logic validation, error handling, and service contracts.
 * Tests all methods, validation rules, error scenarios, and business rules.
 */

import { jest } from "@jest/globals";
import { TaskServiceImpl } from "../../src/task/services/task.service.impl";
import { ITaskRepository } from "../../src/task/repositories/task.repository";
import {
  CreateTaskRequest,
  UpdateTaskRequest,
  // Task,
  TaskListOptions,
  TaskStatus,
} from "../../src/task/api/types";
import { ServiceContext } from "../../src/common/types/service";
import {
  ValidationError,
  AuthenticationError,
  NotFoundError,
  BusinessLogicError,
  InternalServiceError,
} from "../../src/common/error/service-error";
import { TestFixtures } from "../helpers/test-fixtures";

describe("TaskServiceImpl", () => {
  let taskService: TaskServiceImpl;
  let mockRepository: jest.Mocked<ITaskRepository>;
  let serviceContext: ServiceContext;
  let unauthenticatedContext: ServiceContext;

  beforeEach(() => {
    // Setup mock repository
    mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findWithFilters: jest.fn(),
      search: jest.fn(),
      countUserTasks: jest.fn(),
      bulkUpdate: jest.fn(),
      findDueSoon: jest.fn(),
    } as unknown as jest.Mocked<ITaskRepository>;

    taskService = new TaskServiceImpl(mockRepository);

    // Setup service contexts
    serviceContext = TestFixtures.createServiceContext();
    unauthenticatedContext = TestFixtures.createServiceContext({
      user: undefined as any,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // createTask Method Tests
  // ============================================================================

  describe("createTask", () => {
    const validRequest = TestFixtures.createTaskRequest();
    const expectedTask = TestFixtures.createTask();

    it("should create task successfully with all fields", async () => {
      // Arrange
      mockRepository.create.mockResolvedValue(expectedTask);

      // Act
      const result = await taskService.createTask(validRequest, serviceContext);

      // Assert
      expect(result).toEqual(expectedTask);
      expect(mockRepository.create).toHaveBeenCalledWith(
        serviceContext.user!.id,
        {
          title: validRequest.title,
          description: validRequest.description,
          status: validRequest.status,
          dueDate: expect.any(Date),
          labels: validRequest.labels,
        },
      );
    });

    it("should create task with minimal required fields", async () => {
      // Arrange
      const minimalRequest = { title: "Simple task" };
      const minimalTask = TestFixtures.createTask({
        title: "Simple task",
        description: null,
        dueDate: null,
        labels: [],
      });
      mockRepository.create.mockResolvedValue(minimalTask);

      // Act
      const result = await taskService.createTask(
        minimalRequest,
        serviceContext,
      );

      // Assert
      expect(result).toEqual(minimalTask);
      expect(mockRepository.create).toHaveBeenCalledWith(
        serviceContext.user!.id,
        {
          title: "Simple task",
          status: "not-started",
          labels: [],
        },
      );
    });

    it("should throw AuthenticationError for unauthenticated user", async () => {
      // Act & Assert
      await expect(
        taskService.createTask(validRequest, unauthenticatedContext),
      ).rejects.toThrow(AuthenticationError);

      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it("should throw BusinessLogicError for past due date", async () => {
      // Arrange
      const pastDueDateRequest = {
        ...validRequest,
        dueDate: "2020-01-01T00:00:00.000Z", // Past date
      };

      // Act & Assert
      await expect(
        taskService.createTask(pastDueDateRequest, serviceContext),
      ).rejects.toThrow(BusinessLogicError);

      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    // Validation test cases using table-driven approach
    it.each([
      {
        scenario: "missing title",
        request: { description: "No title" },
        expectedError: "Title is required",
      },
      {
        scenario: "empty title",
        request: { title: "" },
        expectedError: "Title is required",
      },
      {
        scenario: "title too long",
        request: { title: "a".repeat(256) },
        expectedError: "Title must be 255 characters or less",
      },
      {
        scenario: "description too long",
        request: { title: "Valid", description: "a".repeat(1001) },
        expectedError: "Description must be 1000 characters or less",
      },
      {
        scenario: "too many labels",
        request: { title: "Valid", labels: Array(11).fill("label") },
        expectedError: "Maximum 10 labels allowed",
      },
      {
        scenario: "label too long",
        request: { title: "Valid", labels: ["a".repeat(51)] },
        expectedError: "Label must be 50 characters or less",
      },
    ])("should validate create request: $scenario", async ({ request }) => {
      // Act & Assert
      await expect(
        taskService.createTask(request as CreateTaskRequest, serviceContext),
      ).rejects.toThrow(ValidationError);

      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it("should throw InternalServiceError when repository fails", async () => {
      // Arrange
      mockRepository.create.mockRejectedValue(new Error("Database error"));

      // Act & Assert
      await expect(
        taskService.createTask(validRequest, serviceContext),
      ).rejects.toThrow(InternalServiceError);

      expect(mockRepository.create).toHaveBeenCalled();
    });

    it("should handle null/undefined optional fields", async () => {
      // Arrange
      const requestWithNulls = {
        title: "Test task",
      };
      const expectedTaskWithNulls = TestFixtures.createTask({
        description: null,
        dueDate: null,
        labels: [],
      });
      mockRepository.create.mockResolvedValue(expectedTaskWithNulls);

      // Act
      const result = await taskService.createTask(
        requestWithNulls,
        serviceContext,
      );

      // Assert
      expect(result).toEqual(expectedTaskWithNulls);
      expect(mockRepository.create).toHaveBeenCalledWith(
        serviceContext.user!.id,
        expect.objectContaining({
          title: "Test task",
          status: "not-started",
          labels: [],
        }),
      );
    });
  });

  // ============================================================================
  // getTaskById Method Tests
  // ============================================================================

  describe("getTaskById", () => {
    const taskId = 1;
    const mockTask = TestFixtures.createTask({ id: taskId });

    it("should return task successfully", async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(mockTask);

      // Act
      const result = await taskService.getTaskById(taskId, serviceContext);

      // Assert
      expect(result).toEqual(mockTask);
      expect(mockRepository.findById).toHaveBeenCalledWith(
        serviceContext.user!.id,
        taskId,
      );
    });

    it("should throw NotFoundError for non-existent task", async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        taskService.getTaskById(taskId, serviceContext),
      ).rejects.toThrow(NotFoundError);

      expect(mockRepository.findById).toHaveBeenCalledWith(
        serviceContext.user!.id,
        taskId,
      );
    });

    it("should throw AuthenticationError for unauthenticated user", async () => {
      // Act & Assert
      await expect(
        taskService.getTaskById(taskId, unauthenticatedContext),
      ).rejects.toThrow(AuthenticationError);

      expect(mockRepository.findById).not.toHaveBeenCalled();
    });

    it("should throw InternalServiceError when repository fails", async () => {
      // Arrange
      mockRepository.findById.mockRejectedValue(new Error("Database error"));

      // Act & Assert
      await expect(
        taskService.getTaskById(taskId, serviceContext),
      ).rejects.toThrow(InternalServiceError);
    });
  });

  // ============================================================================
  // updateTask Method Tests
  // ============================================================================

  describe("updateTask", () => {
    const taskId = 1;
    const existingTask = TestFixtures.createTask({ id: taskId });
    const updateRequest = TestFixtures.createUpdateTaskRequest();
    const updatedTask = TestFixtures.createTask({
      id: taskId,
      title: updateRequest.title!,
      status: updateRequest.status!,
      updatedAt: "2024-01-01T01:00:00.000Z",
    });

    it("should update task successfully", async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(existingTask);
      mockRepository.update.mockResolvedValue(updatedTask);

      // Act
      const result = await taskService.updateTask(
        taskId,
        updateRequest,
        serviceContext,
      );

      // Assert
      expect(result).toEqual(updatedTask);
      expect(mockRepository.findById).toHaveBeenCalledWith(
        serviceContext.user!.id,
        taskId,
      );
      expect(mockRepository.update).toHaveBeenCalledWith(
        serviceContext.user!.id,
        taskId,
        expect.objectContaining({
          title: updateRequest.title,
          status: updateRequest.status,
        }),
      );
    });

    it("should update single field", async () => {
      // Arrange
      const partialUpdate = { status: "done" as TaskStatus };
      const partiallyUpdatedTask = {
        ...existingTask,
        status: "done" as TaskStatus,
      };

      mockRepository.findById.mockResolvedValue(existingTask);
      mockRepository.update.mockResolvedValue(partiallyUpdatedTask);

      // Act
      const result = await taskService.updateTask(
        taskId,
        partialUpdate,
        serviceContext,
      );

      // Assert
      expect(result.status).toBe("done");
      expect(mockRepository.update).toHaveBeenCalledWith(
        serviceContext.user!.id,
        taskId,
        { status: "done" },
      );
    });

    it("should throw NotFoundError for non-existent task", async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        taskService.updateTask(taskId, updateRequest, serviceContext),
      ).rejects.toThrow(NotFoundError);

      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it("should throw AuthenticationError for unauthenticated user", async () => {
      // Act & Assert
      await expect(
        taskService.updateTask(taskId, updateRequest, unauthenticatedContext),
      ).rejects.toThrow(AuthenticationError);

      expect(mockRepository.findById).not.toHaveBeenCalled();
    });

    it("should throw BusinessLogicError for past due date", async () => {
      // Arrange
      const pastDueDateUpdate = { dueDate: "2020-01-01T00:00:00.000Z" };
      mockRepository.findById.mockResolvedValue(existingTask);

      // Act & Assert
      await expect(
        taskService.updateTask(taskId, pastDueDateUpdate, serviceContext),
      ).rejects.toThrow(BusinessLogicError);

      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    // Update validation test cases
    it.each([
      {
        scenario: "empty title",
        request: { title: "" },
        expectedError: "Title cannot be empty",
      },
      {
        scenario: "title too long",
        request: { title: "a".repeat(256) },
        expectedError: "Title must be 255 characters or less",
      },
      {
        scenario: "description too long",
        request: { description: "a".repeat(1001) },
        expectedError: "Description must be 1000 characters or less",
      },
      {
        scenario: "too many labels",
        request: { labels: Array(11).fill("label") },
        expectedError: "Maximum 10 labels allowed",
      },
    ])("should validate update request: $scenario", async ({ request }) => {
      // Arrange
      mockRepository.findById.mockResolvedValue(existingTask);

      // Act & Assert
      await expect(
        taskService.updateTask(
          taskId,
          request as UpdateTaskRequest,
          serviceContext,
        ),
      ).rejects.toThrow(ValidationError);

      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it("should handle null dueDate to clear due date", async () => {
      // Arrange
      const clearDueDateUpdate = { dueDate: null };
      const taskWithoutDueDate = { ...existingTask, dueDate: null };

      mockRepository.findById.mockResolvedValue(existingTask);
      mockRepository.update.mockResolvedValue(taskWithoutDueDate);

      // Act
      const result = await taskService.updateTask(
        taskId,
        clearDueDateUpdate,
        serviceContext,
      );

      // Assert
      expect(result.dueDate).toBeNull();
      expect(mockRepository.update).toHaveBeenCalledWith(
        serviceContext.user!.id,
        taskId,
        { dueDate: null },
      );
    });
  });

  // ============================================================================
  // deleteTask Method Tests
  // ============================================================================

  describe("deleteTask", () => {
    const taskId = 1;
    const existingTask = TestFixtures.createTask({ id: taskId });

    it("should delete task successfully", async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(existingTask);
      mockRepository.delete.mockResolvedValue();

      // Act
      await taskService.deleteTask(taskId, serviceContext);

      // Assert
      expect(mockRepository.findById).toHaveBeenCalledWith(
        serviceContext.user!.id,
        taskId,
      );
      expect(mockRepository.delete).toHaveBeenCalledWith(
        serviceContext.user!.id,
        taskId,
      );
    });

    it("should throw NotFoundError for non-existent task", async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        taskService.deleteTask(taskId, serviceContext),
      ).rejects.toThrow(NotFoundError);

      expect(mockRepository.delete).not.toHaveBeenCalled();
    });

    it("should throw AuthenticationError for unauthenticated user", async () => {
      // Act & Assert
      await expect(
        taskService.deleteTask(taskId, unauthenticatedContext),
      ).rejects.toThrow(AuthenticationError);

      expect(mockRepository.findById).not.toHaveBeenCalled();
    });

    it("should throw InternalServiceError when delete fails", async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(existingTask);
      mockRepository.delete.mockRejectedValue(new Error("Database error"));

      // Act & Assert
      await expect(
        taskService.deleteTask(taskId, serviceContext),
      ).rejects.toThrow(InternalServiceError);
    });
  });

  // ============================================================================
  // listTasks Method Tests
  // ============================================================================

  describe("listTasks", () => {
    const mockTasks = TestFixtures.createTaskArray(3);
    const mockRepositoryResult = {
      tasks: mockTasks,
      total: 3,
    };

    it("should list tasks with default options", async () => {
      // Arrange
      const options: TaskListOptions = {};
      mockRepository.findWithFilters.mockResolvedValue(mockRepositoryResult);

      // Act
      const result = await taskService.listTasks(options, serviceContext);

      // Assert
      expect(result).toEqual({
        data: mockTasks,
        meta: {
          page: 1,
          limit: 10,
          total: 3,
          totalPages: 1,
        },
      });

      expect(mockRepository.findWithFilters).toHaveBeenCalledWith(
        serviceContext.user!.id,
        {
          page: 1,
          limit: 10,
          sortBy: "createdAt",
          sortOrder: "desc",
        },
      );
    });

    it("should list tasks with custom options", async () => {
      // Arrange
      const options: TaskListOptions = {
        page: 2,
        limit: 5,
        status: "in-progress",
        q: "search term",
        sortBy: "dueDate",
        order: "asc",
      };
      mockRepository.findWithFilters.mockResolvedValue({
        tasks: mockTasks.slice(0, 1),
        total: 1,
      });

      // Act
      const result = await taskService.listTasks(options, serviceContext);

      // Assert
      expect(result.meta).toMatchObject({
        page: 2,
        limit: 5,
        total: 1,
        totalPages: 1,
      });

      expect(mockRepository.findWithFilters).toHaveBeenCalledWith(
        serviceContext.user!.id,
        {
          page: 2,
          limit: 5,
          sortBy: "dueDate",
          sortOrder: "asc",
          status: "in-progress",
          search: "search term",
        },
      );
    });

    it("should throw AuthenticationError for unauthenticated user", async () => {
      // Act & Assert
      await expect(
        taskService.listTasks({}, unauthenticatedContext),
      ).rejects.toThrow(AuthenticationError);

      expect(mockRepository.findWithFilters).not.toHaveBeenCalled();
    });

    it("should validate list options", async () => {
      // Arrange
      const invalidOptions = {
        page: -1,
        limit: 101,
      };

      // Act & Assert
      await expect(
        taskService.listTasks(invalidOptions, serviceContext),
      ).rejects.toThrow(ValidationError);

      expect(mockRepository.findWithFilters).not.toHaveBeenCalled();
    });

    it("should handle empty search query", async () => {
      // Arrange
      const options = { q: "" };
      mockRepository.findWithFilters.mockResolvedValue(mockRepositoryResult);

      // Act
      await taskService.listTasks(options, serviceContext);

      // Assert
      expect(mockRepository.findWithFilters).toHaveBeenCalledWith(
        serviceContext.user!.id,
        expect.not.objectContaining({
          search: expect.anything(),
        }),
      );
    });
  });

  // ============================================================================
  // searchTasks Method Tests
  // ============================================================================

  describe("searchTasks", () => {
    const searchQuery = "documentation";
    const searchResults = TestFixtures.createTaskArray(2);

    it("should search tasks successfully", async () => {
      // Arrange
      mockRepository.search.mockResolvedValue(searchResults);

      // Act
      const result = await taskService.searchTasks(
        searchQuery,
        {},
        serviceContext,
      );

      // Assert
      expect(result).toEqual({
        data: searchResults,
        meta: {
          page: 1,
          limit: searchResults.length,
          total: searchResults.length,
          totalPages: 1,
        },
      });

      expect(mockRepository.search).toHaveBeenCalledWith(
        serviceContext.user!.id,
        searchQuery,
      );
    });

    it("should throw ValidationError for empty search query", async () => {
      // Act & Assert
      await expect(
        taskService.searchTasks("", {}, serviceContext),
      ).rejects.toThrow(ValidationError);

      await expect(
        taskService.searchTasks("   ", {}, serviceContext),
      ).rejects.toThrow(ValidationError);

      expect(mockRepository.search).not.toHaveBeenCalled();
    });

    it("should throw AuthenticationError for unauthenticated user", async () => {
      // Act & Assert
      await expect(
        taskService.searchTasks(searchQuery, {}, unauthenticatedContext),
      ).rejects.toThrow(AuthenticationError);

      expect(mockRepository.search).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // getTaskStatistics Method Tests
  // ============================================================================

  describe("getTaskStatistics", () => {
    const mockTasks = TestFixtures.createTasksWithStatuses();
    const mockStatusCounts = [
      { status: "not-started" as TaskStatus, count: 1 },
      { status: "in-progress" as TaskStatus, count: 1 },
      { status: "done" as TaskStatus, count: 1 },
    ];

    it("should return task statistics", async () => {
      // Arrange
      mockRepository.countUserTasks.mockResolvedValue(mockStatusCounts);
      mockRepository.findByUserId.mockResolvedValue(mockTasks);

      // Act
      const result = await taskService.getTaskStatistics(serviceContext);

      // Assert
      expect(result).toMatchObject({
        totalTasks: 3,
        completedTasks: 1,
        inProgressTasks: 1,
        notStartedTasks: 1,
        overdueTasks: expect.any(Number),
        tasksCreatedThisWeek: expect.any(Number),
        tasksCompletedThisWeek: expect.any(Number),
        averageCompletionTimeHours: expect.any(Number),
      });

      expect(mockRepository.countUserTasks).toHaveBeenCalledWith(
        serviceContext.user!.id,
      );
      expect(mockRepository.findByUserId).toHaveBeenCalledWith(
        serviceContext.user!.id,
      );
    });

    it("should handle empty task list", async () => {
      // Arrange
      mockRepository.countUserTasks.mockResolvedValue([]);
      mockRepository.findByUserId.mockResolvedValue([]);

      // Act
      const result = await taskService.getTaskStatistics(serviceContext);

      // Assert
      expect(result).toMatchObject({
        totalTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        notStartedTasks: 0,
        overdueTasks: 0,
        tasksCreatedThisWeek: 0,
        tasksCompletedThisWeek: 0,
        averageCompletionTimeHours: 0,
      });
    });

    it("should throw AuthenticationError for unauthenticated user", async () => {
      // Act & Assert
      await expect(
        taskService.getTaskStatistics(unauthenticatedContext),
      ).rejects.toThrow(AuthenticationError);
    });
  });

  // ============================================================================
  // bulkUpdateTaskStatus Method Tests
  // ============================================================================

  describe("bulkUpdateTaskStatus", () => {
    const taskIds = [1, 2, 3];
    const status = "in-progress" as TaskStatus;
    const mockTasks = TestFixtures.createTaskArray(3);

    it("should bulk update task status successfully", async () => {
      // Arrange
      mockRepository.findById
        .mockResolvedValueOnce(mockTasks[0] ?? null)
        .mockResolvedValueOnce(mockTasks[1] ?? null)
        .mockResolvedValueOnce(mockTasks[2] ?? null);
      mockRepository.bulkUpdate.mockResolvedValue(mockTasks);

      // Act
      const result = await taskService.bulkUpdateTaskStatus(
        taskIds,
        status,
        serviceContext,
      );

      // Assert
      expect(result).toBe(3);
      expect(mockRepository.findById).toHaveBeenCalledTimes(3);
      expect(mockRepository.bulkUpdate).toHaveBeenCalledWith(
        serviceContext.user!.id,
        taskIds,
        { status },
      );
    });

    it("should throw ValidationError for empty task IDs", async () => {
      // Act & Assert
      await expect(
        taskService.bulkUpdateTaskStatus([], status, serviceContext),
      ).rejects.toThrow(ValidationError);

      expect(mockRepository.bulkUpdate).not.toHaveBeenCalled();
    });

    it("should throw ValidationError for invalid status", async () => {
      // Act & Assert
      await expect(
        taskService.bulkUpdateTaskStatus(
          taskIds,
          "invalid-status" as any,
          serviceContext,
        ),
      ).rejects.toThrow(ValidationError);

      expect(mockRepository.bulkUpdate).not.toHaveBeenCalled();
    });

    it("should throw NotFoundError if any task not found", async () => {
      // Arrange
      mockRepository.findById
        .mockResolvedValueOnce(mockTasks[0] ?? null)
        .mockResolvedValueOnce(null); // Task 2 not found

      // Act & Assert
      await expect(
        taskService.bulkUpdateTaskStatus(taskIds, status, serviceContext),
      ).rejects.toThrow(NotFoundError);

      expect(mockRepository.bulkUpdate).not.toHaveBeenCalled();
    });

    it("should throw AuthenticationError for unauthenticated user", async () => {
      // Act & Assert
      await expect(
        taskService.bulkUpdateTaskStatus(
          taskIds,
          status,
          unauthenticatedContext,
        ),
      ).rejects.toThrow(AuthenticationError);
    });
  });

  // ============================================================================
  // getTasksDueSoon Method Tests
  // ============================================================================

  describe("getTasksDueSoon", () => {
    const daysAhead = 7;
    const dueSoonTasks = TestFixtures.createTasksWithDueDates().slice(0, 2);

    it("should return tasks due soon", async () => {
      // Arrange
      mockRepository.findDueSoon.mockResolvedValue(dueSoonTasks);

      // Act
      const result = await taskService.getTasksDueSoon(
        daysAhead,
        serviceContext,
      );

      // Assert
      expect(result).toEqual(dueSoonTasks);
      expect(mockRepository.findDueSoon).toHaveBeenCalledWith(
        serviceContext.user!.id,
        daysAhead * 24, // Convert to hours
      );
    });

    it("should validate daysAhead parameter", async () => {
      // Act & Assert
      await expect(
        taskService.getTasksDueSoon(0, serviceContext),
      ).rejects.toThrow(ValidationError);

      await expect(
        taskService.getTasksDueSoon(366, serviceContext),
      ).rejects.toThrow(ValidationError);

      expect(mockRepository.findDueSoon).not.toHaveBeenCalled();
    });

    it("should throw AuthenticationError for unauthenticated user", async () => {
      // Act & Assert
      await expect(
        taskService.getTasksDueSoon(daysAhead, unauthenticatedContext),
      ).rejects.toThrow(AuthenticationError);

      expect(mockRepository.findDueSoon).not.toHaveBeenCalled();
    });

    it("should throw InternalServiceError when repository fails", async () => {
      // Arrange
      mockRepository.findDueSoon.mockRejectedValue(new Error("Database error"));

      // Act & Assert
      await expect(
        taskService.getTasksDueSoon(daysAhead, serviceContext),
      ).rejects.toThrow(InternalServiceError);
    });
  });

  // ============================================================================
  // Edge Cases and Error Scenarios
  // ============================================================================

  describe("Edge Cases and Error Handling", () => {
    it("should handle repository returning unexpected null values", async () => {
      // Arrange
      mockRepository.update.mockResolvedValue(null);
      mockRepository.findById.mockResolvedValue(TestFixtures.createTask());

      // Act & Assert
      await expect(
        taskService.updateTask(1, { title: "Updated" }, serviceContext),
      ).rejects.toThrow(NotFoundError);
    });

    it("should handle concurrent access scenarios", async () => {
      // Test that service methods are safe for concurrent execution
      const task = TestFixtures.createTask();
      mockRepository.findById.mockResolvedValue(task);
      mockRepository.create.mockResolvedValue(task);

      // Act
      const concurrentRequests = [
        taskService.createTask(
          TestFixtures.createTaskRequest(),
          serviceContext,
        ),
        taskService.getTaskById(1, serviceContext),
        taskService.createTask(
          TestFixtures.createTaskRequest(),
          serviceContext,
        ),
      ];

      // Assert - Should not throw due to concurrent access
      const results = await Promise.all(concurrentRequests);
      expect(results).toHaveLength(3);
    });

    it("should handle malformed dates gracefully", async () => {
      // This is handled at API validation level, but testing service robustness
      const requestWithInvalidDate = {
        title: "Test",
        dueDate: "invalid-date-format",
      };

      // The Date constructor will create an invalid date
      // Service should handle this scenario appropriately
      await expect(
        taskService.createTask(requestWithInvalidDate as any, serviceContext),
      ).rejects.toThrow();
    });

    it("should maintain data consistency in error scenarios", async () => {
      // Arrange - Simulate partial failure during update
      mockRepository.findById.mockResolvedValue(TestFixtures.createTask());
      mockRepository.update.mockRejectedValue(
        new Error("Constraint violation"),
      );

      // Act & Assert
      await expect(
        taskService.updateTask(1, { title: "Updated" }, serviceContext),
      ).rejects.toThrow(InternalServiceError);

      // Verify repository was called
      expect(mockRepository.findById).toHaveBeenCalled();
      expect(mockRepository.update).toHaveBeenCalled();
    });
  });
});
