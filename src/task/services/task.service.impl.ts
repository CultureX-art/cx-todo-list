import {
  ITaskRepository,
  TaskFilterOptions,
} from '../repositories/task.repository';
import { Task } from '../models/task';
import { CreateTaskRequest, UpdateTaskRequest } from '../dto/task.dto';
import { PaginatedResponse, PaginationOptions } from '../../common/api/types';
import { ITaskService } from './task.service';
import {
  AuthenticationError,
  BusinessLogicError,
  NotFoundError,
} from '../../common/error/service-error';

export class TaskServiceImpl implements ITaskService {
  constructor(private readonly taskRepository: ITaskRepository) {}

  async createTask(userId: number, taskData: CreateTaskRequest): Promise<Task> {
    if (!userId) {
      throw new AuthenticationError('User must be authenticated to create tasks');
    }
    if (taskData.dueDate && new Date(taskData.dueDate) < new Date()) {
      throw new BusinessLogicError('Due date cannot be in the past');
    }
    return this.taskRepository.create({ ...taskData, userId });
  }

  async getTaskById(userId: number, taskId: number): Promise<Task | null> {
    if (!userId) {
      throw new AuthenticationError('User must be authenticated');
    }
    const task = await this.taskRepository.findByPk(taskId);
    if (!task || task.userId !== userId) {
      return null;
    }
    return task;
  }

  async updateTask(
    userId: number,
    taskId: number,
    taskData: UpdateTaskRequest,
  ): Promise<Task | null> {
    if (!userId) {
      throw new AuthenticationError('User must be authenticated');
    }
    const task = await this.taskRepository.findByPk(taskId);
    if (!task || task.userId !== userId) {
      throw new NotFoundError('Task', taskId);
    }
    if (taskData.dueDate && new Date(taskData.dueDate) < new Date()) {
      throw new BusinessLogicError('Due date cannot be in the past');
    }
    return this.taskRepository.update(taskId, taskData);
  }

  async deleteTask(userId: number, taskId: number): Promise<boolean> {
    if (!userId) {
      throw new AuthenticationError('User must be authenticated');
    }
    const task = await this.taskRepository.findByPk(taskId);
    if (!task || task.userId !== userId) {
      throw new NotFoundError('Task', taskId);
    }
    return this.taskRepository.delete(taskId);
  }

  async listTasks(
    userId: number,
    options: PaginationOptions,
  ): Promise<PaginatedResponse<Task>> {
    if (!userId) {
      throw new AuthenticationError('User must be authenticated');
    }
    const filterOptions: TaskFilterOptions = { ...options, userId };
    return this.taskRepository.findAndCountAll(filterOptions);
  }
}
