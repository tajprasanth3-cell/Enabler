import { Request, Response } from 'express';
import { db } from '../services/store';
import { FinancialTransaction, UserRole } from '../types';
import { successResponse, errorResponse } from '../utils/response';
import { AuditService } from '../services/audit.service';

export const getTransactions = (req: Request, res: Response) => {
  const { status, teamId, bdeId } = req.query;

  let txs = [...db.transactions];
  if (status) {
    txs = txs.filter((t) => t.status === status);
  }
  if (teamId) {
    txs = txs.filter((t) => t.teamId === teamId);
  }
  if (bdeId) {
    txs = txs.filter((t) => t.bdeId === bdeId);
  }

  return successResponse(res, txs);
};

export const calculateSplit = (req: Request, res: Response) => {
  const { grossAmount, companyPct, remainingPct, notes, actor } = req.body;

  const gross = parseFloat(grossAmount);
  if (isNaN(gross) || gross <= 0) {
    return errorResponse(res, 'Valid positive grossAmount is required', 400);
  }

  const compPct = companyPct !== undefined ? parseFloat(companyPct) : db.settings.companySharePercentage;
  const remPct = remainingPct !== undefined ? parseFloat(remainingPct) : db.settings.remainingSharePercentage;

  const companyShare = (gross * compPct) / 100;
  const remainingShare = (gross * remPct) / 100;

  const currentActor = actor || { id: 'usr-1', name: 'Vikram Sharma', role: 'ADMIN' as UserRole };

  // Record calculation log
  const calcLog = {
    id: `calc-${Date.now()}`,
    calcType: 'REVENUE_SPLIT' as const,
    inputValues: { grossAmount: gross, companyPct: compPct, remainingPct: remPct },
    resultValues: { companyShare, remainingShare },
    calculatedById: currentActor.id,
    calculatedByName: currentActor.name,
    notes,
    timestamp: new Date().toISOString(),
  };
  db.financialCalculationLogs.push(calcLog);

  // Audit log calculation
  AuditService.log(
    'FINANCIAL_CALCULATION',
    'FINANCE',
    currentActor,
    `Calculated ${compPct}:${remPct} split for ₹${gross.toLocaleString()} (Company: ₹${companyShare.toLocaleString()})`,
    {
      targetId: calcLog.id,
      targetType: 'CALCULATION',
      details: { gross, compPct, remPct, companyShare, remainingShare },
    }
  );

  return successResponse(res, {
    grossAmount: gross,
    companySharePct: compPct,
    remainingSharePct: remPct,
    companyShare,
    remainingShare,
    logId: calcLog.id,
  });
};

export const createTransaction = (req: Request, res: Response) => {
  const { leadId, candidateName, bdeId, bdeName, teamId, teamName, grossAmount, investmentCost, actor } = req.body;

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

  const currentActor = actor || { id: 'usr-1', name: 'Vikram Sharma', role: 'ADMIN' as UserRole };

  const newTx: FinancialTransaction = {
    id: `tx-${Date.now()}`,
    leadId: leadId || 'lead-manual',
    candidateName: candidateName || 'Candidate',
    bdeId: bdeId || currentActor.id,
    bdeName: bdeName || currentActor.name,
    teamId: teamId || 'team-1',
    teamName: teamName || 'Team Alpha',
    grossAmount: gross,
    investmentCost: cost,
    companySharePct: compPct,
    remainingSharePct: remPct,
    companyShareAmount,
    remainingShareAmount,
    netProfit,
    status: 'CONFIRMED',
    confirmedById: currentActor.id,
    confirmedByName: currentActor.name,
    confirmedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  db.transactions.push(newTx);

  // Audit log confirmed transaction
  AuditService.log(
    'TRANSACTION_CONFIRMED',
    'FINANCE',
    currentActor,
    `Recorded verified deal inflow of ₹${gross.toLocaleString()} for candidate ${newTx.candidateName}`,
    {
      targetId: newTx.id,
      targetType: 'TRANSACTION',
      details: { grossAmount: gross, companyShareAmount, remainingShareAmount, netProfit },
    }
  );

  return successResponse(res, newTx, 'Transaction recorded and verified', 201);
};

export const getFinancialSummary = (req: Request, res: Response) => {
  const confirmed = db.transactions.filter((t) => t.status === 'CONFIRMED');

  const totalGross = confirmed.reduce((acc, t) => acc + t.grossAmount, 0);
  const totalCompanyShare = confirmed.reduce((acc, t) => acc + t.companyShareAmount, 0);
  const totalTeamShare = confirmed.reduce((acc, t) => acc + t.remainingShareAmount, 0);
  const totalNetProfit = confirmed.reduce((acc, t) => acc + t.netProfit, 0);

  return successResponse(res, {
    totalTransactions: confirmed.length,
    totalGrossRevenue: totalGross,
    totalCompanyShare: totalCompanyShare,
    totalTeamShare: totalTeamShare,
    totalNetProfit: totalNetProfit,
    defaultCompanyPct: db.settings.companySharePercentage,
    defaultRemainingPct: db.settings.remainingSharePercentage,
  });
};
