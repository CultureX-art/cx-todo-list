import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/jwtUtils';
import logger from '../config/logger';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  try {
    logger.debug(`Authentication attempt for ${req.method} ${req.path}`);
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn(`Authentication failed: Missing or invalid authorization header for ${req.method} ${req.path}`);
      res.status(401).json({
        error: {
          message: 'Access token is required',
          status: 401
        }
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!token) {
      logger.warn(`Authentication failed: Empty token for ${req.method} ${req.path}`);
      res.status(401).json({
        error: {
          message: 'Access token is required',
          status: 401
        }
      });
      return;
    }

    try {
      const decoded = verifyToken(token);
      req.user = decoded;
      logger.debug(`Authentication successful for user ${decoded.userId} on ${req.method} ${req.path}`);
      next();
    } catch (tokenError) {
      logger.warn(`Authentication failed: Invalid token for ${req.method} ${req.path}`, { error: tokenError });
      res.status(401).json({
        error: {
          message: 'Invalid or expired token',
          status: 401
        }
      });
      return;
    }
  } catch (error) {
    logger.error(`Authentication error for ${req.method} ${req.path}:`, error);
    res.status(500).json({
      error: {
        message: 'Internal server error during authentication',
        status: 500
      }
    });
    return;
  }
}

export default authenticate;