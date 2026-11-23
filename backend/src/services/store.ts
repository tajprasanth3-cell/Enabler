import { User, Team, Lead, LeadStatusHistory, AttendanceRecord, FinancialTransaction, SystemSettings } from '../types';

export class DataStore {
  private static instance: DataStore;

  public users: User[] = [
    { id: 'usr-1', name: 'Vikram Sharma', email: 'admin@leadflow.io', role: 'ADMIN', status: 'ACTIVE', createdAt: '2026-01-01' },
    { id: 'usr-2', name: 'Priya Patel', email: 'priya.tl@leadflow.io', role: 'TEAM_LEAD', status: 'ACTIVE', teamId: 'team-1', teamName: 'Team Alpha', createdAt: '2026-01-10' },
    { id: 'usr-3', name: 'Rajesh Verma', email: 'rajesh.tl@leadflow.io', role: 'TEAM_LEAD', status: 'ACTIVE', teamId: 'team-2', teamName: 'Team Beta', createdAt: '2026-01-15' },
    { id: 'usr-4', name: 'Prasanth', email: 'prasanth.bde@leadflow.io', role: 'BDE', status: 'ACTIVE', teamId: 'team-1', teamName: 'Team Alpha', createdAt: '2026-02-01' },
    { id: 'usr-5', name: 'Sneha Gupta', email: 'sneha.bde@leadflow.io', role: 'BDE', status: 'ACTIVE', teamId: 'team-1', teamName: 'Team Alpha', createdAt: '2026-02-01' },
    { id: 'usr-6', name: 'Rohan Mehta', email: 'rohan.bde@leadflow.io', role: 'BDE', status: 'ACTIVE', teamId: 'team-2', teamName: 'Team Beta', createdAt: '2026-02-05' },
    { id: 'usr-7', name: 'Ananya Sen', email: 'ananya.bde@leadflow.io', role: 'BDE', status: 'ACTIVE', teamId: 'team-2', teamName: 'Team Beta', createdAt: '2026-02-10' },
  ];

  public teams: Team[] = [
    { id: 'team-1', name: 'Team Alpha', teamLeadId: 'usr-2', teamLeadName: 'Priya Patel', bdeCount: 2, activeLeadsCount: 45, convertedLeadsCount: 12, status: 'ACTIVE', createdAt: '2026-01-10', updatedAt: '2026-02-01' },
    { id: 'team-2', name: 'Team Beta', teamLeadId: 'usr-3', teamLeadName: 'Rajesh Verma', bdeCount: 2, activeLeadsCount: 38, convertedLeadsCount: 9, status: 'ACTIVE', createdAt: '2026-01-15', updatedAt: '2026-02-05' },
  ];

  public leads: Lead[] = [
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

  public leadStatusHistory: LeadStatusHistory[] = [
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

  public attendanceRecords: AttendanceRecord[] = [
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
  ];

  public transactions: FinancialTransaction[] = [
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
      companySharePct: 30,
      remainingSharePct: 70,
      companyShareAmount: 15000,
      remainingShareAmount: 35000,
      netProfit: 35000,
      status: 'CONFIRMED',
      confirmedById: 'usr-1',
      confirmedByName: 'Vikram Sharma',
      confirmedAt: '2026-02-14 04:00 PM',
      createdAt: '2026-02-14 03:30 PM',
    },
  ];

  public settings: SystemSettings = {
    companySharePercentage: 30,
    remainingSharePercentage: 70,
    profitSharePercentage: 30,
    conversionTargetPercentage: 25,
    dailyTargetLeads: 10,
    weeklyTargetLeads: 50,
    monthlyTargetLeads: 200,
    maxLeadsPerBde: 75,
  };

  private constructor() {}

  public static getInstance(): DataStore {
    if (!DataStore.instance) {
      DataStore.instance = new DataStore();
    }
    return DataStore.instance;
  }
}

export const db = DataStore.getInstance();
