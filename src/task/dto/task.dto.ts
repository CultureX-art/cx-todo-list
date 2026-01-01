import { TaskStatus } from '../models/task';

export interface CreateTaskRequest {
  title: string;
  description?: string;
  status?: TaskStatus;
  dueDate?: string;
  labels?: string[];
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  status?: TaskStatus;
  dueDate?: string | null;
  labels?: string[];
}