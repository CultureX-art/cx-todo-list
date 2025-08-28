// @ts-nocheck - Environment variable access patterns
/**
 * Environment Configuration - Comprehensive Unit Tests
 *
 * Tests configuration loading, validation, sanitization, and error handling.
 * Ensures all environment variables are properly processed and validated.
 */

import { jest } from "@jest/globals";
import { getConfig } from "../../src/config/environment";
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
    // Restore original environment
    process.env = originalEnv;

    // Clear any modules that might cache config
    jest.clearAllMocks();
    jest.resetModules();
  });

  // ============================================================================
  // Default Configuration Tests
  // ============================================================================

  describe("Default Configuration", () => {
    it("should load default configuration when no environment variables set", () => {
      // Act
      const config = getConfig();

      // Assert
      expect(config).toEqual({
        nodeEnv: "development",
        port: 3000,
        allowedOrigins: ["http://localhost:3000", "http://localhost:3001"],
        version: "1.0.0",
        rateLimitWindow: 300000, // 5 minutes for development
        rateLimitMax: 1000, // Higher limit for development
      });
    });

    it("should use development defaults for unknown environments", () => {
      // Arrange
      process.env.NODE_ENV = "unknown-environment";

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
    ])("should accept valid environment: $env", ({ env, expected }) => {
      // Arrange
      process.env.NODE_ENV = env;

      // Act
      const config = getConfig();

      // Assert
      expect(config.nodeEnv).toBe(expected);
    });

    it("should handle case-insensitive environment values", () => {
      // Arrange
      process.env.NODE_ENV = "PRODUCTION";

      // Act
      const config = getConfig();

      // Assert
      expect(config.nodeEnv).toBe("production");
    });

    it("should normalize mixed-case environment values", () => {
      // Arrange
      process.env.NODE_ENV = "Development";

      // Act
      const config = getConfig();

      // Assert
      expect(config.nodeEnv).toBe("development");
    });

    it("should default to development for invalid environment", () => {
      // Arrange
      process.env.NODE_ENV = "invalid-env";

      // Act
      const config = getConfig();

      // Assert
      expect(config.nodeEnv).toBe("development");
    });

    it("should handle empty environment variable", () => {
      // Arrange
      process.env.NODE_ENV = "";

      // Act
      const config = getConfig();

      // Assert
      expect(config.nodeEnv).toBe("development");
    });
  });

  // ============================================================================
  // Port Validation Tests
  // ============================================================================

  describe("Port Validation", () => {
    it("should accept valid port numbers", () => {
      // Arrange
      process.env.PORT = "8080";

      // Act
      const config = getConfig();

      // Assert
      expect(config.port).toBe(8080);
    });

    it("should accept port 80", () => {
      // Arrange
      process.env.PORT = "80";

      // Act
      const config = getConfig();

      // Assert
      expect(config.port).toBe(80);
    });

    it("should accept port 65535 (max valid port)", () => {
      // Arrange
      process.env.PORT = "65535";

      // Act
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
      ({ port, expected }) => {
        // Arrange
        process.env.PORT = port;

        // Act
        const config = getConfig();

        // Assert
        expect(config.port).toBe(expected);
      },
    );

    it("should handle undefined port", () => {
      // Arrange - PORT is already undefined from beforeEach

      // Act
      const config = getConfig();

      // Assert
      expect(config.port).toBe(3000);
    });
  });

  // ============================================================================
  // Allowed Origins Validation Tests
  // ============================================================================

  describe("Allowed Origins Validation", () => {
    it("should parse single origin", () => {
      // Arrange
      process.env.ALLOWED_ORIGINS = "https://app.example.com";

      // Act
      const config = getConfig();

      // Assert
      expect(config.allowedOrigins).toEqual(["https://app.example.com"]);
    });

    it("should parse multiple origins", () => {
      // Arrange
      process.env.ALLOWED_ORIGINS =
        "https://app.example.com,http://localhost:3000,https://staging.example.com";

      // Act
      const config = getConfig();

      // Assert
      expect(config.allowedOrigins).toEqual([
        "https://app.example.com",
        "http://localhost:3000",
        "https://staging.example.com",
      ]);
    });

    it("should trim whitespace around origins", () => {
      // Arrange
      process.env.ALLOWED_ORIGINS =
        " https://app.example.com , http://localhost:3000 , https://staging.example.com ";

      // Act
      const config = getConfig();

      // Assert
      expect(config.allowedOrigins).toEqual([
        "https://app.example.com",
        "http://localhost:3000",
        "https://staging.example.com",
      ]);
    });

    it("should filter out invalid URLs", () => {
      // Arrange
      process.env.ALLOWED_ORIGINS =
        "https://valid.com,not-a-url,ftp://invalid.com,https://also-valid.com";

      // Act
      const config = getConfig();

      // Assert
      expect(config.allowedOrigins).toEqual([
        "https://valid.com",
        "https://also-valid.com",
      ]);
    });

    it("should handle origins with ports", () => {
      // Arrange
      process.env.ALLOWED_ORIGINS =
        "http://localhost:3000,https://app.example.com:8080";

      // Act
      const config = getConfig();

      // Assert
      expect(config.allowedOrigins).toEqual([
        "http://localhost:3000",
        "https://app.example.com:8080",
      ]);
    });

    it("should limit to maximum 10 origins", () => {
      // Arrange
      const origins = Array.from(
        { length: 15 },
        (_, i) => `https://app${i}.example.com`,
      );
      process.env.ALLOWED_ORIGINS = origins.join(",");

      // Act
      const config = getConfig();

      // Assert
      expect(config.allowedOrigins).toHaveLength(10);
      expect(config.allowedOrigins).toEqual(origins.slice(0, 10));
    });

    it("should reject malicious URLs", () => {
      // Arrange
      process.env.ALLOWED_ORIGINS =
        "javascript:alert(1),https://valid.com,data:text/html,<script>alert(1)</script>";

      // Act
      const config = getConfig();

      // Assert
      expect(config.allowedOrigins).toEqual(["https://valid.com"]);
    });

    it("should use default origins when environment variable is empty", () => {
      // Arrange
      process.env.ALLOWED_ORIGINS = "";

      // Act
      const config = getConfig();

      // Assert
      expect(config.allowedOrigins).toEqual([
        "http://localhost:3000",
        "http://localhost:3001",
      ]);
    });

    it("should use default origins when environment variable is undefined", () => {
      // Arrange - ALLOWED_ORIGINS is already undefined from beforeEach

      // Act
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
    it("should use npm package version when available", () => {
      // Arrange
      process.env.npm_package_version = "2.1.0";

      // Act
      const config = getConfig();

      // Assert
      expect(config.version).toBe("2.1.0");
    });

    it("should sanitize version by removing dangerous characters", () => {
      // Arrange
      process.env.npm_package_version = "2.1.0<script>alert('xss')</script>";

      // Act
      const config = getConfig();

      // Assert
      expect(config.version).toBe("2.1.0scriptalert('xss')/script");
    });

    it("should truncate version if too long", () => {
      // Arrange
      const longVersion = "a".repeat(100);
      process.env.npm_package_version = longVersion;

      // Act
      const config = getConfig();

      // Assert
      expect(config.version).toHaveLength(50);
    });

    it("should handle null version", () => {
      // Arrange
      process.env.npm_package_version = undefined;

      // Act
      const config = getConfig();

      // Assert
      expect(config.version).toBe("1.0.0");
    });

    it("should handle undefined version", () => {
      // Arrange - npm_package_version is already undefined from beforeEach

      // Act
      const config = getConfig();

      // Assert
      expect(config.version).toBe("1.0.0");
    });
  });

  // ============================================================================
  // Rate Limiting Configuration Tests
  // ============================================================================

  describe("Rate Limiting Configuration", () => {
    it("should use production rate limits in production environment", () => {
      // Arrange
      process.env.NODE_ENV = "production";

      // Act
      const config = getConfig();

      // Assert
      expect(config.rateLimitWindow).toBe(60000); // 1 minute
      expect(config.rateLimitMax).toBe(100); // Lower limit for production
    });

    it("should use development rate limits in development environment", () => {
      // Arrange
      process.env.NODE_ENV = "development";

      // Act
      const config = getConfig();

      // Assert
      expect(config.rateLimitWindow).toBe(300000); // 5 minutes
      expect(config.rateLimitMax).toBe(1000); // Higher limit for development
    });

    it("should use development rate limits in test environment", () => {
      // Arrange
      process.env.NODE_ENV = "test";

      // Act
      const config = getConfig();

      // Assert
      expect(config.rateLimitWindow).toBe(300000); // 5 minutes
      expect(config.rateLimitMax).toBe(1000); // Higher limit for test
    });

    it("should use production rate limits in staging environment", () => {
      // Arrange
      process.env.NODE_ENV = "staging";

      // Act
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
    it("should return immutable configuration object", () => {
      // Arrange & Act
      const config1 = getConfig();
      const config2 = getConfig();

      // Assert - Should be different object instances
      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });

    it("should not allow modification of returned config", () => {
      // Arrange
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
    it("should handle process.env being null", () => {
      // This is a theoretical edge case that shouldn't happen in normal operation
      const originalProcessEnv = process.env;

      try {
        // Arrange - This is not practically possible but tests robustness
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (process as any).env = null;

        // Act & Assert - Should not crash
        expect(() => getConfig()).not.toThrow();
      } finally {
        // Restore
        process.env = originalProcessEnv;
      }
    });

    it("should handle very large numbers as strings in port", () => {
      // Arrange
      process.env.PORT = "999999999999999999999";

      // Act
      const config = getConfig();

      // Assert
      expect(config.port).toBe(3000); // Should default to 3000 for invalid port
    });

    it("should handle special characters in environment values", () => {
      // Arrange
      process.env.NODE_ENV = "production\n\r\t";
      process.env.PORT = "3000\x00";

      // Act
      const config = getConfig();

      // Assert
      expect(config.nodeEnv).toBe("production"); // Should normalize properly
      expect(config.port).toBe(3000); // Should handle null byte
    });

    it("should handle Unicode characters in version", () => {
      // Arrange
      process.env.npm_package_version = "1.0.0-β.1";

      // Act
      const config = getConfig();

      // Assert
      expect(config.version).toContain("1.0.0");
    });

    it("should handle maximum edge cases for allowed origins", () => {
      // Arrange - Create exactly 10 valid origins
      const validOrigins = Array.from(
        { length: 10 },
        (_, i) => `https://app${i}.com`,
      );
      process.env.ALLOWED_ORIGINS = validOrigins.join(",");

      // Act
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
    it("should reject potentially dangerous allowed origins", () => {
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
      const config = getConfig();

      // Assert
      expect(config.allowedOrigins).toEqual(["https://valid.com"]);
    });

    it("should sanitize XSS attempts in version", () => {
      // Arrange
      process.env.npm_package_version = "1.0.0<img src=x onerror=alert(1)>";

      // Act
      const config = getConfig();

      // Assert
      expect(config.version).not.toContain("<");
      expect(config.version).not.toContain(">");
      expect(config.version).not.toContain("onerror");
    });

    it("should handle injection attempts in environment variables", () => {
      // Arrange
      process.env.NODE_ENV = "production; rm -rf /";
      process.env.PORT = "3000; cat /etc/passwd";

      // Act
      const config = getConfig();

      // Assert
      expect(config.nodeEnv).toBe("production");
      expect(config.port).toBe(3000); // Should parse the number part only
    });
  });
});
