import { UserRole } from './auth';

export interface IUserItem {
  id: string;
  userCode: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IProductItem {
  _id: string;
  productCode: string;
  barcode?: string;
  name: string;
  modelNumber?: string;
  category: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IComponentItem {
  _id: string;
  componentCode: string;
  barcode?: string;
  name: string;
  category: string;
  specifications?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IReceivePointItem {
  _id: string;
  pointCode: string;
  name: string;
  location?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IDeliveryPointItem {
  _id: string;
  pointCode: string;
  name: string;
  location?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IAuditLogItem {
  _id: string;
  action: string;
  entity: string;
  entityId?: string;
  userCode?: string;
  userName?: string;
  previousValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

export interface IMasterStats {
  products: { total: number; active: number };
  components: { total: number; active: number };
  receivePoints: { total: number; active: number };
  deliveryPoints: { total: number; active: number };
  users: { total: number; active: number };
  auditLogs: { total: number };
}

export interface IPaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  categories?: string[];
}
