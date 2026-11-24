import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';
import { env } from './env';

const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Walton Inventory Management System API',
      version: '1.0.0',
      description: `
### Industrial Discrete Manufacturing Barcode Inventory Tracking & Lifecycle System
REST API documentation for Walton Hi-Tech Industries PLC.

---

### Quick Authentication & Testing Guide (Like Postman)
1. Go to **Authentication** -> \`POST /api/v1/auth/login\`.
2. Click **Try it out** and use any of the pre-configured credentials below:
   - **System Administrator (ADMIN)**: UserCode: \`ADMIN01\` | Password: \`Walton@2026\`
   - **Component Tracker (COMPONENT_TRACKER)**: UserCode: \`66798\` | Password: \`Walton@2026\`
   - **Product Receiver (RECEIVE_USER)**: UserCode: \`58877\` | Password: \`Walton@2026\`
   - **Product Deliverer (DELIVERY_USER)**: UserCode: \`54671\` | Password: \`Walton@2026\`
   - **Report Viewer (REPORT_VIEWER)**: UserCode: \`VIEW01\` | Password: \`Walton@2026\`
3. Copy the \`token\` from the login response.
4. Click the green **Authorize 🔓** button at the top of this page.
5. Paste the token into the field (Swagger will automatically attach \`Bearer <token>\`).
6. Now you can test all protected endpoints directly from Swagger!
      `,
      contact: {
        name: 'Walton Discrete Operations Team',
        email: 'inventory-support@waltonbd.com',
      },
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}`,
        description: 'Local Development Server',
      },
    ],
    tags: [
      {
        name: 'Health',
        description: 'Server & Database health check endpoints',
      },
      {
        name: 'Authentication',
        description: 'Operator authentication, session management, and password updates',
      },
      {
        name: 'Inventory Operations',
        description: 'Component tracking, warehouse bay receiving, dock delivery, and transaction queries',
      },
      {
        name: 'Reversals & Corrections',
        description: 'Compensating administrative reversals with mandatory audit justification',
      },
      {
        name: 'Master Data - Overview',
        description: 'Master catalogs high-level metrics and statistics',
      },
      {
        name: 'Master Data - Products',
        description: 'Finished product models and assembly definitions',
      },
      {
        name: 'Master Data - Components',
        description: 'Serialized modular component definitions (Compressors, Condensers, PCBA)',
      },
      {
        name: 'Master Data - Receive Points',
        description: 'Physical warehouse intake bays',
      },
      {
        name: 'Master Data - Delivery Points',
        description: 'Physical outbound logistics docks',
      },
      {
        name: 'User Management',
        description: 'Operator accounts, credentials, and single-role assignment (ADMIN only)',
      },
      {
        name: 'Reports & Analytics',
        description: 'Real-time stock details, throughput summaries, barcode journey, and CSV exports',
      },
      {
        name: 'Audit Logs',
        description: 'System-wide immutable change log and operator modification history (ADMIN only)',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description:
            'Enter your JWT token obtained from POST /api/v1/auth/login. Prefix: none (Swagger automatically attaches "Bearer ").',
        },
      },
      schemas: {
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            statusCode: { type: 'integer', example: 200 },
            message: { type: 'string', example: 'Operation completed successfully' },
            data: { type: 'object' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
        ApiError: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            statusCode: { type: 'integer', example: 400 },
            errorCode: { type: 'string', example: 'VALIDATION_ERROR' },
            message: { type: 'string', example: 'Invalid request input' },
            details: { type: 'array', items: { type: 'object' } },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
        PaginationMeta: {
          type: 'object',
          properties: {
            total: { type: 'integer', example: 42 },
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 20 },
            totalPages: { type: 'integer', example: 3 },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },

  // Discover Swagger annotations across all routes, modules, and config files
  apis: [
    path.join(__dirname, '../routes/**/*.ts'),
    path.join(__dirname, '../modules/**/*.ts'),
    path.join(__dirname, '../**/*.ts'),
    path.resolve(process.cwd(), 'src/**/*.ts'),
    path.resolve(process.cwd(), 'backend/src/**/*.ts'),
  ],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

export default swaggerSpec;
