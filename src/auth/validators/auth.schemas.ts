/**
 * Authentication Validation Schemas using Zod
 *
 * These schemas define runtime validation for authentication endpoints.
 */

import { z } from "zod";

// ============================================================================
// REQUEST VALIDATION SCHEMAS
// ============================================================================

/**
 * User signup validation schema
 */
export const signupSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .max(255, "Email must be less than 255 characters")
    .email("Invalid email format")
    .toLowerCase(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be less than 128 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number",
    ),
});

/**
 * User login validation schema
 */
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email format")
    .toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

/**
 * JWT token validation schema
 */
export const jwtPayloadSchema = z.object({
  sub: z
    .number()
    .int("User ID must be an integer")
    .positive("User ID must be positive"),
  email: z.string().email("Invalid email format"),
  iat: z.number().int("Issued at must be an integer"),
  exp: z.number().int("Expires at must be an integer"),
  jti: z.string().min(1, "JWT ID is required"),
  iss: z.string().min(1, "Issuer is required"),
  aud: z.string().min(1, "Audience is required"),
});

// ============================================================================
// TYPE INFERENCE
// ============================================================================

/**
 * Inferred types from Zod schemas
 */
export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type JwtPayloadInput = z.infer<typeof jwtPayloadSchema>;

// ============================================================================
// CUSTOM VALIDATORS
// ============================================================================

/**
 * Custom validation functions for auth business logic
 */
export const authValidators = {
  /**
   * Check if password meets strength requirements
   */
  isStrongPassword: (password: string): boolean => {
    return (
      password.length >= 8 &&
      /[a-z]/.test(password) &&
      /[A-Z]/.test(password) &&
      /\d/.test(password)
    );
  },

  /**
   * Validate email domain (if domain restrictions needed)
   */
  isAllowedEmailDomain: (): boolean => {
    // For now, allow all domains
    // Could add domain whitelist/blacklist logic here
    return true;
  },

  /**
   * Check if email is not in disposable email list
   */
  isNotDisposableEmail: (email: string): boolean => {
    const disposableDomains = [
      "10minutemail.com",
      "guerrillamail.com",
      "mailinator.com",
      "tempmail.org",
    ];

    const domain = email.split("@")[1]?.toLowerCase();
    return domain !== undefined && !disposableDomains.includes(domain);
  },
};

// ============================================================================
// EXTENDED SCHEMAS WITH BUSINESS LOGIC
// ============================================================================

/**
 * Enhanced signup schema with business validation
 */
export const signupSchemaExtended = signupSchema
  .refine(
    (data) => {
      void data; // Suppress unused variable warning
      return authValidators.isAllowedEmailDomain();
    },
    {
      message: "Email domain is not allowed",
      path: ["email"],
    },
  )
  .refine((data) => authValidators.isNotDisposableEmail(data.email), {
    message: "Disposable email addresses are not allowed",
    path: ["email"],
  });
