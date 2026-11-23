import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiClock, FiCalendar } from 'react-icons/fi';
import { useApp } from '../../context/useApp';
import type { AttendanceRecord } from '../../types';

export const BDEAttendance: React.FC = () => {
  const {
    currentUser,
    punchState,
    punchInTime,
    punchIn,
    punchOut,
    attendanceRecords,
  } = useApp();

  const [currentClockTime, setCurrentClockTime] = useState<string>(() => {
    const d = new Date();
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    const s = d.getSeconds().toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  });

  const currentFormattedDate = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      const d = new Date();
      const h = d.getHours().toString().padStart(2, '0');
      const m = d.getMinutes().toString().padStart(2, '0');
      const s = d.getSeconds().toString().padStart(2, '0');
      setCurrentClockTime(`${h}:${m}:${s}`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const [liveDuration, setLiveDuration] = useState<string>('00h 00m 00s');

  useEffect(() => {
    if (punchState !== 'PUNCHED_IN' || !punchInTime) {
      setLiveDuration('00h 00m 00s');
      return;
    }

    const calculateElapsed = () => {
      const now = new Date();
      const [hours, minutes] = punchInTime.split(':').map(Number);
      const punchDate = new Date();
      punchDate.setHours(hours, minutes, 0, 0);

      let diffMs = now.getTime() - punchDate.getTime();
      if (diffMs < 0) diffMs = 0;

      const diffSec = Math.floor(diffMs / 1000);
      const h = Math.floor(diffSec / 3600);
      const m = Math.floor((diffSec % 3600) / 60);
      const s = diffSec % 60;

      const pad = (n: number) => n.toString().padStart(2, '0');
      setLiveDuration(`${pad(h)}h ${pad(m)}m ${pad(s)}s`);
    };

    calculateElapsed();
    const interval = setInterval(calculateElapsed, 1000);
    return () => clearInterval(interval);
  }, [punchState, punchInTime]);

  // Leave Modal State
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveSuccessToast, setLeaveSuccessToast] = useState(false);
  const [leaveType, setLeaveType] = useState('Casual Leave');
  const [leaveFrom, setLeaveFrom] = useState('');
  const [leaveTo, setLeaveTo] = useState('');
  const [leaveReason, setLeaveReason] = useState('');

  const handleLeaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowLeaveModal(false);
    setLeaveSuccessToast(true);
    setTimeout(() => setLeaveSuccessToast(false), 3500);
  };

  const myRecords = attendanceRecords.filter((r: AttendanceRecord) => r.userId === currentUser.id);

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {leaveSuccessToast && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E40AF] text-xs sm:text-sm font-bold flex items-center gap-3 shadow-md"
        >
          <FiCalendar className="text-xl shrink-0 text-[#2563EB]" />
          <span>Leave Request submitted successfully to Team Lead for review and approval!</span>
        </motion.div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-[#0F172A] tracking-tight flex items-center gap-2">
            <FiClock className="text-[#2563EB]" />
            <span>Shift Attendance & Punch Clock</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] font-medium mt-0.5">
            Real-time biometric punch tracking, shift hours, and attendance audit timesheet.
          </p>
        </div>

        <button
          onClick={() => setShowLeaveModal(true)}
          className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-[#0F172A] border border-[#E2E8F0] text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-xs transition-all cursor-pointer active:scale-95 self-start sm:self-auto"
        >
          <span>📅</span>
          <span>Request Leave</span>
        </button>
      </div>

      {/* Hero Live Punch Clock Banner (Deep Titanium Graphite) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0F172A] via-[#0B1120] to-[#0F172A] p-6 sm:p-8 lg:p-10 shadow-xl text-white select-none border border-[#1E293B]">
        <div className="w-64 h-64 rounded-full bg-[#2563EB]/15 absolute -top-12 -right-8 pointer-events-none blur-2xl" />
        <div className="w-48 h-48 rounded-full bg-[#3B82F6]/10 absolute -bottom-16 -left-12 pointer-events-none blur-2xl" />

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
              onClick={punchIn}
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
              onClick={punchOut}
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
              <span>Punched in at {punchInTime || '13:43'} · Currently working ({liveDuration})</span>
            ) : (
              <span>Punched out · Shift ended · Click "Punch In" to start working</span>
            )}
          </div>
        </div>
      </div>

      {/* Shift Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-5 rounded-2xl">
          <div className="text-xs text-[#64748B] font-semibold">Today's Punch In</div>
          <div className="text-2xl font-black text-[#0F172A] mt-1">{punchInTime || '—'}</div>
          <div className="text-[11px] text-[#64748B] mt-1">Official Shift: 09:30 AM</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl">
          <div className="text-xs text-[#64748B] font-semibold">Active Shift Duration</div>
          <div className="text-2xl font-black text-[#2563EB] font-mono mt-1">{liveDuration}</div>
          <div className="text-[11px] text-[#64748B] mt-1">Target: 8.0 hours/day</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl">
          <div className="text-xs text-[#64748B] font-semibold">Attendance Status</div>
          <div className="text-2xl font-black text-[#2563EB] mt-1">
            {punchState === 'PUNCHED_IN' ? 'PRESENT' : 'OFF SHIFT'}
          </div>
          <div className="text-[11px] text-[#64748B] mt-1">
            {punchState === 'PUNCHED_IN' ? 'Logged in & active' : 'Session closed'}
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
                  <td className="py-2.5 px-3 font-mono text-[#2563EB] font-bold">{rec.punchInTime || '—'}</td>
                  <td className="py-2.5 px-3 font-mono text-[#64748B]">{rec.punchOutTime || '—'}</td>
                  <td className="py-2.5 px-3 text-[#475569]">{rec.workingMinutes} mins</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
                      {rec.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Guidelines Card */}
      <div className="glass-panel p-5 rounded-2xl text-xs text-[#475569] space-y-2">
        <h4 className="font-bold text-[#0F172A]">Company Shift Attendance Guidelines:</h4>
        <ul className="list-disc list-inside space-y-1 text-[11px] text-[#64748B]">
          <li>Daily shift window is 09:30 AM to 06:30 PM with standard 15-minute grace period.</li>
          <li>Punching out before completing 4.5 hours is automatically audited as Half-Day.</li>
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
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] font-semibold focus:outline-none focus:border-[#2563EB]"
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
                    onChange={(e) => setLeaveFrom(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] font-semibold focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
                <div>
                  <label className="block text-[#0F172A] font-bold mb-1">To Date *</label>
                  <input
                    type="date"
                    required
                    value={leaveTo}
                    onChange={(e) => setLeaveTo(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] font-semibold focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#0F172A] font-bold mb-1">Reason for Leave *</label>
                <textarea
                  required
                  rows={3}
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="State the reason for leave request..."
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

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
                  className="px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold shadow-md cursor-pointer transition-all"
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
