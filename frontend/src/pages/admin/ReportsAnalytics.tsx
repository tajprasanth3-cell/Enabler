import React, { useState } from 'react';
import { useApp } from '../../context/useApp';
import { motion } from 'framer-motion';
import {
  FiBarChart2,
  FiTrendingUp,
  FiAward,
  FiDownload,
  FiFilter,
  FiDollarSign,
  FiPhoneCall,
  FiCheckCircle,
  FiPrinter,
} from 'react-icons/fi';
import { calculateConversionRate, formatCurrency } from '../../utils/calculations';
import { OPEN_LEAD_STATUSES } from '../../utils/constants';
import type { LeadStatus } from '../../types';

type DateRange = 'TODAY' | 'WEEK' | 'MONTH' | 'ALL';

const TERMINAL_SUCCESS_STATUSES: LeadStatus[] = ['CONVERTED'];
const TERMINAL_LOSS_STATUSES: LeadStatus[] = ['LOST', 'NOT_INTERESTED', 'NOT_REACHABLE'];
const CONTACTED_STATUSES: LeadStatus[] = Array.from(
  new Set<LeadStatus>([
    ...OPEN_LEAD_STATUSES.filter((status) => status !== 'NEW'),
    ...TERMINAL_SUCCESS_STATUSES,
    ...TERMINAL_LOSS_STATUSES,
  ])
);
const QUALIFIED_STATUSES: LeadStatus[] = [
  'INTERESTED',
  'FOLLOW_UP_REQUIRED',
  'LOST',
  ...TERMINAL_SUCCESS_STATUSES,
];

const parseReportDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const dateOnly = value.trim().match(/^(\d{4}-\d{2}-\d{2})$/);
  if (dateOnly) {
    const [year, month, day] = dateOnly[1].split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})[ T](\d{1,2}):(\d{2})(?:\s*(AM|PM))?/i);
  if (match) {
    const [year, month, day] = match[1].split('-').map(Number);
    let hours = Number(match[2]);
    const minutes = Number(match[3]);
    const meridiem = match[4]?.toUpperCase();
    if (meridiem === 'PM' && hours < 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
    const date = new Date(year, month - 1, day, hours, minutes);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const fallback = new Date(value);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
};

const getRangeStart = (range: DateRange): Date | null => {
  const now = new Date();
  if (range === 'ALL') return null;
  if (range === 'TODAY') return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (range === 'WEEK') return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
  return new Date(now.getFullYear(), now.getMonth(), 1);
};

export const ReportsAnalytics: React.FC = () => {
  const { leads, users, teams, currentRole, currentUser, transactions } = useApp();
  const [dateRange, setDateRange] = useState<DateRange>('ALL');
  const [teamFilter, setTeamFilter] = useState<string>(
    currentRole === 'TEAM_LEAD' ? currentUser.teamId || 'team-1' : 'ALL'
  );
  const [exportNotice, setExportNotice] = useState(false);

  const rangeStart = getRangeStart(dateRange);
  const inDateRange = (value?: string | null): boolean => {
    if (!rangeStart) return true;
    const date = parseReportDate(value);
    return !!date && date >= rangeStart;
  };

  // Scoped leads based on role, team filter and reporting period
  const relevantLeads = leads.filter((l) => {
    if (!inDateRange(l.createdAt)) return false;
    if (currentRole === 'TEAM_LEAD') {
      return l.currentTeamId === (currentUser.teamId || 'team-1');
    }
    if (teamFilter !== 'ALL') {
      return l.currentTeamId === teamFilter;
    }
    return true;
  });

  // Funnel calculations use allocated leads and nested status sets
  const allocatedLeads = relevantLeads.filter((l) => !!l.currentTeamId);
  const totalLeads = allocatedLeads.length;
  const contactedLeads = allocatedLeads.filter((l) => CONTACTED_STATUSES.includes(l.status)).length;
  const interestedLeads = allocatedLeads.filter((l) => QUALIFIED_STATUSES.includes(l.status)).length;
  const convertedLeads = allocatedLeads.filter((l) => TERMINAL_SUCCESS_STATUSES.includes(l.status)).length;
  const lostLeads = allocatedLeads.filter((l) => TERMINAL_LOSS_STATUSES.includes(l.status)).length;

  const conversionPct = calculateConversionRate(convertedLeads, totalLeads);
  const contactRate = calculateConversionRate(contactedLeads, totalLeads);

  // Financial calculations
  const relevantTransactions = transactions.filter((t) => {
    if (t.status !== 'CONFIRMED') return false;
    if (!inDateRange(t.confirmedAt || t.createdAt)) return false;
    if (currentRole === 'TEAM_LEAD') {
      return t.teamId === (currentUser.teamId || 'team-1');
    }
    if (teamFilter !== 'ALL') {
      return t.teamId === teamFilter;
    }
    return true;
  });

  const totalGrossRevenue = relevantTransactions.reduce((acc, t) => acc + t.grossAmount, 0);
  const totalNetProfit = relevantTransactions.reduce((acc, t) => acc + t.companyShareAmount, 0);
  const totalBdeCommissions = relevantTransactions.reduce((acc, t) => acc + t.remainingShareAmount, 0);

  // BDE Leaderboard
  const bdeUsers = users.filter((u) => {
    if (u.role !== 'BDE' || u.status !== 'ACTIVE') return false;
    if (currentRole === 'TEAM_LEAD') return u.teamId === (currentUser.teamId || 'team-1');
    if (teamFilter !== 'ALL') return u.teamId === teamFilter;
    return true;
  });

  const bdeLeaderboard = bdeUsers.map((bde) => {
    const assigned = relevantLeads.filter((l) => l.currentBdeId === bde.id);
    const converted = assigned.filter((l) => TERMINAL_SUCCESS_STATUSES.includes(l.status));
    const rate = calculateConversionRate(converted.length, assigned.length);
    const bdeTrans = relevantTransactions.filter((t) => t.bdeId === bde.id);
    const revenue = bdeTrans.reduce((acc, t) => acc + t.grossAmount, 0);
    const commission = bdeTrans.reduce((acc, t) => acc + t.remainingShareAmount, 0);

    return {
      id: bde.id,
      name: bde.name,
      teamId: bde.teamId,
      assignedCount: assigned.length,
      convertedCount: converted.length,
      conversionRate: rate,
      revenue,
      commission,
      status: bde.status,
    };
  }).sort((a, b) =>
    currentRole === 'ADMIN'
      ? b.convertedCount - a.convertedCount || b.revenue - a.revenue
      : b.convertedCount - a.convertedCount || b.conversionRate - a.conversionRate
  );

  // Source distribution from actual recorded sources
  const sourceNames = Array.from(
    new Set(allocatedLeads.map((lead) => (lead.source || '').trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));
  const sourceStats = sourceNames.map((name) => {
    const srcLeads = allocatedLeads.filter((l) => (l.source || '').trim() === name);
    const srcConverted = srcLeads.filter((l) => TERMINAL_SUCCESS_STATUSES.includes(l.status)).length;
    return {
      name,
      count: srcLeads.length,
      converted: srcConverted,
      rate: calculateConversionRate(srcConverted, srcLeads.length),
    };
  });

  const handleExportCSV = () => {
    const canViewFinance = currentRole === 'ADMIN';
    const header = canViewFinance
      ? 'BDE Name,Assigned Leads,Conversions,Conversion Rate (%),Confirmed Revenue,Remaining Share\n'
      : 'BDE Name,Assigned Leads,Conversions,Conversion Rate (%)\n';
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      header +
      bdeLeaderboard
        .map((b) =>
          canViewFinance
            ? `"${b.name}",${b.assignedCount},${b.convertedCount},${b.conversionRate}%,${b.revenue},${b.commission}`
            : `"${b.name}",${b.assignedCount},${b.convertedCount},${b.conversionRate}%`
        )
        .join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `LeadFlow_Performance_Report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setExportNotice(true);
    setTimeout(() => setExportNotice(false), 3000);
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-6">
        <div>
          <div className="flex items-center gap-2 text-[#2563EB] text-xs font-bold uppercase tracking-wider mb-1">
            <FiBarChart2 />
            <span>
              {currentRole === 'TEAM_LEAD' ? 'Team Performance Analytics' : 'Executive Business Intelligence'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight">
            {currentRole === 'TEAM_LEAD' ? 'Team Alpha Calling & Conversion Audit' : 'Enterprise Performance Reports'}
          </h1>
          <p className="text-[#64748B] text-xs sm:text-sm mt-1">
            Pipeline funnel, team conversion benchmarks and confirmed revenue for the selected period.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Date range picker */}
          <div className="flex bg-[#F1F5F9] p-1 rounded-xl border border-[#E2E8F0] text-xs font-bold">
            {(['TODAY', 'WEEK', 'MONTH', 'ALL'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  dateRange === r ? 'bg-white text-[#2563EB] shadow-xs' : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                {r === 'TODAY' ? 'Today' : r === 'WEEK' ? '7 Days' : r === 'MONTH' ? 'Month' : 'All Time'}
              </button>
            ))}
          </div>

          {/* Admin Team Filter */}
          {currentRole === 'ADMIN' && (
            <div className="flex items-center gap-1.5 bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-1.5 rounded-xl text-xs font-semibold text-[#0F172A]">
              <FiFilter className="text-[#64748B]" />
              <select
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
                className="bg-transparent focus:outline-none text-[#0F172A] font-bold"
              >
                <option value="ALL">All Teams Combined</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl shimmer-button text-white text-xs font-bold shadow-md cursor-pointer"
          >
            <FiDownload />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => window.print()}
            className="p-2 rounded-xl bg-white hover:bg-slate-50 border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] transition-colors cursor-pointer"
            title="Print Report"
          >
            <FiPrinter />
          </button>
        </div>
      </div>

      {exportNotice && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3.5 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E40AF] text-xs font-bold flex items-center gap-2"
        >
          <FiCheckCircle className="text-base text-[#2563EB]" />
          <span>Performance report exported successfully as CSV! Check your downloads.</span>
        </motion.div>
      )}

      {/* Top Level Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-3.5 sm:gap-4">
        <motion.div whileHover={{ y: -2 }} className="glass-panel p-4 sm:p-5 rounded-2xl min-w-0">
          <div className="flex items-center justify-between text-xs font-bold text-[#64748B]">
            <span>Total Leads Managed</span>
            <div className="p-2 rounded-xl bg-[#EFF6FF] text-[#2563EB]">
              <FiPhoneCall className="text-base" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#0F172A] mt-2 truncate">{totalLeads}</div>
          <div className="text-xs text-[#2563EB] font-semibold mt-1">
            {contactRate}% Contact Rate ({contactedLeads} touched)
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} className="glass-panel p-4 sm:p-5 rounded-2xl min-w-0">
          <div className="flex items-center justify-between text-xs font-bold text-[#64748B]">
            <span>Successful Conversions</span>
            <div className="p-2 rounded-xl bg-[#EFF6FF] text-[#2563EB]">
              <FiCheckCircle className="text-base" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#2563EB] mt-2 truncate">{convertedLeads}</div>
          <div className="text-xs text-[#64748B] font-semibold mt-1">
            Overall Conversion: <span className="text-[#2563EB] font-bold">{conversionPct}%</span>
          </div>
        </motion.div>

        {currentRole === 'ADMIN' && (
          <>
            <motion.div whileHover={{ y: -2 }} className="glass-panel p-4 sm:p-5 rounded-2xl min-w-0">
              <div className="flex items-center justify-between text-xs font-bold text-[#64748B]">
                <span>Gross Confirmed Revenue</span>
                <div className="p-2 rounded-xl bg-[#EFF6FF] text-[#2563EB]">
                  <FiDollarSign className="text-base" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-[#0F172A] mt-2 truncate">
                {formatCurrency(totalGrossRevenue)}
              </div>
              <div className="text-xs text-[#64748B] mt-1 font-mono">
                {relevantTransactions.length} Confirmed Collections
              </div>
            </motion.div>

            <motion.div whileHover={{ y: -2 }} className="glass-panel p-4 sm:p-5 rounded-2xl min-w-0">
              <div className="flex items-center justify-between text-xs font-bold text-[#64748B]">
                <span>Confirmed Organization Share</span>
                <div className="p-2 rounded-xl bg-[#EFF6FF] text-[#2563EB]">
                  <FiTrendingUp className="text-base" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-[#2563EB] mt-2 truncate">
                {formatCurrency(totalNetProfit)}
              </div>
              <div className="text-xs text-[#64748B] mt-1 truncate">
                  Remaining Share: <span className="font-bold text-[#2563EB]">{formatCurrency(totalBdeCommissions)}</span>
              </div>
            </motion.div>
          </>
        )}
      </div>

      {/* Conversion Funnel + Lead Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversion Funnel Bar Graph */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
              <FiTrendingUp className="text-[#2563EB]" />
              <span>Full Lifecycle Pipeline Funnel</span>
            </h3>
            <span className="text-xs font-semibold text-[#64748B]">Stage drop-off rates</span>
          </div>

          <div className="space-y-4">
            {/* Total Ingested */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-[#0F172A]">1. Leads Ingested & Allocated</span>
                <span className="text-[#2563EB] font-mono">{totalLeads} leads (100%)</span>
              </div>
              <div className="w-full bg-[#E2E8F0] h-3 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  className="bg-gradient-to-r from-[#1D4ED8] to-[#2563EB] h-full rounded-full"
                />
              </div>
            </div>

            {/* Contacted */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-[#0F172A]">2. Contacted via Outreach / Dialer</span>
                <span className="text-[#2563EB] font-mono">
                  {contactedLeads} leads ({calculateConversionRate(contactedLeads, totalLeads)}%)
                </span>
              </div>
              <div className="w-full bg-[#E2E8F0] h-3 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${calculateConversionRate(contactedLeads, totalLeads)}%` }}
                  className="bg-[#2563EB] h-full rounded-full"
                />
              </div>
            </div>

            {/* Interested / Follow-up */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-[#0F172A]">3. Qualified Prospects (Interested / Callbacks)</span>
                <span className="text-[#3B82F6] font-mono">
                  {interestedLeads} leads ({calculateConversionRate(interestedLeads, totalLeads)}%)
                </span>
              </div>
              <div className="w-full bg-[#E2E8F0] h-3 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${calculateConversionRate(interestedLeads, totalLeads)}%` }}
                  className="bg-[#3B82F6] h-full rounded-full"
                />
              </div>
            </div>

            {/* Converted */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-[#0F172A]">4. Closed & Enrolled (Converted)</span>
                <span className="text-[#2563EB] font-mono">
                  {convertedLeads} leads ({conversionPct}%)
                </span>
              </div>
              <div className="w-full bg-[#E2E8F0] h-3 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${conversionPct}%` }}
                  className="bg-gradient-to-r from-[#2563EB] to-[#818CF8] h-full rounded-full"
                />
              </div>
            </div>

            {/* Lost / Unresponsive */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-[#64748B]">Lost / Not Interested / Unreachable</span>
                <span className="text-[#DC2626] font-mono">
                  {lostLeads} leads ({calculateConversionRate(lostLeads, totalLeads)}%)
                </span>
              </div>
              <div className="w-full bg-[#E2E8F0] h-2 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${calculateConversionRate(lostLeads, totalLeads)}%` }}
                  className="bg-[#EF4444] h-full rounded-full"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Lead Source Effectiveness */}
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
            <FiAward className="text-[#2563EB]" />
            <span>Conversion Rate By Source</span>
          </h3>

          <div className="space-y-3">
            {sourceStats.length === 0 ? (
              <p className="text-xs text-[#64748B]">No lead sources recorded for this period.</p>
            ) : (
              sourceStats.map((src) => (
                <div key={src.name} className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#0F172A]">{src.name}</span>
                    <span className="font-bold text-[#2563EB]">{src.rate}% Conv.</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#64748B] mt-1">
                    <span>{src.count} total leads</span>
                    <span>{src.converted} converted</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* BDE Leaderboard */}
      <div className="glass-panel rounded-2xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
              <FiAward className="text-[#2563EB]" />
              <span>{currentRole === 'ADMIN' ? 'BDE Executive Calling & Revenue Leaderboard' : 'BDE Calling & Conversion Leaderboard'}</span>
            </h3>
            <p className="text-xs text-[#64748B] mt-0.5">
              {currentRole === 'ADMIN'
                ? 'Ranked by confirmed deal conversions and confirmed revenue.'
                : 'Ranked by confirmed deal conversions and win rate.'}
            </p>
          </div>
          <span className="text-xs text-[#2563EB] font-bold bg-[#EFF6FF] px-3 py-1 rounded-full border border-[#BFDBFE] self-start sm:self-auto">
            {bdeLeaderboard.length} Active BDEs
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] text-[#64748B] uppercase font-bold text-[10px] tracking-wider border-b border-[#E2E8F0]">
              <tr>
                <th className="py-3 px-4">Rank</th>
                <th className="py-3 px-4">Executive</th>
                <th className="py-3 px-4 text-center">Assigned</th>
                <th className="py-3 px-4 text-center">Converted</th>
                <th className="py-3 px-4 text-center">Win Rate</th>
                {currentRole === 'ADMIN' && (
                  <>
                    <th className="py-3 px-4 text-right">Confirmed Revenue</th>
                    <th className="py-3 px-4 text-right">Remaining Share</th>
                  </>
                )}
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {bdeLeaderboard.map((bde, idx) => (
                <tr key={bde.id} className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="py-3.5 px-4 font-bold">
                    <span
                      className={`w-6 h-6 rounded-full inline-flex items-center justify-center font-bold text-xs ${
                        idx === 0
                          ? 'bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]'
                          : idx === 1
                          ? 'bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1]'
                          : idx === 2
                          ? 'bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]'
                          : 'text-[#64748B]'
                      }`}
                    >
                      {idx + 1}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-[#0F172A]">{bde.name}</div>
                    <div className="text-[10px] text-[#64748B]">Team: {bde.teamId || 'Team Alpha'}</div>
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono font-bold text-[#475569]">{bde.assignedCount}</td>
                  <td className="py-3.5 px-4 text-center font-mono font-bold text-[#2563EB]">{bde.convertedCount}</td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="font-mono font-black text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded-full border border-[#BFDBFE]">
                      {bde.conversionRate}%
                    </span>
                  </td>
                  {currentRole === 'ADMIN' && (
                    <>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-[#0F172A]">
                        {formatCurrency(bde.revenue)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-[#2563EB]">
                        {formatCurrency(bde.commission)}
                      </td>
                    </>
                  )}
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        bde.status === 'ACTIVE'
                          ? 'bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]'
                          : 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]'
                      }`}
                    >
                      {bde.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportsAnalytics;
