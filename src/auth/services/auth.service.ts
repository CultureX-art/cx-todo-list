/**
 * Authentication Service Type Definitions
 *
 * These interfaces define the contracts for authentication business logic services.
 */

import type {
  SignupRequest,
  SignupResponse,
  LoginRequest,
  LoginResponse,
  UserProfile,
  JwtPayload,
} from "../api/types";
import type { ServiceContext } from "../../common/types/service";

// ============================================================================
// SERVICE INTERFACE
// ============================================================================

/**
 * Authentication service interface for user management and JWT operations
 */
export interface IAuthService {
  /**
   * Register a new user account
   *
   * @param request - User registration data
   * @param context - Service execution context
   * @returns Promise resolving to created user information
   *
   * @throws {ValidationError} When email format is invalid or password is weak
   * @throws {ConflictError} When email address is already registered
   * @throws {InternalServiceError} When user creation fails
   */
  signup(
    request: SignupRequest,
    context: ServiceContext,
  ): Promise<SignupResponse>;

  /**
   * Authenticate user and generate JWT token
   *
   * @param request - Login credentials
   * @param context - Service execution context
   * @returns Promise resolving to authentication token and user profile
   *
   * @throws {ValidationError} When email or password is missing
   * @throws {AuthenticationError} When credentials are invalid
   * @throws {InternalServiceError} When token generation fails
   */
  login(request: LoginRequest, context: ServiceContext): Promise<LoginResponse>;

  /**
   * Get user profile by ID
   *
   * @param userId - User identifier
   * @param context - Service execution context
   * @returns Promise resolving to user profile or null if not found
   *
   * @throws {NotFoundError} When user doesn't exist
   * @throws {InternalServiceError} When profile retrieval fails
   */
  getUserProfile(
    userId: number,
    context: ServiceContext,
  ): Promise<UserProfile | null>;

  /**
   * Validate JWT token and extract payload
   *
   * @param token - JWT token to validate
   * @param context - Service execution context
   * @returns Promise resolving to decoded token payload
   *
   * @throws {AuthenticationError} When token is invalid, expired, or malformed
   * @throws {InternalServiceError} When token validation fails
   */
  validateToken(token: string, context: ServiceContext): Promise<JwtPayload>;

  /**
   * Generate new JWT token for user
   *
   * @param userId - User identifier
   * @param email - User email address
   * @param context - Service execution context
   * @returns Promise resolving to signed JWT token
   *
   * @throws {InternalServiceError} When token generation fails
   */
  generateToken(
    userId: number,
    email: string,
    context: ServiceContext,
  ): Promise<string>;

  /**
   * Revoke JWT token (add to blacklist)
   *
   * @param tokenId - JWT ID (jti claim)
   * @param context - Service execution context
   * @returns Promise resolving when token is revoked
   *
   * @throws {InternalServiceError} When token revocation fails
   */
  revokeToken(tokenId: string, context: ServiceContext): Promise<void>;

  /**
   * Check if JWT token is revoked
   *
   * @param tokenId - JWT ID (jti claim)
   * @param context - Service execution context
   * @returns Promise resolving to true if token is revoked
   *
   * @throws {InternalServiceError} When blacklist check fails
   */
  isTokenRevoked(tokenId: string, context: ServiceContext): Promise<boolean>;
}

// ============================================================================
// SUPPORTING TYPES
// ============================================================================

/**
 * Authentication event for audit logging
 */
export interface AuthEvent {
  /** Event type */
  type: "login" | "logout" | "signup" | "token_refresh" | "password_change";
  /** User ID involved in event */
  userId: number;
  /** User email involved in event */
  email: string;
  /** Success status of the event */
  success: boolean;
  /** Failure reason if unsuccessful */
  failureReason?: string;
  /** Client IP address */
  clientIp: string;
  /** User agent string */
  userAgent: string;
}
