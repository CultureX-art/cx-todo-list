/**
 * Task Validation Schemas using Zod
 *
 * These schemas define runtime validation for task endpoints.
 */

import { z } from "zod";

// ============================================================================
// REQUEST VALIDATION SCHEMAS
// ============================================================================

/**
 * Task creation validation schema
 */
export const createTaskSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(255, "Title must be less than 255 characters")
    .trim(),
  description: z
    .string()
    .max(1000, "Description must be less than 1000 characters")
    .trim()
    .optional()
    .nullable(),
  dueDate: z
    .string()
    .datetime("Due date must be a valid ISO 8601 date")
    .optional()
    .nullable(),
  status: z.enum(["not-started", "in-progress", "done"]).default("not-started"),
  labels: z
    .array(z.string().max(50, "Label must be less than 50 characters").trim())
    .max(10, "Maximum 10 labels allowed")
    .default([]),
});

/**
 * Task update validation schema
 */
export const updateTaskSchema = z
  .object({
    title: z
      .string()
      .min(1, "Title cannot be empty")
      .max(255, "Title must be less than 255 characters")
      .trim()
      .optional(),
    description: z
      .string()
      .max(1000, "Description must be less than 1000 characters")
      .trim()
      .optional()
      .nullable(),
    dueDate: z
      .string()
      .datetime("Due date must be a valid ISO 8601 date")
      .optional()
      .nullable(),
    status: z.enum(["not-started", "in-progress", "done"]).optional(),
    labels: z
      .array(z.string().max(50, "Label must be less than 50 characters").trim())
      .max(10, "Maximum 10 labels allowed")
      .optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    "At least one field must be provided for update",
  );

/**
 * Task query parameters validation schema
 */
export const taskQuerySchema = z.object({
  page: z.coerce
    .number()
    .int("Page must be an integer")
    .min(1, "Page must be at least 1")
    .default(1),
  pageSize: z.coerce
    .number()
    .int("Page size must be an integer")
    .min(1, "Page size must be at least 1")
    .max(100, "Page size must be at most 100")
    .default(10),
  status: z.enum(["not-started", "in-progress", "done"]).optional(),
  q: z
    .string()
    .max(255, "Search query must be less than 255 characters")
    .trim()
    .optional(),
  sortBy: z
    .enum(["createdAt", "updatedAt", "dueDate", "title", "status"])
    .default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

/**
 * Route parameter validation schema for task ID
 */
export const taskParamsSchema = z.object({
  taskId: z.coerce
    .number()
    .int("Task ID must be an integer")
    .positive("Task ID must be positive"),
});

/**
 * Bulk update task status schema
 */
export const bulkUpdateStatusSchema = z.object({
  taskIds: z
    .array(
      z
        .number()
        .int("Task ID must be an integer")
        .positive("Task ID must be positive"),
    )
    .min(1, "At least one task ID is required")
    .max(100, "Maximum 100 tasks can be updated at once"),
  status: z.enum(["not-started", "in-progress", "done"]),
});

// ============================================================================
// TYPE INFERENCE
// ============================================================================

/**
 * Inferred types from Zod schemas
 */
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type TaskQueryInput = z.infer<typeof taskQuerySchema>;
export type TaskParamsInput = z.infer<typeof taskParamsSchema>;
export type BulkUpdateStatusInput = z.infer<typeof bulkUpdateStatusSchema>;

// ============================================================================
// CUSTOM VALIDATORS
// ============================================================================

/**
 * Custom validation functions for task business logic
 */
export const taskValidators = {
  /**
   * Check if due date is not in the past
   */
  futureDueDate: (date: string | null | undefined): boolean => {
    if (date === null || date === undefined || date.length === 0) return true; // Optional field
    const dueDate = new Date(date);
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Start of today
    return dueDate >= now;
  },

  /**
   * Check if task status transition is valid
   */
  validStatusTransition: (
    newStatus: string,
    currentStatus: string,
  ): boolean => {
    // Define valid transitions
    const transitions: Record<string, string[]> = {
      "not-started": ["in-progress", "done"],
      "in-progress": ["not-started", "done"],
      done: ["in-progress"], // Can reopen completed tasks
    };

    return transitions[currentStatus]?.includes(newStatus) ?? false;
  },

  /**
   * Validate unique labels in array
   */
  uniqueLabels: (labels: string[]): boolean => {
    const uniqueLabels = new Set(
      labels.map((label) => label.toLowerCase().trim()),
    );
    return uniqueLabels.size === labels.length;
  },

  /**
   * Sanitize and validate label format
   */
  validLabelFormat: (label: string): boolean => {
    // Labels should only contain alphanumeric, hyphens, underscores
    const validPattern = /^[a-zA-Z0-9_-]+$/;
    return validPattern.test(label.trim());
  },

  /**
   * Validate task title doesn't contain offensive content
   */
  appropriateTitle: (title: string): boolean => {
    // Basic profanity filter - in production would use a proper service
    const inappropriateWords = ["spam", "test123"]; // Placeholder
    const lowerTitle = title.toLowerCase();
    return !inappropriateWords.some((word) => lowerTitle.includes(word));
  },
};

// ============================================================================
// EXTENDED SCHEMAS WITH BUSINESS LOGIC
// ============================================================================

/**
 * Extended task creation schema with business logic validation
 */
export const createTaskSchemaExtended = createTaskSchema
  .refine((data) => taskValidators.futureDueDate(data.dueDate), {
    message: "Due date cannot be in the past",
    path: ["dueDate"],
  })
  .refine((data) => taskValidators.uniqueLabels(data.labels), {
    message: "Labels must be unique",
    path: ["labels"],
  })
  .refine((data) => data.labels.every(taskValidators.validLabelFormat), {
    message:
      "Labels can only contain letters, numbers, hyphens, and underscores",
    path: ["labels"],
  })
  .refine((data) => taskValidators.appropriateTitle(data.title), {
    message: "Task title contains inappropriate content",
    path: ["title"],
  });

/**
 * Extended task update schema with business logic validation
 */
export const updateTaskSchemaExtended = updateTaskSchema
  .refine((data) => taskValidators.futureDueDate(data.dueDate), {
    message: "Due date cannot be in the past",
    path: ["dueDate"],
  })
  .refine(
    (data) =>
      data.labels === null ||
      data.labels === undefined ||
      taskValidators.uniqueLabels(data.labels),
    {
      message: "Labels must be unique",
      path: ["labels"],
    },
  )
  .refine(
    (data) =>
      data.labels === null ||
      data.labels === undefined ||
      data.labels.every(taskValidators.validLabelFormat),
    {
      message:
        "Labels can only contain letters, numbers, hyphens, and underscores",
      path: ["labels"],
    },
  )
  .refine(
    (data) =>
      data.title === null ||
      data.title === undefined ||
      taskValidators.appropriateTitle(data.title),
    {
      message: "Task title contains inappropriate content",
      path: ["title"],
    },
  );
