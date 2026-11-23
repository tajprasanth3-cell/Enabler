import { Request, Response } from 'express';
import { db } from '../services/store';
import { FinancialTransaction, UserRole } from '../types';
import { successResponse, errorResponse } from '../utils/response';
import { AuditService } from '../services/audit.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

type Actor = { id: string; name: string; role: UserRole };

const resolveActor = (req: AuthenticatedRequest, bodyActor?: any): Actor | null => {
  const candidate = req.user || bodyActor;
  if (!candidate || !candidate.id) {
    return null;
  }
  return {
    id: String(candidate.id),
    name: String(candidate.name || 'Unknown'),
    role: candidate.role as UserRole,
  };
};

const auditActorOf = (actor: Actor | null): Actor =>
  actor || { id: 'system', name: 'System', role: 'ADMIN' as UserRole };

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

export const calculateSplit = (req: AuthenticatedRequest, res: Response) => {
  const { grossAmount, notes } = req.body;

  const gross = parseFloat(grossAmount);
  if (isNaN(gross) || gross <= 0) {
    return errorResponse(res, 'Valid positive grossAmount is required', 400);
  }

  const companyPctValue =
    req.body.companyPct ?? req.body.companySharePct ?? req.body.companySharePercentage;
  const remainingPctValue =
    req.body.remainingPct ?? req.body.remainingSharePct ?? req.body.remainingSharePercentage;

  const compPct = companyPctValue !== undefined ? parseFloat(companyPctValue) : db.settings.companySharePercentage;
  const remPct = remainingPctValue !== undefined ? parseFloat(remainingPctValue) : db.settings.remainingSharePercentage;

  const currentActor = resolveActor(req, req.body.actor);

  const companyShare = (gross * compPct) / 100;
  const remainingShare = (gross * remPct) / 100;

  // Record calculation log
  const calcLog = {
    id: `calc-${Date.now()}`,
    calcType: 'REVENUE_SPLIT' as const,
    inputValues: { grossAmount: gross, companyPct: compPct, remainingPct: remPct },
    resultValues: { companyShare, remainingShare },
    calculatedById: currentActor?.id ?? 'system',
    calculatedByName: currentActor?.name ?? 'System',
    notes,
    timestamp: new Date().toISOString(),
  };
  db.financialCalculationLogs.push(calcLog);
  db.save();

  // Audit log calculation
  AuditService.log(
    'FINANCIAL_CALCULATION',
    'FINANCE',
    auditActorOf(currentActor),
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

export const createTransaction = (req: AuthenticatedRequest, res: Response) => {
  const { leadId, grossAmount, investmentCost } = req.body;

  const gross = parseFloat(grossAmount);
  const cost = parseFloat(investmentCost || '0');

  if (isNaN(gross) || gross <= 0) {
    return errorResponse(res, 'Valid positive grossAmount is required', 400);
  }

  const lead = db.leads.find((l) => l.id === leadId);
  if (!lead) {
    return errorResponse(res, 'Lead not found', 404);
  }
  if (!lead.currentBdeId || !lead.currentTeamId) {
    return errorResponse(res, 'Lead is missing BDE or team information', 400);
  }

  const bde = db.users.find((u) => u.id === lead.currentBdeId);
  const team = db.teams.find((t) => t.id === lead.currentTeamId);
  if (!bde) {
    return errorResponse(res, 'Lead BDE not found', 404);
  }
  if (!team) {
    return errorResponse(res, 'Lead team not found', 404);
  }

  const compPct = db.settings.companySharePercentage;
  const remPct = db.settings.remainingSharePercentage;

  const companyShareAmount = (gross * compPct) / 100;
  const remainingShareAmount = (gross * remPct) / 100;
  const netProfit = gross - cost;

  const currentActor = resolveActor(req, req.body.actor);

  const newTx: FinancialTransaction = {
    id: `tx-${Date.now()}`,
    leadId: lead.id,
    candidateName: lead.candidateName,
    bdeId: bde.id,
    bdeName: bde.name,
    teamId: team.id,
    teamName: team.name,
    grossAmount: gross,
    investmentCost: cost,
    companySharePct: compPct,
    remainingSharePct: remPct,
    companyShareAmount,
    remainingShareAmount,
    netProfit,
    status: 'CONFIRMED',
    confirmedById: currentActor?.id ?? 'system',
    confirmedByName: currentActor?.name ?? 'System',
    confirmedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  db.transactions.push(newTx);
  db.save();

  // Audit log confirmed transaction
  AuditService.log(
    'TRANSACTION_CONFIRMED',
    'FINANCE',
    auditActorOf(currentActor),
    `Recorded verified deal inflow of ₹${gross.toLocaleString()} for candidate ${newTx.candidateName}`,
    {
      targetId: newTx.id,
      targetType: 'TRANSACTION',
      details: { grossAmount: gross, companyShareAmount, remainingShareAmount, netProfit, leadId: lead.id },
    }
  );

  return successResponse(res, newTx, 'Transaction recorded and verified', 201);
};

export const getFinancialSummary = (req: Request, res: Response) => {
  const { teamId } = req.query;
  let transactions = [...db.transactions];
  if (teamId) {
    transactions = transactions.filter((t) => t.teamId === teamId);
  }

  const confirmed = transactions.filter((t) => t.status === 'CONFIRMED');

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
