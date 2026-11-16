export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errorCode?: string;
  details?: unknown;
  timestamp: string;
}

export interface HealthCheckResponse {
  success: boolean;
  status: 'UP' | 'DEGRADED';
  message: string;
  timestamp: string;
  uptimeSeconds: number;
  environment: string;
  version: string;
  database: {
    status: 'healthy' | 'unhealthy';
    state: string;
    host: string;
    name: string;
    port: number;
  };
  process: {
    pid: number;
    nodeVersion: string;
    memoryUsageMB: {
      rss: string;
      heapUsed: string;
    };
  };
}
