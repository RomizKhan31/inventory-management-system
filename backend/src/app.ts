
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

export const createApp = (): Application => {
  const app = express();

  // 1. Security Middlewares
  app.use(
    helmet({
      contentSecurityPolicy: false, // Allows Swagger UI and local development API tools to render cleanly
    })
  );

  // 2. CORS Configuration
  const allowedOrigins = [
    env.CORS_ORIGIN,
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`CORS policy blocked access from origin: ${origin}`));
        }
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
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        tryItOutEnabled: true,
      },
    })
  );

  // Expose raw OpenAPI JSON spec for external testing tools / Postman import
  app.get('/api-docs.json', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(swaggerSpec);
  });

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
