/**
 * Common Repository Type Definitions
 *
 * Shared types used across all repository modules.
 */

import type { Transaction } from "sequelize";

// ============================================================================
// COMMON REPOSITORY TYPES
// ============================================================================

/**
 * Repository query result with pagination metadata
 */
export interface PaginatedResult<T> {
  /** Array of result items */
  items: T[];
  /** Total number of items (without pagination) */
  totalCount: number;
  /** Whether there are more items after current page */
  hasNextPage: boolean;
  /** Whether there are items before current page */
  hasPreviousPage: boolean;
}

/**
 * Transaction options for repository operations
 */
export interface TransactionOptions {
  /** Sequelize transaction instance */
  transaction?: Transaction;
}

/**
 * Generic pagination options
 */
export interface PaginationOptions {
  /** Number of items to skip (offset) */
  offset?: number;
  /** Maximum number of items to return */
  limit?: number;
}

/**
 * Generic sorting options
 */
export interface SortingOptions<TField extends string = string> {
  /** Field to sort by */
  sortBy?: TField;
  /** Sort direction */
  order?: "asc" | "desc";
}

// ============================================================================
// BASE REPOSITORY INTERFACE
// ============================================================================

/**
 * Base repository interface with common operations
 */
export interface BaseRepository<
  TAttributes,
  TCreationAttributes,
  TFilters = Record<string, string | number | boolean | null>,
> {
  /**
   * Create new record
   */
  create(
    attributes: TCreationAttributes,
    options?: TransactionOptions,
  ): Promise<TAttributes>;

  /**
   * Find record by primary key
   */
  findByPk(
    id: number,
    options?: TransactionOptions,
  ): Promise<TAttributes | null>;

  /**
   * Update record by primary key
   */
  update(
    id: number,
    updates: Partial<TCreationAttributes>,
    options?: TransactionOptions,
  ): Promise<TAttributes>;

  /**
   * Delete record by primary key
   */
  delete(id: number, options?: TransactionOptions): Promise<void>;

  /**
   * Find records with filtering and pagination
   */
  findAndCountAll(
    filters: TFilters,
    options?: TransactionOptions,
  ): Promise<PaginatedResult<TAttributes>>;

  /**
   * Count records matching filters
   */
  count(filters: TFilters, options?: TransactionOptions): Promise<number>;

  /**
   * Check if record exists by ID
   */
  exists(id: number, options?: TransactionOptions): Promise<boolean>;
}

// ============================================================================
// AUDIT LOG REPOSITORY TYPES
// ============================================================================

/**
 * Audit log model attributes
 */
export interface AuditLogAttributes {
  /** Primary key identifier */
  id: number;
  /** Table name that was modified */
  tableName: string;
  /** Record ID that was modified */
  recordId: number;
  /** Action performed (INSERT, UPDATE, DELETE) */
  action: "INSERT" | "UPDATE" | "DELETE";
  /** Previous values (for UPDATE) */
  oldValues: Record<string, string | number | boolean | null> | null;
  /** New values */
  newValues: Record<string, string | number | boolean | null>;
  /** User who performed the action */
  userId: number | null;
  /** Client IP address */
  ipAddress: string | null;
  /** User agent string */
  userAgent: string | null;
  /** Action timestamp */
  createdAt: Date;
}

/**
 * Audit log query filters
 */
export interface AuditLogFilters extends PaginationOptions {
  /** Filter by table name */
  tableName?: string;
  /** Filter by record ID */
  recordId?: number;
  /** Filter by action type */
  action?: "INSERT" | "UPDATE" | "DELETE";
  /** Filter by user ID */
  userId?: number;
  /** Filter by date range */
  createdBefore?: Date;
  /** Filter by date range */
  createdAfter?: Date;
}

/**
 * Audit log repository interface for audit trail management
 */
export interface AuditLogRepository {
  /**
   * Create new audit log entry
   *
   * @param attributes - Audit log data
   * @param options - Transaction options
   * @returns Promise resolving to created audit log
   */
  create(
    attributes: Omit<AuditLogAttributes, "id" | "createdAt">,
    options?: TransactionOptions,
  ): Promise<AuditLogAttributes>;

