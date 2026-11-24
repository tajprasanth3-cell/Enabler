import React, { useEffect, useState } from 'react';
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
  ...TERMINAL_SUCCESS_STATUSES,
];

const parseReportDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (/(?:Z|[+-]\d{2}:?\d{2})$/i.test(trimmed)) {
    const utcDate = new Date(trimmed);
    return Number.isNaN(utcDate.getTime()) ? null : utcDate;
  }
  const dateOnly = trimmed.match(/^(\d{4}-\d{2}-\d{2})$/);
  if (dateOnly) {
    const [year, month, day] = dateOnly[1].split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{1,2}):(\d{2})(?:\s*(AM|PM))?/i);
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
  const fallback = new Date(trimmed);
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
  const { leads, users, teams, currentRole, managedTeamIds, transactions } = useApp();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);
  const [dateRange, setDateRange] = useState<DateRange>('ALL');
  const [teamFilter, setTeamFilter] = useState<string>('ALL');
  const [exportNotice, setExportNotice] = useState(false);

  const managedTeamNames = teams
    .filter((team) => managedTeamIds.includes(team.id))
    .map((team) => team.name);

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
      return managedTeamIds.includes(l.currentTeamId || '');
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
      return managedTeamIds.includes(t.teamId);
    }
    if (teamFilter !== 'ALL') {
      return t.teamId === teamFilter;
    }
    return true;
  });

  const totalGrossRevenue = relevantTransactions.reduce((acc, t) => acc + t.grossAmount, 0);
  const totalCompanyShare = relevantTransactions.reduce((acc, t) => acc + t.companyShareAmount, 0);
  const totalNetProfit = relevantTransactions.reduce((acc, t) => acc + t.netProfit, 0);
  const totalBdeCommissions = relevantTransactions.reduce((acc, t) => acc + t.remainingShareAmount, 0);

  // BDE Leaderboard
  const bdeUsers = users.filter((u) => {
    if (u.role !== 'BDE' || u.status !== 'ACTIVE') return false;
    if (currentRole === 'TEAM_LEAD') return managedTeamIds.includes(u.teamId || '');
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
    link.setAttribute('download', `LeadFlow_Performance_Report_${now.getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setExportNotice(true);
    setTimeout(() => setExportNotice(false), 3000);
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[#059669] text-xs font-bold uppercase tracking-wider mb-1">
            <FiBarChart2 />
            <span>
              {currentRole === 'TEAM_LEAD' ? 'Team Performance Analytics' : 'Executive Business Intelligence'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight break-words">
            {currentRole === 'TEAM_LEAD'
              ? `${managedTeamNames.join(' & ') || 'Your Teams'} Calling & Conversion Audit`
              : 'Enterprise Performance Reports'}
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
                  dateRange === r ? 'bg-white text-[#059669] shadow-xs' : 'text-[#64748B] hover:text-[#0F172A]'
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
          className="p-3.5 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] text-xs font-bold flex items-center gap-2"
        >
          <FiCheckCircle className="text-base text-[#059669]" />
          <span>Performance report exported successfully as CSV! Check your downloads.</span>
        </motion.div>
      )}

      {/* Top Level Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-3.5 sm:gap-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          whileHover={{ y: -5, scale: 1.02 }}
          whileTap={{ scale: 0.985 }}
          className="glass-panel stat-card-animated p-4 sm:p-5 rounded-2xl min-w-0 cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] block truncate">
                Total Leads Managed
              </span>
              <div className="text-2xl sm:text-3xl font-black text-[#0F172A] mt-0.5 truncate">{totalLeads}</div>
            </div>
            <div className="p-2 rounded-xl bg-[#ECFDF5] text-[#059669] shrink-0 shadow-2xs">
              <FiPhoneCall className="text-base" />
            </div>
          </div>
          <div className="text-xs text-[#059669] font-semibold mt-3">
            {contactRate}% Contact Rate ({contactedLeads} touched)
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          whileHover={{ y: -5, scale: 1.02 }}
          whileTap={{ scale: 0.985 }}
          className="glass-panel stat-card-animated p-4 sm:p-5 rounded-2xl min-w-0 cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] block truncate">
                Successful Conversions
              </span>
              <div className="text-2xl sm:text-3xl font-black text-[#059669] mt-0.5 truncate">{convertedLeads}</div>
            </div>
            <div className="p-2 rounded-xl bg-[#ECFDF5] text-[#059669] shrink-0 shadow-2xs">
              <FiCheckCircle className="text-base" />
            </div>
          </div>
          <div className="text-xs text-[#64748B] font-semibold mt-3">
            Overall Conversion: <span className="text-[#059669] font-bold">{conversionPct}%</span>
          </div>
        </motion.div>

        {currentRole === 'ADMIN' && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.15 }}
              whileHover={{ y: -5, scale: 1.02 }}
              whileTap={{ scale: 0.985 }}
              className="glass-panel stat-card-animated p-4 sm:p-5 rounded-2xl min-w-0 cursor-pointer flex flex-col justify-between"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] block truncate">
                    Gross Confirmed Revenue
                  </span>
                  <div className="text-2xl sm:text-3xl font-black text-[#0F172A] mt-0.5 truncate">
                    {formatCurrency(totalGrossRevenue)}
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-[#ECFDF5] text-[#059669] shrink-0 shadow-2xs">
                  <FiDollarSign className="text-base" />
                </div>
              </div>
              <div className="text-xs text-[#64748B] mt-3 font-mono">
                {relevantTransactions.length} Confirmed Collections
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              whileHover={{ y: -5, scale: 1.02 }}
              whileTap={{ scale: 0.985 }}
              className="glass-panel stat-card-animated p-4 sm:p-5 rounded-2xl min-w-0 cursor-pointer flex flex-col justify-between"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] block truncate">
                    Confirmed Organization Share
                  </span>
                  <div className="text-2xl sm:text-3xl font-black text-[#059669] mt-0.5 truncate">
                    {formatCurrency(totalCompanyShare)}
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-[#ECFDF5] text-[#059669] shrink-0 shadow-2xs">
                  <FiTrendingUp className="text-base" />
                </div>
              </div>
              <div className="text-xs text-[#64748B] mt-3 truncate">
                Net Profit: <span className="font-bold text-[#0F172A]">{formatCurrency(totalNetProfit)}</span> · Rem: <span className="font-bold text-[#059669]">{formatCurrency(totalBdeCommissions)}</span>
              </div>
            </motion.div>
          </>
        )}
      </div>

      {/* Admin Revenue & Profit Sharing 30:70 Visual Distribution */}
      {currentRole === 'ADMIN' && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.25 }}
          className="glass-panel p-5 sm:p-6 rounded-2xl space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E8F0] pb-3">
            <div>
              <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                <FiDollarSign className="text-[#059669]" />
                <span>Executive Revenue Sharing &amp; Profit Reconciliation Engine</span>
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                30:70 gross revenue allocation and net profit split ($R - I$) across confirmed candidate transactions.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-[#059669] bg-[#ECFDF5] px-3 py-1 rounded-full border border-[#A7F3D0]">
                Configured Split: 30% Org / 70% Partner
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Gross Revenue 30:70 Split Bar */}
            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-[#0F172A]">Gross Revenue Distribution (30:70)</span>
                <span className="text-[#059669] font-mono">{formatCurrency(totalGrossRevenue)} Total</span>
              </div>
              <div className="h-4 w-full bg-[#E2E8F0] rounded-full overflow-hidden flex shadow-inner">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: totalGrossRevenue > 0 ? '30%' : '0%' }}
                  transition={{ duration: 0.85, ease: 'easeOut' }}
                  className="bg-[#059669] h-full flex items-center justify-center text-[9px] font-black text-white"
                  title={`Organization 30%: ${formatCurrency(totalCompanyShare)}`}
                >
                  30% Org
                </motion.div>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: totalGrossRevenue > 0 ? '70%' : '0%' }}
                  transition={{ duration: 0.85, ease: 'easeOut', delay: 0.1 }}
                  className="bg-[#10B981]/70 h-full flex items-center justify-center text-[9px] font-bold text-[#065F46]"
                  title={`Partners & Execs 70%: ${formatCurrency(totalBdeCommissions)}`}
                >
                  70% Partner
                </motion.div>
              </div>
              <div className="flex justify-between text-[11px] text-[#475569]">
                <div>
                  <span className="font-semibold text-[#059669]">● Org Share (30%):</span> {formatCurrency(totalCompanyShare)}
                </div>
                <div>
                  <span className="font-semibold text-[#64748B]">● Partner Share (70%):</span> {formatCurrency(totalBdeCommissions)}
                </div>
              </div>
            </div>

            {/* Net Profit (R - I) Split Bar */}
            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-[#0F172A]">Net Profit Breakdown ($R - I$)</span>
                <span className="text-[#059669] font-mono">{formatCurrency(totalNetProfit)} Net</span>
              </div>
              <div className="h-4 w-full bg-[#E2E8F0] rounded-full overflow-hidden flex shadow-inner">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: totalNetProfit > 0 ? '30%' : '0%' }}
                  transition={{ duration: 0.85, ease: 'easeOut', delay: 0.15 }}
                  className="bg-[#047857] h-full flex items-center justify-center text-[9px] font-black text-white"
                >
                  30% Profit
                </motion.div>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: totalNetProfit > 0 ? '70%' : '0%' }}
                  transition={{ duration: 0.85, ease: 'easeOut', delay: 0.25 }}
                  className="bg-[#34D399] h-full flex items-center justify-center text-[9px] font-bold text-[#065F46]"
                >
                  70% Remainder
                </motion.div>
              </div>
              <div className="flex justify-between text-[11px] text-[#475569]">
                <div>
                  <span className="font-semibold text-[#047857]">● Org Profit (30%):</span> {formatCurrency(Math.round(totalNetProfit * 0.3))}
                </div>
                <div>
                  <span className="font-semibold text-[#64748B]">● Partner Profit (70%):</span> {formatCurrency(totalNetProfit - Math.round(totalNetProfit * 0.3))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Conversion Funnel + Lead Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Conversion Funnel Bar Graph with Animated Axis */}
        <div className="lg:col-span-2 glass-panel p-4 sm:p-5 rounded-2xl space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E8F0] pb-3">
            <div>
              <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                <FiTrendingUp className="text-[#059669]" />
                <span>Full Lifecycle Pipeline Funnel</span>
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5">Stage drop-off rates with animated conversion axis</p>
            </div>
            <span className="text-xs font-semibold text-[#059669] bg-[#ECFDF5] px-2.5 py-1 rounded-full border border-[#A7F3D0]">
              Total Cohort: {totalLeads} Leads
            </span>
          </div>

          <div className="relative space-y-4 pt-1">
            {/* Background Axis Vertical Gridlines */}
            <div className="absolute inset-0 top-0 bottom-6 pointer-events-none flex justify-between px-0.5">
              {[0, 25, 50, 75, 100].map((pct) => (
                <div key={pct} className="h-full border-l border-dashed border-[#E2E8F0]/70 flex flex-col justify-end" />
              ))}
            </div>

            {/* Total Ingested */}
            <div className="relative z-10 p-2.5 rounded-xl hover:bg-[#F8FAFC]/80 transition-colors">
              <div className="flex justify-between text-xs font-bold mb-1.5">
                <span className="text-[#0F172A]">1. Leads Ingested &amp; Allocated</span>
                <span className="text-[#059669] font-mono">{totalLeads} leads (100%)</span>
              </div>
              <div className="w-full bg-[#E2E8F0] h-3.5 rounded-full overflow-hidden shadow-inner">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
                  className="bg-gradient-to-r from-[#047857] to-[#10B981] h-full rounded-full"
                />
              </div>
            </div>

            {/* Contacted */}
            <div className="relative z-10 p-2.5 rounded-xl hover:bg-[#F8FAFC]/80 transition-colors">
              <div className="flex justify-between text-xs font-bold mb-1.5">
                <span className="text-[#0F172A]">2. Contacted via Outreach / Dialer</span>
                <span className="text-[#059669] font-mono">
                  {contactedLeads} leads ({calculateConversionRate(contactedLeads, totalLeads)}%)
                </span>
              </div>
              <div className="w-full bg-[#E2E8F0] h-3.5 rounded-full overflow-hidden shadow-inner">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${calculateConversionRate(contactedLeads, totalLeads)}%` }}
                  transition={{ duration: 0.95, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
                  className="bg-gradient-to-r from-[#059669] to-[#34D399] h-full rounded-full"
                />
              </div>
            </div>

            {/* Interested / Follow-up */}
            <div className="relative z-10 p-2.5 rounded-xl hover:bg-[#F8FAFC]/80 transition-colors">
              <div className="flex justify-between text-xs font-bold mb-1.5">
                <span className="text-[#0F172A]">3. Qualified Prospects (Interested / Callbacks)</span>
                <span className="text-[#059669] font-mono">
                  {interestedLeads} leads ({calculateConversionRate(interestedLeads, totalLeads)}%)
                </span>
              </div>
              <div className="w-full bg-[#E2E8F0] h-3.5 rounded-full overflow-hidden shadow-inner">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${calculateConversionRate(interestedLeads, totalLeads)}%` }}
                  transition={{ duration: 1.05, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                  className="bg-gradient-to-r from-[#10B981] to-[#6EE7B7] h-full rounded-full"
                />
              </div>
            </div>

            {/* Converted */}
            <div className="relative z-10 p-2.5 rounded-xl hover:bg-[#F8FAFC]/80 transition-colors">
              <div className="flex justify-between text-xs font-bold mb-1.5">
                <span className="text-[#0F172A]">4. Closed &amp; Enrolled (Converted)</span>
                <span className="text-[#059669] font-mono font-bold">
                  {convertedLeads} leads ({conversionPct}%)
                </span>
              </div>
              <div className="w-full bg-[#E2E8F0] h-3.5 rounded-full overflow-hidden shadow-inner">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${conversionPct}%` }}
                  transition={{ duration: 1.15, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
                  className="bg-gradient-to-r from-[#10B981] via-[#059669] to-[#6366F1] h-full rounded-full"
                />
              </div>
            </div>

            {/* Lost / Unresponsive */}
            <div className="relative z-10 p-2.5 rounded-xl hover:bg-[#F8FAFC]/80 transition-colors">
              <div className="flex justify-between text-xs font-bold mb-1.5">
                <span className="text-[#64748B]">Lost / Not Interested / Unreachable</span>
                <span className="text-[#DC2626] font-mono">
                  {lostLeads} leads ({calculateConversionRate(lostLeads, totalLeads)}%)
                </span>
              </div>
              <div className="w-full bg-[#E2E8F0] h-2.5 rounded-full overflow-hidden shadow-inner">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${calculateConversionRate(lostLeads, totalLeads)}%` }}
                  transition={{ duration: 1.25, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
                  className="bg-gradient-to-r from-[#F87171] to-[#DC2626] h-full rounded-full"
                />
              </div>
            </div>

            {/* Horizontal Axis Scale (X-Axis) */}
            <div className="pt-2 border-t border-[#E2E8F0] mt-2">
              <div className="flex justify-between text-[10px] font-bold font-mono text-[#64748B]">
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
              </div>
              <div className="flex justify-between px-0.5 mt-0.5">
                {[0, 25, 50, 75, 100].map((tick) => (
                  <div key={tick} className="w-0.5 h-1.5 bg-[#CBD5E1]" />
                ))}
              </div>
              <div className="text-center text-[10px] font-medium text-[#94A3B8] mt-1">
                Conversion Pipeline Progression Axis
              </div>
            </div>
          </div>
        </div>

        {/* Lead Source Effectiveness */}
        <div className="glass-panel p-4 sm:p-5 rounded-2xl space-y-4">
          <div className="border-b border-[#E2E8F0] pb-3">
            <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
              <FiAward className="text-[#059669]" />
              <span>Conversion Rate By Source</span>
            </h3>
            <p className="text-xs text-[#64748B] mt-0.5">Channel conversion yield with animated bars</p>
          </div>

          <div className="space-y-3.5">
            {sourceStats.length === 0 ? (
              <p className="text-xs text-[#64748B]">No lead sources recorded for this period.</p>
            ) : (
              sourceStats.map((src, idx) => (
                <div key={src.name} className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#0F172A]">{src.name}</span>
                    <span className="font-bold text-[#059669]">{src.rate}% Conv.</span>
                  </div>
                  {/* Animated Channel Axis Bar */}
                  <div className="w-full bg-[#E2E8F0] h-2 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, src.rate)}%` }}
                      transition={{ duration: 0.85, ease: 'easeOut', delay: idx * 0.1 }}
                      className="bg-gradient-to-r from-[#10B981] to-[#34D399] h-full rounded-full"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#64748B]">
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
      <div className="glass-panel rounded-2xl p-4 sm:p-5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
              <FiAward className="text-[#059669]" />
              <span>{currentRole === 'ADMIN' ? 'BDE Executive Calling & Revenue Leaderboard' : 'BDE Calling & Conversion Leaderboard'}</span>
            </h3>
            <p className="text-xs text-[#64748B] mt-0.5">
              {currentRole === 'ADMIN'
                ? 'Ranked by confirmed deal conversions and confirmed revenue.'
                : 'Ranked by confirmed deal conversions and win rate.'}
            </p>
          </div>
          <span className="text-xs text-[#059669] font-bold bg-[#ECFDF5] px-3 py-1 rounded-full border border-[#A7F3D0] self-start sm:self-auto">
            {bdeLeaderboard.length} Active BDEs
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-xs border-collapse">
            <thead className="bg-[#F8FAFC] text-[#64748B] uppercase font-bold text-[10px] tracking-wider border-b border-[#E2E8F0]">
              <tr>
                <th className="py-3.5 px-4">Rank</th>
                <th className="py-3.5 px-4">Executive</th>
                <th className="py-3.5 px-4 text-center">Assigned</th>
                <th className="py-3.5 px-4 text-center">Converted</th>
                <th className="py-3.5 px-4 text-center">Win Rate</th>
                {currentRole === 'ADMIN' && (
                  <>
                    <th className="py-3.5 px-4 text-right">Confirmed Revenue</th>
                    <th className="py-3.5 px-4 text-right">Remaining Share</th>
                  </>
                )}
                <th className="py-3.5 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {bdeLeaderboard.map((bde, idx) => (
                <tr key={bde.id} className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="py-3.5 px-4 font-bold">
                    <span
                      className={`w-6 h-6 rounded-full inline-flex items-center justify-center font-bold text-xs ${
                        idx === 0
                          ? 'bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]'
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
                    <div className="text-[10px] text-[#64748B]">Team: {teams.find((team) => team.id === bde.teamId)?.name || 'Unassigned'}</div>
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono font-bold text-[#475569]">{bde.assignedCount}</td>
                  <td className="py-3.5 px-4 text-center font-mono font-bold text-[#059669]">{bde.convertedCount}</td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="font-mono font-black text-[#059669] bg-[#ECFDF5] px-2 py-0.5 rounded-full border border-[#A7F3D0]">
                      {bde.conversionRate}%
                    </span>
                  </td>
                  {currentRole === 'ADMIN' && (
                    <>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-[#0F172A]">
                        {formatCurrency(bde.revenue)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-[#059669]">
                        {formatCurrency(bde.commission)}
                      </td>
                    </>
                  )}
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        bde.status === 'ACTIVE'
                          ? 'bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]'
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
