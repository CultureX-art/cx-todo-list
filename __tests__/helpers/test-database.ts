/**
 * Test Database Helper
 *
 * Utilities for setting up and managing test database connections and data.
 */

import { jest } from "@jest/globals";
import { IDatabaseConnection } from "../../src/common/database/connection";
import {
  QueryResult,
  QueryParameters,
  TaskRow,
} from "../../src/common/database/types";

/**
 * Mock database connection for testing
 */
export class TestDatabase {
  private readonly mockConnection: jest.Mocked<IDatabaseConnection>;

  constructor() {
    this.mockConnection = this.createMockConnection();
  }

  /**
   * Create a mocked database connection
   */
  private createMockConnection(): jest.Mocked<IDatabaseConnection> {
    return {
      connect: jest.fn(),
      queryTasks: jest.fn(),
      queryTasksWithCount: jest.fn(),
      queryTaskCount: jest.fn(),
      queryTaskStatusCounts: jest.fn(),
      queryUsers: jest.fn(),
      queryAuditLogs: jest.fn(),
      execute: jest.fn(),
      beginTransaction: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
      ping: jest.fn(),
      end: jest.fn(),
      getStats: jest.fn(),
      isConnected: jest.fn(),
    } as jest.Mocked<IDatabaseConnection>;
  }

  /**
   * Get the mock connection instance
   */
  getMockConnection(): jest.Mocked<IDatabaseConnection> {
    return this.mockConnection;
  }

  /**
   * Setup mock responses for common queries
   */
  setupMockResponses(config: {
    selectResults?: QueryResult[][];
    insertId?: number;
    affectedRows?: number;
    error?: Error;
  }): void {
    const {
      selectResults = [],
      insertId = 1,
      affectedRows = 1,
      error,
    } = config;

    if (error) {
      this.mockConnection.queryTasks.mockRejectedValue(error);
      this.mockConnection.execute.mockRejectedValue(error);
    } else {
      // Mock SELECT queries
      if (selectResults.length > 0) {
        selectResults.forEach((result) => {
          this.mockConnection.queryTasks.mockResolvedValueOnce([
            result as TaskRow[],
            {} as QueryResult,
          ]);
          this.mockConnection.execute.mockResolvedValueOnce([
            result,
            {} as QueryResult,
          ]);
        });
      }

      // Mock INSERT/UPDATE/DELETE queries
      const mockResult = {
        insertId,
        affectedRows,
        changedRows: affectedRows,
        warningCount: 0,
        message: "",
        protocol41: true,
      };
      this.mockConnection.execute.mockResolvedValue([[], mockResult]);
    }
  }

  /**
   * Mock successful database connection
   */
  mockHealthyConnection(): void {
    this.mockConnection.ping.mockResolvedValue({ responseTimeMs: 15 });
    this.mockConnection.isConnected.mockReturnValue(true);
    this.mockConnection.getStats.mockReturnValue({
      active: 5,
      idle: 10,
      max: 20,
    });
  }

  /**
   * Mock database connection failure
   */
  mockUnhealthyConnection(): void {
    this.mockConnection.ping.mockRejectedValue(new Error("Connection failed"));
    this.mockConnection.isConnected.mockReturnValue(false);
    this.mockConnection.getStats.mockReturnValue({
      active: 0,
      idle: 0,
      max: 20,
    });
  }

  /**
   * Mock transaction operations
   */
  mockTransaction(
    config: {
      shouldSucceed?: boolean;
      commitError?: Error;
      rollbackError?: Error;
    } = {},
  ): void {
    const { shouldSucceed = true, commitError, rollbackError } = config;

    this.mockConnection.beginTransaction.mockResolvedValue();

    if (shouldSucceed && !commitError) {
      this.mockConnection.commit.mockResolvedValue();
    } else if (commitError) {
      this.mockConnection.commit.mockRejectedValue(commitError);
    }

    if (rollbackError) {
      this.mockConnection.rollback.mockRejectedValue(rollbackError);
    } else {
      this.mockConnection.rollback.mockResolvedValue();
    }
  }

