import { Request, Response } from 'express';
import { db } from '../services/store';
import { successResponse } from '../utils/response';

export const getKpis = (req: Request, res: Response) => {
  const { teamId } = req.query;

  let leads = [...db.leads];
  let transactions = [...db.transactions];
  let users = [...db.users];

  if (teamId) {
    leads = leads.filter((l) => l.currentTeamId === teamId);
    transactions = transactions.filter((t) => t.teamId === teamId);
    users = users.filter((u) => u.teamId === teamId);
  }

  const totalLeads = leads.length;
  const converted = leads.filter((l) => l.status === 'CONVERTED').length;
  const contacted = leads.filter((l) => ['CONTACTED', 'INTERESTED', 'FOLLOW_UP_REQUIRED', 'CONVERTED'].includes(l.status)).length;
  const interested = leads.filter((l) => l.status === 'INTERESTED').length;
  const followUpRequired = leads.filter((l) => l.status === 'FOLLOW_UP_REQUIRED').length;
  const lost = leads.filter((l) => ['NOT_INTERESTED', 'NOT_REACHABLE', 'LOST'].includes(l.status)).length;

  const conversionRate = totalLeads > 0 ? Number(((converted / totalLeads) * 100).toFixed(2)) : 0;
  const contactRate = totalLeads > 0 ? Number(((contacted / totalLeads) * 100).toFixed(2)) : 0;

  // Financial calculations
  const totalRevenue = transactions
    .filter((t) => t.status === 'CONFIRMED')
    .reduce((acc, t) => acc + t.grossAmount, 0);

  const companyRevenue = transactions
    .filter((t) => t.status === 'CONFIRMED')
    .reduce((acc, t) => acc + t.companyShareAmount, 0);

  const remainingRevenue = transactions
    .filter((t) => t.status === 'CONFIRMED')
    .reduce((acc, t) => acc + t.remainingShareAmount, 0);

  const totalProfit = transactions
    .filter((t) => t.status === 'CONFIRMED')
    .reduce((acc, t) => acc + t.netProfit, 0);

  // Attendance metrics for today
  const today = new Date().toISOString().split('T')[0];
  const todayAttendance = db.attendanceRecords.filter((a) => a.date === today);
  const presentCount = todayAttendance.filter((a) => a.status === 'PRESENT').length;
  const lateCount = todayAttendance.filter((a) => a.status === 'LATE').length;
  const absentCount = todayAttendance.filter((a) => a.status === 'ABSENT').length;

  return successResponse(res, {
    leads: {
      total: totalLeads,
      contacted,
      interested,
      followUpRequired,
      converted,
      lost,
      conversionRate,
      contactRate,
    },
    financials: {
      totalRevenue,
      companyRevenue,
      remainingRevenue,
      totalProfit,
      companySharePercentage: db.settings.companySharePercentage,
      remainingSharePercentage: db.settings.remainingSharePercentage,
      transactionCount: transactions.length,
      confirmedCount: transactions.filter((t) => t.status === 'CONFIRMED').length,
    },
    attendance: {
      today,
      present: presentCount,
      late: lateCount,
      absent: absentCount,
      totalMarked: todayAttendance.length,
    },
    bdes: {
      total: users.filter((u) => u.role === 'BDE' && u.status === 'ACTIVE').length,
    },
  });
};

