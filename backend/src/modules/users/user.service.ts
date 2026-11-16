import bcrypt from 'bcryptjs';
import { Request } from 'express';
import { User, IUser, UserRole } from '../../database/models/User';
import { AppError } from '../../utils/AppError';
import { AuthService } from '../auth/auth.service';
import { AuditService } from '../audit/audit.service';

export interface UserFilterOptions {
  search?: string;
  role?: string;
  isActive?: string;
  page?: number;
  limit?: number;
}

export class UserService {
  /**
   * List users with search, role filter, active status, and pagination
   */
  static async getUsers(options: UserFilterOptions) {
    const filter: Record<string, any> = {};

    if (options.role && options.role !== 'ALL') {
      filter.role = options.role;
    }

    if (options.isActive !== undefined && options.isActive !== 'ALL') {
      filter.isActive = options.isActive === 'true';
    }

    if (options.search && options.search.trim()) {
      const regex = new RegExp(options.search.trim(), 'i');
      filter.$or = [
        { name: regex },
        { email: regex },
        { userCode: regex },
      ];
    }

    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(options.limit) || 20));
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    return {
      data: users.map((u) => AuthService.sanitizeUser(u)),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Get single user by ID
   */
  static async getUserById(id: string) {
    const user = await User.findById(id);
    if (!user) {
      throw AppError.notFound('User not found');
    }
    return AuthService.sanitizeUser(user);
  }

  /**
   * Create a new user with single role assignment
   */
  static async createUser(
    data: {
      userCode: string;
      name: string;
      email: string;
      password: string;
      role: UserRole;
    },
    req: Request
  ) {
    // 1. Check existing userCode
    const existingCode = await User.findOne({ userCode: data.userCode.toUpperCase() });
    if (existingCode) {
      throw AppError.conflict(`User code '${data.userCode}' is already registered`);
    }

    // 2. Check existing email
    const existingEmail = await User.findOne({ email: data.email.toLowerCase() });
    if (existingEmail) {
      throw AppError.conflict(`Email '${data.email}' is already registered`);
    }

    // 3. Hash password
    const passwordHash = await bcrypt.hash(data.password, 12);

    // 4. Create user
    const newUser = await User.create({
      userCode: data.userCode.toUpperCase(),
      name: data.name.trim(),
      email: data.email.toLowerCase(),
      passwordHash,
      role: data.role,
      isActive: true,
    });

    const sanitized = AuthService.sanitizeUser(newUser);

    // 5. Audit Log
    await AuditService.log({
      action: 'USER_CREATED',
      entity: 'USER',
      entityId: newUser.userCode,
      newValues: {
        userCode: newUser.userCode,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        isActive: newUser.isActive,
      },
      req,
    });

    return sanitized;
  }

  /**
   * Update user general info (name, email)
   */
  static async updateUser(
    id: string,
    updates: { name?: string; email?: string },
    req: Request
  ) {
    const user = await User.findById(id);
    if (!user) {
      throw AppError.notFound('User not found');
    }

    const previousValues = {
      name: user.name,
      email: user.email,
    };

    if (updates.email && updates.email.toLowerCase() !== user.email) {
      const emailExists = await User.findOne({
        email: updates.email.toLowerCase(),
        _id: { $ne: user._id },
      });
      if (emailExists) {
        throw AppError.conflict(`Email '${updates.email}' is already in use`);
      }
      user.email = updates.email.toLowerCase();
    }

    if (updates.name) {
      user.name = updates.name.trim();
    }

    await user.save();
    const sanitized = AuthService.sanitizeUser(user);

    // Audit Log
    await AuditService.log({
      action: 'USER_UPDATED',
      entity: 'USER',
      entityId: user.userCode,
      previousValues,
      newValues: {
        name: user.name,
        email: user.email,
      },
      req,
    });

    return sanitized;
  }

  /**
   * Assign / change user single role
   */
  static async changeUserRole(id: string, newRole: UserRole, req: Request) {
    const user = await User.findById(id);
    if (!user) {
      throw AppError.notFound('User not found');
    }

    // Check if role is identical
    if (user.role === newRole) {
      return AuthService.sanitizeUser(user);
    }

    const previousRole = user.role;
    user.role = newRole;
    await user.save();

    const sanitized = AuthService.sanitizeUser(user);

    // Audit Log
    await AuditService.log({
      action: 'USER_ROLE_CHANGED',
      entity: 'USER',
      entityId: user.userCode,
      previousValues: { role: previousRole },
      newValues: { role: newRole },
      req,
    });

    return sanitized;
  }

  /**
   * Soft activation / deactivation of user accounts
   */
  static async setUserStatus(id: string, isActive: boolean, req: Request) {
    const user = await User.findById(id);
    if (!user) {
      throw AppError.notFound('User not found');
    }

    // Prevent self-deactivation by admin
    if (user._id.toString() === req.user?._id.toString() && !isActive) {
      throw AppError.badRequest('Administrators cannot deactivate their own account');
    }

    const previousStatus = user.isActive;
    user.isActive = isActive;
    await user.save();

    const sanitized = AuthService.sanitizeUser(user);

    // Audit Log
    await AuditService.log({
      action: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      entity: 'USER',
      entityId: user.userCode,
      previousValues: { isActive: previousStatus },
      newValues: { isActive },
      req,
    });

    return sanitized;
  }

  /**
   * Soft delete user (always soft deactivates, never permanently deletes)
   */
  static async softDeleteUser(id: string, req: Request) {
    return this.setUserStatus(id, false, req);
  }
}