  /**
   * Setup user table mocks
   */
  setupUserTableMocks(): void {
    const mockUsers = [
      {
        id: 1,
        email: "user1@example.com",
        password_hash: "$2b$12$hashedPassword1",
        created_at: new Date("2024-01-01T00:00:00.000Z"),
        updated_at: new Date("2024-01-01T00:00:00.000Z"),
        deleted_at: null,
      },
      {
        id: 2,
        email: "user2@example.com",
        password_hash: "$2b$12$hashedPassword2",
        created_at: new Date("2024-01-02T00:00:00.000Z"),
        updated_at: new Date("2024-01-02T00:00:00.000Z"),
        deleted_at: null,
      },
    ];

    // Mock finding users by ID
    this.mockConnection.execute.mockImplementation(
      (
        sql: string,
        _params: QueryParameters = [],
      ): Promise<[QueryResult[], QueryResult]> => {
        if (sql.includes("SELECT * FROM user WHERE id = ?")) {
          // const userId = params[0];
          // const _user = mockUsers.find(u => u.id === userId);
          return Promise.resolve([[], {} as QueryResult]);
        }

        // Mock finding user by email
        if (sql.includes("SELECT * FROM user WHERE email = ?")) {
          // const email = params[0];
          // const _user = mockUsers.find(u => u.email === email);
          return Promise.resolve([[], {} as QueryResult]);
        }

        // Mock checking if email exists
        if (
          sql.includes("SELECT COUNT(*) as count FROM user WHERE email = ?")
        ) {
          // const email = params[0];
          // const _exists = mockUsers.some(u => u.email === email);
          return Promise.resolve([[], {} as QueryResult]);
        }

        // Mock user creation
        if (sql.includes("INSERT INTO user")) {
          const newUserId = mockUsers.length + 1;
          return Promise.resolve([
            [],
            { insertId: newUserId, affectedRows: 1 } as QueryResult,
          ]);
        }

        // Default empty result
        return Promise.resolve([[], {} as QueryResult]);
      },
    );
  }

  /**
   * Setup task table mocks
   */
  setupTaskTableMocks(): void {
    const mockTasks = [
      {
        id: 1,
        user_id: 1,
        title: "Task 1",
        description: "First task",
        due_date: new Date("2024-12-31T23:59:59.000Z"),
        status: "not-started",
        labels: JSON.stringify(["test", "development"]),
        created_at: new Date("2024-01-01T00:00:00.000Z"),
        updated_at: new Date("2024-01-01T00:00:00.000Z"),
        deleted_at: null,
      },
      {
        id: 2,
        user_id: 1,
        title: "Task 2",
        description: "Second task",
        due_date: null,
        status: "in-progress",
        labels: JSON.stringify(["urgent"]),
        created_at: new Date("2024-01-02T00:00:00.000Z"),
        updated_at: new Date("2024-01-02T00:00:00.000Z"),
        deleted_at: null,
      },
      {
        id: 3,
        user_id: 2,
        title: "User 2 Task",
        description: "Task for user 2",
        due_date: null,
        status: "done",
        labels: JSON.stringify([]),
        created_at: new Date("2024-01-03T00:00:00.000Z"),
        updated_at: new Date("2024-01-03T00:00:00.000Z"),
        deleted_at: null,
      },
    ];

    this.mockConnection.execute.mockImplementation(
      (
        sql: string,
        _params: QueryParameters = [],
      ): Promise<[QueryResult[], QueryResult]> => {
        // Mock finding task by ID
        if (sql.includes("SELECT * FROM task WHERE id = ?")) {
          // const taskId = params[0];
          // const _task = mockTasks.find(t => t.id === taskId && !t.deleted_at);
          return Promise.resolve([[], {} as QueryResult]);
        }

        // Mock finding tasks by user ID
        if (sql.includes("SELECT * FROM task WHERE user_id = ?")) {
          // const userId = params[0];
          // const _userTasks = mockTasks.filter(t => t.user_id === userId && !t.deleted_at);
          return Promise.resolve([[], {} as QueryResult]);
        }

        // Mock task creation
        if (sql.includes("INSERT INTO task")) {
          const newTaskId = mockTasks.length + 1;
          return Promise.resolve([
            [],
            { insertId: newTaskId, affectedRows: 1 } as QueryResult,
          ]);
        }

        // Mock task update
        if (sql.includes("UPDATE task")) {
          return Promise.resolve([[], { affectedRows: 1 } as QueryResult]);
        }

        // Mock task deletion (soft delete)
        if (sql.includes("UPDATE task SET deleted_at = NOW()")) {
          return Promise.resolve([[], { affectedRows: 1 } as QueryResult]);
        }

        // Mock count queries
        if (sql.includes("SELECT COUNT(*) as count")) {
          return Promise.resolve([[], {} as QueryResult]);
        }

        // Default empty result
        return Promise.resolve([[], {} as QueryResult]);
      },
    );
  }

