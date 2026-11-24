
import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';

import { env } from './config/env';
import swaggerSpec from './config/swagger';
import { apiRouter } from './routes';
import { authRoutes } from './modules/auth/auth.routes';
import { errorHandler } from './middlewares/errorHandler';
import { notFoundHandler } from './middlewares/notFoundHandler';
import { AppError } from './utils/AppError';

export const createApp = (): Application => {
  const app = express();

  // 1. Security Middlewares
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  // 2. CORS Configuration
  // Parse comma-separated or single CORS_ORIGIN values
  const configuredOrigins = env.CORS_ORIGIN
    ? env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
    : [];

  const defaultOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    `http://localhost:${env.PORT}`,
    `http://127.0.0.1:${env.PORT}`,
  ];

  const allowedOrigins = Array.from(new Set([...configuredOrigins, ...defaultOrigins]));

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, Postman, server-to-server)
        if (!origin) {
          return callback(null, true);
        }

        // In development mode, allow requests from any local development origin
        const isLocalDev =
          env.NODE_ENV === 'development' &&
          (/^https?:\/\/localhost(:\d+)?$/.test(origin) ||
           /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin));

        if (isLocalDev || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        // Return a proper 403 Forbidden AppError instead of an unhandled 500 error
        return callback(
          new AppError(
            `CORS policy blocked access from origin: ${origin}`,
            403,
            'CORS_FORBIDDEN'
          )
        );
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );

  // 3. Request Logging Middleware
  if (env.NODE_ENV !== 'test') {
    app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));
  }

  // 4. Body Parsing Middlewares
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 5. Swagger API Documentation
  // Provides interactive API documentation and testing through Swagger UI.
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'Walton Inventory Management System API Docs',
    })
  );

  // 6. Root Welcome Route
  app.get('/', (req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      name: 'Walton Inventory Management System API',
      version: '1.0.0',
      status: 'active',
      docs: '/api-docs',
      timestamp: new Date().toISOString(),
    });
  });

  // 7. API Routes
  app.use('/api/v1', apiRouter);
  app.use('/api/auth', authRoutes); // Direct alias for /api/auth/* endpoints

  // 8. 404 Route Handler
  app.use(notFoundHandler);

  // 9. Centralized Error Handler Middleware
  app.use(errorHandler);

  return app;
};
