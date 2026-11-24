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
  companySharePercentage?: number;
  remainingSharePct: number;
  remainingSharePercentage?: number;
  companyShareAmount: number;
  remainingShareAmount: number;
  netProfit: number;
  profitSharePercentage?: number;
  companyProfitShareAmount?: number;
  remainingProfitShareAmount?: number;
  status: 'PENDING_VERIFICATION' | 'CONFIRMED' | 'REJECTED' | 'REFUNDED' | 'PENDING';
  confirmedById?: string | null;
  confirmedByName?: string | null;
  confirmedAt?: string | null;
  notes?: string;
  createdAt: string;
}

export interface BackendCalculationLog {
  id: string;
  calcType: string;
  inputValues: Record<string, any>;
  resultValues: Record<string, any>;
  calculatedById: string;
  calculatedByName: string;
  notes?: string;
  timestamp?: string;
  createdAt?: string;
}

export const financeService = {
  getSummary: async (teamId?: string) => {
    const query = teamId ? `?teamId=${teamId}` : '';
    return apiRequest<any>(`/finance/summary${query}`);
  },

  getTransactions: async (params?: { teamId?: string; bdeId?: string; status?: string; leadId?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    const result = await apiRequest<any>(`/finance/transactions${query ? `?${query}` : ''}`);
    if (Array.isArray(result)) {
      return { total: result.length, transactions: result };
    }
    if (result && Array.isArray(result.transactions)) {
      return result;
    }
    return { total: 0, transactions: [] };
  },

  calculateSplit: async (payload: { grossAmount: number; companySharePct?: number; remainingSharePct?: number; notes?: string; actor?: any }) => {
    return apiRequest<any>('/finance/calculate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  calculateProfit: async (payload: { grossAmount: number; investmentCost?: number; profitSharePercentage?: number; notes?: string; actor?: any }) => {
    return apiRequest<any>('/finance/calculate-profit', {
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

  verifyTransaction: async (id: string, status: string, notes?: string, actor?: any) => {
    return apiRequest<BackendTransaction>(`/finance/transactions/${id}/verify`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes, actor }),
    });
  },

  getCalculationLogs: async () => {
    const result = await apiRequest<any>('/finance/calculations');
    if (Array.isArray(result)) {
      return { total: result.length, logs: result };
    }
    if (result && Array.isArray(result.logs)) {
      return result;
    }
    return { total: 0, logs: [] };
  },

  saveCalculationLog: async (payload: {
    calcType: string;
    inputValues: Record<string, any>;
    resultValues: Record<string, any>;
    notes?: string;
    actor?: any;
  }) => {
    return apiRequest<BackendCalculationLog>('/finance/calculations', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
