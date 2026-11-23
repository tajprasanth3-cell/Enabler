import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../utils/response';
import { logger } from '../utils/logger';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error(`Unhandled Exception on ${req.method} ${req.url}:`, err);
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  return errorResponse(res, message, status, err.errors || null);
};

export const notFoundHandler = (req: Request, res: Response) => {
  return errorResponse(res, `Route ${req.method} ${req.originalUrl} not found`, 404);
};
