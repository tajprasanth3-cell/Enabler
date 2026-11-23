import { createApp } from './app';
import { ENV } from './config/env';
import { logger } from './utils/logger';

const app = createApp();

const server = app.listen(ENV.PORT, () => {
  logger.info(`==================================================`);
  logger.info(`🚀 LeadFlow Enterprise Backend API is live!`);
  logger.info(`🌐 Local Server:  http://localhost:${ENV.PORT}`);
  logger.info(`🩺 Health Check:  http://localhost:${ENV.PORT}/api/health`);
  logger.info(`💻 Client Origin: ${ENV.CLIENT_URL}`);
  logger.info(`⚙️  Environment:   ${ENV.NODE_ENV}`);
  logger.info(`==================================================`);
});

// Graceful shutdown handling
const shutdown = () => {
  logger.info('Shutting down gracefully...');
  server.close(() => {
    logger.info('HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
