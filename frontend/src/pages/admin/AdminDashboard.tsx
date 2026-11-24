import React from 'react';
import { useApp } from '../../context/useApp';
import { calculateConversionRate } from '../../utils/calculations';
import { motion } from 'framer-motion';
import {
  FiGrid,
  FiUploadCloud,
  FiUsers,
  FiCheckCircle,
  FiDollarSign,
  FiTrendingUp,
  FiLayers,
  FiUserCheck,
  FiArrowUpRight,
  FiAlertCircle,
} from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { APP_ROUTES, OPEN_LEAD_STATUSES } from '../../utils/constants';

export const AdminDashboard: React.FC = () => {
  const { leads, teams, users, transactions, companySharePct, poolEscalations, clearPoolEscalation } =
    useApp();

  // Metrics calculation
  const totalUploaded = leads.length;
  const totalAllocated = leads.filter((l) => l.currentTeamId).length;
  const totalConverted = leads.filter((l) => l.status === 'CONVERTED').length;
  const overallConversionPct = calculateConversionRate(totalConverted, totalAllocated);

  const activeBdes = users.filter((u) => u.role === 'BDE' && u.status === 'ACTIVE').length;
  const inactiveBdes = users.filter((u) => u.role === 'BDE' && u.status !== 'ACTIVE').length;

  const confirmedTransactions = transactions.filter((t) => t.status === 'CONFIRMED');
  const totalRevenueConfirmed = confirmedTransactions.reduce((sum, t) => sum + t.grossAmount, 0);

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
        <div>
          <div className="flex items-center gap-2 text-[#059669] text-xs font-bold uppercase tracking-wider mb-1">
            <FiGrid />
            <span>Executive Command Center</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-[#0F172A] tracking-tight">
            Organization Overview & Hierarchy Control
          </h1>
          <p className="text-[#64748B] text-sm mt-1">
            Centralized governance of teams, 2-tier lead distributions, conversion rates, and revenue performance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to={APP_ROUTES.ADMIN.LEADS}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl shimmer-button text-white font-bold text-xs cursor-pointer shadow-md transition-all"
          >
            <FiUploadCloud />
            <span>Ingest & Allocate Leads</span>
          </Link>
          <Link
            to={APP_ROUTES.ADMIN.FINANCE}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-[#0F172A] border border-[#E2E8F0] font-bold text-xs transition-all shadow-xs"
          >
            <FiDollarSign className="text-[#059669]" />
            <span>Financial Suite</span>
          </Link>
        </div>
      </div>

      {poolEscalations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel rounded-2xl p-4 border border-[#FDE68A] bg-[#FFFBEB]/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex items-start gap-2.5">
            <FiAlertCircle className="text-lg text-[#D97706] shrink-0" />
            <div>
              <p className="text-xs font-bold text-[#92400E]">
                Team pool empty — lead injection requested
              </p>
              <p className="text-[11px] text-[#B45309] mt-0.5">
                {poolEscalations.map((item) => item.teamName).join(', ')} requested more leads in the admin pool.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {poolEscalations.map((item) => (
              <button
                key={item.teamId}
                onClick={() => clearPoolEscalation(item.teamId)}
                className="px-3 py-1.5 rounded-xl bg-white text-[#B45309] border border-[#FDE68A] hover:bg-[#FFFBEB] text-[11px] font-bold cursor-pointer"
              >
                Clear {item.teamName}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* KPI Cards Grid with Interactive Spring Hovers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          whileHover={{ y: -5, scale: 1.015 }}
          whileTap={{ scale: 0.985 }}
          className="glass-panel stat-card-animated p-5 rounded-2xl relative overflow-hidden min-w-0 cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] block truncate">
                Total Leads Uploaded
              </span>
              <div className="text-2xl sm:text-3xl font-black text-[#0F172A] mt-0.5 truncate">{totalUploaded}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-[#ECFDF5] text-[#059669] shrink-0 shadow-2xs">
              <FiLayers className="text-base" />
            </div>
          </div>
          <div className="text-xs text-[#059669] font-bold mt-3 flex items-center gap-1">
            <FiArrowUpRight />
            <span>{totalAllocated} Allocated ({totalUploaded - totalAllocated} in Pool)</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          whileHover={{ y: -5, scale: 1.015 }}
          whileTap={{ scale: 0.985 }}
          className="glass-panel stat-card-animated p-5 rounded-2xl relative overflow-hidden min-w-0 cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] block truncate">
                Successful Conversions
              </span>
              <div className="text-2xl sm:text-3xl font-black text-[#059669] mt-0.5 truncate">{totalConverted}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-[#ECFDF5] text-[#059669] shrink-0 shadow-2xs">
              <FiCheckCircle className="text-base" />
            </div>
          </div>
          <div className="text-xs text-[#64748B] mt-3 font-medium">
            Closed across {teams.length} Teams
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          whileHover={{ y: -5, scale: 1.015 }}
          whileTap={{ scale: 0.985 }}
          className="glass-panel stat-card-animated p-5 rounded-2xl relative overflow-hidden min-w-0 cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] block truncate">
                Org Conversion Rate
              </span>
              <div className="text-2xl sm:text-3xl font-black text-[#0F172A] mt-0.5 truncate">{overallConversionPct}%</div>
            </div>
            <div className="p-2.5 rounded-xl bg-[#ECFDF5] text-[#059669] shrink-0 shadow-2xs">
              <FiTrendingUp className="text-base" />
            </div>
          </div>
          <div className="text-[11px] text-[#64748B] mt-3 font-mono">
            (Conversions ÷ Allocated) × 100
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          whileHover={{ y: -5, scale: 1.015 }}
          whileTap={{ scale: 0.985 }}
          className="glass-panel stat-card-animated p-5 rounded-2xl relative overflow-hidden min-w-0 cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] block truncate">
                Confirmed Revenue
              </span>
              <div className="text-2xl sm:text-3xl font-black text-[#0F172A] mt-0.5 truncate">
                ₹{totalRevenueConfirmed.toLocaleString('en-IN')}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-[#ECFDF5] text-[#059669] shrink-0 shadow-2xs">
              <FiDollarSign className="text-base" />
            </div>
          </div>
          <div className="text-xs text-[#059669] font-bold mt-3 truncate">
            Company Share ({companySharePct}%): ₹{((totalRevenueConfirmed * companySharePct) / 100).toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-[#64748B] mt-0.5">
            Across {confirmedTransactions.length} confirmed transaction{confirmedTransactions.length === 1 ? '' : 's'}
          </div>
        </motion.div>
      </div>

      {/* Team Comparative Benchmarking Table */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-black text-[#0F172A] flex items-center gap-2">
              <FiUsers className="text-[#059669]" />
              <span>Team Performance & Lead Distribution Benchmark</span>
            </h3>
            <p className="text-xs text-[#64748B] mt-0.5">
              Stage 1 lead allocation summary vs Stage 2 BDE execution
            </p>
          </div>
          <span className="text-xs text-[#059669] bg-[#ECFDF5] px-3 py-1 rounded-full border border-[#A7F3D0] font-bold">
            {teams.length} Operational Teams
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-[#64748B] font-bold bg-[#F8FAFC]">
                <th className="py-3.5 px-4">Team Name</th>
                <th className="py-3.5 px-4">Team Lead</th>
                <th className="py-3.5 px-4">Active BDEs</th>
                <th className="py-3.5 px-4">Active Leads in Team Pool</th>
                <th className="py-3.5 px-4">Active with BDEs</th>
                <th className="py-3.5 px-4">Conversions</th>
                <th className="py-3.5 px-4">Conversion %</th>
                <th className="py-3.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {teams.map((t) => {
                const teamLeads = leads.filter((l) => l.currentTeamId === t.id);
                const activeTeamLeads = teamLeads.filter((l) => OPEN_LEAD_STATUSES.includes(l.status));
                const teamPool = activeTeamLeads.filter((l) => !l.currentBdeId).length;
                const bdeAssigned = activeTeamLeads.filter((l) => l.currentBdeId).length;
                const conversions = teamLeads.filter((l) => l.status === 'CONVERTED').length;
                const convPct = calculateConversionRate(conversions, teamLeads.length);
                const bdeCount = users.filter((u) => u.teamId === t.id && u.role === 'BDE').length;

                return (
                  <tr key={t.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3.5 px-4 font-bold text-[#0F172A]">{t.name}</td>
                    <td className="py-3.5 px-4 text-[#475569]">{t.teamLeadName}</td>
                    <td className="py-3.5 px-4 text-[#475569] font-medium">{bdeCount} Execs</td>
                    <td className="py-3.5 px-4 font-bold text-[#D97706]">{teamPool} Unassigned</td>
                    <td className="py-3.5 px-4 font-bold text-[#059669]">{bdeAssigned} Distributed</td>
                    <td className="py-3.5 px-4 font-bold text-[#0F172A]">{conversions}</td>
                    <td className="py-3.5 px-4 font-black text-[#059669]">{convPct}%</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
                        {t.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Workforce Availability & Status Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-panel rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
              <FiUserCheck className="text-[#059669]" />
              <span>Workforce Availability Summary</span>
            </h4>
            <span className="text-xs text-[#64748B] font-medium">{activeBdes + inactiveBdes} Total BDEs</span>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <div className="text-xs text-[#64748B] font-semibold">Active & Eligible BDEs</div>
              <div className="text-2xl font-black text-[#059669] mt-1">{activeBdes}</div>
              <div className="text-[11px] text-[#64748B] mt-0.5">Receives Stage 2 Leads</div>
            </div>
            <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <div className="text-xs text-[#64748B] font-semibold">Inactive / On Leave</div>
              <div className="text-2xl font-black text-[#64748B] mt-1">{inactiveBdes}</div>
              <div className="text-[11px] text-[#64748B] mt-0.5">Excluded from Allocation</div>
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
              <FiTrendingUp className="text-[#059669]" />
              <span>Lead Flow Funnel Velocity</span>
            </h4>
            <span className="text-xs text-[#059669] font-mono font-bold bg-[#ECFDF5] px-2.5 py-0.5 rounded-full border border-[#A7F3D0]">
              Live Stage Metrics
            </span>
          </div>
          <div className="space-y-2 pt-1 text-xs">
            <div className="flex justify-between text-[#475569]">
              <span>Unallocated Admin Pool</span>
              <span className="text-[#0F172A] font-bold">
                {leads.filter((l) => !l.currentTeamId && OPEN_LEAD_STATUSES.includes(l.status)).length}
              </span>
            </div>
            <div className="flex justify-between text-[#475569]">
              <span>Team Pool Pending Distribution</span>
              <span className="text-[#D97706] font-bold">
                {leads.filter(
                  (l) => l.currentTeamId && !l.currentBdeId && OPEN_LEAD_STATUSES.includes(l.status)
                ).length}
              </span>
            </div>
            <div className="flex justify-between text-[#475569]">
              <span>Active in BDE Call Queues</span>
              <span className="text-[#059669] font-bold">
                {leads.filter((l) => l.currentBdeId && OPEN_LEAD_STATUSES.includes(l.status)).length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
