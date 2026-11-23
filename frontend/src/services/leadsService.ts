import { apiRequest } from './apiClient';

export interface BackendLead {
  id: string;
  candidateName: string;
  phone: string;
  email: string;
  city: string;
  education: string;
  source?: string;
  status: string;
  currentTeamId?: string | null;
  currentTeamName?: string | null;
  currentBdeId?: string | null;
  currentBdeName?: string | null;
  nextFollowUpDate?: string;
  dealValue?: number;
  remarks?: string;
  createdAt: string;
}

export const leadsService = {
  getLeads: async (params?: { teamId?: string; bdeId?: string; status?: string; search?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return apiRequest<{ total: number; leads: BackendLead[]; unassignedCount: number }>(`/leads${query ? `?${query}` : ''}`);
  },

  ingestLeads: async (candidates: Array<Partial<BackendLead>>, actor?: { id: string; name: string; role: string }) => {
    return apiRequest<{ added: number; duplicates: number; totalProcessed: number }>('/leads/ingest', {
      method: 'POST',
      body: JSON.stringify({ candidates, actor }),
    });
  },

  allocateStage1: async (payload: { teamIds: string[]; countPerTeam: number; method: string; teamQuotas?: Record<string, number>; actor?: any }) => {
    return apiRequest<{ allocated: number; countPerTeam: number }>('/leads/allocate/stage1', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  allocateStage2: async (payload: { teamId: string; bdeIds: string[]; countPerBde: number; method?: string; manualQuotas?: Record<string, number>; distribution?: Record<string, number>; actor?: any }) => {
    return apiRequest<{ allocated: number; distribution: Record<string, number> }>('/leads/allocate/stage2', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateLeadStatus: async (leadId: string, payload: { status: string; remarks: string; dealValue?: number; nextFollowUpDate?: string; actor?: any }) => {
    return apiRequest<BackendLead>(`/leads/${leadId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  reassignLeads: async (payload: { fromBdeId: string; toBdeId: string; reason: string; actor?: any }) => {
    return apiRequest<{ reassignedCount: number }>('/leads/reassign', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  requestReplenishment: async (payload: { bdeId: string; bdeName: string; teamId: string; teamName: string; reason?: string }) => {
    return apiRequest('/leads/replenish', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