  /**
   * Find audit logs with filtering and pagination
   *
   * @param filters - Query filters
   * @param options - Transaction options
   * @returns Promise resolving to paginated audit log results
   */
  findAndCountAll(
    filters: AuditLogFilters,
    options?: TransactionOptions,
  ): Promise<PaginatedResult<AuditLogAttributes>>;

  /**
   * Find audit logs for specific record
   *
   * @param tableName - Table name
   * @param recordId - Record identifier
   * @param options - Transaction options
   * @returns Promise resolving to array of audit logs
   */
  findByRecord(
    tableName: string,
    recordId: number,
    options?: TransactionOptions,
  ): Promise<AuditLogAttributes[]>;

  /**
   * Delete old audit logs beyond retention period
   *
   * @param retentionDays - Number of days to retain logs
   * @param options - Transaction options
   * @returns Promise resolving to number of deleted records
   */
  deleteOldLogs(
    retentionDays: number,
    options?: TransactionOptions,
  ): Promise<number>;

  /**
   * Get audit log statistics
   *
   * @param options - Transaction options
   * @returns Promise resolving to audit statistics
   */
  getStatistics(options?: TransactionOptions): Promise<{
    totalLogs: number;
    logsByAction: Record<"INSERT" | "UPDATE" | "DELETE", number>;
    logsByTable: Record<string, number>;
    oldestLogDate: Date | null;
    newestLogDate: Date | null;
  }>;
}

// ============================================================================
// TOKEN BLACKLIST REPOSITORY TYPES
// ============================================================================

/**
 * Token blacklist model attributes
 */
export interface TokenBlacklistAttributes {
  /** Primary key identifier */
  id: number;
  /** JWT ID (jti claim) */
  tokenJti: string;
  /** User ID who owned the token */
  userId: number;
  /** Token expiration timestamp */
  expiresAt: Date;
  /** Blacklist entry creation timestamp */
  createdAt: Date;
}

/**
 * Token blacklist repository interface for JWT revocation
 */
export interface TokenBlacklistRepository {
  /**
   * Add token to blacklist
   *
   * @param attributes - Token blacklist data
   * @param options - Transaction options
   * @returns Promise resolving to created blacklist entry
   */
  create(
    attributes: Omit<TokenBlacklistAttributes, "id" | "createdAt">,
    options?: TransactionOptions,
  ): Promise<TokenBlacklistAttributes>;

  /**
   * Check if token is blacklisted
   *
   * @param tokenJti - JWT ID to check
   * @param options - Transaction options
   * @returns Promise resolving to true if token is blacklisted
   */
  isBlacklisted(
    tokenJti: string,
    options?: TransactionOptions,
  ): Promise<boolean>;

  /**
   * Remove expired tokens from blacklist
   *
   * @param options - Transaction options
   * @returns Promise resolving to number of removed tokens
   */
  removeExpiredTokens(options?: TransactionOptions): Promise<number>;

  /**
   * Find blacklisted tokens for a user
   *
   * @param userId - User identifier
   * @param options - Transaction options
   * @returns Promise resolving to array of blacklisted tokens
   */
  findByUser(
    userId: number,
    options?: TransactionOptions,
  ): Promise<TokenBlacklistAttributes[]>;

  /**
   * Revoke all tokens for a user (e.g., on password change)
   *
   * @param userId - User identifier
   * @param expiresAt - Expiration timestamp for all tokens
   * @param options - Transaction options
   * @returns Promise resolving to number of revoked tokens
   */
  revokeAllUserTokens(
    userId: number,
    expiresAt: Date,
    options?: TransactionOptions,
  ): Promise<number>;

  /**
   * Get blacklist statistics
   *
   * @param options - Transaction options
   * @returns Promise resolving to blacklist statistics
   */
  getStatistics(options?: TransactionOptions): Promise<{
    totalBlacklistedTokens: number;
    expiredTokens: number;
    activeBlacklistedTokens: number;
  }>;
}
