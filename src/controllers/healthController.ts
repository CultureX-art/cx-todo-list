import { Request, Response } from 'express';
import { checkHealth } from '../services/healthService';
import logger from '../config/logger';

export async function getHealth(_req: Request, res: Response): Promise<void> {
  try {
    logger.debug('Health check requested');
    
    const healthStatus = await checkHealth();
    
    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
    
    if (statusCode === 200) {
      logger.debug('Health check passed', { 
        status: healthStatus.status,
        databaseConnected: healthStatus.database.connected
      });
    } else {
      logger.warn('Health check failed', { 
        status: healthStatus.status,
        databaseConnected: healthStatus.database.connected,
        databaseError: healthStatus.database.error
      });
    }
    
    res.status(statusCode).json(healthStatus);
  } catch (error) {
    logger.error('Health check error', { 
      error: (error as Error).message,
      stack: (error as Error).stack
    });
    
    res.status(500).json({
      status: 'unhealthy',
      error: 'Failed to check health status',
      timestamp: new Date().toISOString()
    });
  }
}