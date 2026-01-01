/**
 * Auth Service Unit Tests
 *
 * Comprehensive test suite for authentication business logic services.
 */

import { jest } from "@jest/globals";
import * as jwt from "jsonwebtoken";
import { AuthServiceImpl } from "../../src/auth/services/auth.service.impl";
import { IUserRepository } from "../../src/auth/repositories/user.repository";
import { TokenBlacklistRepository } from "../../src/common/types/repository";
import {
  SignupRequest,
  LoginRequest,
  JwtPayload,
} from "../../src/auth/api/types";
import { ServiceContext } from "../../src/common/types/service";
import {
  ValidationError,
  ConflictError,
  AuthenticationError,
  InternalServiceError,
} from "../../src/common/error/service-error";
import { TestFixtures } from "../helpers/test-fixtures";
import { AppConfig } from "../../src/config/types";

// Mock ES Modules
const mockBcrypt = {
  hash: jest.fn<() => Promise<string>>(),
  compare: jest.fn<() => Promise<boolean>>(),
};

const mockJwt = {
  sign: jest.fn(),
  verify: jest.fn(),
  decode: jest.fn(),
};

jest.unstable_mockModule("bcrypt", () => ({
  default: mockBcrypt,
  ...mockBcrypt,
}));

jest.unstable_mockModule("jsonwebtoken", () => ({
  default: mockJwt,
  ...mockJwt,
}));

