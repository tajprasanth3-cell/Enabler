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
} from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { APP_ROUTES } from '../../utils/constants';

export const AdminDashboard: React.FC = () => {
  const { leads, teams, users, transactions, companySharePct } = useApp();

  // Metrics calculation
  const totalUploaded = leads.length;
  const totalAllocated = leads.filter((l) => l.currentTeamId).length;
  const totalConverted = leads.filter((l) => l.status === 'CONVERTED').length;
  const overallConversionPct = calculateConversionRate(totalConverted, totalAllocated);

  const activeBdes = users.filter((u) => u.role === 'BDE' && u.status === 'ACTIVE').length;
  const inactiveBdes = users.filter((u) => u.role === 'BDE' && u.status === 'INACTIVE').length;

  const totalRevenueConfirmed = transactions.reduce((sum, t) => sum + t.grossAmount, 0);

  return (
    <div className="space-y-5 sm:space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-6">
        <div>
          <div className="flex items-center gap-2 text-[#2563EB] text-xs font-bold uppercase tracking-wider mb-1">
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
            <FiDollarSign className="text-[#2563EB]" />
            <span>Financial Suite</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid with Interactive Spring Hovers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4">
        <motion.div
          whileHover={{ y: -3 }}
          className="glass-panel p-5 rounded-2xl relative overflow-hidden min-w-0"
        >
          <div className="flex items-center justify-between text-[#64748B] text-xs font-bold">
            <span>Total Leads Uploaded</span>
            <div className="p-2 rounded-xl bg-[#EFF6FF] text-[#2563EB]">
              <FiLayers className="text-base" />
            </div>
          </div>
          <div className="text-3xl font-black text-[#0F172A] mt-2 truncate">{totalUploaded}</div>
          <div className="text-xs text-[#2563EB] font-bold mt-1 flex items-center gap-1">
            <FiArrowUpRight />
            <span>{totalAllocated} Allocated ({totalUploaded - totalAllocated} in Pool)</span>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -3 }}
          className="glass-panel p-5 rounded-2xl relative overflow-hidden min-w-0"
        >
          <div className="flex items-center justify-between text-[#64748B] text-xs font-bold">
            <span>Successful Conversions</span>
            <div className="p-2 rounded-xl bg-[#EFF6FF] text-[#2563EB]">
              <FiCheckCircle className="text-base" />
            </div>
          </div>
          <div className="text-3xl font-black text-[#2563EB] mt-2 truncate">{totalConverted}</div>
          <div className="text-xs text-[#64748B] mt-1 font-medium">
            Closed across {teams.length} Teams
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -3 }}
          className="glass-panel p-5 rounded-2xl relative overflow-hidden min-w-0"
        >
          <div className="flex items-center justify-between text-[#64748B] text-xs font-bold">
            <span>Org Conversion Rate</span>
            <div className="p-2 rounded-xl bg-[#EFF6FF] text-[#2563EB]">
              <FiTrendingUp className="text-base" />
            </div>
          </div>
          <div className="text-3xl font-black text-[#0F172A] mt-2 truncate">{overallConversionPct}%</div>
          <div className="text-[11px] text-[#64748B] mt-1 font-mono">
            (Conversions ÷ Allocated) × 100
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -3 }}
          className="glass-panel p-5 rounded-2xl relative overflow-hidden min-w-0"
        >
          <div className="flex items-center justify-between text-[#64748B] text-xs font-bold">
            <span>Confirmed Revenue</span>
            <div className="p-2 rounded-xl bg-[#EFF6FF] text-[#2563EB]">
              <FiDollarSign className="text-base" />
            </div>
          </div>
          <div className="text-3xl font-black text-[#0F172A] mt-2 truncate">
            ₹{totalRevenueConfirmed.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-[#2563EB] font-bold mt-1 truncate">
            Company Share ({companySharePct}%): ₹{((totalRevenueConfirmed * companySharePct) / 100).toLocaleString('en-IN')}
          </div>
        </motion.div>
      </div>

      {/* Team Comparative Benchmarking Table */}
      <div className="glass-panel rounded-2xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-black text-[#0F172A] flex items-center gap-2">
              <FiUsers className="text-[#2563EB]" />
              <span>Team Performance & Lead Distribution Benchmark</span>
            </h3>
            <p className="text-xs text-[#64748B] mt-0.5">
              Stage 1 lead allocation summary vs Stage 2 BDE execution
            </p>
          </div>
          <span className="text-xs text-[#2563EB] bg-[#EFF6FF] px-3 py-1 rounded-full border border-[#BFDBFE] font-bold">
            {teams.length} Operational Teams
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-[#64748B] font-bold bg-[#F8FAFC]">
                <th className="py-3 px-3">Team Name</th>
                <th className="py-3 px-3">Team Lead</th>
                <th className="py-3 px-3">Active BDEs</th>
                <th className="py-3 px-3">Leads in Team Pool</th>
                <th className="py-3 px-3">Distributed to BDEs</th>
                <th className="py-3 px-3">Conversions</th>
                <th className="py-3 px-3">Conversion %</th>
                <th className="py-3 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {teams.map((t) => {
                const teamLeads = leads.filter((l) => l.currentTeamId === t.id);
                const teamPool = teamLeads.filter((l) => !l.currentBdeId).length;
                const bdeAssigned = teamLeads.filter((l) => l.currentBdeId).length;
                const conversions = teamLeads.filter((l) => l.status === 'CONVERTED').length;
                const convPct = calculateConversionRate(conversions, teamLeads.length);
                const bdeCount = users.filter((u) => u.teamId === t.id && u.role === 'BDE').length;

                return (
                  <tr key={t.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3.5 px-3 font-bold text-[#0F172A]">{t.name}</td>
                    <td className="py-3.5 px-3 text-[#475569]">{t.teamLeadName}</td>
                    <td className="py-3.5 px-3 text-[#475569] font-medium">{bdeCount} Execs</td>
                    <td className="py-3.5 px-3 font-bold text-[#D97706]">{teamPool} Unassigned</td>
                    <td className="py-3.5 px-3 font-bold text-[#2563EB]">{bdeAssigned} Distributed</td>
                    <td className="py-3.5 px-3 font-bold text-[#0F172A]">{conversions}</td>
                    <td className="py-3.5 px-3 font-black text-[#2563EB]">{convPct}%</td>
                    <td className="py-3.5 px-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
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
              <FiUserCheck className="text-[#2563EB]" />
              <span>Workforce Availability Summary</span>
            </h4>
            <span className="text-xs text-[#64748B] font-medium">{activeBdes + inactiveBdes} Total BDEs</span>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <div className="text-xs text-[#64748B] font-semibold">Active & Eligible BDEs</div>
              <div className="text-2xl font-black text-[#2563EB] mt-1">{activeBdes}</div>
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
              <FiTrendingUp className="text-[#2563EB]" />
              <span>Lead Flow Funnel Velocity</span>
            </h4>
            <span className="text-xs text-[#2563EB] font-mono font-bold bg-[#EFF6FF] px-2.5 py-0.5 rounded-full border border-[#BFDBFE]">
              Live Stage Metrics
            </span>
          </div>
          <div className="space-y-2 pt-1 text-xs">
            <div className="flex justify-between text-[#475569]">
              <span>Unallocated Admin Pool</span>
              <span className="text-[#0F172A] font-bold">{leads.filter((l) => !l.currentTeamId).length}</span>
            </div>
            <div className="flex justify-between text-[#475569]">
              <span>Team Pool Pending Distribution</span>
              <span className="text-[#D97706] font-bold">{leads.filter((l) => l.currentTeamId && !l.currentBdeId).length}</span>
            </div>
            <div className="flex justify-between text-[#475569]">
              <span>Active in BDE Call Queues</span>
              <span className="text-[#2563EB] font-bold">{leads.filter((l) => l.currentBdeId && !['CONVERTED', 'LOST'].includes(l.status)).length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
