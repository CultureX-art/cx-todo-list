import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

import app from './app';
import { initializeDatabase } from './config/initializeDatabase';
import logger from './config/logger';

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    logger.info('Starting server initialization...');
    
    // Initialize database connection and models
    await initializeDatabase();
    
    // Start the server
    const server = app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.debug('Server startup completed successfully');
    });

    return server;
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer().then(server => {
  process.on('SIGTERM', () => {
    logger.info('SIGTERM signal received: closing HTTP server');
    server.close(() => {
      logger.info('HTTP server closed');
    });
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT signal received: closing HTTP server');
    server.close(() => {
      logger.info('HTTP server closed');
    });
  });
}).catch(error => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});