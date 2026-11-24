import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/useApp';
import type { User, Lead, LeadStatus } from '../../types';
import { calculateConversionRate } from '../../utils/calculations';
import { motion } from 'framer-motion';
import {
  FiUsers,
  FiLayers,
  FiCheckCircle,
  FiTrendingUp,
  FiAlertTriangle,
  FiUserCheck,
  FiPhoneForwarded,
  FiSearch,
  FiClock,
  FiCalendar,
  FiPhone,
  FiMail,
  FiMapPin,
  FiBookOpen,
  FiActivity,
  FiX,
} from 'react-icons/fi';
import { APP_ROUTES, OPEN_LEAD_STATUSES, LEAD_STATUS_CONFIG } from '../../utils/constants';

const parseFollowUpTime = (value?: string | null): number => {
  if (!value) return Number.NaN;
  const trimmed = value.trim();
  if (/(?:Z|[+-]\d{2}:?\d{2})$/.test(trimmed)) return new Date(trimmed).getTime();
  const localDateTime = trimmed.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{1,2}):(\d{2})/);
  if (localDateTime) {
    const [year, month, day] = localDateTime[1].split('-').map(Number);
    return new Date(year, month - 1, day, Number(localDateTime[2]), Number(localDateTime[3])).getTime();
  }
  return new Date(trimmed).getTime();
};

