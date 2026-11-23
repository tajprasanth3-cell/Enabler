import { apiRequest } from './apiClient';

export const auditService = {
  getAuditLogs: async (params?: { category?: string; action?: string; actorId?: string; targetId?: string; search?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams(params as any).toString();
    return apiRequest<{ total: number; page: number; limit: number; totalPages: number; logs: any[] }>(`/audit${query ? `?${query}` : ''}`);
  },

  getStats: async () => {
    return apiRequest<{ total: number; byCategory: Record<string, number>; byAction: Record<string, number> }>('/audit/stats');
  },
};
