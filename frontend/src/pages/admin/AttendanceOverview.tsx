import React, { useState } from 'react';
import { useApp } from '../../context/useApp';
import { motion } from 'framer-motion';
import {
  FiClock,
  FiCalendar,
  FiEdit3,
  FiCheckCircle,
  FiAlertCircle,
} from 'react-icons/fi';
import type { AttendanceRecord } from '../../types';
import { formatClock, toDateTimeLocalValue } from '../../utils/calculations';

type Feedback = { type: 'success' | 'error'; message: string };

const FeedbackBanner: React.FC<{ feedback: Feedback }> = ({ feedback }) => (
  <div
    className={`p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 border ${
      feedback.type === 'success'
        ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#047857]'
        : 'bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]'
    }`}
  >
    {feedback.type === 'success' ? <FiCheckCircle /> : <FiAlertCircle />}
    <span>{feedback.message}</span>
  </div>
);

const statusClass = (status: AttendanceRecord['status']): string => {
  switch (status) {
    case 'PRESENT':
      return 'bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]';
    case 'LATE':
      return 'bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]';
    case 'HALF_DAY':
      return 'bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1]';
    case 'MISSING_PUNCH_OUT':
      return 'bg-[#FDF2F8] text-[#BE185D] border border-[#FBCFE8]';
    default:
      return 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]';
  }
};

