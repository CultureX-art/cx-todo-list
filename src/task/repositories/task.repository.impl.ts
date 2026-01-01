import { IDatabaseConnection } from "../../common/database/connection";
import { QueryParameters, TaskRow } from "../../common/database/types";
import { Task, TaskStatus } from "../api/types";
import {
  TaskCreateData,
  TaskFilterOptions,
  TasksWithTotal,
  TaskUpdateData,
} from "./task.repository";
import { ITaskRepository } from "./task.repository";

export class MySQLTaskRepository implements ITaskRepository {
  constructor(private readonly db: IDatabaseConnection) {}

  async create(userId: number, data: TaskCreateData): Promise<Task> {
    const {
      title,
      description,
      status = "not-started",
      dueDate,
      labels = [],
    } = data;

    const insertSql =
      "INSERT INTO task (user_id, title, description, due_date, status, labels, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())";
    const insertParams: QueryParameters = [
      userId,
      title,
      description,
      dueDate,
      status,
      JSON.stringify(labels),
    ];

    const [, result] = await this.db.execute(insertSql, insertParams);
    const insertId = result.insertId;

    if (insertId === null || insertId === undefined || insertId === 0) {
      throw new Error("Failed to create task: no insert ID returned");
    }

    const task = await this.findById(userId, insertId);
    if (!task) {
      throw new Error("Failed to retrieve created task");
    }

    return task;
  }

  async findById(userId: number, id: number): Promise<Task | null> {
    const sql =
      "SELECT * FROM task WHERE user_id = ? id = ? AND deleted_at IS NULL";
    const [rows] = await this.db.queryTasks(sql, [userId, id]);

    if (rows.length === 0) {
      return null;
    }

    const firstRow = rows[0];
    if (firstRow === undefined) {
      throw new Error("No task data found after creation");
    }
    return this.transformToTask(firstRow);
  }

  async findByUserId(userId: number): Promise<Task[]> {
    const sql =
      "SELECT * FROM task WHERE user_id = ? AND deleted_at IS NULL ORDER BY created_at DESC";
    const [rows] = await this.db.queryTasks(sql, [userId]);

    return rows.map((row) => this.transformToTask(row));
  }

