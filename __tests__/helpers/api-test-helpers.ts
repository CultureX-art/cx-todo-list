/**
 * API Test Helpers
 *
 * Comprehensive utilities for testing API endpoints with proper type safety
 */

// import type { Request, Response } from "express"; // Used in type definitions
import supertest from "supertest";
import { Task, TaskStatus } from "../../src/task/api/types";
import { UserProfile } from "../../src/auth/api/types";
import {
  ApiError,
  PaginationMeta,
  ErrorApiResponse,
  SuccessApiResponse,
} from "../../src/common/api/types";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Generic API response structure for testing
 */
export interface TestApiResponse<TData = any> {
  data?: TData;
  errors?: ApiError[];
  correlationId: string;
  message: string;
  timestamp: string;
  meta?: PaginationMeta;
  path?: string;
  responseTimeMs?: number;
}

/**
 * Test request configuration
 */
export interface TestRequestConfig {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  body?: any;
  query?: Record<string, string | number | boolean>;
  headers?: Record<string, string>;
  expectedStatus?: number;
}

/**
 * Mock request factory options
 */
export interface MockRequestOptions {
  body?: any;
  query?: Record<string, string>;
  params?: Record<string, string>;
  headers?: Record<string, string | string[]>;
  user?: any;
  correlationId?: string;
}

/**
 * Mock response factory options
 */
export interface MockResponseOptions {
  statusCode?: number;
  locals?: Record<string, any>;
}

// ============================================================================
// MAIN API TEST HELPERS CLASS
// ============================================================================

export class ApiTestHelpers {
  /**
   * Make a successful API request and validate response structure
   */
  static async makeSuccessRequest<TData = any>(
    app: any,
    config: TestRequestConfig,
  ): Promise<TestApiResponse<TData>> {
    const expectedStatus = config.expectedStatus ?? 200;
    let req = supertest(app)[config.method.toLowerCase() as "get"](config.path);

    // Add query parameters
    if (config.query) {
      req = req.query(config.query);
    }

    // Add headers
    if (config.headers) {
      Object.entries(config.headers).forEach(([key, value]) => {
        req = req.set(key, value);
      });
    }

    // Add body for non-GET requests
    if (config.body && config.method !== "GET") {
      req = req.send(config.body);
    }

    const response = await req.expect(expectedStatus);

    this.validateSuccessResponse(response.body);
    return response.body as TestApiResponse<TData>;
  }

  /**
   * Make an API request expecting an error response
   */
  static async makeErrorRequest(
    app: any,
    config: TestRequestConfig,
  ): Promise<TestApiResponse> {
    const expectedStatus = config.expectedStatus ?? 400;
    let req = supertest(app)[config.method.toLowerCase() as "get"](config.path);

    // Add query parameters
    if (config.query) {
      req = req.query(config.query);
    }

    // Add headers
    if (config.headers) {
      Object.entries(config.headers).forEach(([key, value]) => {
        req = req.set(key, value);
      });
    }

    // Add body for non-GET requests
    if (config.body && config.method !== "GET") {
      req = req.send(config.body);
    }

    const response = await req.expect(expectedStatus);

    this.validateErrorResponse(response.body);
    return response.body as TestApiResponse;
  }

  /**
   * Validate successful API response structure
   */
  static validateSuccessResponse(response: any): void {
    expect(response).toBeDefined();
    expect(typeof response).toBe("object");
    expect(response).not.toBeNull();

    // Required fields
    expect(response.correlationId).toBeDefined();
    expect(typeof response.correlationId).toBe("string");
    expect(response.correlationId.length).toBeGreaterThan(0);

    expect(response.message).toBeDefined();
    expect(typeof response.message).toBe("string");
    expect(response.message.length).toBeGreaterThan(0);

    expect(response.timestamp).toBeDefined();
    expect(typeof response.timestamp).toBe("string");
    expect(() => new Date(response.timestamp)).not.toThrow();

    // Data should be present for success responses
    expect(response.data).toBeDefined();

    // Optional fields validation
    if (response.responseTimeMs !== undefined) {
      expect(typeof response.responseTimeMs).toBe("number");
      expect(response.responseTimeMs).toBeGreaterThanOrEqual(0);
    }

    if (response.meta !== undefined) {
      expect(typeof response.meta).toBe("object");
      expect(response.meta).not.toBeNull();
    }
  }

