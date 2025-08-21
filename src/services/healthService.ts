import sequelize from '../config/sequelize';

export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  database: {
    connected: boolean;
    error?: string;
  };
  timestamp: string;
}

export async function checkHealth(): Promise<HealthStatus> {
  const healthStatus: HealthStatus = {
    status: 'healthy',
    database: {
      connected: false
    },
    timestamp: new Date().toISOString()
  };

  try {
    await sequelize.authenticate();
    healthStatus.database.connected = true;
  } catch (error) {
    healthStatus.status = 'unhealthy';
    healthStatus.database.connected = false;
    healthStatus.database.error = error instanceof Error ? error.message : 'Unknown database error';
  }

  return healthStatus;
}