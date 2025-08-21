/**
 * User Controller
 * Handles HTTP requests for user-related endpoints
 */

import { Response, NextFunction } from 'express';
import { User, AuthenticatedRequest } from '../types';
import logger from '../config/logger';

/**
 * Get current authenticated user profile
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next middleware function
 * 
 * @description
 * - Gets userId from req.user (set by auth middleware)
 * - Delegates to userService.getCurrentUser()
 * - Returns 200 with user profile (without password)
 */
async function getCurrentUser(
  req: AuthenticatedRequest,
  res: Response<User>,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user.id;
    
    logger.info('Fetching current user profile', { userId });
    
    // Delegate to service layer
    const user = await userService.getCurrentUser(userId);
    
    // Ensure password hash is not included in response
    if (user) {
      const { passwordHash, ...userWithoutPassword } = user as any;
      
      logger.info('User profile retrieved successfully', { 
        userId, 
        email: user.email,
        isActive: user.isActive
      });
      
      res.status(200).json(userWithoutPassword);
    } else {
      logger.warn('User profile not found', { userId });
      res.status(404).json({
        error: 'User not found'
      } as any);
    }
  } catch (error) {
    logger.error('Error fetching user profile', { 
      userId: req.user?.id, 
      error: (error as Error).message,
      stack: (error as Error).stack
    });
    next(error);
  }
}

// Import user service (this would need to be typed as well)
const userService = require('../services/userService');

export {
  getCurrentUser
};