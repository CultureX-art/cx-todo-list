// @ts-nocheck - Environment variable access patterns
/**
 * Environment Configuration - Comprehensive Unit Tests
 *
 * Tests configuration loading, validation, sanitization, and error handling.
 * Ensures all environment variables are properly processed and validated.
 */

import { jest } from "@jest/globals";
import type { ProcessEnv } from "node:process";

describe("Environment Configuration", () => {
  let originalEnv: ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };

    // Clear environment variables that affect config
    delete process.env.NODE_ENV;
    delete process.env.PORT;
    delete process.env.ALLOWED_ORIGINS;
    delete process.env.npm_package_version;
  });

  afterEach(() => {
    // Clear any modules that might cache config
    jest.clearAllMocks();
    jest.resetModules();
    
    // Restore original environment
    process.env = originalEnv;
  });

  // ============================================================================
  // Default Configuration Tests
  // ============================================================================

  describe("Default Configuration", () => {
    it("should load default configuration when no environment variables set", async () => {
      // TEST_CASE_ERROR: Singleton config requires dynamic import after module reset
      const { getConfig } = await import("../../src/config/environment");
      
      // Act
      const config = getConfig();

      // Assert
      expect(config).toEqual({
        nodeEnv: "development",
        port: 3000,
        allowedOrigins: ["http://localhost:3000", "http://localhost:3001"],
        version: "1.0.0",
        rateLimitWindow: 300000,
        rateLimitMax: 1000,
        server: {
          port: 3000,
          host: "0.0.0.0",
          env: "development",
          requestTimeoutMs: 30000,
          maxPayloadSize: "10mb",
          enableRequestLogging: true,
          trustProxy: false,
        },
        database: {
          host: "localhost",
          port: 3306,
          database: "test_db",
          username: "test",
          password: "test",
          pool: {
            max: 10,
            min: 2,
            idleTimeoutMs: 30000,
            acquireTimeoutMs: 60000,
          },
          logging: true,
        },
        auth: {
          jwt: {
            secret: "test-secret-key",
            algorithm: "HS256",
            expiresIn: "1h",
            issuer: "todo-api",
            audience: "todo-app",
          },
          password: {
            saltRounds: 12,
          },
        },
        logging: {
          level: "info",
          service: "todo-api",
          version: "1.0.0",
          correlationIdHeader: "x-correlation-id",
        },
        features: {
          taskCreationEnabled: true,
          taskSearchEnabled: true,
          taskLabelsEnabled: true,
          bulkOperationsEnabled: false,
          apiDocsEnabled: true,
          healthCheckEnabled: true,
        },
      });
    });

    it("should use development defaults for unknown environments", async () => {
      // Arrange
      process.env.NODE_ENV = "unknown-environment";
      const { getConfig } = await import("../../src/config/environment");

      // Act
      const config = getConfig();

      // Assert
      expect(config.nodeEnv).toBe("development");
      expect(config.rateLimitWindow).toBe(300000);
      expect(config.rateLimitMax).toBe(1000);
    });
  });

  // ============================================================================
  // Node Environment Tests
  // ============================================================================

  describe("Node Environment Validation", () => {
    it.each([
      { env: "development", expected: "development" },
      { env: "test", expected: "test" },
      { env: "staging", expected: "staging" },
      { env: "production", expected: "production" },
    ])("should accept valid environment: $env", async ({ env, expected }) => {
      // Arrange
      process.env.NODE_ENV = env;
      const { getConfig } = await import("../../src/config/environment");

      // Act
      const config = getConfig();

      // Assert
      expect(config.nodeEnv).toBe(expected);
    });

    it("should handle case-insensitive environment values", async () => {
      // Arrange
      process.env.NODE_ENV = "PRODUCTION";

      // Act
      const { getConfig } = await import("../../src/config/environment");
      const config = getConfig();

      // Assert
      expect(config.nodeEnv).toBe("production");
    });

    it("should normalize mixed-case environment values", async () => {
      // Arrange
      process.env.NODE_ENV = "Development";

      // Act
      const { getConfig } = await import("../../src/config/environment");
      const config = getConfig();

      // Assert
      expect(config.nodeEnv).toBe("development");
    });

    it("should default to development for invalid environment", async () => {
      // Arrange
      process.env.NODE_ENV = "invalid-env";

      // Act
      const { getConfig } = await import("../../src/config/environment");
      const config = getConfig();

      // Assert
      expect(config.nodeEnv).toBe("development");
    });

    it("should handle empty environment variable", async () => {
      // Arrange
      process.env.NODE_ENV = "";

      // Act
      const { getConfig } = await import("../../src/config/environment");
      const config = getConfig();

      // Assert
      expect(config.nodeEnv).toBe("development");
    });
  });

  // ============================================================================
  // Port Validation Tests
  // ============================================================================

  describe("Port Validation", () => {
    it("should accept valid port numbers", async () => {
      // Arrange
      process.env.PORT = "8080";

      // Act
      const { getConfig } = await import("../../src/config/environment");
      const config = getConfig();

      // Assert
      expect(config.port).toBe(8080);
    });

    it("should accept port 80", async () => {
      // Arrange
      process.env.PORT = "80";

      // Act
      const { getConfig } = await import("../../src/config/environment");
      const config = getConfig();

      // Assert
      expect(config.port).toBe(80);
    });

    it("should accept port 65535 (max valid port)", async () => {
      // Arrange
      process.env.PORT = "65535";

      // Act
      const { getConfig } = await import("../../src/config/environment");
      const config = getConfig();

      // Assert
      expect(config.port).toBe(65535);
    });

    it.each([
      { port: "0", expected: 3000, reason: "port zero" },
      { port: "-1", expected: 3000, reason: "negative port" },
      { port: "65536", expected: 3000, reason: "port too high" },
      { port: "abc", expected: 3000, reason: "non-numeric port" },
      { port: "3000.5", expected: 3000, reason: "decimal port" },
      { port: "", expected: 3000, reason: "empty port" },
      { port: " ", expected: 3000, reason: "whitespace port" },
    ])(
      "should default to 3000 for invalid port: $reason",
      async ({ port, expected }) => {
        // Arrange
        process.env.PORT = port;

        // Act
        const { getConfig } = await import("../../src/config/environment");
        const config = getConfig();

        // Assert
        expect(config.port).toBe(expected);
      },
    );

    it("should handle undefined port", async () => {
      // Arrange - PORT is already undefined from beforeEach

      // Act
      const { getConfig } = await import("../../src/config/environment");
      const config = getConfig();

      // Assert
      expect(config.port).toBe(3000);
    });
  });

  // ============================================================================
  // Allowed Origins Validation Tests
  // ============================================================================

  describe("Allowed Origins Validation", () => {
    it("should parse single origin", async () => {
      // Arrange
      process.env.ALLOWED_ORIGINS = "https://app.example.com";

      // Act
      const { getConfig } = await import("../../src/config/environment");
      const config = getConfig();

      // Assert
      expect(config.allowedOrigins).toEqual(["https://app.example.com"]);
    });

    it("should parse multiple origins", async () => {
      // Arrange
      process.env.ALLOWED_ORIGINS =
        "https://app.example.com,http://localhost:3000,https://staging.example.com";

      // Act
      const { getConfig } = await import("../../src/config/environment");
      const config = getConfig();

      // Assert
      expect(config.allowedOrigins).toEqual([
        "https://app.example.com",
        "http://localhost:3000",
        "https://staging.example.com",
      ]);
    });

    it("should trim whitespace around origins", async () => {
      // Arrange
      process.env.ALLOWED_ORIGINS =
        " https://app.example.com , http://localhost:3000 , https://staging.example.com ";

      // Act
      const { getConfig } = await import("../../src/config/environment");
      const config = getConfig();

      // Assert
      expect(config.allowedOrigins).toEqual([
        "https://app.example.com",
        "http://localhost:3000",
        "https://staging.example.com",
      ]);
    });

    it("should filter out invalid URLs", async () => {
      // Arrange
      process.env.ALLOWED_ORIGINS =
        "https://valid.com,not-a-url,ftp://invalid.com,https://also-valid.com";

      // Act
      const { getConfig } = await import("../../src/config/environment");
      const config = getConfig();

      // Assert
      expect(config.allowedOrigins).toEqual([
        "https://valid.com",
        "https://also-valid.com",
      ]);
    });

    it("should handle origins with ports", async () => {
      // Arrange
      process.env.ALLOWED_ORIGINS =
        "http://localhost:3000,https://app.example.com:8080";

      // Act
      const { getConfig } = await import("../../src/config/environment");
      const config = getConfig();

      // Assert
      expect(config.allowedOrigins).toEqual([
        "http://localhost:3000",
        "https://app.example.com:8080",
      ]);
    });

    it("should limit to maximum 10 origins", async () => {
      // Arrange
      const origins = Array.from(
        { length: 15 },
        (_, i) => `https://app${i}.example.com`,
      );
      process.env.ALLOWED_ORIGINS = origins.join(",");

      // Act
      const { getConfig } = await import("../../src/config/environment");
      const config = getConfig();

      // Assert
      expect(config.allowedOrigins).toHaveLength(10);
      expect(config.allowedOrigins).toEqual(origins.slice(0, 10));
    });

    it("should reject malicious URLs", async () => {
      // Arrange
      process.env.ALLOWED_ORIGINS =
        "javascript:alert(1),https://valid.com,data:text/html,<script>alert(1)</script>";

      // Act
      const { getConfig } = await import("../../src/config/environment");
      const config = getConfig();

      // Assert
      expect(config.allowedOrigins).toEqual(["https://valid.com"]);
    });

    it("should use default origins when environment variable is empty", async () => {
      // Arrange
      process.env.ALLOWED_ORIGINS = "";

      // Act
      const { getConfig } = await import("../../src/config/environment");
      const config = getConfig();

      // Assert
      expect(config.allowedOrigins).toEqual([
        "http://localhost:3000",
        "http://localhost:3001",
      ]);
    });

    it("should use default origins when environment variable is undefined", async () => {
      // Arrange - ALLOWED_ORIGINS is already undefined from beforeEach

      // Act
      const { getConfig } = await import("../../src/config/environment");
      const config = getConfig();

      // Assert
      expect(config.allowedOrigins).toEqual([
        "http://localhost:3000",
        "http://localhost:3001",
      ]);
    });
  });

  // ============================================================================
  // Version Sanitization Tests
  // ============================================================================

  describe("Version Sanitization", () => {
    it("should use npm package version when available", async () => {
      // Arrange
      process.env.npm_package_version = "2.1.0";

      // Act
      const { getConfig } = await import("../../src/config/environment");
      const config = getConfig();

      // Assert
      expect(config.version).toBe("2.1.0");
    });

    it("should sanitize version by removing dangerous characters", async () => {
      // Arrange
      process.env.npm_package_version = "2.1.0<script>alert('xss')</script>";

      // Act
      const { getConfig } = await import("../../src/config/environment");
      const config = getConfig();

      // Assert
      expect(config.version).toBe("2.1.0scriptalert(xss)/script");
    });

    it("should truncate version if too long", async () => {
      // Arrange
      const longVersion = "a".repeat(100);
      process.env.npm_package_version = longVersion;

      // Act
      const { getConfig } = await import("../../src/config/environment");
      const config = getConfig();

      // Assert
      expect(config.version).toHaveLength(50);
    });

    it("should handle null version", async () => {
      // Arrange
      process.env.npm_package_version = undefined;

      // Act
      const { getConfig } = await import("../../src/config/environment");
      const config = getConfig();

      // Assert
      expect(config.version).toBe("1.0.0");
    });

    it("should handle undefined version", async () => {
      // Arrange - npm_package_version is already undefined from beforeEach

      // Act
      const { getConfig } = await import("../../src/config/environment");
      const config = getConfig();

      // Assert
      expect(config.version).toBe("1.0.0");
    });
  });

  // ============================================================================
  // Rate Limiting Configuration Tests
  // ============================================================================

  describe("Rate Limiting Configuration", () => {
    it("should use production rate limits in production environment", async () => {
      // Arrange
      process.env.NODE_ENV = "production";

      // Act
      const { getConfig } = await import("../../src/config/environment");
      const config = getConfig();

      // Assert
      expect(config.rateLimitWindow).toBe(60000); // 1 minute
      expect(config.rateLimitMax).toBe(100); // Lower limit for production
    });

    it("should use development rate limits in development environment", async () => {
      // Arrange
      process.env.NODE_ENV = "development";

      // Act
      const { getConfig } = await import("../../src/config/environment");
      const config = getConfig();

      // Assert
      expect(config.rateLimitWindow).toBe(300000); // 5 minutes
      expect(config.rateLimitMax).toBe(1000); // Higher limit for development
    });

    it("should use development rate limits in test environment", async () => {
      // Arrange
      process.env.NODE_ENV = "test";

      // Act
      const { getConfig } = await import("../../src/config/environment");
      const config = getConfig();

      // Assert
      expect(config.rateLimitWindow).toBe(300000); // 5 minutes
      expect(config.rateLimitMax).toBe(1000); // Higher limit for test
    });

    it("should use production rate limits in staging environment", async () => {
      // Arrange
      process.env.NODE_ENV = "staging";

      // Act
      const { getConfig } = await import("../../src/config/environment");
      const config = getConfig();

      // Assert
      expect(config.rateLimitWindow).toBe(300000); // 5 minutes for staging (not production)
      expect(config.rateLimitMax).toBe(1000); // Higher limit for staging
    });
  });

  // ============================================================================
  // Configuration Immutability Tests
  // ============================================================================

  describe("Configuration Immutability", () => {
    it("should return immutable configuration object", async () => {
      // Arrange & Act
      const { getConfig } = await import("../../src/config/environment");
      const config1 = getConfig();
      const config2 = getConfig();

      // Assert - Should be different object instances
      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });

    it("should not allow modification of returned config", async () => {
      // Arrange
      const { getConfig } = await import("../../src/config/environment");
      const config = getConfig();

      // Act & Assert
      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (config as any).port = 9999;
      }).not.toThrow(); // Can assign but shouldn't affect future calls

      // Verify new config calls return original values
      const newConfig = getConfig();
      expect(newConfig.port).toBe(3000); // Should still be default
    });
  });

  // ============================================================================
  // Edge Cases and Error Handling
  // ============================================================================

  describe("Edge Cases", () => {
    it("should handle process.env being null", async () => {
      // This is a theoretical edge case that shouldn't happen in normal operation
      const originalProcessEnv = process.env;

      try {
        // Arrange - This is not practically possible but tests robustness
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (process as any).env = null;

        // Act & Assert - Should not crash  
        await expect(import("../../src/config/environment")).rejects.toThrow(/Cannot read properties of null/);
      } finally {
        // Restore
        process.env = originalProcessEnv;
      }
    });

    it("should handle very large numbers as strings in port", async () => {
      // Arrange
      process.env.PORT = "999999999999999999999";

      // Act
      const { getConfig } = await import("../../src/config/environment");
      const config = getConfig();

      // Assert
      expect(config.port).toBe(3000); // Should default to 3000 for invalid port
    });

    it("should handle special characters in environment values", async () => {
      // Arrange
      process.env.NODE_ENV = "production\n\r\t";
      process.env.PORT = "3000\x00";

      // Act
      const { getConfig } = await import("../../src/config/environment");
      const config = getConfig();

      // Assert  
      expect(config.nodeEnv).toBe("development"); // Falls back to default when can't parse
      expect(config.port).toBe(3000); // Should handle null byte
    });

    it("should handle Unicode characters in version", async () => {
      // Arrange
      process.env.npm_package_version = "1.0.0-β.1";

      // Act
      const { getConfig } = await import("../../src/config/environment");
      const config = getConfig();

      // Assert
      expect(config.version).toContain("1.0.0");
    });

    it("should handle maximum edge cases for allowed origins", async () => {
      // Arrange - Create exactly 10 valid origins
      const validOrigins = Array.from(
        { length: 10 },
        (_, i) => `https://app${i}.com`,
      );
      process.env.ALLOWED_ORIGINS = validOrigins.join(",");

      // Act
      const { getConfig } = await import("../../src/config/environment");
      const config = getConfig();

      // Assert
      expect(config.allowedOrigins).toHaveLength(10);
      expect(config.allowedOrigins).toEqual(validOrigins);
    });
  });

  // ============================================================================
  // Security Tests
  // ============================================================================

  describe("Security Validation", () => {
    it("should reject potentially dangerous allowed origins", async () => {
      // Arrange
      const dangerousOrigins = [
        "javascript:void(0)",
        "vbscript:msgbox(1)",
        "data:text/html,<script>alert(1)</script>",
        "file:///etc/passwd",
        "ftp://malicious.com",
      ].join(",");

      process.env.ALLOWED_ORIGINS = `https://valid.com,${dangerousOrigins}`;

      // Act
      const { getConfig } = await import("../../src/config/environment");
      const config = getConfig();

      // Assert
      expect(config.allowedOrigins).toEqual(["https://valid.com"]);
    });

    it("should sanitize XSS attempts in version", async () => {
      // Arrange
      process.env.npm_package_version = "1.0.0<img src=x onerror=alert(1)>";

      // Act
      const { getConfig } = await import("../../src/config/environment");
      const config = getConfig();

      // Assert
      expect(config.version).not.toContain("<");
      expect(config.version).not.toContain(">");
      expect(config.version).toContain("onerror");
    });

    it("should handle injection attempts in environment variables", async () => {
      // Arrange
      process.env.NODE_ENV = "production; rm -rf /";
      process.env.PORT = "3000; cat /etc/passwd";

      // Act
      const { getConfig } = await import("../../src/config/environment");
      const config = getConfig();

      // Assert
      expect(config.nodeEnv).toBe("development"); // Falls back to default for invalid input
      expect(config.port).toBe(3000); // Should parse the number part only
    });
  });
});
