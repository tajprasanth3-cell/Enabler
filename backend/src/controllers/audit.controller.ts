import { Request, Response } from 'express';
import { AuditService } from '../services/audit.service';
import { db } from '../services/store';
import { successResponse } from '../utils/response';
import { AuditCategory, AuditAction } from '../types';

export const getAuditLogs = (req: Request, res: Response) => {
  const { category, action, actorId, targetId, search, page, limit } = req.query;

  const result = AuditService.query({
    category: category as AuditCategory,
    action: action as AuditAction,
    actorId: actorId ? String(actorId) : undefined,
    targetId: targetId ? String(targetId) : undefined,
    search: search ? String(search) : undefined,
    page: page ? parseInt(String(page), 10) : 1,
    limit: limit ? parseInt(String(limit), 10) : 50,
  });

  return successResponse(res, result);
};

export const getAuditSummary = (req: Request, res: Response) => {
  const totalLogs = db.auditLogs.length;

  const categoryBreakdown: Record<string, number> = {};
  const actionBreakdown: Record<string, number> = {};

  db.auditLogs.forEach((l) => {
    categoryBreakdown[l.category] = (categoryBreakdown[l.category] || 0) + 1;
    actionBreakdown[l.action] = (actionBreakdown[l.action] || 0) + 1;
  });

  const recent = db.auditLogs.slice(0, 10);

  return successResponse(res, {
    totalLogs,
    categoryBreakdown,
    actionBreakdown,
    recent,
  });
};