  async findWithFilters(
    userId: number,
    options: TaskFilterOptions,
  ): Promise<TasksWithTotal> {
    const {
      page = 1,
      limit = 10,
      status,
      labels,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = options;

    const offset = (page - 1) * limit;
    const conditions: string[] = ["user_id = ?", "deleted_at IS NULL"];
    const params: QueryParameters = [userId];

    // Add status filter
    if (status) {
      conditions.push("status = ?");
      params.push(status);
    }

    // Add labels filter
    if (labels && labels.length > 0) {
      const labelConditions = labels.map(() => "JSON_CONTAINS(labels, ?)");
      conditions.push(`(${labelConditions.join(" OR ")})`);
      params.push(...labels.map((label) => JSON.stringify(label)));
    }

    // Add search filter
    if (search !== null && search !== undefined && search.trim().length > 0) {
      conditions.push(
        "(MATCH(title, description) AGAINST(?) OR title LIKE ? OR description LIKE ?)",
      );
      params.push(search, `%${search}%`, `%${search}%`);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;
    const orderClause = `ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;
    const limitClause = `LIMIT ${limit} OFFSET ${offset}`;

    // Use single query with window function to get both tasks and count efficiently
    const optimizedSql = `
      SELECT *, COUNT(*) OVER() as total_count 
      FROM task 
      ${whereClause} 
      ${orderClause} 
      ${limitClause}`;

    const [rows] = await this.db.queryTasksWithCount(optimizedSql, params);

    if (rows.length === 0) {
      return { tasks: [], total: 0 };
    }

    const tasks = rows.map((row) => this.transformToTask(row));
    const total = rows[0]?.total_count ?? 0;

    return { tasks, total };
  }

  async update(
    userId: number,
    id: number,
    data: TaskUpdateData,
  ): Promise<Task | null> {
    const updates: string[] = [];
    const params: QueryParameters = [userId];

    // Build dynamic SET clause
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        const dbKey = this.camelToSnakeCase(key);
        if (key === "labels") {
          updates.push(`${dbKey} = ?`);
          params.push(JSON.stringify(value));
        } else {
          updates.push(`${dbKey} = ?`);
          params.push(value);
        }
      }
    });

    if (updates.length === 0) {
      return await this.findById(userId, id);
    }

    updates.push("updated_at = NOW()");
    const setClause = updates.join(", ");

    const sql = `UPDATE task SET ${setClause} WHERE user_id = ? AND id = ? AND deleted_at IS NULL`;
    params.push(id);

    const [, result] = await this.db.execute(sql, params);

    if (result.affectedRows === 0) {
      return null;
    }

    return await this.findById(userId, id);
  }

  async delete(userId: number, id: number): Promise<void> {
    const sql =
      "UPDATE task SET deleted_at = NOW() WHERE user_id = ? AND id = ? AND deleted_at IS NULL";
    const [, result] = await this.db.execute(sql, [userId, id]);

    if (result.affectedRows === 0) {
      throw new Error("Task not found or already deleted");
    }
  }

  async exists(userId: number, id: number): Promise<boolean> {
    const sql =
      "SELECT COUNT(*) as count FROM task WHERE user_id = ? AND id = ? AND deleted_at IS NULL";
    const [rows] = await this.db.queryTaskCount(sql, [userId, id]);
    const count = rows[0]?.count ?? 0;
    return count > 0;
  }

  async search(userId: number, query: string): Promise<Task[]> {
    const sql =
      "SELECT *, MATCH(title, description) AGAINST(?) as relevance FROM task WHERE user_id = ? AND deleted_at IS NULL AND MATCH(title, description) AGAINST(?) ORDER BY relevance DESC, created_at DESC";
    const [rows] = await this.db.queryTasks(sql, [query, userId, query]);
    const tasks = rows;

    return tasks.map((row) => this.transformToTask(row));
  }

  async findByLabels(userId: number, labels: string[]): Promise<Task[]> {
    if (labels.length === 0) {
      return [];
    }

    let sql: string;
    let params: QueryParameters;

    if (labels.length === 1) {
      sql =
        "SELECT * FROM task WHERE user_id = ? AND deleted_at IS NULL AND JSON_CONTAINS(labels, ?) ORDER BY created_at DESC";
      params = [userId, JSON.stringify(labels[0])];
    } else {
      const labelConditions = labels.map(() => "JSON_CONTAINS(labels, ?)");
      sql = `SELECT * FROM task WHERE user_id = ? AND deleted_at IS NULL AND (${labelConditions.join(" OR ")}) ORDER BY created_at DESC`;
      params = [userId, ...labels.map((label) => JSON.stringify(label))];
    }

    const [rows] = await this.db.queryTasks(sql, params);
    const tasks = rows;

    return tasks.map((row) => this.transformToTask(row));
  }

  async bulkUpdate(
    userId: number,
    taskIds: number[],
    data: TaskUpdateData,
  ): Promise<Task[]> {
    if (taskIds.length === 0) {
      return [];
    }

    const updates: string[] = [];
    const params: QueryParameters = [];

    // Build dynamic SET clause
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        const dbKey = this.camelToSnakeCase(key);
        if (key === "labels") {
          updates.push(`${dbKey} = ?`);
          params.push(JSON.stringify(value));
        } else {
          updates.push(`${dbKey} = ?`);
          params.push(value);
        }
      }
    });

    if (updates.length === 0) {
      return [];
    }

    updates.push("updated_at = NOW()");
    const setClause = updates.join(", ");

    const placeholders = taskIds.map(() => "?").join(", ");
    const sql = `UPDATE task SET ${setClause} WHERE user_id = ${userId} AND id IN (${placeholders}) AND deleted_at IS NULL`;
    params.push(...taskIds);

    await this.db.execute(sql, params);

    // Return updated tasks
    const selectSql = `SELECT * FROM task WHERE id IN (${placeholders}) AND deleted_at IS NULL`;
    const [rows] = await this.db.queryTasks(selectSql, taskIds);
    const tasks = rows;

    return tasks.map((row) => this.transformToTask(row));
  }

  async bulkDelete(userId: number, taskIds: number[]): Promise<void> {
    if (taskIds.length === 0) {
      return;
    }

    const placeholders = taskIds.map(() => "?").join(", ");
    const sql = `UPDATE task SET deleted_at = NOW() WHERE user_id = ${userId} AND id IN (${placeholders}) AND deleted_at IS NULL`;

    const [, result] = await this.db.execute(sql, taskIds);

    if (result.affectedRows === 0) {
      throw new Error("No tasks were deleted");
    }
  }

  async countUserTasks(
    userId: number,
  ): Promise<Array<{ status: TaskStatus; count: number }>> {
    const sql =
      "SELECT status, COUNT(*) as count FROM task WHERE user_id = ? AND deleted_at IS NULL GROUP BY status";
    const [rows] = await this.db.queryTaskStatusCounts(sql, [userId]);
    return rows as Array<{ status: TaskStatus; count: number }>;
  }

  async findDueSoon(userId: number, hours: number): Promise<Task[]> {
    const sql =
      "SELECT * FROM task WHERE user_id = ? AND deleted_at IS NULL AND due_date IS NOT NULL AND due_date <= DATE_ADD(NOW(), INTERVAL ? HOUR) AND due_date > NOW() ORDER BY due_date ASC";
    const [rows] = await this.db.queryTasks(sql, [userId, hours]);
    const tasks = rows;

    return tasks.map((row) => this.transformToTask(row));
  }

  async findOverdue(userId: number): Promise<Task[]> {
    const sql =
      "SELECT * FROM task WHERE user_id = ? AND deleted_at IS NULL AND due_date IS NOT NULL AND due_date < NOW() AND status != ? ORDER BY due_date ASC";
    const [rows] = await this.db.queryTasks(sql, [userId, "done"]);
    const tasks = rows;

    return tasks.map((row) => this.transformToTask(row));
  }

  private transformToTask(row: TaskRow): Task {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status,
      dueDate:
        row.due_date !== null && row.due_date !== undefined
          ? typeof row.due_date === "string"
            ? row.due_date
            : row.due_date.toISOString()
          : null,
      labels: this.parseLabelsafely(row.labels),
      createdAt:
        typeof row.created_at === "string"
          ? row.created_at
          : row.created_at.toISOString(),
      updatedAt:
        typeof row.updated_at === "string"
          ? row.updated_at
          : row.updated_at.toISOString(),
    };
  }

  private parseLabelsafely(labels: string): string[] {
    if (!labels) return [];

    try {
      const parsed = JSON.parse(labels);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      // If JSON.parse fails, treat as empty labels array
      return [];
    }
  }

  private camelToSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }
}
