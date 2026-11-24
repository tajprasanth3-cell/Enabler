import { Request, Response } from 'express';
import { db } from '../services/store';
import { Lead, LeadStatus, UserRole } from '../types';
import { successResponse, errorResponse } from '../utils/response';
import { AuditService } from '../services/audit.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

const OPEN_LEAD_STATUSES: LeadStatus[] = [
  'NEW',
  'CONTACTED',
  'INTERESTED',
  'NOT_INTERESTED',
  'FOLLOW_UP_REQUIRED',
  'NOT_REACHABLE',
];

const DEFAULT_STATUS_TRANSITIONS: Record<string, LeadStatus[]> = {
  NEW: ['CONTACTED'],
  CONTACTED: ['INTERESTED', 'NOT_INTERESTED', 'NOT_REACHABLE', 'FOLLOW_UP_REQUIRED'],
  INTERESTED: ['CONVERTED', 'LOST'],
  NOT_INTERESTED: ['LOST'],
  FOLLOW_UP_REQUIRED: ['CONTACTED', 'CONVERTED', 'LOST'],
  CONVERTED: [],
  NOT_REACHABLE: ['FOLLOW_UP_REQUIRED', 'LOST'],
  LOST: [],
};

type Actor = { id: string; name: string; role: UserRole; teamId?: string };

const resolveActor = (req: AuthenticatedRequest, bodyActor?: any): Actor | null => {
  const candidate = req.user || bodyActor;
  if (!candidate || !candidate.id) {
    return null;
  }
  return {
    id: String(candidate.id),
    name: String(candidate.name || 'Unknown'),
    role: candidate.role as UserRole,
    teamId: candidate.teamId,
  };
};

const auditActorOf = (actor: Actor | null): Actor =>
  actor || { id: 'system', name: 'System', role: 'ADMIN' as UserRole };

const parseDateTime = (value: any): number | null => {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return null;
  }
  const raw = String(value).trim();
  if (!raw) {
    return null;
  }
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(raw) ? raw.replace(' ', 'T') : raw;
  const parsed = Date.parse(normalized);
  return Number.isNaN(parsed) ? null : parsed;
};

const distribute = (total: number, weights: number[]): number[] => {
  const weightSum = weights.reduce((acc, weight) => acc + weight, 0);
  if (total <= 0 || weightSum <= 0) {
    return weights.map(() => 0);
  }

  const exact = weights.map((weight) => (total * weight) / weightSum);
  const quotas = exact.map(Math.floor);
  let remaining = total - quotas.reduce((acc, quota) => acc + quota, 0);
  const byRemainder = exact
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder);

  for (const entry of byRemainder) {
    if (remaining <= 0) break;
    quotas[entry.index]++;
    remaining--;
  }
  return quotas;
};

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

export const ingestLeads = (req: AuthenticatedRequest, res: Response) => {
  const { candidates } = req.body;

  if (!Array.isArray(candidates) || candidates.length === 0) {
    return errorResponse(res, 'Candidates list must be a non-empty array', 400);
  }

  const currentActor = resolveActor(req, req.body.actor);

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
    auditActorOf(currentActor),
    `Ingested ${added} new candidate leads (${duplicates} duplicates skipped)`,
    {
      details: { added, duplicates, totalRows: candidates.length, actorId: currentActor?.id ?? null },
      targetType: 'BATCH',
    }
  );

  return successResponse(
    res,
    { added, duplicates, totalProcessed: candidates.length },
    `Processed ${candidates.length} leads. Added ${added}, skipped ${duplicates} duplicates.`
  );
};

