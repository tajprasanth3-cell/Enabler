import { Request, Response } from 'express';
import { db } from '../services/store';
import { Lead, LeadStatus } from '../types';
import { successResponse, errorResponse } from '../utils/response';

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
  const { candidates } = req.body;

  if (!Array.isArray(candidates) || candidates.length === 0) {
    return errorResponse(res, 'Candidates list must be a non-empty array', 400);
  }

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

  return successResponse(
    res,
    { added, duplicates, totalProcessed: candidates.length },
    `Processed ${candidates.length} leads. Added ${added}, skipped ${duplicates} duplicates.`
  );
};

export const allocateStage1 = (req: Request, res: Response) => {
  const { teamIds, countPerTeam, method } = req.body;

  if (!Array.isArray(teamIds) || teamIds.length === 0 || !countPerTeam) {
    return errorResponse(res, 'Must provide teamIds and positive countPerTeam', 400);
  }

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

  return successResponse(
    res,
    { allocated: index, remainingUnassigned: unassigned.length - index },
    `Allocated ${index} leads across ${teamIds.length} teams.`
  );
};

export const allocateStage2 = (req: Request, res: Response) => {
  const { teamId, bdeIds, countPerBde } = req.body;

  if (!teamId || !Array.isArray(bdeIds) || bdeIds.length === 0 || !countPerBde) {
    return errorResponse(res, 'Must provide teamId, bdeIds array, and positive countPerBde', 400);
  }

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

  return successResponse(
    res,
    { allocated: index, remainingTeamPool: teamPool.length - index },
    `Allocated ${index} leads across ${bdeIds.length} BDEs.`
  );
};

export const updateLeadStatus = (req: Request, res: Response) => {
  const { id } = req.params;
  const { newStatus, remarks, scheduleFollowUp, dealValue, actorId, actorName } = req.body;

  const lead = db.leads.find((l) => l.id === id);
  if (!lead) {
    return errorResponse(res, 'Lead not found', 404);
  }

  const previousStatus = lead.status;
  lead.status = newStatus as LeadStatus;
  lead.remarks = remarks || lead.remarks;

  if (dealValue) {
    lead.dealValue = dealValue;
  }
  if (scheduleFollowUp?.time) {
    lead.nextFollowUpDate = scheduleFollowUp.time;
  }

  // Record audit history
  const historyEntry = {
    id: `hist-${Date.now()}`,
    leadId: lead.id,
    previousStatus,
    newStatus: lead.status,
    changedById: actorId || 'system',
    changedByName: actorName || 'System',
    remarks: remarks || `Status changed from ${previousStatus} to ${newStatus}`,
    timestamp: new Date().toLocaleString(),
  };
  db.leadStatusHistory.push(historyEntry);

  return successResponse(res, { lead, history: historyEntry }, `Status updated to ${newStatus}`);
};
