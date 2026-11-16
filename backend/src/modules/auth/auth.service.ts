import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { User, IUser, UserRole } from '../../database/models/User';
import { AuditLog } from '../../database/models/AuditLog';
import { AppError } from '../../utils/AppError';
import {
  LoginInput,
  ChangePasswordInput,
  AdminRegisterInput,
} from './auth.validation';

export interface UserSanitized {
  id: string;
  userCode: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthMetadata {
  ipAddress?: string;
  userAgent?: string;
}

export class AuthService {
  /**
   * Helper to strip sensitive fields from user object
   */
  public static sanitizeUser(user: IUser): UserSanitized {
    return {
      id: user._id.toString(),
      userCode: user.userCode,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * User Login: Validates credentials, checks account activation, signs JWT, logs audit
   */
  public async login(
    input: LoginInput,
    meta: AuthMetadata = {}
  ): Promise<{ token: string; user: UserSanitized }> {
    const rawIdentifier = input.identifier.trim();
    const upperCode = rawIdentifier.toUpperCase();
    const lowerEmail = rawIdentifier.toLowerCase();

    // Query user by userCode or email with password hash included
    const user = await User.findOne({
      $or: [{ userCode: upperCode }, { email: lowerEmail }],
    }).select('+passwordHash');

    if (!user) {
      // Audit log failed login attempt (unknown identity)
      await AuditLog.create({
        action: 'USER_LOGIN_FAILED',
        entity: 'USER',
        userCode: upperCode,
        newValues: { reason: 'User not found', identifier: rawIdentifier },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        timestamp: new Date(),
      });

      throw AppError.unauthorized('Invalid identifier or password', 'INVALID_CREDENTIALS');
    }

    // Check account activation
    if (!user.isActive) {
      await AuditLog.create({
        action: 'USER_LOGIN_FAILED',
        entity: 'USER',
        entityId: user._id.toString(),
        performedBy: user._id,
        userCode: user.userCode,
        userName: user.name,
        newValues: { reason: 'Account deactivated' },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        timestamp: new Date(),
      });

      throw AppError.forbidden(
        'Your account has been deactivated. Please contact a system administrator.',
        'ACCOUNT_DEACTIVATED'
      );
    }

    // Verify password hash
    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isPasswordValid) {
      await AuditLog.create({
        action: 'USER_LOGIN_FAILED',
        entity: 'USER',
        entityId: user._id.toString(),
        performedBy: user._id,
        userCode: user.userCode,
        userName: user.name,
        newValues: { reason: 'Password mismatch' },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        timestamp: new Date(),
      });

      throw AppError.unauthorized('Invalid identifier or password', 'INVALID_CREDENTIALS');
    }

    // Update lastLoginAt
    user.lastLoginAt = new Date();
    await user.save();

    // Sign JWT Token
    const token = jwt.sign(
      {
        id: user._id.toString(),
        userCode: user.userCode,
        role: user.role,
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions
    );

    // Audit log successful login
    await AuditLog.create({
      action: 'USER_LOGIN',
      entity: 'USER',
      entityId: user._id.toString(),
      performedBy: user._id,
      userCode: user.userCode,
      userName: user.name,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      timestamp: new Date(),
    });

    return {
      token,
      user: AuthService.sanitizeUser(user),
    };
  }

  /**
   * Password Change: Verifies current password, enforces complexity, hashes and persists
   */
  public async changePassword(
    userId: string,
    input: ChangePasswordInput,
    meta: AuthMetadata = {}
  ): Promise<void> {
    const user = await User.findById(userId).select('+passwordHash');
    if (!user) {
      throw AppError.notFound('User not found', 'USER_NOT_FOUND');
    }

    if (!user.isActive) {
      throw AppError.forbidden('Deactivated account cannot change password', 'ACCOUNT_DEACTIVATED');
    }

    // Verify current password
    const isCurrentValid = await bcrypt.compare(input.currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      throw AppError.badRequest('Current password is incorrect', 'INVALID_CURRENT_PASSWORD');
    }

    // Prevent re-using identical password
    const isSamePassword = await bcrypt.compare(input.newPassword, user.passwordHash);
    if (isSamePassword) {
      throw AppError.badRequest(
        'New password must be different from your current password',
        'SAME_PASSWORD'
      );
    }

    // Hash and save new password
    const newHash = await bcrypt.hash(input.newPassword, env.BCRYPT_SALT_ROUNDS);
    user.passwordHash = newHash;
    await user.save();

    // Audit log password change
    await AuditLog.create({
      action: 'USER_PASSWORD_CHANGED',
      entity: 'USER',
      entityId: user._id.toString(),
      performedBy: user._id,
      userCode: user.userCode,
      userName: user.name,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      timestamp: new Date(),
    });
  }

  /**
   * User Logout: Records audit log
   */
  public async logout(user: IUser, meta: AuthMetadata = {}): Promise<void> {
    await AuditLog.create({
      action: 'USER_LOGOUT',
      entity: 'USER',
      entityId: user._id.toString(),
      performedBy: user._id,
      userCode: user.userCode,
      userName: user.name,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      timestamp: new Date(),
    });
  }

  /**
   * Admin-Only User Registration: Follows approved policy (no public self-registration)
   */
  public async registerUserByAdmin(
    adminUser: IUser,
    input: AdminRegisterInput,
    meta: AuthMetadata = {}
  ): Promise<UserSanitized> {
    const upperCode = input.userCode.trim().toUpperCase();
    const lowerEmail = input.email.trim().toLowerCase();

    // Check uniqueness
    const existing = await User.findOne({
      $or: [{ userCode: upperCode }, { email: lowerEmail }],
    });

    if (existing) {
      if (existing.userCode === upperCode) {
        throw AppError.conflict(
          `User Code '${upperCode}' is already registered to another user`,
          'USER_CODE_EXISTS'
        );
      }
      throw AppError.conflict(
        `Email '${lowerEmail}' is already registered to another user`,
        'EMAIL_EXISTS'
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_SALT_ROUNDS);

    // Create user with exactly one role
    const newUser = await User.create({
      userCode: upperCode,
      name: input.name.trim(),
      email: lowerEmail,
      passwordHash,
      role: input.role,
      isActive: true,
    });

    // Audit log user creation
    await AuditLog.create({
      action: 'USER_CREATED',
      entity: 'USER',
      entityId: newUser._id.toString(),
      performedBy: adminUser._id,
      userCode: adminUser.userCode,
      userName: adminUser.name,
      newValues: {
        userCode: newUser.userCode,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      timestamp: new Date(),
    });

    return AuthService.sanitizeUser(newUser);
  }
}

export const authService = new AuthService();
