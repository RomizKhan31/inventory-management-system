import { z } from 'zod';

export const USER_ROLES = [
  'ADMIN',
  'COMPONENT_TRACKER',
  'RECEIVE_USER',
  'DELIVERY_USER',
  'REPORT_VIEWER',
] as const;

export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(3, 'Identifier must be at least 3 characters')
    .max(100, 'Identifier cannot exceed 100 characters'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters'),
});

export const changePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, 'Current password cannot be empty'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters long')
    .max(100, 'New password cannot exceed 100 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'New password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
});

export const adminRegisterSchema = z.object({
  userCode: z
    .string()
    .trim()
    .min(3, 'User Code must be at least 3 characters')
    .max(20, 'User Code cannot exceed 20 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'User Code can only contain letters, numbers, hyphens, and underscores'),
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters'),
  email: z
    .string()
    .trim()
    .email('Invalid email address format')
    .toLowerCase(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  role: z.enum(USER_ROLES),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type AdminRegisterInput = z.infer<typeof adminRegisterSchema>;
