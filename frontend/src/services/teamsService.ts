import { apiRequest } from './apiClient';

export interface BackendTeam {
  id: string;
  name: string;
  teamLeadId: string;
  teamLeadName: string;
  bdeCount: number;
  activeLeadsCount: number;
  convertedLeadsCount: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export const teamsService = {
  getTeams: async () => {
    return apiRequest<{ total: number; teams: BackendTeam[] }>('/teams');
  },

  createTeam: async (payload: { name: string; teamLeadId: string; actor?: any }) => {
    return apiRequest<BackendTeam>('/teams', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
