/**
 * Authentication Controller
 * Handles HTTP requests for authentication endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { AuthRequest, AuthResponse } from '../types';
import logger from '../config/logger';

/**
 * Handle user signup
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next middleware function
 * 
 * @description
 * - Extracts email and password from request body
 * - Delegates to authService.signup()
 * - Returns 201 with user object and token on success
 * - Passes errors to error handler middleware
 */
async function signup(
  req: Request<{}, AuthResponse, AuthRequest>,
  res: Response<AuthResponse>,
  next: NextFunction
): Promise<void> {
  try {
    logger.info('User signup attempt', { email: req.body.email });
    const { email, password } = req.body;
    
    // Input validation
    if (!email || !password) {
      logger.warn('Signup failed: Missing email or password', { email });
      res.status(400).json({
        error: 'Email and password are required'
      } as any);
      return;
    }

    // Delegate to service layer
    const result = await authService.signup(email, password);
    logger.info('User signup successful', { email, userId: result.user.id });
    
    res.status(201).json(result);
  } catch (error) {
    logger.error('Signup error:', error);
    next(error);
  }
}

/**
 * Handle user login
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next middleware function
 * 
 * @description
 * - Extracts email and password from request body
 * - Delegates to authService.login()
 * - Returns 200 with user object and token on success
 * - Passes errors to error handler middleware
 */
async function login(
  req: Request<{}, AuthResponse, AuthRequest>,
  res: Response<AuthResponse>,
  next: NextFunction
): Promise<void> {
  try {
    logger.info('User login attempt', { email: req.body.email });
    const { email, password } = req.body;
    
    // Input validation
    if (!email || !password) {
      logger.warn('Login failed: Missing email or password', { email });
      res.status(400).json({
        error: 'Email and password are required'
      } as any);
      return;
    }

    // Delegate to service layer
    const result = await authService.login(email, password);
    logger.info('User login successful', { email, userId: result.user.id });
    
    res.status(200).json(result);
  } catch (error) {
    logger.error('Login error:', error);
    next(error);
  }
}

// Import auth service (this would need to be typed as well)
const authService = require('../services/authService');

export {
  signup,
  login
};