  /**
   * Setup audit log table mocks
   */
  setupAuditLogTableMocks(): void {
    this.mockConnection.execute.mockImplementation(
      (sql: string): Promise<[QueryResult[], QueryResult]> => {
        if (sql.includes("INSERT INTO audit_log")) {
          return Promise.resolve([
            [],
            { insertId: 1, affectedRows: 1 } as QueryResult,
          ]);
        }

        if (sql.includes("SELECT * FROM audit_log")) {
          // const _mockAuditLogs = [
          //   {
          //     id: 1,
          //     user_id: 1,
          //     action: 'create',
          //     resource_type: 'task',
          //     resource_id: 1,
          //     changes: JSON.stringify({ title: 'New Task' }),
          //     correlation_id: 'test-correlation-id',
          //     timestamp: new Date('2024-01-01T00:00:00.000Z')
          //   }
          // ];
          return Promise.resolve([[], {} as QueryResult]);
        }

        return Promise.resolve([[], {} as QueryResult]);
      },
    );
  }

  /**
   * Setup token blacklist table mocks
   */
  setupTokenBlacklistMocks(): void {
    // const mockBlacklistedTokens = [
    //   {
    //     id: 1,
    //     jti: 'revoked-token-id-1',
    //     revoked_at: new Date('2024-01-01T00:00:00.000Z'),
    //     expires_at: new Date('2024-01-01T01:00:00.000Z')
    //   }
    // ];

    this.mockConnection.execute.mockImplementation(
      (
        sql: string,
        _params: QueryParameters = [],
      ): Promise<[QueryResult[], QueryResult]> => {
        // Mock checking if token is blacklisted
        if (
          sql.includes(
            "SELECT COUNT(*) as count FROM token_blacklist WHERE jti = ?",
          )
        ) {
          // const jti = params[0];
          // const _isBlacklisted = mockBlacklistedTokens.some(t => t.jti === jti);
          return Promise.resolve([[], {} as QueryResult]);
        }

        // Mock adding token to blacklist
        if (sql.includes("INSERT INTO token_blacklist")) {
          return Promise.resolve([
            [],
            { insertId: 1, affectedRows: 1 } as QueryResult,
          ]);
        }

        // Mock cleanup of expired tokens
        if (
          sql.includes("DELETE FROM token_blacklist WHERE expires_at < NOW()")
        ) {
          return Promise.resolve([[], { affectedRows: 0 } as QueryResult]);
        }

        return Promise.resolve([[], {} as QueryResult]);
      },
    );
  }

  /**
   * Mock database error scenarios
   */
  mockDatabaseErrors(): void {
    const errors = {
      connectionError: new Error("Connection refused"),
      timeoutError: new Error("Query timeout"),
      syntaxError: new Error("SQL syntax error"),
      constraintError: new Error("Duplicate entry"),
      lockTimeoutError: new Error("Lock wait timeout exceeded"),
    };

    // Randomly fail queries to simulate database issues
    this.mockConnection.execute.mockImplementation(() => {
      const errorTypes = Object.values(errors);
      const randomError =
        errorTypes[Math.floor(Math.random() * errorTypes.length)];
      return Promise.reject(randomError);
    });
  }

