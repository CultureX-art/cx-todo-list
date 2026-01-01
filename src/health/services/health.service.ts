import { Health } from '../models/health';

export interface IHealthService {
  checkHealth(): Promise<Health>;
}
