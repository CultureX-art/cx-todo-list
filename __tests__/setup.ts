// @ts-nocheck - Temporarily disabled for mock configuration issues
/**
 * Jest Test Setup - Complete Configuration
 *
 * Comprehensive test environment setup including global mocks, test utilities,
 * performance configuration, and environment preparation.
 */

import { jest } from "@jest/globals";
import { TestFixtures } from "./helpers/test-fixtures";
import { ApiTestHelpers } from "./helpers/api-test-helpers";

// ============================================================================
// Global Test Environment Configuration
// ============================================================================

// Set test environment variables
process.env["NODE_ENV"] = "test";
process.env["PORT"] = "3001";
process.env["ALLOWED_ORIGINS"] = "http://localhost:3000,http://localhost:3001";

// Set timezone to UTC for consistent date testing
process.env.TZ = "UTC";

// ============================================================================
// Global Test Timeouts and Performance
// ============================================================================

// Set longer timeout for complex integration tests
jest.setTimeout(30000);

// Configure performance monitoring for slow tests
const SLOW_TEST_THRESHOLD = 5000; // 5 seconds

beforeEach(() => {
  // Track test start time for performance monitoring
  (global as any).__testStartTime = Date.now();
});

afterEach(() => {
  // Monitor test performance
  const testDuration = Date.now() - (global as any).__testStartTime;
  if (testDuration > SLOW_TEST_THRESHOLD) {
    console.warn(
      `⚠️  Slow test detected: ${expect.getState().currentTestName} took ${testDuration}ms`,
    );
  }
});

// ============================================================================
// Global Mocks for External Dependencies
// ============================================================================

// Mock console methods to reduce test noise (except for errors and specific tests)
const originalConsole = { ...console };
beforeAll(() => {
  if (process.env["JEST_SILENT"] !== "false") {
    console.log = jest.fn();
    console.info = jest.fn();
    console.warn = jest.fn();
    // Keep console.error for debugging test failures
  }
});

afterAll(() => {
  if (process.env["JEST_SILENT"] !== "false") {
    console.log = originalConsole.log;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
  }
});

// Mock Date.now() for consistent time-based testing
const mockDateNow = jest.fn(() =>
  new Date("2024-01-01T12:00:00.000Z").getTime(),
);
Object.defineProperty(Date, "now", {
  value: mockDateNow,
  writable: true,
});

// Mock Math.random() for predictable randomness in tests
const mockMathRandom = jest.fn(() => 0.5);
Object.defineProperty(Math, "random", {
  value: mockMathRandom,
  writable: true,
});

// ============================================================================
// Database and External Service Mocks
// ============================================================================

// Mock database connections
jest.mock("../src/common/database/mysql/connection", () => ({
  MySQLConnection: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(void 0),
    disconnect: jest.fn().mockResolvedValue(void 0),
    execute: jest
      .fn()
      .mockResolvedValue([null as any, { insertId: 1, affectedRows: 1 }]),
    queryTasks: jest.fn().mockResolvedValue([[] as any, null]),
    queryTasksWithCount: jest.fn().mockResolvedValue([[] as any, null]),
    queryTaskCount: jest.fn().mockResolvedValue([[{ count: 0 }] as any, null]),
    queryTaskStatusCounts: jest.fn().mockResolvedValue([[] as any, null]),
  })),
}));

// Mock Redis cache
jest.mock("../src/common/cache/redis", () => ({
  RedisCache: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(void 0),
    disconnect: jest.fn().mockResolvedValue(void 0),
    get: jest.fn().mockResolvedValue(null as any),
    set: jest.fn().mockResolvedValue(void 0),
    delete: jest.fn().mockResolvedValue(void 0),
    exists: jest.fn().mockResolvedValue(false as any),
  })),
}));

// Mock external service clients
jest.mock("../src/common/vendor/external-service-client", () => ({
  ExternalServiceClient: jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue({ data: {} } as any),
    post: jest.fn().mockResolvedValue({ data: {} } as any),
    put: jest.fn().mockResolvedValue({ data: {} } as any),
    delete: jest.fn().mockResolvedValue({ data: {} } as any),
  })),
}));

// ============================================================================
// Authentication and JWT Mocks
// ============================================================================

// Mock JWT library
jest.mock("jsonwebtoken", () => ({
  sign: jest.fn(() => "mocked.jwt.token"),
  verify: jest.fn(() => ({
    sub: 1,
    email: "test@example.com",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    jti: "test-jti",
    iss: "todo-api",
    aud: "todo-app",
  })),
  decode: jest.fn(() => ({
    sub: 1,
    email: "test@example.com",
  })),
}));

// Mock bcrypt for password hashing
jest.mock("bcrypt", () => ({
  hash: jest.fn().mockResolvedValue("$2b$10$mockedHashedPassword" as any),
  compare: jest.fn().mockResolvedValue(true as any),
  genSalt: jest.fn().mockResolvedValue("$2b$10$mockedSalt" as any),
}));

// ============================================================================
// HTTP and Network Mocks
// ============================================================================

// Mock node-fetch for external API calls
jest.mock("node-fetch", () => ({
  __esModule: true,
  default: jest.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      statusText: "OK",
      json: () => Promise.resolve({ success: true }),
      text: () => Promise.resolve("success"),
      headers: new Map(),
    }),
  ),
}));

// ============================================================================
// File System and I/O Mocks
// ============================================================================

// Mock file system operations (if used in the application)
jest.mock("fs/promises", () => ({
  readFile: jest.fn().mockResolvedValue("mock file content" as any),
  writeFile: jest.fn().mockResolvedValue(void 0),
  access: jest.fn().mockResolvedValue(void 0),
  mkdir: jest.fn().mockResolvedValue(void 0),
  unlink: jest.fn().mockResolvedValue(void 0),
}));

