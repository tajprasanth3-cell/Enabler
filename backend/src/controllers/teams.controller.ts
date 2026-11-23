import { Request, Response } from 'express';
import { db } from '../services/store';
import { successResponse, errorResponse } from '../utils/response';

export const getTeams = (req: Request, res: Response) => {
  // Enrich teams with live lead counts
  const enriched = db.teams.map((t) => {
    const teamLeads = db.leads.filter((l) => l.currentTeamId === t.id);
    const converted = teamLeads.filter((l) => l.status === 'CONVERTED').length;
    const bdes = db.users.filter((u) => u.teamId === t.id && u.role === 'BDE');
    return {
      ...t,
      bdeCount: bdes.length,
      activeLeadsCount: teamLeads.length,
      convertedLeadsCount: converted,
    };
  });

  return successResponse(res, enriched);
};

export const createTeam = (req: Request, res: Response) => {
  const { name, teamLeadId } = req.body;

  if (!name || !teamLeadId) {
    return errorResponse(res, 'Team name and teamLeadId are required', 400);
  }

  const teamLead = db.users.find((u) => u.id === teamLeadId);
  if (!teamLead) {
    return errorResponse(res, 'Team lead user not found', 404);
  }

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

  return successResponse(res, newTeam, 'Team created successfully', 201);
};
