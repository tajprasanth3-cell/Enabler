import { Request, Response } from 'express';
import { db } from '../services/store';
import { Lead, LeadStatus, UserRole } from '../types';
import { successResponse, errorResponse } from '../utils/response';
import { AuditService } from '../services/audit.service';

export const getLeads = (req: Request, res: Response) => {
  const { teamId, bdeId, status, search } = req.query;

  let filtered = [...db.leads];

  if (teamId) {
    filtered = filtered.filter((l) => l.currentTeamId === teamId);
  }
  if (bdeId) {
    filtered = filtered.filter((l) => l.currentBdeId === bdeId);
  }
  if (status) {
    filtered = filtered.filter((l) => l.status === status);
  }
  if (search) {
    const q = String(search).toLowerCase();
    filtered = filtered.filter(
      (l) =>
        l.candidateName.toLowerCase().includes(q) ||
        l.phone.includes(q) ||
        l.email.toLowerCase().includes(q) ||
        l.city.toLowerCase().includes(q)
    );
  }

  return successResponse(res, {
    total: filtered.length,
    leads: filtered,
    unassignedCount: db.leads.filter((l) => !l.currentTeamId).length,
  });
};

export const ingestLeads = (req: Request, res: Response) => {
  const { candidates, actor } = req.body;

  if (!Array.isArray(candidates) || candidates.length === 0) {
    return errorResponse(res, 'Candidates list must be a non-empty array', 400);
  }

  const currentActor = actor || { id: 'usr-1', name: 'Vikram Sharma', role: 'ADMIN' as UserRole };

  let added = 0;
  let duplicates = 0;
  const newLeads: Lead[] = [];

  candidates.forEach((c: any) => {
    const isDuplicate = db.leads.some(
      (existing) =>
        (c.phone && existing.phone === c.phone) ||
        (c.email && existing.email === c.email)
    );

    if (isDuplicate) {
      duplicates++;
    } else {
      added++;
      const created: Lead = {
        id: `lead-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        candidateName: c.candidateName || 'Candidate',
        phone: c.phone || '+91 99999 00000',
        email: c.email || '',
        city: c.city || 'India',
        education: c.education || 'Graduate',
        source: c.source || 'CSV Upload',
        status: 'NEW',
        currentTeamId: null,
        currentTeamName: null,
        currentBdeId: null,
        currentBdeName: null,
        createdAt: new Date().toISOString(),
      };
      newLeads.push(created);
      db.leads.push(created);
    }
  });

  // Audit log ingestion
  AuditService.log(
    'LEAD_INGESTED',
    'LEAD',
    currentActor,
    `Ingested ${added} new candidate leads (${duplicates} duplicates skipped)`,
    {
      details: { added, duplicates, totalRows: candidates.length },
      targetType: 'BATCH',
    }
  );

  return successResponse(
    res,
    { added, duplicates, totalProcessed: candidates.length },
    `Processed ${candidates.length} leads. Added ${added}, skipped ${duplicates} duplicates.`
  );
};

export const allocateStage1 = (req: Request, res: Response) => {
  const { teamIds, countPerTeam, method, actor } = req.body;

  if (!Array.isArray(teamIds) || teamIds.length === 0 || !countPerTeam) {
    return errorResponse(res, 'Must provide teamIds and positive countPerTeam', 400);
  }

  const currentActor = actor || { id: 'usr-1', name: 'Vikram Sharma', role: 'ADMIN' as UserRole };
  const unassigned = db.leads.filter((l) => !l.currentTeamId);
  const needed = teamIds.length * countPerTeam;

  if (unassigned.length < needed) {
    return errorResponse(
      res,
      `Insufficient unallocated leads. Needed ${needed}, but only ${unassigned.length} available in pool.`,
      400
    );
  }

  let index = 0;
  teamIds.forEach((tId) => {
    const targetTeam = db.teams.find((t) => t.id === tId);
    if (!targetTeam) return;

    for (let i = 0; i < countPerTeam; i++) {
      if (index < unassigned.length) {
        unassigned[index].currentTeamId = targetTeam.id;
        unassigned[index].currentTeamName = targetTeam.name;
        unassigned[index].assignedToTeamAt = new Date().toISOString();
        index++;
      }
    }
  });

  // Audit log stage 1 allocation
  AuditService.log(
    'LEAD_ALLOCATED_STAGE1',
    'ALLOCATION',
    currentActor,
    `Allocated ${index} leads across ${teamIds.length} teams (${countPerTeam} per team via ${method || 'EQUAL'})`,
    {
      details: { teamIds, countPerTeam, method: method || 'EQUAL', totalAllocated: index },
      targetType: 'TEAMS',
    }
  );

  return successResponse(
    res,
    { allocated: index, remainingUnassigned: unassigned.length - index },
    `Allocated ${index} leads across ${teamIds.length} teams.`
  );
};

export const allocateStage2 = (req: Request, res: Response) => {
  const { teamId, bdeIds, countPerBde, actor } = req.body;

  if (!teamId || !Array.isArray(bdeIds) || bdeIds.length === 0 || !countPerBde) {
    return errorResponse(res, 'Must provide teamId, bdeIds array, and positive countPerBde', 400);
  }

  const currentActor = actor || { id: 'usr-2', name: 'Priya Patel', role: 'TEAM_LEAD' as UserRole };
  const teamPool = db.leads.filter((l) => l.currentTeamId === teamId && !l.currentBdeId);
  const needed = bdeIds.length * countPerBde;

  if (teamPool.length < needed) {
    return errorResponse(
      res,
      `Insufficient team pool leads. Needed ${needed}, but only ${teamPool.length} available.`,
      400
    );
  }

  let index = 0;
  bdeIds.forEach((bId) => {
    const targetBde = db.users.find((u) => u.id === bId);
    if (!targetBde) return;

    for (let i = 0; i < countPerBde; i++) {
      if (index < teamPool.length) {
        teamPool[index].currentBdeId = targetBde.id;
        teamPool[index].currentBdeName = targetBde.name;
        teamPool[index].assignedToBdeAt = new Date().toISOString();
        index++;
      }
    }
  });

  // Audit log stage 2 allocation
  AuditService.log(
    'LEAD_ALLOCATED_STAGE2',
    'ALLOCATION',
    currentActor,
    `Allocated ${index} leads from Team Pool to ${bdeIds.length} BDEs (${countPerBde} each)`,
    {
      details: { teamId, bdeIds, countPerBde, totalAllocated: index },
      targetId: teamId,
      targetType: 'TEAM',
    }
  );

  return successResponse(
    res,
    { allocated: index, remainingTeamPool: teamPool.length - index },
    `Allocated ${index} leads across ${bdeIds.length} BDEs.`
  );
};

export const updateLeadStatus = (req: Request, res: Response) => {
  const { id } = req.params;
  const { newStatus, remarks, scheduleFollowUp, dealValue, actor } = req.body;

  const lead = db.leads.find((l) => l.id === id);
  if (!lead) {
    return errorResponse(res, 'Lead not found', 404);
  }

  const currentActor = actor || { id: 'usr-4', name: 'Prasanth', role: 'BDE' as UserRole };
  const previousStatus = lead.status;
  lead.status = newStatus as LeadStatus;
  lead.remarks = remarks || lead.remarks;

  if (dealValue) {
    lead.dealValue = dealValue;
  }
  if (scheduleFollowUp?.time) {
    lead.nextFollowUpDate = scheduleFollowUp.time;

    // Record follow up item
    const followUp = {
      id: `fol-${Date.now()}`,
      leadId: lead.id,
      candidateName: lead.candidateName,
      candidatePhone: lead.phone,
      bdeId: lead.currentBdeId || currentActor.id,
      bdeName: lead.currentBdeName || currentActor.name,
      scheduledTime: scheduleFollowUp.time,
      status: 'PENDING' as const,
      remarks: scheduleFollowUp.note || remarks,
      createdAt: new Date().toISOString(),
    };
    db.followUps.push(followUp);
  }

  // Record status history
  const historyEntry = {
    id: `hist-${Date.now()}`,
    leadId: lead.id,
    previousStatus,
    newStatus: lead.status,
    changedById: currentActor.id,
    changedByName: currentActor.name,
    remarks: remarks || `Status changed from ${previousStatus} to ${newStatus}`,
    timestamp: new Date().toLocaleString(),
  };
  db.leadStatusHistory.push(historyEntry);

  // Audit log lead status transition
  AuditService.log(
    'LEAD_STATUS_CHANGED',
    'LEAD',
    currentActor,
    `Lead ${lead.candidateName} updated from ${previousStatus} to ${newStatus}`,
    {
      targetId: lead.id,
      targetType: 'LEAD',
      details: { previousStatus, newStatus, remarks, dealValue },
    }
  );

  return successResponse(res, { lead, history: historyEntry }, `Status updated to ${newStatus}`);
};

export const reassignLeads = (req: Request, res: Response) => {
  const { fromBdeId, toBdeId, reason, actor } = req.body;

  if (!fromBdeId || !toBdeId || !reason) {
    return errorResponse(res, 'fromBdeId, toBdeId, and reason are required', 400);
  }

  const fromBde = db.users.find((u) => u.id === fromBdeId);
  const toBde = db.users.find((u) => u.id === toBdeId);

  if (!fromBde || !toBde) {
    return errorResponse(res, 'Source or destination BDE not found', 404);
  }

  const currentActor = actor || { id: 'usr-2', name: 'Priya Patel', role: 'TEAM_LEAD' as UserRole };

  // Reassign all active unconverted leads
  const openLeads = db.leads.filter(
    (l) => l.currentBdeId === fromBdeId && ['NEW', 'CONTACTED', 'FOLLOW_UP_REQUIRED', 'INTERESTED'].includes(l.status)
  );

  openLeads.forEach((l) => {
    l.currentBdeId = toBde.id;
    l.currentBdeName = toBde.name;
    l.remarks = `Reassigned from ${fromBde.name}: ${reason}`;
  });

  // Audit log reassignment
  AuditService.log(
    'LEAD_REASSIGNED',
    'ALLOCATION',
    currentActor,
    `Reassigned ${openLeads.length} leads from ${fromBde.name} to ${toBde.name}. Reason: ${reason}`,
    {
      details: { fromBdeId, toBdeId, count: openLeads.length, reason },
      targetId: toBdeId,
      targetType: 'USER',
    }
  );

  return successResponse(
    res,
    { count: openLeads.length, fromBdeName: fromBde.name, toBdeName: toBde.name },
    `Reassigned ${openLeads.length} leads to ${toBde.name}`
  );
};

export const requestReplenishment = (req: Request, res: Response) => {
  const { bdeId, reason, actor } = req.body;

  const bde = db.users.find((u) => u.id === bdeId);
  if (!bde) {
    return errorResponse(res, 'BDE not found', 404);
  }

  const currentActor = actor || { id: bde.id, name: bde.name, role: bde.role };

  const alert = {
    id: `alert-${Date.now()}`,
    bdeId: bde.id,
    bdeName: bde.name,
    teamId: bde.teamId || 'team-1',
    teamName: bde.teamName || 'Team Alpha',
    reason: reason || 'BDE working queue exhausted (0 pending leads)',
    status: 'ACTIVE' as const,
    timestamp: new Date().toISOString(),
  };

  db.replenishmentAlerts.push(alert);

  AuditService.log(
    'REPLENISHMENT_REQUESTED',
    'ALLOCATION',
    currentActor,
    `Lead replenishment requested by ${bde.name} (${bde.teamName})`,
    {
      targetId: alert.id,
      targetType: 'ALERT',
      details: { bdeId: bde.id, teamId: bde.teamId, reason: alert.reason },
    }
  );

  return successResponse(res, alert, 'Replenishment alert dispatched to Team Lead', 201);
};
