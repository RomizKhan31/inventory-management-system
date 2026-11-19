import { ConnectOptions } from 'mongoose';
import { env } from './env';

/**
 * MongoDB Mongoose Connection Configuration
 * 
 * Configured specifically for cloud-hosted MongoDB Atlas Replica Sets:
 * 1. serverSelectionTimeoutMS: 30000 (30s) prevents premature timeout crashes during
 *    cold starts, TLS handshakes, or temporary primary elections across shard nodes.
 * 2. socketTimeoutMS & connectTimeoutMS: ensure active socket stability under load.
 * 3. maxPoolSize: maintains an efficient connection pool for high concurrent transactions.
 */
export const dbConfig = {
  uri: env.MONGODB_URI,
  options: {
    autoIndex: true,
    serverSelectionTimeoutMS: 30000, // 30s threshold prevents transient election / handshake timeout crashes
    connectTimeoutMS: 30000,         // 30s timeout for initial TCP connection establishment
    socketTimeoutMS: 45000,          // 45s socket inactivity timeout
    maxPoolSize: 50,                 // Connection pool capacity
    minPoolSize: 10,                 // Minimum hot connections kept alive
  } as ConnectOptions,
};

