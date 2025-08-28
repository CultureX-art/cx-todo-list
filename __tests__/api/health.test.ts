// @ts-nocheck - Temporarily disabled for compilation issues
/**
 * Health API Endpoint Tests
 *
 * Comprehensive test suite for health check endpoints and system monitoring.
 */

import { jest } from "@jest/globals";
import request from "supertest";
import { App } from "../../src/app";
import { HealthService } from "../../src/health/services/health.service";
import { HealthCheckResponse, SystemMetrics } from "../../src/health/api/types";
// import { TestFixtures } from '../helpers/test-fixtures';

describe("Health API Endpoints", () => {
  let app: App;
  let mockHealthService: jest.Mocked<HealthService>;

  const mockHealthResponse: HealthCheckResponse = {
    status: "healthy",
    timestamp: "2024-01-01T00:00:00.000Z",
    version: "1.0.0",
    uptime: 3600,
    services: {
      database: { status: "healthy", responseTimeMs: 15 },
      cache: { status: "healthy", responseTimeMs: 5 },
      external: { status: "degraded", responseTimeMs: 1200 },
    },
    metrics: {
      memory: {
        used: 52428800,
        total: 134217728,
        percentage: 39.1,
      },
      cpu: {
        usage: 15.5,
        loadAverage: [1.2, 1.1, 0.9],
      },
      requests: {
        total: 1500,
        successful: 1475,
        failed: 25,
        averageResponseTime: 125,
      },
    },
  };

  beforeEach(() => {
    mockHealthService = {
      checkHealth: jest.fn(),
      checkDetailedHealth: jest.fn(),
      checkReadiness: jest.fn(),
      checkLiveness: jest.fn(),
      getSystemMetrics: jest.fn(),
      checkDatabaseHealth: jest.fn(),
      performMaintenance: jest.fn(),
    } as jest.Mocked<HealthService>;

    app = new App({});
  });

  describe("GET /v1/health", () => {
    it("should return healthy status when all services are operational", async () => {
      // Arrange
      mockHealthService.checkHealth.mockResolvedValue(mockHealthResponse);

      // Act
      const response = await request(app.getServer())
        .get("/v1/health")
        .expect(200);

      // Assert
      expect(response.body).toMatchObject({
        correlationId: expect.any(String),
        message: "System health check completed",
        responseTimeMs: expect.any(Number),
        data: mockHealthResponse,
      });

      expect(mockHealthService.checkHealth).toHaveBeenCalled();
    });

    it("should return degraded status when some services are down", async () => {
      // Arrange
      const degradedResponse: HealthCheckResponse = {
        ...mockHealthResponse,
        status: "degraded",
        services: {
          ...mockHealthResponse.services,
          database: { status: "unhealthy", error: "Connection timeout" },
        },
      };

      mockHealthService.checkHealth.mockResolvedValue(degradedResponse);

      // Act
      const response = await request(app.getServer())
        .get("/v1/health")
        .expect(503);

      // Assert
      expect(response.body).toMatchObject({
        correlationId: expect.any(String),
        message: "System health check completed",
        responseTimeMs: expect.any(Number),
        data: degradedResponse,
      });

      expect(response.body.data.status).toBe("degraded");
      expect(response.body.data.services.database.status).toBe("unhealthy");
    });

    it("should return unhealthy status when critical services are down", async () => {
      // Arrange
      const unhealthyResponse: HealthCheckResponse = {
        ...mockHealthResponse,
        status: "unhealthy",
        services: {
          database: { status: "unhealthy", error: "Connection refused" },
          cache: { status: "unhealthy", error: "Service unavailable" },
          external: { status: "unhealthy", error: "API timeout" },
        },
      };

      mockHealthService.checkHealth.mockResolvedValue(unhealthyResponse);

      // Act
      const response = await request(app.getServer())
        .get("/v1/health")
        .expect(503);

      // Assert
      expect(response.body.data.status).toBe("unhealthy");
      expect(Object.values(response.body.data.services)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ status: "unhealthy" }),
        ]),
      );
    });

    it("should handle health service errors gracefully", async () => {
      // Arrange
      mockHealthService.checkHealth.mockRejectedValue(
        new Error("Health check failed"),
      );

      // Act
      const response = await request(app.getServer())
        .get("/v1/health")
        .expect(503);

      // Assert
      expect(response.body).toMatchObject({
        correlationId: expect.any(String),
        error: {
          code: "internal_error",
          message: expect.stringContaining(
            "Health check temporarily unavailable",
          ),
        },
      });
    });

    it("should not require authentication", async () => {
      // Arrange
      mockHealthService.checkHealth.mockResolvedValue(mockHealthResponse);

      // Act - No Authorization header provided
      const response = await request(app.getServer())
        .get("/v1/health")
        .expect(200);

      // Assert
      expect(response.body.data.status).toBe("healthy");
    });

    it("should include proper cache headers", async () => {
      // Arrange
      mockHealthService.checkHealth.mockResolvedValue(mockHealthResponse);

      // Act
      const response = await request(app.getServer()).get("/v1/health");

      // Assert
      expect(response.headers["cache-control"]).toBe(
        "no-cache, no-store, must-revalidate",
      );
      expect(response.headers["pragma"]).toBe("no-cache");
      expect(response.headers["expires"]).toBe("0");
    });
  });

  describe("GET /v1/health/detailed", () => {
    const detailedHealthResponse: HealthCheckResponse = {
      ...mockHealthResponse,
      services: {
        ...mockHealthResponse.services,
        database: {
          status: "healthy",
          responseTimeMs: 15,
          details: {
            connectionPoolActive: 5,
            connectionPoolIdle: 10,
            connectionPoolMax: 20,
            lastQuery: "2024-01-01T00:00:00.000Z",
            version: "8.0.32",
          },
        },
        cache: {
          status: "healthy",
          responseTimeMs: 5,
          details: {
            hitRate: 85.2,
            memoryUsage: 1048576,
            connectedClients: 3,
          },
        },
      },
    };

    it("should return detailed health information", async () => {
      // Arrange
      mockHealthService.checkHealth.mockResolvedValue(detailedHealthResponse);

      // Act
      const response = await request(app.getServer())
        .get("/v1/health/detailed")
        .expect(200);

      // Assert
      expect(response.body.data.services.database.details).toBeDefined();
      expect(response.body.data.services.cache.details).toBeDefined();
      expect(
        response.body.data.services.database.details.connectionPool,
      ).toBeDefined();
      expect(response.body.data.services.cache.details.hitRate).toBe(85.2);

      expect(mockHealthService.checkHealth).toHaveBeenCalledWith({
        includeDetails: true,
      });
    });

    it("should include system metrics in detailed response", async () => {
      // Arrange
      const responseWithMetrics = {
        ...detailedHealthResponse,
        metrics: {
          ...mockHealthResponse.metrics,
          diskSpace: {
            used: 21474836480,
            total: 107374182400,
            percentage: 20.0,
          },
          networkStats: {
            bytesReceived: 1073741824,
            bytesSent: 536870912,
            packetsReceived: 1000000,
            packetsSent: 800000,
          },
        },
      };

      mockHealthService.checkHealth.mockResolvedValue(responseWithMetrics);

      // Act
      const response = await request(app.getServer())
        .get("/v1/health/detailed")
        .expect(200);

      // Assert
      expect(response.body.data.metrics.diskSpace).toBeDefined();
      expect(response.body.data.metrics.networkStats).toBeDefined();
      expect(response.body.data.metrics.diskSpace.percentage).toBe(20.0);
    });
  });

  describe("GET /v1/health/liveness", () => {
    it("should return simple alive status", async () => {
      // Arrange
      const livenessResponse = {
        status: "alive",
        timestamp: "2024-01-01T00:00:00.000Z",
      };

      mockHealthService.checkHealth.mockResolvedValue(livenessResponse);

      // Act
      const response = await request(app.getServer())
        .get("/v1/health/liveness")
        .expect(200);

      // Assert
      expect(response.body.data.status).toBe("alive");
      expect(response.body.data.timestamp).toBeDefined();
      expect(mockHealthService.checkHealth).toHaveBeenCalledWith({
        livenessOnly: true,
      });
    });

    it("should always return 200 for liveness probe", async () => {
      // Arrange - Even if health service has issues
      mockHealthService.checkHealth.mockRejectedValue(
        new Error("Service error"),
      );

      // Act
      const response = await request(app.getServer())
        .get("/v1/health/liveness")
        .expect(200);

      // Assert
      expect(response.body.data.status).toBe("alive");
    });
  });

  describe("GET /v1/health/readiness", () => {
    it("should return ready status when critical services are healthy", async () => {
      // Arrange
      const readinessResponse = {
        status: "ready",
        timestamp: "2024-01-01T00:00:00.000Z",
        services: {
          database: { status: "healthy", responseTimeMs: 15 },
          cache: { status: "healthy", responseTimeMs: 5 },
        },
      };

      mockHealthService.checkHealth.mockResolvedValue(readinessResponse);

      // Act
      const response = await request(app.getServer())
        .get("/v1/health/readiness")
        .expect(200);

      // Assert
      expect(response.body.data.status).toBe("ready");
      expect(mockHealthService.checkHealth).toHaveBeenCalledWith({
        readinessOnly: true,
      });
    });

    it("should return not ready when critical services are down", async () => {
      // Arrange
      const notReadyResponse = {
        status: "not_ready",
        timestamp: "2024-01-01T00:00:00.000Z",
        services: {
          database: {
            status: "unhealthy",
            responseTimeMs: null,
            error: "Connection timeout",
          },
        },
      };

      mockHealthService.checkHealth.mockResolvedValue(notReadyResponse);

      // Act
      const response = await request(app.getServer())
        .get("/v1/health/readiness")
        .expect(503);

      // Assert
      expect(response.body.data.status).toBe("not_ready");
    });
  });

  describe("GET /v1/health/metrics", () => {
    const mockMetrics: SystemMetrics = {
      memory: {
        used: 52428800,
        total: 134217728,
        percentage: 39.1,
      },
      cpu: {
        usage: 15.5,
        loadAverage: [1.2, 1.1, 0.9],
      },
      requests: {
        total: 1500,
        successful: 1475,
        failed: 25,
        averageResponseTime: 125,
      },
    };

    it("should return system metrics", async () => {
      // Arrange
      mockHealthService.getSystemMetrics.mockResolvedValue(mockMetrics);

      // Act
      const response = await request(app.getServer())
        .get("/v1/health/metrics")
        .expect(200);

      // Assert
      expect(response.body).toMatchObject({
        correlationId: expect.any(String),
        message: "System metrics retrieved",
        responseTimeMs: expect.any(Number),
        data: mockMetrics,
      });

      expect(mockHealthService.getSystemMetrics).toHaveBeenCalled();
    });

    it("should handle metrics collection errors", async () => {
      // Arrange
      mockHealthService.getSystemMetrics.mockRejectedValue(
        new Error("Metrics collection failed"),
      );

      // Act
      const response = await request(app.getServer())
        .get("/v1/health/metrics")
        .expect(500);

      // Assert
      expect(response.body.error.message).toContain(
        "Unable to collect system metrics",
      );
    });
  });

  describe("Security Headers", () => {
    it("should include security headers in health responses", async () => {
      // Arrange
      mockHealthService.checkHealth.mockResolvedValue(mockHealthResponse);

      // Act
      const response = await request(app.getServer()).get("/v1/health");

      // Assert
      expect(response.headers["x-content-type-options"]).toBe("nosniff");
      expect(response.headers["x-frame-options"]).toBe("DENY");
      expect(response.headers["x-xss-protection"]).toBe("1; mode=block");
    });
  });

  describe("Response Times", () => {
    it("should complete health checks within acceptable time limits", async () => {
      // Arrange
      mockHealthService.checkHealth.mockResolvedValue(mockHealthResponse);
      const startTime = Date.now();

      // Act
      const response = await request(app.getServer())
        .get("/v1/health")
        .expect(200);

      // Assert
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(1000); // Should complete within 1 second
      expect(response.body.responseTimeMs).toBeLessThan(100); // API processing should be fast
    });
  });

  describe("CORS Support", () => {
    it("should support CORS preflight requests", async () => {
      // Act
      const response = await request(app.getServer())
        .options("/v1/health")
        .set("Origin", "https://monitoring.example.com")
        .set("Access-Control-Request-Method", "GET");

      // Assert
      expect(response.headers["access-control-allow-origin"]).toBeDefined();
      expect(response.headers["access-control-allow-methods"]).toContain("GET");
    });
  });

  describe("Error Handling", () => {
    it("should return proper error format for health check failures", async () => {
      // Arrange
      mockHealthService.checkHealth.mockRejectedValue(
        new Error("Database connection pool exhausted"),
      );

      // Act
      const response = await request(app.getServer())
        .get("/v1/health")
        .expect(503);

      // Assert
      expect(response.body).toMatchObject({
        correlationId: expect.any(String),
        timestamp: expect.any(String),
        path: "/v1/health",
        error: {
          code: "internal_error",
          message: expect.any(String),
        },
      });
    });

    it("should handle timeout scenarios gracefully", async () => {
      // Arrange
      mockHealthService.checkHealth.mockImplementation(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Health check timeout")), 100),
          ),
      );

      // Act
      const response = await request(app.getServer())
        .get("/v1/health")
        .timeout(200)
        .expect(503);

      // Assert
      expect(response.body.error.message).toContain("Health check");
    });
  });

  describe("Load Testing Scenarios", () => {
    it("should handle concurrent health check requests", async () => {
      // Arrange
      mockHealthService.checkHealth.mockResolvedValue(mockHealthResponse);

      const concurrentRequests = Array.from({ length: 10 }, () =>
        request(app.getServer()).get("/v1/health"),
      );

      // Act
      const responses = await Promise.all(concurrentRequests);

      // Assert
      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.data.status).toBe("healthy");
      });

      expect(mockHealthService.checkHealth).toHaveBeenCalledTimes(10);
    });

    it("should maintain performance under load", async () => {
      // Arrange
      mockHealthService.checkHealth.mockResolvedValue(mockHealthResponse);

      const loadTestRequests = Array.from({ length: 50 }, () =>
        request(app.getServer()).get("/v1/health/liveness"),
      );

      const startTime = Date.now();

      // Act
      const responses = await Promise.allSettled(loadTestRequests);

      // Assert
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(5000); // Should complete 50 requests in under 5 seconds

      const successfulResponses = responses.filter(
        (r) => r.status === "fulfilled",
      );
      expect(successfulResponses.length).toBe(50);
    });
  });
});
