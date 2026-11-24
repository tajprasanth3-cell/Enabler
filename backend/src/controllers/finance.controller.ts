import { Request, Response } from 'express';
import { db } from '../services/store';
import { FinancialCalculationLog, FinancialTransaction, UserRole } from '../types';
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
  const { status, teamId, bdeId, leadId } = req.query;

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
  if (leadId) {
    txs = txs.filter((t) => t.leadId === leadId);
  }

  // Ensure all transactions have normalized property names for both standards
  const normalized = txs.map((t) => ({
    ...t,
    companySharePercentage: t.companySharePercentage ?? t.companySharePct,
    companySharePct: t.companySharePct ?? t.companySharePercentage,
    remainingSharePercentage: t.remainingSharePercentage ?? t.remainingSharePct,
    remainingSharePct: t.remainingSharePct ?? t.remainingSharePercentage,
  }));

  return successResponse(res, {
    total: normalized.length,
    transactions: normalized,
  });
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
  const remPct = remainingPctValue !== undefined ? parseFloat(remainingPctValue) : (100 - compPct);

  const currentActor = resolveActor(req, req.body.actor);

  const companyShare = Number(((gross * compPct) / 100).toFixed(2));
  const remainingShare = Number((gross - companyShare).toFixed(2));

  // Record calculation log
  const calcLog: FinancialCalculationLog = {
    id: `calc-${Date.now()}`,
    calcType: 'REVENUE_SHARE_30_70',
    inputValues: { grossAmount: gross, companyPct: compPct, remainingPct: remPct },
    resultValues: { companyShare, remainingShare },
    calculatedById: currentActor?.id ?? 'system',
    calculatedByName: currentActor?.name ?? 'System',
    notes,
    timestamp: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  db.financialCalculationLogs.unshift(calcLog);
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
    companySharePercentage: compPct,
    remainingSharePct: remPct,
    remainingSharePercentage: remPct,
    companyShare,
    remainingShare,
    logId: calcLog.id,
  });
};

