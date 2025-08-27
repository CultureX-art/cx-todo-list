/**
 * Common API Type Definitions
 *
 * Shared types used across all API modules.
 */

// ============================================================================
// COMMON RESPONSE TYPES
// ============================================================================

/**
 * Standard error codes for programmatic handling
 */
export type ErrorCode =
  | "validation_failed"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "rate_limited"
  | "internal_error";

/**
 * Detailed validation error information
 */
export interface ValidationDetail {
  /** Field name that failed validation */
  field: string;
  /** Description of validation failure */
  issue: string;
}

/**
 * Standard API error structure
 */
export interface ApiError {
  code: ErrorCode;
  message: string;
}

/**
 * Validation error structure with details
 */
export interface ValidationError extends ApiError {
  details: ValidationDetail[];
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Standard API response wrapper with correlation tracking
 */
export interface ApiResponse {
  /** Request correlation ID for tracing */
  correlationId: string;
  /** Human-readable status message */
  message: string;
  /** Timestamp of the response in ISO 8601 format */
  timestamp: string;
  /** Response time in milliseconds (optional) */
  responseTimeMs?: number;
  /** Metadata (pagination, etc.) */
  meta?: PaginationMeta | Record<string, string | number | boolean>;
}

/**
 * Standard error response structure
 */
export interface ErrorApiResponse extends ApiResponse {
  /** Error information */
  errors: ApiError[];
  /** Request path where error occurred */
  path: string;
}

/**
 * Success response structure
 */
export interface SuccessApiResponse<
  TData = Record<string, string | number | boolean | null>,
> extends ApiResponse {
  /** Response data payload */
  data: TData;
  /** Only validation errors possible in case of success response */
  errors?: ValidationError[];
}

/**
 * Pagination information
 */
export interface PaginationInfo {
  /** Current page number (1-based) */
  page: number;
  /** Number of items per page */
  limit: number;
  /** Total number of items */
  total: number;
  /** Total number of pages */
  totalPages: number;
}

/**
 * Paginated response structure
 */
export interface PaginatedResponse<
  TData = Record<string, string | number | boolean | null>,
> extends SuccessApiResponse<TData[]> {
  /** Array of data items */
  data: TData[];
  /** Pagination information */
  pagination: PaginationInfo;
}

// ============================================================================
// SYSTEM TYPES
// ============================================================================
// Note: Health check types moved to src/health/api/types.ts

// ============================================================================
// MIDDLEWARE TYPES
// ============================================================================

/**
 * Express middleware function with typed request/response
 */
export type Middleware<
  TReq = Record<string, string | number | boolean>,
  TRes = Record<string, string | number | boolean>,
> = (req: TReq, res: TRes, next: () => void) => void | Promise<void>;

/**
 * Correlation ID middleware request extension
 */
export interface CorrelatedRequestExtension {
  /** Request correlation ID for tracing */
  correlationId: string;
}

// ============================================================================
// RATE LIMITING TYPES
// ============================================================================

/**
 * Rate limiting configuration per endpoint
 */
export interface RateLimitConfig {
  /** Maximum requests per window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Error message when limit exceeded */
  message: string;
  /** HTTP status code when limit exceeded */
  statusCode: number;
}

/**
 * Rate limit status information
 */
export interface RateLimitStatus {
  /** Remaining requests in current window */
  remaining: number;
  /** Total requests allowed per window */
  limit: number;
  /** Time until window resets (milliseconds) */
  resetTime: number;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard to check if error is API error response
 */
export const isErrorResponse = (obj: ApiResponse): obj is ErrorApiResponse => {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "errors" in obj &&
    obj.errors !== undefined &&
    obj.errors !== null &&
    Array.isArray(obj.errors)
  );
};

/**
 * Type guard to check if response has pagination metadata
 */
export const hasPaginationMeta = (
  obj: Record<
    string,
    Record<string, string | number | boolean> | string | number | boolean
  > | null,
): obj is { meta: { page: number; pageSize: number; total: number } } => {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "meta" in obj &&
    typeof (obj as { meta: Record<string, string | number | boolean> }).meta ===
      "object" &&
    (obj as { meta: Record<string, string | number | boolean> }).meta !==
      null &&
    "page" in
      (obj as { meta: Record<string, string | number | boolean> }).meta &&
    "pageSize" in
      (obj as { meta: Record<string, string | number | boolean> }).meta &&
    "total" in (obj as { meta: Record<string, string | number | boolean> }).meta
  );
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create a success response
 */
export function createSuccessResponse<TData>(
  data: TData,
  message: string,
  correlationId: string,
  responseTimeMs?: number,
): SuccessApiResponse<TData> {
  return {
    data,
    message,
    correlationId,
    timestamp: new Date().toISOString(),
    responseTimeMs: responseTimeMs ?? Date.now() - Date.now(),
  };
}

/**
 * Create an error response
 */
export function createErrorResponse(
  code: ErrorCode,
  message: string,
  correlationId: string,
  path: string,
  details?: ValidationDetail[],
): ErrorApiResponse {
  return {
    errors: [
      {
        code,
        message,
        ...(details ? { details } : {}),
      },
    ],
    path,
    correlationId,
    timestamp: new Date().toISOString(),
    message,
  };
}

/**
 * Create a paginated response
 */
export function createPaginatedResponse<TData>(
  items: TData[],
  pagination: PaginationInfo,
  message: string,
  correlationId: string,
  responseTimeMs?: number,
): PaginatedResponse<TData> {
  return {
    data: items,
    pagination,
    message,
    correlationId,
    timestamp: new Date().toISOString(),
    responseTimeMs: responseTimeMs ?? Date.now() - Date.now(),
  };
}

/**
 * Check if error code is valid
 */
export function isValidErrorCode(code: string | null): code is ErrorCode {
  const validCodes: ErrorCode[] = [
    "validation_failed",
    "unauthorized",
    "forbidden",
    "not_found",
    "conflict",
    "rate_limited",
    "internal_error",
  ];
  return typeof code === "string" && validCodes.includes(code as ErrorCode);
}

/**
 * Format validation errors from various formats
 */
export function formatValidationErrors(
  errors: Record<string, string>[] | Record<string, string> | null,
): ValidationDetail[] {
  if (errors === null) {
    return [];
  }

  // Handle array of validation objects
  if (Array.isArray(errors)) {
    return errors.map((error: Record<string, string>) => {
      if (error !== null && typeof error === "object" && "field" in error) {
        const errorObj = error as Record<string, string>;
        const field = String(errorObj["field"]);
        let issue = "Validation error";

        if ("issue" in errorObj && typeof errorObj["issue"] === "string") {
          issue = errorObj["issue"];
        } else if (
          "message" in errorObj &&
          typeof errorObj["message"] === "string"
        ) {
          issue = errorObj["message"];
        }

        return { field, issue };
      }
      return { field: "validation_error", issue: "Validation error" };
    });
  }

  // Handle object with field keys and error messages
  if (typeof errors === "object" && errors !== null) {
    return Object.entries(errors).map(([field, issue]) => ({
      field,
      issue: String(issue),
    }));
  }

  return [];
}
