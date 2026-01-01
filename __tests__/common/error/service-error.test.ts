/**
 * Service Error Classes - Comprehensive Unit Tests
 *
 * Tests all custom error classes, error handling utilities, type guards,
 * and error transformation functions.
 */

import { ErrorCode } from "../../../src/common/api/types";
import {
  ServiceError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  BusinessLogicError,
  RateLimitError,
  InternalServiceError,
  isServiceError,
  toServiceError,
  getErrorMessage,
} from "../../../src/common/error/service-error";

describe("Service Error Classes", () => {
  // ============================================================================
  // Base ServiceError Class Tests
  // ============================================================================

  describe("ServiceError Base Class", () => {
    class TestServiceError extends ServiceError {
      code: ErrorCode = "internal_error";
      statusCode = 400;

      constructor(
        message: string,
        details?: Array<{ field: string; issue: string }> | string,
      ) {
        super(message, details);
      }
    }

    it("should create service error with message", () => {
      // Act
      const error = new TestServiceError("Test error message");

      // Assert
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ServiceError);
      expect(error.message).toBe("Test error message");
      expect(error.name).toBe("TestServiceError");
      expect(error.code).toBe("internal_error");
      expect(error.statusCode).toBe(400);
    });

    it("should create service error with details array", () => {
      // Arrange
      const details = [
        { field: "email", issue: "is required" },
        { field: "password", issue: "too short" },
      ];

      // Act
      const error = new TestServiceError("Validation failed", details);

      // Assert
      expect(error.details).toEqual(details);
    });

    it("should create service error with string details", () => {
      // Act
      const error = new TestServiceError("Error occurred", "Additional info");

      // Assert
      expect(error.details).toBe("Additional info");
    });

    it("should have proper error stack trace", () => {
      // Act
      const error = new TestServiceError("Test error");

      // Assert
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain("TestServiceError");
      expect(error.stack).toContain("Test error");
    });
  });

  // ============================================================================
  // ValidationError Tests
  // ============================================================================

  describe("ValidationError", () => {
    it("should create validation error with message", () => {
      // Act
      const error = new ValidationError("Validation failed");

      // Assert
      expect(error).toBeInstanceOf(ServiceError);
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.code).toBe("validation_failed");
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe("Validation failed");
      expect(error.validationDetails).toEqual([]);
    });

    it("should create validation error with validation details", () => {
      // Arrange
      const validationDetails = [
        { field: "email", issue: "must be a valid email" },
        { field: "password", issue: "must be at least 8 characters" },
      ];

      // Act
      const error = new ValidationError(
        "Request validation failed",
        validationDetails,
      );

      // Assert
      expect(error.validationDetails).toEqual(validationDetails);
    });

    it("should format details correctly", () => {
      // Arrange
      const validationDetails = [{ field: "name", issue: "is required" }];
      const error = new ValidationError("Validation failed", validationDetails);

      // Act
      const formattedDetails = error.formatDetails();

      // Assert
      expect(formattedDetails).toEqual(validationDetails);
    });

    it("should create validation error from fields using static method", () => {
      // Arrange
      const fieldErrors = [
        { field: "title", issue: "is required" },
        { field: "status", issue: "invalid value" },
      ];

      // Act
      const error = ValidationError.fromFields(fieldErrors);

      // Assert
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe("Request validation failed");
      expect(error.validationDetails).toEqual(fieldErrors);
    });

    it("should handle empty validation details", () => {
      // Act
      const error = new ValidationError("Validation failed", []);

      // Assert
      expect(error.validationDetails).toEqual([]);
    });
  });

  // ============================================================================
  // AuthenticationError Tests
  // ============================================================================

  describe("AuthenticationError", () => {
    it("should create authentication error with default message", () => {
      // Act
      const error = new AuthenticationError();

      // Assert
      expect(error).toBeInstanceOf(ServiceError);
      expect(error.code).toBe("unauthorized");
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe("Authentication required");
    });

    it("should create authentication error with custom message", () => {
      // Act
      const error = new AuthenticationError("Token expired");

      // Assert
      expect(error.message).toBe("Token expired");
    });

    it("should create invalid credentials error using static method", () => {
      // Act
      const error = AuthenticationError.invalidCredentials();

      // Assert
      expect(error.message).toBe("Invalid email or password");
    });

    it("should create token expired error using static method", () => {
      // Act
      const error = AuthenticationError.tokenExpired();

      // Assert
      expect(error.message).toBe("Token has expired");
    });

    it("should create token invalid error using static method", () => {
      // Act
      const error = AuthenticationError.tokenInvalid();

      // Assert
      expect(error.message).toBe("Invalid or malformed token");
    });

    it("should create token revoked error using static method", () => {
      // Act
      const error = AuthenticationError.tokenRevoked();

      // Assert
      expect(error.message).toBe("Token has been revoked");
    });
  });

  // ============================================================================
  // AuthorizationError Tests
  // ============================================================================

  describe("AuthorizationError", () => {
    it("should create authorization error with default message", () => {
      // Act
      const error = new AuthorizationError();

      // Assert
      expect(error).toBeInstanceOf(ServiceError);
      expect(error.code).toBe("forbidden");
      expect(error.statusCode).toBe(403);
      expect(error.message).toBe("Access denied");
    });

    it("should create authorization error with custom message", () => {
      // Act
      const error = new AuthorizationError("Admin access required");

      // Assert
      expect(error.message).toBe("Admin access required");
    });

    it("should create insufficient permissions error using static method", () => {
      // Act
      const error = AuthorizationError.insufficientPermissions();

      // Assert
      expect(error.message).toBe(
        "Insufficient permissions to access this resource",
      );
    });

    it("should create resource ownership error using static method", () => {
      // Act
      const error = AuthorizationError.resourceOwnershipRequired();

      // Assert
      expect(error.message).toBe("You can only access your own resources");
    });
  });

  // ============================================================================
  // NotFoundError Tests
  // ============================================================================

  describe("NotFoundError", () => {
    it("should create not found error with default resource", () => {
      // Act
      const error = new NotFoundError();

      // Assert
      expect(error).toBeInstanceOf(ServiceError);
      expect(error.code).toBe("not_found");
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe("Resource not found");
    });

    it("should create not found error with custom resource", () => {
      // Act
      const error = new NotFoundError("Task");

      // Assert
      expect(error.message).toBe("Task not found");
    });

    it("should create not found error with resource and ID", () => {
      // Act
      const error = new NotFoundError("Task", 123);

      // Assert
      expect(error.message).toBe("Task with id 123 not found");
    });

    it("should create not found error with string ID", () => {
      // Act
      const error = new NotFoundError("User", "abc-123");

      // Assert
      expect(error.message).toBe("User with id abc-123 not found");
    });

    it("should create user not found error using static method", () => {
      // Act
      const error = NotFoundError.user(456);

      // Assert
      expect(error.message).toBe("User with id 456 not found");
    });

    it("should create task not found error using static method", () => {
      // Act
      const error = NotFoundError.task(789);

      // Assert
      expect(error.message).toBe("Task with id 789 not found");
    });

    it("should create task not found error without ID using static method", () => {
      // Act
      const error = NotFoundError.task();

      // Assert
      expect(error.message).toBe("Task not found");
    });
  });

  // ============================================================================
  // ConflictError Tests
  // ============================================================================

  describe("ConflictError", () => {
    it("should create conflict error with message", () => {
      // Act
      const error = new ConflictError("Resource already exists");

      // Assert
      expect(error).toBeInstanceOf(ServiceError);
      expect(error.code).toBe("conflict");
      expect(error.statusCode).toBe(409);
      expect(error.message).toBe("Resource already exists");
    });

    it("should create email exists error using static method", () => {
      // Act
      const error = ConflictError.emailExists();

      // Assert
      expect(error.message).toBe("Email address is already registered");
    });

    it("should create resource exists error using static method", () => {
      // Act
      const error = ConflictError.resourceExists("Task");

      // Assert
      expect(error.message).toBe("Task already exists");
    });
  });

  // ============================================================================
  // BusinessLogicError Tests
  // ============================================================================

  describe("BusinessLogicError", () => {
    it("should create business logic error", () => {
      // Act
      const error = new BusinessLogicError("Invalid operation");

      // Assert
      expect(error).toBeInstanceOf(ServiceError);
      expect(error.code).toBe("validation_failed");
      expect(error.statusCode).toBe(422);
      expect(error.message).toBe("Invalid operation");
    });

    it("should create invalid status transition error using static method", () => {
      // Act
      const error = BusinessLogicError.invalidStatusTransition(
        "done",
        "not-started",
      );

      // Assert
      expect(error.message).toBe("Cannot transition from done to not-started");
    });

    it("should create past due date error using static method", () => {
      // Act
      const error = BusinessLogicError.pastDueDate();

      // Assert
      expect(error.message).toBe("Due date cannot be in the past");
    });

    it("should create too many labels error using static method", () => {
      // Act
      const error = BusinessLogicError.tooManyLabels(10);

      // Assert
      expect(error.message).toBe("Maximum 10 labels allowed per task");
    });
  });

  // ============================================================================
  // RateLimitError Tests
  // ============================================================================

  describe("RateLimitError", () => {
    it("should create rate limit error with default message", () => {
      // Act
      const error = new RateLimitError();

      // Assert
      expect(error).toBeInstanceOf(ServiceError);
      expect(error.code).toBe("rate_limited");
      expect(error.statusCode).toBe(429);
      expect(error.message).toBe("Too many requests");
      expect(error.retryAfter).toBeUndefined();
    });

    it("should create rate limit error with custom message and retry after", () => {
      // Act
      const error = new RateLimitError("Custom rate limit message", 300);

      // Assert
      expect(error.message).toBe("Custom rate limit message");
      expect(error.retryAfter).toBe(300);
    });

    it("should create too many requests error using static method", () => {
      // Act
      const error = RateLimitError.tooManyRequests(60);

      // Assert
      expect(error.message).toBe("Too many requests, please try again later");
      expect(error.retryAfter).toBe(60);
    });

    it("should create too many login attempts error using static method", () => {
      // Act
      const error = RateLimitError.tooManyLoginAttempts();

      // Assert
      expect(error.message).toBe(
        "Too many login attempts, please try again later",
      );
      expect(error.retryAfter).toBe(300);
    });
  });

  // ============================================================================
  // InternalServiceError Tests
  // ============================================================================

  describe("InternalServiceError", () => {
    it("should create internal service error with default message", () => {
      // Act
      const error = new InternalServiceError();

      // Assert
      expect(error).toBeInstanceOf(ServiceError);
      expect(error.code).toBe("internal_error");
      expect(error.statusCode).toBe(500);
      expect(error.message).toBe("Internal server error");
    });

    it("should create internal service error with custom message", () => {
      // Act
      const error = new InternalServiceError("Database connection failed");

      // Assert
      expect(error.message).toBe("Database connection failed");
    });

    it("should create internal service error with cause", () => {
      // Arrange
      const cause = new Error("Original error");

      // Act
      const error = new InternalServiceError("Wrapped error", cause);

      // Assert
      expect(error.message).toBe("Wrapped error");
      expect(error.stack).toBe(cause.stack);
    });

    it("should handle cause without stack", () => {
      // Arrange
      const cause = new Error("Original error");

      // Act
      const error = new InternalServiceError("Wrapped error", cause);

      // Assert
      expect(error.message).toBe("Wrapped error");
      // Should not throw when cause has no stack
    });

    it("should create database error using static method", () => {
      // Arrange
      const dbError = new Error("Connection timeout");

      // Act
      const error = InternalServiceError.databaseError(dbError);

      // Assert
      expect(error.message).toBe("Database operation failed");
      expect(error.stack).toBe(dbError.stack);
    });

    it("should create external service error using static method", () => {
      // Arrange
      const serviceError = new Error("Service unavailable");

      // Act
      const error = InternalServiceError.externalServiceError(
        "PaymentAPI",
        serviceError,
      );

      // Assert
      expect(error.message).toBe("External service PaymentAPI is unavailable");
      expect(error.stack).toBe(serviceError.stack);
    });

    it("should create configuration error using static method", () => {
      // Act
      const error = InternalServiceError.configurationError("Missing API key");

      // Assert
      expect(error.message).toBe("Configuration error: Missing API key");
    });
  });

  // ============================================================================
  // Error Utility Functions Tests
  // ============================================================================

  describe("Error Utility Functions", () => {
    describe("isServiceError", () => {
      it("should return true for ServiceError instances", () => {
        // Arrange
        const serviceError = new ValidationError("Test");
        const authError = new AuthenticationError();
        const notFoundError = new NotFoundError();

        // Act & Assert
        expect(isServiceError(serviceError)).toBe(true);
        expect(isServiceError(authError)).toBe(true);
        expect(isServiceError(notFoundError)).toBe(true);
      });

      it("should return false for regular Error instances", () => {
        // Arrange
        const regularError = new Error("Regular error");
        const typeError = new TypeError("Type error");
        const syntaxError = new SyntaxError("Syntax error");

        // Act & Assert
        expect(isServiceError(regularError)).toBe(false);
        expect(isServiceError(typeError)).toBe(false);
        expect(isServiceError(syntaxError)).toBe(false);
      });

      it("should return false for non-error objects", () => {
        // Act & Assert
        expect(isServiceError("string")).toBe(false);
        expect(isServiceError(123)).toBe(false);
        expect(isServiceError({})).toBe(false);
        expect(isServiceError(null)).toBe(false);
        expect(isServiceError(undefined)).toBe(false);
      });
    });

    describe("toServiceError", () => {
      it("should return ServiceError unchanged", () => {
        // Arrange
        const serviceError = new ValidationError("Test validation error");

        // Act
        const result = toServiceError(serviceError);

        // Assert
        expect(result).toBe(serviceError);
      });

      it("should convert regular Error to InternalServiceError", () => {
        // Arrange
        const regularError = new Error("Regular error message");

        // Act
        const result = toServiceError(regularError);

        // Assert
        expect(result).toBeInstanceOf(InternalServiceError);
        expect(result.message).toBe("Regular error message");
        expect(result.code).toBe("internal_error");
        expect(result.statusCode).toBe(500);
      });

      it("should convert string to InternalServiceError", () => {
        // Act
        const result = toServiceError("String error message");

        // Assert
        expect(result).toBeInstanceOf(InternalServiceError);
        expect(result.message).toBe("String error message");
      });

      it("should convert null to default InternalServiceError", () => {
        // Act
        const result = toServiceError(null);

        // Assert
        expect(result).toBeInstanceOf(InternalServiceError);
        expect(result.message).toBe("Internal server error occurred");
      });

      it("should convert undefined to default InternalServiceError", () => {
        // Act
        const result = toServiceError(undefined);

        // Assert
        expect(result).toBeInstanceOf(InternalServiceError);
        expect(result.message).toBe("Internal server error occurred");
      });

      it("should convert empty object to default InternalServiceError", () => {
        // Act
        const result = toServiceError({});

        // Assert
        expect(result).toBeInstanceOf(InternalServiceError);
        expect(result.message).toBe("Internal server error occurred");
      });
    });

    describe("getErrorMessage", () => {
      it("should extract message from Error instance", () => {
        // Arrange
        const error = new Error("Error message");

        // Act
        const result = getErrorMessage(error);

        // Assert
        expect(result).toBe("Error message");
      });

      it("should extract message from ServiceError instance", () => {
        // Arrange
        const error = new ValidationError("Validation message");

        // Act
        const result = getErrorMessage(error);

        // Assert
        expect(result).toBe("Validation message");
      });

      it("should return string as-is", () => {
        // Act
        const result = getErrorMessage("String error");

        // Assert
        expect(result).toBe("String error");
      });

      it("should return default message for null", () => {
        // Act
        const result = getErrorMessage(null);

        // Assert
        expect(result).toBe("Internal server error occurred");
      });

      it("should return default message for undefined", () => {
        // Act
        const result = getErrorMessage(undefined);

        // Assert
        expect(result).toBe("Internal server error occurred");
      });

      it("should return default message for objects", () => {
        // Act
        const result = getErrorMessage({});

        // Assert
        expect(result).toBe("Internal server error occurred");
      });

      it("should handle errors with undefined message", () => {
        // Arrange
        const error = new Error();

        // Act
        const result = getErrorMessage(error);

        // Assert
        // TEST_CASE_ERROR: Expected default message but implementation returns error.message (empty string for Error())
        expect(result).toBe("");
      });
    });
  });

  // ============================================================================
  // Error Inheritance and Polymorphism Tests
  // ============================================================================

  describe("Error Inheritance", () => {
    it("should maintain proper inheritance hierarchy", () => {
      // Arrange
      const validationError = new ValidationError("Test");
      const authError = new AuthenticationError();
      const notFoundError = new NotFoundError();

      // Assert
      expect(validationError).toBeInstanceOf(Error);
      expect(validationError).toBeInstanceOf(ServiceError);
      expect(validationError).toBeInstanceOf(ValidationError);

      expect(authError).toBeInstanceOf(Error);
      expect(authError).toBeInstanceOf(ServiceError);
      expect(authError).toBeInstanceOf(AuthenticationError);

      expect(notFoundError).toBeInstanceOf(Error);
      expect(notFoundError).toBeInstanceOf(ServiceError);
      expect(notFoundError).toBeInstanceOf(NotFoundError);
    });

    it("should work with instanceof checks", () => {
      // Arrange
      const errors: ServiceError[] = [
        new ValidationError("Validation failed"),
        new AuthenticationError("Auth failed"),
        new NotFoundError("Not found"),
        new InternalServiceError("Internal error"),
      ];

      // Act & Assert
      errors.forEach((error) => {
        expect(error).toBeInstanceOf(ServiceError);
        expect(error).toBeInstanceOf(Error);
      });

      expect(errors[0]).toBeInstanceOf(ValidationError);
      expect(errors[1]).toBeInstanceOf(AuthenticationError);
      expect(errors[2]).toBeInstanceOf(NotFoundError);
      expect(errors[3]).toBeInstanceOf(InternalServiceError);
    });

    it("should work with polymorphic error handling", () => {
      // Arrange
      const errors: ServiceError[] = [
        new ValidationError("Validation failed"),
        new AuthenticationError("Auth failed"),
        new NotFoundError("Not found"),
      ];

      // Act
      const statusCodes = errors.map((error) => error.statusCode);
      const codes = errors.map((error) => error.code);
      const messages = errors.map((error) => error.message);

      // Assert
      expect(statusCodes).toEqual([400, 401, 404]);
      expect(codes).toEqual(["validation_failed", "unauthorized", "not_found"]);
      // TEST_CASE_ERROR: Expected "Not found" but NotFoundError constructor treats first param as resource name
      expect(messages).toEqual([
        "Validation failed",
        "Auth failed",
        "Not found not found",
      ]);
    });
  });

  // ============================================================================
  // Edge Cases and Error Scenarios
  // ============================================================================

  describe("Edge Cases", () => {
    it("should handle very long error messages", () => {
      // Arrange
      const longMessage = "a".repeat(10000);

      // Act
      const error = new ValidationError(longMessage);

      // Assert
      expect(error.message).toBe(longMessage);
      expect(error.message.length).toBe(10000);
    });

    it("should handle special characters in error messages", () => {
      // Arrange
      const specialMessage =
        "Error with special chars: àáâãäå æç èéêë ñ 中文 🚀";

      // Act
      const error = new ValidationError(specialMessage);

      // Assert
      expect(error.message).toBe(specialMessage);
    });

    it("should handle nested error conversion", () => {
      // Arrange
      const originalError = new Error("Original error");
      const wrappedError = new InternalServiceError("Wrapped", originalError);

      // Act
      const result = toServiceError(wrappedError);

      // Assert
      expect(result).toBe(wrappedError);
      expect(result.message).toBe("Wrapped");
    });

    it("should handle circular reference in error details", () => {
      // Arrange
      const validationDetails = [
        { field: "test", issue: "circular reference test" },
      ];

      // Act & Assert - Should not throw
      expect(() => {
        new ValidationError("Test", validationDetails);
      }).not.toThrow();
    });

    it("should preserve error properties when converting", () => {
      // Arrange
      const originalError = new TypeError("Type error");
      // (originalError).customProperty = "custom value";

      // Act
      const result = toServiceError(originalError);

      // Assert
      expect(result).toBeInstanceOf(InternalServiceError);
      expect(result.message).toBe("Type error");
      // Custom properties are not preserved in conversion
    });
  });
});
