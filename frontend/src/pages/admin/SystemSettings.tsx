import React, { useState } from 'react';
import { useApp } from '../../context/useApp';
import {
  FiSettings,
  FiSave,
  FiClock,
  FiAward,
  FiDollarSign,
  FiUsers,
  FiCheckCircle,
  FiAlertCircle,
  FiGitBranch,
} from 'react-icons/fi';
import { motion } from 'framer-motion';
import { parseClockToMinutes } from '../../utils/calculations';

const clamp = (value: number, min: number, max: number) =>
  Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min;

export const SystemSettings: React.FC = () => {
  const { systemSettings, updateSystemSettings } = useApp();

  const [companySharePct, setCompanySharePct] = useState(systemSettings.companySharePercentage);
  const [profitSharePct, setProfitSharePct] = useState(systemSettings.profitSharePercentage);
  const [shiftStart, setShiftStart] = useState(systemSettings.workdayStartTime);
  const [shiftEnd, setShiftEnd] = useState(systemSettings.workdayEndTime);
  const [gracePeriod, setGracePeriod] = useState(systemSettings.lateGracePeriodMinutes);
  const [earlyExitGrace, setEarlyExitGrace] = useState(systemSettings.earlyExitGracePeriodMinutes);
  const [halfDayThreshold, setHalfDayThreshold] = useState(systemSettings.halfDayThresholdHours);
  const [fullDayThreshold, setFullDayThreshold] = useState(systemSettings.fullDayThresholdHours);
  const [maxBdeWorkload, setMaxBdeWorkload] = useState(systemSettings.maxLeadsPerBde);
  const [dailyTargetLeads, setDailyTargetLeads] = useState(systemSettings.dailyTargetLeads);
  const [weeklyTargetLeads, setWeeklyTargetLeads] = useState(systemSettings.weeklyTargetLeads);
  const [monthlyTargetLeads, setMonthlyTargetLeads] = useState(systemSettings.monthlyTargetLeads);
  const [monthlyConversionTarget, setMonthlyConversionTarget] = useState(
    systemSettings.conversionTargetPercentage
  );
  const [reminderMinutes, setReminderMinutes] = useState(systemSettings.followUpReminderMinutes);
  const [allocationMethod, setAllocationMethod] = useState(systemSettings.allocationMethod);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const startMinutes = parseClockToMinutes(shiftStart);
    const endMinutes = parseClockToMinutes(shiftEnd);
    if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
      setSaveError('Workday end time must be later than the start time.');
      setSavedSuccess(false);
      return;
    }
    if (halfDayThreshold <= 0 || fullDayThreshold <= halfDayThreshold) {
      setSaveError('Full-day hours must be greater than half-day hours, and half-day hours must be above 0.');
      setSavedSuccess(false);
      return;
    }
    setSaveError('');
    updateSystemSettings({
      companySharePercentage: clamp(companySharePct, 0, 100),
      profitSharePercentage: clamp(profitSharePct, 0, 100),
      conversionTargetPercentage: clamp(monthlyConversionTarget, 0, 100),
      workdayStartTime: shiftStart,
      workdayEndTime: shiftEnd,
      lateGracePeriodMinutes: Math.max(0, gracePeriod),
      earlyExitGracePeriodMinutes: Math.max(0, earlyExitGrace),
      halfDayThresholdHours: halfDayThreshold,
      fullDayThresholdHours: fullDayThreshold,
      dailyTargetLeads: Math.max(0, dailyTargetLeads),
      weeklyTargetLeads: Math.max(0, weeklyTargetLeads),
      monthlyTargetLeads: Math.max(0, monthlyTargetLeads),
      maxLeadsPerBde: Math.max(0, maxBdeWorkload),
      followUpReminderMinutes: Math.max(0, reminderMinutes),
      allocationMethod,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-5 sm:space-y-8 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-6">
        <div>
          <div className="flex items-center gap-2 text-[#059669] text-xs font-bold uppercase tracking-wider mb-1">
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

      {saveError && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] text-xs flex items-center gap-2 font-bold shadow-xs"
        >
          <FiAlertCircle className="text-base" />
          <span>{saveError}</span>
        </motion.div>
      )}

      {savedSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] text-xs flex items-center gap-2 font-bold shadow-xs"
        >
          <FiCheckCircle className="text-base text-[#059669]" />
          <span>System parameters saved and recorded in the audit trail.</span>
        </motion.div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="glass-panel rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-[#0F172A] font-bold text-sm">
            <FiDollarSign className="text-[#059669]" />
            <span>Financial Business Sharing Defaults</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-[#0F172A] font-bold mb-1">
                Base Company Sharing % (Default 30:70 Model)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={companySharePct}
                onChange={(e) => setCompanySharePct(clamp(Number(e.target.value), 0, 100))}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] font-bold focus:outline-none focus:border-[#10B981] focus:bg-white"
              />
              <p className="text-[11px] text-[#059669] mt-1 font-semibold">
                Remaining partner/operations share: {100 - companySharePct}%
              </p>
            </div>

            <div>
              <label className="block text-[#0F172A] font-bold mb-1">
                Company Profit Share % On Net Profit
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={profitSharePct}
                onChange={(e) => setProfitSharePct(clamp(Number(e.target.value), 0, 100))}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] font-bold focus:outline-none focus:border-[#10B981] focus:bg-white"
              />
              <p className="text-[11px] text-[#059669] mt-1 font-semibold">
                Remaining partner profit share: {100 - profitSharePct}%
              </p>
            </div>

            <div>
              <label className="block text-[#0F172A] font-bold mb-1">
                Monthly Target Conversion Rate (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={monthlyConversionTarget}
                onChange={(e) => setMonthlyConversionTarget(clamp(Number(e.target.value), 0, 100))}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] font-bold focus:outline-none focus:border-[#10B981] focus:bg-white"
              />
              <p className="text-[11px] text-[#64748B] mt-1">
                Used to color-code conversion health across teams
              </p>
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-[#0F172A] font-bold text-sm">
            <FiClock className="text-[#059669]" />
            <span>Attendance & Shift Configuration</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-[#0F172A] font-bold mb-1">Daily Shift Start</label>
              <input
                type="time"
                value={shiftStart}
                onChange={(e) => setShiftStart(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] font-bold focus:outline-none focus:border-[#10B981] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[#0F172A] font-bold mb-1">Daily Shift End</label>
              <input
                type="time"
                value={shiftEnd}
                onChange={(e) => setShiftEnd(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] font-bold focus:outline-none focus:border-[#10B981] focus:bg-white"
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
                onChange={(e) => setGracePeriod(clamp(Number(e.target.value), 0, 60))}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] font-bold focus:outline-none focus:border-[#10B981] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[#0F172A] font-bold mb-1">
                Early Exit Grace Period (Minutes)
              </label>
              <input
                type="number"
                min="0"
                max="240"
                value={earlyExitGrace}
                onChange={(e) => setEarlyExitGrace(clamp(Number(e.target.value), 0, 240))}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] font-bold focus:outline-none focus:border-[#10B981] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[#0F172A] font-bold mb-1">
                Half-Day Threshold (Hours)
              </label>
              <input
                type="number"
                min="0.5"
                max="12"
                step="0.5"
                value={halfDayThreshold}
                onChange={(e) => setHalfDayThreshold(clamp(Number(e.target.value), 0, 24))}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] font-bold focus:outline-none focus:border-[#10B981] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[#0F172A] font-bold mb-1">
                Full-Day Threshold (Hours)
              </label>
              <input
                type="number"
                min="1"
                max="16"
                step="0.5"
                value={fullDayThreshold}
                onChange={(e) => setFullDayThreshold(clamp(Number(e.target.value), 0, 24))}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] font-bold focus:outline-none focus:border-[#10B981] focus:bg-white"
              />
              <p className="text-[11px] text-[#64748B] mt-1">
                Must be greater than the half-day threshold
              </p>
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-[#0F172A] font-bold text-sm">
            <FiUsers className="text-[#059669]" />
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
                onChange={(e) => setMaxBdeWorkload(clamp(Number(e.target.value), 0, 500))}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] font-bold focus:outline-none focus:border-[#10B981] focus:bg-white"
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
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] font-bold focus:outline-none focus:border-[#10B981] focus:bg-white"
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
                onChange={(e) => setReminderMinutes(clamp(Number(e.target.value), 0, 1440))}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] font-bold focus:outline-none focus:border-[#10B981] focus:bg-white"
              />
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-[#0F172A] font-bold text-sm">
            <FiAward className="text-[#059669]" />
            <span>Volume Targets</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-[#0F172A] font-bold mb-1">Daily Lead Target</label>
              <input
                type="number"
                min="0"
                value={dailyTargetLeads}
                onChange={(e) => setDailyTargetLeads(clamp(Number(e.target.value), 0, 10000))}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] font-bold focus:outline-none focus:border-[#10B981] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[#0F172A] font-bold mb-1">Weekly Lead Target</label>
              <input
                type="number"
                min="0"
                value={weeklyTargetLeads}
                onChange={(e) => setWeeklyTargetLeads(clamp(Number(e.target.value), 0, 10000))}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] font-bold focus:outline-none focus:border-[#10B981] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[#0F172A] font-bold mb-1">Monthly Lead Target</label>
              <input
                type="number"
                min="0"
                value={monthlyTargetLeads}
                onChange={(e) => setMonthlyTargetLeads(clamp(Number(e.target.value), 0, 100000))}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] font-bold focus:outline-none focus:border-[#10B981] focus:bg-white"
              />
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-[#0F172A] font-bold text-sm">
            <FiGitBranch className="text-[#059669]" />
            <span>Configured Status Transitions</span>
          </div>
          <p className="text-[11px] text-[#64748B]">
            These follow the documented state machine and are read-only. Terminal statuses have no onward transitions.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {systemSettings.statuses.map((status) => {
              const allowed = systemSettings.statusTransitions[status] || [];
              return (
                <div key={status} className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <div className="font-bold text-[#0F172A]">{status}</div>
                  <div className="text-[11px] text-[#64748B] mt-1 font-mono">
                    {allowed.length ? allowed.join(' → ') : 'Terminal — no further transitions'}
                  </div>
                </div>
              );
            })}
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
