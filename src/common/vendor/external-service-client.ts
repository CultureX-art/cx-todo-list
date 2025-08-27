/**
 * External Service Client
 *
 * Handles HTTP communication with external services.
 */

export interface IExternalServiceClient {
  healthCheck(): Promise<{
    responseTimeMs: number;
    services: string[];
    partialFailures?: string[];
  }>;
  getServiceStats(): Promise<{
    availability: number;
    averageResponseTime: number;
  }>;
}
