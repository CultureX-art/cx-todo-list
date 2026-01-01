/**
 * API Response Factory
 *
 * This module provides standardized functions for creating consistent API
 * success and error responses.
 */

import {
  SuccessApiResponse,
  ErrorApiResponse,
  PaginatedResponse,
  PaginationInfo,
  ErrorCode,
  ValidationDetail,
  PaginationMeta,
} from "../api/types";

/**
 * Creates a standardized success response object.
 *
 * @param data - The payload to be included in the response.
 * @param meta - Optional metadata.
 * @returns A structured success response.
 */
export function createSuccessResponse<T>(
  data: T,
  meta?: PaginationMeta | Record<string, string | number | boolean>,
): SuccessApiResponse<T> {
  return {
    timestamp: new Date().toISOString(),
    correlationId: "", // This will be populated by middleware
    message: "Operation completed successfully",
    data,
    ...meta && { meta },
  };
}

/**
 * Creates a standardized paginated response object.
 *
 * @param data - The array of data for the current page.
 * @param pagination - Pagination information.
 * @param meta - Optional metadata.
 * @returns A structured paginated response.
 */
export function createPaginatedResponse<T>(
  data: T[],
  pagination: PaginationInfo,
  meta?: Record<string, unknown>,
): PaginatedResponse<T> {
  return {
    timestamp: new Date().toISOString(),
    correlationId: "", // This will be populated by middleware
    message: "Operation completed successfully",
    data,
    pagination,
    meta: meta as any, // Cast to avoid type conflict for now
  };
}

/**
 * Creates a standardized error response object.
 *
 * @param code - The error code.
 * @param message - A human-readable error message.
 * @param correlationId - The request correlation ID.
 * @param path - The request path where the error occurred.
 * @param validationDetails - Optional array of validation errors.
 * @returns A structured error response.
 */
export function createErrorResponse(
  code: ErrorCode,
  message: string,
  correlationId: string,
  path: string,
  validationDetails?: ValidationDetail[],
): ErrorApiResponse {
  return {
    timestamp: new Date().toISOString(),
    correlationId,
    message,
    path,
    errors: [
      {
        code,
        message,
        ...(validationDetails && { details: validationDetails }),
      },
    ],
  };
}