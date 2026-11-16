import { Request } from 'express';
import { AuditLog, AuditAction, AuditEntity, IAuditLog } from '../../database/models/AuditLog';

export interface LogChangeOptions {
  action: AuditAction;
  entity: AuditEntity;
  entityId: string;
  previousValues?: Record<string, any>;
  newValues?: Record<string, any>;
  req?: Request;
  performedBy?: any;
}

export class AuditService {
  /**
   * Record an immutable audit log entry for system modifications
   */
  static async log(options: LogChangeOptions): Promise<IAuditLog | null> {
    try {
      const user = options.req?.user || options.performedBy;
      const logEntry = await AuditLog.create({
        action: options.action,
        entity: options.entity,
        entityId: options.entityId,
        performedBy: user?._id,
        userCode: user?.userCode,
        userName: user?.name,
        previousValues: options.previousValues,
        newValues: options.newValues,
        ipAddress: options.req?.ip || options.req?.socket?.remoteAddress,
        userAgent: options.req?.headers ? options.req.headers['user-agent'] : undefined,
        timestamp: new Date(),
      });
      return logEntry;
    } catch (err) {
      console.error('[AuditService] Failed to record audit log:', err);
      return null;
    }
  }

  /**
   * Retrieve filtered & paginated audit logs
   */
  static async getLogs(query: {
    entity?: string;
    action?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const filter: Record<string, any> = {};

    if (query.entity && query.entity !== 'ALL') {
      filter.entity = query.entity;
    }

    if (query.action && query.action !== 'ALL') {
      filter.action = query.action;
    }

    if (query.search && query.search.trim()) {
      const regex = new RegExp(query.search.trim(), 'i');
      filter.$or = [
        { userCode: regex },
        { userName: regex },
        { entityId: regex },
      ];
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    return {
      data: logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }
}
