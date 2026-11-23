import { Request, Response } from 'express';
import { db } from '../services/store';
import { successResponse, errorResponse } from '../utils/response';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';

export const login = (req: Request, res: Response) => {
  const { email, role } = req.body;

  // Find user by email or role
  let user = db.users.find((u) => u.email === email);
  if (!user && role) {
    user = db.users.find((u) => u.role === role);
  }

  if (!user) {
    return errorResponse(res, 'User not found with provided credentials', 404);
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
    // Fallback: return default admin for easy testing
    const defaultUser = db.users[0];
    return successResponse(res, defaultUser, 'Current user retrieved');
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as any;
    const user = db.users.find((u) => u.id === decoded.id);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }
    return successResponse(res, user, 'Current user retrieved');
  } catch (err) {
    return errorResponse(res, 'Invalid or expired session token', 401);
  }
};
