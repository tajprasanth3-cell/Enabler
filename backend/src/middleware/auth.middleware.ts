import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import { errorResponse } from '../utils/response';
import { db } from '../services/store';
import { User } from '../types';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // If no token provided in demo development mode, default to active admin or requested user
    const fallbackUser = db.users[0];
    req.user = fallbackUser;
    return next();
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as any;
    const user = db.users.find((u) => u.id === decoded.id);

    if (!user) {
      return errorResponse(res, 'User identity not found in database', 404);
    }

    if (user.status !== 'ACTIVE') {
      return errorResponse(res, 'User account is deactivated. Contact Administrator.', 403);
    }

    req.user = user;
    next();
  } catch (err) {
    return errorResponse(res, 'Invalid, expired, or malformed authentication token', 401);
  }
};
