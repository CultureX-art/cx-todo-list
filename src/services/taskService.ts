import { 
  taskRepository, 
  TaskFilters, 
  PaginationOptions, 
  TaskQueryResult,
  TaskStats 
} from '../repositories/taskRepository';
import { Task, TaskCreationAttributes } from '../models/Task';

export interface CreateTaskRequest {
  title: string;
  description?: string;
  dueDate?: Date;
  priority?: 'low' | 'medium' | 'high';
  labels?: string[];
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  status?: 'pending' | 'in_progress' | 'completed';
  priority?: 'low' | 'medium' | 'high';
  dueDate?: Date;
  labels?: string[];
}

export class TaskService {
  async getTasks(
    userId: string, 
    filters: TaskFilters = {}, 
    pagination: PaginationOptions = {}
  ): Promise<TaskQueryResult> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    return await taskRepository.findByUserId(userId, filters, pagination);
  }

  async getTaskById(taskId: string, userId: string): Promise<Task | null> {
    if (!taskId || !userId) {
      throw new Error('Task ID and User ID are required');
    }

    return await taskRepository.findByIdAndUser(taskId, userId);
  }

  async createTask(userId: string, taskData: CreateTaskRequest): Promise<Task> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    if (!taskData.title || taskData.title.trim().length === 0) {
      throw new Error('Task title is required');
    }

    if (taskData.title.length > 200) {
      throw new Error('Task title cannot exceed 200 characters');
    }

    if (taskData.labels && taskData.labels.length > 10) {
      throw new Error('Maximum 10 labels allowed per task');
    }

    if (taskData.dueDate && taskData.dueDate < new Date()) {
      throw new Error('Due date cannot be in the past');
    }

    const taskCreationData: TaskCreationAttributes = {
      userId,
      title: taskData.title.trim(),
      description: taskData.description?.trim(),
      dueDate: taskData.dueDate,
      priority: taskData.priority || 'medium',
      labels: taskData.labels || [],
    };

    return await taskRepository.create(taskCreationData);
  }

  async updateTask(
    taskId: string, 
    userId: string, 
    updates: UpdateTaskRequest
  ): Promise<Task> {
    if (!taskId || !userId) {
      throw new Error('Task ID and User ID are required');
    }

    // Check if task exists and belongs to user
    const existingTask = await taskRepository.findByIdAndUser(taskId, userId);
    if (!existingTask) {
      throw new Error('Task not found or access denied');
    }

    // Validate updates
    if (updates.title !== undefined) {
      if (!updates.title || updates.title.trim().length === 0) {
        throw new Error('Task title is required');
      }
      if (updates.title.length > 200) {
        throw new Error('Task title cannot exceed 200 characters');
      }
    }

    if (updates.labels && updates.labels.length > 10) {
      throw new Error('Maximum 10 labels allowed per task');
    }

    if (updates.dueDate && updates.dueDate < new Date()) {
      throw new Error('Due date cannot be in the past');
    }

    const sanitizedUpdates: any = {};
    if (updates.title !== undefined) sanitizedUpdates.title = updates.title.trim();
    if (updates.description !== undefined) sanitizedUpdates.description = updates.description?.trim();
    if (updates.status !== undefined) sanitizedUpdates.status = updates.status;
    if (updates.priority !== undefined) sanitizedUpdates.priority = updates.priority;
    if (updates.dueDate !== undefined) sanitizedUpdates.dueDate = updates.dueDate;
    if (updates.labels !== undefined) sanitizedUpdates.labels = updates.labels;

    const updatedTask = await taskRepository.update(taskId, sanitizedUpdates);
    if (!updatedTask) {
      throw new Error('Failed to update task');
    }

    return updatedTask;
  }

  async deleteTask(taskId: string, userId: string): Promise<void> {
    if (!taskId || !userId) {
      throw new Error('Task ID and User ID are required');
    }

    // Check if task exists and belongs to user
    const existingTask = await taskRepository.findByIdAndUser(taskId, userId);
    if (!existingTask) {
      throw new Error('Task not found or access denied');
    }

    await taskRepository.softDelete(taskId);
  }

  async getTaskStats(userId: string): Promise<TaskStats> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    return await taskRepository.getTaskStats(userId);
  }
}

export const taskService = new TaskService();