export const allocateStage1 = (req: AuthenticatedRequest, res: Response) => {
  const { teamIds, countPerTeam, teamQuotas, method } = req.body;

  if (!Array.isArray(teamIds) || teamIds.length === 0) {
    return errorResponse(res, 'Must provide a non-empty teamIds array', 400);
  }

  const currentActor = resolveActor(req, req.body.actor);
  const uniqueTeamIds = [...new Set(teamIds.map((id: any) => String(id)))];
  const teams = uniqueTeamIds.map((tId) => db.teams.find((t) => t.id === tId));
  const missingIndex = teams.findIndex((team) => !team);
  if (missingIndex !== -1) {
    return errorResponse(res, `Team not found: ${uniqueTeamIds[missingIndex]}`, 404);
  }

  const hasExactQuotas = !!teamQuotas && typeof teamQuotas === 'object' && !Array.isArray(teamQuotas);
  const quotas = uniqueTeamIds.map((tId, index) =>
    hasExactQuotas ? Number(teamQuotas[tId] ?? 0) : Number(countPerTeam)
  );
  if (quotas.some((quota) => !Number.isFinite(quota) || quota < 0)) {
    return errorResponse(res, 'All team quotas must be non-negative numbers', 400);
  }

  const unassigned = db.leads.filter((l) => !l.currentTeamId);
  const needed = quotas.reduce((acc, quota) => acc + quota, 0);

  if (unassigned.length < needed) {
    return errorResponse(
      res,
      `Insufficient unallocated leads. Needed ${needed}, but only ${unassigned.length} available in pool.`,
      400
    );
  }

  const distribution: Record<string, number> = {};
  let index = 0;
  uniqueTeamIds.forEach((tId, teamIndex) => {
    const targetTeam = teams[teamIndex]!;
    distribution[tId] = 0;
    for (let i = 0; i < quotas[teamIndex]; i++) {
      if (index < unassigned.length) {
        unassigned[index].currentTeamId = targetTeam.id;
        unassigned[index].currentTeamName = targetTeam.name;
        unassigned[index].assignedToTeamAt = new Date().toISOString();
        distribution[tId]++;
        index++;
      }
    }
  });
  db.save();

  // Audit log stage 1 allocation
  AuditService.log(
    'LEAD_ALLOCATED_STAGE1',
    'ALLOCATION',
    auditActorOf(currentActor),
    `Allocated ${index} leads across ${uniqueTeamIds.length} teams (${hasExactQuotas ? 'exact quotas' : `${countPerTeam} per team`} via ${method || 'EQUAL'})`,
    {
      details: { teamIds: uniqueTeamIds, countPerTeam, teamQuotas: hasExactQuotas ? teamQuotas : undefined, method: method || 'EQUAL', totalAllocated: index, distribution, actorId: currentActor?.id ?? null },
      targetType: 'TEAMS',
    }
  );

  return successResponse(
    res,
    { allocated: index, remainingUnassigned: unassigned.length - index, distribution, countPerTeam: Number(countPerTeam) || 0 },
    `Allocated ${index} leads across ${uniqueTeamIds.length} teams.`
  );
};

export const allocateStage2 = (req: AuthenticatedRequest, res: Response) => {
  const { teamId, bdeIds, countPerBde, distribution: exactDistribution, method, manualQuotas } = req.body;

  if (!teamId || !Array.isArray(bdeIds) || bdeIds.length === 0) {
    return errorResponse(res, 'Must provide teamId and a non-empty bdeIds array', 400);
  }

  const currentActor = resolveActor(req, req.body.actor);
  const team = db.teams.find((t) => t.id === teamId);
  if (!team) {
    return errorResponse(res, 'Team not found', 404);
  }
  if (currentActor?.role === 'TEAM_LEAD') {
    const managesTeam =
      db.teams.some((item) => item.id === teamId && item.teamLeadId === currentActor.id) ||
      currentActor.teamId === teamId;
    if (!managesTeam) {
      return errorResponse(res, 'Team leads can only allocate leads to teams they manage', 403);
    }
  }

  const targetBdes = bdeIds.map((bId) => db.users.find((u) => u.id === bId));
  const missingIndex = targetBdes.findIndex((bde) => !bde);
  if (missingIndex !== -1) {
    return errorResponse(res, `BDE not found: ${bdeIds[missingIndex]}`, 404);
  }
  const invalidBde = targetBdes.find(
    (bde) => bde!.role !== 'BDE' || bde!.status !== 'ACTIVE' || bde!.teamId !== teamId
  );
  if (invalidBde) {
    return errorResponse(
      res,
      `BDE ${invalidBde!.id} must be active and belong to team ${teamId}`,
      400
    );
  }

  const teamPool = db.leads.filter(
    (l) => l.currentTeamId === teamId && !l.currentBdeId && OPEN_LEAD_STATUSES.includes(l.status)
  );

  const hasExactDistribution = !!exactDistribution && typeof exactDistribution === 'object' && !Array.isArray(exactDistribution);
  const capacities = targetBdes.map((bde) => {
    const openCount = db.leads.filter(
      (l) => l.currentBdeId === bde!.id && OPEN_LEAD_STATUSES.includes(l.status)
    ).length;
    return Math.max(0, Number(db.settings.maxLeadsPerBde) - openCount);
  });

  let quotas: number[];
  if (hasExactDistribution) {
    quotas = bdeIds.map((bId) => Number(exactDistribution[bId] ?? 0));
    if (quotas.some((quota) => !Number.isFinite(quota) || quota < 0)) {
      return errorResponse(res, 'All BDE quotas must be non-negative numbers', 400);
    }
  } else {
    const perBde = Number(countPerBde) || 0;
    if (method === 'MANUAL' && manualQuotas && typeof manualQuotas === 'object') {
      quotas = bdeIds.map((bId, index) =>
        Math.min(Math.max(0, Number(manualQuotas[bId] ?? perBde) || 0), capacities[index])
      );
    } else if (method === 'WORKLOAD_BASED') {
      quotas = distribute(
        Math.min(teamPool.length, perBde * bdeIds.length, capacities.reduce((acc, capacity) => acc + capacity, 0)),
        capacities
      );
    } else {
      quotas = bdeIds.map((_, index) => Math.min(perBde, capacities[index]));
    }

    let remainingPool = teamPool.length;
    quotas = quotas.map((quota) => {
      const capped = Math.max(0, Math.min(quota, remainingPool));
      remainingPool -= capped;
      return capped;
    });
  }

  const needed = quotas.reduce((acc, quota) => acc + quota, 0);
  if (teamPool.length < needed) {
    return errorResponse(
      res,
      `Insufficient team pool leads. Needed ${needed}, but only ${teamPool.length} available.`,
      400
    );
  }

  const distribution: Record<string, number> = {};
  let index = 0;
  bdeIds.forEach((bId, bdeIndex) => {
    const targetBde = targetBdes[bdeIndex]!;
    distribution[bId] = 0;
    for (let i = 0; i < quotas[bdeIndex]; i++) {
      if (index < teamPool.length) {
        teamPool[index].currentBdeId = targetBde.id;
        teamPool[index].currentBdeName = targetBde.name;
        teamPool[index].assignedToBdeAt = new Date().toISOString();
        distribution[bId]++;
        index++;
      }
    }
  });
  db.save();

  // Audit log stage 2 allocation
  AuditService.log(
    'LEAD_ALLOCATED_STAGE2',
    'ALLOCATION',
    auditActorOf(currentActor),
    `Allocated ${index} leads from Team Pool to ${bdeIds.length} BDEs (${hasExactDistribution ? 'exact distribution' : `${method || 'EQUAL'} allocation`})`,
    {
      details: { teamId, bdeIds, countPerBde, distribution, method: method || 'EQUAL', totalAllocated: index, actorId: currentActor?.id ?? null },
      targetId: teamId,
      targetType: 'TEAM',
    }
  );

  return successResponse(
    res,
    { allocated: index, remainingTeamPool: teamPool.length - index, distribution, method: method || 'EQUAL' },
    `Allocated ${index} leads across ${bdeIds.length} BDEs.`
  );
};

