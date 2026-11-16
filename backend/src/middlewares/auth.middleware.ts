import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { User, UserRole } from '../database/models/User';
import { AppError } from '../utils/AppError';
import { Permission, hasAllPermissions, isRoleAllowed } from '../config/rbac';

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
 * Role-Based Access Control Middleware (Role Level):
 * Verifies that the authenticated user holds one of the required roles.
 */
export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(
        AppError.unauthorized('Authentication required', 'AUTHENTICATION_REQUIRED')
      );
    }

    if (!isRoleAllowed(req.user.role, allowedRoles)) {
      return next(
        AppError.forbidden(
          `Access denied. Role '${req.user.role}' is not authorized for this resource. Required role(s): [${allowedRoles.join(
            ', '
          )}]`,
          'ROLE_NOT_AUTHORIZED'
        )
      );
    }

    next();
  };
};

/**
 * Permission-Based Access Control Middleware (Granular Permission Level):
 * Verifies that the authenticated user's role grants all required permissions.
 */
export const requirePermission = (...requiredPermissions: Permission[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(
        AppError.unauthorized('Authentication required', 'AUTHENTICATION_REQUIRED')
      );
    }

    if (!hasAllPermissions(req.user.role, requiredPermissions)) {
      return next(
        AppError.forbidden(
          `Access denied. Role '${req.user.role}' lacks permission: [${requiredPermissions.join(
            ', '
          )}]`,
          'PERMISSION_DENIED'
        )
      );
    }

    next();
  };
};
