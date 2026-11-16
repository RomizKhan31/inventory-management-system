import { UserRole } from '../types/auth';

export interface NavItem {
  name: string;
  href: string;
  category: 'Operations' | 'Analytics' | 'Administration' | 'General';
  allowedRoles: UserRole[];
  description?: string;
}

export const NAVIGATION_ITEMS: NavItem[] = [
  // Operational Scan Stations
  {
    name: 'Component Tracking',
    href: '/operations/component-tracking',
    category: 'Operations',
    allowedRoles: ['ADMIN', 'COMPONENT_TRACKER'],
    description: 'Bind serialized sub-assembly barcodes to product chassis',
  },
  {
    name: 'Product Receiving',
    href: '/operations/receive',
    category: 'Operations',
    allowedRoles: ['ADMIN', 'RECEIVE_USER'],
    description: 'Admit tracked products into warehouse inventory bays',
  },
  {
    name: 'Product Delivery',
    href: '/operations/delivery',
    category: 'Operations',
    allowedRoles: ['ADMIN', 'DELIVERY_USER'],
    description: 'Dispatch available stock through outbound docks',
  },
  {
    name: 'Reversals & Correction',
    href: '/operations/reversals',
    category: 'Operations',
    allowedRoles: ['ADMIN'],
    description: 'Reverse operations with mandatory audit reasons',
  },

  // Reports & Analytics
  {
    name: 'Stock Details',
    href: '/reports/stock-details',
    category: 'Analytics',
    allowedRoles: ['ADMIN', 'REPORT_VIEWER'],
    description: 'Real-time inventory levels by receive location',
  },
  {
    name: 'Summary & Trends',
    href: '/reports/summary',
    category: 'Analytics',
    allowedRoles: ['ADMIN', 'REPORT_VIEWER'],
    description: 'Date-range throughput aggregates and graphical series',
  },
  {
    name: 'Barcode Journey',
    href: '/reports/barcode-history',
    category: 'Analytics',
    allowedRoles: ['ADMIN', 'REPORT_VIEWER'],
    description: 'Full chronological event timeline for any barcode',
  },
  {
    name: 'Audit Logs',
    href: '/reports/audit-logs',
    category: 'Analytics',
    allowedRoles: ['ADMIN'],
    description: 'System-wide access and master data modification trail',
  },

  // Master Data & User Administration
  {
    name: 'Master Catalogs',
    href: '/admin/master-data',
    category: 'Administration',
    allowedRoles: ['ADMIN'],
    description: 'Manage products, components, and physical bay locations',
  },
  {
    name: 'User Management',
    href: '/admin/users',
    category: 'Administration',
    allowedRoles: ['ADMIN'],
    description: 'Manage employee accounts and single role assignments',
  },
];

export const getNavItemsForRole = (role?: UserRole): NavItem[] => {
  if (!role) return [];
  return NAVIGATION_ITEMS.filter((item) => item.allowedRoles.includes(role));
};

export const getGroupedNavForRole = (role?: UserRole): Record<string, NavItem[]> => {
  const items = getNavItemsForRole(role);
  const groups: Record<string, NavItem[]> = {};
  for (const item of items) {
    if (!groups[item.category]) {
      groups[item.category] = [];
    }
    groups[item.category].push(item);
  }
  return groups;
};
