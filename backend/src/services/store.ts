import fs from 'fs';
import path from 'path';
import {
  User,
  Team,
  Lead,
  LeadStatusHistory,
  FollowUpItem,
  ReplenishmentAlert,
  AttendanceRecord,
  FinancialTransaction,
  FinancialCalculationLog,
  SystemSettings,
  AuditLogEntry,
} from '../types';
import { logger } from '../utils/logger';

export class DataStore {
  private static instance: DataStore;
  private readonly dbFilePath: string;

  public users: User[] = [];
  public teams: Team[] = [];
  public leads: Lead[] = [];
  public leadStatusHistory: LeadStatusHistory[] = [];
  public followUps: FollowUpItem[] = [];
  public replenishmentAlerts: ReplenishmentAlert[] = [];
  public attendanceRecords: AttendanceRecord[] = [];
  public transactions: FinancialTransaction[] = [];
  public financialCalculationLogs: FinancialCalculationLog[] = [];
  public settings: SystemSettings = {
    companySharePercentage: 30,
    remainingSharePercentage: 70,
    profitSharePercentage: 30,
    conversionTargetPercentage: 25,
    dailyTargetLeads: 10,
    weeklyTargetLeads: 50,
    monthlyTargetLeads: 200,
    maxLeadsPerBde: 75,
    shiftStartTime: '09:30',
    gracePeriodMinutes: 15,
    allocationMethod: 'WORKLOAD_BASED',
    workdayEndTime: '18:30',
    earlyExitGracePeriodMinutes: 15,
    halfDayThresholdHours: 4.5,
    fullDayThresholdHours: 8,
    followUpReminderMinutes: 30,
    statuses: ['NEW', 'CONTACTED', 'INTERESTED', 'NOT_INTERESTED', 'FOLLOW_UP_REQUIRED', 'CONVERTED', 'NOT_REACHABLE', 'LOST'],
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
  public auditLogs: AuditLogEntry[] = [];

  private constructor() {
    const dataDir = path.resolve(__dirname, '../../data');
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch (err) {
        logger.error('Failed to create data directory:', err);
      }
    }
    this.dbFilePath = path.join(dataDir, 'db.json');
    this.initialize();
  }

  public static getInstance(): DataStore {
    if (!DataStore.instance) {
      DataStore.instance = new DataStore();
    }
    return DataStore.instance;
  }

  private initialize(): void {
    if (fs.existsSync(this.dbFilePath)) {
      try {
        const raw = fs.readFileSync(this.dbFilePath, 'utf-8');
        const data = JSON.parse(raw);
        this.users = data.users || [];
        this.teams = data.teams || [];
        this.leads = data.leads || [];
        this.leadStatusHistory = data.leadStatusHistory || [];
        this.followUps = data.followUps || [];
        this.replenishmentAlerts = data.replenishmentAlerts || [];
        this.attendanceRecords = data.attendanceRecords || [];
        this.transactions = (data.transactions || []).map((tx: any) => ({
          ...tx,
          companySharePercentage: tx.companySharePercentage ?? tx.companySharePct ?? 30,
          companySharePct: tx.companySharePct ?? tx.companySharePercentage ?? 30,
          remainingSharePercentage: tx.remainingSharePercentage ?? tx.remainingSharePct ?? 70,
          remainingSharePct: tx.remainingSharePct ?? tx.remainingSharePercentage ?? 70,
          companyProfitShareAmount: tx.companyProfitShareAmount ?? (tx.netProfit ? Math.round((tx.netProfit * 30) / 100) : undefined),
          remainingProfitShareAmount: tx.remainingProfitShareAmount ?? (tx.netProfit ? tx.netProfit - Math.round((tx.netProfit * 30) / 100) : undefined),
        }));
        this.financialCalculationLogs = data.financialCalculationLogs || [];
        this.settings = { ...this.settings, ...(data.settings || {}) };
        this.auditLogs = data.auditLogs || [];
        logger.info(`Loaded persistent database from ${this.dbFilePath}`);
        return;
      } catch (e) {
        logger.warn('Failed to parse existing db.json. Falling back to default seed data.', e);
      }
    }

    this.seedDefaultData();
    this.save();
  }

