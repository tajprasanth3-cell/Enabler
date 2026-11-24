import { Request, Response } from 'express';
import { db } from '../services/store';
import { successResponse, errorResponse } from '../utils/response';
import { AuditService } from '../services/audit.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { UserRole } from '../types';

const ACTIVE_LEAD_STATUSES = ['NEW', 'CONTACTED', 'INTERESTED', 'FOLLOW_UP_REQUIRED'];

export const getTeams = (req: Request, res: Response) => {
  // Enrich teams with live lead counts
  const enriched = db.teams.map((t) => {
    const teamLeads = db.leads.filter((l) => l.currentTeamId === t.id);
    const converted = teamLeads.filter((l) => l.status === 'CONVERTED').length;
    const bdes = db.users.filter((u) => u.teamId === t.id && u.role === 'BDE');
    return {
      ...t,
      bdeCount: bdes.length,
      activeLeadsCount: teamLeads.filter((l) => ACTIVE_LEAD_STATUSES.includes(l.status)).length,
      convertedLeadsCount: converted,
    };
  });

  return successResponse(res, enriched);
};

export const createTeam = (req: AuthenticatedRequest, res: Response) => {
  const { name, teamLeadId } = req.body;

  if (!name || !teamLeadId) {
    return errorResponse(res, 'Team name and teamLeadId are required', 400);
  }

  const teamLead = db.users.find((u) => u.id === teamLeadId);
  if (!teamLead) {
    return errorResponse(res, 'Team lead user not found', 404);
  }
  if (teamLead.role !== 'TEAM_LEAD') {
    return errorResponse(res, 'Selected user must have the TEAM_LEAD role', 400);
  }
  if (teamLead.status !== 'ACTIVE') {
    return errorResponse(res, 'Selected team lead must be active', 400);
  }
  if (db.teams.some((team) => team.teamLeadId === teamLeadId)) {
    return errorResponse(res, 'Selected team lead already leads a team', 409);
  }
  const bodyActor = req.body.actor as { id: string; name: string; role: UserRole } | undefined;
  const currentActor = req.user || bodyActor || null;
  const auditActor = currentActor || { id: 'system', name: 'System', role: 'ADMIN' as UserRole };

  const newTeam = {
    id: `team-${Date.now()}`,
    name,
    teamLeadId,
    teamLeadName: teamLead.name,
    bdeCount: 0,
    activeLeadsCount: 0,
    convertedLeadsCount: 0,
    status: 'ACTIVE' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.teams.push(newTeam);
  teamLead.teamId = newTeam.id;
  teamLead.teamName = newTeam.name;
  db.save();

  // Audit log team creation
  AuditService.log(
    'TEAM_CREATED',
    'ALLOCATION',
    auditActor,
    `Created new operational team: ${name} (Team Lead: ${teamLead.name})`,
    {
      targetId: newTeam.id,
      targetType: 'TEAM',
      details: { teamName: name, teamLeadId, teamLeadName: teamLead.name, actorId: currentActor?.id ?? null },
    }
  );

  return successResponse(res, newTeam, 'Team created successfully', 201);
};
