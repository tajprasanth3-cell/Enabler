import { apiRequest } from './apiClient';

export const reportsService = {
  getKpis: async (teamId?: string) => {
    const query = teamId ? `?teamId=${teamId}` : '';
    return apiRequest<any>(`/reports/kpis${query}`);
  },

  getFunnel: async (teamId?: string) => {
    const query = teamId ? `?teamId=${teamId}` : '';
    return apiRequest<any>(`/reports/funnel${query}`);
  },

  getLeaderboard: async () => {
    return apiRequest<{ leaderboard: any[] }>('/reports/leaderboard');
  },

  getTeamPerformance: async () => {
    return apiRequest<{ teams: any[] }>('/reports/team-performance');
  },
};