  /**
   * Validate error API response structure
   */
  static validateErrorResponse(response: any): void {
    expect(response).toBeDefined();
    expect(typeof response).toBe("object");
    expect(response).not.toBeNull();

    // Required fields
    expect(response.correlationId).toBeDefined();
    expect(typeof response.correlationId).toBe("string");
    expect(response.correlationId.length).toBeGreaterThan(0);

    expect(response.message).toBeDefined();
    expect(typeof response.message).toBe("string");
    expect(response.message.length).toBeGreaterThan(0);

    expect(response.timestamp).toBeDefined();
    expect(typeof response.timestamp).toBe("string");
    expect(() => new Date(response.timestamp)).not.toThrow();

    // Error-specific fields
    expect(response.errors).toBeDefined();
    expect(Array.isArray(response.errors)).toBe(true);
    expect(response.errors.length).toBeGreaterThan(0);

    expect(response.path).toBeDefined();
    expect(typeof response.path).toBe("string");

    // Validate error structure
    response.errors.forEach((error: any) => {
      expect(error.code).toBeDefined();
      expect(typeof error.code).toBe("string");
      expect(error.message).toBeDefined();
      expect(typeof error.message).toBe("string");

      if (error.details !== undefined) {
        expect(Array.isArray(error.details)).toBe(true);
        error.details.forEach((detail: any) => {
          expect(detail.field).toBeDefined();
          expect(typeof detail.field).toBe("string");
          expect(detail.issue).toBeDefined();
          expect(typeof detail.issue).toBe("string");
        });
      }
    });
  }

  /**
   * Validate pagination metadata structure
   */
  static validatePaginationMeta(meta: any): void {
    expect(meta).toBeDefined();
    expect(typeof meta).toBe("object");
    expect(meta).not.toBeNull();

    expect(meta.page).toBeDefined();
    expect(typeof meta.page).toBe("number");
    expect(meta.page).toBeGreaterThanOrEqual(1);

    expect(meta.limit).toBeDefined();
    expect(typeof meta.limit).toBe("number");
    expect(meta.limit).toBeGreaterThanOrEqual(1);

    expect(meta.total).toBeDefined();
    expect(typeof meta.total).toBe("number");
    expect(meta.total).toBeGreaterThanOrEqual(0);

    expect(meta.totalPages).toBeDefined();
    expect(typeof meta.totalPages).toBe("number");
    expect(meta.totalPages).toBeGreaterThanOrEqual(0);

    // Logical validation
    const expectedTotalPages = Math.ceil(meta.total / meta.limit);
    expect(meta.totalPages).toBe(expectedTotalPages);
  }

  /**
   * Validate task response structure
   */
  static validateTaskResponse(task: any): void {
    expect(task).toBeDefined();
    expect(typeof task).toBe("object");
    expect(task).not.toBeNull();

    // Required fields
    expect(task.id).toBeDefined();
    expect(typeof task.id).toBe("number");
    expect(task.id).toBeGreaterThan(0);

    expect(task.title).toBeDefined();
    expect(typeof task.title).toBe("string");
    expect(task.title.length).toBeGreaterThan(0);
    expect(task.title.length).toBeLessThanOrEqual(255);

    expect(task.status).toBeDefined();
    expect(typeof task.status).toBe("string");
    expect(["not-started", "in-progress", "done"]).toContain(task.status);

    expect(task.createdAt).toBeDefined();
    expect(typeof task.createdAt).toBe("string");
    expect(() => new Date(task.createdAt)).not.toThrow();

    expect(task.updatedAt).toBeDefined();
    expect(typeof task.updatedAt).toBe("string");
    expect(() => new Date(task.updatedAt)).not.toThrow();

    expect(task.labels).toBeDefined();
    expect(Array.isArray(task.labels)).toBe(true);

    // Nullable fields
    if (task.description !== null) {
      expect(typeof task.description).toBe("string");
      expect(task.description.length).toBeLessThanOrEqual(1000);
    }

    if (task.dueDate !== null) {
      expect(typeof task.dueDate).toBe("string");
      expect(() => new Date(task.dueDate)).not.toThrow();
    }

    // Labels validation
    task.labels.forEach((label: any) => {
      expect(typeof label).toBe("string");
      expect(label.length).toBeGreaterThan(0);
      expect(label.length).toBeLessThanOrEqual(50);
    });

    expect(task.labels.length).toBeLessThanOrEqual(10);
  }

  /**
   * Validate user profile response structure
   */
  static validateUserResponse(user: any): void {
    expect(user).toBeDefined();
    expect(typeof user).toBe("object");
    expect(user).not.toBeNull();

    expect(user.id).toBeDefined();
    expect(typeof user.id).toBe("number");
    expect(user.id).toBeGreaterThan(0);

    expect(user.email).toBeDefined();
    expect(typeof user.email).toBe("string");
    expect(user.email.length).toBeGreaterThan(0);
    expect(user.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);

    expect(user.createdAt).toBeDefined();
    expect(typeof user.createdAt).toBe("string");
    expect(() => new Date(user.createdAt)).not.toThrow();
  }

  // ============================================================================
  // MOCK FACTORIES
  // ============================================================================

  /**
   * Create mock Express request object
   */
  static createMockRequest(options: MockRequestOptions = {}): any {
    return {
      body: options.body ?? {},
      query: options.query ?? {},
      params: options.params ?? {},
      headers: options.headers ?? {},
      user: options.user,
      correlationId: options.correlationId ?? "test-correlation-id",
      method: "GET",
      url: "/test",
      path: "/test",
      get: jest.fn(),
    };
  }