export const updateLeadStatus = (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { remarks, scheduleFollowUp, dealValue, nextFollowUpDate } = req.body;
  const newStatus = (req.body.newStatus ?? req.body.status) as LeadStatus;

  if (!newStatus) {
    return errorResponse(res, 'newStatus (or status) is required', 400);
  }

  const lead = db.leads.find((l) => l.id === id);
  if (!lead) {
    return errorResponse(res, 'Lead not found', 404);
  }

  const currentActor = resolveActor(req, req.body.actor);
  if (!currentActor || currentActor.role !== 'BDE' || lead.currentBdeId !== currentActor.id) {
    return errorResponse(res, 'Only the assigned BDE can update this lead status', 403);
  }

  if (!remarks || !String(remarks).trim()) {
    return errorResponse(res, 'Remarks are required for a status change', 400);
  }

  if (!OPEN_LEAD_STATUSES.includes(lead.status)) {
    return errorResponse(res, `Cannot change status of a closed lead (${lead.status})`, 400);
  }

  const allowedTransitions =
    db.settings.statusTransitions?.[lead.status] ?? DEFAULT_STATUS_TRANSITIONS[lead.status] ?? [];
  if (!allowedTransitions.includes(newStatus)) {
    return errorResponse(res, `Invalid status transition from ${lead.status} to ${newStatus}`, 400);
  }

  const followUpTime = scheduleFollowUp?.time || nextFollowUpDate;
  if (newStatus === 'FOLLOW_UP_REQUIRED') {
    const followUpTimestamp = parseDateTime(followUpTime);
    if (followUpTimestamp === null || followUpTimestamp <= Date.now()) {
      return errorResponse(res, 'A future follow-up time is required for FOLLOW_UP_REQUIRED', 400);
    }
  }

  const previousStatus = lead.status;
  lead.status = newStatus;
  lead.remarks = remarks || lead.remarks;

  if (dealValue !== undefined) {
    lead.dealValue = Number(dealValue);
  }
  if (nextFollowUpDate === null) {
    lead.nextFollowUpDate = undefined;
  }
  if (followUpTime) {
    lead.nextFollowUpDate = followUpTime;

    // Record follow up item
    const followUp = {
      id: `fol-${Date.now()}`,
      leadId: lead.id,
      candidateName: lead.candidateName,
      candidatePhone: lead.phone,
      bdeId: lead.currentBdeId || currentActor.id,
      bdeName: lead.currentBdeName || currentActor.name,
      scheduledTime: followUpTime,
      status: 'PENDING' as const,
      remarks: scheduleFollowUp?.note || remarks,
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
    remarks,
    timestamp: new Date().toLocaleString(),
  };
  db.leadStatusHistory.push(historyEntry);
  db.save();

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

export const reassignLeads = (req: AuthenticatedRequest, res: Response) => {
  const { fromBdeId, toBdeId, reason } = req.body;

  if (!fromBdeId || !toBdeId || !reason) {
    return errorResponse(res, 'fromBdeId, toBdeId, and reason are required', 400);
  }

  const fromBde = db.users.find((u) => u.id === fromBdeId);
  const toBde = db.users.find((u) => u.id === toBdeId);

  if (!fromBde || !toBde) {
    return errorResponse(res, 'Source or destination BDE not found', 404);
  }
  if (fromBde.role !== 'BDE' || toBde.role !== 'BDE' || toBde.status !== 'ACTIVE') {
    return errorResponse(res, 'Both users must be BDEs and the target BDE must be active', 400);
  }
  const targetTeam = toBde.teamId ? db.teams.find((team) => team.id === toBde.teamId) : undefined;
  if (!toBde.teamId || !targetTeam) {
    return errorResponse(res, 'Target BDE is not assigned to a valid team', 400);
  }

  const currentActor = resolveActor(req, req.body.actor);
  if (currentActor?.role === 'TEAM_LEAD') {
    const isLeadOfSource = db.teams.some((t) => t.id === fromBde.teamId && (t.teamLeadId === currentActor.id || fromBde.teamId === currentActor.teamId));
    const isLeadOfTarget = db.teams.some((t) => t.id === toBde.teamId && (t.teamLeadId === currentActor.id || toBde.teamId === currentActor.teamId));
    if (!isLeadOfSource || !isLeadOfTarget) {
      return errorResponse(res, 'Team leads can only reassign leads within teams they manage', 403);
    }
  }

  // Reassign all active unconverted leads
  const openLeads = db.leads.filter(
    (l) => l.currentBdeId === fromBdeId && OPEN_LEAD_STATUSES.includes(l.status)
  );

  const reassignmentNote = `Reassigned from ${fromBde.name}: ${reason}`;
  openLeads.forEach((l) => {
    l.currentBdeId = toBde.id;
    l.currentBdeName = toBde.name;
    l.currentTeamId = toBde.teamId;
    l.currentTeamName = toBde.teamName || targetTeam.name;
    l.remarks = l.remarks ? `${l.remarks}\n${reassignmentNote}` : reassignmentNote;
  });
  db.save();

  // Audit log reassignment
  AuditService.log(
    'LEAD_REASSIGNED',
    'ALLOCATION',
    auditActorOf(currentActor),
    `Reassigned ${openLeads.length} leads from ${fromBde.name} to ${toBde.name}. Reason: ${reason}`,
    {
      details: { fromBdeId, toBdeId, count: openLeads.length, reason, actorId: currentActor?.id ?? null },
      targetId: toBdeId,
      targetType: 'USER',
    }
  );

  return successResponse(
    res,
    { count: openLeads.length, reassignedCount: openLeads.length, fromBdeName: fromBde.name, toBdeName: toBde.name },
    `Reassigned ${openLeads.length} leads to ${toBde.name}`
  );
};

export const requestReplenishment = (req: AuthenticatedRequest, res: Response) => {
  const { bdeId, reason } = req.body;

  const bde = db.users.find((u) => u.id === bdeId);
  if (!bde) {
    return errorResponse(res, 'BDE not found', 404);
  }

  const team = bde.teamId ? db.teams.find((t) => t.id === bde.teamId) : undefined;
  if (!team) {
    return errorResponse(res, 'BDE has no valid team; replenishment request rejected', 400);
  }

  const currentActor = resolveActor(req, req.body.actor) || {
    id: bde.id,
    name: bde.name,
    role: bde.role,
  };

  const alert = {
    id: `alert-${Date.now()}`,
    bdeId: bde.id,
    bdeName: bde.name,
    teamId: team.id,
    teamName: team.name,
    reason: reason || 'BDE working queue exhausted (0 pending leads)',
    status: 'ACTIVE' as const,
    timestamp: new Date().toISOString(),
  };

  db.replenishmentAlerts.push(alert);
  db.save();

  AuditService.log(
    'REPLENISHMENT_REQUESTED',
    'ALLOCATION',
    currentActor,
    `Lead replenishment requested by ${bde.name} (${team.name})`,
    {
      targetId: alert.id,
      targetType: 'ALERT',
      details: { bdeId: bde.id, teamId: team.id, reason: alert.reason },
    }
  );

  return successResponse(res, alert, 'Replenishment alert dispatched to Team Lead', 201);
};
