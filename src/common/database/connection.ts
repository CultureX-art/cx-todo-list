/**
 * Database Connection Interface and Implementation
 *
 * Provides database connectivity and query execution capabilities.
 */

import type {
  DatabaseQueryResult,
  QueryParameters,
  QueryResult,
  TaskRow,
  UserRow,
  TaskRowWithCount,
  CountResult,
  StatusCountResult,
} from "./types";

export interface IDatabaseConnection {
  connect(): Promise<void>;

  // Task operations
  queryTasks(
    sql: string,
    params?: QueryParameters,
  ): Promise<DatabaseQueryResult<TaskRow>>;
  queryTasksWithCount(
    sql: string,
    params?: QueryParameters,
  ): Promise<DatabaseQueryResult<TaskRowWithCount>>;
  queryTaskCount(
    sql: string,
    params?: QueryParameters,
  ): Promise<DatabaseQueryResult<CountResult>>;
  queryTaskStatusCounts(
    sql: string,
    params?: QueryParameters,
  ): Promise<DatabaseQueryResult<StatusCountResult>>;

  // User operations
  queryUsers(
    sql: string,
    params?: QueryParameters,
  ): Promise<DatabaseQueryResult<UserRow>>;

  // Generic operations for inserts/updates/deletes
  execute(
    sql: string,
    params?: QueryParameters,
  ): Promise<[QueryResult[], QueryResult]>;

  beginTransaction(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  ping(): Promise<{ responseTimeMs: number }>;
  end(): Promise<void>;
  getStats(): { active: number; idle: number; max: number };
  isConnected(): boolean;
}
