import { apiRequest } from './apiClient';

export interface BackendUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'TEAM_LEAD' | 'BDE';
  status: 'ACTIVE' | 'INACTIVE';
  teamId?: string;
  teamName?: string;
  phone?: string;
  createdAt: string;
}

export const usersService = {
  getUsers: async (params?: { role?: string; teamId?: string; status?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return apiRequest<{ total: number; users: BackendUser[] }>(`/users${query ? `?${query}` : ''}`);
  },

  createUser: async (payload: { name: string; email: string; role: string; teamId?: string; phone?: string; actor?: any }) => {
    return apiRequest<BackendUser>('/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  toggleStatus: async (userId: string, actor?: any) => {
    return apiRequest<BackendUser>(`/users/${userId}/toggle-status`, {
      method: 'PATCH',
      body: JSON.stringify({ actor }),
    });
  },

  reassignTeam: async (userId: string, teamId?: string, actor?: any) => {
    return apiRequest<BackendUser>(`/users/${userId}/reassign-team`, {
      method: 'PATCH',
      body: JSON.stringify({ teamId, actor }),
    });
  },
};
