import { z } from 'zod';

const VALID_ROLES = [
  'ADMIN',
  'COMPONENT_TRACKER',
  'RECEIVE_USER',
  'DELIVERY_USER',
  'REPORT_VIEWER',
] as const;

export const createUserSchema = z.object({
  userCode: z
    .string()
    .trim()
    .min(3, 'User Code must be at least 3 characters')
    .max(20, 'User Code cannot exceed 20 characters')
    .transform((val) => val.toUpperCase()),
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters'),
  email: z
    .string()
    .trim()
    .email('Please provide a valid email address')
    .transform((val) => val.toLowerCase()),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters'),
  role: z.enum(VALID_ROLES, {
    message: 'Role must be one of ADMIN, COMPONENT_TRACKER, RECEIVE_USER, DELIVERY_USER, REPORT_VIEWER',
  }),
});

export const updateUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters')
    .optional(),
  email: z
    .string()
    .trim()
    .email('Please provide a valid email address')
    .transform((val) => val.toLowerCase())
    .optional(),
});

export const changeRoleSchema = z.object({
  role: z.enum(VALID_ROLES, {
    message: 'Role must be one of ADMIN, COMPONENT_TRACKER, RECEIVE_USER, DELIVERY_USER, REPORT_VIEWER',
  }),
});

export const updateStatusSchema = z.object({
  isActive: z.boolean({
    message: 'Field "isActive" must be a boolean',
  }),
});
