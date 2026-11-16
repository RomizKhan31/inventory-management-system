import { UserRole } from '../database/models/User';

/**
 * Granular System Permissions
 */
export const PERMISSIONS = {
  // Master Data & Configuration
  MASTER_DATA_MANAGE: 'MASTER_DATA_MANAGE', // Full CRUD on products, components, points
  USER_MANAGE: 'USER_MANAGE',               // User provisioning, role assignment, activation/deactivation

  // Operational Inventory Scans
  OPERATION_COMPONENT_TRACK: 'OPERATION_COMPONENT_TRACK', // Scanning & binding components to chassis
  OPERATION_RECEIVE: 'OPERATION_RECEIVE',                 // Receiving finished units into warehouse stock
  OPERATION_DELIVER: 'OPERATION_DELIVER',                 // Delivering finished units from stock

  // Administrative Compensation
  OPERATION_REVERSE: 'OPERATION_REVERSE', // Reversing incorrect transactions with mandatory reason

  // Analytics & Reporting
  REPORT_VIEW: 'REPORT_VIEW',     // Viewing stock details, date-range summaries, barcode history
  REPORT_EXPORT: 'REPORT_EXPORT', // Exporting reports to CSV / Excel
  AUDIT_VIEW: 'AUDIT_VIEW',       // Viewing system audit logs
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * Authoritative Role-to-Permissions Mapping
 * Strictly enforces single-role responsibilities across the manufacturing plant.
 */
export const ROLE_PERMISSIONS_MAP: Record<UserRole, readonly Permission[]> = {
  ADMIN: [
    PERMISSIONS.MASTER_DATA_MANAGE,
    PERMISSIONS.USER_MANAGE,
    PERMISSIONS.OPERATION_COMPONENT_TRACK,
    PERMISSIONS.OPERATION_RECEIVE,
    PERMISSIONS.OPERATION_DELIVER,
    PERMISSIONS.OPERATION_REVERSE,
    PERMISSIONS.REPORT_VIEW,
    PERMISSIONS.REPORT_EXPORT,
    PERMISSIONS.AUDIT_VIEW,
  ],
  COMPONENT_TRACKER: [
    PERMISSIONS.OPERATION_COMPONENT_TRACK,
  ],
  RECEIVE_USER: [
    PERMISSIONS.OPERATION_RECEIVE,
  ],
  DELIVERY_USER: [
    PERMISSIONS.OPERATION_DELIVER,
  ],
  REPORT_VIEWER: [
    PERMISSIONS.REPORT_VIEW,
    PERMISSIONS.REPORT_EXPORT,
  ],
};

/**
 * Reusable RBAC Permission Checking Functions
 */

export const getRolePermissions = (role: UserRole): readonly Permission[] => {
  return ROLE_PERMISSIONS_MAP[role] || [];
};

export const hasPermission = (role: UserRole, permission: Permission): boolean => {
  const permissions = getRolePermissions(role);
  return permissions.includes(permission);
};

export const hasAnyPermission = (role: UserRole, requiredPermissions: Permission[]): boolean => {
  const permissions = getRolePermissions(role);
  return requiredPermissions.some((p) => permissions.includes(p));
};

export const hasAllPermissions = (role: UserRole, requiredPermissions: Permission[]): boolean => {
  const permissions = getRolePermissions(role);
  return requiredPermissions.every((p) => permissions.includes(p));
};

export const isRoleAllowed = (userRole: UserRole, allowedRoles: UserRole[]): boolean => {
  return allowedRoles.includes(userRole);
};
