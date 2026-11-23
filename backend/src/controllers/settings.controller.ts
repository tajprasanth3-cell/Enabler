import { Request, Response } from 'express';
import { db } from '../services/store';
import { UserRole } from '../types';
import { successResponse, errorResponse } from '../utils/response';
import { AuditService } from '../services/audit.service';

export const getSettings = (req: Request, res: Response) => {
  return successResponse(res, db.settings, 'System settings retrieved successfully');
};

export const updateSettings = (req: Request, res: Response) => {
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
    actor,
  } = req.body;

  const currentActor = actor || {
    id: 'usr-1',
    name: 'Vikram Sharma',
    role: 'ADMIN' as UserRole,
  };

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

  if (shiftStartTime !== undefined) {
    db.settings.shiftStartTime = String(shiftStartTime);
  }

  if (gracePeriodMinutes !== undefined) {
    db.settings.gracePeriodMinutes = Number(gracePeriodMinutes);
  }

  AuditService.log(
    'SETTINGS_UPDATED',
    'SYSTEM',
    currentActor,
    `System governance settings updated by ${currentActor.name}`,
    {
      targetType: 'SYSTEM_SETTINGS',
      details: {
        previous: oldSettings,
        updated: db.settings,
      },
    }
  );

  db.save();

  return successResponse(res, db.settings, 'System settings updated and saved successfully');
};
