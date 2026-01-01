/**
 * Auth API Endpoint Tests
 *
 * Comprehensive test suite for authentication endpoints following interface contracts.
 */

import { jest } from "@jest/globals";
import request from "supertest";
import { App } from "../../src/app";
import { IAuthService } from "../../src/auth/services/auth.service";
import {
  SignupRequest,
  SignupResponse,
  LoginRequest,
  LoginResponse,
  UserProfile,
} from "../../src/auth/api/types";
import {
  ConflictError,
  AuthenticationError,
} from "../../src/common/error/service-error";

describe("Auth API Endpoints", () => {
  let app: App;
  let mockAuthService: jest.Mocked<IAuthService>;

  mockAuthService = {
    signup: jest.fn(),
    login: jest.fn(),
    getUserProfile: jest.fn(),
    validateToken: jest.fn(),
    generateToken: jest.fn(),
    revokeToken: jest.fn(),
    isTokenRevoked: jest.fn(),
  } as jest.Mocked<IAuthService>;

  app = new App();

  describe("POST /v1/auth/signup", () => {
    const validSignupRequest: SignupRequest = {
      email: "user@example.com",
      password: "SecurePass123",
    };

    it("should create user account successfully", async () => {
      // Arrange
      const expectedResponse: SignupResponse = {
        id: 1,
        email: "user@example.com",
        createdAt: "2024-01-01T00:00:00.000Z",
      };

      mockAuthService.signup.mockResolvedValue(expectedResponse);

      // Act
      const response = await request(app.getServer())
        .post("/v1/auth/signup")
        .send(validSignupRequest)
        .expect(201);

      // Assert
      expect(response.body).toMatchObject({
        correlationId: expect.any(String),
        message: "User created successfully",
        responseTimeMs: expect.any(Number),
        data: expectedResponse,
      });

      expect(mockAuthService.signup).toHaveBeenCalledWith(
        validSignupRequest,
        expect.objectContaining({
          correlationId: expect.any(String),
          timestamp: expect.any(Date),
        }),
      );
    });

    it("should return 409 for duplicate email", async () => {
      // Arrange
      mockAuthService.signup.mockRejectedValue(
        new ConflictError("Email address is already registered"),
      );

      // Act
      const response = await request(app.getServer())
        .post("/v1/auth/signup")
        .send(validSignupRequest)
        .expect(409);

      // Assert
      expect(response.body).toMatchObject({
        correlationId: expect.any(String),
        error: {
          code: "conflict",
          message: "Email address is already registered",
        },
      });
    });

    // Table-driven test for validation scenarios
    it.each([
      {
        scenario: "missing email",
        request: { password: "SecurePass123" },
        expectedError: { field: "email", issue: "Email is required" },
      },
      {
        scenario: "invalid email format",
        request: { email: "invalid-email", password: "SecurePass123" },
        expectedError: { field: "email", issue: "Invalid email format" },
      },
      {
        scenario: "email too long",
        request: {
          email: "a".repeat(250) + "@example.com",
          password: "SecurePass123",
        },
        expectedError: {
          field: "email",
          issue: "Email must be less than 255 characters",
        },
      },
      {
        scenario: "missing password",
        request: { email: "user@example.com" },
        expectedError: {
          field: "password",
          issue: "Password must be at least 8 characters",
        },
      },
      {
        scenario: "password too short",
        request: { email: "user@example.com", password: "1234567" },
        expectedError: {
          field: "password",
          issue: "Password must be at least 8 characters",
        },
      },
      {
        scenario: "password too long",
        request: { email: "user@example.com", password: "a".repeat(129) },
        expectedError: {
          field: "password",
          issue: "Password must be less than 128 characters",
        },
      },
      {
        scenario: "password missing uppercase",
        request: { email: "user@example.com", password: "securepass123" },
        expectedError: {
          field: "password",
          issue:
            "Password must contain at least one uppercase letter, one lowercase letter, and one number",
        },
      },
      {
        scenario: "password missing lowercase",
        request: { email: "user@example.com", password: "SECUREPASS123" },
        expectedError: {
          field: "password",
          issue:
            "Password must contain at least one uppercase letter, one lowercase letter, and one number",
        },
      },
      {
        scenario: "password missing number",
        request: { email: "user@example.com", password: "SecurePassword" },
        expectedError: {
          field: "password",
          issue:
            "Password must contain at least one uppercase letter, one lowercase letter, and one number",
        },
      },
    ])(
      "should validate signup request: $scenario",
      async ({ request: requestBody, expectedError }) => {
        // Act
        const response = await request(app.getServer())
          .post("/v1/auth/signup")
          .send(requestBody)
          .expect(400);

        // Assert
        expect(response.body.error.details).toContainEqual(expectedError);
      },
    );
  });

  describe("POST /v1/auth/login", () => {
    const validLoginRequest: LoginRequest = {
      email: "user@example.com",
      password: "SecurePass123",
    };

    it("should authenticate user successfully", async () => {
      // Arrange
      const expectedResponse: LoginResponse = {
        token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        expiresAt: "2024-01-01T01:00:00.000Z",
        user: {
          id: 1,
          email: "user@example.com",
          createdAt: "2024-01-01T00:00:00.000Z",
        },
      };

      mockAuthService.login.mockResolvedValue(expectedResponse);

      // Act
      const response = await request(app.getServer())
        .post("/v1/auth/login")
        .send(validLoginRequest)
        .expect(200);

      // Assert
      expect(response.body).toMatchObject({
        correlationId: expect.any(String),
        message: "Login successful",
        responseTimeMs: expect.any(Number),
        data: expectedResponse,
      });

      expect(mockAuthService.login).toHaveBeenCalledWith(
        validLoginRequest,
        expect.objectContaining({
          correlationId: expect.any(String),
          timestamp: expect.any(Date),
        }),
      );
    });

    it("should return 401 for invalid credentials", async () => {
      // Arrange
      mockAuthService.login.mockRejectedValue(
        new AuthenticationError("Invalid email or password"),
      );

      // Act
      const response = await request(app.getServer())
        .post("/v1/auth/login")
        .send(validLoginRequest)
        .expect(401);

      // Assert
      expect(response.body).toMatchObject({
        correlationId: expect.any(String),
        error: {
          code: "unauthorized",
          message: "Invalid email or password",
        },
      });
    });

    // Table-driven test for validation scenarios
    it.each([
      {
        scenario: "missing email",
        request: { password: "SecurePass123" },
        expectedError: { field: "email", issue: "Email is required" },
      },
      {
        scenario: "invalid email format",
        request: { email: "invalid-email", password: "SecurePass123" },
        expectedError: { field: "email", issue: "Invalid email format" },
      },
      {
        scenario: "missing password",
        request: { email: "user@example.com" },
        expectedError: { field: "password", issue: "Password is required" },
      },
    ])(
      "should validate login request: $scenario",
      async ({ request: requestBody, expectedError }) => {
        // Act
        const response = await request(app.getServer())
          .post("/v1/auth/login")
          .send(requestBody)
          .expect(400);

        // Assert
        expect(response.body.error.details).toContainEqual(expectedError);
      },
    );
  });

  describe("GET /v1/auth/me", () => {
    const validToken = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";

    it("should return user profile for valid token", async () => {
      // Arrange
      const expectedProfile: UserProfile = {
        id: 1,
        email: "user@example.com",
        createdAt: "2024-01-01T00:00:00.000Z",
      };

      mockAuthService.validateToken.mockResolvedValue({
        sub: 1,
        email: "user@example.com",
        iat: 1640995200,
        exp: 1641081600,
        jti: "token-id",
        iss: "todo-api",
        aud: "todo-app",
      });

      mockAuthService.getUserProfile.mockResolvedValue(expectedProfile);

      // Act
      const response = await request(app.getServer())
        .get("/v1/auth/me")
        .set("Authorization", validToken)
        .expect(200);

      // Assert
      expect(response.body).toMatchObject({
        correlationId: expect.any(String),
        message: "User profile retrieved",
        responseTimeMs: expect.any(Number),
        data: expectedProfile,
      });

      expect(mockAuthService.validateToken).toHaveBeenCalledWith(
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        expect.any(Object),
      );
    });

    it("should return 401 for missing token", async () => {
      // Act
      const response = await request(app.getServer())
        .get("/v1/auth/me")
        .expect(401);

      // Assert
      expect(response.body).toMatchObject({
        correlationId: expect.any(String),
        error: {
          code: "unauthorized",
          message: "Authentication token required",
        },
      });
    });

    it("should return 401 for invalid token", async () => {
      // Arrange
      mockAuthService.validateToken.mockRejectedValue(
        new AuthenticationError("Invalid or expired authentication token"),
      );

      // Act
      const response = await request(app.getServer())
        .get("/v1/auth/me")
        .set("Authorization", "Bearer invalid-token")
        .expect(401);

      // Assert
      expect(response.body).toMatchObject({
        correlationId: expect.any(String),
        error: {
          code: "unauthorized",
          message: "Invalid or expired authentication token",
        },
      });
    });

    it("should return 401 for expired token", async () => {
      // Arrange
      mockAuthService.validateToken.mockRejectedValue(
        new AuthenticationError("Token has expired"),
      );

      // Act
      const response = await request(app.getServer())
        .get("/v1/auth/me")
        .set("Authorization", validToken)
        .expect(401);

      // Assert
      expect(response.body.error.message).toBe("Token has expired");
    });

    it("should return 401 for revoked token", async () => {
      // Arrange
      mockAuthService.validateToken.mockResolvedValue({
        sub: 1,
        email: "user@example.com",
        iat: 1640995200,
        exp: 1641081600,
        jti: "revoked-token-id",
        iss: "todo-api",
        aud: "todo-app",
      });

      mockAuthService.isTokenRevoked.mockResolvedValue(true);

      // Act
      const response = await request(app.getServer())
        .get("/v1/auth/me")
        .set("Authorization", validToken)
        .expect(401);

      // Assert
      expect(response.body.error.message).toBe("Token has been revoked");
    });
  });

  describe("Rate Limiting", () => {
    it("should apply rate limiting to login endpoint", async () => {
      // Arrange
      const loginRequest = {
        email: "user@example.com",
        password: "WrongPassword123",
      };

      mockAuthService.login.mockRejectedValue(
        new AuthenticationError("Invalid email or password"),
      );

      // Act - Make multiple failed login attempts
      const requests = Array.from({ length: 6 }, () =>
        request(app.getServer()).post("/v1/auth/login").send(loginRequest),
      );

      const responses = await Promise.allSettled(requests);

      // Assert - Last request should be rate limited
      const lastResponse = responses[responses.length - 1];
      if (lastResponse && lastResponse.status === "fulfilled") {
        expect((lastResponse as PromiseFulfilledResult<request.Response>).value.status).toBe(429);
        expect(
          (lastResponse as PromiseFulfilledResult<request.Response>).value.body.error.code,
        ).toBe("rate_limited");
      }
    });
  });

  describe("CORS Headers", () => {
    it("should include proper CORS headers", async () => {
      // Act
      const response = await request(app.getServer())
        .options("/v1/auth/signup")
        .set("Origin", "https://app.example.com")
        .set("Access-Control-Request-Method", "POST");

      // Assert
      expect(response.headers["access-control-allow-origin"]).toBeDefined();
      expect(response.headers["access-control-allow-methods"]).toContain(
        "POST",
      );
      expect(response.headers["access-control-allow-headers"]).toContain(
        "authorization",
      );
    });
  });

  describe("Security Headers", () => {
    it("should include security headers in responses", async () => {
      // Act
      const response = await request(app.getServer())
        .post("/v1/auth/signup")
        .send({
          email: "user@example.com",
          password: "SecurePass123",
        });

      // Assert
      expect(response.headers["x-content-type-options"]).toBe("nosniff");
      expect(response.headers["x-frame-options"]).toBe("DENY");
      expect(response.headers["x-xss-protection"]).toBe("1; mode=block");
    });
  });

  describe("Request Logging", () => {
    it("should log requests with correlation ID", async () => {
      // Arrange
      const correlationId = "test-correlation-id";

      // Act
      await request(app.getServer())
        .post("/v1/auth/signup")
        .set("x-correlation-id", correlationId)
        .send({
          email: "user@example.com",
          password: "SecurePass123",
        });

      // Assert - Verify correlation ID is passed to service
      expect(mockAuthService.signup).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          correlationId: correlationId,
        }),
      );
    });
  });
});
