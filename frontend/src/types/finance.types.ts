export type CalculationType =
  | 'REVENUE_SHARE_30_70'
  | 'PROFIT_SHARE'
  | 'CUSTOM_PERCENTAGE'
  | 'DISCOUNT_FINAL_PRICE'
  | 'PERCENTAGE_CHANGE'
  | 'SALES_GROWTH';

export type TransactionStatus =
  | 'PENDING_VERIFICATION'
  | 'CONFIRMED'
  | 'REJECTED'
  | 'REFUNDED';

export interface FinancialCalculationLog {
  id: string;
  calcType: CalculationType;
  inputValues: Record<string, number | string>;
  resultValues: Record<string, number | string>;
  calculatedById: string;
  calculatedByName: string;
  notes?: string;
  createdAt: string;
}

export interface FinancialTransaction {
  id: string;
  leadId: string;
  candidateName: string;
  bdeId: string;
  bdeName: string;
  teamId: string;
  teamName: string;
  grossAmount: number;
  investmentCost: number;
  netProfit: number;
  companySharePercentage: number;
  companyShareAmount: number;
  remainingSharePercentage: number;
  remainingShareAmount: number;
  profitSharePercentage?: number;
  companyProfitShareAmount?: number;
  remainingProfitShareAmount?: number;
  status: TransactionStatus;
  confirmedById?: string | null;
  confirmedByName?: string | null;
  confirmedAt?: string | null;
  notes?: string;
  createdAt: string;
}

export interface FinancialConfig {
  defaultCompanySharePercentage: number; // e.g. 30
  defaultRemainingSharePercentage: number; // e.g. 70
  defaultProfitSharePercentage: number; // e.g. 30
}

export interface FinancialSummaryKPIs {
  totalRecordedRevenue: number;
  totalCompanyShare: number;
  totalRemainingShare: number;
  totalRecordedInvestment: number;
  totalCalculatedProfit: number;
  pendingTransactionsCount: number;
  confirmedTransactionsCount: number;
}
