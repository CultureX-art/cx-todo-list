import { Task } from '../models/task';
import { CreateTaskRequest, UpdateTaskRequest } from '../dto/task.dto';
import { PaginatedResponse, PaginationOptions } from '../../common/api/types';

export interface TaskCreateData extends CreateTaskRequest {
  userId: number;
}

export interface TaskUpdateData extends UpdateTaskRequest {}

export interface TaskFilterOptions extends PaginationOptions {
  userId: number;
  status?: string;
  search?: string;
}

export interface ITaskRepository {
  create(data: TaskCreateData): Promise<Task>;
  findByPk(id: number): Promise<Task | null>;
  update(id: number, data: TaskUpdateData): Promise<Task | null>;
  delete(id: number): Promise<boolean>;
  findAndCountAll(options: TaskFilterOptions): Promise<PaginatedResponse<Task>>;
}
