/**
 * Authentication API Type Definitions
 *
 * These interfaces define the frozen contract for authentication-related API interactions.
 * Once implemented, these can only have additive changes to maintain backward compatibility.
 */

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * User signup request payload
 */
export interface SignupRequest {
  /** Valid email address for user account */
  email: string;
  /** Password with minimum 8 characters, at least one uppercase, lowercase, and number */
  password: string;
}

/**
 * User signup response
 */
export interface SignupResponse {
  /** Unique user identifier */
  id: number;
  /** User email address */
  email: string;
  /** Account creation timestamp in ISO 8601 format */
  createdAt: string;
}

/**
 * User login request payload
 */
export interface LoginRequest {
  /** Registered email address */
  email: string;
  /** User password */
  password: string;
}

/**
 * User login response with JWT token
 */
export interface LoginResponse {
  /** JWT access token for authentication */
  token: string;
  /** Token expiration timestamp in ISO 8601 format */
  expiresAt: string;
  /** User profile information */
  user: UserProfile;
}

/**
 * User profile information
 */
export interface UserProfile {
  /** Unique user identifier */
  id: number;
  /** User email address */
  email: string;
  /** Account creation timestamp in ISO 8601 format */
  createdAt: string;
}

// ============================================================================
// JWT TYPES
// ============================================================================

/**
 * JWT token payload structure
 */
export interface JwtPayload {
  /** User ID (subject) */
  sub: number;
  /** User email */
  email: string;
  /** Token issued at timestamp (Unix) */
  iat: number;
  /** Token expiration timestamp (Unix) */
  exp: number;
  /** JWT ID for token revocation */
  jti: string;
  /** Token issuer */
  iss: string;
  /** Token audience */
  aud: string;
}

// ============================================================================
// CONTEXT TYPES
// ============================================================================

/**
 * Authenticated user context
 */
export interface AuthenticatedUser {
  /** User ID from JWT token */
  id: number;
  /** User email from JWT token */
  email: string;
  /** Token jti */
  jti: string;
}

/**
 * Express request with authenticated user context
 */
export interface AuthenticatedRequest<
  TBody = Record<string, string | number | boolean>,
  TQuery = Record<string, string>,
> {
  /** Request body payload */
  body: TBody;
  /** Query parameters */
  query: TQuery;
  /** Route parameters */
  params: Record<string, string>;
  /** Authenticated user information */
  user: AuthenticatedUser;
  /** Request correlation ID */
  correlationId: string;
  /** Request headers */
  headers: Record<string, string | string[]>;
}

/**
 * Authentication middleware request extension
 */
export interface AuthenticatedRequestExtension {
  /** Authenticated user context */
  user: AuthenticatedUser;
}
