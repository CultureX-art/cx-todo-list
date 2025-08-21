/**
 * Service layer type definitions
 * These interfaces define the expected structure of service layer responses
 */

import { User, Task, AuthResponse, PaginatedResponse } from './index';

// Auth Service Types
export interface IAuthService {
  signup(email: string, password: string): Promise<AuthResponse>;
  login(email: string, password: string): Promise<AuthResponse>;
}

// Task Service Types
export interface TaskFilters {
  status?: string;
  search?: string;
  priority?: string;
  page?: number;
  limit?: number;
}

export interface ITaskService {
  getTasks(userId: string, filters: TaskFilters): Promise<PaginatedResponse<Task>>;
  createTask(userId: string, taskData: any): Promise<Task>;
  updateTask(userId: string, taskId: string, updates: any): Promise<Task>;
  deleteTask(userId: string, taskId: string): Promise<void>;
}

// User Service Types
export interface IUserService {
  getCurrentUser(userId: string): Promise<User>;
}

// Repository Types (for reference)
export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  create(userData: any): Promise<User>;
  updateLastLogin(userId: string): Promise<void>;
  findById(id: string): Promise<User | null>;
}

export interface ITaskRepository {
  findByUserId(userId: string, filters?: any): Promise<Task[]>;
  create(taskData: any): Promise<Task>;
  update(taskId: string, updates: any): Promise<Task>;
  delete(taskId: string): Promise<void>;
  findByIdAndUserId(taskId: string, userId: string): Promise<Task | null>;
}