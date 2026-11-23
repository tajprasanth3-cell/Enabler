export type LeadStatus =
  | 'NEW'
  | 'CONTACTED'
  | 'INTERESTED'
  | 'NOT_INTERESTED'
  | 'FOLLOW_UP_REQUIRED'
  | 'CONVERTED'
  | 'NOT_REACHABLE'
  | 'LOST';

export interface LeadStatusHistory {
  id: string;
  leadId: string;
  previousStatus: LeadStatus | null;
  newStatus: LeadStatus;
  changedById: string;
  changedByName: string;
  remarks: string;
  timestamp: string;
}

export interface LeadAssignmentHistory {
  id: string;
  leadId: string;
  assignedById: string;
  assignedByName: string;
  assignedToTeamId?: string | null;
  assignedToTeamName?: string | null;
  assignedToBdeId?: string | null;
  assignedToBdeName?: string | null;
  assignedAt: string;
  reason: string;
}

export interface FollowUpItem {
  id: string;
  leadId: string;
  candidateName: string;
  candidatePhone: string;
  bdeId: string;
  scheduledTime: string;
  status: 'PENDING' | 'COMPLETED' | 'OVERDUE' | 'CANCELLED' | 'MISSED';
  remarks: string;
  createdAt: string;
}

export interface Lead {
  id: string;
  candidateId?: string;
  candidateName: string;
  phone: string;
  email?: string;
  city?: string;
  education?: string;
  experienceYears?: number;
  source?: string;
  status: LeadStatus;
  currentTeamId?: string | null;
  currentTeamName?: string | null;
  currentBdeId?: string | null;
  currentBdeName?: string | null;
  lastContactedAt?: string | null;
  nextFollowUpDate?: string | null;
  createdAt: string;
  updatedAt?: string;
  remarksCount?: number;
}

export interface LeadAllocationPayload {
  leadIds: string[];
  targetType: 'TEAM' | 'BDE';
  targetIds: string[];
  allocationMethod: 'EQUAL' | 'WORKLOAD_BASED' | 'MANUAL';
  manualQuotas?: Record<string, number>;
}
