import { apiRequest } from './apiClient';

export const settingsService = {
  getSettings: async () => {
    return apiRequest<any>('/settings');
  },

  updateSettings: async (settings: Partial<{
    companySharePercentage: number;
    remainingSharePercentage: number;
    profitSharePercentage: number;
    conversionTargetPercentage: number;
    dailyTargetLeads: number;
    weeklyTargetLeads: number;
    monthlyTargetLeads: number;
    maxLeadsPerBde: number;
    allocationMethod: 'EQUAL' | 'WORKLOAD_BASED' | 'MANUAL';
    workdayStartTime: string;
    workdayEndTime: string;
    gracePeriodMinutes: number;
    earlyExitGracePeriodMinutes: number;
    halfDayThresholdHours: number;
    fullDayThresholdHours: number;
    followUpReminderMinutes: number;
    statuses: string[];
    statusTransitions: Record<string, string[]>;
  }>, actor?: any) => {
    return apiRequest<any>('/settings', {
      method: 'PATCH',
      body: JSON.stringify({ ...settings, actor }),
    });
  },
};
