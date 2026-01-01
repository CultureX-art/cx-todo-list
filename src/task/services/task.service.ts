import { Task } from '../models/task';
import { CreateTaskRequest, UpdateTaskRequest } from '../dto/task.dto';
import { PaginatedResponse, PaginationOptions } from '../../common/api/types';

export interface ITaskService {
  createTask(userId: number, taskData: CreateTaskRequest): Promise<Task>;
  getTaskById(userId: number, taskId: number): Promise<Task | null>;
  updateTask(userId: number, taskId: number, taskData: UpdateTaskRequest): Promise<Task | null>;
  deleteTask(userId: number, taskId: number): Promise<boolean>;
  listTasks(userId: number, options: PaginationOptions): Promise<PaginatedResponse<Task>>;
}