export const AttendanceOverview: React.FC = () => {
  const { attendanceRecords, adjustAttendance, attendanceCorrections, systemSettings, currentRole, currentUser } =
    useApp();

  const isTeamLead = currentRole === 'TEAM_LEAD';
  const scopedRecords = isTeamLead
    ? attendanceRecords.filter((record) => record.teamId === (currentUser.teamId || ''))
    : attendanceRecords;
  const correctionFor = (recordId: string) => attendanceCorrections.find((item) => item.recordId === recordId);

  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [revisedStatus, setRevisedStatus] = useState<AttendanceRecord['status']>('PRESENT');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [revisedPunchOut, setRevisedPunchOut] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const handleExecuteAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord || !adjustmentReason.trim()) return;
    const newPunchOutTime = revisedPunchOut ? new Date(revisedPunchOut).toISOString() : undefined;
    const adjusted = adjustAttendance(selectedRecord.id, revisedStatus, adjustmentReason, newPunchOutTime);
    if (!adjusted) {
      setFeedback({
        type: 'error',
        message: 'Correction was not applied. Check your permissions and provide a valid reason.',
      });
      return;
    }
    setFeedback({ type: 'success', message: 'Timesheet correction applied and logged locally.' });
    setSelectedRecord(null);
  };

  const presentCount = scopedRecords.filter((a) => a.status === 'PRESENT').length;
  const lateCount = scopedRecords.filter((a) => a.status === 'LATE').length;
  const halfDayCount = scopedRecords.filter((a) => a.status === 'HALF_DAY').length;
  const missingPunchOutCount = scopedRecords.filter((a) => a.status === 'MISSING_PUNCH_OUT').length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
        <div>
          <div className="flex items-center gap-2 text-[#059669] text-xs font-bold uppercase tracking-wider mb-1">
            <FiClock />
            <span>Attendance & Timesheet Governance</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-[#0F172A] tracking-tight">
            {isTeamLead
              ? `${currentUser.teamName || 'Your Team'} Attendance Monitoring`
              : 'Organization-Wide Attendance Monitoring'}
          </h1>
          <p className="text-[#64748B] text-sm mt-1">
            Track daily employee punch timings, detect tardiness and early exits, and audit manual adjustments.
          </p>
        </div>
      </div>

      {feedback && <FeedbackBanner feedback={feedback} />}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-[#CBD5E1] bg-white shadow-xs">
          <div className="text-xs text-[#64748B] font-bold">Punched In On-Time (Present)</div>
          <div className="text-3xl font-black text-[#059669] mt-2">{presentCount}</div>
          <div className="text-xs text-[#64748B] mt-1 font-medium">Within configured grace window</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-[#CBD5E1] bg-white shadow-xs">
          <div className="text-xs text-[#64748B] font-bold">Late Arrivals</div>
          <div className="text-3xl font-black text-[#D97706] mt-2">{lateCount}</div>
          <div className="text-xs text-[#64748B] mt-1 font-medium">Arrived past shift start + grace</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-[#CBD5E1] bg-white shadow-xs">
          <div className="text-xs text-[#64748B] font-bold">Half-Day Records</div>
          <div className="text-3xl font-black text-[#64748B] mt-2">{halfDayCount}</div>
          <div className="text-xs text-[#64748B] mt-1 font-medium">
            Under {systemSettings.halfDayThresholdHours} hour threshold
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-[#CBD5E1] bg-white shadow-xs">
          <div className="text-xs text-[#64748B] font-bold">Missing Punch-Out</div>
          <div className="text-3xl font-black text-[#BE185D] mt-2">{missingPunchOutCount}</div>
          <div className="text-xs text-[#64748B] mt-1 font-medium">Past dates without a recorded punch-out</div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="glass-panel rounded-2xl border border-[#CBD5E1] bg-white overflow-hidden shadow-xs">
        <div className="p-5 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3 bg-white">
          <div>
            <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
              <FiCalendar className="text-[#059669]" />
              <span>Daily Attendance Register & Punch Timesheets</span>
            </h3>
            <p className="text-xs text-[#64748B] mt-0.5">
              Automated punch audit with late arrival computation (09:00 AM + {systemSettings.lateGracePeriodMinutes}m grace).
            </p>
          </div>
          <span className="text-xs text-[#059669] font-bold bg-[#ECFDF5] px-3.5 py-1 rounded-full border border-[#A7F3D0]">
            Corrections require audit justification
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-[#64748B] font-bold bg-[#F8FAFC]">
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Employee Name</th>
                <th className="py-3.5 px-4">Punch In</th>
                <th className="py-3.5 px-4">Punch Out</th>
                <th className="py-3.5 px-4">Duration</th>
                <th className="py-3.5 px-4">System Status</th>
                <th className="py-3.5 px-4">Audit Flags & Reason</th>
                <th className="py-3.5 px-4 text-right">Supervisor Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {scopedRecords.map((att) => {
                const correction = correctionFor(att.id);
                return (
                <tr key={att.id} className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="py-3.5 px-4 font-mono text-[#64748B] font-semibold">{att.date}</td>
                  <td className="py-3.5 px-4 font-bold text-[#0F172A]">{att.userName}</td>
                  <td className="py-3.5 px-4 text-[#059669] font-mono font-bold">
                    {formatClock(att.punchInTime) || '—'}
                  </td>
                  <td
                    className={`py-3.5 px-4 font-mono ${
                      att.status === 'MISSING_PUNCH_OUT' ? 'text-[#BE185D] font-bold' : 'text-[#64748B]'
                    }`}
                  >
                    {formatClock(att.punchOutTime) ||
                      (att.status === 'MISSING_PUNCH_OUT' ? 'MISSING_PUNCH_OUT' : 'Active Shift')}
                  </td>
                  <td className="py-3.5 px-4 text-[#0F172A] font-medium">
                    {Math.floor(att.workingMinutes / 60)}h {att.workingMinutes % 60}m
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${statusClass(att.status)}`}>
                      {att.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-[#64748B]">
                    <div className="flex flex-col gap-1">
                      {att.earlyDeparture && (
                        <span className="text-[#D97706] font-bold text-[10px]">Early departure flagged</span>
                      )}
                      {att.isModified ? (
                        <span className="text-[#D97706] font-bold text-[10px]">
                          Adjusted: {att.modificationReason}
                        </span>
                      ) : (
                        <span className="text-[#94A3B8] text-[10px]">Punched via biometric/web</span>
                      )}
                      {correction && (
                        <span className="text-[#64748B] text-[10px] font-mono">
                          {correction.correctedByName} · {correction.previousStatus} → {correction.newStatus}
                          {(correction.previousPunchOutTime || correction.newPunchOutTime) &&
                            ` · ${formatClock(correction.previousPunchOutTime) || '—'} → ${
                              formatClock(correction.newPunchOutTime) || '—'
                            }`}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => {
                        setSelectedRecord(att);
                        setRevisedStatus(att.status);
                        setAdjustmentReason('');
                        setRevisedPunchOut(att.punchOutTime ? toDateTimeLocalValue(att.punchOutTime) : '');
                        setFeedback(null);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#ECFDF5] hover:bg-[#D1FAE5] text-[#059669] border border-[#A7F3D0] text-xs font-bold inline-flex items-center gap-1.5 ml-auto cursor-pointer transition-colors shadow-xs"
                    >
                      <FiEdit3 />
                      <span>Adjust</span>
                    </button>
                  </td>
                </tr>
                );
              })}
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
            className="modal-panel bg-white w-full max-w-md rounded-2xl p-4 sm:p-5 border border-[#E2E8F0] shadow-2xl space-y-4"
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
              {feedback?.type === 'error' && <FeedbackBanner feedback={feedback} />}
              <div>
                <label className="block text-[#0F172A] font-bold mb-1">Revised Shift Status</label>
                <select
                  value={revisedStatus}
                  onChange={(e) => setRevisedStatus(e.target.value as AttendanceRecord['status'])}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] font-semibold focus:outline-none focus:border-[#10B981]"
                >
                  <option value="PRESENT">PRESENT (Full Day)</option>
                  <option value="LATE">LATE (Grace Exceeded)</option>
                  <option value="HALF_DAY">HALF_DAY (Partial Work)</option>
                  <option value="ABSENT">ABSENT</option>
                  <option value="MISSING_PUNCH_OUT">MISSING_PUNCH_OUT</option>
                </select>
              </div>

              <div>
                <label className="block text-[#0F172A] font-bold mb-1">Revised Punch-Out Time (optional)</label>
                <input
                  type="datetime-local"
                  value={revisedPunchOut}
                  onChange={(e) => setRevisedPunchOut(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] font-semibold focus:outline-none focus:border-[#10B981]"
                />
                <p className="text-[10px] text-[#64748B] mt-1">
                  Leave blank to keep the recorded punch-out. Current:{' '}
                  {formatClock(selectedRecord.punchOutTime) || 'not recorded'}
                </p>
              </div>

              <div>
                <label className="block text-[#0F172A] font-bold mb-1">Audit Reason *</label>
                <textarea
                  required
                  rows={3}
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder="State authorized justification for timesheet override..."
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] focus:outline-none focus:border-[#10B981]"
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
