import type { LeadStatus, SystemSettings, UserRole } from '../types';

export const USER_ROLES: Record<UserRole, UserRole> = {
  ADMIN: 'ADMIN',
  TEAM_LEAD: 'TEAM_LEAD',
  BDE: 'BDE',
};

export const LEAD_STATUS_CONFIG: Record<
  LeadStatus,
  { label: string; color: string; badgeVariant: string }
> = {
  NEW: { label: 'New Lead', color: '#047857', badgeVariant: 'emerald' },
  CONTACTED: { label: 'Contacted', color: '#967440', badgeVariant: 'champagne' },
  INTERESTED: { label: 'Interested', color: '#B8860B', badgeVariant: 'gold' },
  NOT_INTERESTED: { label: 'Not Interested', color: '#5F736D', badgeVariant: 'muted' },
  FOLLOW_UP_REQUIRED: { label: 'Follow-up Due', color: '#C06A1D', badgeVariant: 'warning' },
  CONVERTED: { label: 'Converted', color: '#059669', badgeVariant: 'success' },
  NOT_REACHABLE: { label: 'Not Reachable', color: '#9E2A2B', badgeVariant: 'destructive' },
  LOST: { label: 'Lost', color: '#66706C', badgeVariant: 'neutral' },
};

export const APP_ROUTES = {
  LOGIN: '/login',
  ADMIN: {
    DASHBOARD: '/admin/dashboard',
    TEAMS: '/admin/teams',
    USERS: '/admin/users',
    LEADS: '/admin/leads',
    FINANCE: '/admin/finance',
    ATTENDANCE: '/admin/attendance',
    REPORTS: '/admin/reports',
    SETTINGS: '/admin/settings',
    AUDIT: '/admin/audit',
  },
  TEAM_LEAD: {
    DASHBOARD: '/team-lead/dashboard',
    LEAD_POOL: '/team-lead/pool',
    DISTRIBUTION: '/team-lead/distribute',
    ATTENDANCE: '/team-lead/attendance',
    REPORTS: '/team-lead/reports',
  },
  BDE: {
    DASHBOARD: '/bde/dashboard',
    LEADS_QUEUE: '/bde/leads',
    FOLLOW_UPS: '/bde/follow-ups',
    ATTENDANCE: '/bde/attendance',
    PERFORMANCE: '/bde/performance',
  },
};

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  companySharePercentage: 30,
  remainingSharePercentage: 70,
  profitSharePercentage: 30,
  conversionTargetPercentage: 25,
  dailyTargetLeads: 10,
  weeklyTargetLeads: 50,
  monthlyTargetLeads: 200,
  maxLeadsPerBde: 75,
  allocationMethod: 'WORKLOAD_BASED',
  workdayStartTime: '09:30',
  workdayEndTime: '18:30',
  lateGracePeriodMinutes: 15,
  earlyExitGracePeriodMinutes: 15,
  halfDayThresholdHours: 4.5,
  fullDayThresholdHours: 8,
  followUpReminderMinutes: 30,
  statuses: [
    'NEW',
    'CONTACTED',
    'INTERESTED',
    'NOT_INTERESTED',
    'FOLLOW_UP_REQUIRED',
    'CONVERTED',
    'NOT_REACHABLE',
    'LOST',
  ],
  statusTransitions: {
    NEW: ['CONTACTED'],
    CONTACTED: ['INTERESTED', 'NOT_INTERESTED', 'NOT_REACHABLE', 'FOLLOW_UP_REQUIRED'],
    INTERESTED: ['CONVERTED', 'LOST'],
    NOT_INTERESTED: ['LOST'],
    FOLLOW_UP_REQUIRED: ['CONTACTED', 'CONVERTED', 'LOST'],
    CONVERTED: [],
    NOT_REACHABLE: ['FOLLOW_UP_REQUIRED', 'LOST'],
    LOST: [],
  },
};

export const OPEN_LEAD_STATUSES: LeadStatus[] = [
  'NEW',
  'CONTACTED',
  'INTERESTED',
  'NOT_INTERESTED',
  'FOLLOW_UP_REQUIRED',
  'NOT_REACHABLE',
];

export const FOLLOW_UP_REQUIRED_STATUSES: LeadStatus[] = [
  'CONTACTED',
  'INTERESTED',
  'FOLLOW_UP_REQUIRED',
  'NOT_REACHABLE',
];

export const MAX_AUDIT_EVENTS = 500;

export const ROLE_HOME_ROUTES: Record<UserRole, string> = {
  ADMIN: APP_ROUTES.ADMIN.DASHBOARD,
  TEAM_LEAD: APP_ROUTES.TEAM_LEAD.DASHBOARD,
  BDE: APP_ROUTES.BDE.DASHBOARD,
};

