/**
 * Environment Configuration with Security Hardening
 *
 * Centralized, sanitized environment variable access with validation.
 */

import { AppConfig } from './types';

class EnvironmentConfig {
  private readonly config: AppConfig;

  constructor() {
    this.config = this.loadAndValidateConfig();
  }

  private loadAndValidateConfig(): AppConfig {
    // Sanitize and validate environment variables
    const nodeEnv = this.validateNodeEnv(process.env["NODE_ENV"]);
    const port = this.validatePort(process.env["PORT"]);
    const allowedOrigins = this.validateAllowedOrigins(
      process.env["ALLOWED_ORIGINS"],
    );
    const version = this.sanitizeString(
      process.env["npm_package_version"] ?? "1.0.0",
    );

    return {
      nodeEnv,
      port,
      allowedOrigins,
      version,
      rateLimitWindow: nodeEnv === "production" ? 60000 : 300000, // 1min prod, 5min dev
      rateLimitMax: nodeEnv === "production" ? 100 : 1000, // Stricter in prod
      server: {
        port,
        host: process.env['HOST'] || '0.0.0.0',
        env: nodeEnv,
        requestTimeoutMs: parseInt(process.env['REQUEST_TIMEOUT'] || '30000', 10),
        maxPayloadSize: process.env['MAX_PAYLOAD_SIZE'] || '10mb',
        enableRequestLogging: nodeEnv !== 'test',
        trustProxy: false,
      },
      database: {
        host: process.env['DB_HOST'] || 'localhost',
        port: parseInt(process.env['DB_PORT'] || '3306', 10),
        database: process.env['DB_NAME'] || 'test_db',
        username: process.env['DB_USERNAME'] || 'test',
        password: process.env['DB_PASSWORD'] || 'test',
        pool: {
          max: parseInt(process.env['DB_POOL_MAX'] || '10', 10),
          min: parseInt(process.env['DB_POOL_MIN'] || '2', 10),
          idleTimeoutMs: 30000,
          acquireTimeoutMs: 60000,
        },
        logging: nodeEnv !== 'production',
      },
      auth: {
        jwt: {
          secret: process.env['JWT_SECRET'] || 'test-secret-key',
          algorithm: 'HS256',
          expiresIn: process.env['JWT_EXPIRES_IN'] || '1h',
          issuer: process.env['JWT_ISSUER'] || 'todo-api',
          audience: process.env['JWT_AUDIENCE'] || 'todo-app',
        },
        password: {
          saltRounds: parseInt(process.env['PASSWORD_SALT_ROUNDS'] || '12', 10),
        },
      },
      logging: {
        level: 'info',
        service: 'todo-api',
        version,
        correlationIdHeader: 'x-correlation-id',
      },
      features: {
        taskCreationEnabled: true,
        taskSearchEnabled: true,
        taskLabelsEnabled: true,
        bulkOperationsEnabled: false,
        apiDocsEnabled: nodeEnv !== 'production',
        healthCheckEnabled: true,
      },
    };
  }

  private validateNodeEnv(env?: string): AppConfig["nodeEnv"] {
    const validEnvs: AppConfig["nodeEnv"][] = [
      "development",
      "test",
      "staging",
      "production",
    ];
    const normalizedEnv = (env ?? "development").toLowerCase();

    if (validEnvs.includes(normalizedEnv as AppConfig["nodeEnv"])) {
      return normalizedEnv as AppConfig["nodeEnv"];
    }

    return "development";
  }

  private validatePort(port?: string): number {
    if (port === null || port === undefined || port.trim().length === 0)
      return 3000;

    const parsed = parseInt(port, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 65535) {
      return 3000;
    }

    return parsed;
  }

  private validateAllowedOrigins(origins?: string): string[] {
    if (
      origins === null ||
      origins === undefined ||
      origins.trim().length === 0
    ) {
      return ["http://localhost:3000", "http://localhost:3001"];
    }

    return origins
      .split(",")
      .map((origin) => origin.trim())
      .filter((origin) => {
        // Basic URL validation - reject obvious malicious patterns
        return origin.match(/^https?:\/\/[a-zA-Z0-9-.]+(:[0-9]+)?$/) !== null;
      })
      .slice(0, 10); // Limit to 10 origins max
  }

  private sanitizeString(input: string, maxLength: number = 50): string {
    if (!input || typeof input !== "string") return "";

    // Remove potentially dangerous characters
    return input
      .replace(/[<>'"&]/g, "")
      .substring(0, maxLength)
      .trim();
  }

  public getConfig(): AppConfig {
    return { ...this.config }; // Return immutable copy
  }
}

// Singleton instance
const environmentConfig = new EnvironmentConfig();

export function getConfig(): AppConfig {
  return environmentConfig.getConfig();
}
