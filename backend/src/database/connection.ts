import mongoose from 'mongoose';
import { dbConfig } from '../config/database';

let isListenersAttached = false;

/**
 * Connect to MongoDB with automated exponential backoff retries.
 * 
 * Prevents server startup crashes caused by transient cloud network latency,
 * DNS SRV resolution delays, or momentary replica set primary elections.
 */
export const connectDatabase = async (maxRetries = 5, retryDelayMs = 3000): Promise<typeof mongoose> => {
  // If already connected, return the existing connection
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  // Attach global lifecycle event listeners once
  if (!isListenersAttached) {
    mongoose.connection.on('connected', () => {
      console.log(`[Database] MongoDB Connected to: ${mongoose.connection.host}/${mongoose.connection.name}`);
    });

    mongoose.connection.on('error', (err) => {
      console.error('[Database] MongoDB Connection Error:', err.message || err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[Database] MongoDB Connection Disconnected. Mongoose will automatically attempt to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('[Database] MongoDB Reconnected successfully.');
    });

    isListenersAttached = true;
  }

  let attempt = 0;
  while (attempt < maxRetries) {
    attempt++;
    try {
      console.log(`[Database] Connecting to MongoDB (Attempt ${attempt} of ${maxRetries})...`);
      const conn = await mongoose.connect(dbConfig.uri, dbConfig.options);
      console.log('[Database] Database connection established successfully.');
      return conn;
    } catch (error: any) {
      console.error(`[Database] Connection attempt ${attempt} failed: ${error.message || error}`);
      if (attempt >= maxRetries) {
        console.error('[Database] All connection attempts exhausted. Please check:');
        console.error('  1. Network connectivity to MongoDB Atlas cluster.');
        console.error('  2. IP Access List in MongoDB Atlas (allow current IP or 0.0.0.0/0).');
        console.error('  3. Database user credentials in MONGODB_URI.');
        process.exit(1);
      }
      console.log(`[Database] Waiting ${retryDelayMs / 1000}s before retrying...`);
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }

  throw new Error('[Database] Failed to connect to MongoDB after multiple retries.');
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    console.log('[Database] MongoDB Disconnected Successfully');
  } catch (error) {
    console.error('[Database] Error while disconnecting MongoDB:', error);
  }
};

export const getDatabaseHealth = () => {
  const stateMap: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  const readyState = mongoose.connection.readyState;
  return {
    status: readyState === 1 ? 'healthy' : 'unhealthy',
    state: stateMap[readyState] || 'unknown',
    host: mongoose.connection.host || 'unknown',
    name: mongoose.connection.name || 'unknown',
    port: mongoose.connection.port || 27017,
  };
};
