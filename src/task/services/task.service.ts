/**
 * Task Service
 *
 * Business logic layer for task management operations.
 */

import type {
  CreateTaskRequest,
  UpdateTaskRequest,
  Task,
  TaskListOptions,
  TaskListResponse,
  TaskStatistics,
} from "../api/types";
import type { ServiceContext } from "../../common/types/service";

// Export the implementation
export { TaskServiceImpl as TaskService } from "./task.service.impl";

// ============================================================================
// SERVICE INTERFACE
// ============================================================================

/**
 * Task management service interface for todo operations
 */
export interface ITaskService {
  /**
   * Create a new task for the authenticated user
   *
   * @param request - Task creation data
   * @param context - Service execution context with authenticated user
   * @returns Promise resolving to created task
   *
   * @throws {ValidationError} When title is missing or invalid
   * @throws {AuthenticationError} When user is not authenticated
   * @throws {BusinessLogicError} When due date is in the past
   * @throws {InternalServiceError} When task creation fails
   */
  createTask(
    request: CreateTaskRequest,
    context: ServiceContext,
  ): Promise<Task>;

  /**
   * Get task by ID with user authorization
   *
   * @param taskId - Task identifier
   * @param context - Service execution context with authenticated user
   * @returns Promise resolving to task or null if not found/unauthorized
   *
   * @throws {AuthenticationError} When user is not authenticated
   * @throws {AuthorizationError} When user doesn't own the task
   * @throws {NotFoundError} When task doesn't exist
   * @throws {InternalServiceError} When task retrieval fails
   */
  getTaskById(taskId: number, context: ServiceContext): Promise<Task | null>;

  /**
   * Update existing task with user authorization
   *
   * @param taskId - Task identifier
   * @param request - Task update data
   * @param context - Service execution context with authenticated user
   * @returns Promise resolving to updated task
   *
   * @throws {ValidationError} When update data is invalid
   * @throws {AuthenticationError} When user is not authenticated
   * @throws {AuthorizationError} When user doesn't own the task
   * @throws {NotFoundError} When task doesn't exist
   * @throws {BusinessLogicError} When status transition is invalid
   * @throws {InternalServiceError} When task update fails
   */
  updateTask(
    taskId: number,
    request: UpdateTaskRequest,
    context: ServiceContext,
  ): Promise<Task>;

  /**
   * Soft delete task with user authorization
   *
   * @param taskId - Task identifier
   * @param context - Service execution context with authenticated user
   * @returns Promise resolving when task is deleted
   *
   * @throws {AuthenticationError} When user is not authenticated
   * @throws {AuthorizationError} When user doesn't own the task
   * @throws {NotFoundError} When task doesn't exist
   * @throws {InternalServiceError} When task deletion fails
   */
  deleteTask(taskId: number, context: ServiceContext): Promise<void>;

  /**
   * List tasks for authenticated user with filtering and pagination
   *
   * @param options - Query options for filtering and pagination
   * @param context - Service execution context with authenticated user
   * @returns Promise resolving to paginated task list
   *
   * @throws {ValidationError} When query parameters are invalid
   * @throws {AuthenticationError} When user is not authenticated
   * @throws {InternalServiceError} When task listing fails
   */
  listTasks(
    options: TaskListOptions,
    context: ServiceContext,
  ): Promise<TaskListResponse>;

  /**
   * Search tasks by title content
   *
   * @param query - Search query string
   * @param options - Additional query options
   * @param context - Service execution context with authenticated user
   * @returns Promise resolving to matching tasks
   *
   * @throws {ValidationError} When search query is invalid
   * @throws {AuthenticationError} When user is not authenticated
   * @throws {InternalServiceError} When search fails
   */
  searchTasks(
    query: string,
    options: Omit<TaskListOptions, "q">,
    context: ServiceContext,
  ): Promise<TaskListResponse>;

  /**
   * Get task statistics for user
   *
   * @param context - Service execution context with authenticated user
   * @returns Promise resolving to task statistics
   *
   * @throws {AuthenticationError} When user is not authenticated
   * @throws {InternalServiceError} When statistics retrieval fails
   */
  getTaskStatistics(context: ServiceContext): Promise<TaskStatistics>;

  /**
   * Bulk update task statuses
   *
   * @param taskIds - Array of task identifiers
   * @param status - New status for all tasks
   * @param context - Service execution context with authenticated user
   * @returns Promise resolving to number of updated tasks
   *
   * @throws {ValidationError} When task IDs or status is invalid
   * @throws {AuthenticationError} When user is not authenticated
   * @throws {AuthorizationError} When user doesn't own all tasks
   * @throws {InternalServiceError} When bulk update fails
   */
  bulkUpdateTaskStatus(
    taskIds: number[],
    status: Task["status"],
    context: ServiceContext,
  ): Promise<number>;

  /**
   * Get tasks due soon (within specified days)
   *
   * @param daysAhead - Number of days to look ahead
   * @param context - Service execution context with authenticated user
   * @returns Promise resolving to tasks due soon
   *
   * @throws {ValidationError} When daysAhead is invalid
   * @throws {AuthenticationError} When user is not authenticated
   * @throws {InternalServiceError} When query fails
   */
  getTasksDueSoon(daysAhead: number, context: ServiceContext): Promise<Task[]>;
}

// ============================================================================
// SUPPORTING TYPES
// ============================================================================

/**
 * Task event for audit logging
 */
export interface TaskEvent {
  /** Event type */
  type: "create" | "update" | "delete" | "status_change";
  /** Task ID involved in event */
  taskId: number;
  /** User ID who performed the action */
  userId: number;
  /** Previous task state (for updates) */
  previousState?: Partial<Task>;
  /** New task state */
  newState: Partial<Task>;
}
