import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { ENV } from './config/env';
import apiRoutes from './routes';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';

export const createApp = (): Application => {
  const app = express();

  // Middleware
  app.use(
    cors({
      origin: [ENV.CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
    })
  );
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Root health check
  app.get('/', (req: Request, res: Response) => {
    res.json({
      name: 'Enabler Enterprise API',
      version: '1.0.0',
      status: 'ONLINE',
      timestamp: new Date().toISOString(),
      docs: '/api/health',
    });
  });

  // API Health probe
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'UP',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: ENV.NODE_ENV,
    });
  });

  // Mount API routers
  app.use('/api', apiRoutes);

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
