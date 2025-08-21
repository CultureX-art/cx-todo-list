/**
 * Task Controller
 * Handles HTTP requests for task management endpoints
 */

import { Response, NextFunction } from 'express';
import { 
  Task, 
  TaskStatus, 
  TaskPriority, 
  CreateTaskRequest, 
  UpdateTaskRequest,
  AuthenticatedRequest,
  PaginatedResponse
} from '../types';
import logger from '../config/logger';

interface GetTasksQuery {
  status?: TaskStatus;
  search?: string;
  page?: string;
  limit?: string;
  priority?: TaskPriority;
}

type PaginatedTasksResponse = PaginatedResponse<Task>;

/**
 * Get all tasks for authenticated user
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next middleware function
 * 
 * @description
 * - Extracts filters (status, search) and pagination from query params
 * - Gets userId from req.user (set by auth middleware)
 * - Delegates to taskService.getTasks()
 * - Returns 200 with paginated task list
 */
async function getTasks(
  req: AuthenticatedRequest<{}, PaginatedTasksResponse, {}, GetTasksQuery>,
  res: Response<PaginatedTasksResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user.id;
    const { status, search, page = '1', limit = '10', priority } = req.query;
    
    logger.info('Fetching tasks for user', { 
      userId, 
      filters: { status, search, priority, page, limit },
      method: req.method,
      url: req.url
    });
    
    // Parse pagination parameters
    const pageNumber = Math.max(1, parseInt(page, 10) || 1);
    const limitNumber = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    
    const filters = {
      status,
      search,
      priority,
      page: pageNumber,
      limit: limitNumber
    };

    logger.debug('Parsed task filters', { userId, filters });

    // Delegate to service layer
    const result = await taskService.getTasks(userId, filters);
    
    const responseData = {
      data: result.tasks || result.data || result,
      pagination: result.pagination || {
        page: pageNumber,
        limit: limitNumber,
        total: result.total || 0,
        totalPages: Math.ceil((result.total || 0) / limitNumber),
        hasNext: pageNumber * limitNumber < (result.total || 0),
        hasPrev: pageNumber > 1
      }
    };

    logger.info('Tasks fetched successfully', { 
      userId, 
      taskCount: responseData.data.length,
      totalTasks: responseData.pagination.total,
      page: pageNumber
    });
    
    res.status(200).json(responseData);
  } catch (error) {
    logger.error('Error fetching tasks', { 
      userId: req.user?.id, 
      error: (error as Error).message,
      stack: (error as Error).stack
    });
    next(error);
  }
}

/**
 * Create a new task
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next middleware function
 * 
 * @description
 * - Extracts task data from request body
 * - Gets userId from req.user
 * - Delegates to taskService.createTask()
 * - Returns 201 with created task
 */
async function createTask(
  req: AuthenticatedRequest<{}, Task, CreateTaskRequest>,
  res: Response<Task>,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user.id;
    const taskData = req.body;
    
    logger.info('Creating new task', { 
      userId, 
      taskTitle: taskData.title,
      taskPriority: taskData.priority,
      taskStatus: taskData.status
    });
    
    // Basic validation
    if (!taskData.title || taskData.title.trim() === '') {
      logger.warn('Task creation failed: Missing title', { userId });
      res.status(400).json({
        error: 'Title is required'
      } as any);
      return;
    }

    logger.debug('Task data validated, proceeding with creation', { userId, taskData });

    // Delegate to service layer
    const task = await taskService.createTask(userId, taskData);
    
    logger.info('Task created successfully', { 
      userId, 
      taskId: task.id, 
      taskTitle: task.title 
    });
    
    res.status(201).json(task);
  } catch (error) {
    logger.error('Error creating task', { 
      userId: req.user?.id, 
      taskData: req.body,
      error: (error as Error).message,
      stack: (error as Error).stack
    });
    next(error);
  }
}

/**
 * Update an existing task
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next middleware function
 * 
 * @description
 * - Extracts taskId from params and updates from body
 * - Gets userId from req.user for ownership validation
 * - Delegates to taskService.updateTask()
 * - Returns 200 with updated task
 */
async function updateTask(
  req: AuthenticatedRequest<{ taskId: string }, Task, UpdateTaskRequest>,
  res: Response<Task>,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user.id;
    const { taskId } = req.params;
    const updates = req.body;
    
    logger.info('Updating task', { 
      userId, 
      taskId, 
      updates: Object.keys(updates)
    });
    
    // Validate taskId
    if (!taskId) {
      logger.warn('Task update failed: Missing task ID', { userId });
      res.status(400).json({
        error: 'Task ID is required'
      } as any);
      return;
    }

    logger.debug('Task update validation passed', { userId, taskId, updates });

    // Delegate to service layer
    const task = await taskService.updateTask(userId, taskId, updates);
    
    logger.info('Task updated successfully', { 
      userId, 
      taskId, 
      updatedFields: Object.keys(updates)
    });
    
    res.status(200).json(task);
  } catch (error) {
    logger.error('Error updating task', { 
      userId: req.user?.id, 
      taskId: req.params?.taskId,
      updates: req.body,
      error: (error as Error).message,
      stack: (error as Error).stack
    });
    next(error);
  }
}

/**
 * Delete a task
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next middleware function
 * 
 * @description
 * - Extracts taskId from params
 * - Gets userId from req.user for ownership validation
 * - Delegates to taskService.deleteTask()
 * - Returns 204 No Content on success
 */
async function deleteTask(
  req: AuthenticatedRequest<{ taskId: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user.id;
    const { taskId } = req.params;
    
    logger.info('Deleting task', { userId, taskId });
    
    // Validate taskId
    if (!taskId) {
      logger.warn('Task deletion failed: Missing task ID', { userId });
      res.status(400).json({
        error: 'Task ID is required'
      } as any);
      return;
    }

    logger.debug('Task deletion validation passed', { userId, taskId });

    // Delegate to service layer
    await taskService.deleteTask(userId, taskId);
    
    logger.info('Task deleted successfully', { userId, taskId });
    
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting task', { 
      userId: req.user?.id, 
      taskId: req.params?.taskId,
      error: (error as Error).message,
      stack: (error as Error).stack
    });
    next(error);
  }
}

// Import task service (this would need to be typed as well)
const taskService = require('../services/taskService');

export {
  getTasks,
  createTask,
  updateTask,
  deleteTask
};