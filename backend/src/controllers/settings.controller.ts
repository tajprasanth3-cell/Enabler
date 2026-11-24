import { Request, Response } from 'express';
import { db } from '../services/store';
import { UserRole } from '../types';
import { successResponse, errorResponse } from '../utils/response';
import { AuditService } from '../services/audit.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export const getSettings = (req: Request, res: Response) => {
  return successResponse(res, db.settings, 'System settings retrieved successfully');
};

export const updateSettings = (req: AuthenticatedRequest, res: Response) => {
  const body = req.body;
  const {
    companySharePercentage,
    remainingSharePercentage,
    profitSharePercentage,
    conversionTargetPercentage,
    dailyTargetLeads,
    weeklyTargetLeads,
    monthlyTargetLeads,
    maxLeadsPerBde,
    shiftStartTime,
    gracePeriodMinutes,
  allocationMethod,
  workdayEndTime,
  earlyExitGracePeriodMinutes,
  halfDayThresholdHours,
    fullDayThresholdHours,
    followUpReminderMinutes,
    statuses,
    statusTransitions,
  } = body;

  const bodyActor = body.actor as { id: string; name: string; role: UserRole } | undefined;
  const currentActor = req.user || bodyActor || null;
  const auditActor = currentActor || { id: 'system', name: 'System', role: 'ADMIN' as UserRole };

  const oldSettings = { ...db.settings };

  // Validate split ratio if either is provided
  if (companySharePercentage !== undefined || remainingSharePercentage !== undefined) {
    const comp = companySharePercentage !== undefined ? Number(companySharePercentage) : db.settings.companySharePercentage;
    const rem = remainingSharePercentage !== undefined ? Number(remainingSharePercentage) : (100 - comp);

    if (comp < 0 || rem < 0 || comp + rem !== 100) {
      return errorResponse(res, 'Company Share and Remaining Share must be positive numbers and sum exactly to 100%', 400);
    }

    db.settings.companySharePercentage = comp;
    db.settings.remainingSharePercentage = rem;
  }

  if (profitSharePercentage !== undefined) {
    if (profitSharePercentage < 0 || profitSharePercentage > 100) {
      return errorResponse(res, 'Profit share must be between 0 and 100', 400);
    }
    db.settings.profitSharePercentage = Number(profitSharePercentage);
  }

  if (conversionTargetPercentage !== undefined) {
    db.settings.conversionTargetPercentage = Number(conversionTargetPercentage);
  }

  if (dailyTargetLeads !== undefined) {
    db.settings.dailyTargetLeads = Number(dailyTargetLeads);
  }

  if (weeklyTargetLeads !== undefined) {
    db.settings.weeklyTargetLeads = Number(weeklyTargetLeads);
  }

  if (monthlyTargetLeads !== undefined) {
    db.settings.monthlyTargetLeads = Number(monthlyTargetLeads);
  }

  if (maxLeadsPerBde !== undefined) {
    db.settings.maxLeadsPerBde = Number(maxLeadsPerBde);
  }

  const effectiveShiftStart = shiftStartTime ?? body.workdayStartTime;
  if (effectiveShiftStart !== undefined) {
    db.settings.shiftStartTime = String(effectiveShiftStart);
  }

  const effectiveGrace = gracePeriodMinutes ?? body.lateGracePeriodMinutes;
  if (effectiveGrace !== undefined) {
    db.settings.gracePeriodMinutes = Number(effectiveGrace);
  }

  if (allocationMethod !== undefined) {
    if (!['EQUAL', 'WORKLOAD_BASED', 'MANUAL'].includes(allocationMethod)) {
      return errorResponse(res, 'Invalid allocationMethod', 400);
    }
    db.settings.allocationMethod = allocationMethod;
  }

  if (workdayEndTime !== undefined) {
    db.settings.workdayEndTime = String(workdayEndTime);
  }

  if (earlyExitGracePeriodMinutes !== undefined) {
    db.settings.earlyExitGracePeriodMinutes = Number(earlyExitGracePeriodMinutes);
  }

  if (halfDayThresholdHours !== undefined) {
    db.settings.halfDayThresholdHours = Number(halfDayThresholdHours);
  }

  if (fullDayThresholdHours !== undefined) {
    db.settings.fullDayThresholdHours = Number(fullDayThresholdHours);
  }

  if (followUpReminderMinutes !== undefined) {
    db.settings.followUpReminderMinutes = Number(followUpReminderMinutes);
  }

  if (statuses !== undefined) {
    if (!Array.isArray(statuses) || statuses.some((status) => typeof status !== 'string')) {
      return errorResponse(res, 'statuses must be an array of status names', 400);
    }
    db.settings.statuses = [...new Set(statuses)];
  }

  if (statusTransitions !== undefined) {
    if (!statusTransitions || typeof statusTransitions !== 'object' || Array.isArray(statusTransitions)) {
      return errorResponse(res, 'statusTransitions must be an object', 400);
    }
    const normalized: Record<string, string[]> = {};
    Object.entries(statusTransitions).forEach(([from, targets]) => {
      if (!Array.isArray(targets) || targets.some((target) => typeof target !== 'string')) {
        return;
      }
      normalized[from] = [...new Set(targets as string[])];
    });
    db.settings.statusTransitions = normalized;
  }

  AuditService.log(
    'SETTINGS_UPDATED',
    'SYSTEM',
    auditActor,
    `System governance settings updated by ${auditActor.name}`,
    {
      targetType: 'SYSTEM_SETTINGS',
      details: {
        previous: oldSettings,
        updated: db.settings,
        actorId: currentActor?.id ?? null,
      },
    }
  );

  db.save();

  return successResponse(res, db.settings, 'System settings updated and saved successfully');
};
