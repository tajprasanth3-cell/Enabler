import React, { useState } from 'react';
import { useApp } from '../../context/useApp';
import {
  FiSettings,
  FiSave,
  FiClock,
  FiDollarSign,
  FiUsers,
  FiCheckCircle,
} from 'react-icons/fi';
import { motion } from 'framer-motion';

export const SystemSettings: React.FC = () => {
  const { systemSettings, updateSystemSettings } = useApp();

  const [companySharePct, setCompanySharePct] = useState(systemSettings.companySharePercentage);
  const [shiftStart, setShiftStart] = useState(systemSettings.workdayStartTime);
  const [shiftEnd, setShiftEnd] = useState(systemSettings.workdayEndTime);
  const [gracePeriod, setGracePeriod] = useState(systemSettings.lateGracePeriodMinutes);
  const [maxBdeWorkload, setMaxBdeWorkload] = useState(systemSettings.maxLeadsPerBde);
  const [monthlyConversionTarget, setMonthlyConversionTarget] = useState(
    systemSettings.conversionTargetPercentage
  );
  const [reminderMinutes, setReminderMinutes] = useState(systemSettings.followUpReminderMinutes);
  const [allocationMethod, setAllocationMethod] = useState(systemSettings.allocationMethod);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSystemSettings({
      companySharePercentage: Math.min(95, Math.max(5, companySharePct)),
      conversionTargetPercentage: monthlyConversionTarget,
      workdayStartTime: shiftStart,
      workdayEndTime: shiftEnd,
      lateGracePeriodMinutes: gracePeriod,
      maxLeadsPerBde: maxBdeWorkload,
      followUpReminderMinutes: reminderMinutes,
      allocationMethod,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-5 sm:space-y-8 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-6">
        <div>
          <div className="flex items-center gap-2 text-[#2563EB] text-xs font-bold uppercase tracking-wider mb-1">
            <FiSettings />
            <span>Dynamic Business Engine Controls</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-[#0F172A] tracking-tight">
            System Rules & Business Parameters
          </h1>
          <p className="text-[#64748B] text-sm mt-1">
            Configure thresholds, sharing percentages, attendance rules, and allocation behaviour without code changes.
          </p>
        </div>
      </div>

      {savedSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E40AF] text-xs flex items-center gap-2 font-bold shadow-xs"
        >
          <FiCheckCircle className="text-base text-[#2563EB]" />
          <span>System parameters saved and recorded in the audit trail.</span>
        </motion.div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="glass-panel rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-[#0F172A] font-bold text-sm">
            <FiDollarSign className="text-[#2563EB]" />
            <span>Financial Business Sharing Defaults</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-[#0F172A] font-bold mb-1">
                Base Company Sharing % (Default 30:70 Model)
              </label>
              <input
                type="number"
                min="5"
                max="95"
                value={companySharePct}
                onChange={(e) => setCompanySharePct(Number(e.target.value))}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] font-bold focus:outline-none focus:border-[#2563EB] focus:bg-white"
              />
              <p className="text-[11px] text-[#2563EB] mt-1 font-semibold">
                Remaining partner/operations share: {100 - companySharePct}%
              </p>
            </div>

            <div>
              <label className="block text-[#0F172A] font-bold mb-1">
                Monthly Target Conversion Rate (%)
              </label>
              <input
                type="number"
                min="5"
                max="100"
                value={monthlyConversionTarget}
                onChange={(e) => setMonthlyConversionTarget(Number(e.target.value))}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] font-bold focus:outline-none focus:border-[#2563EB] focus:bg-white"
              />
              <p className="text-[11px] text-[#64748B] mt-1">
                Used to color-code conversion health across teams
              </p>
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-[#0F172A] font-bold text-sm">
            <FiClock className="text-[#2563EB]" />
            <span>Attendance & Shift Configuration</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-[#0F172A] font-bold mb-1">Daily Shift Start</label>
              <input
                type="time"
                value={shiftStart}
                onChange={(e) => setShiftStart(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] font-bold focus:outline-none focus:border-[#2563EB] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[#0F172A] font-bold mb-1">Daily Shift End</label>
              <input
                type="time"
                value={shiftEnd}
                onChange={(e) => setShiftEnd(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] font-bold focus:outline-none focus:border-[#2563EB] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[#0F172A] font-bold mb-1">
                Tardiness Grace Period (Minutes)
              </label>
              <input
                type="number"
                min="0"
                max="60"
                value={gracePeriod}
                onChange={(e) => setGracePeriod(Number(e.target.value))}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] font-bold focus:outline-none focus:border-[#2563EB] focus:bg-white"
              />
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-[#0F172A] font-bold text-sm">
            <FiUsers className="text-[#2563EB]" />
            <span>Workload & Allocation Safeguards</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-[#0F172A] font-bold mb-1">
                Max Unprocessed Leads per BDE
              </label>
              <input
                type="number"
                min="10"
                max="200"
                value={maxBdeWorkload}
                onChange={(e) => setMaxBdeWorkload(Number(e.target.value))}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] font-bold focus:outline-none focus:border-[#2563EB] focus:bg-white"
              />
              <p className="text-[11px] text-[#64748B] mt-1">
                Prevents overloading BDEs beyond capacity during Stage 2
              </p>
            </div>

            <div>
              <label className="block text-[#0F172A] font-bold mb-1">Default Allocation Method</label>
              <select
                value={allocationMethod}
                onChange={(e) => setAllocationMethod(e.target.value as typeof allocationMethod)}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] font-bold focus:outline-none focus:border-[#2563EB] focus:bg-white"
              >
                <option value="EQUAL">Equal distribution</option>
                <option value="WORKLOAD_BASED">Workload based</option>
                <option value="MANUAL">Manual review</option>
              </select>
            </div>

            <div>
              <label className="block text-[#0F172A] font-bold mb-1">
                Follow-up Reminder Lead Time (Minutes)
              </label>
              <input
                type="number"
                min="5"
                max="240"
                value={reminderMinutes}
                onChange={(e) => setReminderMinutes(Number(e.target.value))}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] font-bold focus:outline-none focus:border-[#2563EB] focus:bg-white"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-6 py-3 rounded-xl shimmer-button text-white text-xs font-bold flex items-center gap-2 shadow-md cursor-pointer transition-all"
          >
            <FiSave />
            <span>Persist System Rules</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default SystemSettings;
