export type UserRole = 'ADMIN' | 'TEAM_LEAD' | 'BDE';

export type UserStatus = 'ACTIVE' | 'INACTIVE';

export type LeadStatus =
  | 'NEW'
  | 'CONTACTED'
  | 'INTERESTED'
  | 'NOT_INTERESTED'
  | 'FOLLOW_UP_REQUIRED'
  | 'CONVERTED'
  | 'NOT_REACHABLE'
  | 'LOST';

export type PunchState = 'PUNCHED_IN' | 'PUNCHED_OUT';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  teamId?: string;
  teamName?: string;
  phone?: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface Team {
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

export interface Lead {
  id: string;
  candidateName: string;
  phone: string;
  email: string;
  city: string;
  education: string;
  source?: string;
  status: LeadStatus;
  currentTeamId?: string | null;
  currentTeamName?: string | null;
  currentBdeId?: string | null;
  currentBdeName?: string | null;
  assignedToTeamAt?: string | null;
  assignedToBdeAt?: string | null;
  nextFollowUpDate?: string;
  remarks?: string;
  dealValue?: number;
  createdAt: string;
}

export interface LeadStatusHistory {
  id: string;
  leadId: string;
  previousStatus: LeadStatus;
  newStatus: LeadStatus;
  changedById: string;
  changedByName: string;
  remarks: string;
  timestamp: string;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  teamId: string;
  date: string;
  punchInTime: string | null;
  punchOutTime: string | null;
  workingMinutes: number;
  status: 'PRESENT' | 'LATE' | 'HALF_DAY' | 'ABSENT';
  isModified: boolean;
  modifiedBy?: string;
  modifiedReason?: string;
  createdAt: string;
  updatedAt: string;
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

export interface SystemSettings {
  companySharePercentage: number;
  remainingSharePercentage: number;
  profitSharePercentage: number;
  conversionTargetPercentage: number;
  dailyTargetLeads: number;
  weeklyTargetLeads: number;
  monthlyTargetLeads: number;
  maxLeadsPerBde: number;
}
