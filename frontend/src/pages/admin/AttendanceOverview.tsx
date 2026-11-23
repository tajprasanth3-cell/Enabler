import React, { useState } from 'react';
import { useApp } from '../../context/useApp';
import { motion } from 'framer-motion';
import {
  FiClock,
  FiCalendar,
  FiEdit3,
} from 'react-icons/fi';
import type { AttendanceRecord } from '../../types';

export const AttendanceOverview: React.FC = () => {
  const { attendanceRecords, adjustAttendance } = useApp();

  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [revisedStatus, setRevisedStatus] = useState<AttendanceRecord['status']>('PRESENT');
  const [adjustmentReason, setAdjustmentReason] = useState('');

  const handleExecuteAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord || !adjustmentReason.trim()) return;
    adjustAttendance(selectedRecord.id, revisedStatus, adjustmentReason);
    setSelectedRecord(null);
  };

  const presentCount = attendanceRecords.filter((a) => a.status === 'PRESENT').length;
  const lateCount = attendanceRecords.filter((a) => a.status === 'LATE').length;
  const halfDayCount = attendanceRecords.filter((a) => a.status === 'HALF_DAY').length;

  return (
    <div className="space-y-5 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-6">
        <div>
          <div className="flex items-center gap-2 text-[#2563EB] text-xs font-bold uppercase tracking-wider mb-1">
            <FiClock />
            <span>Attendance & Timesheet Governance</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-[#0F172A] tracking-tight">
            Organization-Wide Attendance Monitoring
          </h1>
          <p className="text-[#64748B] text-sm mt-1">
            Track daily employee punch timings, detect tardiness and early exits, and audit manual adjustments.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-5 rounded-2xl">
          <div className="text-xs text-[#64748B] font-bold">Punched In On-Time (Present)</div>
          <div className="text-3xl font-black text-[#2563EB] mt-2">{presentCount}</div>
          <div className="text-xs text-[#64748B] mt-1">Within configured grace window</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl">
          <div className="text-xs text-[#64748B] font-bold">Late Arrivals</div>
          <div className="text-3xl font-black text-[#D97706] mt-2">{lateCount}</div>
          <div className="text-xs text-[#64748B] mt-1">Arrived past shift start + grace</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl">
          <div className="text-xs text-[#64748B] font-bold">Half-Day Records</div>
          <div className="text-3xl font-black text-[#64748B] mt-2">{halfDayCount}</div>
          <div className="text-xs text-[#64748B] mt-1">Under 8 hour threshold</div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="glass-panel rounded-2xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
            <FiCalendar className="text-[#2563EB]" />
            <span>Daily Attendance Register & Punch Timesheets</span>
          </h3>
          <span className="text-xs text-[#2563EB] font-semibold bg-[#EFF6FF] px-3 py-1 rounded-full border border-[#BFDBFE]">
            Strict Tamper-Proof Audit Logging
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-[#64748B] font-bold bg-[#F8FAFC]">
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Employee Name</th>
                <th className="py-3 px-3">Punch In</th>
                <th className="py-3 px-3">Punch Out</th>
                <th className="py-3 px-3">Duration</th>
                <th className="py-3 px-3">System Status</th>
                <th className="py-3 px-3">Audit Flags</th>
                <th className="py-3 px-3 text-right">Admin Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {attendanceRecords.map((att) => (
                <tr key={att.id} className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="py-3.5 px-3 font-mono text-[#64748B]">{att.date}</td>
                  <td className="py-3.5 px-3 font-bold text-[#0F172A]">{att.userName}</td>
                  <td className="py-3.5 px-3 text-[#2563EB] font-mono font-bold">{att.punchInTime || '—'}</td>
                  <td className="py-3.5 px-3 text-[#64748B] font-mono">{att.punchOutTime || 'Active Shift'}</td>
                  <td className="py-3.5 px-3 text-[#0F172A] font-medium">
                    {Math.floor(att.workingMinutes / 60)}h {att.workingMinutes % 60}m
                  </td>
                  <td className="py-3.5 px-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        att.status === 'PRESENT'
                          ? 'bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]'
                          : att.status === 'LATE'
                          ? 'bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]'
                          : 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]'
                      }`}
                    >
                      {att.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-[#64748B]">
                    {att.isModified ? (
                      <span className="text-[#D97706] font-bold text-[10px]">
                        Adjusted: {att.modificationReason}
                      </span>
                    ) : (
                      <span className="text-[#94A3B8] text-[10px]">Punched via biometric/web</span>
                    )}
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    <button
                      onClick={() => {
                        setSelectedRecord(att);
                        setRevisedStatus(att.status);
                        setAdjustmentReason('');
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-[#EFF6FF] hover:bg-[#E0E7FF] text-[#2563EB] border border-[#BFDBFE] text-[11px] font-bold flex items-center gap-1.5 ml-auto cursor-pointer transition-colors"
                    >
                      <FiEdit3 />
                      <span>Adjust</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjustment Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-[#0F172A]/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="modal-panel bg-white w-full max-w-md rounded-2xl p-6 border border-[#E2E8F0] shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h3 className="text-base font-bold text-[#0F172A]">
                Manual Timesheet Correction: {selectedRecord.userName}
              </h3>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-[#64748B] hover:text-[#0F172A] text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteAdjustment} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#0F172A] font-bold mb-1">Revised Shift Status</label>
                <select
                  value={revisedStatus}
                  onChange={(e) => setRevisedStatus(e.target.value as any)}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] font-semibold focus:outline-none focus:border-[#2563EB]"
                >
                  <option value="PRESENT">PRESENT (Full Day)</option>
                  <option value="LATE">LATE (Grace Exceeded)</option>
                  <option value="HALF_DAY">HALF_DAY (Partial Work)</option>
                  <option value="ABSENT">ABSENT</option>
                </select>
              </div>

              <div>
                <label className="block text-[#0F172A] font-bold mb-1">Audit Reason *</label>
                <textarea
                  required
                  rows={3}
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder="State authorized justification for timesheet override..."
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="px-4 py-2 rounded-xl bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0] text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl shimmer-button text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  Confirm Adjustment
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AttendanceOverview;
