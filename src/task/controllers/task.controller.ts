import { Response } from 'express';
import { ITaskService } from '../services/task.service';
import { CreateTaskRequest, UpdateTaskRequest } from '../dto/task.dto';
import { AuthenticatedRequest } from '../../common/types/express';

export class TaskController {
  constructor(private readonly taskService: ITaskService) {}

  createTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const task = await this.taskService.createTask(
        req.user!.id,
        req.body as unknown as CreateTaskRequest,
      );
      res.status(201).json(task);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  getTaskById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const taskId = parseInt(req.params['taskId'] ?? '', 10);
      if (isNaN(taskId)) {
        res.status(400).json({ message: 'Invalid task ID' });
        return;
      }
      const task = await this.taskService.getTaskById(
        req.user!.id,
        taskId,
      );
      if (task) {
        res.status(200).json(task);
      } else {
        res.status(404).json({ message: 'Task not found' });
      }
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  updateTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const taskId = parseInt(req.params['taskId'] ?? '', 10);
      if (isNaN(taskId)) {
        res.status(400).json({ message: 'Invalid task ID' });
        return;
      }
      const task = await this.taskService.updateTask(
        req.user!.id,
        taskId,
        req.body as unknown as UpdateTaskRequest,
      );
      if (task) {
        res.status(200).json(task);
      } else {
        res.status(404).json({ message: 'Task not found' });
      }
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  deleteTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const taskId = parseInt(req.params['taskId'] ?? '', 10);
      if (isNaN(taskId)) {
        res.status(400).json({ message: 'Invalid task ID' });
        return;
      }
      const success = await this.taskService.deleteTask(
        req.user!.id,
        taskId,
      );
      if (success) {
        res.status(204).send();
      } else {
        res.status(404).json({ message: 'Task not found' });
      }
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  listTasks = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const tasks = await this.taskService.listTasks(req.user!.id, req.query);
      res.status(200).json(tasks);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };
}