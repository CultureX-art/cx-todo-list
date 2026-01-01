/**
 * Express Application Factory
 *
 * Creates and configures Express application with middleware and routes.
 */

import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { IDatabaseConnection } from "./common/database/connection";
import { ITaskService } from "./task/services/task.service";
import { IAuthService } from "./auth/services/auth.service";
import { apiRoutes } from "./api/routes";
import { getConfig } from "./config/environment";
import { ExpressError } from "./common/types/express";

export interface AppDependencies {
  database?: IDatabaseConnection;
  taskService?: ITaskService;
  authService?: IAuthService;
}

export class App {
  private readonly app: Application;

  constructor() {
    this.app = createApp();
  }

  getApp(): Application {
    return this.app;
  }

  getServer(): Application {
    return this.app;
  }
}

export function createApp(): Application {
  const app = express();
  const config = getConfig();

  // Security middleware
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  // CORS configuration - using sanitized config
  app.use(
    cors({
      origin: config.allowedOrigins,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "If-Match",
        "If-None-Match",
      ],
    }),
  );

  // Rate limiting - using environment-aware configuration
  const limiter = rateLimit({
    windowMs: config.rateLimitWindow,
    max: config.rateLimitMax,
    message: {
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many requests from this IP, please try again later",
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip rate limiting for health checks and static assets
    skip: (req) => {
      return req.path === "/health" || req.path.startsWith("/static");
    },
  });
  app.use(limiter);

  // Body parsing middleware
  app.use(compression());
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));

  // Logging middleware
  if (config.nodeEnv !== "test") {
    app.use(morgan("combined"));
  }

  // Health check endpoint
  app.get("/health", (_req, res) => {
    res.status(200).json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: config.version,
    });
  });

  // API routes
  app.use("/api", apiRoutes);

  // 404 handler
  app.use("*", (req, res) => {
    res.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: `Route ${req.originalUrl} not found`,
      },
    });
  });

  // Global error handler
  app.use(
    (
      error: ExpressError,
      _req: express.Request,
      res: express.Response,
      // _next: express.NextFunction,
    ) => {
      // Log error for debugging
      // eslint-disable-next-line no-console
      console.error("Unhandled error:", error);

      const statusCode = error.status ?? error.statusCode ?? 500;

      res.status(statusCode).json({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "An unexpected error occurred",
        },
      });
    },
  );

  return app;
}
