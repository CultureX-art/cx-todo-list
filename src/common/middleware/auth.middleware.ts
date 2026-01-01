/**
 * Authentication Middleware
 *
 * This module provides middleware for authenticating requests using JWT.
 */

import { Request, Response, NextFunction } from 'express';
import { container } from '../../container';
import { AuthenticationError } from '../error/service-error';

const authService = container.authService;

export const authenticationMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw AuthenticationError.invalidToken();
    }

    const token = authHeader.substring(7);
    const userPayload = await authService.validateToken(token, {
      correlationId: req.correlationId,
      timestamp: new Date(),
    });

    req.user = userPayload;
    next();
  } catch (error) {
    next(error);
  }
};