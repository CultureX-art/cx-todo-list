export default {
  projects: [
    {
      displayName: "unit",
      testMatch: ["<rootDir>/tests/unit/**/*.test.ts"],
      testEnvironment: "node",
      transform: { "^.+\\.(ts|tsx)$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.json" }] }
    },
    {
      displayName: "integration",
      testMatch: ["<rootDir>/tests/integration/**/*.test.ts"],
      testEnvironment: "node",
      transform: { "^.+\\.(ts|tsx)$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.json" }] }
    }
  ],
  collectCoverageFrom: ["src/**/*.ts"],
  coverageReporters: ["text", "lcov"],
  coverageThreshold: {
    "global": { "branches": 0, "functions": 0, "lines": 0, "statements": 0 },
    "./src/**": { "branches": 90, "lines": 90, "functions": 90, "statements": 90 }
  }
}
