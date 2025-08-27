/**
 * Cache Client Interface and Implementation
 *
 * Provides caching capabilities for application data.
 */

export interface ICacheClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<string>;
  del(key: string): Promise<number>;
  ping(): Promise<{ responseTimeMs: number }>;
  getStats(): {
    hitRate: number;
    memoryUsage: number;
    connectedClients: number;
  };
  isConnected(): boolean;
  flushAll(): Promise<string>;
}
