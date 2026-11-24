import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FiTrendingUp, FiTarget } from 'react-icons/fi';
import { useApp } from '../../context/useApp';
import type { Lead } from '../../types';
import { calculateConversionRate } from '../../utils/calculations';
import { OPEN_LEAD_STATUSES } from '../../utils/constants';

const INITIAL_NOW = new Date();

const isCurrentMonth = (value: string, now: Date): boolean => {
  const date = new Date(value);
  return (
    !Number.isNaN(date.getTime()) &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
};

export const BDEPerformance: React.FC = () => {
  const { leads, currentUser, systemSettings } = useApp();
  const [now, setNow] = useState(INITIAL_NOW);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const myLeads = leads.filter((l: Lead) => l.currentBdeId === currentUser.id);
  const activeLeads = myLeads.filter((l: Lead) => OPEN_LEAD_STATUSES.includes(l.status));
  const convertedLeads = myLeads.filter((l: Lead) => l.status === 'CONVERTED');
  const interestedLeads = myLeads.filter((l: Lead) => l.status === 'INTERESTED');

  const monthlyLeads = myLeads.filter((l: Lead) => isCurrentMonth(l.createdAt, now));
  const monthlyConversions = monthlyLeads.filter((l: Lead) => l.status === 'CONVERTED');
  const monthlyConversionRate = calculateConversionRate(monthlyConversions.length, monthlyLeads.length);
  const conversionTarget = Math.max(0, systemSettings.conversionTargetPercentage);
  const quotaProgress = conversionTarget > 0 ? Math.min(100, (monthlyConversionRate / conversionTarget) * 100) : 0;

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-[#0F172A] tracking-tight flex items-center gap-2">
            <FiTrendingUp className="text-[#059669]" />
            <span>My Performance</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] font-medium mt-0.5">
            Frontline conversion analytics and monthly quota progress based on your assigned leads.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#059669] bg-[#ECFDF5] px-3.5 py-1.5 rounded-xl border border-[#A7F3D0]">
            Monthly Win Rate: {monthlyConversionRate}%
          </span>
        </div>
      </div>

      {/* Funnel Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          whileHover={{ y: -4, scale: 1.02 }}
          whileTap={{ scale: 0.985 }}
          className="glass-panel stat-card-animated p-4 rounded-2xl text-center cursor-pointer"
        >
          <div className="text-xs text-[#64748B] font-semibold">Lifetime Assigned</div>
          <div className="text-2xl font-black text-[#0F172A] mt-1">{myLeads.length}</div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          whileHover={{ y: -4, scale: 1.02 }}
          whileTap={{ scale: 0.985 }}
          className="glass-panel stat-card-animated p-4 rounded-2xl text-center cursor-pointer"
        >
          <div className="text-xs text-[#64748B] font-semibold">Active Queue</div>
          <div className="text-2xl font-black text-[#D97706] mt-1">{activeLeads.length}</div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          whileHover={{ y: -4, scale: 1.02 }}
          whileTap={{ scale: 0.985 }}
          className="glass-panel stat-card-animated p-4 rounded-2xl text-center cursor-pointer"
        >
          <div className="text-xs text-[#64748B] font-semibold">Interested Leads</div>
          <div className="text-2xl font-black text-[#059669] mt-1">{interestedLeads.length}</div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          whileHover={{ y: -4, scale: 1.02 }}
          whileTap={{ scale: 0.985 }}
          className="glass-panel stat-card-animated p-4 rounded-2xl text-center cursor-pointer"
        >
          <div className="text-xs text-[#64748B] font-semibold">Closed Deals</div>
          <div className="text-2xl font-black text-[#059669] mt-1">{convertedLeads.length}</div>
        </motion.div>
      </div>

      {/* Quota Benchmark Progress with Animated Milestone Axis */}
      <div className="glass-panel p-5 sm:p-6 rounded-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E8F0] pb-3">
          <div>
            <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
              <FiTarget className="text-[#059669]" />
              <span>Monthly Conversion Quota Benchmark</span>
            </h3>
            <p className="text-xs text-[#64748B] mt-0.5">Animated performance milestone tracking</p>
          </div>
          <span className="text-xs font-mono font-bold text-[#059669] bg-[#ECFDF5] px-3 py-1 rounded-full border border-[#A7F3D0]">
            Target: {conversionTarget}%
          </span>
        </div>

        <div className="space-y-3 pt-1">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-[#64748B]">Monthly Performance Threshold</span>
            <span className="text-[#059669] font-bold">
              {monthlyConversionRate}% / {conversionTarget}% Target
            </span>
          </div>

          <div className="relative">
            {/* Animated Progress Bar */}
            <div className="h-4 w-full bg-[#E2E8F0] rounded-full overflow-hidden shadow-inner p-0.5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, quotaProgress)}%` }}
                transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
                className="h-full bg-gradient-to-r from-[#059669] via-[#10B981] to-[#34D399] rounded-full shadow-xs"
              />
            </div>

            {/* Target Pin Marker on Axis */}
            {conversionTarget > 0 && conversionTarget <= 100 && (
              <div
                className="absolute -top-1 -bottom-1 flex flex-col items-center pointer-events-none"
                style={{ left: `${conversionTarget}%` }}
              >
                <div className="w-1 h-6 bg-[#0F172A] rounded-full shadow-xs" />
              </div>
            )}
          </div>

          {/* Animated Milestone Scale Axis */}
          <div className="pt-2 border-t border-[#E2E8F0]">
            <div className="flex justify-between text-[10px] font-bold font-mono text-[#64748B]">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100% Target</span>
            </div>
            <div className="flex justify-between px-0.5 mt-0.5">
              {[0, 25, 50, 75, 100].map((tick) => (
                <div key={tick} className="w-0.5 h-1.5 bg-[#CBD5E1]" />
              ))}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
            <p className="text-[11px] text-[#475569] font-medium">
              {monthlyLeads.length} of {systemSettings.monthlyTargetLeads} monthly lead target ·{' '}
              {monthlyConversions.length} conversions from leads created this month.
            </p>
            <p className="text-[11px] text-[#059669] font-semibold">
              {conversionTarget === 0
                ? 'No conversion target has been configured.'
                : monthlyConversionRate >= conversionTarget
                  ? '✓ You have met or exceeded your monthly conversion target.'
                  : `You are ${(conversionTarget - monthlyConversionRate).toFixed(1)}% away from your monthly target.`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BDEPerformance;
