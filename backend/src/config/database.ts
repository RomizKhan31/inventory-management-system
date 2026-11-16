import { ConnectOptions } from 'mongoose';
import { env } from './env';

export const dbConfig = {
  uri: env.MONGODB_URI,
  options: {
    autoIndex: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    maxPoolSize: 50,
    minPoolSize: 10,
  } as ConnectOptions,
};
