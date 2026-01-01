import { getConfig } from '../../config/environment';
import { Health, HealthIndicator, HealthStatus } from '../models/health';
import { IHealthService } from './health.service';

export class HealthServiceImpl implements IHealthService {
  private readonly indicators: HealthIndicator[];

  constructor(indicators: HealthIndicator[] = []) {
    this.indicators = indicators;
  }

  async checkHealth(): Promise<Health> {
    const serviceResults = await Promise.all(
      this.indicators.map((indicator) => indicator.check()),
    );

    const overallStatus = this.calculateOverallStatus(
      serviceResults.map((res) => res.status),
    );

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: getConfig().version,
      uptime: process.uptime(),
      services: serviceResults,
    };
  }

  private calculateOverallStatus(statuses: HealthStatus[]): HealthStatus {
    if (statuses.some((s) => s === 'unhealthy')) {
      return 'unhealthy';
    }
    if (statuses.some((s) => s === 'degraded')) {
      return 'degraded';
    }
    return 'healthy';
  }
}