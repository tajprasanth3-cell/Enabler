import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { FiClock } from 'react-icons/fi';
import { useApp } from '../../context/useApp';
import type { AttendanceRecord } from '../../types';
import { formatClock, parseClockToMinutes } from '../../utils/calculations';

const formatClockTime = (date: Date): string => {
  const pad = (value: number) => value.toString().padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const formatLiveDuration = (totalSeconds: number): string => {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const pad = (value: number) => value.toString().padStart(2, '0');
  return `${pad(Math.floor(safe / 3600))}h ${pad(Math.floor((safe % 3600) / 60))}m ${pad(safe % 60)}s`;
};

const formatDuration = (minutes: number): string => {
  const safe = Math.max(0, Math.floor(minutes));
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}h ${String(safe % 60).padStart(2, '0')}m`;
};

const getRecordMinutes = (record: AttendanceRecord): number => {
  const start = parseClockToMinutes(record.punchInTime);
  const end = parseClockToMinutes(record.punchOutTime);
  if (start !== null && end !== null && end >= start) return end - start;
  return record.workingMinutes;
};

const getStatusClass = (status: AttendanceRecord['status']): string => {
  if (status === 'MISSING_PUNCH_OUT') return 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]';
  if (status === 'HALF_DAY') return 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]';
  if (status === 'LATE') return 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]';
  return 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]';
};

export const BDEAttendance: React.FC = () => {
  const {
    currentUser,
    punchState,
    punchInTime,
    punchIn,
    punchOut,
    attendanceRecords,
    systemSettings,
    submitLeaveRequest,
  } = useApp();

  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const currentClockTime = useMemo(() => formatClockTime(now), [now]);
  const currentFormattedDate = useMemo(
    () =>
      new Intl.DateTimeFormat('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(now),
    [now]
  );
  const todayKey = useMemo(() => now.toISOString().slice(0, 10), [now]);
  const todayRecord = attendanceRecords.find(
    (rec: AttendanceRecord) => rec.userId === currentUser.id && rec.date === todayKey
  );

  const liveDuration = useMemo(() => {
    if (punchState !== 'PUNCHED_IN' || !todayRecord?.punchInTime) return '00h 00m 00s';
    const startMinutes = parseClockToMinutes(todayRecord.punchInTime);
    const nowMinutes = parseClockToMinutes(now.toISOString());
    if (startMinutes === null || nowMinutes === null) return '00h 00m 00s';
    const inSeconds = new Date(todayRecord.punchInTime).getSeconds();
    const startSeconds = startMinutes * 60 + (Number.isNaN(inSeconds) ? 0 : inSeconds);
    const nowSeconds = nowMinutes * 60 + now.getSeconds();
    return formatLiveDuration(nowSeconds - startSeconds);
  }, [now, punchState, todayRecord]);

  const [punchFeedback, setPunchFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handlePunchOut = () => {
    const succeeded = punchOut();
    setPunchFeedback(
      succeeded
        ? { type: 'success', message: 'Punched out successfully.' }
        : { type: 'error', message: 'No open shift was found to punch out from.' }
    );
  };

  const handlePunchIn = () => {
    const result = punchIn();
    setPunchFeedback({ type: result.ok ? 'success' : 'error', message: result.message });
  };

  // Leave Modal State
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveType, setLeaveType] = useState('Casual Leave');
  const [leaveFrom, setLeaveFrom] = useState('');
  const [leaveTo, setLeaveTo] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveError, setLeaveError] = useState('');
  const [leaveSuccess, setLeaveSuccess] = useState('');

  const handleLeaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLeaveError('');
    setLeaveSuccess('');
    if (!leaveReason.trim()) {
      setLeaveError('State a reason for your leave request.');
      return;
    }
    if (!leaveFrom || !leaveTo) {
      setLeaveError('Select both a from date and a to date.');
      return;
    }
    if (leaveTo < leaveFrom) {
      setLeaveError('The to date cannot be earlier than the from date.');
      return;
    }
    if (!submitLeaveRequest(`${leaveType}: ${leaveReason.trim()}`, leaveFrom, leaveTo)) {
      setLeaveError('Could not submit your leave request. Check the dates and reason.');
      return;
    }
    setLeaveFrom('');
    setLeaveTo('');
    setLeaveReason('');
    setLeaveSuccess('Leave request submitted for Team Lead review.');
  };

  const myRecords = attendanceRecords
    .filter((rec: AttendanceRecord) => rec.userId === currentUser.id)
    .sort((a: AttendanceRecord, b: AttendanceRecord) => b.date.localeCompare(a.date));

  const shiftStart = formatClock(systemSettings.workdayStartTime) || systemSettings.workdayStartTime;
  const shiftEnd = formatClock(systemSettings.workdayEndTime) || systemSettings.workdayEndTime;
  const displayPunchIn = formatClock(todayRecord?.punchInTime) || punchInTime || '—';
  const displayStatus =
    todayRecord?.status || (punchState === 'PUNCHED_IN' ? 'PRESENT' : punchState === 'PUNCHED_OUT' ? 'OFF SHIFT' : 'NOT PUNCHED');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-[#0F172A] tracking-tight flex items-center gap-2">
            <FiClock className="text-[#059669]" />
            <span>Shift Attendance & Punch Clock</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] font-medium mt-0.5">
            Real-time biometric punch tracking, shift hours, and attendance audit timesheet.
          </p>
        </div>

        <button
          onClick={() => {
            setLeaveError('');
            setLeaveSuccess('');
            setShowLeaveModal(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-[#0F172A] border border-[#E2E8F0] text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-xs transition-all cursor-pointer active:scale-95 self-start sm:self-auto"
        >
          <span>📅</span>
          <span>Request Leave</span>
        </button>
      </div>

      {/* Hero Live Punch Clock Banner (Deep Titanium Graphite) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0F172A] via-[#0B1120] to-[#0F172A] p-6 sm:p-8 lg:p-10 shadow-xl text-white select-none border border-[#1E293B]">
        <div className="w-64 h-64 rounded-full bg-[#10B981]/15 absolute -top-12 -right-8 pointer-events-none blur-2xl" />
        <div className="w-48 h-48 rounded-full bg-[#34D399]/10 absolute -bottom-16 -left-12 pointer-events-none blur-2xl" />

        <div className="relative z-10 space-y-4 sm:space-y-5">
          <div>
            <div className="text-5xl sm:text-6xl font-black text-white tracking-tight leading-none font-sans">
              {currentClockTime}
            </div>
            <div className="text-xs sm:text-sm text-[#94A3B8] font-normal mt-2">
              {currentFormattedDate}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              onClick={handlePunchIn}
              disabled={punchState === 'PUNCHED_IN'}
              className={`px-5 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shadow-sm ${
                punchState === 'PUNCHED_IN'
                  ? 'bg-white text-[#0F172A] cursor-default'
                  : 'bg-white hover:bg-slate-100 text-[#0F172A] cursor-pointer hover:scale-105 active:scale-95'
              }`}
            >
              <span>⏱</span>
              <span>Punch In</span>
            </button>

            <button
              onClick={handlePunchOut}
              disabled={punchState !== 'PUNCHED_IN'}
              className={`px-5 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all border ${
                punchState === 'PUNCHED_IN'
                  ? 'bg-[#0B1120]/90 hover:bg-[#252830] text-slate-100 border-[#353A47] shadow-xs cursor-pointer hover:scale-105 active:scale-95'
                  : 'bg-[#0F172A]/60 text-slate-500 border-[#1E293B]/50 cursor-not-allowed'
              }`}
            >
              <span>🚪</span>
              <span>Punch Out</span>
            </button>
          </div>

          <div className="text-xs sm:text-sm text-[#94A3B8] font-normal pt-0.5">
            {punchState === 'PUNCHED_IN' ? (
              <span>Punched in at {displayPunchIn} · Currently working ({liveDuration})</span>
            ) : punchState === 'PUNCHED_OUT' ? (
              <span>Punched out at {formatClock(todayRecord?.punchOutTime) || '—'} · Shift ended</span>
            ) : (
              <span>Not punched in yet · Click "Punch In" to start working</span>
            )}
          </div>
          {punchFeedback && (
            <p className={`text-xs font-semibold ${punchFeedback.type === 'error' ? 'text-[#FCA5A5]' : 'text-[#A7F3D0]'}`}>
              {punchFeedback.message}
            </p>
          )}
        </div>
      </div>

      {/* Shift Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-5 rounded-2xl">
          <div className="text-xs text-[#64748B] font-semibold">Today's Punch In</div>
          <div className="text-2xl font-black text-[#0F172A] mt-1">{displayPunchIn}</div>
          <div className="text-[11px] text-[#64748B] mt-1">Official Shift: {shiftStart} – {shiftEnd}</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl">
          <div className="text-xs text-[#64748B] font-semibold">Active Shift Duration</div>
          <div className="text-2xl font-black text-[#059669] font-mono mt-1">
            {punchState === 'PUNCHED_IN' ? liveDuration : todayRecord ? formatDuration(getRecordMinutes(todayRecord)) : '00h 00m 00s'}
          </div>
          <div className="text-[11px] text-[#64748B] mt-1">Full-day target: {systemSettings.fullDayThresholdHours} hours</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl">
          <div className="text-xs text-[#64748B] font-semibold">Attendance Status</div>
          <div className="text-2xl font-black text-[#059669] mt-1">{displayStatus}</div>
          <div className="text-[11px] text-[#64748B] mt-1">
            {todayRecord?.earlyDeparture
              ? 'Early departure recorded'
              : todayRecord
                ? `Logged: ${formatDuration(getRecordMinutes(todayRecord))}`
                : 'No attendance record for today'}
          </div>
        </div>
      </div>

      {/* Recent Attendance Logs Table */}
      <div className="glass-panel p-5 rounded-2xl space-y-3">
        <h4 className="font-bold text-[#0F172A] text-sm">Personal Punch & Attendance Audit History</h4>
        <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-[#64748B] font-bold bg-[#F8FAFC]">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Punch In</th>
                <th className="py-2.5 px-3">Punch Out</th>
                <th className="py-2.5 px-3">Logged Duration</th>
                <th className="py-2.5 px-3">Audit Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {myRecords.map((rec: AttendanceRecord) => (
                <tr key={rec.id} className="hover:bg-[#F8FAFC]">
                  <td className="py-2.5 px-3 font-semibold text-[#0F172A]">{rec.date}</td>
                  <td className="py-2.5 px-3 font-mono text-[#059669] font-bold">{formatClock(rec.punchInTime) || '—'}</td>
                  <td className="py-2.5 px-3 font-mono text-[#64748B]">{formatClock(rec.punchOutTime) || '—'}</td>
                  <td className="py-2.5 px-3 text-[#475569]">
                    {rec.punchInTime ? formatDuration(getRecordMinutes(rec)) : '—'}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusClass(rec.status)}`}>
                      {rec.status}
                    </span>
                    {rec.earlyDeparture && (
                      <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]">
                        EARLY EXIT
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {myRecords.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-xs text-[#64748B]">
                    No attendance records found for your account yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Guidelines Card */}
      <div className="glass-panel p-5 rounded-2xl text-xs text-[#475569] space-y-2">
        <h4 className="font-bold text-[#0F172A]">Company Shift Attendance Guidelines:</h4>
        <ul className="list-disc list-inside space-y-1 text-[11px] text-[#64748B]">
          <li>
            Daily shift window is {shiftStart} to {shiftEnd} with a {systemSettings.lateGracePeriodMinutes}-minute late grace period and a{' '}
            {systemSettings.earlyExitGracePeriodMinutes}-minute early-exit grace period.
          </li>
          <li>
            Punching out before {systemSettings.halfDayThresholdHours} hours is audited as Half-Day; {systemSettings.fullDayThresholdHours} hours counts as a full day.
          </li>
          <li>All attendance timestamps are system-logged with tamper-proof security auditing.</li>
        </ul>
      </div>

      {/* Leave Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-[#0F172A]/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="modal-panel bg-white w-full max-w-lg rounded-2xl p-6 border border-[#E2E8F0] shadow-2xl space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E8F0] pb-3">
              <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                <span>📅</span>
                <span>Request Leave / Time Off</span>
              </h3>
              <button
                onClick={() => setShowLeaveModal(false)}
                className="text-[#64748B] hover:text-[#0F172A] text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleLeaveSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#0F172A] font-bold mb-1">Leave Type *</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] font-semibold focus:outline-none focus:border-[#10B981]"
                >
                  <option value="Casual Leave">Casual Leave (CL)</option>
                  <option value="Sick Leave">Sick Leave (SL)</option>
                  <option value="Half Day">Half Day (First/Second Half)</option>
                  <option value="Planned Vacation">Planned Time Off</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#0F172A] font-bold mb-1">From Date *</label>
                  <input
                    type="date"
                    required
                    value={leaveFrom}
                    onChange={(e) => {
                      setLeaveFrom(e.target.value);
                      setLeaveError('');
                      setLeaveSuccess('');
                    }}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] font-semibold focus:outline-none focus:border-[#10B981]"
                  />
                </div>
                <div>
                  <label className="block text-[#0F172A] font-bold mb-1">To Date *</label>
                  <input
                    type="date"
                    required
                    value={leaveTo}
                    onChange={(e) => {
                      setLeaveTo(e.target.value);
                      setLeaveError('');
                      setLeaveSuccess('');
                    }}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] font-semibold focus:outline-none focus:border-[#10B981]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#0F172A] font-bold mb-1">Reason for Leave *</label>
                <textarea
                  required
                  rows={3}
                  value={leaveReason}
                  onChange={(e) => {
                    setLeaveReason(e.target.value);
                    setLeaveError('');
                    setLeaveSuccess('');
                  }}
                  placeholder="State the reason for leave request..."
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] focus:outline-none focus:border-[#10B981]"
                />
              </div>

              {leaveError && (
                <p className="text-[11px] font-semibold text-[#B91C1C] bg-[#FEF2F2] border border-[#FECACA] rounded-xl p-2.5">
                  {leaveError}
                </p>
              )}
              {leaveSuccess && (
                <p className="text-[11px] font-semibold text-[#15803D] bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-2.5">
                  {leaveSuccess}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0] text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#10B981] hover:bg-[#047857] text-white text-xs font-bold shadow-md cursor-pointer transition-all"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default BDEAttendance;
