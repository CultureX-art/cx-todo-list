/**
 * Health Check API Type Definitions
 *
 * These interfaces define the frozen contract for system health endpoints.
 */

// ============================================================================
// HEALTH CHECK TYPES
// ============================================================================

/**
 * System health status
 */
export type HealthStatus = "healthy" | "unhealthy" | "degraded";

/**
 * Database connection status
 */
export type DatabaseStatus = "connected" | "disconnected";

/**
 * Individual service health status
 */
export interface ServiceHealthStatus {
  /** Service name */
  name: string;
  /** Service health status */
  status: HealthStatus;
  /** Response time in milliseconds */
  responseTimeMs?: number;
  /** Service version */
  version?: string;
  /** Error message if unhealthy */
  error?: string;
}

/**
 * Service status for health check
 */
export interface ServiceStatus {
  /** Service health status */
  status: HealthStatus;
  /** Response time in milliseconds */
  responseTimeMs?: number;
  /** Error message if unhealthy */
  error?: string;
  /** Additional service details */
  details?: Record<string, string | number | boolean | null>;
}

/**
 * System metrics information
 */
export interface SystemMetrics {
  /** Memory usage information */
  memory: {
    /** Used memory in bytes */
    used: number;
    /** Total available memory in bytes */
    total: number;
    /** Memory usage percentage */
    percentage: number;
  };
  /** CPU usage information */
  cpu: {
    /** CPU usage percentage */
    usage: number;
    /** Load average array */
    loadAverage: number[];
  };
  /** Request statistics */
  requests: {
    /** Total requests */
    total: number;
    /** Successful requests */
    successful: number;
    /** Failed requests */
    failed: number;
    /** Average response time in milliseconds */
    averageResponseTime: number;
  };
}

/**
 * System health check response
 */
export interface HealthCheckResponse {
  /** Overall system health status */
  status: HealthStatus;
  /** Health check timestamp in ISO 8601 format */
  timestamp: string;
  /** Application version */
  version: string;
  /** System uptime in seconds */
  uptime: number;
  /** Individual service health statuses */
  services: {
    /** Database service status */
    database: ServiceStatus;
    /** Cache service status */
    cache: ServiceStatus;
    /** External service status */
    external: ServiceStatus;
    [serviceName: string]: ServiceStatus;
  };
  /** System metrics */
  metrics: SystemMetrics;
  /** Array of error messages if unhealthy */
  errors?: string[];
  /** Total response time in milliseconds */
  responseTimeMs?: number;
  /** System environment */
  environment?: string;
  /** Feature flags */
  features?: {
    /** Health check feature enabled */
    healthCheckEnabled: boolean;
    [featureName: string]: boolean;
  };
}

/**
 * Detailed health check response with system metrics
 */
export interface DetailedHealthCheckResponse extends HealthCheckResponse {
  /** System uptime in seconds */
  uptimeSeconds: number;
  /** Memory usage information */
  memory: {
    /** Used memory in bytes */
    used: number;
    /** Total available memory in bytes */
    total: number;
    /** Memory usage percentage */
    percentage: number;
  };
  /** Database connection pool information */
  database_pool: {
    /** Active connections */
    active: number;
    /** Total connections */
    total: number;
    /** Maximum allowed connections */
    max: number;
  };
}

/**
 * Readiness probe response (Kubernetes-style)
 */
export interface ReadinessResponse {
  /** Whether the service is ready to accept traffic */
  ready: boolean;
  /** Readiness check timestamp */
  timestamp: string;
  /** Services that must be ready */
  dependencies: Array<{
    /** Dependency name */
    name: string;
    /** Whether dependency is ready */
    ready: boolean;
    /** Error message if not ready */
    error?: string;
  }>;
}

/**
 * Liveness probe response (Kubernetes-style)
 */
export interface LivenessResponse {
  /** Whether the service is alive */
  alive: boolean;
  /** Liveness check timestamp */
  timestamp: string;
  /** Service uptime in seconds */
  uptimeSeconds: number;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard to check if health status is valid
 */
export const isValidHealthStatus = (status: string): status is HealthStatus => {
  return ["healthy", "unhealthy"].includes(status);
};

/**
 * Type guard to check if database status is valid
 */
export const isValidDatabaseStatus = (
  status: string,
): status is DatabaseStatus => {
  return ["connected", "disconnected"].includes(status);
};