export const calculateProfit = (req: AuthenticatedRequest, res: Response) => {
  const { grossAmount, investmentCost, profitSharePercentage, notes } = req.body;

  const gross = parseFloat(grossAmount);
  const cost = parseFloat(investmentCost ?? '0');

  if (isNaN(gross) || gross <= 0) {
    return errorResponse(res, 'Valid positive grossAmount is required', 400);
  }
  if (isNaN(cost) || cost < 0) {
    return errorResponse(res, 'Valid non-negative investmentCost is required', 400);
  }

  const pPct = profitSharePercentage !== undefined
    ? parseFloat(profitSharePercentage)
    : db.settings.profitSharePercentage;

  const currentActor = resolveActor(req, req.body.actor);

  const netProfit = Number((gross - cost).toFixed(2));
  const isProfitable = netProfit > 0;
  const companyProfitShare = isProfitable ? Number(((netProfit * pPct) / 100).toFixed(2)) : 0;
  const remainingProfitShare = isProfitable ? Number((netProfit - companyProfitShare).toFixed(2)) : 0;

  const calcLog: FinancialCalculationLog = {
    id: `calc-${Date.now()}`,
    calcType: 'PROFIT_SHARE',
    inputValues: { grossAmount: gross, investmentCost: cost, profitSharePercentage: pPct },
    resultValues: { netProfit, isProfitable, companyProfitShare, remainingProfitShare },
    calculatedById: currentActor?.id ?? 'system',
    calculatedByName: currentActor?.name ?? 'System',
    notes,
    timestamp: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  db.financialCalculationLogs.unshift(calcLog);
  db.save();

  AuditService.log(
    'FINANCIAL_CALCULATION',
    'FINANCE',
    auditActorOf(currentActor),
    `Calculated profit split for ₹${gross.toLocaleString()} (Cost: ₹${cost.toLocaleString()}, Net Profit: ₹${netProfit.toLocaleString()})`,
    {
      targetId: calcLog.id,
      targetType: 'CALCULATION',
      details: { gross, cost, netProfit, pPct, companyProfitShare, remainingProfitShare },
    }
  );

  return successResponse(res, {
    grossAmount: gross,
    investmentCost: cost,
    netProfit,
    isProfitable,
    profitSharePercentage: pPct,
    companyProfitShare,
    remainingProfitShare,
    logId: calcLog.id,
  });
};

export const createTransaction = (req: AuthenticatedRequest, res: Response) => {
  const { leadId, grossAmount, investmentCost, notes } = req.body;

  const gross = parseFloat(grossAmount);
  const cost = parseFloat(investmentCost || '0');

  if (isNaN(gross) || gross <= 0) {
    return errorResponse(res, 'Valid positive grossAmount is required', 400);
  }
  if (isNaN(cost) || cost < 0) {
    return errorResponse(res, 'Valid non-negative investmentCost is required', 400);
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
  const profitSharePct = db.settings.profitSharePercentage;

  const companyShareAmount = Number(((gross * compPct) / 100).toFixed(2));
  const remainingShareAmount = Number((gross - companyShareAmount).toFixed(2));
  const netProfit = Number((gross - cost).toFixed(2));

  const companyProfitShareAmount = netProfit > 0 ? Number(((netProfit * profitSharePct) / 100).toFixed(2)) : 0;
  const remainingProfitShareAmount = netProfit > 0 ? Number((netProfit - companyProfitShareAmount).toFixed(2)) : 0;

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
    companySharePercentage: compPct,
    remainingSharePct: remPct,
    remainingSharePercentage: remPct,
    companyShareAmount,
    remainingShareAmount,
    netProfit,
    profitSharePercentage: profitSharePct,
    companyProfitShareAmount,
    remainingProfitShareAmount,
    status: 'CONFIRMED',
    confirmedById: currentActor?.id ?? 'system',
    confirmedByName: currentActor?.name ?? 'System',
    confirmedAt: new Date().toISOString(),
    notes: notes || '',
    createdAt: new Date().toISOString(),
  };

  // Update lead dealValue if not set
  if (!lead.dealValue || lead.dealValue === 0) {
    lead.dealValue = gross;
  }

  db.transactions.unshift(newTx);
  db.save();

  // Audit log confirmed transaction
  AuditService.log(
    'TRANSACTION_CONFIRMED',
    'FINANCE',
    auditActorOf(currentActor),
    `Recorded verified deal inflow of ₹${gross.toLocaleString()} for candidate ${newTx.candidateName} (Company Share: ₹${companyShareAmount.toLocaleString()}, Net Profit: ₹${netProfit.toLocaleString()})`,
    {
      targetId: newTx.id,
      targetType: 'TRANSACTION',
      details: {
        grossAmount: gross,
        investmentCost: cost,
        companyShareAmount,
        remainingShareAmount,
        netProfit,
        companyProfitShareAmount,
        remainingProfitShareAmount,
        leadId: lead.id,
      },
    }
  );

  return successResponse(res, newTx, 'Transaction recorded and verified', 201);
};

export const verifyTransaction = (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status, notes } = req.body;

  if (!status || !['CONFIRMED', 'REJECTED', 'REFUNDED', 'PENDING_VERIFICATION'].includes(status)) {
    return errorResponse(res, 'Valid status is required (CONFIRMED, REJECTED, REFUNDED, PENDING_VERIFICATION)', 400);
  }

  const tx = db.transactions.find((t) => t.id === id);
  if (!tx) {
    return errorResponse(res, 'Transaction not found', 404);
  }

  const currentActor = resolveActor(req, req.body.actor);
  const oldStatus = tx.status;
  tx.status = status;
  if (notes) {
    tx.notes = tx.notes ? `${tx.notes} | ${notes}` : notes;
  }
  if (status === 'CONFIRMED') {
    tx.confirmedAt = new Date().toISOString();
    tx.confirmedById = currentActor?.id ?? 'system';
    tx.confirmedByName = currentActor?.name ?? 'System';
  }
  db.save();

  AuditService.log(
    'TRANSACTION_CONFIRMED',
    'FINANCE',
    auditActorOf(currentActor),
    `Updated transaction ${tx.id} status from ${oldStatus} to ${status}`,
    {
      targetId: tx.id,
      targetType: 'TRANSACTION',
      details: { oldStatus, newStatus: status, notes },
    }
  );

  return successResponse(res, tx, `Transaction status updated to ${status}`);
};

