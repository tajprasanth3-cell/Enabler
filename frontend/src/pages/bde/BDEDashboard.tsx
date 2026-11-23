import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiClock,
  FiPhoneCall,
  FiCalendar,
  FiTrendingUp,
  FiPhone,
  FiCheckCircle,
  FiAward,
  FiLayers,
  FiChevronDown,
  FiChevronUp,
  FiMaximize2,
  FiMinimize2,
} from 'react-icons/fi';
import confetti from 'canvas-confetti';
import { useApp } from '../../context/useApp';
import type { Lead, LeadStatus, FollowUpItem } from '../../types';
import { APP_ROUTES, LEAD_STATUS_CONFIG } from '../../utils/constants';
import { calculateConversionRate } from '../../utils/calculations';
import StatusBadge from '../../components/common/Badge';

export const BDEDashboard: React.FC = () => {
  const navigate = useNavigate();
  const {
    leads,
    currentUser,
    followUps,
    punchState,
    punchInTime,
    punchIn,
    punchOut,
    updateLeadStatus,
    getAllowedStatuses,
  } = useApp();

  // Workbench Collapse States
  const [isWorkbenchCollapsed, setIsWorkbenchCollapsed] = useState(false);
  const [isMilestonesCollapsed, setIsMilestonesCollapsed] = useState(false);
  const [isPriorityCallsCollapsed, setIsPriorityCallsCollapsed] = useState(false);

  // Live Real-Time Wall Clock (Matches "22:05:47" in user image)
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
    const clockTimer = setInterval(() => {
      const d = new Date();
      const h = d.getHours().toString().padStart(2, '0');
      const m = d.getMinutes().toString().padStart(2, '0');
      const s = d.getSeconds().toString().padStart(2, '0');
      setCurrentClockTime(`${h}:${m}:${s}`);
    }, 1000);
    return () => clearInterval(clockTimer);
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Modals for Top Action Buttons
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportSuccessToast, setReportSuccessToast] = useState(false);
  const [todayCallsDone, setTodayCallsDone] = useState(18);
  const [todayPitched, setTodayPitched] = useState(12);
  const [todayConversions, setTodayConversions] = useState(2);
  const [todayNotes, setTodayNotes] = useState('');

  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveSuccessToast, setLeaveSuccessToast] = useState(false);
  const [leaveType, setLeaveType] = useState('Casual Leave');
  const [leaveFrom, setLeaveFrom] = useState('');
  const [leaveTo, setLeaveTo] = useState('');
  const [leaveReason, setLeaveReason] = useState('');

  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowReportModal(false);
    setReportSuccessToast(true);
    setTimeout(() => setReportSuccessToast(false), 3500);
  };

  const handleLeaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowLeaveModal(false);
    setLeaveSuccessToast(true);
    setTimeout(() => setLeaveSuccessToast(false), 3500);
  };

  // Lead metrics for BDE
  const myLeads = leads.filter((l: Lead) => l.currentBdeId === currentUser.id);
  const pendingLeads = myLeads.filter((l: Lead) =>
    ['NEW', 'CONTACTED', 'FOLLOW_UP_REQUIRED'].includes(l.status)
  );
  const convertedLeads = myLeads.filter((l: Lead) => l.status === 'CONVERTED');
  const myConversionRate = calculateConversionRate(convertedLeads.length, myLeads.length);

  // Quick Call Disposition Modal for Priority Leads
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [newStatus, setNewStatus] = useState<LeadStatus>('CONTACTED');
  const [callRemarks, setCallRemarks] = useState('');
  const [showDispositionModal, setShowDispositionModal] = useState(false);
  const allowedStatuses = selectedLead ? getAllowedStatuses(selectedLead.status) : [];

  const handleOpenDisposition = (lead: Lead) => {
    const allowedStatuses = getAllowedStatuses(lead.status);
    setSelectedLead(lead);
    setNewStatus(allowedStatuses[0] || lead.status);
    setCallRemarks('');
    setShowDispositionModal(true);
  };

  const handleSaveDisposition = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !callRemarks.trim()) return;

    if (newStatus === 'CONVERTED') {
      confetti({
        particleCount: 110,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#2563EB', '#3B82F6', '#818CF8', '#1D4ED8'],
      });
    }

    updateLeadStatus(selectedLead.id, newStatus, callRemarks);
    setShowDispositionModal(false);
    setSelectedLead(null);
  };

  return (
    <div className="space-y-6 sm:space-y-7">
      {/* Toast Alert for Daily Report Submission */}
      {reportSuccessToast && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E40AF] text-xs sm:text-sm font-bold flex items-center gap-3 shadow-md"
        >
          <FiCheckCircle className="text-xl shrink-0 text-[#2563EB]" />
          <span>Daily Work Report submitted successfully to Team Lead! Great progress today.</span>
        </motion.div>
      )}

      {/* Toast Alert for Leave Request */}
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

      {/* =========================================================================
          1. HEADER & GREETING BAR (Exact match to user screenshot)
          ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight flex items-center gap-2">
            <span>{getGreeting()}, {currentUser.name.split(' ')[0] || 'Prasanth'}!</span>
            <span className="text-2xl sm:text-3xl">👋</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] font-medium mt-0.5">
            {currentFormattedDate}
          </p>
        </div>

        {/* Top Right Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <button
            onClick={() => setShowReportModal(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#3B82F6] hover:from-[#1D4ED8] hover:to-[#2563EB] text-white text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer active:scale-95"
          >
            <span>📊</span>
            <span>Submit Today's Report</span>
          </button>

          <button
            onClick={() => setShowLeaveModal(true)}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-[#0F172A] border border-[#E2E8F0] text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-xs transition-all cursor-pointer active:scale-95"
          >
            <span>📅</span>
            <span>Request Leave</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          2. HERO LIVE PUNCH CLOCK BANNER (Exact visual match to user screenshot in Titanium Graphite)
          ========================================================================= */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0F172A] via-[#0B1120] to-[#0F172A] p-6 sm:p-8 lg:p-10 shadow-xl text-white select-none border border-[#1E293B]">
        {/* Soft Circular Indigo Glow Shapes */}
        <div className="w-64 h-64 rounded-full bg-[#2563EB]/15 absolute -top-12 -right-8 pointer-events-none blur-2xl" />
        <div className="w-48 h-48 rounded-full bg-[#3B82F6]/10 absolute -bottom-16 -left-12 pointer-events-none blur-2xl" />

        <div className="relative z-10 space-y-4 sm:space-y-5">
          {/* Digital Clock & Date */}
          <div>
            <div className="text-5xl sm:text-6xl font-black text-white tracking-tight leading-none font-sans">
              {currentClockTime}
            </div>
            <div className="text-xs sm:text-sm text-[#94A3B8] font-normal mt-2">
              {currentFormattedDate}
            </div>
          </div>

          {/* Punch In & Punch Out Side-by-Side Pill Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              onClick={punchIn}
              disabled={punchState === 'PUNCHED_IN'}
              className={`px-5 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shadow-sm ${punchState === 'PUNCHED_IN'
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
              className={`px-5 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all border ${punchState === 'PUNCHED_IN'
                ? 'bg-[#0B1120]/90 hover:bg-[#252830] text-slate-100 border-[#353A47] shadow-xs cursor-pointer hover:scale-105 active:scale-95'
                : 'bg-[#0F172A]/60 text-slate-500 border-[#1E293B]/50 cursor-not-allowed'
                }`}
            >
              <span>🚪</span>
              <span>Punch Out</span>
            </button>
          </div>

          {/* Punch Status Line */}
          <div className="text-xs sm:text-sm text-[#94A3B8] font-normal pt-0.5">
            {punchState === 'PUNCHED_IN' ? (
              <span>Punched in at {punchInTime || '13:43'} · Currently working</span>
            ) : (
              <span>Punched out · Shift ended · Click "Punch In" to start working</span>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. RESPONSIVE KPI STAT CARDS
          ========================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-3.5 sm:gap-4">
        <motion.div
          whileHover={{ y: -2 }}
          onClick={() => navigate(APP_ROUTES.BDE.LEADS_QUEUE)}
          className="glass-panel p-4 sm:p-5 rounded-2xl cursor-pointer hover:border-[#BFDBFE] transition-all min-w-0"
        >
          <div className="flex items-center justify-between text-[#64748B] text-xs font-bold">
            <span className="truncate">Total Assigned Leads</span>
            <div className="p-2 rounded-xl bg-[#EFF6FF] text-[#2563EB]">
              <FiPhoneCall className="text-base" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#0F172A] mt-2">{myLeads.length}</div>
          <div className="text-xs text-[#2563EB] mt-1 font-semibold flex items-center gap-1">
            <FiLayers />
            <span>Active Queue</span>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          onClick={() => navigate(APP_ROUTES.BDE.LEADS_QUEUE)}
          className="glass-panel p-4 sm:p-5 rounded-2xl cursor-pointer hover:border-[#BFDBFE] transition-all min-w-0"
        >
          <div className="flex items-center justify-between text-[#64748B] text-xs font-bold">
            <span className="truncate">Pending / To Call</span>
            <div className="p-2 rounded-xl bg-[#EFF6FF] text-[#2563EB]">
              <FiClock className="text-base" />
            </div>
          </div>
          <div
            className={`text-2xl sm:text-3xl font-black mt-2 ${pendingLeads.length === 0 ? 'text-[#D97706]' : 'text-[#0F172A]'
              }`}
          >
            {pendingLeads.length}
          </div>
          <div className="text-xs text-[#64748B] mt-1">
            {pendingLeads.length === 0 ? 'Queue Done' : 'Awaiting Outreach Today'}
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          onClick={() => navigate(APP_ROUTES.BDE.PERFORMANCE)}
          className="glass-panel p-4 sm:p-5 rounded-2xl cursor-pointer hover:border-[#BFDBFE] transition-all min-w-0"
        >
          <div className="flex items-center justify-between text-[#64748B] text-xs font-bold">
            <span className="truncate">Conversions</span>
            <div className="p-2 rounded-xl bg-[#EFF6FF] text-[#2563EB]">
              <FiCheckCircle className="text-base" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#2563EB] mt-2">{convertedLeads.length}</div>
          <div className="text-xs text-[#64748B] mt-1 font-medium flex items-center gap-1">
            <FiAward />
            <span>Closed Enrollments</span>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          onClick={() => navigate(APP_ROUTES.BDE.PERFORMANCE)}
          className="glass-panel p-4 sm:p-5 rounded-2xl cursor-pointer hover:border-[#BFDBFE] transition-all min-w-0"
        >
          <div className="flex items-center justify-between text-[#64748B] text-xs font-bold">
            <span className="truncate">Conversion Rate</span>
            <div className="p-2 rounded-xl bg-[#EFF6FF] text-[#2563EB]">
              <FiTrendingUp className="text-base" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#2563EB] mt-2">{myConversionRate}%</div>
          <div className="text-xs text-[#64748B] mt-1 font-medium">Monthly Win Rate</div>
        </motion.div>
      </div>

      {/* =========================================================================
          4. WORKBENCH CONTROLS HEADER (With Expand / Collapse Toggle)
          ========================================================================= */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h2 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
            <span>My Workbench Cockpit</span>
          </h2>
          <p className="text-xs text-[#64748B]">
            Daily productivity milestones, quick launchpad, and immediate priority calls.
          </p>
        </div>

        {/* Global Collapse Toggle for Workbench */}
        <button
          onClick={() => setIsWorkbenchCollapsed(!isWorkbenchCollapsed)}
          className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-bold text-[#2563EB] flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
        >
          {isWorkbenchCollapsed ? (
            <>
              <FiMaximize2 className="text-xs" />
              <span>Expand Workbench</span>
            </>
          ) : (
            <>
              <FiMinimize2 className="text-xs" />
              <span>Collapse Workbench</span>
            </>
          )}
        </button>
      </div>

      {/* =========================================================================
          5. COLLAPSIBLE WORKBENCH CONTENT
          ========================================================================= */}
      <AnimatePresence>
        {!isWorkbenchCollapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-6 overflow-hidden"
          >
            {/* Section A: Target Progress Bar (Collapsible) */}
            <div className="glass-panel p-5 rounded-2xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div
                  onClick={() => setIsMilestonesCollapsed(!isMilestonesCollapsed)}
                  className="flex items-center gap-2 cursor-pointer select-none"
                >
                  <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                    <FiAward className="text-[#2563EB]" />
                    <span>Daily Calling & Conversion Milestones</span>
                  </h3>
                  {isMilestonesCollapsed ? (
                    <FiChevronDown className="text-sm text-[#64748B]" />
                  ) : (
                    <FiChevronUp className="text-sm text-[#64748B]" />
                  )}
                </div>

                <span className="text-xs font-mono font-bold text-[#2563EB] bg-[#EFF6FF] px-3 py-1 rounded-full border border-[#BFDBFE]">
                  72% Goal Completed
                </span>
              </div>

              {!isMilestonesCollapsed && (
                <div className="space-y-3 pt-1">
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-[#64748B]">Daily Candidate Call Target (18 of 25 calls made)</span>
                      <span className="font-mono text-[#2563EB] font-bold">72%</span>
                    </div>
                    <div className="w-full bg-[#E2E8F0] h-2.5 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-[#2563EB] to-[#3B82F6] rounded-full w-[72%]" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-[#64748B]">Closed Enrollment Target (2 of 3 conversions)</span>
                      <span className="font-mono text-[#2563EB] font-bold">66%</span>
                    </div>
                    <div className="w-full bg-[#E2E8F0] h-2.5 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-[#2563EB] to-[#818CF8] rounded-full w-[66%]" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Section B: Quick Launchpad Cards (Direct navigation to dedicated pages) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4">
              <motion.div
                whileHover={{ y: -2 }}
                onClick={() => navigate(APP_ROUTES.BDE.LEADS_QUEUE)}
                className="glass-panel p-5 rounded-2xl cursor-pointer hover:border-[#BFDBFE] transition-all group min-w-0"
              >
                <div className="flex items-center justify-between">
                  <div className="p-3 rounded-xl bg-[#EFF6FF] text-[#2563EB] group-hover:scale-110 transition-transform">
                    <FiPhoneCall className="text-xl" />
                  </div>
                  <span className="text-[10px] font-bold text-[#2563EB] uppercase tracking-wider">Queue</span>
                </div>
                <h4 className="text-sm font-bold text-[#0F172A] mt-3">Working Queue</h4>
                <p className="text-xs text-[#64748B] mt-1">
                  {pendingLeads.length} candidate leads waiting in your working queue.
                </p>
                <div className="mt-3 text-xs font-bold text-[#2563EB] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  <span>Open Calling Queue</span>
                  <span>→</span>
                </div>
              </motion.div>

              <motion.div
                whileHover={{ y: -2 }}
                onClick={() => navigate(APP_ROUTES.BDE.FOLLOW_UPS)}
                className="glass-panel p-5 rounded-2xl cursor-pointer hover:border-[#BFDBFE] transition-all group min-w-0"
              >
                <div className="flex items-center justify-between">
                  <div className="p-3 rounded-xl bg-[#EFF6FF] text-[#2563EB] group-hover:scale-110 transition-transform">
                    <FiCalendar className="text-xl" />
                  </div>
                  <span className="text-[10px] font-bold text-[#2563EB] uppercase tracking-wider">Agenda</span>
                </div>
                <h4 className="text-sm font-bold text-[#0F172A] mt-3">Follow-up Calendar</h4>
                <p className="text-xs text-[#64748B] mt-1">
                  {followUps.filter((f: FollowUpItem) => f.status === 'PENDING').length} scheduled callbacks requiring call today.
                </p>
                <div className="mt-3 text-xs font-bold text-[#2563EB] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  <span>Open Follow-ups</span>
                  <span>→</span>
                </div>
              </motion.div>

              <motion.div
                whileHover={{ y: -2 }}
                onClick={() => navigate(APP_ROUTES.BDE.ATTENDANCE)}
                className="glass-panel p-5 rounded-2xl cursor-pointer hover:border-[#BFDBFE] transition-all group min-w-0"
              >
                <div className="flex items-center justify-between">
                  <div className="p-3 rounded-xl bg-[#EFF6FF] text-[#2563EB] group-hover:scale-110 transition-transform">
                    <FiClock className="text-xl" />
                  </div>
                  <span className="text-[10px] font-bold text-[#2563EB] uppercase tracking-wider">Timesheet</span>
                </div>
                <h4 className="text-sm font-bold text-[#0F172A] mt-3">Attendance & Punch</h4>
                <p className="text-xs text-[#64748B] mt-1">
                  {punchState === 'PUNCHED_IN' ? 'Active on shift' : 'Currently punched out'}
                </p>
                <div className="mt-3 text-xs font-bold text-[#2563EB] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  <span>Open Timesheet</span>
                  <span>→</span>
                </div>
              </motion.div>

              <motion.div
                whileHover={{ y: -2 }}
                onClick={() => navigate(APP_ROUTES.BDE.PERFORMANCE)}
                className="glass-panel p-5 rounded-2xl cursor-pointer hover:border-[#BFDBFE] transition-all group min-w-0"
              >
                <div className="flex items-center justify-between">
                  <div className="p-3 rounded-xl bg-[#EFF6FF] text-[#2563EB] group-hover:scale-110 transition-transform">
                    <FiTrendingUp className="text-xl" />
                  </div>
                  <span className="text-[10px] font-bold text-[#2563EB] uppercase tracking-wider">Quota</span>
                </div>
                <h4 className="text-sm font-bold text-[#0F172A] mt-3">My Performance</h4>
                <p className="text-xs text-[#64748B] mt-1">
                  {myConversionRate}% Win Rate with {convertedLeads.length} enrollments.
                </p>
                <div className="mt-3 text-xs font-bold text-[#2563EB] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  <span>Open Analytics</span>
                  <span>→</span>
                </div>
              </motion.div>
            </div>

            {/* Section C: Immediate Priority Calls (Collapsible) */}
            <div className="glass-panel rounded-2xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div
                  onClick={() => setIsPriorityCallsCollapsed(!isPriorityCallsCollapsed)}
                  className="flex items-center gap-2 cursor-pointer select-none"
                >
                  <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                    <FiPhone className="text-[#2563EB]" />
                    <span>Immediate Priority Calls (Next in Line)</span>
                  </h3>
                  {isPriorityCallsCollapsed ? (
                    <FiChevronDown className="text-sm text-[#64748B]" />
                  ) : (
                    <FiChevronUp className="text-sm text-[#64748B]" />
                  )}
                </div>

                <button
                  onClick={() => navigate(APP_ROUTES.BDE.LEADS_QUEUE)}
                  className="text-xs font-bold text-[#2563EB] hover:underline cursor-pointer"
                >
                  View Full Queue ({pendingLeads.length}) →
                </button>
              </div>

              {!isPriorityCallsCollapsed && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
                  {pendingLeads.slice(0, 3).map((lead: Lead) => (
                    <div
                      key={lead.id}
                      className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-[#0F172A]">{lead.candidateName}</span>
                          <StatusBadge status={lead.status} />
                        </div>
                        <div className="text-[11px] text-[#64748B] font-mono mt-0.5">{lead.phone}</div>
                        <div className="text-[11px] text-[#475569] mt-1">
                          Education: {lead.education || 'Graduate'}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between">
                        <a
                          href={`tel:${lead.phone}`}
                          className="px-2.5 py-1 rounded-lg bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] font-bold text-[10px] flex items-center gap-1 hover:bg-[#E0E7FF]"
                        >
                          <FiPhone />
                          <span>Call Now</span>
                        </a>
                        <button
                          onClick={() => handleOpenDisposition(lead)}
                          className="px-2.5 py-1 rounded-lg shimmer-button text-white font-bold text-[10px] cursor-pointer"
                        >
                          Log Disposition
                        </button>
                      </div>
                    </div>
                  ))}
                  {pendingLeads.length === 0 && (
                    <div className="col-span-3 text-center py-6 text-xs text-[#64748B]">
                      All priority leads have been called today! 🎉
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =========================================================================
          SUBMIT REPORT MODAL
          ========================================================================= */}
      {showReportModal && (
        <div className="fixed inset-0 bg-[#0F172A]/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="modal-panel bg-white w-full max-w-lg rounded-2xl p-6 border border-[#E2E8F0] shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                <span>📊</span>
                <span>Submit Daily Work Report</span>
              </h3>
              <button
                onClick={() => setShowReportModal(false)}
                className="text-[#64748B] hover:text-[#0F172A] text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleReportSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[#0F172A] font-bold mb-1">Calls Done</label>
                  <input
                    type="number"
                    value={todayCallsDone}
                    onChange={(e) => setTodayCallsDone(Number(e.target.value))}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] font-bold text-center focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
                <div>
                  <label className="block text-[#0F172A] font-bold mb-1">Leads Pitched</label>
                  <input
                    type="number"
                    value={todayPitched}
                    onChange={(e) => setTodayPitched(Number(e.target.value))}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] font-bold text-center focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
                <div>
                  <label className="block text-[#0F172A] font-bold mb-1">Conversions</label>
                  <input
                    type="number"
                    value={todayConversions}
                    onChange={(e) => setTodayConversions(Number(e.target.value))}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#2563EB] font-bold text-center focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#0F172A] font-bold mb-1">Daily Highlights / Notes</label>
                <textarea
                  rows={3}
                  value={todayNotes}
                  onChange={(e) => setTodayNotes(e.target.value)}
                  placeholder="Summary of today's key candidate discussions..."
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0] text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold shadow-md cursor-pointer transition-all"
                >
                  Submit Daily Report
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* =========================================================================
          REQUEST LEAVE MODAL
          ========================================================================= */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-[#0F172A]/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="modal-panel bg-white w-full max-w-lg rounded-2xl p-6 border border-[#E2E8F0] shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
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

      {/* =========================================================================
          DISPOSITION MODAL
          ========================================================================= */}
      {showDispositionModal && selectedLead && (
        <div className="fixed inset-0 bg-[#0F172A]/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="modal-panel bg-white w-full max-w-lg rounded-2xl p-6 border border-[#E2E8F0] shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                <FiPhoneCall className="text-[#2563EB]" />
                <span>Call Disposition: {selectedLead.candidateName}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowDispositionModal(false)}
                className="text-[#64748B] hover:text-[#0F172A] text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDisposition} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#0F172A] font-bold mb-1">Status *</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as LeadStatus)}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] font-bold focus:outline-none focus:border-[#2563EB]"
                >
                  {allowedStatuses.map((status) => (
                    <option key={status} value={status}>
                      {LEAD_STATUS_CONFIG[status].label}
                    </option>
                  ))}
                  {allowedStatuses.length === 0 && (
                    <option value={selectedLead.status}>
                      {LEAD_STATUS_CONFIG[selectedLead.status].label} (Final status)
                    </option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[#0F172A] font-bold mb-1">Remarks *</label>
                <textarea
                  required
                  rows={3}
                  value={callRemarks}
                  onChange={(e) => setCallRemarks(e.target.value)}
                  placeholder="Call remarks..."
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setShowDispositionModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0] font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={allowedStatuses.length === 0}
                  className="px-5 py-2.5 rounded-xl shimmer-button text-white font-bold shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default BDEDashboard;
