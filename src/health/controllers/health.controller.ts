import { Request, Response } from 'express';
import { IHealthService } from '../services/health.service';

export class HealthController {
  constructor(private readonly healthService: IHealthService) {}

  getHealth = async (_req: Request, res: Response): Promise<void> => {
    try {
      const health = await this.healthService.checkHealth();
      res.status(200).json(health);
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        message: 'Health check failed',
      });
    }
  };
}