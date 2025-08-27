/**
 * Task API Type Definitions
 *
 * These interfaces define the frozen contract for task-related API interactions.
 */

import { PaginationMeta } from "../../common/api/types";

// ============================================================================
// TASK TYPES
// ============================================================================

/**
 * Task status enumeration
 */
export type TaskStatus = "not-started" | "in-progress" | "done";

/**
 * Task sorting field options
 */
export type TaskSortBy =
  | "createdAt"
  | "updatedAt"
  | "dueDate"
  | "title"
  | "status";

/**
 * Sort order options
 */
export type SortOrder = "asc" | "desc";

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * Create task request payload
 */
export interface CreateTaskRequest {
  /** Task title (required, 1-255 characters) */
  title: string;
  /** Detailed task description (optional, max 1000 characters) */
  description?: string;
  /** Task due date in ISO 8601 format (optional) */
  dueDate?: string;
  /** Initial task status (defaults to 'not-started') */
  status?: TaskStatus;
  /** Task labels for categorization (optional, max 10 items, max 50 chars each) */
  labels?: string[];
}

/**
 * Update task request payload (all fields optional)
 */
export interface UpdateTaskRequest {
  /** Updated task title (1-255 characters) */
  title?: string;
  /** Updated task description (max 1000 characters) */
  description?: string;
  /** Updated due date in ISO 8601 format (null to remove) */
  dueDate?: string | null;
  /** Updated task status */
  status?: TaskStatus;
  /** Updated task labels (max 10 items, max 50 chars each) */
  labels?: string[];
}

/**
 * Task resource representation
 */
export interface Task {
  /** Unique task identifier */
  id: number;
  /** Task title */
  title: string;
  /** Detailed task description (nullable) */
  description: string | null;
  /** Current task status */
  status: TaskStatus;
  /** Task due date in ISO 8601 format (nullable) */
  dueDate: string | null;
  /** Task labels for categorization */
  labels: string[];
  /** Task creation timestamp in ISO 8601 format */
  createdAt: string;
  /** Last modification timestamp in ISO 8601 format */
  updatedAt: string;
}

/**
 * Task list query options
 */
export interface TaskListOptions {
  /** Page number (1-based, default: 1) */
  page?: number;
  /** Items per page (1-100, default: 10) */
  limit?: number;
  /** Filter by task status */
  status?: TaskStatus;
  /** Search query for task titles */
  q?: string;
  /** Field to sort by (default: 'createdAt') */
  sortBy?: TaskSortBy;
  /** Sort order (default: 'desc') */
  order?: SortOrder;
}

/**
 * Paginated task list response
 */
export interface TaskListResponse {
  /** Array of task resources */
  data: Task[];
  /** Pagination metadata */
  meta: PaginationMeta;
}

// ============================================================================
// STATISTICS TYPES
// ============================================================================

/**
 * Task statistics for dashboard display
 */
export interface TaskStatistics {
  /** Total number of tasks */
  totalTasks: number;
  /** Number of completed tasks */
  completedTasks: number;
  /** Number of in-progress tasks */
  inProgressTasks: number;
  /** Number of not-started tasks */
  notStartedTasks: number;
  /** Number of overdue tasks */
  overdueTasks: number;
  /** Tasks created this week */
  tasksCreatedThisWeek: number;
  /** Tasks completed this week */
  tasksCompletedThisWeek: number;
  /** Average completion time in hours */
  averageCompletionTimeHours: number;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard to check if task status is valid
 */
export const isValidTaskStatus = (status: string): status is TaskStatus => {
  return ["not-started", "in-progress", "done"].includes(status);
};

/**
 * Type guard to check if sort order is valid
 */
export const isValidSortOrder = (order: string): order is SortOrder => {
  return ["asc", "desc"].includes(order);
};

/**
 * Type guard to check if sort field is valid for tasks
 */
export const isValidTaskSortBy = (sortBy: string): sortBy is TaskSortBy => {
  return ["createdAt", "updatedAt", "dueDate", "title", "status"].includes(
    sortBy,
  );
};
