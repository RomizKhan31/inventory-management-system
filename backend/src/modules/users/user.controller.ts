import { Request, Response, NextFunction } from 'express';
import { UserService } from './user.service';
import {
  createUserSchema,
  updateUserSchema,
  changeRoleSchema,
  updateStatusSchema,
} from './user.validation';
import { sendResponse } from '../../utils/response';

export class UserController {
  static async listUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await UserService.getUsers(req.query);
      sendResponse(res, 200, 'Users retrieved successfully', result.data, result.pagination);
    } catch (err) {
      next(err);
    }
  }

  static async getUser(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const user = await UserService.getUserById(id);
      sendResponse(res, 200, 'User retrieved successfully', user);
    } catch (err) {
      next(err);
    }
  }

  static async createUser(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = createUserSchema.parse(req.body);
      const user = await UserService.createUser(validated, req);
      sendResponse(res, 201, 'User created successfully', user);
    } catch (err) {
      next(err);
    }
  }

  static async updateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const validated = updateUserSchema.parse(req.body);
      const user = await UserService.updateUser(id, validated, req);
      sendResponse(res, 200, 'User updated successfully', user);
    } catch (err) {
      next(err);
    }
  }

  static async changeRole(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { role } = changeRoleSchema.parse(req.body);
      const user = await UserService.changeUserRole(id, role, req);
      sendResponse(res, 200, 'User role updated successfully', user);
    } catch (err) {
      next(err);
    }
  }

  static async toggleStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { isActive } = updateStatusSchema.parse(req.body);
      const user = await UserService.setUserStatus(id, isActive, req);
      sendResponse(
        res,
        200,
        `User account ${isActive ? 'activated' : 'deactivated'} successfully`,
        user
      );
    } catch (err) {
      next(err);
    }
  }

  static async softDelete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const user = await UserService.softDeleteUser(id, req);
      sendResponse(
        res,
        200,
        'User account deactivated (soft-deleted) successfully to preserve audit history',
        user
      );
    } catch (err) {
      next(err);
    }
  }
}
