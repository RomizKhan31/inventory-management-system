import mongoose from 'mongoose';
import { dbConfig } from '../config/database';

export const connectDatabase = async (): Promise<typeof mongoose> => {
  try {
    mongoose.connection.on('connected', () => {
      console.log(`[Database] MongoDB Connected to: ${mongoose.connection.host}/${mongoose.connection.name}`);
    });

    mongoose.connection.on('error', (err) => {
      console.error('[Database] MongoDB Connection Error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[Database] MongoDB Connection Disconnected. Retrying...');
    });

    const conn = await mongoose.connect(dbConfig.uri, dbConfig.options);
    return conn;
  } catch (error) {
    console.error('[Database] Failed to connect to MongoDB:', error);
    process.exit(1);
  }
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
