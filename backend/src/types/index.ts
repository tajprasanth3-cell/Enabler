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

export interface FollowUpItem {
  id: string;
  leadId: string;
  candidateName: string;
  candidatePhone: string;
  bdeId: string;
  bdeName?: string;
  scheduledTime: string;
  status: 'PENDING' | 'COMPLETED' | 'OVERDUE';
  remarks?: string;
  createdAt: string;
}

export interface ReplenishmentAlert {
  id: string;
  bdeId: string;
  bdeName: string;
  teamId: string;
  teamName: string;
  reason: string;
  status: 'ACTIVE' | 'RESOLVED';
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
  modifiedByName?: string;
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

export interface FinancialCalculationLog {
  id: string;
  calcType: 'REVENUE_SPLIT' | 'PROFIT_SHARE' | 'CUSTOM_PERCENT' | 'DISCOUNT_NET';
  inputValues: Record<string, any>;
  resultValues: Record<string, any>;
  calculatedById: string;
  calculatedByName: string;
  notes?: string;
  timestamp: string;
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
  shiftStartTime: string;
  gracePeriodMinutes: number;
  allocationMethod: 'EQUAL' | 'WORKLOAD_BASED' | 'MANUAL';
  workdayEndTime: string;
  halfDayThresholdHours: number;
  fullDayThresholdHours: number;
  followUpReminderMinutes: number;
  statuses: string[];
  statusTransitions: Record<string, string[]>;
}

export type AuditAction =
  | 'LEAD_INGESTED'
  | 'LEAD_ALLOCATED_STAGE1'
  | 'LEAD_ALLOCATED_STAGE2'
  | 'LEAD_STATUS_CHANGED'
  | 'LEAD_REASSIGNED'
  | 'ATTENDANCE_PUNCH_IN'
  | 'ATTENDANCE_PUNCH_OUT'
  | 'ATTENDANCE_MODIFIED'
  | 'FINANCIAL_CALCULATION'
  | 'TRANSACTION_CONFIRMED'
  | 'TRANSACTION_REJECTED'
  | 'REPLENISHMENT_REQUESTED'
  | 'REPLENISHMENT_RESOLVED'
  | 'USER_CREATED'
  | 'USER_STATUS_TOGGLED'
  | 'TEAM_CREATED'
  | 'SETTINGS_UPDATED'
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'FOLLOWUP_CREATED'
  | 'FOLLOWUP_UPDATED'
  | 'FOLLOWUP_COMPLETED'
  | 'FOLLOWUP_CANCELLED';

export type AuditCategory =
  | 'LEAD'
  | 'ALLOCATION'
  | 'ATTENDANCE'
  | 'FINANCE'
  | 'USER'
  | 'AUTH'
  | 'SYSTEM';

export interface AuditLogEntry {
  id: string;
  action: AuditAction;
  category: AuditCategory;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  targetId?: string;
  targetType?: string;
  summary: string;
  details?: Record<string, any>;
  ipAddress?: string;
  timestamp: string;
}
