/**
 * Database Row Type Definitions
 *
 * Strict typing for database query results to eliminate 'any' usage.
 */

// ============================================================================
// BASE DATABASE TYPES
// ============================================================================

export interface BaseRow {
  id: number;
  created_at: Date | string;
  updated_at: Date | string;
  deleted_at: Date | string | null;
}

export interface QueryResult {
  insertId?: number;
  affectedRows?: number;
  changedRows?: number;
  warningCount?: number;
  message?: string;
  protocol41?: boolean;
}

export type DatabaseQueryResult<T> = [T[], QueryResult];

// ============================================================================
// TASK TABLE TYPES
// ============================================================================

export interface TaskRow extends BaseRow {
  user_id: number;
  title: string;
  description: string | null;
  due_date: Date | string | null;
  status: "not-started" | "in-progress" | "done";
  labels: string; // JSON string representation
}

// TODO: requires further thought, total_count cannot be at the same level as other fields, also TasRowWithCount doesnot make sense, conider TaskRowsWithCount, it can have array of tasks and total_count, offset, limit etc
export interface TaskRowWithCount extends TaskRow {
  total_count?: number; // For pagination queries
}

// ============================================================================
// USER TABLE TYPES
// ============================================================================

export interface UserRow extends BaseRow {
  email: string;
  password_hash: string;
  first_name: string | null;
  last_name: string | null;
  is_active: boolean;
  last_login_at: Date | string | null;
}

// ============================================================================
// GENERIC QUERY PARAMETER TYPES
// ============================================================================

export type QueryParameter =
  | string
  | number
  | boolean
  | Date
  | null
  | undefined;
export type QueryParameters = QueryParameter[];

// ============================================================================
// COUNT QUERY RESULT TYPES
// ============================================================================

export interface CountResult {
  count: number;
}

export interface StatusCountResult {
  status: string;
  count: number;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

// Database connection type moved to connection.ts to avoid circular dependencies