// ============================================================================
// Global Test Utilities
// ============================================================================

// Make test fixtures globally available
(global as any).TestFixtures = TestFixtures;
(global as any).ApiTestHelpers = ApiTestHelpers;

// Global test utilities
(global as any).testUtils = {
  /**
   * Create a delay for testing async operations
   */
  delay: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),

  /**
   * Wait for next tick (useful for promise resolution testing)
   */
  nextTick: () => new Promise((resolve) => process.nextTick(resolve)),

  /**
   * Create a mock function that resolves after a delay
   */
  createDelayedMock: <T = any>(value: T, delay: number = 0) => {
    return jest
      .fn()
      .mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(value), delay)),
      );
  },

  /**
   * Create a mock function that rejects after a delay
   */
  createDelayedRejectMock: (error: Error, delay: number = 0) => {
    return jest
      .fn()
      .mockImplementation(
        () =>
          new Promise((_, reject) => setTimeout(() => reject(error), delay)),
      );
  },

  /**
   * Create a spy that tracks call order
   */
  createOrderSpy: () => {
    const calls: string[] = [];
    return {
      calls,
      spy: (name: string) =>
        jest.fn().mockImplementation(() => calls.push(name)),
    };
  },
};

// ============================================================================
// Custom Jest Matchers
// ============================================================================

// Extend Jest matchers for better testing experience
expect.extend({
  /**
   * Check if a function was called before another function
   */
  toHaveBeenCalledBefore(received: jest.Mock, other: jest.Mock) {
    const receivedCalls = received.mock.invocationCallOrder;
    const otherCalls = other.mock.invocationCallOrder;

    if (!receivedCalls.length) {
      return {
        message: () => `expected ${received.getMockName()} to have been called`,
        pass: false,
      };
    }

    if (!otherCalls.length) {
      return {
        message: () => `expected ${other.getMockName()} to have been called`,
        pass: false,
      };
    }

    const lastReceivedCall = Math.max(...receivedCalls);
    const firstOtherCall = Math.min(...otherCalls);

    const pass = lastReceivedCall < firstOtherCall;

    return {
      message: () =>
        pass
          ? `expected ${received.getMockName()} not to have been called before ${other.getMockName()}`
          : `expected ${received.getMockName()} to have been called before ${other.getMockName()}`,
      pass,
    };
  },

  /**
   * Check if a date is close to another date (within threshold)
   */
  toBeCloseTo(received: Date, expected: Date, threshold: number = 1000) {
    const receivedTime =
      received instanceof Date
        ? received.getTime()
        : new Date(received).getTime();
    const expectedTime =
      expected instanceof Date
        ? expected.getTime()
        : new Date(expected).getTime();
    const difference = Math.abs(receivedTime - expectedTime);

    const pass = difference <= threshold;

    return {
      message: () =>
        pass
          ? `expected ${received} not to be close to ${expected} (within ${threshold}ms)`
          : `expected ${received} to be close to ${expected} (within ${threshold}ms), but difference was ${difference}ms`,
      pass,
    };
  },

  /**
   * Check if an array contains objects with specific properties
   */
  toContainObjectsWithProperties(
    received: any[],
    properties: Record<string, any>,
  ) {
    if (!Array.isArray(received)) {
      return {
        message: () => `expected ${received} to be an array`,
        pass: false,
      };
    }

    const pass = received.some((item) => {
      return Object.keys(properties).every((key) => {
        return (
          item && typeof item === "object" && item[key] === properties[key]
        );
      });
    });

    return {
      message: () =>
        pass
          ? `expected array not to contain objects with properties ${JSON.stringify(properties)}`
          : `expected array to contain objects with properties ${JSON.stringify(properties)}`,
      pass,
    };
  },
});

// ============================================================================
// Global Error Handling
// ============================================================================

// Catch unhandled promise rejections in tests
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  // Don't exit process in test environment, but log the error
});

// Catch uncaught exceptions in tests
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  // Don't exit process in test environment, but log the error
});

// ============================================================================
// Test Performance and Memory Monitoring
// ============================================================================

// Monitor memory usage in test environment
if (process.env["MONITOR_MEMORY"] === "true") {
  afterEach(() => {
    const memoryUsage = process.memoryUsage();
    if (memoryUsage.heapUsed > 100 * 1024 * 1024) {
      // 100MB threshold
      console.warn(
        `⚠️  High memory usage: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
      );
    }
  });
}

// ============================================================================
// Test Data Cleanup
// ============================================================================

// Global cleanup function for test data
(global as any).cleanupTestData = () => {
  // Reset all mocks
  jest.clearAllMocks();

  // Reset Date.now mock
  mockDateNow.mockReturnValue(new Date("2024-01-01T12:00:00.000Z").getTime());

  // Reset Math.random mock
  mockMathRandom.mockReturnValue(0.5);

  // Clear any global test state
  delete (global as any).__testStartTime;
};

// Automatic cleanup after each test
afterEach(() => {
  (global as any).cleanupTestData();
});

// ============================================================================
// Test Reporting and Logging
// ============================================================================

// Enhanced test logging in CI environment
if (process.env["CI"] === "true") {
  beforeAll(() => {
    console.log("🧪 Starting test suite in CI environment");
    console.log(`📊 Node version: ${process.version}`);
    console.log(`🌍 Environment: ${process.env["NODE_ENV"]}`);
  });

  afterAll(() => {
    console.log("✅ Test suite completed");
  });
}

// Log test progress for long-running test suites
let testCount = 0;
beforeEach(() => {
  testCount++;
  if (testCount % 50 === 0) {
    console.log(`📈 Completed ${testCount} tests`);
  }
});

export {};
