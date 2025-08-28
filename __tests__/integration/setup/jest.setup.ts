/**
 * Jest Setup for Integration Tests
 *
 * Global setup and teardown for integration test environment.
 */

import { jest } from "@jest/globals";

// Global test timeout for integration tests
jest.setTimeout(30000);

// Suppress console logs during tests unless debugging
if (process.env["DEBUG_TESTS"] === null || process.env["DEBUG_TESTS"] === "") {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  };
}

// Global error handler for unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  // eslint-disable-next-line no-console -- Error handlers need console output
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Global error handler for uncaught exceptions
process.on("uncaughtException", (error) => {
  // eslint-disable-next-line no-console -- Error handlers need console output
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

// Test environment validation
beforeAll(() => {
  // Ensure we're in test environment
  if (process.env["NODE_ENV"] !== "test") {
    throw new Error("Integration tests must be run with NODE_ENV=test");
  }

  // Validate required test environment variables
  const requiredEnvVars = [
    "TEST_DB_HOST",
    "TEST_DB_NAME",
    "TEST_DB_USER",
    "TEST_DB_PASSWORD",
  ];

  const missingVars = requiredEnvVars.filter(
    (varName) => process.env[varName] === null || process.env[varName] === "",
  );
  if (missingVars.length > 0) {
    // eslint-disable-next-line no-console -- Test setup warnings are needed
    console.warn(
      `Missing test environment variables: ${missingVars.join(", ")}`,
    );
    // eslint-disable-next-line no-console -- Test setup warnings are needed
    console.warn("Using default test database configuration...");
  }
});

// Global cleanup
afterAll(async () => {
  // Give time for async operations to complete
  await new Promise((resolve) => setTimeout(resolve, 100));
});
