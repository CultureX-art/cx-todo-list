/**
 * Common Service Type Definitions
 *
 * Shared types used across all service modules.
 */

// ============================================================================
// SERVICE CONTEXT
// ============================================================================

/**
 * Service execution context with user and correlation information
 */
export interface ServiceContext {
  /** Authenticated user information (optional for public endpoints) */
  user?: {
    id: number;
    email: string;
  };
  /** Request correlation ID for tracing */
  correlationId: string;
  /** Request timestamp */
  timestamp: Date;
  /** Client IP address (for audit logging) */
  clientIp?: string;
  /** User agent string (for audit logging) */
  userAgent?: string;
}

/**
 * Transaction context for database operations
 */
export interface TransactionContext {
  /** Database transaction handle (Sequelize transaction) */
  transaction?: { id: string; active: boolean };
}

// ============================================================================
// EVENT TYPE PLACEHOLDERS
// ============================================================================

/**
 * Authentication event placeholder
 * (actual definition in auth service module)
 */
export interface AuthEvent {
  type: string;
  userId: number;
  email: string;
  success: boolean;
  failureReason?: string;
  clientIp: string;
  userAgent: string;
}

/**
 * Task event placeholder
 * (actual definition in task service module)
 */
export interface TaskEvent {
  type: string;
  taskId: number;
  userId: number;
  previousState?: Record<string, string | number | boolean | null>;
  newState: Record<string, string | number | boolean | null>;
}
