import React from 'react';
import { FiTrendingUp, FiCheckCircle, FiTarget, FiDollarSign } from 'react-icons/fi';
import { useApp } from '../../context/useApp';
import type { Lead } from '../../types';
import { calculateConversionRate, formatCurrency } from '../../utils/calculations';

export const BDEPerformance: React.FC = () => {
  const { leads, currentUser } = useApp();

  const myLeads = leads.filter((l: Lead) => l.currentBdeId === currentUser.id);
  const pendingLeads = myLeads.filter((l: Lead) =>
    ['NEW', 'CONTACTED', 'FOLLOW_UP_REQUIRED'].includes(l.status)
  );
  const convertedLeads = myLeads.filter((l: Lead) => l.status === 'CONVERTED');
  const interestedLeads = myLeads.filter((l: Lead) => l.status === 'INTERESTED');
  const myConversionRate = calculateConversionRate(convertedLeads.length, myLeads.length);

  // Incentive estimation (Sample ₹1,500 per closed enrollment)
  const estimatedIncentive = convertedLeads.length * 1500;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-[#0F172A] tracking-tight flex items-center gap-2">
            <FiTrendingUp className="text-[#2563EB]" />
            <span>My Performance & Incentives</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] font-medium mt-0.5">
            Frontline conversion analytics, monthly quota targets, and closed deal incentive bonuses.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#2563EB] bg-[#EFF6FF] px-3.5 py-1.5 rounded-xl border border-[#BFDBFE]">
            Win Rate: {myConversionRate}%
          </span>
        </div>
      </div>

      {/* Funnel Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="glass-panel p-4 rounded-2xl text-center">
          <div className="text-xs text-[#64748B] font-semibold">Total Assigned</div>
          <div className="text-2xl font-black text-[#0F172A] mt-1">{myLeads.length}</div>
        </div>
        <div className="glass-panel p-4 rounded-2xl text-center">
          <div className="text-xs text-[#64748B] font-semibold">Interested Leads</div>
          <div className="text-2xl font-black text-[#2563EB] mt-1">{interestedLeads.length}</div>
        </div>
        <div className="glass-panel p-4 rounded-2xl text-center">
          <div className="text-xs text-[#64748B] font-semibold">Closed Deals</div>
          <div className="text-2xl font-black text-[#2563EB] mt-1">{convertedLeads.length}</div>
        </div>
        <div className="glass-panel p-4 rounded-2xl text-center">
          <div className="text-xs text-[#64748B] font-semibold">Pending Queue</div>
          <div className="text-2xl font-black text-[#D97706] mt-1">{pendingLeads.length}</div>
        </div>
      </div>

      {/* Quota Benchmark Progress */}
      <div className="glass-panel p-5 sm:p-6 rounded-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E8F0] pb-3">
          <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
            <FiTarget className="text-[#2563EB]" />
            <span>Monthly Conversion Quota Benchmark</span>
          </h3>
          <span className="text-xs font-mono font-bold text-[#2563EB]">Target: 25%</span>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-[#64748B]">Monthly Performance Threshold</span>
            <span className="text-[#2563EB] font-bold">{myConversionRate}% / 25% Target</span>
          </div>
          <div className="h-3 w-full bg-[#E2E8F0] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#2563EB] to-[#3B82F6] rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (myConversionRate / 25) * 100)}%` }}
            />
          </div>
          <p className="text-[11px] text-[#64748B]">
            {myConversionRate >= 25
              ? '🌟 You have exceeded your monthly quota benchmark! Excellent outreach productivity.'
              : `You are currently ${(25 - myConversionRate).toFixed(1)}% away from your monthly target threshold.`}
          </p>
        </div>
      </div>

      {/* Incentive Earnings Card */}
      <div className="glass-panel p-5 sm:p-6 rounded-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E8F0] pb-3">
          <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
            <FiDollarSign className="text-[#2563EB]" />
            <span>Estimated Incentive Payout</span>
          </h3>
          <span className="text-xs text-[#2563EB] bg-[#EFF6FF] px-2.5 py-1 rounded-full border border-[#BFDBFE] font-bold">
            ₹1,500 / closed deal
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-3xl font-black text-[#0F172A]">
              {formatCurrency(estimatedIncentive)}
            </div>
            <p className="text-xs text-[#64748B] mt-1">
              Accumulated performance incentive for {convertedLeads.length} closed enrollments this cycle.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#1E40AF] bg-[#EFF6FF] p-3 rounded-xl border border-[#BFDBFE]">
            <FiCheckCircle className="text-base shrink-0 text-[#2563EB]" />
            <span>Incentive disbursements are credited on the 1st of each calendar month.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BDEPerformance;
