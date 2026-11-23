import React, { createContext, useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../services/apiClient';
import type {
  UserRole,
  User,
  Lead,
  LeadStatus,
  LeadStatusHistory,
  LeadAssignmentHistory,
  FollowUpItem,
  AttendanceRecord,
  FinancialTransaction,
  FinancialCalculationLog,
  Team,
  PunchState,
  AuditEvent,
  AuditAction,
  AuditEntityType,
  AttendanceCorrection,
  SystemSettings,
} from '../types';
import confetti from 'canvas-confetti';
import { usePersistentState } from '../hooks/usePersistentState';
import { DEFAULT_SYSTEM_SETTINGS, MAX_AUDIT_EVENTS, OPEN_LEAD_STATUSES } from '../utils/constants';
import { formatClock, isFutureDateTime, parseClockToMinutes } from '../utils/calculations';
import { leadsService } from '../services/leadsService';
import { attendanceService } from '../services/attendanceService';
import { financeService } from '../services/financeService';
import { teamsService } from '../services/teamsService';
import { usersService } from '../services/usersService';
import { followupsService } from '../services/followupsService';
import { settingsService } from '../services/settingsService';

export type ThemeMode = 'royal-violet' | 'emerald-mint' | 'cyber-amber' | 'ocean-azure' | 'clean-light';
export type AppNotificationType = 'error' | 'warning' | 'success';
export interface AppNotification {
  type: AppNotificationType;
  message: string;
}
export interface ActionResult {
  ok: boolean;
  message: string;
}

export interface ReportSubmission {
  id: string;
  userId: string;
  userName: string;
  teamId?: string;
  message: string;
  createdAt: string;
}

export interface LeaveRequest {
  id: string;
  userId: string;
  userName: string;
  teamId?: string;
  reason: string;
  fromDate: string;
  toDate: string;
  createdAt: string;
}

export interface PoolEscalation {
  teamId: string;
  teamName: string;
  timestamp: string;
}

export interface AppContextType {
  currentTheme: ThemeMode;
  setCurrentTheme: (theme: ThemeMode) => void;

  notification: AppNotification | null;
  notify: (type: AppNotificationType, message: string) => void;
  dismissNotification: () => void;

  isAuthenticated: boolean;
  login: (email: string, role?: UserRole) => Promise<ActionResult>;
  logout: () => void;

  currentUser: User;
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;

  teams: Team[];
  users: User[];
  toggleUserStatus: (userId: string) => boolean;
  createUser: (name: string, email: string, role: UserRole, teamId?: string, phone?: string) => boolean;
  createTeam: (name: string, teamLeadId: string) => boolean;
  reassignUserTeam: (userId: string, teamId: string, teamName: string) => boolean;

  leads: Lead[];
  leadStatusHistory: LeadStatusHistory[];
  leadAssignmentHistory: LeadAssignmentHistory[];
  auditEvents: AuditEvent[];
  attendanceCorrections: AttendanceCorrection[];
  systemSettings: SystemSettings;
  updateSystemSettings: (patch: Partial<SystemSettings>) => void;
  getAllowedStatuses: (currentStatus: LeadStatus) => LeadStatus[];
  unassignedAdminLeadsCount: number;
  ingestLeads: (newCandidates: Array<Partial<Lead>>) => { added: number; duplicates: number };
  allocateStage1AdminToTeams: (
    teamIds: string[],
    countPerTeam: number,
    method: 'EQUAL' | 'WORKLOAD_BASED'
  ) => number;
  allocateStage2TeamToBdes: (
    teamId: string,
    bdeIds: string[],
    countPerBde: number,
    method?: 'EQUAL' | 'WORKLOAD_BASED' | 'MANUAL',
    manualQuotas?: Record<string, number>
  ) => number;
  updateLeadStatus: (
    leadId: string,
    newStatus: LeadStatus,
    remarks: string,
    scheduleFollowUp?: { time: string; note: string }
  ) => boolean;
  reassignBdeLeads: (fromBdeId: string, toBdeId: string, reason: string) => boolean;

  followUps: FollowUpItem[];
  completeFollowUp: (followUpId: string) => boolean;

  attendanceRecords: AttendanceRecord[];
  punchState: PunchState;
  punchInTime: string | null;
  punchIn: () => ActionResult;
  punchOut: () => boolean;
  adjustAttendance: (
    recordId: string,
    newStatus: AttendanceRecord['status'],
    reason: string,
    newPunchOutTime?: string
  ) => boolean;

  transactions: FinancialTransaction[];
  calculationLogs: FinancialCalculationLog[];
  companySharePct: number;
  setCompanySharePct: (pct: number) => void;
  confirmPaymentTransaction: (
    leadId: string,
    grossAmount: number,
    investmentCost: number,
    notes?: string
  ) => boolean;
  updateTransactionStatus: (
    transactionId: string,
    status: FinancialTransaction['status'],
    notes?: string
  ) => void;
  logFinancialCalculation: (
    calcType: FinancialCalculationLog['calcType'],
    inputValues: Record<string, number | string>,
    resultValues: Record<string, number | string>,
    notes?: string
  ) => void;

  isBdeExhausted: boolean;
  requestLeadReplenishment: () => ActionResult;
  replenishmentAlerts: Array<{ bdeId: string; bdeName: string; teamId: string; timestamp: string }>;
  clearReplenishmentAlert: (bdeId: string) => void;

  reports: ReportSubmission[];
  leaveRequests: LeaveRequest[];
  submitReport: (message: string) => boolean;
  submitLeaveRequest: (reason: string, fromDate: string, toDate: string) => boolean;
  poolEscalations: PoolEscalation[];
  escalatePoolEmpty: (teamId: string) => void;
  clearPoolEscalation: (teamId: string) => void;
}

export const AppContext = createContext<AppContextType | null>(null);

const INITIAL_USERS: User[] = [
  { id: 'usr-1', name: 'Vikram Sharma', email: 'admin@leadflow.io', role: 'ADMIN', status: 'ACTIVE', createdAt: '2026-01-01' },
  { id: 'usr-2', name: 'Priya Patel', email: 'priya.tl@leadflow.io', role: 'TEAM_LEAD', status: 'ACTIVE', teamId: 'team-1', teamName: 'Team Alpha', createdAt: '2026-01-10' },
  { id: 'usr-3', name: 'Rajesh Verma', email: 'rajesh.tl@leadflow.io', role: 'TEAM_LEAD', status: 'ACTIVE', teamId: 'team-2', teamName: 'Team Beta', createdAt: '2026-01-15' },
  { id: 'usr-4', name: 'Prasanth', email: 'prasanth.bde@leadflow.io', role: 'BDE', status: 'ACTIVE', teamId: 'team-1', teamName: 'Team Alpha', createdAt: '2026-02-01' },
  { id: 'usr-5', name: 'Sneha Gupta', email: 'sneha.bde@leadflow.io', role: 'BDE', status: 'ACTIVE', teamId: 'team-1', teamName: 'Team Alpha', createdAt: '2026-02-01' },
  { id: 'usr-6', name: 'Rohan Mehta', email: 'rohan.bde@leadflow.io', role: 'BDE', status: 'ACTIVE', teamId: 'team-2', teamName: 'Team Beta', createdAt: '2026-02-05' },
  { id: 'usr-7', name: 'Ananya Sen', email: 'ananya.bde@leadflow.io', role: 'BDE', status: 'ACTIVE', teamId: 'team-2', teamName: 'Team Beta', createdAt: '2026-02-10' },
];

const INITIAL_TEAMS: Team[] = [
  { id: 'team-1', name: 'Team Alpha', teamLeadId: 'usr-2', teamLeadName: 'Priya Patel', bdeCount: 2, activeLeadsCount: 45, convertedLeadsCount: 12, status: 'ACTIVE', createdAt: '2026-01-10', updatedAt: '2026-02-01' },
  { id: 'team-2', name: 'Team Beta', teamLeadId: 'usr-3', teamLeadName: 'Rajesh Verma', bdeCount: 2, activeLeadsCount: 38, convertedLeadsCount: 9, status: 'ACTIVE', createdAt: '2026-01-15', updatedAt: '2026-02-05' },
];

const INITIAL_LEADS: Lead[] = [
  { id: 'lead-101', candidateName: 'Rahul Verma', phone: '+91 98765 43210', email: 'rahul.v@gmail.com', city: 'Mumbai', education: 'B.Tech CS', status: 'NEW', currentTeamId: 'team-1', currentTeamName: 'Team Alpha', currentBdeId: 'usr-4', currentBdeName: 'Prasanth', createdAt: '2026-02-10' },
  { id: 'lead-102', candidateName: 'Deepika Nair', phone: '+91 98220 11223', email: 'deepika.n@outlook.com', city: 'Bangalore', education: 'MBA Marketing', status: 'CONTACTED', currentTeamId: 'team-1', currentTeamName: 'Team Alpha', currentBdeId: 'usr-4', currentBdeName: 'Prasanth', createdAt: '2026-02-11' },
  { id: 'lead-103', candidateName: 'Arjun Das', phone: '+91 99112 33445', email: 'arjun.das@yahoo.com', city: 'Delhi NCR', education: 'BBA', status: 'INTERESTED', currentTeamId: 'team-1', currentTeamName: 'Team Alpha', currentBdeId: 'usr-4', currentBdeName: 'Prasanth', createdAt: '2026-02-12' },
  { id: 'lead-104', candidateName: 'Kavita Joshi', phone: '+91 97665 44332', email: 'kavita.j@gmail.com', city: 'Pune', education: 'B.Com', status: 'FOLLOW_UP_REQUIRED', currentTeamId: 'team-1', currentTeamName: 'Team Alpha', currentBdeId: 'usr-4', currentBdeName: 'Prasanth', nextFollowUpDate: '2026-11-19 14:00', createdAt: '2026-02-12' },
  { id: 'lead-105', candidateName: 'Manish Pandey', phone: '+91 91234 56789', email: 'manish.p@gmail.com', city: 'Hyderabad', education: 'MCA', status: 'CONVERTED', currentTeamId: 'team-1', currentTeamName: 'Team Alpha', currentBdeId: 'usr-4', currentBdeName: 'Prasanth', createdAt: '2026-02-08' },
  { id: 'lead-106', candidateName: 'Simran Kaur', phone: '+91 98450 99887', email: 'simran.k@live.com', city: 'Chandigarh', education: 'B.Tech IT', status: 'NOT_REACHABLE', currentTeamId: 'team-1', currentTeamName: 'Team Alpha', currentBdeId: 'usr-5', currentBdeName: 'Sneha Gupta', createdAt: '2026-02-13' },
  { id: 'lead-107', candidateName: 'Aditya Rao', phone: '+91 95544 33221', email: 'aditya.rao@gmail.com', city: 'Chennai', education: 'B.Sc Data', status: 'NEW', currentTeamId: 'team-1', currentTeamName: 'Team Alpha', currentBdeId: null, currentBdeName: null, createdAt: '2026-02-14' },
  { id: 'lead-108', candidateName: 'Pooja Hegde', phone: '+91 96677 88990', email: 'pooja.h@gmail.com', city: 'Ahmedabad', education: 'B.Tech ECE', status: 'NEW', currentTeamId: 'team-1', currentTeamName: 'Team Alpha', currentBdeId: null, currentBdeName: null, createdAt: '2026-02-14' },
  { id: 'lead-109', candidateName: 'Naveen Kumar', phone: '+91 94433 22110', email: 'naveen.k@gmail.com', city: 'Kolkata', education: 'BCA', status: 'NEW', currentTeamId: null, currentTeamName: null, currentBdeId: null, currentBdeName: null, createdAt: '2026-02-15' },
  { id: 'lead-110', candidateName: 'Shreya Roy', phone: '+91 93322 11009', email: 'shreya.r@gmail.com', city: 'Jaipur', education: 'BA English', status: 'NEW', currentTeamId: null, currentTeamName: null, currentBdeId: null, currentBdeName: null, createdAt: '2026-02-15' },
];

const INITIAL_STATUS_HISTORY: LeadStatusHistory[] = [
  {
    id: 'hist-1',
    leadId: 'lead-105',
    previousStatus: 'INTERESTED',
    newStatus: 'CONVERTED',
    changedById: 'usr-4',
    changedByName: 'Prasanth',
    remarks: 'Candidate agreed to enroll in Full Stack Pro program.',
    timestamp: '2026-02-14 11:30 AM',
  },
];

const INITIAL_FOLLOW_UPS: FollowUpItem[] = [
  {
    id: 'fol-1',
    leadId: 'lead-104',
    candidateName: 'Kavita Joshi',
    candidatePhone: '+91 97665 44332',
    bdeId: 'usr-4',
    scheduledTime: 'Today at 2:00 PM',
    status: 'PENDING',
    remarks: 'Discuss scholarship discount with parents',
    createdAt: '2026-02-12',
  },
];

const INITIAL_ATTENDANCE: AttendanceRecord[] = [
  {
    id: 'att-1',
    userId: 'usr-4',
    userName: 'Prasanth',
    teamId: 'team-1',
    date: new Date().toISOString().split('T')[0],
    punchInTime: new Date().toISOString(),
    punchOutTime: null,
    workingMinutes: 0,
    status: 'LATE',
    isModified: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'att-2',
    userId: 'usr-5',
    userName: 'Sneha Gupta',
    teamId: 'team-1',
    date: '2026-11-18',
    punchInTime: '2026-11-18T09:50:00.000Z',
    punchOutTime: '2026-11-18T14:30:00.000Z',
    workingMinutes: 280,
    status: 'LATE',
    isModified: false,
    createdAt: '2026-11-18T09:50:00.000Z',
    updatedAt: '2026-11-18T14:30:00.000Z',
  },
];

const INITIAL_TRANSACTIONS: FinancialTransaction[] = [
  {
    id: 'tx-1',
    leadId: 'lead-105',
    candidateName: 'Manish Pandey',
    bdeId: 'usr-4',
    bdeName: 'Prasanth',
    teamId: 'team-1',
    teamName: 'Team Alpha',
    grossAmount: 50000,
    investmentCost: 15000,
    netProfit: 35000,
    companySharePercentage: 30,
    companyShareAmount: 15000,
    remainingSharePercentage: 70,
    remainingShareAmount: 35000,
    status: 'CONFIRMED',
    confirmedById: 'usr-1',
    confirmedByName: 'Vikram Sharma',
    confirmedAt: '2026-02-14 04:00 PM',
    notes: 'Initial enrollment fee received via Razorpay UPI.',
    createdAt: '2026-02-14',
  },
];

const INITIAL_CALCULATION_LOGS: FinancialCalculationLog[] = [
  {
    id: 'calc-1',
    calcType: 'REVENUE_SHARE_30_70',
    inputValues: { totalRevenue: 50000, companySharePct: 30 },
    resultValues: { companyShare: 15000, remainingShare: 35000 },
    calculatedById: 'usr-1',
    calculatedByName: 'Vikram Sharma',
    notes: 'Sample enrollment split',
    createdAt: '2026-02-14 04:02 PM',
  },
];

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function timestamp(): string {
  return new Date().toLocaleString();
}

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function distribute(total: number, weights: number[]): number[] {
  if (!weights.length || total <= 0) return weights.map(() => 0);
  const weightSum = weights.reduce((sum, weight) => sum + Math.max(0, weight), 0);
  if (weightSum <= 0) return weights.map(() => 0);
  const exact = weights.map((weight) => (total * Math.max(0, weight)) / weightSum);
  const quotas = exact.map((value) => Math.floor(value));
  let remainder = total - quotas.reduce((sum, value) => sum + value, 0);
  const order = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction);
  let cursor = 0;
  while (remainder > 0 && order.length) {
    quotas[order[cursor % order.length].index]++;
    remainder--;
    cursor++;
  }
  return quotas;
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = usePersistentState<ThemeMode>('theme', 'royal-violet');
  const [authToken, setAuthToken] = usePersistentState<string>('authToken', '');
  const [currentRole, setCurrentRoleState] = usePersistentState<UserRole>('currentRole', 'ADMIN');
  const [currentUserId, setCurrentUserId] = usePersistentState<string>('currentUserId', INITIAL_USERS[0].id);
  const [users, setUsers] = usePersistentState<User[]>('users', INITIAL_USERS);
  const [teams, setTeams] = usePersistentState<Team[]>('teams', INITIAL_TEAMS);
  const [leads, setLeads] = usePersistentState<Lead[]>('leads', INITIAL_LEADS);
  const [leadStatusHistory, setLeadStatusHistory] = usePersistentState<LeadStatusHistory[]>('leadStatusHistory', INITIAL_STATUS_HISTORY);
  const [leadAssignmentHistory, setLeadAssignmentHistory] = usePersistentState<LeadAssignmentHistory[]>('leadAssignmentHistory', []);
  const [auditEvents, setAuditEvents] = usePersistentState<AuditEvent[]>('auditEvents', []);
  const [attendanceCorrections, setAttendanceCorrections] = usePersistentState<AttendanceCorrection[]>('attendanceCorrections', []);
  const [systemSettings, setSystemSettings] = usePersistentState<SystemSettings>('systemSettings', DEFAULT_SYSTEM_SETTINGS);
  const [followUps, setFollowUps] = usePersistentState<FollowUpItem[]>('followUps', INITIAL_FOLLOW_UPS);
  const [attendanceRecords, setAttendanceRecords] = usePersistentState<AttendanceRecord[]>('attendanceRecords', INITIAL_ATTENDANCE);
  const [transactions, setTransactions] = usePersistentState<FinancialTransaction[]>('transactions', INITIAL_TRANSACTIONS);
  const [calculationLogs, setCalculationLogs] = usePersistentState<FinancialCalculationLog[]>('calculationLogs', INITIAL_CALCULATION_LOGS);
  const [replenishmentAlerts, setReplenishmentAlerts] = usePersistentState<
    Array<{ bdeId: string; bdeName: string; teamId: string; timestamp: string }>
  >('replenishmentAlerts', []);
  const [reports, setReports] = usePersistentState<ReportSubmission[]>('reports', []);
  const [leaveRequests, setLeaveRequests] = usePersistentState<LeaveRequest[]>('leaveRequests', []);
  const [poolEscalations, setPoolEscalations] = usePersistentState<PoolEscalation[]>('poolEscalations', []);
  const [notification, setNotification] = useState<AppNotification | null>(null);

  const notify = useCallback((type: AppNotificationType, message: string) => {
    setNotification({ type, message });
  }, []);

  const dismissNotification = useCallback(() => setNotification(null), []);

  const notifySyncError = useCallback(
    (label: string, error?: unknown) => {
      console.warn(label, error);
      notify('warning', `${label} Failed to sync with server; changes are saved locally.`);
    },
    [notify]
  );

  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 8000);
    return () => clearTimeout(timer);
  }, [notification]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
  }, [currentTheme]);

  useEffect(() => {
    const syncBackendData = async () => {
      try {
        const [leadsRes, teamsRes, usersRes, attRes, finRes, folRes, settsRes] = await Promise.allSettled([
          leadsService.getLeads(),
          teamsService.getTeams(),
          usersService.getUsers(),
          attendanceService.getRecords(),
          financeService.getTransactions(),
          followupsService.getFollowUps(),
          settingsService.getSettings(),
        ]);

        if (usersRes.status === 'fulfilled' && usersRes.value?.users?.length) {
          setUsers(usersRes.value.users as any);
        }
        if (teamsRes.status === 'fulfilled' && teamsRes.value?.teams?.length) {
          setTeams(teamsRes.value.teams as any);
        }
        if (leadsRes.status === 'fulfilled' && leadsRes.value?.leads?.length) {
          setLeads(leadsRes.value.leads as any);
        }
        if (attRes.status === 'fulfilled' && attRes.value?.records?.length) {
          setAttendanceRecords(attRes.value.records as any);
        }
        if (finRes.status === 'fulfilled' && finRes.value?.transactions?.length) {
          setTransactions(finRes.value.transactions as any);
        }
        if (folRes.status === 'fulfilled' && folRes.value?.followUps?.length) {
          setFollowUps(folRes.value.followUps as any);
        }
        if (settsRes.status === 'fulfilled' && settsRes.value) {
          setSystemSettings((prev) => ({
            ...prev,
            companySharePercentage: settsRes.value.companySharePercentage ?? prev.companySharePercentage,
            remainingSharePercentage: settsRes.value.remainingSharePercentage ?? prev.remainingSharePercentage,
            profitSharePercentage: settsRes.value.profitSharePercentage ?? prev.profitSharePercentage,
            dailyTargetLeads: settsRes.value.dailyTargetLeads ?? prev.dailyTargetLeads,
            weeklyTargetLeads: settsRes.value.weeklyTargetLeads ?? prev.weeklyTargetLeads,
            monthlyTargetLeads: settsRes.value.monthlyTargetLeads ?? prev.monthlyTargetLeads,
            maxLeadsPerBde: settsRes.value.maxLeadsPerBde ?? prev.maxLeadsPerBde,
            lateGracePeriodMinutes: settsRes.value.gracePeriodMinutes ?? prev.lateGracePeriodMinutes,
          }));
        }
      } catch (err) {
        notifySyncError('Initial backend sync', err);
      }
    };

    syncBackendData();
  }, [
    notifySyncError,
    setAttendanceRecords,
    setFollowUps,
    setLeads,
    setSystemSettings,
    setTeams,
    setTransactions,
    setUsers,
  ]);

  const currentUser: User =
    users.find((user) => user.id === currentUserId && user.role === currentRole) ||
    users.find((user) => user.role === currentRole) ||
    users[0];
  const isAdmin = currentRole === 'ADMIN';
  const isTeamLead = currentRole === 'TEAM_LEAD';
  const isBde = currentRole === 'BDE';
  const isAuthenticated = Boolean(authToken);
  const todayAttendance = attendanceRecords.find(
    (record) => record.userId === currentUser?.id && record.date === today()
  );
  const punchState: PunchState = todayAttendance?.punchOutTime
    ? 'PUNCHED_OUT'
    : todayAttendance?.punchInTime
      ? 'PUNCHED_IN'
      : 'NOT_PUNCHED';
  const punchInTime = formatClock(todayAttendance?.punchInTime);

  const logAudit = useCallback(
    (
      action: AuditAction,
      entityType: AuditEntityType,
      entityId: string,
      summary: string,
      details?: Record<string, string | number | boolean | null | undefined>
    ) => {
      const event: AuditEvent = {
        id: uid('audit'),
        action,
        entityType,
        entityId,
        summary,
        details,
        actorId: currentUser?.id || 'unknown',
        actorName: currentUser?.name || 'Unknown user',
        actorRole: currentRole,
        timestamp: timestamp(),
      };
      setAuditEvents((prev) => [event, ...prev].slice(0, MAX_AUDIT_EVENTS));
    },
    [currentUser?.id, currentUser?.name, currentRole, setAuditEvents]
  );

  const login = useCallback(
    async (email: string, role?: UserRole): Promise<ActionResult> => {
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail) return { ok: false, message: 'Enter your email address.' };

      try {
        const result = await apiRequest<{ user: User; token: string }>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email: normalizedEmail, role }),
        });
        if (!result?.token || !result?.user) throw new Error('Sign-in response was incomplete.');

        localStorage.setItem('enabler_token', result.token);
        setAuthToken(result.token);
        setCurrentUserId(result.user.id);
        setCurrentRoleState(result.user.role);
        logAudit('LOGIN', 'SESSION', result.user.id, `${result.user.name} signed in`, {
          role: result.user.role,
          mode: 'server',
        });
        return { ok: true, message: `Welcome back, ${result.user.name}.` };
      } catch (error) {
        const localUser = users.find(
          (user) =>
            user.email.toLowerCase() === normalizedEmail && (!role || user.role === role)
        );
        if (!localUser) {
          return {
            ok: false,
            message: error instanceof Error ? error.message : 'Sign-in failed. Please try again.',
          };
        }
        if (localUser.status !== 'ACTIVE') {
          return { ok: false, message: 'This account is inactive. Contact your administrator.' };
        }

        setAuthToken('local-demo');
        setCurrentUserId(localUser.id);
        setCurrentRoleState(localUser.role);
        notify('warning', 'Server sign-in unavailable; signed in with the local demo directory.');
        logAudit('LOGIN', 'SESSION', localUser.id, `${localUser.name} signed in locally`, {
          role: localUser.role,
          mode: 'local',
        });
        return { ok: true, message: `Signed in locally as ${localUser.name}.` };
      }
    },
    [logAudit, notify, setAuthToken, setCurrentRoleState, setCurrentUserId, users]
  );

  const logout = useCallback(() => {
    localStorage.removeItem('enabler_token');
    setAuthToken('');
    logAudit('LOGOUT', 'SESSION', currentUser.id, `${currentUser.name} signed out`, {
      role: currentRole,
    });
  }, [currentRole, currentUser.id, currentUser.name, logAudit, setAuthToken]);

  useEffect(() => {
    const stale = attendanceRecords.filter(
      (record) =>
        record.date < today() &&
        !record.punchOutTime &&
        record.status !== 'MISSING_PUNCH_OUT' &&
        !record.isModified
    );
    if (!stale.length) return;
    const staleIds = stale.map((record) => record.id);
    setAttendanceRecords((prev) =>
      prev.map((record) =>
        staleIds.includes(record.id)
          ? { ...record, status: 'MISSING_PUNCH_OUT', updatedAt: new Date().toISOString() }
          : record
      )
    );
    stale.forEach((record) =>
      logAudit(
        'ATTENDANCE_CORRECTION',
        'ATTENDANCE',
        record.id,
        `${record.userName} auto-flagged for missing punch-out on ${record.date}`,
        { status: 'MISSING_PUNCH_OUT' }
      )
    );
  }, [attendanceRecords, logAudit, setAttendanceRecords]);

  const setCurrentRole = (role: UserRole) => {
    if (role === currentRole) return;
    const targetUser =
      users.find((user) => user.role === role && user.status === 'ACTIVE') ||
      users.find((user) => user.role === role);
    setCurrentRoleState(role);
    if (targetUser) setCurrentUserId(targetUser.id);
    logAudit('ROLE_SWITCH', 'SESSION', role, `Role switched to ${role} as ${targetUser?.name || 'unknown user'}`, {
      from: currentRole,
      to: role,
    });
  };

  const getAllowedStatuses = (currentStatus: LeadStatus): LeadStatus[] => {
    const configured = systemSettings.statusTransitions[currentStatus] || [];
    return configured.filter((status) => systemSettings.statuses.includes(status)) as LeadStatus[];
  };

  const unassignedAdminLeadsCount = leads.filter((lead) => !lead.currentTeamId).length;
  const bdePendingLeads = leads.filter(
    (lead) => lead.currentBdeId === currentUser?.id && OPEN_LEAD_STATUSES.includes(lead.status)
  );
  const isBdeExhausted = isBde && bdePendingLeads.length === 0;

  const ingestLeads = (newCandidates: Array<Partial<Lead>>) => {
    if (!isAdmin) return { added: 0, duplicates: newCandidates.length };
    let added = 0;
    let duplicates = 0;
    const cleanLeads: Lead[] = [];
    const knownPhones = new Set(
      leads.map((lead) => lead.phone?.replace(/\D/g, '')).filter(Boolean) as string[]
    );
    const knownEmails = new Set(
      leads.map((lead) => lead.email?.trim().toLowerCase()).filter(Boolean) as string[]
    );
    const candidateIds = new Set(leads.map((lead) => lead.candidateId).filter(Boolean) as string[]);

    newCandidates.forEach((candidate) => {
      const normalizedPhone = candidate.phone?.replace(/\D/g, '');
      const normalizedEmail = candidate.email?.trim().toLowerCase();
      const normalizedCandidateId = candidate.candidateId?.trim();
      const isDuplicate =
        (!!normalizedPhone && knownPhones.has(normalizedPhone)) ||
        (!!normalizedEmail && knownEmails.has(normalizedEmail)) ||
        (!!normalizedCandidateId && candidateIds.has(normalizedCandidateId));

      if (isDuplicate) {
        duplicates++;
      } else {
        added++;
        if (normalizedPhone) knownPhones.add(normalizedPhone);
        if (normalizedEmail) knownEmails.add(normalizedEmail);
        if (normalizedCandidateId) candidateIds.add(normalizedCandidateId);
        cleanLeads.push({
          id: uid('lead'),
          candidateId: normalizedCandidateId,
          candidateName: candidate.candidateName?.trim() || 'Candidate',
          phone: candidate.phone?.trim() || '+91 99999 00000',
          email: normalizedEmail || '',
          city: candidate.city?.trim() || 'India',
          education: candidate.education?.trim() || 'Graduate',
          status: 'NEW',
          currentTeamId: null,
          currentTeamName: null,
          currentBdeId: null,
          currentBdeName: null,
          createdAt: today(),
          updatedAt: today(),
        });
      }
    });

    setLeads((prev) => [...prev, ...cleanLeads]);
    leadsService.ingestLeads(cleanLeads as any, { id: currentUser.id, name: currentUser.name, role: currentRole }).catch((e) => notifySyncError('Backend ingest sync:', e));
    logAudit('LEAD_INGEST', 'LEAD', 'pool', `Ingested ${added} leads; ${duplicates} duplicates skipped`, {
      added,
      duplicates,
    });
    return { added, duplicates };
  };

  const allocateStage1AdminToTeams = (
    teamIds: string[],
    countPerTeam: number,
    method: 'EQUAL' | 'WORKLOAD_BASED'
  ): number => {
    if (!isAdmin || !teamIds.length || countPerTeam <= 0) return 0;
    const pool = leads.filter((lead) => !lead.currentTeamId);
    if (!pool.length) return 0;

    const weights = teamIds.map((teamId) =>
      method === 'WORKLOAD_BASED'
        ? Math.max(1, users.filter((user) => user.teamId === teamId && user.role === 'BDE' && user.status === 'ACTIVE').length)
        : 1
    );
    const quotas = distribute(Math.min(pool.length, countPerTeam * teamIds.length), weights);
    const updates = new Map<string, Lead>();
    const assignments: LeadAssignmentHistory[] = [];
    let cursor = 0;

    teamIds.forEach((teamId, index) => {
      const team = teams.find((item) => item.id === teamId);
      for (let i = 0; i < quotas[index]; i++) {
        const lead = pool[cursor++];
        if (!lead) break;
        const updatedLead: Lead = {
          ...lead,
          currentTeamId: teamId,
          currentTeamName: team?.name || 'Assigned Team',
          updatedAt: today(),
        };
        updates.set(lead.id, updatedLead);
        assignments.push({
          id: uid('assign'),
          leadId: lead.id,
          assignedById: currentUser.id,
          assignedByName: currentUser.name,
          assignedToTeamId: teamId,
          assignedToTeamName: team?.name || 'Assigned Team',
          assignedToBdeId: null,
          assignedToBdeName: null,
          assignedAt: timestamp(),
          reason: `Stage 1 ${method} allocation`,
        });
      }
    });

    setLeads((prev) => prev.map((lead) => updates.get(lead.id) || lead));
    setLeadAssignmentHistory((prev) => [...assignments, ...prev]);
    leadsService.allocateStage1({ teamIds, countPerTeam, method, actor: { id: currentUser.id, name: currentUser.name, role: currentRole } }).catch((e) => notifySyncError('Backend stage1 sync:', e));
    logAudit('LEAD_ALLOCATE', 'LEAD', teamIds.join(','), `Allocated ${cursor} leads to ${teamIds.length} teams using ${method}`, {
      allocated: cursor,
      method,
      teams: teamIds.length,
    });
    return cursor;
  };

  const allocateStage2TeamToBdes = (
    teamId: string,
    bdeIds: string[],
    countPerBde: number,
    method?: 'EQUAL' | 'WORKLOAD_BASED' | 'MANUAL',
    manualQuotas?: Record<string, number>
  ): number => {
    if (!isAdmin && !(isTeamLead && currentUser?.teamId === teamId)) return 0;
    const effectiveMethod = method || (systemSettings.allocationMethod === 'MANUAL' ? 'EQUAL' : systemSettings.allocationMethod);
    const eligibleBdeIds = bdeIds.filter((bdeId) => {
      const bde = users.find((user) => user.id === bdeId);
      return bde && bde.role === 'BDE' && bde.status === 'ACTIVE' && bde.teamId === teamId;
    });
    if (!eligibleBdeIds.length || countPerBde <= 0) return 0;

    const openLeads = (bdeId: string) =>
      leads.filter(
        (lead) => lead.currentBdeId === bdeId && !['CONVERTED', 'LOST'].includes(lead.status)
      ).length;
    const capacities = eligibleBdeIds.map((bdeId) => Math.max(0, systemSettings.maxLeadsPerBde - openLeads(bdeId)));
    const pool = leads.filter(
      (lead) => lead.currentTeamId === teamId && !lead.currentBdeId && !['CONVERTED', 'LOST'].includes(lead.status)
    );
    let quotas: number[];
    if (effectiveMethod === 'MANUAL' && manualQuotas) {
      quotas = eligibleBdeIds.map((bdeId, index) =>
        Math.min(Math.max(0, manualQuotas[bdeId] ?? countPerBde), capacities[index])
      );
      let remaining = Math.min(pool.length, quotas.reduce((sum, value) => sum + value, 0));
      for (let index = 0; index < quotas.length && remaining > 0; index++) {
        const take = Math.min(quotas[index], remaining);
        quotas[index] = take;
        remaining -= take;
      }
    } else {
      const weights = effectiveMethod === 'WORKLOAD_BASED' ? capacities : eligibleBdeIds.map(() => 1);
      quotas = distribute(
        Math.min(pool.length, countPerBde * eligibleBdeIds.length, capacities.reduce((sum, value) => sum + value, 0)),
        weights
      ).map((quota, index) => Math.min(quota, capacities[index]));
    }

    const updates = new Map<string, Lead>();
    const assignments: LeadAssignmentHistory[] = [];
    let cursor = 0;
    let allocated = 0;

    eligibleBdeIds.forEach((bdeId, index) => {
      const bde = users.find((user) => user.id === bdeId);
      for (let i = 0; i < quotas[index]; i++) {
        const lead = pool[cursor++];
        if (!lead) break;
        const updatedLead: Lead = {
          ...lead,
          currentBdeId: bdeId,
          currentBdeName: bde?.name || 'Assigned BDE',
          updatedAt: today(),
        };
        updates.set(lead.id, updatedLead);
        assignments.push({
          id: uid('assign'),
          leadId: lead.id,
          assignedById: currentUser.id,
          assignedByName: currentUser.name,
          assignedToTeamId: teamId,
          assignedToTeamName: lead.currentTeamName,
          assignedToBdeId: bdeId,
          assignedToBdeName: bde?.name || 'Assigned BDE',
          assignedAt: timestamp(),
          reason: `Stage 2 ${effectiveMethod} allocation`,
        });
        allocated++;
      }
    });

    if (!updates.size) return 0;
    setLeads((prev) => prev.map((lead) => updates.get(lead.id) || lead));
    setLeadAssignmentHistory((prev) => [...assignments, ...prev]);
    setReplenishmentAlerts((prev) => prev.filter((alert) => !eligibleBdeIds.includes(alert.bdeId)));
    leadsService.allocateStage2({ teamId, bdeIds: eligibleBdeIds, countPerBde, method: effectiveMethod, manualQuotas, actor: { id: currentUser.id, name: currentUser.name, role: currentRole } }).catch((e) => notifySyncError('Backend stage2 sync:', e));
    logAudit('LEAD_ALLOCATE', 'LEAD', teamId, `Distributed ${allocated} leads to ${eligibleBdeIds.length} BDEs using ${effectiveMethod}`, {
      allocated,
      method: effectiveMethod,
      teamId,
    });
    return allocated;
  };

  const updateLeadStatus = (
    leadId: string,
    newStatus: LeadStatus,
    remarks: string,
    scheduleFollowUp?: { time: string; note: string }
  ): boolean => {
    const lead = leads.find((item) => item.id === leadId);
    if (!lead || lead.currentBdeId !== currentUser?.id || !isBde) return false;
    if (!remarks.trim()) return false;
    if (newStatus === 'FOLLOW_UP_REQUIRED' && (!scheduleFollowUp || !isFutureDateTime(scheduleFollowUp.time))) {
      return false;
    }
    const allowed = getAllowedStatuses(lead.status);
    if (!allowed.includes(newStatus)) {
      logAudit('LEAD_STATUS_TRANSITION_REJECTED', 'LEAD', leadId, `Rejected ${lead.status} → ${newStatus} for ${lead.candidateName}`, {
        previousStatus: lead.status,
        attemptedStatus: newStatus,
      });
      return false;
    }

    const historyEntry: LeadStatusHistory = {
      id: uid('hist'),
      leadId,
      previousStatus: lead.status,
      newStatus,
      changedById: currentUser.id,
      changedByName: currentUser.name,
      remarks,
      timestamp: timestamp(),
    };

    setLeadStatusHistory((prev) => [historyEntry, ...prev]);
    setLeads((prev) =>
      prev.map((item) =>
        item.id === leadId
          ? {
              ...item,
              status: newStatus,
              lastContactedAt: new Date().toISOString(),
              nextFollowUpDate: scheduleFollowUp ? new Date(scheduleFollowUp.time).toISOString() : item.nextFollowUpDate,
              updatedAt: today(),
            }
          : item
      )
    );

    if (scheduleFollowUp) {
      setFollowUps((prev) => [
        {
          id: uid('fol'),
          leadId,
          candidateName: lead.candidateName,
          candidatePhone: lead.phone,
          bdeId: currentUser.id,
          scheduledTime: new Date(scheduleFollowUp.time).toISOString(),
          status: 'PENDING',
          remarks: scheduleFollowUp.note,
          createdAt: today(),
        },
        ...prev,
      ]);
    }

    logAudit('LEAD_STATUS_CHANGE', 'LEAD', leadId, `${lead.candidateName}: ${lead.status} → ${newStatus}`, {
      leadId,
      previousStatus: lead.status,
      newStatus,
      remarks,
    });

    if (newStatus === 'CONVERTED') {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }
    leadsService.updateLeadStatus(leadId, {
      status: newStatus,
      remarks,
      nextFollowUpDate: scheduleFollowUp ? new Date(scheduleFollowUp.time).toISOString() : undefined,
      actor: { id: currentUser.id, name: currentUser.name, role: currentRole },
    }).catch((e) => notifySyncError('Backend lead status sync:', e));
    return true;
  };

  const reassignBdeLeads = (fromBdeId: string, toBdeId: string, reason: string): boolean => {
    if (!isAdmin && !isTeamLead) return false;
    const sourceBde = users.find((user) => user.id === fromBdeId);
    const targetBde = users.find((user) => user.id === toBdeId);
    if (!sourceBde || !targetBde || targetBde.status !== 'ACTIVE' || targetBde.role !== 'BDE') return false;
    if (isTeamLead && (sourceBde.teamId !== currentUser?.teamId || targetBde.teamId !== currentUser?.teamId)) {
      return false;
    }
    const affected = leads.filter(
      (lead) => lead.currentBdeId === fromBdeId && !['CONVERTED', 'LOST'].includes(lead.status)
    );
    if (!affected.length) return false;

    const updates = new Map<string, Lead>();
    const assignments: LeadAssignmentHistory[] = [];
    affected.forEach((lead) => {
      const updatedLead: Lead = {
        ...lead,
        currentBdeId: toBdeId,
        currentBdeName: targetBde.name,
        currentTeamId: targetBde.teamId || lead.currentTeamId,
        currentTeamName: targetBde.teamName || lead.currentTeamName,
        updatedAt: today(),
      };
      updates.set(lead.id, updatedLead);
      assignments.push({
        id: uid('assign'),
        leadId: lead.id,
        assignedById: currentUser.id,
        assignedByName: currentUser.name,
        assignedToTeamId: targetBde.teamId || lead.currentTeamId,
        assignedToTeamName: targetBde.teamName || lead.currentTeamName,
        assignedToBdeId: toBdeId,
        assignedToBdeName: targetBde.name,
        assignedAt: timestamp(),
        reason: `Reassignment: ${reason}`,
      });
    });

    setLeads((prev) => prev.map((lead) => updates.get(lead.id) || lead));
    setLeadAssignmentHistory((prev) => [...assignments, ...prev]);
    setReplenishmentAlerts((prev) => prev.filter((alert) => alert.bdeId !== fromBdeId));
    leadsService.reassignLeads({ fromBdeId, toBdeId, reason, actor: { id: currentUser.id, name: currentUser.name, role: currentRole } }).catch((e) => notifySyncError('Backend reassign sync:', e));
    logAudit('LEAD_REASSIGN', 'LEAD', fromBdeId, `Reassigned ${affected.length} leads to ${targetBde.name}`, {
      fromBdeId,
      toBdeId,
      count: affected.length,
      reason,
    });
    return true;
  };

  const completeFollowUp = (followUpId: string): boolean => {
    const followUp = followUps.find((item) => item.id === followUpId);
    if (!followUp || followUp.bdeId !== currentUser?.id || !isBde) return false;
    setFollowUps((prev) => prev.map((item) => (item.id === followUpId ? { ...item, status: 'COMPLETED' } : item)));
    const lead = leads.find((item) => item.id === followUp.leadId);
    if (lead && lead.currentBdeId === currentUser.id && lead.status === 'FOLLOW_UP_REQUIRED') {
      setLeadStatusHistory((prev) => [
        {
          id: uid('hist'),
          leadId: lead.id,
          previousStatus: lead.status,
          newStatus: 'CONTACTED',
          changedById: currentUser.id,
          changedByName: currentUser.name,
          remarks: `Follow-up completed: ${followUp.remarks || 'callback executed'}`,
          timestamp: timestamp(),
        },
        ...prev,
      ]);
      setLeads((prev) =>
        prev.map((item) => (item.id === lead.id ? { ...item, status: 'CONTACTED', updatedAt: today() } : item))
      );
    }
    logAudit('FOLLOW_UP_COMPLETE', 'FOLLOW_UP', followUpId, `Completed follow-up for ${followUp.candidateName}`, {
      leadId: followUp.leadId,
    });
    followupsService.updateFollowUp(followUpId, { status: 'COMPLETED', actor: { id: currentUser.id, name: currentUser.name, role: currentRole } }).catch((e) => notifySyncError('Backend followup sync:', e));
    return true;
  };

  const punchIn = (): ActionResult => {
    if (!isBde) return { ok: false, message: 'Only BDE users can punch in.' };
    const now = new Date().toISOString();
    const timeStr = formatClock(now) || '';
    const startMinutes = parseClockToMinutes(systemSettings.workdayStartTime);
    const currentMinutes = parseClockToMinutes(now);
    const status: AttendanceRecord['status'] =
      startMinutes !== null && currentMinutes !== null && currentMinutes > startMinutes + systemSettings.lateGracePeriodMinutes
        ? 'LATE'
        : 'PRESENT';
    const existing = attendanceRecords.find(
      (record) => record.userId === currentUser.id && record.date === today() && !record.punchOutTime
    );
    if (existing) return { ok: false, message: 'You have already punched in today.' };
    setAttendanceRecords((prev) => [
      {
        id: uid('att'),
        userId: currentUser.id,
        userName: currentUser.name,
        teamId: currentUser.teamId || '',
        date: today(),
        punchInTime: now,
        punchOutTime: null,
        workingMinutes: 0,
        status,
        isModified: false,
        createdAt: now,
        updatedAt: now,
      },
      ...prev,
    ]);
    attendanceService.punchIn(currentUser.id, currentUser.name, currentUser.teamId || '').catch((e) => notifySyncError('Backend punchIn sync:', e));
    logAudit('ATTENDANCE_PUNCH_IN', 'ATTENDANCE', currentUser.id, `${currentUser.name} punched in at ${timeStr}`, {
      status,
      time: timeStr,
    });
    return {
      ok: true,
      message: `Punched in at ${timeStr}${status === 'LATE' ? ' (late)' : ''}.`,
    };
  };

  const punchOut = (): boolean => {
    if (!isBde) return false;
    const now = new Date().toISOString();
    const timeStr = formatClock(now) || '';
    const openRecord = attendanceRecords.find(
      (record) => record.userId === currentUser.id && record.date === today() && !record.punchOutTime
    );
    if (!openRecord) return false;
    const inMinutes = parseClockToMinutes(openRecord.punchInTime);
    const outMinutes = parseClockToMinutes(now);
    if (inMinutes === null || outMinutes === null || outMinutes < inMinutes) return false;
    const workedMinutes = outMinutes - inMinutes;
    const status: AttendanceRecord['status'] =
      workedMinutes < systemSettings.halfDayThresholdHours * 60 ? 'HALF_DAY' : openRecord.status === 'LATE' ? 'LATE' : 'PRESENT';
    const endMinutes = parseClockToMinutes(systemSettings.workdayEndTime);
    const earlyDeparture =
      endMinutes !== null && outMinutes < endMinutes - systemSettings.earlyExitGracePeriodMinutes;

    setAttendanceRecords((prev) =>
      prev.map((record) =>
        record.id === openRecord.id
          ? {
              ...record,
              punchOutTime: now,
              workingMinutes: workedMinutes,
              status,
              earlyDeparture,
              updatedAt: now,
            }
          : record
      )
    );
    attendanceService.punchOut(currentUser.id).catch((e) => notifySyncError('Backend punchOut sync:', e));
    logAudit('ATTENDANCE_PUNCH_OUT', 'ATTENDANCE', openRecord.id, `${currentUser.name} punched out at ${timeStr}`, {
      workedMinutes,
      status,
      earlyDeparture,
      time: timeStr,
    });
    return true;
  };

  const adjustAttendance = (
    recordId: string,
    newStatus: AttendanceRecord['status'],
    reason: string,
    newPunchOutTime?: string
  ): boolean => {
    if (!isAdmin && !(isTeamLead && attendanceRecords.find((record) => record.id === recordId)?.teamId === currentUser?.teamId)) {
      return false;
    }
    const record = attendanceRecords.find((item) => item.id === recordId);
    if (!record || !reason.trim()) return false;
    const revisedPunchOut = newPunchOutTime ? new Date(newPunchOutTime).toISOString() : record.punchOutTime || null;
    const inMinutes = parseClockToMinutes(record.punchInTime);
    const outMinutes = parseClockToMinutes(revisedPunchOut);
    const revisedWorkingMinutes =
      inMinutes !== null && outMinutes !== null && outMinutes >= inMinutes ? outMinutes - inMinutes : record.workingMinutes;
    const correction: AttendanceCorrection = {
      id: uid('corr'),
      recordId,
      previousStatus: record.status,
      newStatus,
      previousPunchOutTime: record.punchOutTime || null,
      newPunchOutTime: revisedPunchOut,
      reason,
      correctedById: currentUser.id,
      correctedByName: currentUser.name,
      timestamp: timestamp(),
    };
    setAttendanceCorrections((prev) => [correction, ...prev]);
    setAttendanceRecords((prev) =>
      prev.map((item) =>
        item.id === recordId
          ? {
              ...item,
              status: newStatus,
              punchOutTime: revisedPunchOut,
              workingMinutes: revisedWorkingMinutes,
              isModified: true,
              modificationReason: reason,
              modifiedById: currentUser.id,
              updatedAt: new Date().toISOString(),
            }
          : item
      )
    );
    logAudit('ATTENDANCE_CORRECTION', 'ATTENDANCE', recordId, `${record.userName}: ${record.status} → ${newStatus}`, {
      reason,
      recordId,
      previousStatus: record.status,
      newStatus,
      previousPunchOutTime: record.punchOutTime,
      newPunchOutTime: revisedPunchOut,
    });
    attendanceService.modifyAttendance(recordId, { status: newStatus, punchOutTime: revisedPunchOut || undefined, reason, actor: { id: currentUser.id, name: currentUser.name, role: currentRole } }).catch((e) => notifySyncError('Backend attendance modify sync:', e));
    return true;
  };

  const confirmPaymentTransaction = (
    leadId: string,
    grossAmount: number,
    investmentCost: number,
    notes?: string
  ): boolean => {
    if (!isAdmin || grossAmount <= 0 || investmentCost < 0) return false;
    const lead = leads.find((item) => item.id === leadId);
    if (!lead || lead.status !== 'CONVERTED') return false;
    if (transactions.some((item) => item.leadId === leadId)) return false;

    const netProfit = grossAmount - investmentCost;
    const companyShareAmount = (grossAmount * systemSettings.companySharePercentage) / 100;
    const remainingShareAmount = grossAmount - companyShareAmount;
    const profitSharePct = systemSettings.profitSharePercentage;
    const companyProfitShareAmount = netProfit > 0 ? (netProfit * profitSharePct) / 100 : 0;
    const remainingProfitShareAmount = netProfit > 0 ? netProfit - companyProfitShareAmount : 0;
    const newTx: FinancialTransaction = {
      id: uid('tx'),
      leadId,
      candidateName: lead.candidateName,
      bdeId: lead.currentBdeId || 'unknown',
      bdeName: lead.currentBdeName || 'BDE',
      teamId: lead.currentTeamId || 'team-1',
      teamName: lead.currentTeamName || 'Team Alpha',
      grossAmount,
      investmentCost,
      netProfit,
      companySharePercentage: systemSettings.companySharePercentage,
      companyShareAmount,
      remainingSharePercentage: 100 - systemSettings.companySharePercentage,
      remainingShareAmount,
      profitSharePercentage: profitSharePct,
      companyProfitShareAmount,
      remainingProfitShareAmount,
      status: 'CONFIRMED',
      confirmedById: currentUser.id,
      confirmedByName: currentUser.name,
      confirmedAt: timestamp(),
      notes,
      createdAt: today(),
    };

    setTransactions((prev) => [newTx, ...prev]);
    logAudit('FINANCIAL_TRANSACTION', 'TRANSACTION', newTx.id, `Confirmed ₹${grossAmount.toLocaleString()} revenue for ${lead.candidateName}`, {
      leadId,
      grossAmount,
      investmentCost,
      netProfit,
    });
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
    financeService.createTransaction({
      leadId,
      candidateName: lead.candidateName,
      bdeId: lead.currentBdeId || 'usr-4',
      bdeName: lead.currentBdeName || 'BDE',
      teamId: lead.currentTeamId || 'team-1',
      teamName: lead.currentTeamName || 'Team Alpha',
      grossAmount,
      investmentCost,
      notes,
      actor: { id: currentUser.id, name: currentUser.name, role: currentRole },
    }).catch((e) => notifySyncError('Backend finance tx sync:', e));
    return true;
  };

  const updateTransactionStatus = (
    transactionId: string,
    status: FinancialTransaction['status'],
    notes?: string
  ) => {
    if (!isAdmin) return;
    const transaction = transactions.find((item) => item.id === transactionId);
    if (!transaction) return;
    setTransactions((prev) =>
      prev.map((item) =>
        item.id === transactionId
          ? {
              ...item,
              status,
              notes: notes ? `${item.notes || ''} ${notes}`.trim() : item.notes,
              confirmedAt: status === 'CONFIRMED' ? timestamp() : item.confirmedAt,
              confirmedById: status === 'CONFIRMED' ? currentUser.id : item.confirmedById,
              confirmedByName: status === 'CONFIRMED' ? currentUser.name : item.confirmedByName,
            }
          : item
      )
    );
    logAudit('FINANCIAL_TRANSACTION', 'TRANSACTION', transactionId, `Transaction ${transaction.id} marked ${status}`, {
      status,
      notes,
    });
  };

  const logFinancialCalculation = (
    calcType: FinancialCalculationLog['calcType'],
    inputValues: Record<string, number | string>,
    resultValues: Record<string, number | string>,
    notes?: string
  ) => {
    if (!isAdmin) return;
    const newLog: FinancialCalculationLog = {
      id: uid('calc'),
      calcType,
      inputValues,
      resultValues,
      calculatedById: currentUser.id,
      calculatedByName: currentUser.name,
      notes,
      createdAt: timestamp(),
    };
    setCalculationLogs((prev) => [newLog, ...prev]);
    logAudit('FINANCIAL_CALCULATION', 'CALCULATION', newLog.id, `Saved ${calcType.replaceAll('_', ' ').toLowerCase()} calculation`, {
      calcType,
      notes,
    });
  };

  const setCompanySharePct = (pct: number) => {
    if (!isAdmin || !Number.isFinite(pct)) return;
    const safePct = Math.min(100, Math.max(0, pct));
    setSystemSettings((prev) => ({ ...prev, companySharePercentage: safePct, remainingSharePercentage: 100 - safePct }));
    logAudit('SETTINGS_UPDATE', 'SETTINGS', 'system', `Company share ratio set to ${safePct}%`, {
      companySharePercentage: safePct,
    });
  };

  const updateSystemSettings = (patch: Partial<SystemSettings>) => {
    if (!isAdmin) return;
    const safePatch: Partial<SystemSettings> = { ...patch };
    if (safePatch.companySharePercentage !== undefined) {
      const pct = Math.min(100, Math.max(0, safePatch.companySharePercentage));
      safePatch.companySharePercentage = pct;
      safePatch.remainingSharePercentage = 100 - pct;
    }
    if (safePatch.remainingSharePercentage !== undefined && safePatch.companySharePercentage === undefined) {
      const pct = Math.min(100, Math.max(0, safePatch.remainingSharePercentage));
      safePatch.remainingSharePercentage = pct;
      safePatch.companySharePercentage = 100 - pct;
    }
    if (safePatch.profitSharePercentage !== undefined) {
      safePatch.profitSharePercentage = Math.min(100, Math.max(0, safePatch.profitSharePercentage));
    }
    const numericKeys: Array<keyof SystemSettings> = [
      'conversionTargetPercentage',
      'dailyTargetLeads',
      'weeklyTargetLeads',
      'monthlyTargetLeads',
      'maxLeadsPerBde',
      'lateGracePeriodMinutes',
      'earlyExitGracePeriodMinutes',
      'halfDayThresholdHours',
      'fullDayThresholdHours',
      'followUpReminderMinutes',
    ];
    numericKeys.forEach((key) => {
      const value = safePatch[key];
      if (typeof value === 'number' && value < 0) (safePatch as unknown as Record<string, number>)[key] = 0;
    });

    setSystemSettings((prev) => {
      const next = { ...prev, ...safePatch };
      const start = parseClockToMinutes(next.workdayStartTime);
      const end = parseClockToMinutes(next.workdayEndTime);
      if (start !== null && end !== null && end <= start) {
        next.workdayEndTime = prev.workdayEndTime > prev.workdayStartTime ? prev.workdayEndTime : '18:30';
      }
      if (safePatch.statuses) {
        next.statuses = Array.from(new Set(safePatch.statuses)).filter((status) =>
          DEFAULT_SYSTEM_SETTINGS.statuses.includes(status as LeadStatus)
        );
      }
      if (safePatch.statusTransitions) {
        const allowed = DEFAULT_SYSTEM_SETTINGS.statuses;
        next.statusTransitions = Object.fromEntries(
          Object.entries(safePatch.statusTransitions)
            .filter(([from]) => allowed.includes(from as LeadStatus))
            .map(([from, to]) => [
              from,
              from === 'CONVERTED' || from === 'LOST'
                ? []
                : to.filter((status) => allowed.includes(status as LeadStatus)),
            ])
        );
      }
      return next;
    });
    logAudit('SETTINGS_UPDATE', 'SETTINGS', 'system', 'Updated system configuration', {
      keys: Object.keys(safePatch).join(', '),
    });
    settingsService.updateSettings({
      companySharePercentage: safePatch.companySharePercentage,
      remainingSharePercentage: safePatch.remainingSharePercentage,
      profitSharePercentage: safePatch.profitSharePercentage,
      dailyTargetLeads: safePatch.dailyTargetLeads,
      weeklyTargetLeads: safePatch.weeklyTargetLeads,
      monthlyTargetLeads: safePatch.monthlyTargetLeads,
      maxLeadsPerBde: safePatch.maxLeadsPerBde,
      gracePeriodMinutes: safePatch.lateGracePeriodMinutes,
      shiftStartTime: safePatch.workdayStartTime,
    }, { id: currentUser.id, name: currentUser.name, role: currentRole }).catch((e) => notifySyncError('Backend settings sync:', e));
  };

  const toggleUserStatus = (userId: string): boolean => {
    if (!isAdmin) return false;
    const user = users.find((item) => item.id === userId);
    if (!user) return false;
    if (user.status === 'ACTIVE' && user.role === 'ADMIN') {
      const activeAdmins = users.filter((item) => item.role === 'ADMIN' && item.status === 'ACTIVE');
      if (activeAdmins.length <= 1) return false;
    }
    const nextStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setUsers((prev) => prev.map((item) => (item.id === userId ? { ...item, status: nextStatus } : item)));
    const openLeads = leads.filter((lead) => lead.currentBdeId === userId && OPEN_LEAD_STATUSES.includes(lead.status)).length;
    logAudit('USER_STATUS_CHANGE', 'USER', userId, `${user.name} set to ${nextStatus}`, {
      previousStatus: user.status,
      newStatus: nextStatus,
      openLeads,
    });
    usersService.toggleStatus(userId, { id: currentUser.id, name: currentUser.name, role: currentRole }).catch((e) => notifySyncError('Backend user toggle sync:', e));
    return true;
  };

  const createUser = (name: string, email: string, role: UserRole, teamId?: string, phone?: string): boolean => {
    if (!isAdmin || !name.trim() || !email.trim()) return false;
    const normalizedEmail = email.trim().toLowerCase();
    if (users.some((user) => user.email.trim().toLowerCase() === normalizedEmail)) return false;
    const team = teams.find((item) => item.id === teamId);
    const user: User = {
      id: uid('usr'),
      name: name.trim(),
      email: normalizedEmail,
      phone: phone?.trim(),
      role,
      status: 'ACTIVE',
      teamId: team?.id,
      teamName: team?.name,
      createdAt: today(),
    };
    setUsers((prev) => [...prev, user]);
    if (role === 'TEAM_LEAD' && team) {
      setTeams((prev) => prev.map((item) => (item.id === team.id ? { ...item, teamLeadId: user.id, teamLeadName: user.name } : item)));
    }
    logAudit('USER_CREATE', 'USER', user.id, `Created ${role} ${user.name}`, { email: normalizedEmail, teamId: team?.id });
    usersService.createUser({ name: name.trim(), email: normalizedEmail, role, teamId: team?.id, phone: phone?.trim(), actor: { id: currentUser.id, name: currentUser.name, role: currentRole } }).catch((e) => notifySyncError('Backend user create sync:', e));
    return true;
  };

  const createTeam = (name: string, teamLeadId: string): boolean => {
    if (!isAdmin || !name.trim()) return false;
    const teamLead = users.find((user) => user.id === teamLeadId && user.role === 'TEAM_LEAD');
    if (!teamLead || teams.some((team) => team.teamLeadId === teamLeadId)) return false;
    const newTeam: Team = {
      id: uid('team'),
      name: name.trim(),
      teamLeadId,
      teamLeadName: teamLead.name,
      bdeCount: 0,
      activeLeadsCount: 0,
      convertedLeadsCount: 0,
      status: 'ACTIVE',
      createdAt: today(),
      updatedAt: today(),
    };
    setTeams((prev) => [...prev, newTeam]);
    setUsers((prev) =>
      prev.map((user) => (user.id === teamLeadId ? { ...user, teamId: newTeam.id, teamName: newTeam.name } : user))
    );
    logAudit('TEAM_CREATE', 'TEAM', newTeam.id, `Created team ${newTeam.name}`, { teamLeadId });
    teamsService.createTeam({ name: name.trim(), teamLeadId, actor: { id: currentUser.id, name: currentUser.name, role: currentRole } }).catch((e) => notifySyncError('Backend team create sync:', e));
    return true;
  };

  const reassignUserTeam = (userId: string, teamId: string, teamName: string): boolean => {
    if (!isAdmin) return false;
    const user = users.find((item) => item.id === userId);
    if (!user) return false;
    if (user.role === 'TEAM_LEAD') {
      const previousTeam = teams.find((team) => team.teamLeadId === userId);
      if (previousTeam && previousTeam.id !== teamId) {
        setTeams((prev) =>
          prev.map((team) => (team.id === previousTeam.id ? { ...team, teamLeadId: null, teamLeadName: 'Unassigned' } : team))
        );
      }
      setTeams((prev) =>
        prev.map((team) => (team.id === teamId ? { ...team, teamLeadId: userId, teamLeadName: user.name } : team))
      );
    }
    setUsers((prev) => prev.map((item) => (item.id === userId ? { ...item, teamId, teamName } : item)));
    logAudit('USER_REASSIGN', 'USER', userId, `${user.name} moved to ${teamName}`, {
      fromTeam: user.teamName || 'Unassigned',
      toTeam: teamName,
    });
    return true;
  };

  const submitReport = (message: string): boolean => {
    if (!message.trim()) return false;
    const report: ReportSubmission = {
      id: uid('report'),
      userId: currentUser.id,
      userName: currentUser.name,
      teamId: currentUser.teamId || undefined,
      message: message.trim(),
      createdAt: new Date().toISOString(),
    };
    setReports((prev) => [report, ...prev]);
    logAudit('REPORT_SUBMIT', 'USER', currentUser.id, `${currentUser.name} submitted a daily report`);
    return true;
  };

  const submitLeaveRequest = (reason: string, fromDate: string, toDate: string): boolean => {
    if (!reason.trim() || !fromDate || !toDate || toDate < fromDate) return false;
    const request: LeaveRequest = {
      id: uid('leave'),
      userId: currentUser.id,
      userName: currentUser.name,
      teamId: currentUser.teamId || undefined,
      reason: reason.trim(),
      fromDate,
      toDate,
      createdAt: new Date().toISOString(),
    };
    setLeaveRequests((prev) => [request, ...prev]);
    logAudit('LEAVE_REQUEST', 'USER', currentUser.id, `${currentUser.name} requested leave from ${fromDate} to ${toDate}`);
    return true;
  };

  const escalatePoolEmpty = (teamId: string) => {
    if (!isTeamLead || currentUser?.teamId !== teamId) return;
    const team = teams.find((item) => item.id === teamId);
    if (poolEscalations.some((item) => item.teamId === teamId)) return;
    setPoolEscalations((prev) => [
      { teamId, teamName: team?.name || teamId, timestamp: new Date().toISOString() },
      ...prev,
    ]);
    logAudit('POOL_ESCALATION', 'TEAM', teamId, `${team?.name || teamId} pool empty; admin injection requested`);
  };

  const clearPoolEscalation = (teamId: string) => {
    setPoolEscalations((prev) => prev.filter((item) => item.teamId !== teamId));
  };

  const requestLeadReplenishment = (): ActionResult => {
    if (!isBde) return { ok: false, message: 'Only BDE users can request replenishment.' };
    const existing = replenishmentAlerts.find((alert) => alert.bdeId === currentUser.id);
    if (existing) return { ok: false, message: 'A replenishment request is already pending.' };
    setReplenishmentAlerts((prev) => [
      {
        bdeId: currentUser.id,
        bdeName: currentUser.name,
        teamId: currentUser.teamId || 'team-1',
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);
    leadsService.requestReplenishment({
      bdeId: currentUser.id,
      bdeName: currentUser.name,
      teamId: currentUser.teamId || 'team-1',
      teamName: currentUser.teamName || 'Team Alpha',
      reason: 'Working queue exhausted',
    }).catch((e) => notifySyncError('Backend replenish sync:', e));
    return { ok: true, message: 'Replenishment request sent to your Team Lead.' };
  };

  const clearReplenishmentAlert = (bdeId: string) => {
    setReplenishmentAlerts((prev) => prev.filter((alert) => alert.bdeId !== bdeId));
  };

  return (
    <AppContext.Provider
      value={{
        currentTheme,
        setCurrentTheme,
        notification,
        notify,
        dismissNotification,
        isAuthenticated,
        login,
        logout,
        currentUser,
        currentRole,
        setCurrentRole,
        teams,
        users,
        toggleUserStatus,
        createUser,
        createTeam,
        reassignUserTeam,
        leads,
        leadStatusHistory,
        leadAssignmentHistory,
        auditEvents,
        attendanceCorrections,
        systemSettings,
        updateSystemSettings,
        getAllowedStatuses,
        unassignedAdminLeadsCount,
        ingestLeads,
        allocateStage1AdminToTeams,
        allocateStage2TeamToBdes,
        updateLeadStatus,
        reassignBdeLeads,
        followUps,
        completeFollowUp,
        attendanceRecords,
        punchState,
        punchInTime,
        punchIn,
        punchOut,
        adjustAttendance,
        transactions,
        calculationLogs,
        companySharePct: systemSettings.companySharePercentage,
        setCompanySharePct,
        confirmPaymentTransaction,
        updateTransactionStatus,
        logFinancialCalculation,
        isBdeExhausted,
        requestLeadReplenishment,
        replenishmentAlerts,
        clearReplenishmentAlert,
        reports,
        leaveRequests,
        submitReport,
        submitLeaveRequest,
        poolEscalations,
        escalatePoolEmpty,
        clearPoolEscalation,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export { useApp } from './useApp';
