/**
 * User Repository Interface Definitions
 *
 * These interfaces define the contracts for user data access operations.
 */

import type {
  PaginatedResult,
  TransactionOptions,
} from "../../common/types/repository";

// ============================================================================
// MODEL ATTRIBUTES
// ============================================================================

/**
 * User model attributes as stored in database
 */
export interface UserAttributes {
  /** Primary key identifier */
  id: number;
  /** Unique email address */
  email: string;
  /** Bcrypt hashed password */
  passwordHash: string;
  /** Account creation timestamp */
  createdAt: Date;
  /** Last modification timestamp */
  updatedAt: Date;
  /** Soft delete timestamp (null = active) */
  deletedAt: Date | null;
}

/**
 * User creation attributes (excludes auto-generated fields)
 */
export interface UserCreationAttributes {
  /** Unique email address */
  email: string;
  /** Bcrypt hashed password */
  passwordHash: string;
}

// ============================================================================
// QUERY FILTERS
// ============================================================================

/**
 * User query filters for repository operations
 */
export interface UserFilters {
  /** Number of items to skip (offset) */
  offset?: number;
  /** Maximum number of items to return */
  limit?: number;
  /** Filter by email pattern */
  emailPattern?: string;
  /** Filter by creation date range */
  createdBefore?: Date;
  /** Filter by creation date range */
  createdAfter?: Date;
  /** Include soft-deleted records */
  includeSoftDeleted?: boolean;
}

// ============================================================================
// REPOSITORY INTERFACE
// ============================================================================

/**
 * User repository interface for user data access
 */
export interface IUserRepository {
  /**
   * Create a new user in the database
   *
   * @param attributes - User creation data
   * @param options - Transaction options
   * @returns Promise resolving to created user
   *
   * @throws {Error} When email already exists or database error occurs
   */
  create(
    attributes: UserCreationAttributes,
    options?: TransactionOptions,
  ): Promise<UserAttributes>;

  /**
   * Find user by primary key
   *
   * @param id - User identifier
   * @param options - Transaction options
   * @returns Promise resolving to user or null if not found
   */
  findByPk(
    id: number,
    options?: TransactionOptions,
  ): Promise<UserAttributes | null>;

  /**
   * Find user by email address
   *
   * @param email - User email address
   * @param options - Transaction options
   * @returns Promise resolving to user or null if not found
   */
  findByEmail(
    email: string,
    options?: TransactionOptions,
  ): Promise<UserAttributes | null>;

  /**
   * Update user by primary key
   *
   * @param id - User identifier
   * @param updates - Fields to update
   * @param options - Transaction options
   * @returns Promise resolving to updated user
   *
   * @throws {Error} When user not found or update fails
   */
  update(
    id: number,
    updates: Partial<UserCreationAttributes>,
    options?: TransactionOptions,
  ): Promise<UserAttributes>;

  /**
   * Soft delete user by primary key
   *
   * @param id - User identifier
   * @param options - Transaction options
   * @returns Promise resolving when deletion is complete
   *
   * @throws {Error} When user not found or deletion fails
   */
  delete(id: number, options?: TransactionOptions): Promise<void>;

  /**
   * Find users with filtering and pagination
   *
   * @param filters - Query filters and pagination options
   * @param options - Transaction options
   * @returns Promise resolving to paginated user results
   */
  findAndCountAll(
    filters: UserFilters,
    options?: TransactionOptions,
  ): Promise<PaginatedResult<UserAttributes>>;

  /**
   * Check if email address exists
   *
   * @param email - Email address to check
   * @param excludeUserId - User ID to exclude from check (for updates)
   * @param options - Transaction options
   * @returns Promise resolving to true if email exists
   */
  emailExists(
    email: string,
    excludeUserId?: number,
    options?: TransactionOptions,
  ): Promise<boolean>;
}