  /**
   * Create mock Express response object
   */
  static createMockResponse(options: MockResponseOptions = {}): any {
    const mockResponse = {
      statusCode: options.statusCode ?? 200,
      locals: options.locals ?? {},
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      get: jest.fn(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
      redirect: jest.fn().mockReturnThis(),
      render: jest.fn().mockReturnThis(),
      end: jest.fn().mockReturnThis(),
    };

    return mockResponse;
  }

  /**
   * Create mock task object for testing
   */
  static createMockTask(overrides: Partial<Task> = {}): Task {
    const defaultTask: Task = {
      id: 1,
      title: "Test Task",
      description: "Test task description",
      status: "not-started",
      dueDate: null,
      labels: ["test"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return { ...defaultTask, ...overrides };
  }

  /**
   * Create mock user profile for testing
   */
  static createMockUser(overrides: Partial<UserProfile> = {}): UserProfile {
    const defaultUser: UserProfile = {
      id: 1,
      email: "test@example.com",
      createdAt: new Date().toISOString(),
    };

    return { ...defaultUser, ...overrides };
  }

  /**
   * Create mock successful API response
   */
  static createMockSuccessResponse<TData = any>(
    data: TData,
    overrides: Partial<SuccessApiResponse<TData>> = {},
  ): SuccessApiResponse<TData> {
    const defaultResponse: SuccessApiResponse<TData> = {
      data,
      correlationId: "test-correlation-id",
      message: "Success",
      timestamp: new Date().toISOString(),
      responseTimeMs: 100,
    };

    return { ...defaultResponse, ...overrides };
  }

  /**
   * Create mock error API response
   */
  static createMockErrorResponse(
    errors: ApiError[],
    overrides: Partial<ErrorApiResponse> = {},
  ): ErrorApiResponse {
    const defaultResponse: ErrorApiResponse = {
      errors,
      correlationId: "test-correlation-id",
      message: "Error occurred",
      timestamp: new Date().toISOString(),
      path: "/test/path",
    };

    return { ...defaultResponse, ...overrides };
  }

  /**
   * Create mock pagination metadata
   */
  static createMockPaginationMeta(
    overrides: Partial<PaginationMeta> = {},
  ): PaginationMeta {
    const defaultMeta: PaginationMeta = {
      page: 1,
      limit: 10,
      total: 25,
      totalPages: 3,
    };

    return { ...defaultMeta, ...overrides };
  }

  // ============================================================================
  // VALIDATION UTILITIES
  // ============================================================================

  /**
   * Check if a value is a valid task status
   */
  static isValidTaskStatus(status: any): status is TaskStatus {
    return (
      typeof status === "string" &&
      ["not-started", "in-progress", "done"].includes(status)
    );
  }

  /**
   * Check if a value is a valid ISO date string
   */
  static isValidISODate(dateString: any): boolean {
    if (typeof dateString !== "string") return false;
    const date = new Date(dateString);
    return !isNaN(date.getTime()) && dateString === date.toISOString();
  }

  /**
   * Check if a value is a valid email address
   */
  static isValidEmail(email: any): boolean {
    if (typeof email !== "string") return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Assert that response time is within acceptable bounds
   */
  static validateResponseTime(
    responseTimeMs: number,
    maxMs: number = 1000,
  ): void {
    expect(responseTimeMs).toBeDefined();
    expect(typeof responseTimeMs).toBe("number");
    expect(responseTimeMs).toBeGreaterThanOrEqual(0);
    expect(responseTimeMs).toBeLessThanOrEqual(maxMs);
  }

  /**
   * Validate correlation ID format (UUID v4)
   */
  static validateCorrelationId(correlationId: any): void {
    expect(correlationId).toBeDefined();
    expect(typeof correlationId).toBe("string");
    expect(correlationId.length).toBeGreaterThan(0);

    // Basic UUID v4 format check (optional - can be any string format)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(correlationId)) {
      expect(correlationId).toMatch(uuidRegex);
    }
  }
}

// ============================================================================
// EXPORTED UTILITIES
// ============================================================================

/**
 * Helper to wait for a specified amount of time in tests
 */
export const waitFor = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Generate a random string for testing
 */
export const randomString = (length: number = 10): string =>
  Math.random()
    .toString(36)
    .substring(2, length + 2);

/**
 * Generate a random email for testing
 */
export const randomEmail = (): string => `test${randomString(8)}@example.com`;

/**
 * Generate a random future date for testing
 */
export const randomFutureDate = (daysFromNow: number = 7): string => {
  const date = new Date();
  date.setDate(date.getDate() + Math.floor(Math.random() * daysFromNow) + 1);
  return date.toISOString();
};

/**
 * Create a deep clone of an object for testing
 */
export const deepClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));
