import { Request, Response, NextFunction } from 'express';
import { authService, AuthService } from './auth.service';
import {
  loginSchema,
  changePasswordSchema,
  adminRegisterSchema,
} from './auth.validation';
import { sendResponse } from '../../utils/response';
import { AppError } from '../../utils/AppError';

export class AuthController {
  /**
   * POST /api/v1/auth/login or /api/auth/login
   */
  public async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedInput = loginSchema.parse(req.body);
      const meta = {
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
      };

      const result = await authService.login(validatedInput, meta);
      sendResponse(res, 200, 'Login successful', result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/logout or /api/auth/logout
   */
  public async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw AppError.unauthorized('Authentication required', 'AUTHENTICATION_REQUIRED');
      }

      const meta = {
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
      };

      await authService.logout(req.user, meta);
      sendResponse(res, 200, 'Logged out successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/auth/me or /api/auth/me
   */
  public async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw AppError.unauthorized('Authentication required', 'AUTHENTICATION_REQUIRED');
      }

      const sanitized = AuthService.sanitizeUser(req.user);
      sendResponse(res, 200, 'Authenticated user profile retrieved successfully', sanitized);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/change-password or /api/auth/change-password
   */
  public async changePassword(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw AppError.unauthorized('Authentication required', 'AUTHENTICATION_REQUIRED');
      }

      const validatedInput = changePasswordSchema.parse(req.body);
      const meta = {
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
      };

      await authService.changePassword(
        req.user._id.toString(),
        validatedInput,
        meta
      );

      sendResponse(res, 200, 'Password changed successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/register (Admin Only)
   */
  public async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw AppError.unauthorized('Authentication required', 'AUTHENTICATION_REQUIRED');
      }

      const validatedInput = adminRegisterSchema.parse(req.body);
      const meta = {
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
      };

      const newUser = await authService.registerUserByAdmin(
        req.user,
        validatedInput,
        meta
      );

      sendResponse(res, 201, 'User account created successfully', newUser);
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
