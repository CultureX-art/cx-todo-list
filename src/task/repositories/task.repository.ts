/**
 * Task Repository Implementation
 *
 * Concrete implementation of TaskRepository interface with MySQL database operations.
 */

import { Task, TaskStatus } from "../api/types.js";

export interface TaskFilterOptions {
  page?: number;
  limit?: number;
  status?: TaskStatus;
  labels?: string[];
  search?: string;
  sortBy?: "createdAt" | "updatedAt" | "dueDate" | "title" | "status";
  sortOrder?: "asc" | "desc";
}

export interface TaskUpdateData {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  dueDate?: Date | null;
  labels?: string[];
}

export interface TaskCreateData {
  title: string;
  description?: string | null;
  status?: TaskStatus;
  dueDate?: Date | null;
  labels?: string[];
}

export interface TasksWithTotal {
  tasks: Task[];
  total: number;
}

export interface ITaskRepository {
  create(userId: number, data: TaskCreateData): Promise<Task>;

  findById(userId: number, id: number): Promise<Task | null>;

  findByUserId(userId: number): Promise<Task[]>;

  findWithFilters(
    userId: number,
    options: TaskFilterOptions,
  ): Promise<TasksWithTotal>;

  update(
    userId: number,
    id: number,
    data: TaskUpdateData,
  ): Promise<Task | null>;

  delete(userId: number, id: number): Promise<void>;

  exists(userId: number, id: number): Promise<boolean>;

  search(userId: number, query: string): Promise<Task[]>;

  findByLabels(userId: number, labels: string[]): Promise<Task[]>;

  bulkUpdate(
    userId: number,
    taskIds: number[],
    data: TaskUpdateData,
  ): Promise<Task[]>;

  bulkDelete(userId: number, taskIds: number[]): Promise<void>;

  countUserTasks(
    userId: number,
  ): Promise<Array<{ status: TaskStatus; count: number }>>;

  findDueSoon(userId: number, hours: number): Promise<Task[]>;

  findOverdue(userId: number): Promise<Task[]>;
}
