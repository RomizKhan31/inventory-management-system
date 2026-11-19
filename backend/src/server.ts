import { Server } from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './database/connection';

let server: Server;

const startServer = async () => {
  try {
    console.log('[Server] Initializing Walton Inventory Management System Backend...');

    // 1. Establish MongoDB Atlas / Replica Set Connection
    await connectDatabase();

    // 2. Create Express Application
    const app = createApp();

    // 3. Start HTTP Server
    server = app.listen(env.PORT, () => {
      console.log(`[Server] Server is running in [${env.NODE_ENV}] mode on port: ${env.PORT}`);
      console.log(`[Server] Health Check URL: http://localhost:${env.PORT}/api/v1/health`);
    });
  } catch (error) {
    console.error('[Server] Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful Shutdown Process
const handleGracefulShutdown = async (signal: string) => {
  console.log(`\n[Shutdown] Received ${signal}. Starting graceful shutdown...`);
  if (server) {
    server.close(async () => {
      console.log('[Shutdown] Closed remaining HTTP connections.');
      await disconnectDatabase();
      console.log('[Shutdown] Process terminated gracefully.');
      process.exit(0);
    });

    // Force shutdown after 10s timeout
    setTimeout(() => {
      console.error('[Shutdown] Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
};

process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));
process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));

process.on('unhandledRejection', (reason: any) => {
  console.error('💥 Unhandled Rejection at Promise:', reason);
});

process.on('uncaughtException', (error: Error) => {
  console.error('💥 Uncaught Exception thrown:', error);
  process.exit(1);
});

startServer();