export const getFunnel = (req: Request, res: Response) => {
  const { teamId } = req.query;

  let leads = [...db.leads];
  if (teamId) {
    leads = leads.filter((l) => l.currentTeamId === teamId);
  }

  const total = leads.length;
  const stages = [
    {
      stage: 'Total Ingested',
      key: 'TOTAL',
      count: total,
      percentage: 100,
    },
    {
      stage: 'Contacted',
      key: 'CONTACTED',
      count: leads.filter((l) => ['CONTACTED', 'INTERESTED', 'FOLLOW_UP_REQUIRED', 'CONVERTED'].includes(l.status)).length,
      percentage: total > 0 ? Number(((leads.filter((l) => ['CONTACTED', 'INTERESTED', 'FOLLOW_UP_REQUIRED', 'CONVERTED'].includes(l.status)).length / total) * 100).toFixed(1)) : 0,
    },
    {
      stage: 'Interested & Pipeline',
      key: 'INTERESTED',
      count: leads.filter((l) => ['INTERESTED', 'FOLLOW_UP_REQUIRED', 'CONVERTED'].includes(l.status)).length,
      percentage: total > 0 ? Number(((leads.filter((l) => ['INTERESTED', 'FOLLOW_UP_REQUIRED', 'CONVERTED'].includes(l.status)).length / total) * 100).toFixed(1)) : 0,
    },
    {
      stage: 'Follow Up Active',
      key: 'FOLLOW_UP',
      count: leads.filter((l) => l.status === 'FOLLOW_UP_REQUIRED').length,
      percentage: total > 0 ? Number(((leads.filter((l) => l.status === 'FOLLOW_UP_REQUIRED').length / total) * 100).toFixed(1)) : 0,
    },
    {
      stage: 'Converted Deals',
      key: 'CONVERTED',
      count: leads.filter((l) => l.status === 'CONVERTED').length,
      percentage: total > 0 ? Number(((leads.filter((l) => l.status === 'CONVERTED').length / total) * 100).toFixed(1)) : 0,
    },
  ];

  return successResponse(res, {
    totalLeads: total,
    stages,
  });
};

export const getLeaderboard = (req: Request, res: Response) => {
  const bdes = db.users.filter((u) => u.role === 'BDE');

  const leaderboard = bdes.map((bde) => {
    const assignedLeads = db.leads.filter((l) => l.currentBdeId === bde.id);
    const convertedLeads = assignedLeads.filter((l) => l.status === 'CONVERTED');
    const bdeTxs = db.transactions.filter((t) => t.bdeId === bde.id && t.status === 'CONFIRMED');
    const totalRevenue = bdeTxs.reduce((sum, t) => sum + t.grossAmount, 0);
    const followUpsDone = db.followUps.filter((f) => f.bdeId === bde.id && f.status === 'COMPLETED').length;

    const conversionRate = assignedLeads.length > 0
      ? Number(((convertedLeads.length / assignedLeads.length) * 100).toFixed(1))
      : 0;

    return {
      bdeId: bde.id,
      name: bde.name,
      email: bde.email,
      teamId: bde.teamId,
      teamName: bde.teamName,
      totalLeads: assignedLeads.length,
      convertedLeads: convertedLeads.length,
      conversionRate,
      totalRevenue,
      followUpsDone,
    };
  });

  // Sort descending by converted leads, then total revenue
  leaderboard.sort((a, b) => b.convertedLeads - a.convertedLeads || b.totalRevenue - a.totalRevenue);

  return successResponse(res, {
    leaderboard,
  });
};

export const getTeamPerformance = (req: Request, res: Response) => {
  const performance = db.teams.map((team) => {
    const teamLeads = db.leads.filter((l) => l.currentTeamId === team.id);
    const converted = teamLeads.filter((l) => l.status === 'CONVERTED').length;
    const teamTxs = db.transactions.filter((t) => t.teamId === team.id && t.status === 'CONFIRMED');
    const revenue = teamTxs.reduce((sum, t) => sum + t.grossAmount, 0);
    const bdes = db.users.filter((u) => u.teamId === team.id && u.role === 'BDE');

    const conversionRate = teamLeads.length > 0
      ? Number(((converted / teamLeads.length) * 100).toFixed(1))
      : 0;

    return {
      teamId: team.id,
      teamName: team.name,
      teamLeadName: team.teamLeadName,
      bdeCount: bdes.length,
      activeLeads: teamLeads.length,
      convertedLeads: converted,
      conversionRate,
      totalRevenue: revenue,
    };
  });

  return successResponse(res, {
    teams: performance,
  });
};
