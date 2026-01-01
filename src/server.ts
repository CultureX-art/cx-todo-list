/**
 * Development Server Entry Point
 *
 * Starts the Express server with all optimizations applied.
 */

import { App } from "./app";
import { getConfig } from "./config/environment";
import { MockDatabaseConnection } from "./common/database/mock/connection";
import { TaskServiceImpl } from "./task/services/task.service.impl";
import { IAuthService } from "./auth/services/auth.service";
import {
  ValidationError,
  AuthenticationError,
} from "./common/error/service-error";
import { MySQLTaskRepository } from "./task/repositories/task.repository.impl";
import type {
  SignupRequest,
  SignupResponse,
  LoginRequest,
  LoginResponse,
  UserProfile,
  JwtPayload,
} from "./auth/api/types";
import type { ServiceContext } from "./common/types/service";

// Mock AuthService implementation for demo purposes
const mockAuthService: IAuthService = {
  async signup(
    request: SignupRequest,
    _context: ServiceContext,
  ): Promise<SignupResponse> {
    if (!request.email || !request.password) {
      throw new ValidationError("Email and password are required");
    }
    return {
      id: 1,
      email: request.email,
      createdAt: new Date().toISOString(),
    };
  },
  async login(
    request: LoginRequest,
    _context: ServiceContext,
  ): Promise<LoginResponse> {
    if (
      request.email === "test@example.com" &&
      request.password === "SecurePassword123"
    ) {
      return {
        user: {
          id: 1,
          email: request.email,
          createdAt: new Date().toISOString(),
        },
        token: "mock-login-token",
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      };
    }
    throw new AuthenticationError("Invalid credentials");
  },
  async getUserProfile(
    userId: number,
    _context: ServiceContext,
  ): Promise<UserProfile | null> {
    return {
      id: userId,
      email: "test@example.com",
      createdAt: new Date().toISOString(),
    };
  },
  async validateToken(
    token: string,
    _context: ServiceContext,
  ): Promise<JwtPayload> {
    if (token.startsWith("mock-")) {
      return {
        sub: 1,
        email: "test@example.com",
        iat: Date.now(),
        exp: Date.now() + 3600000,
        jti: "mock-jti",
        iss: "todo-api",
        aud: "todo-client",
      };
    }
    throw new AuthenticationError("Invalid token");
  },
  async generateToken(
    _userId: number,
    _email: string,
    _context: ServiceContext,
  ): Promise<string> {
    return `mock-token-${Date.now()}`;
  },
  async revokeToken(_tokenId: string, _context: ServiceContext): Promise<void> {
    // Mock implementation - no-op
  },
  async isTokenRevoked(
    _tokenId: string,
    _context: ServiceContext,
  ): Promise<boolean> {
    return false;
  },
};

async function startServer(): Promise<void> {
  try {
    // Initialize mock services for demo
    const mockDb = new MockDatabaseConnection();
    await mockDb.connect();

    const taskRepository = new MySQLTaskRepository(mockDb);
    const taskService = new TaskServiceImpl(taskRepository);

    // Create app with dependencies
    const app = new App({
      database: mockDb,
      taskService: taskService,
      authService: mockAuthService,
    });

    const config = getConfig();
    const port = config.port;

    // Start server
    const server = app.getServer();
    server.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log(`🚀 Server running on http://localhost:${port}`);
      // eslint-disable-next-line no-console
      console.log(`📊 Environment: ${config.nodeEnv}`);
      // eslint-disable-next-line no-console
      console.log(
        `⚡ Rate limits: ${config.rateLimitMax} req per ${config.rateLimitWindow / 1000}s`,
      );
      // eslint-disable-next-line no-console
      console.log(`🛡️  CORS Origins: ${config.allowedOrigins.join(", ")}`);
      // eslint-disable-next-line no-console
      console.log("\n📋 Available endpoints:");
      // eslint-disable-next-line no-console
      console.log("  GET  /health                 - Health check");
      // eslint-disable-next-line no-console
      console.log("  GET  /api/v1/health          - Detailed health");
      // eslint-disable-next-line no-console
      console.log("  POST /api/v1/auth/signup     - User registration");
      // eslint-disable-next-line no-console
      console.log("  POST /api/v1/auth/login      - User authentication");
      // eslint-disable-next-line no-console
      console.log("  GET  /api/v1/auth/me         - User profile");
      // eslint-disable-next-line no-console
      console.log(
        "  GET  /api/v1/tasks           - List tasks (not implemented)",
      );
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGTERM", () => {
  // eslint-disable-next-line no-console
  console.log("🛑 Shutting down server gracefully...");
  process.exit(0);
});

process.on("SIGINT", () => {
  // eslint-disable-next-line no-console
  console.log("\n🛑 Shutting down server gracefully...");
  process.exit(0);
});

void startServer();
