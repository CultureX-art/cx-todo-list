/**
 * Jest Configuration for Integration Tests
 *
 * Separate configuration for integration tests that require database setup.
 */

export default {
  preset: "ts-jest/presets/default-esm",
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: "tsconfig.json",
      },
    ],
  },
  testEnvironment: "node",

  // Integration test specific settings
  testMatch: ["**/__tests__/integration/**/*.test.ts"],

  // Longer timeout for integration tests
  testTimeout: 30000,

  // Setup files
  setupFilesAfterEnv: ["<rootDir>/__tests__/integration/setup/jest.setup.ts"],

  // Coverage settings for integration tests
  collectCoverage: false, // Usually disabled for integration tests

  // Test sequencing
  maxWorkers: 1, // Run integration tests sequentially to avoid database conflicts

  // Globals for integration tests
  globals: {
    "ts-jest": {
      useESM: true,
    },
  },

  // Module resolution
  moduleFileExtensions: ["ts", "js", "json"],

  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,

  // Verbose output for integration tests
  verbose: true,

  // Display individual test results
  displayName: {
    name: "Integration Tests",
    color: "blue",
  },

  // Test result processor (optional)
  // testResultsProcessor: '<rootDir>/test-results-processor.js',

  // Custom test environment variables
  testEnvironmentOptions: {
    NODE_ENV: "test",
  },
};
