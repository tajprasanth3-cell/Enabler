import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  JWT_SECRET: process.env.JWT_SECRET || 'leadflow_fallback_jwt_secret_2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  COMPANY_SHARE_PCT: parseFloat(process.env.COMPANY_SHARE_PCT || '30'),
  REMAINING_SHARE_PCT: parseFloat(process.env.REMAINING_SHARE_PCT || '70'),
  PROFIT_SHARE_PCT: parseFloat(process.env.PROFIT_SHARE_PCT || '30'),
};
