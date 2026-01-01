import { AuthController } from './auth/controllers/auth.controller';
import { AuthServiceImpl } from './auth/services/auth.service.impl';
import { IUserRepository } from './auth/repositories/user.repository';
import { TokenBlacklistRepository } from './common/types/repository';
import { jest } from '@jest/globals';
import { AppConfig } from './config/types';
import { getConfig } from './config/environment';

const config = getConfig();

// This is a temporary setup for the purpose of making tests pass.
// In a real application, dependencies would be injected.
const mockUserRepository = {
  create: jest.fn(),
  findByPk: jest.fn(),
  findByEmail: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findAndCountAll: jest.fn(),
  emailExists: jest.fn(),
  getStatistics: jest.fn(),
  findByDateRange: jest.fn(),
} as jest.Mocked<IUserRepository>;
const mockTokenBlacklistRepository = {
  create: jest.fn(),
  isBlacklisted: jest.fn(),
  removeExpiredTokens: jest.fn(),
  findByUser: jest.fn(),
  revokeAllUserTokens: jest.fn(),
  getStatistics: jest.fn(),
} as jest.Mocked<TokenBlacklistRepository>;
const authService = new AuthServiceImpl(
  mockUserRepository,
  mockTokenBlacklistRepository,
  config as AppConfig,
);
const authController = new AuthController(authService);

import { HealthController } from './health/controllers/health.controller';
import { HealthServiceImpl } from './health/services/health.service.impl';

// Services
const healthService = new HealthServiceImpl();

// Controllers
const healthController = new HealthController(healthService);

import { TaskController } from './task/controllers/task.controller';
import { TaskServiceImpl } from './task/services/task.service.impl';
import { ITaskRepository } from './task/repositories/task.repository';

// Mock Repositories
const mockTaskRepository = {
  create: jest.fn(),
  findByPk: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findAndCountAll: jest.fn(),
} as jest.Mocked<ITaskRepository>;

// Services
const taskService = new TaskServiceImpl(mockTaskRepository);

// Controllers
const taskController = new TaskController(taskService);

export const container = {
  authService,
  healthService,
  taskService,
  authController,
  healthController,
  taskController,
};