import {
  SignupRequest,
  LoginRequest,
  UserProfile,
  JwtPayload,
  AuthenticatedUser,
} from '../../src/auth/api/types';
import {
  CreateTaskRequest,
  UpdateTaskRequest,
} from '../../src/task/dto/task.dto';
import { Task } from '../../src/task/models/task';
import { ServiceContext } from '../../src/common/types/service';
import { PaginatedResponse } from '../../src/common/api/types';

export class TestFixtures {
  static createSignupRequest(
    overrides: Partial<SignupRequest> = {},
  ): SignupRequest {
    return {
      email: 'user@example.com',
      password: 'SecurePass123',
      ...overrides,
    };
  }

  static createLoginRequest(
    overrides: Partial<LoginRequest> = {},
  ): LoginRequest {
    return {
      email: 'user@example.com',
      password: 'SecurePass123',
      ...overrides,
    };
  }

  static createUserProfile(overrides: Partial<UserProfile> = {}): UserProfile {
    return {
      id: 1,
      email: 'user@example.com',
      createdAt: '2024-01-01T00:00:00.000Z',
      ...overrides,
    };
  }

  static createJwtPayload(overrides: Partial<JwtPayload> = {}): JwtPayload {
    return {
      sub: 1,
      email: 'user@example.com',
      iat: 1640995200,
      exp: 1641081600,
      jti: 'token-id',
      iss: 'todo-api',
      aud: 'todo-app',
      ...overrides,
    };
  }

  static createAuthenticatedUser(): AuthenticatedUser {
    return {
      id: 1,
      email: 'user@example.com',
      jti: 'token-id',
    };
  }

  static createUserAttributes(
    overrides: Partial<{
      id: number;
      email: string;
      passwordHash: string;
      createdAt: Date;
      updatedAt: Date;
      deletedAt: Date | null;
    }> = {},
  ): {
    id: number;
    email: string;
    passwordHash: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  } {
    return {
      id: 1,
      email: 'user@example.com',
      passwordHash: '$2b$12$hashedPasswordMock',
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      deletedAt: null,
      ...overrides,
    };
  }

  static createTaskRequest(
    overrides: Partial<CreateTaskRequest> = {},
  ): CreateTaskRequest {
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return {
      title: 'Complete project documentation',
      description: 'Write comprehensive API documentation for the todo service',
      dueDate: futureDate.toISOString(),
      status: 'todo',
      labels: ['documentation', 'api'],
      ...overrides,
    };
  }

  static createUpdateTaskRequest(
    overrides: Partial<UpdateTaskRequest> = {},
  ): UpdateTaskRequest {
    return {
      title: 'Updated task title',
      description: 'Updated task description',
      status: 'in-progress',
      labels: ['updated'],
      ...overrides,
    };
  }

  static createTask(overrides: Partial<Task> = {}): Task {
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return {
      id: 1,
      userId: 1,
      title: 'Complete project documentation',
      description: 'Write comprehensive API documentation for the todo service',
      dueDate: futureDate,
      status: 'todo',
      labels: ['documentation', 'api'],
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      ...overrides,
    };
  }

  static createTaskListResponse(
    tasks: Task[],
    page: number = 1,
    limit: number = 20,
  ): PaginatedResponse<Task> {
    const total = tasks.length;
    const totalPages = Math.ceil(total / limit);

    return {
      data: tasks,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      correlationId: 'test-correlation-id',
      message: 'Tasks retrieved successfully',
      timestamp: new Date().toISOString(),
    };
  }

  static createServiceContext(
    overrides: Partial<ServiceContext> = {},
  ): ServiceContext {
    return {
      user: { id: 1, email: 'user@example.com' },
      correlationId: 'test-correlation-id',
      timestamp: new Date('2024-01-01T00:00:00.000Z'),
      ...overrides,
    };
  }
}
