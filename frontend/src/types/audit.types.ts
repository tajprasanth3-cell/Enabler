export type AuditAction =
  | 'ROLE_SWITCH'
  | 'USER_CREATE'
  | 'USER_STATUS_CHANGE'
  | 'USER_REASSIGN'
  | 'TEAM_CREATE'
  | 'LEAD_INGEST'
  | 'LEAD_ALLOCATE'
  | 'LEAD_STATUS_CHANGE'
  | 'LEAD_STATUS_TRANSITION_REJECTED'
  | 'LEAD_REASSIGN'
  | 'FOLLOW_UP_COMPLETE'
  | 'REPORT_SUBMIT'
  | 'LEAVE_REQUEST'
  | 'POOL_ESCALATION'
  | 'ATTENDANCE_PUNCH_IN'
  | 'ATTENDANCE_PUNCH_OUT'
  | 'ATTENDANCE_CORRECTION'
  | 'FINANCIAL_TRANSACTION'
  | 'FINANCIAL_CALCULATION'
  | 'SETTINGS_UPDATE';

export type AuditEntityType =
  | 'USER'
  | 'TEAM'
  | 'LEAD'
  | 'FOLLOW_UP'
  | 'ATTENDANCE'
  | 'TRANSACTION'
  | 'CALCULATION'
  | 'SETTINGS'
  | 'SESSION';

export interface AuditEvent {
  id: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  summary: string;
  details?: Record<string, string | number | boolean | null | undefined>;
  actorId: string;
  actorName: string;
  actorRole: string;
  timestamp: string;
}

export interface AttendanceCorrection {
  id: string;
  recordId: string;
  previousStatus: string;
  newStatus: string;
  previousPunchOutTime: string | null;
  newPunchOutTime: string | null;
  reason: string;
  correctedById: string;
  correctedByName: string;
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
  allocationMethod: 'EQUAL' | 'WORKLOAD_BASED' | 'MANUAL';
  workdayStartTime: string;
  workdayEndTime: string;
  lateGracePeriodMinutes: number;
  earlyExitGracePeriodMinutes: number;
  halfDayThresholdHours: number;
  fullDayThresholdHours: number;
  followUpReminderMinutes: number;
  statuses: string[];
  statusTransitions: Record<string, string[]>;
}
