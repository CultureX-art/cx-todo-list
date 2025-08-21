import sequelize from './sequelize';
import { User, userSchema, userConfig } from '../models/User';
import { Task, taskSchema, taskConfig } from '../models/Task';
import logger from './logger';

// Initialize models
User.init(userSchema, {
  sequelize,
  ...userConfig,
});

Task.init(taskSchema, {
  sequelize,
  ...taskConfig,
});

// Define associations
User.hasMany(Task, {
  foreignKey: 'userId',
  as: 'tasks',
});

Task.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

export { sequelize, User, Task };

export async function initializeDatabase(): Promise<void> {
  try {
    logger.info('Initializing database connection...');
    await sequelize.authenticate();
    logger.info('Database connection established successfully.');
    
    logger.info('Starting database synchronization...');
    // Sync database (create tables if they don't exist)
    await sequelize.sync({ alter: true });
    logger.info('Database synchronized successfully.');
  } catch (error) {
    logger.error('Unable to connect to the database:', error);
    throw error;
  }
}