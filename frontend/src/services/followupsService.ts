import { apiRequest } from './apiClient';

export const followupsService = {
  getFollowUps: async (params?: { bdeId?: string; leadId?: string; status?: string; date?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return apiRequest<{ total: number; pending: number; overdue: number; completed: number; followUps: any[] }>(`/followups${query ? `?${query}` : ''}`);
  },

  createFollowUp: async (payload: { leadId: string; scheduledTime: string; remarks?: string; actor?: any }) => {
    return apiRequest<any>('/followups', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateFollowUp: async (id: string, payload: { status?: string; scheduledTime?: string; remarks?: string; actor?: any }) => {
    return apiRequest<any>(`/followups/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  deleteFollowUp: async (id: string, actor?: any) => {
    return apiRequest<any>(`/followups/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ actor }),
    });
  },
};
