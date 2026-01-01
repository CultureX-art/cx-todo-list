/**
 * Authentication Service Implementation
 *
 * Production-ready implementation following TDD principles.
 */

import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { IAuthService } from "./auth.service";
import type {
  SignupRequest,
  SignupResponse,
  LoginRequest,
  LoginResponse,
  UserProfile,
  JwtPayload,
} from "../api/types";
import type { ServiceContext } from "../../common/types/service";
import type { IUserRepository } from "../repositories/user.repository";
import type { TokenBlacklistRepository } from "../../common/types/repository";
import type { AppConfig } from "../../config/types";
import {
  ValidationError,
  ConflictError,
  AuthenticationError,
  InternalServiceError,
} from "../../common/error/service-error";

export class AuthServiceImpl implements IAuthService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly tokenBlacklistRepository: TokenBlacklistRepository,
    private readonly config: AppConfig,
  ) {}

  async signup(
    request: SignupRequest
  ): Promise<SignupResponse> {
    try {
      // Validate input
      this.validateSignupRequest(request);

      // Check if email already exists
      const emailExists = await this.userRepository.emailExists(request.email);
      if (emailExists) {
        throw new ConflictError("Email already exists");
      }

      // Hash password
      const saltRounds = this.config.auth.password.saltRounds || 10;
      const passwordHash = await bcrypt.hash(request.password, saltRounds);

      // Create user
      const userData = {
        email: request.email,
        passwordHash,
      };

      const createdUser = await this.userRepository.create(userData);

      // Return signup response
      return {
        id: createdUser.id,
        email: createdUser.email,
        createdAt: createdUser.createdAt.toISOString(),
      };
    } catch (error) {
      if (error instanceof ValidationError || error instanceof ConflictError) {
        throw error;
      }
      
      throw new InternalServiceError(
        `Signup failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async login(
    request: LoginRequest
  ): Promise<LoginResponse> {
    try {
      // Validate input
      if (!request.email || !request.password) {
        throw new ValidationError("Email and password are required");
      }

      // Find user by email
      const user = await this.userRepository.findByEmail(request.email);
      if (!user) {
        throw new AuthenticationError("Invalid credentials");
      }

      // Check if user is soft-deleted
      if (user.deletedAt) {
        throw new AuthenticationError("User account not found");
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(request.password, user.passwordHash);
      if (!isPasswordValid) {
        throw new AuthenticationError("Invalid credentials");
      }

      // Generate JWT token
      const token = await this.generateToken(user.id, user.email);

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          createdAt: user.createdAt.toISOString(),
        },
        expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour
      };
    } catch (error) {
      if (error instanceof ValidationError || error instanceof AuthenticationError) {
        throw error;
      }
      
      throw new InternalServiceError(
        `Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async getUserProfile(
    userId: number
  ): Promise<UserProfile | null> {
    try {
      // Validate user ID
      if (!Number.isInteger(userId) || userId <= 0) {
        throw new ValidationError("Invalid user ID");
      }

      const user = await this.userRepository.findByPk(userId);
      if (!user || user.deletedAt) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt.toISOString(),
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      
      throw new InternalServiceError(
        `Failed to get user profile: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async validateToken(
    token: string
  ): Promise<JwtPayload> {
    try {
      if (!token) {
        throw new AuthenticationError("Token is required");
      }

      // Verify JWT token  
      const decoded = jwt.verify(token, this.config.auth.jwt.secret);
      
      if (typeof decoded === 'string') {
        throw new AuthenticationError("Invalid token format");
      }
      
      // Validate required fields exist
      if (!decoded.sub || !decoded['email'] || !decoded.jti) {
        throw new AuthenticationError("Invalid token payload");
      }
      
      // Type assertion after validation
      const jwtPayload = decoded as unknown as JwtPayload;
      
      // Check if token is blacklisted
      const isBlacklisted = await this.tokenBlacklistRepository.isBlacklisted(jwtPayload.jti);
      if (isBlacklisted) {
        throw new AuthenticationError("Token has been revoked");
      }

      return jwtPayload;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthenticationError("Invalid token");
      }
      
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthenticationError("Token has expired");
      }

      if (error instanceof AuthenticationError) {
        throw error;
      }
      
      throw new InternalServiceError(
        `Token validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async generateToken(
    userId: number,
    email: string
  ): Promise<string> {
    try {
      const payload: JwtPayload = {
        sub: userId,
        email,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
        iss: this.config.auth.jwt.issuer || "todo-api",
        aud: this.config.auth.jwt.audience || "todo-app",
        jti: this.generateTokenId(),
      };

      return jwt.sign(payload, this.config.auth.jwt.secret, {
        algorithm: this.config.auth.jwt.algorithm || "HS256",
      });
    } catch (error) {
      throw new InternalServiceError(
        `Token generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async revokeToken(tokenId: string): Promise<void> {
    try {
      if (!tokenId) {
        throw new ValidationError("Token ID is required");
      }

      await this.tokenBlacklistRepository.create({
        tokenJti: tokenId,
        userId: 0, // Will be extracted from token in production
        expiresAt: new Date(Date.now() + 3600000)
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      
      throw new InternalServiceError(
        `Token revocation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async isTokenRevoked(
    tokenId: string
  ): Promise<boolean> {
    try {
      if (!tokenId) {
        throw new ValidationError("Token ID is required");
      }

      return await this.tokenBlacklistRepository.isBlacklisted(tokenId);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      
      throw new InternalServiceError(
        `Token revocation check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // Private helper methods
  private validateSignupRequest(request: SignupRequest): void {
    if (!request.email) {
      throw new ValidationError("Email is required");
    }

    if (request.email.length > 255) {
      throw new ValidationError("Email is too long");
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(request.email)) {
      throw new ValidationError("Invalid email format");
    }

    if (!request.password) {
      throw new ValidationError("Password is required");
    }

    if (request.password.length < 8) {
      throw new ValidationError("Password must be at least 8 characters");
    }

    // Password strength validation
    const hasUppercase = /[A-Z]/.test(request.password);
    const hasLowercase = /[a-z]/.test(request.password);
    const hasNumber = /\d/.test(request.password);

    if (!hasUppercase) {
      throw new ValidationError("Password must contain at least one uppercase letter");
    }

    if (!hasLowercase) {
      throw new ValidationError("Password must contain at least one lowercase letter");
    }

    if (!hasNumber) {
      throw new ValidationError("Password must contain at least one number");
    }
  }

  private generateTokenId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}