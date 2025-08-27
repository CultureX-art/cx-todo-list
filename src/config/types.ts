/**
 * Configuration Type Definitions
 *
 * These interfaces define the structure for all application configuration.
 * Configuration is loaded from environment variables and validated at startup.
 */

// ============================================================================
// ENVIRONMENT TYPES
// ============================================================================

/**
 * Application environment enumeration
 */
export type Environment = "development" | "testing" | "staging" | "production";

/**
 * Log level enumeration
 */
export type LogLevel = "silly" | "debug" | "info" | "warn" | "error" | "fatal";

// ============================================================================
// MAIN APPLICATION CONFIGURATION
// ============================================================================

/**
 * HTTP server configuration
 */
export interface ServerConfig {
  /** Server port number (default: 3000) */
  port: number;
  /** Host to bind server to (default: '0.0.0.0') */
  host: string;
  /** Application environment */
  env: Environment;
  /** Request timeout in milliseconds (default: 30000) */
  requestTimeoutMs: number;
  /** Maximum request payload size (default: '10mb') */
  maxPayloadSize: string;
  /** Enable request logging (default: true) */
  enableRequestLogging: boolean;
  /** Trust proxy headers (default: false) */
  trustProxy: boolean;
}

/**
 * Database connection configuration
 */
export interface DatabaseConfig {
  /** Database host (default: 'localhost') */
  host: string;
  /** Database port (default: 3306 for MySQL) */
  port: number;
  /** Database name */
  database: string;
  /** Database username */
  username: string;
  /** Database password */
  password: string;
  /** Connection pool configuration */
  pool: {
    /** Maximum number of connections in pool (default: 10) */
    max: number;
    /** Minimum number of connections in pool (default: 2) */
    min: number;
    /** Connection idle timeout in milliseconds (default: 30000) */
    idleTimeoutMs: number;
    /** Connection acquire timeout in milliseconds (default: 60000) */
    acquireTimeoutMs: number;
  };
  /** Enable query logging (default: false for production) */
  logging: boolean;
}

/**
 * Authentication and JWT configuration
 */
export interface AuthConfig {
  /** JWT configuration */
  jwt: {
    /** JWT signing secret */
    secret: string;
    /** JWT signing algorithm (default: 'HS256') */
    algorithm: "HS256" | "HS384" | "HS512";
    /** Token expiration time (default: '1h') */
    expiresIn: string;
    /** Token issuer (default: 'todo-api') */
    issuer: string;
    /** Token audience (default: 'todo-app') */
    audience: string;
  };
  /** Password hashing configuration */
  password: {
    /** Bcrypt salt rounds (default: 12) */
    saltRounds: number;
  };
}

/**
 * Logging configuration
 */
export interface LoggingConfig {
  /** Log level (default: 'info') */
  level: LogLevel;
  /** Service name for structured logs */
  service: string;
  /** Application version for logs */
  version: string;
  /** Correlation ID header name (default: 'x-correlation-id') */
  correlationIdHeader: string;
}

/**
 * Feature flags configuration
 */
export interface FeatureConfig {
  /** Task creation feature enabled (default: true) */
  taskCreationEnabled: boolean;
  /** Task search feature enabled (default: true) */
  taskSearchEnabled: boolean;
  /** Task labels feature enabled (default: true) */
  taskLabelsEnabled: boolean;
  /** Bulk task operations enabled (default: false) */
  bulkOperationsEnabled: boolean;
  /** API documentation enabled (default: true for development) */
  apiDocsEnabled: boolean;
  /** Health check endpoints enabled (default: true) */
  healthCheckEnabled: boolean;
}

// ============================================================================
// ENVIRONMENT VARIABLE MAPPING
// ============================================================================

/**
 * Environment variable mapping interface
 */
export interface EnvironmentVariables {
  // Server
  PORT?: string;
  HOST?: string;
  NODE_ENV?: string;
  REQUEST_TIMEOUT?: string;
  MAX_PAYLOAD_SIZE?: string;

  // Database
  DB_HOST?: string;
  DB_PORT?: string;
  DB_NAME?: string;
  DB_USERNAME?: string;
  DB_PASSWORD?: string;
  DB_POOL_MAX?: string;
  DB_POOL_MIN?: string;

  // Authentication
  JWT_SECRET?: string;
  JWT_EXPIRES_IN?: string;
  JWT_ISSUER?: string;
  JWT_AUDIENCE?: string;
  PASSWORD_SALT_ROUNDS?: string;

  // Logging
  LOG_LEVEL?: string;
  LOG_SERVICE?: string;

  // Features
  FEATURE_TASK_CREATION?: string;
  FEATURE_TASK_SEARCH?: string;
  FEATURE_BULK_OPERATIONS?: string;
  FEATURE_AUDIT_LOGGING?: string;
}

/**
 * Complete application configuration
 */
export interface AppConfig {
  /** Server configuration */
  server: ServerConfig;
  /** Database configuration */
  database: DatabaseConfig;
  /** Authentication configuration */
  auth: AuthConfig;
  /** Logging configuration */
  logging: LoggingConfig;
  /** Feature flags configuration */
  features: FeatureConfig;
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Type guard to check if environment is valid
 */
export const isValidEnvironment = (env: string): env is Environment => {
  return ["development", "testing", "staging", "production"].includes(env);
};

/**
 * Type guard to check if log level is valid
 */
export const isValidLogLevel = (level: string): level is LogLevel => {
  return ["debug", "info", "warn", "error", "fatal"].includes(level);
};
