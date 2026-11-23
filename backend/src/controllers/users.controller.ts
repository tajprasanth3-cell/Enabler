import { Request, Response } from 'express';
import { db } from '../services/store';
import { User, UserRole } from '../types';
import { successResponse, errorResponse } from '../utils/response';

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
  const { name, email, role, teamId, phone } = req.body;

  if (!name || !email || !role) {
    return errorResponse(res, 'Name, email, and role are required', 400);
  }

  const existing = db.users.find((u) => u.email === email);
  if (existing) {
    return errorResponse(res, 'User with this email already exists', 409);
  }

  const team = teamId ? db.teams.find((t) => t.id === teamId) : undefined;

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
  return successResponse(res, newUser, 'User created successfully', 201);
};

export const toggleUserStatus = (req: Request, res: Response) => {
  const { id } = req.params;

  const user = db.users.find((u) => u.id === id);
  if (!user) {
    return errorResponse(res, 'User not found', 404);
  }

  user.status = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  return successResponse(res, user, `User status updated to ${user.status}`);
};
