import { Request, Response } from 'express';
import { db } from '../services/store';
import { FollowUpItem, UserRole } from '../types';
import { successResponse, errorResponse } from '../utils/response';
import { AuditService } from '../services/audit.service';

export const getFollowUps = (req: Request, res: Response) => {
  const { bdeId, leadId, status, date } = req.query;

  const now = new Date();
  // Automatically flag pending followups whose scheduled time is in the past as OVERDUE
  db.followUps.forEach((item) => {
    if (item.status === 'PENDING' && new Date(item.scheduledTime).getTime() < now.getTime()) {
      item.status = 'OVERDUE';
    }
  });

  let filtered = [...db.followUps];

  if (bdeId) {
    filtered = filtered.filter((f) => f.bdeId === bdeId);
  }
  if (leadId) {
    filtered = filtered.filter((f) => f.leadId === leadId);
  }
  if (status) {
    filtered = filtered.filter((f) => f.status === status);
  }
  if (date) {
    const d = String(date);
    filtered = filtered.filter((f) => f.scheduledTime.startsWith(d));
  }

  // Sort: pending/overdue first, then by scheduled time
  filtered.sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());

  return successResponse(res, {
    total: filtered.length,
    pending: filtered.filter((f) => f.status === 'PENDING').length,
    overdue: filtered.filter((f) => f.status === 'OVERDUE').length,
    completed: filtered.filter((f) => f.status === 'COMPLETED').length,
    followUps: filtered,
  });
};

export const createFollowUp = (req: Request, res: Response) => {
  const { leadId, scheduledTime, remarks, actor } = req.body;

  if (!leadId || !scheduledTime) {
    return errorResponse(res, 'leadId and scheduledTime are required', 400);
  }

  const lead = db.leads.find((l) => l.id === leadId);
  if (!lead) {
    return errorResponse(res, 'Lead not found', 404);
  }
  if (!lead.currentBdeId || !lead.currentBdeName) {
    return errorResponse(res, 'Lead has no assigned BDE', 400);
  }
  if (actor?.role === 'BDE' && actor.id !== lead.currentBdeId) {
    return errorResponse(res, 'Only the assigned BDE can create a follow-up', 403);
  }

  const currentActor = actor || {
    id: lead.currentBdeId,
    name: lead.currentBdeName,
    role: 'BDE' as UserRole,
  };

  const newFollowUp: FollowUpItem = {
    id: `fol-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    leadId: lead.id,
    candidateName: lead.candidateName,
    candidatePhone: lead.phone,
    bdeId: currentActor.id,
    bdeName: currentActor.name,
    scheduledTime,
    status: 'PENDING',
    remarks: remarks || '',
    createdAt: new Date().toISOString(),
  };

  db.followUps.push(newFollowUp);

  // Update lead's next follow-up date and status if needed
  lead.nextFollowUpDate = scheduledTime;
  if (lead.status !== 'CONVERTED') {
    lead.status = 'FOLLOW_UP_REQUIRED';
  }

  AuditService.log(
    'FOLLOWUP_CREATED',
    'LEAD',
    currentActor,
    `Scheduled follow-up for candidate ${lead.candidateName} on ${scheduledTime}`,
    {
      targetId: newFollowUp.id,
      targetType: 'FOLLOWUP',
      details: { leadId: lead.id, scheduledTime, remarks },
    }
  );

  db.save();

  return successResponse(res, newFollowUp, 'Follow-up scheduled successfully', 201);
};

export const updateFollowUp = (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, scheduledTime, remarks, actor } = req.body;

  const item = db.followUps.find((f) => f.id === id);
  if (!item) {
    return errorResponse(res, 'Follow-up record not found', 404);
  }

  const currentActor = actor || {
    id: item.bdeId,
    name: item.bdeName || 'BDE User',
    role: 'BDE' as UserRole,
  };

  const oldStatus = item.status;
  if (status !== undefined) {
    if (!['PENDING', 'COMPLETED', 'OVERDUE'].includes(status)) {
      return errorResponse(res, 'Invalid follow-up status', 400);
    }
    item.status = status;
  }
  if (scheduledTime) item.scheduledTime = scheduledTime;
  if (remarks !== undefined) item.remarks = remarks;

  const action = status === 'COMPLETED' ? 'FOLLOWUP_COMPLETED' : 'FOLLOWUP_UPDATED';

  AuditService.log(
    action,
    'LEAD',
    currentActor,
    `Follow-up ${item.id} status changed from ${oldStatus} to ${item.status}`,
    {
      targetId: item.id,
      targetType: 'FOLLOWUP',
      details: { leadId: item.leadId, oldStatus, newStatus: item.status, scheduledTime: item.scheduledTime },
    }
  );

  db.save();

  return successResponse(res, item, 'Follow-up updated successfully');
};

export const deleteFollowUp = (req: Request, res: Response) => {
  const { id } = req.params;
  const { actor } = req.body;

  const index = db.followUps.findIndex((f) => f.id === id);
  if (index === -1) {
    return errorResponse(res, 'Follow-up record not found', 404);
  }

  const [removed] = db.followUps.splice(index, 1);

  const currentActor = actor || {
    id: removed.bdeId,
    name: removed.bdeName || 'BDE User',
    role: 'BDE' as UserRole,
  };

  AuditService.log(
    'FOLLOWUP_CANCELLED',
    'LEAD',
    currentActor,
    `Cancelled follow-up for candidate ${removed.candidateName}`,
    {
      targetId: removed.id,
      targetType: 'FOLLOWUP',
      details: { leadId: removed.leadId, scheduledTime: removed.scheduledTime },
    }
  );

  db.save();

  return successResponse(res, { id: removed.id }, 'Follow-up cancelled successfully');
};
