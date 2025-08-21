import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { TaskStatus, TaskPriority } from '../models/Task';

export interface ValidationError {
  field: string;
  message: string;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  dueDate?: Date;
  priority?: TaskPriority;
  labels?: string[];
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: Date;
  labels?: string[];
}

export interface TaskQueryParams {
  status?: TaskStatus;
  search?: string;
  page?: number;
  limit?: number;
  startDate?: Date;
  endDate?: Date;
}

const createTaskSchema = Joi.object({
  title: Joi.string()
    .trim()
    .min(1)
    .max(200)
    .required()
    .messages({
      'string.empty': 'Task title is required',
      'string.min': 'Task title cannot be empty',
      'string.max': 'Task title cannot exceed 200 characters',
      'any.required': 'Task title is required'
    }),
  description: Joi.string()
    .trim()
    .max(1000)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Task description cannot exceed 1000 characters'
    }),
  dueDate: Joi.date()
    .min('now')
    .optional()
    .messages({
      'date.min': 'Due date cannot be in the past'
    }),
  priority: Joi.string()
    .valid('low', 'medium', 'high')
    .optional()
    .messages({
      'any.only': 'Priority must be one of: low, medium, high'
    }),
  labels: Joi.array()
    .items(Joi.string().trim().min(1).max(50))
    .max(10)
    .optional()
    .messages({
      'array.max': 'Maximum 10 labels allowed per task',
      'string.min': 'Label cannot be empty',
      'string.max': 'Label cannot exceed 50 characters'
    })
});

const updateTaskSchema = Joi.object({
  title: Joi.string()
    .trim()
    .min(1)
    .max(200)
    .optional()
    .messages({
      'string.empty': 'Task title cannot be empty',
      'string.min': 'Task title cannot be empty',
      'string.max': 'Task title cannot exceed 200 characters'
    }),
  description: Joi.string()
    .trim()
    .max(1000)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Task description cannot exceed 1000 characters'
    }),
  status: Joi.string()
    .valid('pending', 'in_progress', 'completed')
    .optional()
    .messages({
      'any.only': 'Status must be one of: pending, in_progress, completed'
    }),
  priority: Joi.string()
    .valid('low', 'medium', 'high')
    .optional()
    .messages({
      'any.only': 'Priority must be one of: low, medium, high'
    }),
  dueDate: Joi.date()
    .optional()
    .allow(null)
    .messages({
      'date.base': 'Due date must be a valid date'
    }),
  labels: Joi.array()
    .items(Joi.string().trim().min(1).max(50))
    .max(10)
    .optional()
    .messages({
      'array.max': 'Maximum 10 labels allowed per task',
      'string.min': 'Label cannot be empty',
      'string.max': 'Label cannot exceed 50 characters'
    })
});

const taskQuerySchema = Joi.object({
  status: Joi.string()
    .valid('pending', 'in_progress', 'completed')
    .optional()
    .messages({
      'any.only': 'Status must be one of: pending, in_progress, completed'
    }),
  search: Joi.string()
    .trim()
    .max(100)
    .optional()
    .messages({
      'string.max': 'Search query cannot exceed 100 characters'
    }),
  page: Joi.number()
    .integer()
    .min(1)
    .optional()
    .default(1)
    .messages({
      'number.base': 'Page must be a number',
      'number.integer': 'Page must be an integer',
      'number.min': 'Page must be at least 1'
    }),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .optional()
    .default(20)
    .messages({
      'number.base': 'Limit must be a number',
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
    }),
  startDate: Joi.date()
    .optional()
    .messages({
      'date.base': 'Start date must be a valid date'
    }),
  endDate: Joi.date()
    .optional()
    .when('startDate', {
      is: Joi.exist(),
      then: Joi.date().min(Joi.ref('startDate')).messages({
        'date.min': 'End date must be after start date'
      })
    })
    .messages({
      'date.base': 'End date must be a valid date'
    })
});

function formatValidationErrors(error: Joi.ValidationError): ValidationError[] {
  return error.details.map(detail => ({
    field: detail.path.join('.'),
    message: detail.message
  }));
}

export function validateCreateTask(req: Request, res: Response, next: NextFunction): void {
  const { error } = createTaskSchema.validate(req.body, { abortEarly: false });
  
  if (error) {
    const validationErrors = formatValidationErrors(error);
    res.status(400).json({
      error: {
        message: 'Validation failed',
        status: 400,
        details: validationErrors
      }
    });
    return;
  }
  
  next();
}

export function validateUpdateTask(req: Request, res: Response, next: NextFunction): void {
  const { error } = updateTaskSchema.validate(req.body, { abortEarly: false });
  
  if (error) {
    const validationErrors = formatValidationErrors(error);
    res.status(400).json({
      error: {
        message: 'Validation failed',
        status: 400,
        details: validationErrors
      }
    });
    return;
  }
  
  next();
}

export function validateTaskQuery(req: Request, res: Response, next: NextFunction): void {
  const { error, value } = taskQuerySchema.validate(req.query, { abortEarly: false });
  
  if (error) {
    const validationErrors = formatValidationErrors(error);
    res.status(400).json({
      error: {
        message: 'Validation failed',
        status: 400,
        details: validationErrors
      }
    });
    return;
  }
  
  // Replace query parameters with validated and default values
  req.query = value;
  next();
}

export default {
  validateCreateTask,
  validateUpdateTask,
  validateTaskQuery
};