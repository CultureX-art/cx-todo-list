/**
 * Task Repository - Comprehensive Unit Tests
 *
 * Complete test suite for data access layer operations, SQL queries,
 * data transformations, and database interactions.
 */

import { jest } from "@jest/globals";
import { MySQLTaskRepository } from "../../src/task/repositories/task.repository.impl";
import { IDatabaseConnection } from "../../src/common/database/connection";
import { TaskRow, TaskRowWithCount } from "../../src/common/database/types";
import {
  TaskCreateData,
  TaskUpdateData,
  TaskFilterOptions,
} from "../../src/task/repositories/task.repository";
import { TaskStatus } from "../../src/task/api/types";

describe("MySQLTaskRepository", () => {
  let repository: MySQLTaskRepository;
  let mockDb: jest.Mocked<IDatabaseConnection>;
  const userId = 1;

  beforeEach(() => {
    // Mock database connection
    mockDb = {
      execute: jest.fn(),
      queryTasks: jest.fn(),
      queryTasksWithCount: jest.fn(),
      queryTaskCount: jest.fn(),
      queryTaskStatusCounts: jest.fn(),
    } as unknown as jest.Mocked<IDatabaseConnection>;

    repository = new MySQLTaskRepository(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Helper function to create mock task row
  const createMockTaskRow = (overrides: Partial<TaskRow> = {}): TaskRow => ({
    id: 1,
    user_id: userId,
    title: "Test Task",
    description: "Test description",
    status: "not-started",
    due_date: new Date("2024-01-20T17:00:00.000Z"),
    labels: JSON.stringify(["test", "example"]),
    created_at: new Date("2024-01-01T00:00:00.000Z"),
    updated_at: new Date("2024-01-01T00:00:00.000Z"),
    deleted_at: null,
    ...overrides,
  });

  // ============================================================================
  // create Method Tests
  // ============================================================================

  describe("create", () => {
    const createData: TaskCreateData = {
      title: "New Task",
      description: "Task description",
      status: "not-started",
      dueDate: new Date("2024-01-20T17:00:00.000Z"),
      labels: ["new", "test"],
    };

    it("should create task successfully", async () => {
      // Arrange
      const insertId = 1;
      const mockRow = createMockTaskRow({
        id: insertId,
        title: createData.title,
        description: createData.description ?? null,
      });

      mockDb.execute.mockResolvedValue([
        null as any,
        { insertId, affectedRows: 1 } as any,
      ]);
      mockDb.queryTasks.mockResolvedValue([[mockRow], null as any]);

      // Act
      const result = await repository.create(userId, createData);

      // Assert
      expect(result).toMatchObject({
        id: insertId,
        title: createData.title,
        description: createData.description,
        status: createData.status,
        labels: createData.labels,
      });

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO task"),
        [
          userId,
          createData.title,
          createData.description,
          createData.dueDate,
          createData.status,
          JSON.stringify(createData.labels),
        ],
      );

      expect(mockDb.queryTasks).toHaveBeenCalledWith(
        expect.stringContaining("SELECT * FROM task WHERE user_id = ?"),
        [userId, insertId],
      );
    });

    it("should create task with default values", async () => {
      // Arrange
      const minimalData: TaskCreateData = {
        title: "Minimal Task",
      };
      const insertId = 2;
      const mockRow = createMockTaskRow({
        id: insertId,
        title: minimalData.title,
        description: null,
        status: "not-started",
        due_date: null,
        labels: "[]",
      });

      mockDb.execute.mockResolvedValue([
        null as any,
        { insertId, affectedRows: 1 } as any,
      ]);
      mockDb.queryTasks.mockResolvedValue([[mockRow], null as any]);

      // Act
      const result = await repository.create(userId, minimalData);

      // Assert
      expect(result.title).toBe(minimalData.title);
      expect(result.description).toBeNull();
      expect(result.status).toBe("not-started");
      expect(result.dueDate).toBeNull();
      expect(result.labels).toEqual([]);

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO task"),
        [userId, minimalData.title, undefined, undefined, "not-started", "[]"],
      );
    });

    it("should throw error when insert fails", async () => {
      // Arrange
      mockDb.execute.mockResolvedValue([null as any, { insertId: 0 } as any]);

      // Act & Assert
      await expect(repository.create(userId, createData)).rejects.toThrow(
        "Failed to create task: no insert ID returned",
      );
    });

    it("should throw error when created task cannot be retrieved", async () => {
      // Arrange
      const insertId = 1;
      mockDb.execute.mockResolvedValue([null as any, { insertId } as any]);
      mockDb.queryTasks.mockResolvedValue([[], null as any]);

      // Act & Assert
      await expect(repository.create(userId, createData)).rejects.toThrow(
        "Failed to retrieve created task",
      );
    });

    it("should handle database errors during insert", async () => {
      // Arrange
      mockDb.execute.mockRejectedValue(new Error("Database connection failed"));

      // Act & Assert
      await expect(repository.create(userId, createData)).rejects.toThrow(
        "Database connection failed",
      );
    });
  });

  // ============================================================================
  // findById Method Tests
  // ============================================================================

  describe("findById", () => {
    const taskId = 1;

    it("should return task when found", async () => {
      // Arrange
      const mockRow = createMockTaskRow({ id: taskId });
      mockDb.queryTasks.mockResolvedValue([[mockRow], null as any]);

      // Act
      const result = await repository.findById(userId, taskId);

      // Assert
      expect(result).toMatchObject({
        id: taskId,
        title: mockRow.title,
        description: mockRow.description,
        status: mockRow.status,
      });

      expect(mockDb.queryTasks).toHaveBeenCalledWith(
        expect.stringContaining("SELECT * FROM task WHERE user_id = ?"),
        [userId, taskId],
      );
    });

    it("should return null when task not found", async () => {
      // Arrange
      mockDb.queryTasks.mockResolvedValue([[], null as any]);

      // Act
      const result = await repository.findById(userId, taskId);

      // Assert
      expect(result).toBeNull();
    });

    it("should handle database errors", async () => {
      // Arrange
      mockDb.queryTasks.mockRejectedValue(new Error("Database error"));

      // Act & Assert
      await expect(repository.findById(userId, taskId)).rejects.toThrow(
        "Database error",
      );
    });

    it("should transform database row to Task correctly", async () => {
      // Arrange
      const mockRow = createMockTaskRow({
        id: taskId,
        title: "Test Task",
        description: "Test description",
        status: "in-progress",
        due_date: new Date("2024-01-20T17:00:00.000Z"),
        labels: JSON.stringify(["urgent", "bug"]),
        created_at: new Date("2024-01-01T00:00:00.000Z"),
        updated_at: new Date("2024-01-02T00:00:00.000Z"),
      });
      mockDb.queryTasks.mockResolvedValue([[mockRow], null as any]);

      // Act
      const result = await repository.findById(userId, taskId);

      // Assert
      expect(result).toEqual({
        id: taskId,
        title: "Test Task",
        description: "Test description",
        status: "in-progress",
        dueDate: "2024-01-20T17:00:00.000Z",
        labels: ["urgent", "bug"],
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-02T00:00:00.000Z",
      });
    });

    it("should handle null and undefined fields", async () => {
      // Arrange
      const mockRow = createMockTaskRow({
        id: taskId,
        description: null,
        due_date: null,
        labels: "",
      });
      mockDb.queryTasks.mockResolvedValue([[mockRow], null as any]);

      // Act
      const result = await repository.findById(userId, taskId);

      // Assert
      expect(result?.description).toBeNull();
      expect(result?.dueDate).toBeNull();
      expect(result?.labels).toEqual([]);
    });

    it("should handle malformed JSON labels gracefully", async () => {
      // Arrange
      const mockRow = createMockTaskRow({
        id: taskId,
        labels: "invalid-json",
      });
      mockDb.queryTasks.mockResolvedValue([[mockRow], null as any]);

      // Act
      const result = await repository.findById(userId, taskId);

      // Assert
      expect(result?.labels).toEqual([]);
    });
  });

  // ============================================================================
  // findByUserId Method Tests
  // ============================================================================

  describe("findByUserId", () => {
    it("should return all user tasks", async () => {
      // Arrange
      const mockRows = [
        createMockTaskRow({ id: 1, title: "Task 1" }),
        createMockTaskRow({ id: 2, title: "Task 2" }),
        createMockTaskRow({ id: 3, title: "Task 3" }),
      ];
      mockDb.queryTasks.mockResolvedValue([mockRows, null as any]);

      // Act
      const result = await repository.findByUserId(userId);

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0]?.title).toBe("Task 1");
      expect(result[1]?.title).toBe("Task 2");
      expect(result[2]?.title).toBe("Task 3");

      expect(mockDb.queryTasks).toHaveBeenCalledWith(
        expect.stringContaining(
          "SELECT * FROM task WHERE user_id = ? AND deleted_at IS NULL ORDER BY created_at DESC",
        ),
        [userId],
      );
    });

    it("should return empty array when no tasks found", async () => {
      // Arrange
      mockDb.queryTasks.mockResolvedValue([[], null as any]);

      // Act
      const result = await repository.findByUserId(userId);

      // Assert
      expect(result).toEqual([]);
    });

    it("should handle database errors", async () => {
      // Arrange
      mockDb.queryTasks.mockRejectedValue(new Error("Connection timeout"));

      // Act & Assert
      await expect(repository.findByUserId(userId)).rejects.toThrow(
        "Connection timeout",
      );
    });
  });

  // ============================================================================
  // findWithFilters Method Tests
  // ============================================================================

  describe("findWithFilters", () => {
    const mockTaskRows = [
      createMockTaskRow({ id: 1, title: "Task 1", status: "not-started" }),
      createMockTaskRow({ id: 2, title: "Task 2", status: "in-progress" }),
    ];

    it("should filter tasks with default options", async () => {
      // Arrange
      const options: TaskFilterOptions = {};
      const mockRowsWithCount: TaskRowWithCount[] = mockTaskRows.map((row) => ({
        ...row,
        total_count: 2,
      }));
      mockDb.queryTasksWithCount.mockResolvedValue([
        mockRowsWithCount,
        null as any,
      ]);

      // Act
      const result = await repository.findWithFilters(userId, options);

      // Assert
      expect(result).toEqual({
        tasks: expect.arrayContaining([
          expect.objectContaining({ id: 1, title: "Task 1" }),
          expect.objectContaining({ id: 2, title: "Task 2" }),
        ]),
        total: 2,
      });

      expect(mockDb.queryTasksWithCount).toHaveBeenCalledWith(
        expect.stringContaining("ORDER BY createdAt DESC"),
        [userId],
      );
    });

    it("should filter by status", async () => {
      // Arrange
      const options: TaskFilterOptions = { status: "in-progress" };
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const filteredRows: TaskRowWithCount[] = [mockTaskRows[1]!].map(
        (row) => ({ ...row, total_count: 1 }),
      );
      mockDb.queryTasksWithCount.mockResolvedValue([filteredRows, null as any]);

      // Act
      const result = await repository.findWithFilters(userId, options);

      // Assert
      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0]?.status).toBe("in-progress");
      expect(result.total).toBe(1);

      expect(mockDb.queryTasksWithCount).toHaveBeenCalledWith(
        expect.stringContaining("status = ?"),
        expect.arrayContaining([userId, "in-progress"]),
      );
    });

    it("should filter by labels", async () => {
      // Arrange
      const options: TaskFilterOptions = { labels: ["urgent", "bug"] };
      const mockRowsWithCount: TaskRowWithCount[] = mockTaskRows.map((row) => ({
        ...row,
        total_count: 2,
      }));
      mockDb.queryTasksWithCount.mockResolvedValue([
        mockRowsWithCount,
        null as any,
      ]);

      // Act
      await repository.findWithFilters(userId, options);

      // Assert
      expect(mockDb.queryTasksWithCount).toHaveBeenCalledWith(
        expect.stringContaining(
          "JSON_CONTAINS(labels, ?) OR JSON_CONTAINS(labels, ?)",
        ),
        expect.arrayContaining([userId, '"urgent"', '"bug"']),
      );
    });

    it("should filter by search query", async () => {
      // Arrange
      const options: TaskFilterOptions = { search: "documentation" };
      const mockRowsWithCount: TaskRowWithCount[] = mockTaskRows.map((row) => ({
        ...row,
        total_count: 2,
      }));
      mockDb.queryTasksWithCount.mockResolvedValue([
        mockRowsWithCount,
        null as any,
      ]);

      // Act
      await repository.findWithFilters(userId, options);

      // Assert
      expect(mockDb.queryTasksWithCount).toHaveBeenCalledWith(
        expect.stringContaining("MATCH(title, description) AGAINST(?)"),
        expect.arrayContaining([
          userId,
          "documentation",
          "%documentation%",
          "%documentation%",
        ]),
      );
    });

    it("should apply pagination", async () => {
      // Arrange
      const options: TaskFilterOptions = { page: 2, limit: 5 };
      const mockRowsWithCount: TaskRowWithCount[] = mockTaskRows.map((row) => ({
        ...row,
        total_count: 10,
      }));
      mockDb.queryTasksWithCount.mockResolvedValue([
        mockRowsWithCount,
        null as any,
      ]);

      // Act
      await repository.findWithFilters(userId, options);

      // Assert
      expect(mockDb.queryTasksWithCount).toHaveBeenCalledWith(
        expect.stringContaining("LIMIT 5 OFFSET 5"),
        expect.any(Array),
      );
    });

    it("should apply sorting", async () => {
      // Arrange
      const options: TaskFilterOptions = {
        sortBy: "dueDate",
        sortOrder: "asc",
      };
      const mockRowsWithCount: TaskRowWithCount[] = mockTaskRows.map((row) => ({
        ...row,
        total_count: 2,
      }));
      mockDb.queryTasksWithCount.mockResolvedValue([
        mockRowsWithCount,
        null as any,
      ]);

      // Act
      await repository.findWithFilters(userId, options);

      // Assert
      expect(mockDb.queryTasksWithCount).toHaveBeenCalledWith(
        expect.stringContaining("ORDER BY dueDate ASC"),
        expect.any(Array),
      );
    });

    it("should combine multiple filters", async () => {
      // Arrange
      const options: TaskFilterOptions = {
        status: "not-started",
        labels: ["urgent"],
        search: "bug",
        page: 1,
        limit: 10,
        sortBy: "createdAt",
        sortOrder: "desc",
      };
      const mockRowsWithCount: TaskRowWithCount[] = mockTaskRows.map((row) => ({
        ...row,
        total_count: 1,
      }));
      mockDb.queryTasksWithCount.mockResolvedValue([
        mockRowsWithCount,
        null as any,
      ]);

      // Act
      await repository.findWithFilters(userId, options);

      // Assert
      expect(mockDb.queryTasksWithCount).toHaveBeenCalledWith(
        expect.stringMatching(
          /status = \?.*JSON_CONTAINS.*MATCH.*ORDER BY createdAt DESC.*LIMIT 10 OFFSET 0/s,
        ),
        expect.arrayContaining([
          userId,
          "not-started",
          '"urgent"',
          "bug",
          "%bug%",
          "%bug%",
        ]),
      );
    });

    it("should return empty result when no tasks match", async () => {
      // Arrange
      const options: TaskFilterOptions = { status: "done" };
      mockDb.queryTasksWithCount.mockResolvedValue([[], null as any]);

      // Act
      const result = await repository.findWithFilters(userId, options);

      // Assert
      expect(result).toEqual({ tasks: [], total: 0 });
    });

    it("should ignore empty search query", async () => {
      // Arrange
      const options: TaskFilterOptions = { search: "   " };
      const mockRowsWithCount: TaskRowWithCount[] = mockTaskRows.map((row) => ({
        ...row,
        total_count: 2,
      }));
      mockDb.queryTasksWithCount.mockResolvedValue([
        mockRowsWithCount,
        null as any,
      ]);

      // Act
      await repository.findWithFilters(userId, options);

      // Assert
      expect(mockDb.queryTasksWithCount).toHaveBeenCalledWith(
        expect.not.stringContaining("MATCH(title, description)"),
        [userId],
      );
    });
  });

  // ============================================================================
  // update Method Tests
  // ============================================================================

  describe("update", () => {
    const taskId = 1;
    const existingTask = createMockTaskRow({ id: taskId });

    it("should update task successfully", async () => {
      // Arrange
      const updateData: TaskUpdateData = {
        title: "Updated Task",
        status: "in-progress",
        labels: ["updated", "test"],
      };
      const updatedTask = createMockTaskRow({
        id: taskId,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        title: updateData.title!,
        status: updateData.status as TaskStatus,
        labels: JSON.stringify(updateData.labels),
        user_id: userId,
      });

      mockDb.execute.mockResolvedValue([
        null as any,
        { affectedRows: 1 } as any,
      ]);
      mockDb.queryTasks.mockResolvedValue([[updatedTask], null as any]);

      // Act
      const result = await repository.update(userId, taskId, updateData);

      // Assert
      expect(result).toMatchObject({
        id: taskId,
        title: updateData.title,
        status: updateData.status,
        labels: updateData.labels,
      });

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining(
          "UPDATE task SET title = ?, status = ?, labels = ?, updated_at = NOW()",
        ),
        expect.arrayContaining([
          userId,
          updateData.title,
          updateData.status,
          JSON.stringify(updateData.labels),
          taskId,
        ]),
      );
    });

    it("should update single field", async () => {
      // Arrange
      const updateData: TaskUpdateData = { status: "done" };
      const updatedTask = createMockTaskRow({ id: taskId, status: "done" });

      mockDb.execute.mockResolvedValue([
        null as any,
        { affectedRows: 1 } as any,
      ]);
      mockDb.queryTasks.mockResolvedValue([[updatedTask], null as any]);

      // Act
      const result = await repository.update(userId, taskId, updateData);

      // Assert
      expect(result?.status).toBe("done");
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining(
          "UPDATE task SET status = ?, updated_at = NOW()",
        ),
        expect.arrayContaining([userId, "done", taskId]),
      );
    });

    it("should handle null values in update", async () => {
      // Arrange
      const updateData: TaskUpdateData = {
        description: null,
        dueDate: null,
      };
      const updatedTask = createMockTaskRow({
        id: taskId,
        description: null,
        due_date: null,
      });

      mockDb.execute.mockResolvedValue([
        null as any,
        { affectedRows: 1 } as any,
      ]);
      mockDb.queryTasks.mockResolvedValue([[updatedTask], null as any]);

      // Act
      const result = await repository.update(userId, taskId, updateData);

      // Assert
      expect(result?.description).toBeNull();
      expect(result?.dueDate).toBeNull();
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining("description = ?, due_date = ?"),
        expect.arrayContaining([userId, null, null, taskId]),
      );
    });

    it("should return existing task when no updates provided", async () => {
      // Arrange
      const updateData: TaskUpdateData = {};
      mockDb.queryTasks.mockResolvedValue([[existingTask], null as any]);

      // Act
      const result = await repository.update(userId, taskId, updateData);

      // Assert
      expect(result).toMatchObject({ id: taskId });
      expect(mockDb.execute).not.toHaveBeenCalled();
      expect(mockDb.queryTasks).toHaveBeenCalledWith(
        expect.stringContaining("SELECT * FROM task WHERE user_id = ?"),
        [userId, taskId],
      );
    });

    it("should return null when task not found", async () => {
      // Arrange
      const updateData: TaskUpdateData = { title: "Updated" };
      mockDb.execute.mockResolvedValue([
        null as any,
        { affectedRows: 0 } as any,
      ]);

      // Act
      const result = await repository.update(userId, taskId, updateData);

      // Assert
      expect(result).toBeNull();
    });

    it("should convert camelCase to snake_case for database columns", async () => {
      // Arrange
      const updateData: TaskUpdateData = {
        dueDate: new Date("2024-02-01T00:00:00.000Z"),
      };

      mockDb.execute.mockResolvedValue([
        null as any,
        { affectedRows: 1 } as any,
      ]);
      mockDb.queryTasks.mockResolvedValue([[existingTask], null as any]);

      // Act
      await repository.update(userId, taskId, updateData);

      // Assert
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining("due_date = ?"),
        expect.any(Array),
      );
    });
  });

  // ============================================================================
  // delete Method Tests
  // ============================================================================

  describe("delete", () => {
    const taskId = 1;

    it("should soft delete task successfully", async () => {
      // Arrange
      mockDb.execute.mockResolvedValue([
        null as any,
        { affectedRows: 1 } as any,
      ]);

      // Act
      await repository.delete(userId, taskId);

      // Assert
      expect(mockDb.execute).toHaveBeenCalledWith(
        "UPDATE task SET deleted_at = NOW() WHERE user_id = ? AND id = ? AND deleted_at IS NULL",
        [userId, taskId],
      );
    });

    it("should throw error when task not found", async () => {
      // Arrange
      mockDb.execute.mockResolvedValue([
        null as any,
        { affectedRows: 0 } as any,
      ]);

      // Act & Assert
      await expect(repository.delete(userId, taskId)).rejects.toThrow(
        "Task not found or already deleted",
      );
    });

    it("should handle database errors", async () => {
      // Arrange
      mockDb.execute.mockRejectedValue(new Error("Foreign key constraint"));

      // Act & Assert
      await expect(repository.delete(userId, taskId)).rejects.toThrow(
        "Foreign key constraint",
      );
    });
  });

  // ============================================================================
  // exists Method Tests
  // ============================================================================

  describe("exists", () => {
    const taskId = 1;

    it("should return true when task exists", async () => {
      // Arrange
      mockDb.queryTaskCount.mockResolvedValue([[{ count: 1 }], null as any]);

      // Act
      const result = await repository.exists(userId, taskId);

      // Assert
      expect(result).toBe(true);
      expect(mockDb.queryTaskCount).toHaveBeenCalledWith(
        expect.stringContaining("SELECT COUNT(*) as count FROM task"),
        [userId, taskId],
      );
    });

    it("should return false when task does not exist", async () => {
      // Arrange
      mockDb.queryTaskCount.mockResolvedValue([[{ count: 0 }], null as any]);

      // Act
      const result = await repository.exists(userId, taskId);

      // Assert
      expect(result).toBe(false);
    });

    it("should handle database errors", async () => {
      // Arrange
      mockDb.queryTaskCount.mockRejectedValue(new Error("Database error"));

      // Act & Assert
      await expect(repository.exists(userId, taskId)).rejects.toThrow(
        "Database error",
      );
    });
  });

  // ============================================================================
  // search Method Tests
  // ============================================================================

  describe("search", () => {
    const searchQuery = "documentation";

    it("should search tasks using full-text search", async () => {
      // Arrange
      const mockRows = [
        createMockTaskRow({ id: 1, title: "API Documentation" }),
        createMockTaskRow({ id: 2, title: "User Guide Documentation" }),
      ];
      mockDb.queryTasks.mockResolvedValue([mockRows, null as any]);

      // Act
      const result = await repository.search(userId, searchQuery);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]?.title).toContain("Documentation");
      expect(result[1]?.title).toContain("Documentation");

      expect(mockDb.queryTasks).toHaveBeenCalledWith(
        expect.stringContaining("MATCH(title, description) AGAINST(?)"),
        [searchQuery, userId, searchQuery],
      );
    });

    it("should return empty array when no matches found", async () => {
      // Arrange
      mockDb.queryTasks.mockResolvedValue([[], null as any]);

      // Act
      const result = await repository.search(userId, searchQuery);

      // Assert
      expect(result).toEqual([]);
    });

    it("should handle database errors", async () => {
      // Arrange
      mockDb.queryTasks.mockRejectedValue(
        new Error("Full-text index not found"),
      );

      // Act & Assert
      await expect(repository.search(userId, searchQuery)).rejects.toThrow(
        "Full-text index not found",
      );
    });
  });

  // ============================================================================
  // findByLabels Method Tests
  // ============================================================================

  describe("findByLabels", () => {
    it("should find tasks by single label", async () => {
      // Arrange
      const labels = ["urgent"];
      const mockRows = [
        createMockTaskRow({ id: 1, labels: JSON.stringify(["urgent", "bug"]) }),
        createMockTaskRow({ id: 2, labels: JSON.stringify(["urgent"]) }),
      ];
      mockDb.queryTasks.mockResolvedValue([mockRows, null as any]);

      // Act
      const result = await repository.findByLabels(userId, labels);

      // Assert
      expect(result).toHaveLength(2);
      expect(mockDb.queryTasks).toHaveBeenCalledWith(
        expect.stringContaining("JSON_CONTAINS(labels, ?)"),
        [userId, JSON.stringify("urgent")],
      );
    });

    it("should find tasks by multiple labels", async () => {
      // Arrange
      const labels = ["urgent", "bug"];
      const mockRows = [
        createMockTaskRow({ id: 1, labels: JSON.stringify(["urgent"]) }),
      ];
      mockDb.queryTasks.mockResolvedValue([mockRows, null as any]);

      // Act
      const result = await repository.findByLabels(userId, labels);

      // Assert
      expect(result).toHaveLength(1);
      expect(mockDb.queryTasks).toHaveBeenCalledWith(
        expect.stringContaining(
          "JSON_CONTAINS(labels, ?) OR JSON_CONTAINS(labels, ?)",
        ),
        [userId, JSON.stringify("urgent"), JSON.stringify("bug")],
      );
    });

    it("should return empty array for empty labels", async () => {
      // Arrange & Act
      const result = await repository.findByLabels(userId, []);

      // Assert
      expect(result).toEqual([]);
      expect(mockDb.queryTasks).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // bulkUpdate Method Tests
  // ============================================================================

  describe("bulkUpdate", () => {
    const taskIds = [1, 2, 3];
    const updateData: TaskUpdateData = {
      status: "in-progress",
      labels: ["bulk-updated"],
    };

    it("should bulk update tasks successfully", async () => {
      // Arrange
      const mockRows = taskIds.map((id) =>
        createMockTaskRow({
          id,
          status: "in-progress",
          labels: JSON.stringify(["bulk-updated"]),
        }),
      );

      mockDb.execute.mockResolvedValue([
        null as any,
        { affectedRows: 3 } as any,
      ]);
      mockDb.queryTasks.mockResolvedValue([mockRows, null as any]);

      // Act
      const result = await repository.bulkUpdate(userId, taskIds, updateData);

      // Assert
      expect(result).toHaveLength(3);
      expect(result.every((task) => task.status === "in-progress")).toBe(true);
      expect(result.every((task) => task.labels.includes("bulk-updated"))).toBe(
        true,
      );

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining(
          "UPDATE task SET status = ?, labels = ?, updated_at = NOW() WHERE user_id = 1 AND id IN (?, ?, ?)",
        ),
        ["in-progress", JSON.stringify(["bulk-updated"]), 1, 2, 3],
      );
    });

    it("should return empty array for empty task IDs", async () => {
      // Act
      const result = await repository.bulkUpdate(userId, [], updateData);

      // Assert
      expect(result).toEqual([]);
      expect(mockDb.execute).not.toHaveBeenCalled();
    });

    it("should return empty array when no fields to update", async () => {
      // Act
      const result = await repository.bulkUpdate(userId, taskIds, {});

      // Assert
      expect(result).toEqual([]);
      expect(mockDb.execute).not.toHaveBeenCalled();
    });

    it("should handle database errors during bulk update", async () => {
      // Arrange
      mockDb.execute.mockRejectedValue(new Error("Deadlock detected"));

      // Act & Assert
      await expect(
        repository.bulkUpdate(userId, taskIds, updateData),
      ).rejects.toThrow("Deadlock detected");
    });
  });

  // ============================================================================
  // bulkDelete Method Tests
  // ============================================================================

  describe("bulkDelete", () => {
    const taskIds = [1, 2, 3];

    it("should bulk delete tasks successfully", async () => {
      // Arrange
      mockDb.execute.mockResolvedValue([
        null as any,
        { affectedRows: 3 } as any,
      ]);

      // Act
      await repository.bulkDelete(userId, taskIds);

      // Assert
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining(
          "UPDATE task SET deleted_at = NOW() WHERE user_id = 1 AND id IN (?, ?, ?)",
        ),
        taskIds,
      );
    });

    it("should return early for empty task IDs", async () => {
      // Act
      await repository.bulkDelete(userId, []);

      // Assert
      expect(mockDb.execute).not.toHaveBeenCalled();
    });

    it("should throw error when no tasks deleted", async () => {
      // Arrange
      mockDb.execute.mockResolvedValue([
        null as any,
        { affectedRows: 0 } as any,
      ]);

      // Act & Assert
      await expect(repository.bulkDelete(userId, taskIds)).rejects.toThrow(
        "No tasks were deleted",
      );
    });
  });

  // ============================================================================
  // countUserTasks Method Tests
  // ============================================================================

  describe("countUserTasks", () => {
    it("should return task counts by status", async () => {
      // Arrange
      const mockCounts = [
        { status: "not-started" as TaskStatus, count: 5 },
        { status: "in-progress" as TaskStatus, count: 3 },
        { status: "done" as TaskStatus, count: 7 },
      ];
      mockDb.queryTaskStatusCounts.mockResolvedValue([mockCounts, null as any]);

      // Act
      const result = await repository.countUserTasks(userId);

      // Assert
      expect(result).toEqual(mockCounts);
      expect(mockDb.queryTaskStatusCounts).toHaveBeenCalledWith(
        expect.stringContaining(
          "SELECT status, COUNT(*) as count FROM task WHERE user_id = ? AND deleted_at IS NULL GROUP BY status",
        ),
        [userId],
      );
    });

    it("should return empty array when user has no tasks", async () => {
      // Arrange
      mockDb.queryTaskStatusCounts.mockResolvedValue([[], null as any]);

      // Act
      const result = await repository.countUserTasks(userId);

      // Assert
      expect(result).toEqual([]);
    });
  });

  // ============================================================================
  // findDueSoon and findOverdue Method Tests
  // ============================================================================

  describe("findDueSoon", () => {
    it("should find tasks due within specified hours", async () => {
      // Arrange
      const hours = 24;
      const mockRows = [
        createMockTaskRow({
          id: 1,
          title: "Due Tomorrow",
          due_date: new Date(Date.now() + 12 * 60 * 60 * 1000),
        }),
      ];
      mockDb.queryTasks.mockResolvedValue([mockRows, null as any]);

      // Act
      const result = await repository.findDueSoon(userId, hours);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]?.title).toBe("Due Tomorrow");
      expect(mockDb.queryTasks).toHaveBeenCalledWith(
        expect.stringContaining("due_date <= DATE_ADD(NOW(), INTERVAL ? HOUR)"),
        [userId, hours],
      );
    });
  });

  describe("findOverdue", () => {
    it("should find overdue tasks", async () => {
      // Arrange
      const mockRows = [
        createMockTaskRow({
          id: 1,
          title: "Overdue Task",
          status: "not-started",
          due_date: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        }),
      ];
      mockDb.queryTasks.mockResolvedValue([mockRows, null as any]);

      // Act
      const result = await repository.findOverdue(userId);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]?.title).toBe("Overdue Task");
      expect(mockDb.queryTasks).toHaveBeenCalledWith(
        expect.stringContaining("due_date < NOW() AND status !== ?"),
        [userId, "done"],
      );
    });
  });

  // ============================================================================
  // Helper Method Tests
  // ============================================================================

  describe("Helper Methods", () => {
    it("should transform task row with string dates", async () => {
      // Arrange
      const mockRow = createMockTaskRow({
        created_at: "2024-01-01T00:00:00.000Z" as any,
        updated_at: "2024-01-02T00:00:00.000Z" as any,
        due_date: "2024-01-20T17:00:00.000Z" as any,
      });
      mockDb.queryTasks.mockResolvedValue([[mockRow], null as any]);

      // Act
      const result = await repository.findById(userId, 1);

      // Assert
      expect(result?.createdAt).toBe("2024-01-01T00:00:00.000Z");
      expect(result?.updatedAt).toBe("2024-01-02T00:00:00.000Z");
      expect(result?.dueDate).toBe("2024-01-20T17:00:00.000Z");
    });

    it("should handle non-array labels gracefully", async () => {
      // Arrange
      const mockRow = createMockTaskRow({
        labels: JSON.stringify("not-an-array"),
      });
      mockDb.queryTasks.mockResolvedValue([[mockRow], null as any]);

      // Act
      const result = await repository.findById(userId, 1);

      // Assert
      expect(result?.labels).toEqual([]);
    });

    it("should convert camelCase to snake_case correctly", async () => {
      // Arrange
      const updateData: TaskUpdateData = {
        dueDate: new Date(),
      };
      mockDb.execute.mockResolvedValue([
        null as any,
        { affectedRows: 1 } as any,
      ]);
      mockDb.queryTasks.mockResolvedValue([[createMockTaskRow()], null as any]);

      // Act
      await repository.update(userId, 1, updateData);

      // Assert
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining("due_date"),
        expect.any(Array),
      );
    });
  });
});
