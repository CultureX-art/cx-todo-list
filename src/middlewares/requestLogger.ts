import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';

interface AuthenticatedRequest extends Request {
  user?: { id: string; userId: string; email: string };
}

export function requestLogger(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const start = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  
  // Log incoming request
  logger.info('Incoming request', {
    requestId,
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.user?.id || req.user?.userId,
    contentType: req.get('Content-Type')
  });

  // Log request body for non-GET requests (excluding sensitive data)
  if (req.method !== 'GET' && req.body) {
    const sanitizedBody = { ...req.body };
    
    // Remove sensitive fields
    if (sanitizedBody.password) sanitizedBody.password = '[REDACTED]';
    if (sanitizedBody.passwordHash) sanitizedBody.passwordHash = '[REDACTED]';
    if (sanitizedBody.token) sanitizedBody.token = '[REDACTED]';
    
    logger.debug('Request body', { requestId, body: sanitizedBody });
  }
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    // Determine log level based on status code
    const logLevel = res.statusCode >= 500 ? 'error' : 
                     res.statusCode >= 400 ? 'warn' : 'info';
    
    logger[logLevel]('Request completed', {
      requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.id || req.user?.userId,
      responseSize: res.get('Content-Length') || 'unknown'
    });
    
    // Log slow requests at higher level
    if (duration > 1000) {
      logger.warn('Slow request detected', {
        requestId,
        method: req.method,
        url: req.originalUrl,
        duration: `${duration}ms`,
        userId: req.user?.id || req.user?.userId
      });
    }
  });
  
  next();
}

export default requestLogger;