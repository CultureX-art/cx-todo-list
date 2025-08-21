import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

export interface ValidationError {
  field: string;
  message: string;
}

export interface SignupRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

const signupSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Email must be a valid email address',
      'string.empty': 'Email is required',
      'any.required': 'Email is required'
    }),
  password: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\\$%\\^&\\*])'))
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
      'string.empty': 'Password is required',
      'any.required': 'Password is required'
    })
});

const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Email must be a valid email address',
      'string.empty': 'Email is required',
      'any.required': 'Email is required'
    }),
  password: Joi.string()
    .required()
    .messages({
      'string.empty': 'Password is required',
      'any.required': 'Password is required'
    })
});

function formatValidationErrors(error: Joi.ValidationError): ValidationError[] {
  return error.details.map(detail => ({
    field: detail.path.join('.'),
    message: detail.message
  }));
}

export function validateSignup(req: Request, res: Response, next: NextFunction): void {
  const { error } = signupSchema.validate(req.body, { abortEarly: false });
  
  if (error) {
    const validationErrors = formatValidationErrors(error);
    res.status(400).json({
      error: {
        message: 'Validation failed',
        status: 400,
        details: validationErrors
      }
    });
    return;
  }
  
  next();
}

export function validateLogin(req: Request, res: Response, next: NextFunction): void {
  const { error } = loginSchema.validate(req.body, { abortEarly: false });
  
  if (error) {
    const validationErrors = formatValidationErrors(error);
    res.status(400).json({
      error: {
        message: 'Validation failed',
        status: 400,
        details: validationErrors
      }
    });
    return;
  }
  
  next();
}

export default {
  validateSignup,
  validateLogin
};