  /**
   * Reset all mocks
   */
  resetMocks(): void {
    jest.clearAllMocks();
  }

  /**
   * Verify specific queries were called
   */
  verifyQueryCalled(sqlPattern: string, times: number = 1): void {
    const calls = this.mockConnection.execute.mock.calls.filter(
      (call: unknown[]) => {
        const sql = call[0] as string;
        return sql.includes(sqlPattern);
      },
    );
    expect(calls).toHaveLength(times);
  }

  /**
   * Verify query was called with specific parameters
   */
  verifyQueryCalledWith(sqlPattern: string, expectedParams: unknown[]): void {
    const call = this.mockConnection.execute.mock.calls.find(
      (call: unknown[]) => {
        const sql = call[0] as string;
        return sql.includes(sqlPattern);
      },
    );
    expect(call).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(call![1]).toEqual(expectedParams);
  }

  /**
   * Get all query calls for debugging
   */
  getQueryCalls(): unknown[] {
    return this.mockConnection.execute.mock.calls;
  }

  /**
   * Setup mock for specific query pattern
   */
  mockQuery(sqlPattern: string, result: unknown): void {
    this.mockConnection.execute.mockImplementation(
      (sql: string): Promise<[QueryResult[], QueryResult]> => {
        if (sql.includes(sqlPattern)) {
          return Promise.resolve([[], result as QueryResult]);
        }
        return Promise.resolve([[], {} as QueryResult]);
      },
    );
  }

  /**
   * Setup mock that throws error for specific query pattern
   */
  mockQueryError(sqlPattern: string, error: Error): void {
    this.mockConnection.execute.mockImplementation((sql: string) => {
      if (sql.includes(sqlPattern)) {
        return Promise.reject(error);
      }
      return Promise.resolve([[], {} as QueryResult]);
    });
  }

  /**
   * Cleanup test database
   */
  async cleanup(): Promise<void> {
    this.resetMocks();
  }

  /**
   * Create a snapshot of current mock state for restoration
   */
  createSnapshot(): Record<string, unknown> {
    return {
      queryMock: this.mockConnection.execute.getMockImplementation(),
      executeMock: this.mockConnection.execute.getMockImplementation(),
      pingMock: this.mockConnection.ping.getMockImplementation(),
      isConnectedMock: this.mockConnection.isConnected.getMockImplementation(),
      getStatsMock: this.mockConnection.getStats.getMockImplementation(),
    };
  }

  /**
   * Restore mock state from snapshot
   */
  restoreSnapshot(snapshot: Record<string, unknown>): void {
    if (snapshot["queryMock"]) {
      this.mockConnection.execute.mockImplementation(
        snapshot["queryMock"] as (
          sql: string,
          params?: QueryParameters,
        ) => Promise<[QueryResult[], QueryResult]>,
      );
    }
    if (snapshot["executeMock"]) {
      this.mockConnection.execute.mockImplementation(
        snapshot["executeMock"] as (
          sql: string,
          params?: QueryParameters,
        ) => Promise<[QueryResult[], QueryResult]>,
      );
    }
    if (snapshot["pingMock"]) {
      this.mockConnection.ping.mockImplementation(
        snapshot["pingMock"] as () => Promise<{ responseTimeMs: number }>,
      );
    }
    if (snapshot["isConnectedMock"]) {
      this.mockConnection.isConnected.mockImplementation(
        snapshot["isConnectedMock"] as () => boolean,
      );
    }
    if (snapshot["getStatsMock"]) {
      this.mockConnection.getStats.mockImplementation(
        snapshot["getStatsMock"] as () => {
          active: number;
          idle: number;
          max: number;
        },
      );
    }
  }
}
