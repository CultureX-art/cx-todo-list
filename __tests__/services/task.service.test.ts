import { jest } from '@jest/globals';
import { TaskServiceImpl } from '../../src/task/services/task.service.impl';
import { ITaskRepository } from '../../src/task/repositories/task.repository';
import {
  CreateTaskRequest,
  UpdateTaskRequest,
} from '../../src/task/dto/task.dto';
import {
  BusinessLogicError,
  NotFoundError,
} from '../../src/common/error/service-error';
import { TestFixtures } from '../helpers/test-fixtures';
import { Task } from '../../src/task/models/task';

describe('TaskServiceImpl', () => {
  let taskService: TaskServiceImpl;
  let mockRepository: jest.Mocked<ITaskRepository>;
  const userId = 1;

  beforeEach(() => {
    mockRepository = {
      create: jest.fn(),
      findByPk: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findAndCountAll: jest.fn(),
    } as jest.Mocked<ITaskRepository>;

    taskService = new TaskServiceImpl(mockRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createTask', () => {
    it('should create task successfully', async () => {
      const request: CreateTaskRequest = { title: 'Test Task' };
      const expectedTask = TestFixtures.createTask();
      mockRepository.create.mockResolvedValue(expectedTask);

      const result = await taskService.createTask(userId, request);

      expect(result).toEqual(expectedTask);
      expect(mockRepository.create).toHaveBeenCalledWith({
        ...request,
        userId,
      });
    });

    it('should throw BusinessLogicError for past due date', async () => {
      const request: CreateTaskRequest = {
        title: 'Test Task',
        dueDate: '2020-01-01T00:00:00.000Z',
      };

      await expect(taskService.createTask(userId, request)).rejects.toThrow(
        BusinessLogicError,
      );
    });
  });

  describe('getTaskById', () => {
    it('should return task if found and belongs to user', async () => {
      const task = TestFixtures.createTask({ userId });
      mockRepository.findByPk.mockResolvedValue(task);

      const result = await taskService.getTaskById(userId, task.id);

      expect(result).toEqual(task);
    });

    it('should return null if task not found', async () => {
      mockRepository.findByPk.mockResolvedValue(null);
      const result = await taskService.getTaskById(userId, 999);
      expect(result).toBeNull();
    });

    it('should return null if task does not belong to user', async () => {
      const task = TestFixtures.createTask({ userId: 2 });
      mockRepository.findByPk.mockResolvedValue(task);
      const result = await taskService.getTaskById(userId, task.id);
      expect(result).toBeNull();
    });
  });

  describe('updateTask', () => {
    it('should update task successfully', async () => {
      const task = TestFixtures.createTask({ userId });
      const request: UpdateTaskRequest = { title: 'Updated Title' };
      const updatedTask = { ...task, ...request };
      mockRepository.findByPk.mockResolvedValue(task);
      mockRepository.update.mockResolvedValue(updatedTask as Task);

      const result = await taskService.updateTask(userId, task.id, request);

      expect(result).toEqual(updatedTask);
    });

    it('should throw NotFoundError if task not found', async () => {
      mockRepository.findByPk.mockResolvedValue(null);
      await expect(
        taskService.updateTask(userId, 999, {}),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteTask', () => {
    it('should delete task successfully', async () => {
      const task = TestFixtures.createTask({ userId });
      mockRepository.findByPk.mockResolvedValue(task);
      mockRepository.delete.mockResolvedValue(true);

      const result = await taskService.deleteTask(userId, task.id);

      expect(result).toBe(true);
    });

    it('should throw NotFoundError if task not found', async () => {
      mockRepository.findByPk.mockResolvedValue(null);
      await expect(taskService.deleteTask(userId, 999)).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe('listTasks', () => {
    it('should list tasks for a user', async () => {
      const tasks = [TestFixtures.createTask()];
      const paginatedResponse = {
        data: tasks,
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
        correlationId: 'test-id',
        message: 'Success',
        timestamp: '2024-01-01T00:00:00.000Z',
      };
      mockRepository.findAndCountAll.mockResolvedValue(paginatedResponse);

      const result = await taskService.listTasks(userId, { page: 1, limit: 10 });

      expect(result).toEqual(paginatedResponse);
    });
  });
});