export const TLWorkbench: React.FC = () => {
  const navigate = useNavigate();

  const {
    leads,
    users,
    teams,
    managedTeamIds,
    systemSettings,
    followUps,
    leadStatusHistory,
    attendanceRecords,
    allocateStage2TeamToBdes,
    replenishmentAlerts,
    clearReplenishmentAlert,
    escalatePoolEmpty,
  } = useApp();

  const [clock, setClock] = useState(() => ({
    today: new Date().toISOString().split('T')[0],
    nowMs: Date.now(),
  }));

  useEffect(() => {
    const timer = setInterval(() => {
      setClock({ today: new Date().toISOString().split('T')[0], nowMs: Date.now() });
    }, 60_000);
    return () => clearInterval(timer);
  }, []);

  const [selectedTeamId, setSelectedTeamId] = useState<string>('ALL');

  const maxLeadsPerBde = systemSettings.maxLeadsPerBde;

  // Effective team scope for the TL
  const managedTeams = teams.filter((team) => managedTeamIds.includes(team.id));
  const managedTeamNames = managedTeams.map((team) => team.name);
  const effectiveTeamIds =
    selectedTeamId === 'ALL'
      ? managedTeamIds
      : managedTeamIds.includes(selectedTeamId)
      ? [selectedTeamId]
      : [];
  const teamNameFor = (teamId?: string | null) =>
    teams.find((team) => team.id === teamId)?.name || 'Unassigned';
  const activeTeamName =
    selectedTeamId === 'ALL'
      ? managedTeamNames.length > 0
        ? `All Teams (${managedTeamNames.join(' & ')})`
        : 'All Teams (Unassigned)'
      : teamNameFor(selectedTeamId);

  // Filter team-specific data
  const teamLeads = leads.filter((l) => effectiveTeamIds.includes(l.currentTeamId || ''));
  const teamPoolLeads = teamLeads.filter(
    (l) => !l.currentBdeId && OPEN_LEAD_STATUSES.includes(l.status)
  );
  const teamDistributedLeads = teamLeads.filter(
    (l) => l.currentBdeId && OPEN_LEAD_STATUSES.includes(l.status)
  );
  const teamConvertedLeads = teamLeads.filter((l) => l.status === 'CONVERTED');
  const teamConversionPct = calculateConversionRate(teamConvertedLeads.length, teamLeads.length);

  const teamBdes = users.filter((u) => effectiveTeamIds.includes(u.teamId || '') && u.role === 'BDE');
  const teamBdeIds = new Set(teamBdes.map((b) => b.id));

  // Attendance metrics
  const todayAttendance = attendanceRecords.filter(
    (a) => a.date === clock.today && teamBdeIds.has(a.userId)
  );
  const presentCount = new Set(
    todayAttendance
      .filter((a) => a.status === 'PRESENT' || a.status === 'LATE')
      .map((a) => a.userId)
  ).size;

  // Overdue followups
  const overdueFollowUps = followUps.filter((item) => {
    if (!['PENDING', 'OVERDUE'].includes(item.status) || !teamBdeIds.has(item.bdeId)) return false;
    const scheduled = parseFollowUpTime(item.scheduledTime);
    return !Number.isNaN(scheduled) && scheduled < clock.nowMs;
  }).length;

  const openLeadsForBde = (bdeId: string) =>
    leads.filter((l) => l.currentBdeId === bdeId && OPEN_LEAD_STATUSES.includes(l.status)).length;
  const bdeCapacity = (bdeId: string) => Math.max(0, maxLeadsPerBde - openLeadsForBde(bdeId));
  const bdeIneligibilityReason = (bdeId: string) => {
    const bde = teamBdes.find((item) => item.id === bdeId);
    if (!bde) return 'Not in selected team';
    if (bde.status !== 'ACTIVE') return 'Inactive BDE';
    if (bdeCapacity(bdeId) === 0) return `At workload cap (${maxLeadsPerBde})`;
    return '';
  };

  const teamAlerts = replenishmentAlerts.filter((alert) => effectiveTeamIds.includes(alert.teamId));

  // Lead queue search & filter in workbench
  const [queueSearch, setQueueSearch] = useState('');
  const [queueStatusFilter, setQueueStatusFilter] = useState('ALL');
  const [queueBdeFilter, setQueueBdeFilter] = useState('ALL');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const filteredQueueLeads = teamDistributedLeads.filter((lead) => {
    const matchesSearch =
      lead.candidateName.toLowerCase().includes(queueSearch.toLowerCase()) ||
      lead.phone.includes(queueSearch) ||
      (lead.email && lead.email.toLowerCase().includes(queueSearch.toLowerCase()));
    const matchesStatus = queueStatusFilter === 'ALL' || lead.status === queueStatusFilter;
    const matchesBde = queueBdeFilter === 'ALL' || lead.currentBdeId === queueBdeFilter;
    return matchesSearch && matchesStatus && matchesBde;
  });

  // Action status messages
  const [actionStatus, setActionStatus] = useState('');
  const [actionError, setActionError] = useState('');

  const handleQuickReplenish = (bde: User) => {
    setActionStatus('');
    setActionError('');
    const targetTeamId = bde.teamId;
    if (!targetTeamId || !managedTeamIds.includes(targetTeamId)) {
      setActionError(`${bde.name} is not assigned to a team you manage.`);
      return;
    }
    const targetTeamPool = leads.filter(
      (l) => l.currentTeamId === targetTeamId && !l.currentBdeId && OPEN_LEAD_STATUSES.includes(l.status)
    );

    if (bde.status !== 'ACTIVE') {
      setActionError(`${bde.name} is not an active BDE.`);
      return;
    }
    if (targetTeamPool.length === 0) {
      escalatePoolEmpty(targetTeamId);
      const tName = teamNameFor(targetTeamId);
      setActionError(`${tName}'s pool is empty. Admin has been notified; no leads were added.`);
      return;
    }
    const allocCount = Math.min(5, targetTeamPool.length, bdeCapacity(bde.id));
    if (allocCount <= 0) {
      setActionError(`${bde.name} is at the workload cap (${maxLeadsPerBde} open leads).`);
      return;
    }
    const allocated = allocateStage2TeamToBdes(targetTeamId, [bde.id], allocCount);
    if (allocated > 0) {
      setActionStatus(`Added ${allocated} lead${allocated === 1 ? '' : 's'} to ${bde.name}.`);
      clearReplenishmentAlert(bde.id);
    } else {
      setActionError(`No leads were added to ${bde.name}. Its queue may have reached the workload cap.`);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Top Header with Team Switcher */}
      <div className="flex flex-col gap-4 border-b border-[#E2E8F0] pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#059669]">
            <FiUsers />
            <span>Team Lead Operational Command · {managedTeamNames.join(' & ') || 'Unassigned'}</span>
          </div>
          <h1 className="break-words text-2xl font-black leading-tight tracking-tight text-[#0F172A] sm:text-3xl">
            Team Workbench: {activeTeamName}
          </h1>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-[#64748B] sm:text-sm">
            Supervising frontline BDE execution, call queues, and lead capacity across {managedTeamNames.join(' and ') || 'your managed teams'}.
          </p>
        </div>

        {/* Team Selector Controls */}
        <div className="inline-flex items-center gap-1 rounded-xl border border-[#E2E8F0] bg-[#F1F5F9] p-1 shadow-2xs shrink-0 self-start lg:self-center">
          <button
            type="button"
            onClick={() => setSelectedTeamId('ALL')}
            className={`rounded-lg px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer ${
              selectedTeamId === 'ALL'
                ? 'bg-white text-[#059669] shadow-xs'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            All Teams
          </button>
          {managedTeams.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelectedTeamId(t.id)}
              className={`rounded-lg px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer ${
                selectedTeamId === t.id
                  ? 'bg-white text-[#059669] shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      {/* Action Banners */}
      {(actionStatus || actionError) && (
        <div
          className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-xs font-semibold sm:px-5 ${
            actionError
              ? 'bg-[#FEF2F2] border-[#FECACA] text-[#B91C1C]'
              : 'bg-[#ECFDF5] border-[#A7F3D0] text-[#047857]'
          }`}
        >
          <span>{actionError || actionStatus}</span>
          <button
            onClick={() => {
              setActionStatus('');
              setActionError('');
            }}
            className="text-xs font-bold hover:opacity-75 cursor-pointer ml-3"
          >
            ✕
          </button>
        </div>
      )}

      {/* BDE Exhaustion Alert Banner */}
      {teamAlerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-4 rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] p-4 shadow-xs sm:p-5"
        >
          <div className="flex items-center gap-2 text-[#D97706] font-bold text-sm">
            <FiAlertTriangle className="text-lg text-[#D97706] animate-bounce" />
            <span>Queue Replenishment Alerts ({teamAlerts.length} BDEs Need Leads)</span>
          </div>
          <p className="text-xs text-[#64748B] font-medium">
            The following executives have exhausted their open queues and are waiting for leads:
          </p>
          <div className="flex flex-wrap gap-3">
            {teamAlerts.map((alert) => {
              const bde = teamBdes.find((item) => item.id === alert.bdeId);
              const reason = bdeIneligibilityReason(alert.bdeId);
              return (
                <div
                  key={alert.bdeId}
                  className="flex items-center justify-between gap-4 rounded-xl border border-[#E2E8F0] bg-white p-3.5 text-xs shadow-xs"
                >
                  <div>
                    <span className="font-bold text-[#0F172A]">{alert.bdeName}</span>
                    <div className="text-[10px] text-[#64748B]">Alerted {alert.timestamp}</div>
                  </div>
                  <button
                    onClick={() => bde && handleQuickReplenish(bde)}
                    disabled={!bde || !!reason}
                    title={reason || 'Add up to 5 pooled leads'}
                    className="px-3.5 py-1.5 rounded-lg shimmer-button text-white font-bold text-xs cursor-pointer shadow-xs disabled:opacity-40"
                  >
                    Quick Replenish (+5)
                  </button>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Top 6 KPI Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          whileHover={{ y: -5, scale: 1.02 }}
          whileTap={{ scale: 0.985 }}
          onClick={() => navigate(APP_ROUTES.TEAM_LEAD.LEAD_POOL)}
          className="glass-panel stat-card-animated flex min-h-[140px] flex-col rounded-2xl border border-[#CBD5E1] bg-white p-4 cursor-pointer hover:border-[#10B981] transition-all justify-between"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block truncate">
                Team Pool
              </span>
              <div className="text-xl sm:text-2xl font-black text-[#059669] mt-0.5 truncate">{teamPoolLeads.length}</div>
            </div>
            <div className="rounded-xl bg-[#ECFDF5] p-2 text-[#059669] shrink-0 shadow-2xs">
              <FiLayers className="text-sm" />
            </div>
          </div>
          <div className="mt-auto pt-2 text-[11px] font-medium text-[#64748B] flex items-center justify-between border-t border-[#F1F5F9]/80">
            <span>Unassigned</span>
            <span className="text-[#059669] font-bold">View Pool →</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          whileHover={{ y: -5, scale: 1.02 }}
          whileTap={{ scale: 0.985 }}
          onClick={() => navigate(APP_ROUTES.TEAM_LEAD.DISTRIBUTION)}
          className="glass-panel stat-card-animated flex min-h-[140px] flex-col rounded-2xl border border-[#CBD5E1] bg-white p-4 cursor-pointer hover:border-[#10B981] transition-all justify-between"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block truncate">
                Active Queue
              </span>
              <div className="text-xl sm:text-2xl font-black text-[#0F172A] mt-0.5 truncate">{teamDistributedLeads.length}</div>
            </div>
            <div className="rounded-xl bg-[#ECFDF5] p-2 text-[#059669] shrink-0 shadow-2xs">
              <FiPhoneForwarded className="text-sm" />
            </div>
          </div>
          <div className="mt-auto pt-2 text-[11px] font-medium text-[#64748B] flex items-center justify-between border-t border-[#F1F5F9]/80">
            <span>In BDE Queues</span>
            <span className="text-[#059669] font-bold">Matrix →</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          whileHover={{ y: -5, scale: 1.02 }}
          whileTap={{ scale: 0.985 }}
          className="glass-panel stat-card-animated flex min-h-[140px] flex-col rounded-2xl border border-[#CBD5E1] bg-white p-4 justify-between"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block truncate">
                Conversions
              </span>
              <div className="text-xl sm:text-2xl font-black text-[#059669] mt-0.5 truncate">{teamConvertedLeads.length}</div>
            </div>
            <div className="rounded-xl bg-[#ECFDF5] p-2 text-[#059669] shrink-0 shadow-2xs">
              <FiCheckCircle className="text-sm" />
            </div>
          </div>
          <div className="mt-auto pt-2 text-[11px] font-medium text-[#64748B] border-t border-[#F1F5F9]/80">Closed Deals</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          whileHover={{ y: -5, scale: 1.02 }}
          whileTap={{ scale: 0.985 }}
          className="glass-panel stat-card-animated flex min-h-[140px] flex-col rounded-2xl border border-[#CBD5E1] bg-white p-4 justify-between"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block truncate">
                Win Rate %
              </span>
              <div className="text-xl sm:text-2xl font-black text-[#0F172A] mt-0.5 truncate">{teamConversionPct}%</div>
            </div>
            <div className="rounded-xl bg-[#ECFDF5] p-2 text-[#059669] shrink-0 shadow-2xs">
              <FiTrendingUp className="text-sm" />
            </div>
          </div>
          <div className="mt-auto pt-2 text-[11px] font-medium text-[#64748B] border-t border-[#F1F5F9]/80">Converted / Total</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25 }}
          whileHover={{ y: -5, scale: 1.02 }}
          whileTap={{ scale: 0.985 }}
          onClick={() => navigate(APP_ROUTES.TEAM_LEAD.ATTENDANCE)}
          className="glass-panel stat-card-animated flex min-h-[140px] flex-col rounded-2xl border border-[#CBD5E1] bg-white p-4 cursor-pointer hover:border-[#10B981] transition-all justify-between"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block truncate">
                Attendance
              </span>
              <div className="mt-0.5 text-xl font-black text-[#0F172A] sm:text-2xl truncate">
                {presentCount} / {teamBdes.length}
              </div>
            </div>
            <div className="rounded-xl bg-[#ECFDF5] p-2 text-[#059669] shrink-0 shadow-2xs">
              <FiClock className="text-sm" />
            </div>
          </div>
          <div className="mt-auto pt-2 text-[11px] font-medium text-[#64748B] flex items-center justify-between border-t border-[#F1F5F9]/80">
            <span>Clocked In</span>
            <span className="text-[#059669] font-bold">Review →</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          whileHover={{ y: -5, scale: 1.02 }}
          whileTap={{ scale: 0.985 }}
          className="glass-panel stat-card-animated flex min-h-[140px] flex-col rounded-2xl border border-[#CBD5E1] bg-white p-4 justify-between"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block truncate">
                Overdue Calls
              </span>
              <div className="text-xl sm:text-2xl font-black text-[#D97706] mt-0.5 truncate">{overdueFollowUps}</div>
            </div>
            <div className="rounded-xl bg-[#FFFBEB] p-2 text-[#D97706] shrink-0 shadow-2xs">
              <FiCalendar className="text-sm" />
            </div>
          </div>
          <div className="mt-auto pt-2 text-[11px] font-medium text-[#64748B] border-t border-[#F1F5F9]/80">Pending Callbacks</div>
        </motion.div>
      </div>

      {/* Frontline BDE Workload & Queue Status Table */}
      <div className="glass-panel rounded-2xl border border-[#CBD5E1] bg-white overflow-hidden shadow-xs">
        <div className="flex flex-col gap-3 border-b border-[#E2E8F0] bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
              <FiUserCheck className="text-[#059669]" />
              <span>Frontline BDE Queue & Capacity Status ({teamBdes.length} Executives)</span>
            </h3>
            <p className="text-xs text-[#64748B] mt-0.5">
              Live capacity monitoring based on the {maxLeadsPerBde}-lead workload threshold.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(APP_ROUTES.TEAM_LEAD.DISTRIBUTION)}
              className="text-xs font-bold text-[#059669] hover:underline"
            >
              Full Distribution Matrix →
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                <th className="px-4 py-3.5 sm:px-5">BDE Name</th>
                <th className="px-4 py-3.5 sm:px-5">Employee Status</th>
                <th className="px-4 py-3.5 sm:px-5 text-center">Allocated</th>
                <th className="px-4 py-3.5 sm:px-5 text-center">Working Queue</th>
                <th className="px-4 py-3.5 sm:px-5 text-center">Conversions</th>
                <th className="px-4 py-3.5 sm:px-5 text-center">Win Rate %</th>
                <th className="px-4 py-3.5 sm:px-5">Capacity Status</th>
                <th className="px-4 py-3.5 sm:px-5 text-right">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {teamBdes.map((bde) => {
                const bdeLeads = leads.filter((l) => l.currentBdeId === bde.id);
                const pending = openLeadsForBde(bde.id);
                const capacity = bdeCapacity(bde.id);
                const reason = bdeIneligibilityReason(bde.id);
                const conv = bdeLeads.filter((l) => l.status === 'CONVERTED').length;
                const convPct = calculateConversionRate(conv, bdeLeads.length);

                return (
                  <tr key={bde.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="px-4 py-3.5 sm:px-5 font-bold text-[#0F172A]">{bde.name}</td>
                    <td className="px-4 py-3.5 sm:px-5">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          bde.status === 'ACTIVE'
                            ? 'bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]'
                            : 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]'
                        }`}
                      >
                        {bde.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 sm:px-5 text-center font-semibold text-[#0F172A]">{bdeLeads.length}</td>
                    <td className="px-4 py-3.5 sm:px-5 text-center font-bold">
                      <span className={pending === 0 ? 'text-[#D97706]' : 'text-[#059669]'}>
                        {pending} / {maxLeadsPerBde}
                      </span>
                      <div className="mx-auto mt-1.5 h-1.5 w-24 overflow-hidden rounded-full bg-[#E2E8F0]">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (pending / maxLeadsPerBde) * 100)}%` }}
                          transition={{ duration: 0.65, ease: 'easeOut' }}
                          className={`h-full ${
                            pending >= maxLeadsPerBde
                              ? 'bg-[#DC2626]'
                              : pending >= maxLeadsPerBde * 0.8
                              ? 'bg-[#D97706]'
                              : 'bg-[#10B981]'
                          }`}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3.5 sm:px-5 text-center font-bold text-[#059669]">{conv}</td>
                    <td className="px-4 py-3.5 sm:px-5 text-center font-black text-[#0F172A]">{convPct}%</td>
                    <td className="px-4 py-3.5 sm:px-5">
                      {reason ? (
                        <span className="text-[10px] px-2 py-1 rounded-full bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] font-bold">
                          {reason}
                        </span>
                      ) : pending === 0 ? (
                        <span className="text-[10px] px-2 py-1 rounded-full bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A] font-bold">
                          Queue Empty
                        </span>
                      ) : pending >= maxLeadsPerBde ? (
                        <span className="text-[10px] px-2 py-1 rounded-full bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] font-bold">
                          At Cap
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-1 rounded-full bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] font-bold">
                          {capacity} slots free
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 sm:px-5 text-right">
                      <button
                        onClick={() => handleQuickReplenish(bde)}
                        disabled={!!reason}
                        className="rounded-lg px-3.5 py-2 text-[11px] font-bold text-white shadow-xs shimmer-button cursor-pointer disabled:opacity-40"
                      >
                        + Add 5 Leads
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live Working Leads Stream in Team */}
      <div className="glass-panel rounded-2xl border border-[#CBD5E1] bg-white overflow-hidden shadow-xs">
        <div className="flex flex-col gap-3 border-b border-[#E2E8F0] bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
              <FiPhoneForwarded className="text-[#059669]" />
              <span>Live Frontline Calling Queue ({filteredQueueLeads.length} Leads Active)</span>
            </h3>
            <p className="text-xs text-[#64748B] mt-0.5">
              Live disposition state of candidates currently being engaged by your team's BDEs.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B]" />
              <input
                type="text"
                placeholder="Search candidates, phone..."
                value={queueSearch}
                onChange={(e) => setQueueSearch(e.target.value)}
                className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] py-2 pl-9 pr-3.5 text-xs font-semibold text-[#0F172A] placeholder-[#64748B] focus:border-[#10B981] focus:outline-none"
              />
            </div>

            <select
              value={queueBdeFilter}
              onChange={(e) => setQueueBdeFilter(e.target.value)}
              className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-xs font-semibold text-[#0F172A] focus:border-[#10B981] focus:outline-none"
            >
              <option value="ALL">All Team BDEs</option>
              {teamBdes.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>

            <select
              value={queueStatusFilter}
              onChange={(e) => setQueueStatusFilter(e.target.value)}
              className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-xs font-semibold text-[#0F172A] focus:border-[#10B981] focus:outline-none"
            >
              <option value="ALL">All Dispositions</option>
              <option value="NEW">New</option>
              <option value="CONTACTED">Contacted</option>
              <option value="INTERESTED">Interested</option>
              <option value="FOLLOW_UP_REQUIRED">Follow-up Due</option>
              <option value="CONVERTED">Converted</option>
              <option value="NOT_REACHABLE">Not Reachable</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                <th className="px-4 py-3.5 sm:px-5">Candidate</th>
                <th className="px-4 py-3.5 sm:px-5">Contact</th>
                <th className="px-4 py-3.5 sm:px-5">Assigned BDE</th>
                <th className="px-4 py-3.5 sm:px-5">Current Status</th>
                <th className="px-4 py-3.5 sm:px-5">Program / Education</th>
                <th className="px-4 py-3.5 sm:px-5">Next Follow-Up</th>
                <th className="px-4 py-3.5 sm:px-5">Last Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filteredQueueLeads.map((lead) => {
                const conf = LEAD_STATUS_CONFIG[lead.status as LeadStatus] || {
                  label: lead.status,
                  color: '#64748B',
                };
                return (
                  <tr
                    key={lead.id}
                    onClick={() => setSelectedLead(lead)}
                    className="hover:bg-[#F1F5F9] cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3.5 sm:px-5 font-bold text-[#0F172A]">{lead.candidateName}</td>
                    <td className="px-4 py-3.5 sm:px-5 font-mono text-[#475569]">{lead.phone}</td>
                    <td className="px-4 py-3.5 sm:px-5 font-semibold text-[#059669]">{lead.currentBdeName || 'Assigned BDE'}</td>
                    <td className="px-4 py-3.5 sm:px-5">
                      <span
                        className="px-2.5 py-1 rounded-full text-[10px] font-bold border"
                        style={{
                          backgroundColor: `${conf.color}15`,
                          borderColor: `${conf.color}40`,
                          color: conf.color,
                        }}
                      >
                        {conf.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 sm:px-5 font-medium text-[#0F172A]">{lead.education || 'Graduate'}</td>
                    <td className="px-4 py-3.5 sm:px-5 text-[#64748B] font-mono text-[11px]">
                      {lead.nextFollowUpDate || '—'}
                    </td>
                    <td className="px-4 py-3.5 sm:px-5 text-[#64748B] max-w-xs truncate">
                      {leadStatusHistory.find((h) => h.leadId === lead.id)?.remarks || (lead as any).remarks || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredQueueLeads.length === 0 && (
          <div className="border-t border-[#E2E8F0] px-5 py-10 text-center text-xs text-[#64748B]">
            No active queue leads matched your search criteria.
          </div>
        )}
      </div>

      {/* Candidate Detail Modal */}
      {selectedLead && (
        <div className="fixed inset-0 bg-[#0F172A]/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="modal-panel w-full max-w-xl space-y-5 rounded-2xl border border-[#CBD5E1] bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#E2E8F0] pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#10B981] to-[#047857] text-lg font-black text-white shadow-sm">
                  {selectedLead.candidateName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#0F172A]">{selectedLead.candidateName}</h3>
                  <div className="flex items-center gap-2 text-xs text-[#64748B]">
                    <span>ID: {selectedLead.id}</span>
                    <span>•</span>
                    <span className="font-semibold text-[#059669]">
                      {selectedLead.currentTeamName || teamNameFor(selectedLead.currentTeamId)}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedLead(null)}
                className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A] cursor-pointer"
              >
                <FiX className="text-lg" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] flex items-center gap-1.5">
                  <FiPhone className="text-[#059669]" /> Contact Phone
                </div>
                <div className="font-mono font-bold text-[#0F172A] text-sm">{selectedLead.phone}</div>
              </div>

              <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] flex items-center gap-1.5">
                  <FiMail className="text-[#059669]" /> Email Address
                </div>
                <div className="font-semibold text-[#0F172A] truncate">{selectedLead.email || '—'}</div>
              </div>

              <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] flex items-center gap-1.5">
                  <FiMapPin className="text-[#059669]" /> City / Location
                </div>
                <div className="font-semibold text-[#0F172A]">{selectedLead.city || '—'}</div>
              </div>

              <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] flex items-center gap-1.5">
                  <FiBookOpen className="text-[#059669]" /> Education / Degree
                </div>
                <div className="font-semibold text-[#0F172A]">{selectedLead.education || 'Graduate'}</div>
              </div>
            </div>

            {/* Current Lifecycle & Assignment */}
            <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">Assigned Executive</span>
                <span className="font-bold text-[#059669]">{selectedLead.currentBdeName || 'Unassigned'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">Current Status</span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
                  {selectedLead.status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">Marketing Source</span>
                <span className="font-semibold text-[#0F172A]">{selectedLead.source || 'Direct Website'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">Next Follow-up</span>
                <span className="font-mono text-[#0F172A]">{selectedLead.nextFollowUpDate || 'None Scheduled'}</span>
              </div>
            </div>

            {/* Status History & Remarks */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] flex items-center gap-1.5">
                <FiActivity className="text-[#059669]" /> Activity & Call Remarks
              </div>
              <div className="max-h-36 overflow-y-auto rounded-xl border border-[#E2E8F0] bg-white p-3 divide-y divide-[#E2E8F0] text-xs">
                {leadStatusHistory.filter((h) => h.leadId === selectedLead.id).length > 0 ? (
                  leadStatusHistory
                    .filter((h) => h.leadId === selectedLead.id)
                    .map((item) => (
                      <div key={item.id} className="py-2 first:pt-0 last:pb-0 space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-[#0F172A]">{item.changedByName}</span>
                          <span className="text-[#64748B] font-mono">{item.timestamp}</span>
                        </div>
                        <p className="text-[#475569]">{item.remarks}</p>
                      </div>
                    ))
                ) : (
                  <div className="text-center py-3 text-[#64748B]">
                    {(selectedLead as any).remarks || 'No disposition history logged yet for this candidate.'}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedLead(null)}
                className="rounded-xl border border-[#CBD5E1] bg-white px-5 py-2.5 text-xs font-bold text-[#0F172A] hover:bg-[#F8FAFC] transition-colors cursor-pointer"
              >
                Close Candidate Details
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default TLWorkbench;
