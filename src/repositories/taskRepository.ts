import { Op } from 'sequelize';
import { Task, TaskAttributes, TaskCreationAttributes, TaskStatus } from '../models/Task';

export interface TaskFilters {
  status?: TaskStatus;
  search?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface PaginationOptions {
  offset?: number;
  limit?: number;
}

export interface TaskStats {
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
  total: number;
}

export interface TaskQueryResult {
  tasks: Task[];
  total: number;
}

export class TaskRepository {
  async findByUserId(
    userId: string, 
    filters: TaskFilters = {}, 
    pagination: PaginationOptions = {}
  ): Promise<TaskQueryResult> {
    try {
      const where: any = { 
        userId,
        isDeleted: false 
      };

      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.search) {
        where[Op.or] = [
          { title: { [Op.iLike]: `%${filters.search}%` } },
          { description: { [Op.iLike]: `%${filters.search}%` } }
        ];
      }

      if (filters.startDate || filters.endDate) {
        where.dueDate = {};
        if (filters.startDate) {
          where.dueDate[Op.gte] = filters.startDate;
        }
        if (filters.endDate) {
          where.dueDate[Op.lte] = filters.endDate;
        }
      }

      const { count, rows } = await Task.findAndCountAll({
        where,
        order: [
          ['priority', 'DESC'],
          ['dueDate', 'ASC'],
          ['createdAt', 'DESC']
        ],
        limit: pagination.limit || 50,
        offset: pagination.offset || 0
      });

      return {
        tasks: rows,
        total: count
      };
    } catch (error) {
      throw new Error(`Failed to find tasks by user: ${error}`);
    }
  }

  async findByIdAndUser(taskId: string, userId: string): Promise<Task | null> {
    try {
      const task = await Task.findOne({
        where: { 
          id: taskId, 
          userId,
          isDeleted: false 
        }
      });
      return task;
    } catch (error) {
      throw new Error(`Failed to find task by ID and user: ${error}`);
    }
  }

  async create(taskData: TaskCreationAttributes): Promise<Task> {
    try {
      const task = await Task.create(taskData);
      return task;
    } catch (error) {
      throw new Error(`Failed to create task: ${error}`);
    }
  }

  async update(taskId: string, updates: Partial<TaskAttributes>): Promise<Task | null> {
    try {
      const [affectedRows] = await Task.update(updates, {
        where: { id: taskId, isDeleted: false },
        returning: true
      });

      if (affectedRows === 0) {
        return null;
      }

      const updatedTask = await Task.findByPk(taskId);
      return updatedTask;
    } catch (error) {
      throw new Error(`Failed to update task: ${error}`);
    }
  }

  async softDelete(taskId: string): Promise<void> {
    try {
      await Task.update(
        { 
          isDeleted: true, 
          deletedAt: new Date() 
        },
        { where: { id: taskId } }
      );
    } catch (error) {
      throw new Error(`Failed to soft delete task: ${error}`);
    }
  }

  async getTaskStats(userId: string): Promise<TaskStats> {
    try {
      const stats = await Task.findAll({
        where: { 
          userId, 
          isDeleted: false 
        },
        attributes: [
          'status',
          [Task.sequelize!.fn('COUNT', Task.sequelize!.col('id')), 'count']
        ],
        group: ['status'],
        raw: true
      }) as any[];

      const result: TaskStats = {
        pending: 0,
        inProgress: 0,
        completed: 0,
        overdue: 0,
        total: 0
      };

      stats.forEach(stat => {
        const count = parseInt(stat.count);
        result.total += count;
        
        switch (stat.status) {
          case 'pending':
            result.pending = count;
            break;
          case 'in_progress':
            result.inProgress = count;
            break;
          case 'completed':
            result.completed = count;
            break;
        }
      });

      // Count overdue tasks separately
      const overdueCount = await Task.count({
        where: {
          userId,
          isDeleted: false,
          dueDate: { [Op.lt]: new Date() },
          status: { [Op.ne]: 'completed' }
        }
      });

      result.overdue = overdueCount;

      return result;
    } catch (error) {
      throw new Error(`Failed to get task stats: ${error}`);
    }
  }
}

export const taskRepository = new TaskRepository();