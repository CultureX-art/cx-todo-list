/**
 * Service Error Definitions
 *
 * Standardized error hierarchy for consistent error handling across services.
 */

import type { ErrorCode } from "../api/types";

// ============================================================================
// BASE SERVICE ERROR
// ============================================================================

/**
 * Base service error for consistent error handling
 */
export abstract class ServiceError extends Error {
  abstract readonly code: ErrorCode;
  abstract readonly statusCode: number;

  constructor(
    message: string,
    public readonly details?: Array<{ field: string; issue: string }> | string,
  ) {
    super(message);
    this.name = this.constructor.name;
  }

  /**
   * Format error details for response
   */
  protected formatDetails():
    | Array<{ field: string; issue: string }>
    | undefined {
    if (Array.isArray(this.details)) {
      return this.details;
    }
    return undefined;
  }
}

// ============================================================================
// SPECIFIC ERROR TYPES
// ============================================================================

/**
 * Validation error for invalid input data
 */
export class ValidationError extends ServiceError {
  readonly code: ErrorCode = "validation_failed";
  readonly statusCode = 400;

  constructor(
    message: string,
    public readonly validationDetails: Array<{
      field: string;
      issue: string;
    }> = [],
  ) {
    super(message, validationDetails);
  }

  protected override formatDetails(): Array<{ field: string; issue: string }> {
    return this.validationDetails;
  }

  /**
   * Create validation error from field errors
   */
  static fromFields(
    errors: Array<{ field: string; issue: string }>,
  ): ValidationError {
    return new ValidationError("Request validation failed", errors);
  }
}

/**
 * Authentication error for invalid credentials
 */
export class AuthenticationError extends ServiceError {
  readonly code: ErrorCode = "unauthorized";
  readonly statusCode = 401;

  constructor(message = "Authentication required") {
    super(message);
  }

  static invalidCredentials(): AuthenticationError {
    return new AuthenticationError("Invalid email or password");
  }

  static tokenExpired(): AuthenticationError {
    return new AuthenticationError("Token has expired");
  }

  static tokenInvalid(): AuthenticationError {
    return new AuthenticationError("Invalid or malformed token");
  }

  static tokenRevoked(): AuthenticationError {
    return new AuthenticationError("Token has been revoked");
  }
}

/**
 * Authorization error for insufficient permissions
 */
export class AuthorizationError extends ServiceError {
  readonly code: ErrorCode = "forbidden";
  readonly statusCode = 403;

  constructor(message = "Access denied") {
    super(message);
  }

  static insufficientPermissions(): AuthorizationError {
    return new AuthorizationError(
      "Insufficient permissions to access this resource",
    );
  }

  static resourceOwnershipRequired(): AuthorizationError {
    return new AuthorizationError("You can only access your own resources");
  }
}

/**
 * Resource not found error
 */
export class NotFoundError extends ServiceError {
  readonly code: ErrorCode = "not_found";
  readonly statusCode = 404;

  constructor(resource = "Resource", id?: string | number) {
    const message =
      id !== undefined
        ? `${resource} with id ${id} not found`
        : `${resource} not found`;
    super(message);
  }

  static user(id?: number): NotFoundError {
    return new NotFoundError("User", id);
  }

  static task(id?: number): NotFoundError {
    return new NotFoundError("Task", id);
  }
}

/**
 * Resource conflict error (e.g., duplicate email)
 */
export class ConflictError extends ServiceError {
  readonly code: ErrorCode = "conflict";
  readonly statusCode = 409;

  constructor(message: string) {
    super(message);
  }

  static emailExists(): ConflictError {
    return new ConflictError("Email address is already registered");
  }

  static resourceExists(resource: string): ConflictError {
    return new ConflictError(`${resource} already exists`);
  }
}

/**
 * Business logic error for domain rule violations
 */
export class BusinessLogicError extends ServiceError {
  readonly code: ErrorCode = "validation_failed"; // Use validation_failed for business rules
  readonly statusCode = 422;

  constructor(message: string) {
    super(message);
  }

  static invalidStatusTransition(from: string, to: string): BusinessLogicError {
    return new BusinessLogicError(`Cannot transition from ${from} to ${to}`);
  }

  static pastDueDate(): BusinessLogicError {
    return new BusinessLogicError("Due date cannot be in the past");
  }

  static tooManyLabels(max: number): BusinessLogicError {
    return new BusinessLogicError(`Maximum ${max} labels allowed per task`);
  }
}

/**
 * Rate limiting error
 */
export class RateLimitError extends ServiceError {
  readonly code: ErrorCode = "rate_limited";
  readonly statusCode = 429;

  constructor(
    message = "Too many requests",
    public readonly retryAfter?: number,
  ) {
    super(message);
  }

  static tooManyRequests(retryAfterSeconds?: number): RateLimitError {
    return new RateLimitError(
      "Too many requests, please try again later",
      retryAfterSeconds,
    );
  }

  static tooManyLoginAttempts(): RateLimitError {
    return new RateLimitError(
      "Too many login attempts, please try again later",
      300,
    );
  }
}

/**
 * Internal service error for unexpected failures
 */
export class InternalServiceError extends ServiceError {
  readonly code: ErrorCode = "internal_error";
  readonly statusCode = 500;

  constructor(message = "Internal server error", cause?: Error) {
    super(message);
    if (cause?.stack !== undefined && cause.stack !== null) {
      this.stack = cause.stack;
    }
  }

  static databaseError(cause?: Error): InternalServiceError {
    return new InternalServiceError("Database operation failed", cause);
  }

  static externalServiceError(
    service: string,
    cause?: Error,
  ): InternalServiceError {
    return new InternalServiceError(
      `External service ${service} is unavailable`,
      cause,
    );
  }

  static configurationError(message: string): InternalServiceError {
    return new InternalServiceError(`Configuration error: ${message}`);
  }
}

// ============================================================================
// ERROR UTILITIES
// ============================================================================

/**
 * Type guard to check if error is a service error
 */
export const isServiceError = (
  error: Error | ServiceError,
): error is ServiceError => {
  return error instanceof ServiceError;
};

/**
 * Convert any error to a service error
 */
export const toServiceError = (
  error: Error | ServiceError | string | Record<string, never> | null,
): ServiceError => {
  if (isServiceError(error as Error | ServiceError)) {
    return error as ServiceError;
  }

  if (error instanceof Error) {
    return new InternalServiceError(error.message, error);
  }

  if (typeof error === "string") {
    return new InternalServiceError(error);
  }

  return new InternalServiceError("Internal server error occurred");
};

/**
 * Extract error message from any error type
 */
export const getErrorMessage = (
  error: Error | string | Record<string, never> | null,
): string => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Internal server error occurred";
};