describe("AuthService", () => {
  let authService: AuthServiceImpl;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let mockTokenBlacklistRepository: jest.Mocked<TokenBlacklistRepository>;
  let mockContext: ServiceContext;
  let mockConfig: Pick<AppConfig, "auth">;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUserRepository = {
      create: jest.fn(),
      findByPk: jest.fn(),
      findByEmail: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findAndCountAll: jest.fn(),
      emailExists: jest.fn(),
      getStatistics: jest.fn(),
      findByDateRange: jest.fn(),
    } as jest.Mocked<IUserRepository>;

    mockTokenBlacklistRepository = {
      create: jest.fn(),
      isBlacklisted: jest.fn(),
      removeExpiredTokens: jest.fn(),
      findByUser: jest.fn(),
      revokeAllUserTokens: jest.fn(),
      getStatistics: jest.fn(),
    } as jest.Mocked<TokenBlacklistRepository>;

    mockContext = TestFixtures.createServiceContext();

    mockConfig = {
      auth: {
        jwt: {
          secret: "test-secret",
          algorithm: "HS256",
          expiresIn: "1h",
          issuer: "todo-api",
          audience: "todo-app",
        },
        password: {
          saltRounds: 10,
        },
      },
    };

    authService = new AuthServiceImpl(
      mockUserRepository,
      mockTokenBlacklistRepository,
      mockConfig as AppConfig,
    );
  });

  describe("signup", () => {
    const validSignupRequest: SignupRequest = {
      email: "user@example.com",
      password: "SecurePass123",
    };

    it("should create user account successfully", async () => {
      // Arrange
      const hashedPassword = "hashedPassword123";
      const createdUser = TestFixtures.createUserAttributes({
        id: 1,
        email: "user@example.com",
        passwordHash: hashedPassword,
        createdAt: new Date("2024-01-01T00:00:00.000Z"),
      });

      mockUserRepository.emailExists.mockResolvedValue(false);
      (mockBcrypt.hash as jest.Mock<() => Promise<string>>).mockResolvedValue(hashedPassword);
      mockUserRepository.create.mockResolvedValue(createdUser as any);

      // Act
      const result = await authService.signup(validSignupRequest);

      // Assert
      expect(result).toEqual({
        id: 1,
        email: "user@example.com",
        createdAt: "2024-01-01T00:00:00.000Z",
      });

      expect(mockUserRepository.emailExists).toHaveBeenCalledWith(
        "user@example.com",
      );
      expect(mockBcrypt.hash).toHaveBeenCalledWith("SecurePass123", 10);
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        email: "user@example.com",
        passwordHash: hashedPassword,
      });
    });

    it("should throw ConflictError for existing email", async () => {
      // Arrange
      mockUserRepository.emailExists.mockResolvedValue(true);

      // Act & Assert
      await expect(
        authService.signup(validSignupRequest),
      ).rejects.toThrow(ConflictError);

      expect(mockUserRepository.emailExists).toHaveBeenCalledWith(
        "user@example.com",
      );
      expect(mockBcrypt.hash).not.toHaveBeenCalled();
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it("should throw ValidationError for invalid email format", async () => {
      // Arrange
      const invalidRequest = {
        ...validSignupRequest,
        email: "invalid-email",
      };

      // Act & Assert
      await expect(
        authService.signup(invalidRequest),
      ).rejects.toThrow(ValidationError);

      expect(mockUserRepository.emailExists).not.toHaveBeenCalled();
    });

    it("should throw ValidationError for weak password", async () => {
      // Arrange
      const weakPasswordRequest = {
        ...validSignupRequest,
        password: "123",
      };

      // Act & Assert
      await expect(
        authService.signup(weakPasswordRequest),
      ).rejects.toThrow(ValidationError);

      expect(mockUserRepository.emailExists).not.toHaveBeenCalled();
    });

    it("should throw InternalServiceError when repository fails", async () => {
      // Arrange
      mockUserRepository.emailExists.mockResolvedValue(false);
      (mockBcrypt.hash as jest.Mock<() => Promise<string>>).mockResolvedValue("hashedPassword");
      mockUserRepository.create.mockRejectedValue(
        new Error("Database connection failed"),
      );

      // Act & Assert
      await expect(
        authService.signup(validSignupRequest),
      ).rejects.toThrow(InternalServiceError);

      expect(mockUserRepository.create).toHaveBeenCalled();
    });

    // Table-driven tests for validation scenarios
    it.each([
      {
        scenario: "empty email",
        request: { email: "", password: "SecurePass123" },
        expectedError: "Email is required",
      },
      {
        scenario: "email too long",
        request: {
          email: "a".repeat(250) + "@example.com",
          password: "SecurePass123",
        },
        expectedError: "Email is too long",
      },
      {
        scenario: "password too short",
        request: { email: "user@example.com", password: "1234567" },
        expectedError: "Password must be at least 8 characters",
      },
      {
        scenario: "password missing uppercase",
        request: { email: "user@example.com", password: "securepass123" },
        expectedError: "Password must contain at least one uppercase letter",
      },
      {
        scenario: "password missing lowercase",
        request: { email: "user@example.com", password: "SECUREPASS123" },
        expectedError: "Password must contain at least one lowercase letter",
      },
      {
        scenario: "password missing number",
        request: { email: "user@example.com", password: "SecurePassword" },
        expectedError: "Password must contain at least one number",
      },
    ])("should validate: $scenario", async ({ request, expectedError }) => {
      // Act & Assert
      await expect(
        authService.signup(request as SignupRequest),
      ).rejects.toThrow(new RegExp(expectedError, "i"));
    });
  });

  describe("login", () => {
    const validLoginRequest: LoginRequest = {
      email: "user@example.com",
      password: "SecurePass123",
    };

    const existingUser = TestFixtures.createUserAttributes({
      id: 1,
      email: "user@example.com",
      passwordHash: "hashedPassword123",
    });

    it("should authenticate user successfully", async () => {
      // Arrange
      const mockToken = "mocked.jwt.token";
      const mockExpiresAt = new Date("2024-01-01T13:00:00.000Z");

      mockUserRepository.findByEmail.mockResolvedValue(existingUser as any);
      (mockBcrypt.compare as jest.Mock<() => Promise<boolean>>).mockResolvedValue(true);
      (mockJwt.sign as jest.Mock).mockReturnValue(mockToken);
      (mockJwt.decode as jest.Mock).mockReturnValue({
        exp: Math.floor(mockExpiresAt.getTime() / 1000),
      });

      // Act
      const result = await authService.login(validLoginRequest);

      // Assert
      expect(result).toEqual({
        token: mockToken,
        expiresAt: mockExpiresAt.toISOString(),
        user: {
          id: 1,
          email: "user@example.com",
          createdAt: existingUser.createdAt.toISOString(),
        },
      });

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
        "user@example.com",
      );
      expect(mockBcrypt.compare).toHaveBeenCalledWith(
        "SecurePass123",
        "hashedPassword123",
      );
      expect(mockJwt.sign).toHaveBeenCalledWith(
        expect.any(Object),
        "test-secret",
        expect.any(Object),
      );
    });

    it("should throw AuthenticationError for non-existent user", async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(null);

      // Act & Assert
      await expect(
        authService.login(validLoginRequest),
      ).rejects.toThrow(AuthenticationError);

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
        "user@example.com",
      );
      expect(mockBcrypt.compare).not.toHaveBeenCalled();
    });

    it("should throw AuthenticationError for invalid password", async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(existingUser as any);
      (mockBcrypt.compare as jest.Mock<() => Promise<boolean>>).mockResolvedValue(false);

      // Act & Assert
      await expect(
        authService.login(validLoginRequest),
      ).rejects.toThrow(AuthenticationError);

      expect(mockBcrypt.compare).toHaveBeenCalledWith(
        "SecurePass123",
        "hashedPassword123",
      );
    });

    it("should throw AuthenticationError for soft-deleted user", async () => {
      // Arrange
      const deletedUser = {
        ...existingUser,
        deletedAt: new Date(),
      };

      mockUserRepository.findByEmail.mockResolvedValue(deletedUser as any);

      // Act & Assert
      await expect(
        authService.login(validLoginRequest),
      ).rejects.toThrow(AuthenticationError);
    });

    it("should throw ValidationError for invalid input", async () => {
      // Arrange
      const invalidRequest = {
        email: "invalid-email",
        password: "",
      };

      // Act & Assert
      await expect(
        authService.login(invalidRequest as LoginRequest),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("getUserProfile", () => {
    it("should return user profile when found", async () => {
      // Arrange
      const userId = 1;
      const user = TestFixtures.createUserAttributes({
        id: userId,
        email: "user@example.com",
        createdAt: new Date("2024-01-01T00:00:00.000Z"),
      });

      mockUserRepository.findByPk.mockResolvedValue(user as any);

      // Act
      const result = await authService.getUserProfile(userId);

      // Assert
      expect(result).toEqual({
        id: userId,
        email: "user@example.com",
        createdAt: "2024-01-01T00:00:00.000Z",
      });

      expect(mockUserRepository.findByPk).toHaveBeenCalledWith(userId);
    });

    it("should return null when user not found", async () => {
      // Arrange
      const userId = 999;
      mockUserRepository.findByPk.mockResolvedValue(null);

      // Act
      const result = await authService.getUserProfile(userId);

      // Assert
      expect(result).toBeNull();
      expect(mockUserRepository.findByPk).toHaveBeenCalledWith(userId);
    });

    it("should throw ValidationError for invalid user ID", async () => {
      // Act & Assert
      await expect(authService.getUserProfile(-1)).rejects.toThrow(
        ValidationError,
      );
    });
  });

  describe("validateToken", () => {
    const validToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";

    it("should validate token successfully", async () => {
      // Arrange
      const mockPayload: JwtPayload = {
        sub: 1,
        email: "user@example.com",
        iat: 1704110400,
        exp: 1704114000,
        jti: "token-id",
        iss: "todo-api",
        aud: "todo-app",
      };

      (mockJwt.verify as jest.Mock).mockReturnValue(mockPayload);
      mockTokenBlacklistRepository.isBlacklisted.mockResolvedValue(false);

      // Act
      const result = await authService.validateToken(validToken);

      // Assert
      expect(result).toEqual(mockPayload);

      expect(mockJwt.verify).toHaveBeenCalledWith(
        validToken,
        "test-secret",
      );
      expect(mockTokenBlacklistRepository.isBlacklisted).toHaveBeenCalledWith(
        "token-id",
      );
    });

    it("should throw AuthenticationError for invalid token", async () => {
      // Arrange
      (mockJwt.verify as jest.Mock).mockImplementation(() => {
        throw new jwt.JsonWebTokenError("Invalid token");
      });

      // Act & Assert
      await expect(
        authService.validateToken("invalid-token"),
      ).rejects.toThrow(AuthenticationError);
    });

    it("should throw AuthenticationError for expired token", async () => {
      // Arrange
      (mockJwt.verify as jest.Mock).mockImplementation(() => {
        throw new jwt.TokenExpiredError("Token expired", new Date());
      });

      // Act & Assert
      await expect(
        authService.validateToken(validToken),
      ).rejects.toThrow(AuthenticationError);
    });

    it("should throw AuthenticationError for revoked token", async () => {
      // Arrange
      const mockPayload: JwtPayload = {
        sub: 1,
        email: "user@example.com",
        iat: 1704110400,
        exp: 1704114000,
        jti: "revoked-token-id",
        iss: "todo-api",
        aud: "todo-app",
      };

      (mockJwt.verify as jest.Mock).mockReturnValue(mockPayload);
      mockTokenBlacklistRepository.isBlacklisted.mockResolvedValue(true);

      // Act & Assert
      await expect(
        authService.validateToken(validToken),
      ).rejects.toThrow(AuthenticationError);

      expect(mockTokenBlacklistRepository.isBlacklisted).toHaveBeenCalledWith(
        "revoked-token-id",
      );
    });
  });

  describe("generateToken", () => {
    it("should generate JWT token successfully", async () => {
      // Arrange
      const userId = 1;
      const email = "user@example.com";
      const expectedToken = "mocked.jwt.token";

      (mockJwt.sign as jest.Mock).mockReturnValue(expectedToken);

      // Act
      const result = await authService.generateToken(
        userId,
        email
      );

      // Assert
      expect(result).toBe(expectedToken);

      expect(mockJwt.sign).toHaveBeenCalledWith(
        expect.any(Object),
        "test-secret",
        { algorithm: "HS256" },
      );
    });

    it("should throw InternalServiceError when token generation fails", async () => {
      // Arrange
      (mockJwt.sign as jest.Mock).mockImplementation(() => {
        throw new Error("Key generation failed");
      });

      // Act & Assert
      await expect(
        authService.generateToken(1, "user@example.com"),
      ).rejects.toThrow(InternalServiceError);
    });
  });

  describe("revokeToken", () => {
    it("should revoke token successfully", async () => {
      // Arrange
      const tokenId = "token-to-revoke";

      mockTokenBlacklistRepository.create.mockResolvedValue({
        id: 1,
        tokenJti: tokenId,
        userId: 1,
        expiresAt: new Date(),
        createdAt: new Date(),
      });

      // Act
      await authService.revokeToken(tokenId);

      // Assert
      expect(mockTokenBlacklistRepository.create).toHaveBeenCalledWith({
        tokenJti: tokenId,
        userId: 0,
        expiresAt: expect.any(Date),
      });
    });

    it("should throw InternalServiceError when revocation fails", async () => {
      // Arrange
      const tokenId = "token-to-revoke";
      mockTokenBlacklistRepository.create.mockRejectedValue(
        new Error("Database error"),
      );

      // Act & Assert
      await expect(
        authService.revokeToken(tokenId),
      ).rejects.toThrow(InternalServiceError);
    });
  });

  describe("isTokenRevoked", () => {
    it("should return true for revoked token", async () => {
      // Arrange
      const tokenId = "revoked-token";
      mockTokenBlacklistRepository.isBlacklisted.mockResolvedValue(true);

      // Act
      const result = await authService.isTokenRevoked(tokenId);

      // Assert
      expect(result).toBe(true);
      expect(mockTokenBlacklistRepository.isBlacklisted).toHaveBeenCalledWith(
        tokenId,
      );
    });

    it("should return false for valid token", async () => {
      // Arrange
      const tokenId = "valid-token";
      mockTokenBlacklistRepository.isBlacklisted.mockResolvedValue(false);

      // Act
      const result = await authService.isTokenRevoked(tokenId);

      // Assert
      expect(result).toBe(false);
      expect(mockTokenBlacklistRepository.isBlacklisted).toHaveBeenCalledWith(
        tokenId,
      );
    });

    it("should throw InternalServiceError when check fails", async () => {
      // Arrange
      const tokenId = "token-to-check";
      mockTokenBlacklistRepository.isBlacklisted.mockRejectedValue(
        new Error("Database error"),
      );

      // Act & Assert
      await expect(
        authService.isTokenRevoked(tokenId),
      ).rejects.toThrow(InternalServiceError);
    });
  });
});