  public save(): void {
    try {
      const payload = {
        users: this.users,
        teams: this.teams,
        leads: this.leads,
        leadStatusHistory: this.leadStatusHistory,
        followUps: this.followUps,
        replenishmentAlerts: this.replenishmentAlerts,
        attendanceRecords: this.attendanceRecords,
        transactions: this.transactions,
        financialCalculationLogs: this.financialCalculationLogs,
        settings: this.settings,
        auditLogs: this.auditLogs,
      };
      const tmpPath = `${this.dbFilePath}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify(payload, null, 2), 'utf-8');
      fs.renameSync(tmpPath, this.dbFilePath);
    } catch (err) {
      logger.error('Failed to persist database to disk:', err);
    }
  }

  private seedDefaultData(): void {
    this.users = [
      { id: 'usr-1', name: 'Vikram Sharma', email: 'admin@leadflow.io', role: 'ADMIN', status: 'ACTIVE', phone: '+91 98111 00001', createdAt: '2026-01-01' },
      { id: 'usr-2', name: 'Priya Patel', email: 'priya.tl@leadflow.io', role: 'TEAM_LEAD', status: 'ACTIVE', teamId: 'team-1', teamName: 'Team Alpha & Beta', phone: '+91 98222 00002', createdAt: '2026-01-10' },
      { id: 'usr-4', name: 'Prasanth', email: 'prasanth.bde@leadflow.io', role: 'BDE', status: 'ACTIVE', teamId: 'team-1', teamName: 'Team Alpha', phone: '+91 98444 00004', createdAt: '2026-02-01' },
      { id: 'usr-5', name: 'Sneha Gupta', email: 'sneha.bde@leadflow.io', role: 'BDE', status: 'ACTIVE', teamId: 'team-1', teamName: 'Team Alpha', phone: '+91 98555 00005', createdAt: '2026-02-01' },
      { id: 'usr-6', name: 'Rohan Mehta', email: 'rohan.bde@leadflow.io', role: 'BDE', status: 'ACTIVE', teamId: 'team-2', teamName: 'Team Beta', phone: '+91 98666 00006', createdAt: '2026-02-05' },
      { id: 'usr-7', name: 'Ananya Sen', email: 'ananya.bde@leadflow.io', role: 'BDE', status: 'ACTIVE', teamId: 'team-2', teamName: 'Team Beta', phone: '+91 98777 00007', createdAt: '2026-02-10' },
    ];

    this.teams = [
      { id: 'team-1', name: 'Team Alpha', teamLeadId: 'usr-2', teamLeadName: 'Priya Patel', bdeCount: 0, activeLeadsCount: 0, convertedLeadsCount: 0, status: 'ACTIVE', createdAt: '2026-01-10', updatedAt: '2026-02-01' },
      { id: 'team-2', name: 'Team Beta', teamLeadId: 'usr-2', teamLeadName: 'Priya Patel', bdeCount: 0, activeLeadsCount: 0, convertedLeadsCount: 0, status: 'ACTIVE', createdAt: '2026-01-15', updatedAt: '2026-02-05' },
    ];

    this.leads = [
      { id: 'lead-101', candidateName: 'Rahul Verma', phone: '+91 98765 43210', email: 'rahul.v@gmail.com', city: 'Mumbai', education: 'B.Tech CS', status: 'NEW', currentTeamId: 'team-1', currentTeamName: 'Team Alpha', currentBdeId: 'usr-4', currentBdeName: 'Prasanth', createdAt: '2026-02-10' },
      { id: 'lead-102', candidateName: 'Deepika Nair', phone: '+91 98220 11223', email: 'deepika.n@outlook.com', city: 'Bangalore', education: 'MBA Marketing', status: 'CONTACTED', currentTeamId: 'team-1', currentTeamName: 'Team Alpha', currentBdeId: 'usr-4', currentBdeName: 'Prasanth', createdAt: '2026-02-11' },
      { id: 'lead-103', candidateName: 'Arjun Das', phone: '+91 99112 33445', email: 'arjun.das@yahoo.com', city: 'Delhi NCR', education: 'BBA', status: 'INTERESTED', currentTeamId: 'team-1', currentTeamName: 'Team Alpha', currentBdeId: 'usr-4', currentBdeName: 'Prasanth', createdAt: '2026-02-12' },
      { id: 'lead-104', candidateName: 'Kavita Joshi', phone: '+91 97665 44332', email: 'kavita.j@gmail.com', city: 'Pune', education: 'B.Com', status: 'FOLLOW_UP_REQUIRED', currentTeamId: 'team-1', currentTeamName: 'Team Alpha', currentBdeId: 'usr-4', currentBdeName: 'Prasanth', nextFollowUpDate: '2026-11-25 14:00', createdAt: '2026-02-12' },
      { id: 'lead-105', candidateName: 'Manish Pandey', phone: '+91 91234 56789', email: 'manish.p@gmail.com', city: 'Hyderabad', education: 'MCA', status: 'CONVERTED', currentTeamId: 'team-1', currentTeamName: 'Team Alpha', currentBdeId: 'usr-4', currentBdeName: 'Prasanth', dealValue: 50000, createdAt: '2026-02-08' },
      { id: 'lead-106', candidateName: 'Simran Kaur', phone: '+91 98450 99887', email: 'simran.k@live.com', city: 'Chandigarh', education: 'B.Tech IT', status: 'NOT_REACHABLE', currentTeamId: 'team-1', currentTeamName: 'Team Alpha', currentBdeId: 'usr-5', currentBdeName: 'Sneha Gupta', createdAt: '2026-02-13' },
      { id: 'lead-107', candidateName: 'Aditya Rao', phone: '+91 95544 33221', email: 'aditya.rao@gmail.com', city: 'Chennai', education: 'B.Sc Data', status: 'NEW', currentTeamId: 'team-1', currentTeamName: 'Team Alpha', currentBdeId: null, currentBdeName: null, createdAt: '2026-02-14' },
      { id: 'lead-108', candidateName: 'Pooja Hegde', phone: '+91 96677 88990', email: 'pooja.h@gmail.com', city: 'Ahmedabad', education: 'B.Tech ECE', status: 'NEW', currentTeamId: 'team-1', currentTeamName: 'Team Alpha', currentBdeId: null, currentBdeName: null, createdAt: '2026-02-14' },
      { id: 'lead-109', candidateName: 'Naveen Kumar', phone: '+91 94433 22110', email: 'naveen.k@gmail.com', city: 'Kolkata', education: 'BCA', status: 'NEW', currentTeamId: null, currentTeamName: null, currentBdeId: null, currentBdeName: null, createdAt: '2026-02-15' },
      { id: 'lead-110', candidateName: 'Shreya Roy', phone: '+91 93322 11009', email: 'shreya.r@gmail.com', city: 'Jaipur', education: 'BA English', status: 'NEW', currentTeamId: null, currentTeamName: null, currentBdeId: null, currentBdeName: null, createdAt: '2026-02-15' },
    ];

    this.leadStatusHistory = [
      {
        id: 'hist-1',
        leadId: 'lead-105',
        previousStatus: 'INTERESTED',
        newStatus: 'CONVERTED',
        changedById: 'usr-4',
        changedByName: 'Prasanth',
        remarks: 'Candidate enrolled in Full Stack Enterprise Program',
        timestamp: '2026-02-14 11:30 AM',
      },
    ];

    this.followUps = [
      {
        id: 'fol-1',
        leadId: 'lead-104',
        candidateName: 'Kavita Joshi',
        candidatePhone: '+91 97665 44332',
        bdeId: 'usr-4',
        bdeName: 'Prasanth',
        scheduledTime: '2026-11-25 14:00',
        status: 'PENDING',
        remarks: 'Discuss scholarship fee concession with parents',
        createdAt: '2026-02-12',
      },
    ];

    this.replenishmentAlerts = [];

    this.attendanceRecords = [
      {
        id: 'att-1',
        userId: 'usr-4',
        userName: 'Prasanth',
        teamId: 'team-1',
        date: new Date().toISOString().split('T')[0],
        punchInTime: '09:00 AM',
        punchOutTime: null,
        workingMinutes: 240,
        status: 'PRESENT',
        isModified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'att-2',
        userId: 'usr-5',
        userName: 'Sneha Gupta',
        teamId: 'team-1',
        date: new Date().toISOString().split('T')[0],
        punchInTime: '09:45 AM',
        punchOutTime: null,
        workingMinutes: 195,
        status: 'LATE',
        isModified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    this.transactions = [
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
        companySharePercentage: 30,
        companySharePct: 30,
        remainingSharePercentage: 70,
        remainingSharePct: 70,
        companyShareAmount: 15000,
        remainingShareAmount: 35000,
        profitSharePercentage: 30,
        companyProfitShareAmount: 10500,
        remainingProfitShareAmount: 24500,
        netProfit: 35000,
        status: 'CONFIRMED',
        confirmedById: 'usr-1',
        confirmedByName: 'Vikram Sharma',
        confirmedAt: '2026-02-14 04:00 PM',
        createdAt: '2026-02-14 03:30 PM',
      },
      {
        id: 'tx-2',
        leadId: 'lead-101',
        candidateName: 'Rahul Verma',
        bdeId: 'usr-6',
        bdeName: 'Rohan Mehta',
        teamId: 'team-2',
        teamName: 'Team Beta',
        grossAmount: 75000,
        investmentCost: 20000,
        companySharePercentage: 30,
        companySharePct: 30,
        remainingSharePercentage: 70,
        remainingSharePct: 70,
        companyShareAmount: 22500,
        remainingShareAmount: 52500,
        profitSharePercentage: 30,
        companyProfitShareAmount: 16500,
        remainingProfitShareAmount: 38500,
        netProfit: 55000,
        status: 'CONFIRMED',
        confirmedById: 'usr-1',
        confirmedByName: 'Vikram Sharma',
        confirmedAt: '2026-02-15 02:30 PM',
        createdAt: '2026-02-15 01:15 PM',
      },
    ];

    this.financialCalculationLogs = [
      {
        id: 'fcalc-1',
        calcType: 'REVENUE_SPLIT',
        inputValues: { grossAmount: 50000, companySharePct: 30, remainingSharePct: 70 },
        resultValues: { companyShare: 15000, remainingShare: 35000 },
        calculatedById: 'usr-1',
        calculatedByName: 'Vikram Sharma',
        notes: 'Initial enrollment split confirmation',
        timestamp: '2026-02-14 04:02 PM',
      },
    ];

    this.auditLogs = [
      {
        id: 'audit-seed-1',
        action: 'LEAD_INGESTED',
        category: 'LEAD',
        actorId: 'usr-1',
        actorName: 'Vikram Sharma',
        actorRole: 'ADMIN',
        targetId: 'batch-001',
        targetType: 'BATCH',
        summary: 'Ingested 10 clean candidate leads into Admin Master Pool',
        details: { added: 10, duplicates: 0 },
        ipAddress: '127.0.0.1',
        timestamp: '2026-02-10T09:00:00.000Z',
      },
      {
        id: 'audit-seed-2',
        action: 'LEAD_ALLOCATED_STAGE1',
        category: 'ALLOCATION',
        actorId: 'usr-1',
        actorName: 'Vikram Sharma',
        actorRole: 'ADMIN',
        targetId: 'team-1',
        targetType: 'TEAM',
        summary: 'Allocated 8 leads to Team Alpha Pool',
        details: { teamId: 'team-1', teamName: 'Team Alpha', count: 8 },
        ipAddress: '127.0.0.1',
        timestamp: '2026-02-10T10:30:00.000Z',
      },
      {
        id: 'audit-seed-3',
        action: 'LEAD_STATUS_CHANGED',
        category: 'LEAD',
        actorId: 'usr-4',
        actorName: 'Prasanth',
        actorRole: 'BDE',
        targetId: 'lead-105',
        targetType: 'LEAD',
        summary: 'Updated lead Manish Pandey status to CONVERTED',
        details: { dealValue: 50000, program: 'Full Stack Enterprise' },
        ipAddress: '127.0.0.1',
        timestamp: '2026-02-14T11:30:00.000Z',
      },
      {
        id: 'audit-seed-4',
        action: 'TRANSACTION_CONFIRMED',
        category: 'FINANCE',
        actorId: 'usr-1',
        actorName: 'Vikram Sharma',
        actorRole: 'ADMIN',
        targetId: 'tx-1',
        targetType: 'TRANSACTION',
        summary: 'Confirmed ₹50,000 deal inflow for Manish Pandey (30% Company Share ₹15,000)',
        details: { grossAmount: 50000, companyShareAmount: 15000, remainingShareAmount: 35000 },
        ipAddress: '127.0.0.1',
        timestamp: '2026-02-14T16:00:00.000Z',
      },
    ];
  }
}

export const db = DataStore.getInstance();
