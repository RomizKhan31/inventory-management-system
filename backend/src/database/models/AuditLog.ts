import { Schema, model, Document, Model, Types } from 'mongoose';

export type AuditAction =
  | 'USER_LOGIN'
  | 'USER_LOGIN_FAILED'
  | 'USER_LOGOUT'
  | 'USER_CREATED'
  | 'USER_ROLE_CHANGED'
  | 'USER_ACTIVATED'
  | 'USER_DEACTIVATED'
  | 'USER_PASSWORD_CHANGED'
  | 'MASTER_DATA_CREATED'
  | 'MASTER_DATA_UPDATED'
  | 'MASTER_DATA_SOFT_DELETED'
  | 'TRANSACTION_REVERSED';

export type AuditEntity =
  | 'USER'
  | 'PRODUCT'
  | 'COMPONENT'
  | 'RECEIVE_POINT'
  | 'DELIVERY_POINT'
  | 'INVENTORY_TRANSACTION';

export interface IAuditLog extends Document {
  action: AuditAction;
  entity: AuditEntity;
  entityId?: string;
  performedBy?: Types.ObjectId;
  userCode?: string;
  userName?: string;
  previousValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    action: {
      type: String,
      required: [true, 'Audit action is required'],
      index: true,
    },
    entity: {
      type: String,
      required: [true, 'Audited entity is required'],
      index: true,
    },
    entityId: {
      type: String,
      index: true,
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    userCode: {
      type: String,
      trim: true,
      index: true,
    },
    userName: {
      type: String,
      trim: true,
    },
    previousValues: {
      type: Schema.Types.Mixed,
    },
    newValues: {
      type: Schema.Types.Mixed,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      immutable: true,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'audit_logs',
  }
);

AuditLogSchema.index({ entity: 1, action: 1, timestamp: -1 });
AuditLogSchema.index({ performedBy: 1, timestamp: -1 });
AuditLogSchema.index({ timestamp: -1 });

export const AuditLog: Model<IAuditLog> = model<IAuditLog>(
  'AuditLog',
  AuditLogSchema
);
