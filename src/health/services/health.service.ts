/**
 * Health Service Type Definitions
 *
 * These interfaces define the contracts for system health monitoring services.
 */

import type {
  HealthCheckResponse,
  DetailedHealthCheckResponse,
  ReadinessResponse,
  LivenessResponse,
  ServiceHealthStatus,
  SystemMetrics,
} from "../api/types.js";
import type { ServiceContext } from "../../common/types/service.js";

// Export the implementation
export { HealthServiceImpl } from "./health.service.impl";

// ============================================================================
// SERVICE INTERFACE
// ============================================================================

/**
 * Health monitoring service interface
 */
export interface HealthService {
  /**
   * Perform basic health check
   *
   * @param context - Service execution context
   * @returns Promise resolving to basic health status
   *
   * @throws {InternalServiceError} When health check fails
   */
  checkHealth(context: ServiceContext): Promise<HealthCheckResponse>;

  /**
   * Perform detailed health check with system metrics
   *
   * @param context - Service execution context
   * @returns Promise resolving to detailed health status with metrics
   *
   * @throws {InternalServiceError} When health check fails
   */
  checkDetailedHealth(
    context: ServiceContext,
  ): Promise<DetailedHealthCheckResponse>;

  /**
   * Check service readiness (Kubernetes-style probe)
   *
   * @param context - Service execution context
   * @returns Promise resolving to readiness status
   *
   * @throws {InternalServiceError} When readiness check fails
   */
  checkReadiness(context: ServiceContext): Promise<ReadinessResponse>;

  /**
   * Check service liveness (Kubernetes-style probe)
   *
   * @param context - Service execution context
   * @returns Promise resolving to liveness status
   *
   * @throws {InternalServiceError} When liveness check fails
   */
  checkLiveness(context: ServiceContext): Promise<LivenessResponse>;

  /**
   * Get system metrics for monitoring
   *
   * @param context - Service execution context
   * @returns Promise resolving to system metrics
   *
   * @throws {InternalServiceError} When metrics collection fails
   */
  getSystemMetrics(context: ServiceContext): Promise<SystemMetrics>;

  /**
   * Check database health specifically
   *
   * @param context - Service execution context
   * @returns Promise resolving to database health status
   */
  checkDatabaseHealth(context: ServiceContext): Promise<ServiceHealthStatus>;

  /**
   * Perform maintenance cleanup tasks
   *
   * @param context - Service execution context
   * @returns Promise resolving to cleanup results
   *
   * @throws {InternalServiceError} When maintenance fails
   */
  performMaintenance(context: ServiceContext): Promise<MaintenanceResult>;
}

// ============================================================================
// HEALTH CHECK PROVIDERS
// ============================================================================

/**
 * Interface for individual health check providers
 */
export interface HealthCheckProvider {
  /** Provider name for identification */
  readonly name: string;

  /** Provider priority (lower = higher priority) */
  readonly priority: number;

  /** Whether this provider is critical for overall health */
  readonly critical: boolean;

  /**
   * Perform health check for this provider
   *
   * @param context - Service execution context
   * @returns Promise resolving to service health status
   */
  checkHealth(context: ServiceContext): Promise<ServiceHealthStatus>;

  /**
   * Check if provider is ready to serve requests
   *
   * @param context - Service execution context
   * @returns Promise resolving to readiness status
   */
  checkReadiness(context: ServiceContext): Promise<boolean>;
}

/**
 * Database health check provider
 */
export interface DatabaseHealthProvider extends HealthCheckProvider {
  /**
   * Check database connection and perform basic query
   */
  checkConnection(): Promise<boolean>;

  /**
   * Get database connection pool statistics
   */
  getPoolStats(): Promise<{
    active: number;
    total: number;
    max: number;
  }>;
}

/**
 * External service health check provider
 */
export interface ExternalServiceHealthProvider extends HealthCheckProvider {
  /** Service endpoint URL */
  readonly endpoint: string;

  /** Request timeout in milliseconds */
  readonly timeoutMs: number;

  /**
   * Check external service availability
   */
  checkService(): Promise<{
    available: boolean;
    responseTimeMs: number;
    error?: string;
  }>;
}

// ============================================================================
// SUPPORTING TYPES
// ============================================================================

/**
 * Maintenance operation result
 */
export interface MaintenanceResult {
  /** Maintenance start timestamp */
  startedAt: Date;

  /** Maintenance completion timestamp */
  completedAt: Date;

  /** Total maintenance duration in milliseconds */
  durationMs: number;

  /** Operations performed during maintenance */
  operations: MaintenanceOperation[];

  /** Overall maintenance success status */
  success: boolean;

  /** Any errors encountered during maintenance */
  errors: string[];
}

/**
 * Individual maintenance operation
 */
export interface MaintenanceOperation {
  /** Operation name */
  name: string;

  /** Operation description */
  description: string;

  /** Operation start timestamp */
  startedAt: Date;

  /** Operation completion timestamp */
  completedAt: Date;

  /** Operation duration in milliseconds */
  durationMs: number;

  /** Operation success status */
  success: boolean;

  /** Number of items processed/affected */
  itemsProcessed: number;

  /** Operation result details */
  result: {
    /** Items successfully processed */
    successful: number;
    /** Items that failed processing */
    failed: number;
    /** Items skipped */
    skipped: number;
  };

  /** Error message if operation failed */
  error?: string;
}

// ============================================================================
// HEALTH CHECK CONFIGURATION
// ============================================================================

/**
 * Health check service configuration
 */
export interface HealthServiceConfig {
  /** Health check timeout in milliseconds */
  timeoutMs: number;

  /** Health check cache TTL in milliseconds */
  cacheTtlMs: number;

  /** Enable detailed health checks */
  enableDetailedChecks: boolean;

  /** Enable system metrics collection */
  enableMetrics: boolean;

  /** Health check providers to register */
  providers: HealthCheckProvider[];

  /** Maintenance schedule configuration */
  maintenance: {
    /** Enable automatic maintenance */
    enabled: boolean;
    /** Maintenance interval in milliseconds */
    intervalMs: number;
    /** Maintenance operations to perform */
    operations: string[];
  };
}
