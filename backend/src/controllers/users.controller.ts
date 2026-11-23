import { Request, Response } from 'express';
import { db } from '../services/store';
import { User, UserRole } from '../types';
import { successResponse, errorResponse } from '../utils/response';
import { AuditService } from '../services/audit.service';

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

export const createUser = (req: Request, res: Response) => {
  const { name, email, role, teamId, phone, actor } = req.body;

  if (!name || !email || !role) {
    return errorResponse(res, 'Name, email, and role are required', 400);
  }

  const existing = db.users.find((u) => u.email === email);
  if (existing) {
    return errorResponse(res, 'User with this email already exists', 409);
  }

  const team = teamId ? db.teams.find((t) => t.id === teamId) : undefined;
  const currentActor = actor || { id: 'usr-1', name: 'Vikram Sharma', role: 'ADMIN' as UserRole };

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

  // Audit log user creation
  AuditService.log(
    'USER_CREATED',
    'USER',
    currentActor,
    `Registered new ${role} user: ${name} (${email})`,
    {
      targetId: newUser.id,
      targetType: 'USER',
      details: { role, teamId, email },
    }
  );

  return successResponse(res, newUser, 'User created successfully', 201);
};

export const toggleUserStatus = (req: Request, res: Response) => {
  const { id } = req.params;
  const { actor } = req.body;

  const user = db.users.find((u) => u.id === id);
  if (!user) {
    return errorResponse(res, 'User not found', 404);
  }

  const currentActor = actor || { id: 'usr-1', name: 'Vikram Sharma', role: 'ADMIN' as UserRole };
  const oldStatus = user.status;
  user.status = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

  // Audit log user status toggle
  AuditService.log(
    'USER_STATUS_TOGGLED',
    'USER',
    currentActor,
    `Toggled user ${user.name} status from ${oldStatus} to ${user.status}`,
    {
      targetId: user.id,
      targetType: 'USER',
      details: { oldStatus, newStatus: user.status },
    }
  );

  return successResponse(res, user, `User status updated to ${user.status}`);
};
