import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { User, IUser, UserRole } from '../database/models/User';
import { AppError } from '../utils/AppError';

export interface JwtPayload {
  id: string;
  userCode: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

/**
 * Authentication Middleware:
 * Verifies JWT token and validates that the user exists and is active.
 * Forces logout immediately if user account has been deactivated.
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw AppError.unauthorized(
        'Authentication token is required. Please log in.',
        'TOKEN_MISSING'
      );
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw AppError.unauthorized(
        'Authentication token is malformed',
        'TOKEN_MALFORMED'
      );
    }

    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        throw AppError.unauthorized(
          'Your session has expired. Please log in again.',
          'TOKEN_EXPIRED'
        );
      }
      throw AppError.unauthorized(
        'Invalid authentication token. Please log in again.',
        'TOKEN_INVALID'
      );
    }

    // Active status check on every protected request (prevents inactive user access)
    const user = await User.findById(decoded.id).select(
      '_id userCode name email role isActive createdAt updatedAt'
    );

    if (!user) {
      throw AppError.unauthorized(
        'User account associated with this session no longer exists.',
        'USER_NOT_FOUND'
      );
    }

    if (!user.isActive) {
      throw AppError.forbidden(
        'Your account has been deactivated. Session terminated.',
        'ACCOUNT_DEACTIVATED'
      );
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Role-Based Access Control Middleware:
 * Verifies that the authenticated user holds one of the required roles.
 */
export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(
        AppError.unauthorized('Authentication required', 'AUTHENTICATION_REQUIRED')
      );
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        AppError.forbidden(
          `Access denied. Role '${req.user.role}' is not authorized for this resource. Required: [${allowedRoles.join(
            ', '
          )}]`,
          'ROLE_NOT_AUTHORIZED'
        )
      );
    }

    next();
  };
};
