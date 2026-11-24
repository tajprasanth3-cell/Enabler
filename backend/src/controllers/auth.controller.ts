import { Request, Response } from 'express';
import { db } from '../services/store';
import { successResponse, errorResponse } from '../utils/response';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';

export const login = (req: Request, res: Response) => {
  const { email, password } = req.body;

  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!normalizedEmail) {
    return errorResponse(res, 'Email is required', 400);
  }
  if (typeof password !== 'string' || !password.trim()) {
    return errorResponse(res, 'Password is required', 400);
  }

  const user = db.users.find((u) => u.email.toLowerCase() === normalizedEmail);

  if (!user) {
    return errorResponse(res, 'Invalid email or password', 401);
  }

  if (user.status !== 'ACTIVE') {
    return errorResponse(res, 'Account is currently inactive. Please contact your SuperAdmin.', 403);
  }

  const token = jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role, teamId: user.teamId },
    ENV.JWT_SECRET,
    { expiresIn: '7d' }
  );

  return successResponse(res, { user, token }, 'Login successful');
};

export const getCurrentUser = (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorResponse(res, 'Authentication token is required', 401);
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as any;
    const user = db.users.find((u) => u.id === decoded.id);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }
    if (user.status !== 'ACTIVE') {
      return errorResponse(res, 'Account is inactive', 403);
    }
    return successResponse(res, user, 'Current user retrieved');
  } catch (err) {
    return errorResponse(res, 'Invalid or expired session token', 401);
  }
};
