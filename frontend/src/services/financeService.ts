import { apiRequest } from './apiClient';

export interface BackendTransaction {
  id: string;
  leadId: string;
  candidateName: string;
  bdeId: string;
  bdeName: string;
  teamId: string;
  teamName: string;
  grossAmount: number;
  investmentCost: number;
  companySharePct: number;
  remainingSharePct: number;
  companyShareAmount: number;
  remainingShareAmount: number;
  netProfit: number;
  status: 'PENDING_VERIFICATION' | 'CONFIRMED' | 'REJECTED';
  confirmedById?: string;
  confirmedByName?: string;
  confirmedAt?: string;
  createdAt: string;
}

export const financeService = {
  getSummary: async (teamId?: string) => {
    const query = teamId ? `?teamId=${teamId}` : '';
    return apiRequest<any>(`/finance/summary${query}`);
  },

  getTransactions: async (params?: { teamId?: string; bdeId?: string; status?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return apiRequest<{ total: number; transactions: BackendTransaction[] }>(`/finance/transactions${query ? `?${query}` : ''}`);
  },

  calculateSplit: async (payload: { grossAmount: number; companySharePct?: number; remainingSharePct?: number; actor?: any }) => {
    return apiRequest<any>('/finance/calculate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  createTransaction: async (payload: {
    leadId: string;
    candidateName: string;
    bdeId: string;
    bdeName: string;
    teamId: string;
    teamName: string;
    grossAmount: number;
    investmentCost?: number;
    notes?: string;
    actor?: any;
  }) => {
    return apiRequest<BackendTransaction>('/finance/transactions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  verifyTransaction: async (id: string, status: 'CONFIRMED' | 'REJECTED', actor?: any) => {
    return apiRequest<BackendTransaction>(`/finance/transactions/${id}/verify`, {
      method: 'PATCH',
      body: JSON.stringify({ status, actor }),
    });
  },
};
