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
    shiftStartTime: string;
    gracePeriodMinutes: number;
  }>, actor?: any) => {
    return apiRequest<any>('/settings', {
      method: 'PATCH',
      body: JSON.stringify({ ...settings, actor }),
    });
  },
};
