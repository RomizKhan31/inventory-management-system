import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';
import { env } from './env';

const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',

    info: {
      title: 'Walton Inventory Management System API',
      version: '1.0.0',
      description: 'REST API documentation for Walton Inventory Management System',
    },

    servers: [
      {
        url: `http://localhost:${env.PORT}`,
        description: 'Local Development Server',
      },
    ],
  },

  // Automatically discover Swagger annotations in TypeScript files.
  apis: [
    path.resolve(process.cwd(), 'src/**/*.ts'),
  ],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

export default swaggerSpec;