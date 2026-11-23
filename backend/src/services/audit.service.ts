import { db } from './store';
import { AuditAction, AuditCategory, AuditLogEntry, UserRole } from '../types';
import { logger } from '../utils/logger';

export class AuditService {
  public static log(
    action: AuditAction,
    category: AuditCategory,
    actor: { id: string; name: string; role: UserRole },
    summary: string,
    options?: {
      targetId?: string;
      targetType?: string;
      details?: Record<string, any>;
      ipAddress?: string;
    }
  ): AuditLogEntry {
    const entry: AuditLogEntry = {
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      action,
      category,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      targetId: options?.targetId,
      targetType: options?.targetType,
      summary,
      details: options?.details || {},
      ipAddress: options?.ipAddress || '127.0.0.1',
      timestamp: new Date().toISOString(),
    };

    db.auditLogs.unshift(entry);
    db.save();
    logger.info(`[AUDIT] [${category}] ${action} by ${actor.name} (${actor.role}): ${summary}`);
    return entry;
  }

  public static query(filters: {
    category?: AuditCategory;
    action?: AuditAction;
    actorId?: string;
    targetId?: string;
    search?: string;
    limit?: number;
    page?: number;
  }) {
    let logs = [...db.auditLogs];

    if (filters.category) {
      logs = logs.filter((l) => l.category === filters.category);
    }
    if (filters.action) {
      logs = logs.filter((l) => l.action === filters.action);
    }
    if (filters.actorId) {
      logs = logs.filter((l) => l.actorId === filters.actorId);
    }
    if (filters.targetId) {
      logs = logs.filter((l) => l.targetId === filters.targetId);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      logs = logs.filter(
        (l) =>
          l.summary.toLowerCase().includes(q) ||
          l.actorName.toLowerCase().includes(q) ||
          l.action.toLowerCase().includes(q)
      );
    }

    const total = logs.length;
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 50;
    const startIndex = (page - 1) * limit;
    const paginated = logs.slice(startIndex, startIndex + limit);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      logs: paginated,
    };
  }
}
