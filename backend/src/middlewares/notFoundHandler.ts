import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  next(
    AppError.notFound(
      `Route not found: ${req.method} ${req.originalUrl}`,
      'ROUTE_NOT_FOUND'
    )
  );
};
