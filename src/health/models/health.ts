export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface HealthIndicatorResult {
  status: HealthStatus;
  message?: string;
  [key: string]: unknown;
}

export abstract class HealthIndicator {
  abstract name: string;
  abstract check(): Promise<HealthIndicatorResult>;
}

export interface Health {
  status: HealthStatus;
  timestamp: string;
  version: string;
  uptime: number;
  services: HealthIndicatorResult[];
}