import { Router, Request, Response } from 'express';
import { getDatabaseHealth } from '../database/connection';
import { env } from '../config/env';

const router = Router();

/**
 * @swagger
 * /api/v1/health:
 *   get:
 *     summary: Check backend health status
 *     description: Checks the backend server and MongoDB database connection status.
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: Backend and database are healthy.
 *       503:
 *         description: Backend is running but database is unhealthy.
 */

router.get('/health', async (req: Request, res: Response) => {
  const dbHealth = getDatabaseHealth();
  const isHealthy = dbHealth.status === 'healthy';

  const healthData = {
    status: isHealthy ? 'UP' : 'DEGRADED',
    message: isHealthy
      ? 'Inventory Management System API is operating normally'
      : 'API is running but database is not connected',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: env.NODE_ENV,
    version: '1.0.0',
    database: dbHealth,
    process: {
      pid: process.pid,
      nodeVersion: process.version,
      memoryUsageMB: {
        rss: (process.memoryUsage().rss / 1024 / 1024).toFixed(2),
        heapUsed: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2),
      },
    },
  };

  const statusCode = isHealthy ? 200 : 503;
  res.status(statusCode).json({
    success: isHealthy,
    ...healthData,
  });
});

export const healthRoutes = router;
