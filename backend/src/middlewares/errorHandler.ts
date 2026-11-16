import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import mongoose from 'mongoose';
import { AppError } from '../utils/AppError';
import { env } from '../config/env';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errorCode = err.errorCode || 'INTERNAL_ERROR';
  let details = err.details || undefined;

  // Handle Zod Validation Errors
  if (err instanceof ZodError) {
    statusCode = 422;
    errorCode = 'VALIDATION_ERROR';
    message = 'Request validation failed';
    details = err.issues.map((e) => ({
      path: e.path.join('.'),
      message: e.message,
    }));
  }

  // Handle Mongoose Validation Errors
  if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 422;
    errorCode = 'MONGOOSE_VALIDATION_ERROR';
    message = 'Database validation constraint failed';
    details = Object.values(err.errors).map((e: any) => ({
      field: e.path,
      message: e.message,
    }));
  }

  // Handle MongoDB Duplicate Key (E11000)
  if (err.code === 11000) {
    statusCode = 409;
    errorCode = 'DUPLICATE_KEY_ERROR';
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const value = err.keyValue ? err.keyValue[field] : 'unknown';
    message = `Duplicate value '${value}' for unique field '${field}'`;
    details = { field, value };
  }

  // Handle Invalid MongoDB ObjectId CastError
  if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    errorCode = 'INVALID_ID_FORMAT';
    message = `Invalid format for identifier '${err.value}'`;
  }

  // Handle JSON parse errors
  if (err instanceof SyntaxError && 'body' in err) {
    statusCode = 400;
    errorCode = 'MALFORMED_JSON';
    message = 'Malformed JSON payload in request body';
  }

  // Log non-operational errors in development/production
  if (!err.isOperational && statusCode === 500) {
    console.error('[Unhandled Server Error]:', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    errorCode,
    ...(details && { details }),
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method,
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