export const getFinancialSummary = (req: Request, res: Response) => {
  const { teamId } = req.query;
  let transactions = [...db.transactions];
  if (teamId) {
    transactions = transactions.filter((t) => t.teamId === teamId);
  }

  const confirmed = transactions.filter((t) => t.status === 'CONFIRMED');

  const totalGross = confirmed.reduce((acc, t) => acc + t.grossAmount, 0);
  const totalInvestment = confirmed.reduce((acc, t) => acc + (t.investmentCost || 0), 0);
  const totalCompanyShare = confirmed.reduce((acc, t) => acc + t.companyShareAmount, 0);
  const totalTeamShare = confirmed.reduce((acc, t) => acc + t.remainingShareAmount, 0);
  const totalNetProfit = confirmed.reduce((acc, t) => acc + t.netProfit, 0);
  const totalCompanyProfitShare = confirmed.reduce((acc, t) => acc + (t.companyProfitShareAmount || 0), 0);
  const totalRemainingProfitShare = confirmed.reduce((acc, t) => acc + (t.remainingProfitShareAmount || 0), 0);

  return successResponse(res, {
    totalTransactions: transactions.length,
    confirmedTransactionsCount: confirmed.length,
    pendingTransactionsCount: transactions.filter((t) => t.status === 'PENDING' || t.status === 'PENDING_VERIFICATION').length,
    totalGrossRevenue: totalGross,
    totalRecordedRevenue: totalGross,
    totalInvestmentCost: totalInvestment,
    totalCompanyShare: totalCompanyShare,
    totalTeamShare: totalTeamShare,
    totalRemainingShare: totalTeamShare,
    totalNetProfit: totalNetProfit,
    totalCompanyProfitShare,
    totalRemainingProfitShare,
    defaultCompanyPct: db.settings.companySharePercentage,
    defaultRemainingPct: db.settings.remainingSharePercentage,
    defaultProfitSharePct: db.settings.profitSharePercentage,
  });
};

export const getCalculationLogs = (req: Request, res: Response) => {
  return successResponse(res, {
    total: db.financialCalculationLogs.length,
    logs: db.financialCalculationLogs,
  });
};

export const createCalculationLog = (req: AuthenticatedRequest, res: Response) => {
  const { calcType, inputValues, resultValues, notes } = req.body;

  if (!calcType || !inputValues || !resultValues) {
    return errorResponse(res, 'calcType, inputValues, and resultValues are required', 400);
  }

  const currentActor = resolveActor(req, req.body.actor);

  const newLog: FinancialCalculationLog = {
    id: `calc-${Date.now()}`,
    calcType: String(calcType),
    inputValues: typeof inputValues === 'object' ? inputValues : {},
    resultValues: typeof resultValues === 'object' ? resultValues : {},
    calculatedById: currentActor?.id ?? 'system',
    calculatedByName: currentActor?.name ?? 'System',
    notes: notes ? String(notes) : undefined,
    timestamp: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  db.financialCalculationLogs.unshift(newLog);
  db.save();

  AuditService.log(
    'FINANCIAL_CALCULATION',
    'FINANCE',
    auditActorOf(currentActor),
    `Logged ${calcType} calculation: ${notes || 'Saved projection'}`,
    {
      targetId: newLog.id,
      targetType: 'CALCULATION',
      details: { calcType, inputValues, resultValues },
    }
  );

  return successResponse(res, newLog, 'Financial calculation logged', 201);
};
