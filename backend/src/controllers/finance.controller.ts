import { Request, Response } from 'express';
import { db } from '../services/store';
import { FinancialTransaction } from '../types';
import { successResponse, errorResponse } from '../utils/response';

export const getTransactions = (req: Request, res: Response) => {
  return successResponse(res, db.transactions);
};

export const calculateSplit = (req: Request, res: Response) => {
  const { grossAmount, companyPct, remainingPct } = req.body;

  const gross = parseFloat(grossAmount);
  if (isNaN(gross) || gross <= 0) {
    return errorResponse(res, 'Valid positive grossAmount is required', 400);
  }

  const compPct = companyPct !== undefined ? parseFloat(companyPct) : db.settings.companySharePercentage;
  const remPct = remainingPct !== undefined ? parseFloat(remainingPct) : db.settings.remainingSharePercentage;

  const companyShare = (gross * compPct) / 100;
  const remainingShare = (gross * remPct) / 100;

  return successResponse(res, {
    grossAmount: gross,
    companySharePct: compPct,
    remainingSharePct: remPct,
    companyShare,
    remainingShare,
  });
};

export const createTransaction = (req: Request, res: Response) => {
  const { leadId, candidateName, bdeId, bdeName, teamId, teamName, grossAmount, investmentCost } = req.body;

  const gross = parseFloat(grossAmount);
  const cost = parseFloat(investmentCost || '0');

  if (isNaN(gross) || gross <= 0) {
    return errorResponse(res, 'Valid positive grossAmount is required', 400);
  }

  const compPct = db.settings.companySharePercentage;
  const remPct = db.settings.remainingSharePercentage;

  const companyShareAmount = (gross * compPct) / 100;
  const remainingShareAmount = (gross * remPct) / 100;
  const netProfit = gross - cost;

  const newTx: FinancialTransaction = {
    id: `tx-${Date.now()}`,
    leadId,
    candidateName,
    bdeId,
    bdeName,
    teamId,
    teamName,
    grossAmount: gross,
    investmentCost: cost,
    companySharePct: compPct,
    remainingSharePct: remPct,
    companyShareAmount,
    remainingShareAmount,
    netProfit,
    status: 'CONFIRMED',
    createdAt: new Date().toISOString(),
  };

  db.transactions.push(newTx);
  return successResponse(res, newTx, 'Transaction recorded and verified', 201);
};
