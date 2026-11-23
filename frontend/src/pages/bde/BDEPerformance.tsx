import React, { useEffect, useState } from 'react';
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-[#0F172A] tracking-tight flex items-center gap-2">
            <FiTrendingUp className="text-[#2563EB]" />
            <span>My Performance</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] font-medium mt-0.5">
            Frontline conversion analytics and monthly quota progress based on your assigned leads.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#2563EB] bg-[#EFF6FF] px-3.5 py-1.5 rounded-xl border border-[#BFDBFE]">
            Monthly Win Rate: {monthlyConversionRate}%
          </span>
        </div>
      </div>

      {/* Funnel Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="glass-panel p-4 rounded-2xl text-center">
          <div className="text-xs text-[#64748B] font-semibold">Lifetime Assigned</div>
          <div className="text-2xl font-black text-[#0F172A] mt-1">{myLeads.length}</div>
        </div>
        <div className="glass-panel p-4 rounded-2xl text-center">
          <div className="text-xs text-[#64748B] font-semibold">Active Queue</div>
          <div className="text-2xl font-black text-[#D97706] mt-1">{activeLeads.length}</div>
        </div>
        <div className="glass-panel p-4 rounded-2xl text-center">
          <div className="text-xs text-[#64748B] font-semibold">Interested Leads</div>
          <div className="text-2xl font-black text-[#2563EB] mt-1">{interestedLeads.length}</div>
        </div>
        <div className="glass-panel p-4 rounded-2xl text-center">
          <div className="text-xs text-[#64748B] font-semibold">Closed Deals</div>
          <div className="text-2xl font-black text-[#2563EB] mt-1">{convertedLeads.length}</div>
        </div>
      </div>

      {/* Quota Benchmark Progress */}
      <div className="glass-panel p-5 sm:p-6 rounded-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E8F0] pb-3">
          <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
            <FiTarget className="text-[#2563EB]" />
            <span>Monthly Conversion Quota Benchmark</span>
          </h3>
          <span className="text-xs font-mono font-bold text-[#2563EB]">Target: {conversionTarget}%</span>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-[#64748B]">Monthly Performance Threshold</span>
            <span className="text-[#2563EB] font-bold">
              {monthlyConversionRate}% / {conversionTarget}% Target
            </span>
          </div>
          <div className="h-3 w-full bg-[#E2E8F0] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#2563EB] to-[#3B82F6] rounded-full transition-all duration-500"
              style={{ width: `${quotaProgress}%` }}
            />
          </div>
          <p className="text-[11px] text-[#64748B]">
            {monthlyLeads.length} of {systemSettings.monthlyTargetLeads} monthly lead target ·{' '}
            {monthlyConversions.length} conversions from leads created this month.
          </p>
          <p className="text-[11px] text-[#64748B]">
            {conversionTarget === 0
              ? 'No conversion target has been configured.'
              : monthlyConversionRate >= conversionTarget
                ? 'You have met or exceeded your monthly conversion target.'
                : `You are ${(conversionTarget - monthlyConversionRate).toFixed(1)}% away from your monthly target.`}
          </p>
        </div>
      </div>
    </div>
  );
};

export default BDEPerformance;
