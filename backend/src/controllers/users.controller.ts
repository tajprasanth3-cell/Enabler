import { Request, Response } from 'express';
import { db } from '../services/store';
import { User, UserRole } from '../types';
import { successResponse, errorResponse } from '../utils/response';
import { AuditService } from '../services/audit.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export const getUsers = (req: Request, res: Response) => {
  const { role, teamId } = req.query;

  let users = [...db.users];
  if (role) {
    users = users.filter((u) => u.role === role);
  }
  if (teamId) {
    users = users.filter((u) => u.teamId === teamId);
  }

  return successResponse(res, users);
};

export const createUser = (req: AuthenticatedRequest, res: Response) => {
  const { name, email, role, teamId, phone } = req.body;

  if (!name || !email || !role) {
    return errorResponse(res, 'Name, email, and role are required', 400);
  }

  if (!['ADMIN', 'TEAM_LEAD', 'BDE'].includes(role)) {
    return errorResponse(res, 'Invalid role', 400);
  }

  const existing = db.users.find((u) => u.email === email);
  if (existing) {
    return errorResponse(res, 'User with this email already exists', 409);
  }

  const team = teamId ? db.teams.find((t) => t.id === teamId) : undefined;
  if (role === 'BDE' && !team) {
    return errorResponse(res, 'A valid teamId is required for BDE users', 400);
  }
  if (teamId && !team) {
    return errorResponse(res, 'A valid teamId is required', 400);
  }
  if (role === 'ADMIN' && (teamId || team)) {
    return errorResponse(res, 'ADMIN users must not be assigned to a team', 400);
  }
  if (role === 'TEAM_LEAD' && team?.teamLeadId) {
    return errorResponse(res, 'Selected team already has a team lead', 409);
  }

  const bodyActor = req.body.actor as { id: string; name: string; role: UserRole } | undefined;
  const currentActor = req.user || bodyActor || null;
  const auditActor = currentActor || { id: 'system', name: 'System', role: 'ADMIN' as UserRole };

  const newUser: User = {
    id: `usr-${Date.now()}`,
    name,
    email,
    role: role as UserRole,
    status: 'ACTIVE',
    teamId: team?.id,
    teamName: team?.name,
    phone,
    createdAt: new Date().toISOString(),
  };

  db.users.push(newUser);
  if (role === 'TEAM_LEAD' && team) {
    team.teamLeadId = newUser.id;
    team.teamLeadName = newUser.name;
  }
  db.save();

  // Audit log user creation
  AuditService.log(
    'USER_CREATED',
    'USER',
    auditActor,
    `Registered new ${role} user: ${name} (${email})`,
    {
      targetId: newUser.id,
      targetType: 'USER',
      details: { role, teamId, email, actorId: currentActor?.id ?? null },
    }
  );

  return successResponse(res, newUser, 'User created successfully', 201);
};

export const toggleUserStatus = (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const user = db.users.find((u) => u.id === id);
  if (!user) {
    return errorResponse(res, 'User not found', 404);
  }

  if (user.status === 'ACTIVE' && user.role === 'ADMIN') {
    const activeAdmins = db.users.filter((u) => u.role === 'ADMIN' && u.status === 'ACTIVE');
    if (activeAdmins.length <= 1) {
      return errorResponse(res, 'Cannot deactivate the last active admin', 400);
    }
  }

  const bodyActor = req.body.actor as { id: string; name: string; role: UserRole } | undefined;
  const currentActor = req.user || bodyActor || null;
  const auditActor = currentActor || { id: 'system', name: 'System', role: 'ADMIN' as UserRole };

  const oldStatus = user.status;
  user.status = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  db.save();

  // Audit log user status toggle
  AuditService.log(
    'USER_STATUS_TOGGLED',
    'USER',
    auditActor,
    `Toggled user ${user.name} status from ${oldStatus} to ${user.status}`,
    {
      targetId: user.id,
      targetType: 'USER',
      details: { oldStatus, newStatus: user.status, actorId: currentActor?.id ?? null },
    }
  );

  return successResponse(res, user, `User status updated to ${user.status}`);
};

export const reassignUserTeam = (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { teamId } = req.body;

  const user = db.users.find((u) => u.id === id);
  if (!user) {
    return errorResponse(res, 'User not found', 404);
  }
  if (user.role === 'ADMIN') {
    return errorResponse(res, 'ADMIN users cannot be assigned to a team', 400);
  }

  const team = teamId ? db.teams.find((t) => t.id === teamId) : undefined;
  if (teamId && !team) {
    return errorResponse(res, 'Selected team was not found', 400);
  }
  if (user.role !== 'TEAM_LEAD' && !team) {
    return errorResponse(res, 'A valid teamId is required for BDE users', 400);
  }
  if (user.role === 'TEAM_LEAD' && team?.teamLeadId && team.teamLeadId !== user.id) {
    return errorResponse(res, 'Selected team already has a team lead', 409);
  }

  const bodyActor = req.body.actor as { id: string; name: string; role: UserRole } | undefined;
  const currentActor = req.user || bodyActor || null;
  const auditActor = currentActor || { id: 'system', name: 'System', role: 'ADMIN' as UserRole };
  const fromTeam = user.teamName || 'Unassigned';

  if (user.role === 'TEAM_LEAD') {
    db.teams.forEach((item) => {
      if (item.teamLeadId === user.id && item.id !== team?.id) {
        item.teamLeadId = null;
        item.teamLeadName = 'Unassigned';
        item.updatedAt = new Date().toISOString();
      }
      if (team && item.id === team.id) {
        item.teamLeadId = user.id;
        item.teamLeadName = user.name;
        item.updatedAt = new Date().toISOString();
      }
    });
  }

  user.teamId = team?.id;
  user.teamName = team?.name;
  db.save();

  AuditService.log(
    'USER_REASSIGN',
    'USER',
    auditActor,
    `${user.name} moved from ${fromTeam} to ${team?.name || 'Unassigned'}`,
    {
      targetId: user.id,
      targetType: 'USER',
      details: { fromTeam, toTeam: team?.name || 'Unassigned', teamId: team?.id || null, actorId: currentActor?.id ?? null },
    }
  );

  return successResponse(res, user, 'User team assignment updated');
};
