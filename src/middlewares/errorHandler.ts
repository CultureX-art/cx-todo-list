import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';

export interface AppError extends Error {
  status?: number;
  statusCode?: number;
}

export interface ErrorResponse {
  error: {
    message: string;
    status: number;
    stack?: string;
  };
}

export function errorHandler(
  err: AppError, 
  req: Request, 
  res: Response, 
  next: NextFunction
): void {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  // Log error with appropriate level based on status code
  if (status >= 500) {
    logger.error(`Server Error ${status}: ${message}`, { stack: err.stack, url: req.url, method: req.method });
  } else if (status >= 400) {
    logger.warn(`Client Error ${status}: ${message}`, { url: req.url, method: req.method });
  } else {
    logger.info(`HTTP ${status}: ${message}`, { url: req.url, method: req.method });
  }
  
  const errorResponse: ErrorResponse = {
    error: {
      message,
      status,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  };

  res.status(status).json(errorResponse);
}

export default errorHandler;