import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/useApp';
import type { User } from '../../types';
import { calculateConversionRate } from '../../utils/calculations';
import { motion } from 'framer-motion';
import {
  FiUsers,
  FiLayers,
  FiCheckCircle,
  FiTrendingUp,
  FiSend,
  FiAlertTriangle,
  FiUserCheck,
  FiPhoneForwarded,
  FiSearch,
  FiFilter,
  FiGrid,
  FiRepeat,
  FiClock,
  FiCalendar,
} from 'react-icons/fi';
import { APP_ROUTES, OPEN_LEAD_STATUSES } from '../../utils/constants';

type AllocationMethod = 'EQUAL' | 'WORKLOAD_BASED' | 'MANUAL';

export const TLDashboard: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const {
    leads,
    users,
    teams,
    currentUser,
    systemSettings,
    followUps,
    poolEscalations,
    allocateStage2TeamToBdes,
    replenishmentAlerts,
    clearReplenishmentAlert,
    reassignBdeLeads,
    escalatePoolEmpty,
    clearPoolEscalation,
  } = useApp();

  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const userTeamId = currentUser.teamId || 'team-1';
  const currentTeamName =
    teams.find((team) => team.id === userTeamId)?.name || currentUser.teamName || userTeamId;
  const maxLeadsPerBde = systemSettings.maxLeadsPerBde;

  const activeTab: 'WORKBENCH' | 'POOL' | 'DISTRIBUTE' = location.pathname.includes('/pool')
    ? 'POOL'
    : location.pathname.includes('/distribute')
      ? 'DISTRIBUTE'
      : 'WORKBENCH';

  const handleTabChange = (tab: 'WORKBENCH' | 'POOL' | 'DISTRIBUTE') => {
    switch (tab) {
      case 'WORKBENCH':
        navigate(APP_ROUTES.TEAM_LEAD.DASHBOARD);
        break;
      case 'POOL':
        navigate(APP_ROUTES.TEAM_LEAD.LEAD_POOL);
        break;
      case 'DISTRIBUTE':
        navigate(APP_ROUTES.TEAM_LEAD.DISTRIBUTION);
        break;
    }
  };

  const teamLeads = leads.filter((l) => l.currentTeamId === userTeamId);
  const teamPoolLeads = teamLeads.filter(
    (l) => !l.currentBdeId && OPEN_LEAD_STATUSES.includes(l.status)
  );
  const teamDistributedLeads = teamLeads.filter(
    (l) => l.currentBdeId && OPEN_LEAD_STATUSES.includes(l.status)
  );
  const teamConvertedLeads = teamLeads.filter((l) => l.status === 'CONVERTED');
  const teamConversionPct = calculateConversionRate(teamConvertedLeads.length, teamLeads.length);

  const teamBdes = users.filter((u) => u.teamId === userTeamId && u.role === 'BDE');
  const teamBdeIds = new Set(teamBdes.map((b) => b.id));
  const openLeadsForBde = (bdeId: string) =>
    leads.filter((l) => l.currentBdeId === bdeId && OPEN_LEAD_STATUSES.includes(l.status)).length;
  const bdeCapacity = (bdeId: string) => Math.max(0, maxLeadsPerBde - openLeadsForBde(bdeId));
  const bdeIneligibilityReason = (bdeId: string) => {
    const bde = teamBdes.find((item) => item.id === bdeId);
    if (!bde) return 'Not on this team';
    if (bde.status !== 'ACTIVE') return 'Inactive BDE';
    if (bdeCapacity(bdeId) === 0) return `At workload cap (${maxLeadsPerBde})`;
    return '';
  };

  const teamAlerts = replenishmentAlerts.filter((alert) => alert.teamId === userTeamId);
  const teamEscalation = poolEscalations.find((item) => item.teamId === userTeamId);
  const escalationTime = teamEscalation ? new Date(teamEscalation.timestamp) : null;

  const overdueFollowUps = followUps.filter((item) => {
    if (item.status !== 'PENDING' || !teamBdeIds.has(item.bdeId)) return false;
    const scheduled = new Date(item.scheduledTime).getTime();
    return !Number.isNaN(scheduled) && scheduled < nowMs;
  }).length;

  useEffect(() => {
    if (teamPoolLeads.length > 0 && poolEscalations.some((item) => item.teamId === userTeamId)) {
      clearPoolEscalation(userTeamId);
    }
  }, [teamPoolLeads.length, poolEscalations, userTeamId, clearPoolEscalation]);

  const [poolSearch, setPoolSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const sourceOptions = Array.from(
    new Set(teamPoolLeads.map((lead) => lead.source?.trim()).filter((value): value is string => !!value))
  ).sort();

  const filteredPoolLeads = teamPoolLeads.filter((l) => {
    const matchesSearch =
      l.candidateName.toLowerCase().includes(poolSearch.toLowerCase()) ||
      l.phone.includes(poolSearch) ||
      (l.email && l.email.toLowerCase().includes(poolSearch.toLowerCase()));
    const matchesSource =
      sourceFilter === 'ALL' || (l.source || '').toLowerCase() === sourceFilter.toLowerCase();
    return matchesSearch && matchesSource;
  });

  const defaultMethod: AllocationMethod =
    systemSettings.allocationMethod === 'MANUAL' ? 'EQUAL' : systemSettings.allocationMethod;
  const [showStage2Modal, setShowStage2Modal] = useState(false);
  const [allocationMethod, setAllocationMethod] = useState<AllocationMethod>(defaultMethod);
  const [selectedBdes, setSelectedBdes] = useState<string[]>([]);
  const [countPerBde, setCountPerBde] = useState<number>(3);
  const [manualQuotas, setManualQuotas] = useState<Record<string, number>>({});
  const [allocationError, setAllocationError] = useState('');
  const [actionStatus, setActionStatus] = useState('');
  const [actionError, setActionError] = useState('');

  const [showReassignModal, setShowReassignModal] = useState(false);
  const [reassignFromBde, setReassignFromBde] = useState('');
  const [reassignToBde, setReassignToBde] = useState('');
  const [reassignError, setReassignError] = useState('');

  const clampBatch = (value: number, cap: number) =>
    Number.isFinite(value) ? Math.max(0, Math.min(Math.floor(value), Math.max(0, cap))) : 0;

  const maxBatchForBde = (bdeId: string) =>
    Math.min(countPerBde, bdeCapacity(bdeId), teamPoolLeads.length);

  const selectedCapacities = teamBdes
    .filter((b) => selectedBdes.includes(b.id))
    .map((b) => bdeCapacity(b.id));
  const maxBatchCeiling = Math.max(
    1,
    Math.min(teamPoolLeads.length, Math.max(0, ...selectedCapacities))
  );

  const openStage2Modal = () => {
    setAllocationError('');
    setActionStatus('');
    setActionError('');
    if (teamPoolLeads.length === 0) {
      escalatePoolEmpty(userTeamId);
      setActionError(
        `${currentTeamName}'s pool is empty. Admin has been notified; add leads to the pool before distributing.`
      );
      return;
    }
    const eligibleIds = teamBdes.filter((b) => !bdeIneligibilityReason(b.id)).map((b) => b.id);
    setSelectedBdes(eligibleIds);
    setManualQuotas(
      Object.fromEntries(eligibleIds.map((id) => [id, clampBatch(countPerBde, maxBatchForBde(id))]))
    );
    setShowStage2Modal(true);
  };

  const handleExecuteStage2 = (e: React.FormEvent) => {
    e.preventDefault();
    setAllocationError('');
    setActionStatus('');
    setActionError('');

    const eligibleIds = selectedBdes.filter((id) => !bdeIneligibilityReason(id));
    if (!eligibleIds.length) {
      setAllocationError('Select at least one active BDE with available workload capacity.');
      return;
    }
    if (teamPoolLeads.length === 0) {
      escalatePoolEmpty(userTeamId);
      setAllocationError(`${currentTeamName}'s pool is empty; admin has been notified.`);
      return;
    }

    const batch = clampBatch(countPerBde, maxBatchCeiling) || 1;
    const manualBatchQuotas: Record<string, number> = {};
    if (allocationMethod === 'MANUAL') {
      let remaining = teamPoolLeads.length;
      let total = 0;
      eligibleIds.forEach((id) => {
        const take = clampBatch(manualQuotas[id] ?? 0, Math.min(maxBatchForBde(id), remaining));
        manualBatchQuotas[id] = take;
        remaining -= take;
        total += take;
      });
      if (total === 0) {
        setAllocationError('Enter a batch size of at least 1 for one or more BDEs.');
        return;
      }
    }

    const allocated = allocateStage2TeamToBdes(
      userTeamId,
      eligibleIds,
      batch,
      allocationMethod,
      allocationMethod === 'MANUAL' ? manualBatchQuotas : undefined
    );
    if (allocated > 0) {
      setActionStatus(`Distributed ${allocated} lead${allocated === 1 ? '' : 's'} in ${currentTeamName}.`);
      clearPoolEscalation(userTeamId);
      setShowStage2Modal(false);
    } else {
      setAllocationError('No leads were allocated. Check pool availability and BDE workload capacity.');
    }
  };

  const handleQuickReplenish = (bde: User) => {
    setActionStatus('');
    setActionError('');
    if (bde.teamId !== userTeamId || bde.status !== 'ACTIVE') {
      setActionError(`${bde.name} is not an active member of ${currentTeamName}.`);
      return;
    }
    if (teamPoolLeads.length === 0) {
      escalatePoolEmpty(userTeamId);
      setActionError(`${currentTeamName}'s pool is empty. Admin has been notified; no leads were added.`);
      return;
    }
    const allocCount = Math.min(5, teamPoolLeads.length, bdeCapacity(bde.id));
    if (allocCount <= 0) {
      setActionError(`${bde.name} is at the workload cap (${maxLeadsPerBde} open leads).`);
      return;
    }
    const allocated = allocateStage2TeamToBdes(userTeamId, [bde.id], allocCount);
    if (allocated > 0) {
      setActionStatus(`Added ${allocated} lead${allocated === 1 ? '' : 's'} to ${bde.name}.`);
    } else {
      setActionError(`No leads were added to ${bde.name}. Its queue may have reached the workload cap.`);
    }
  };

  const openReassignModal = () => {
    setReassignFromBde('');
    setReassignToBde('');
    setReassignError('');
    setShowReassignModal(true);
  };

  const handleExecuteReassign = (e: React.FormEvent) => {
    e.preventDefault();
    setReassignError('');
    if (!reassignFromBde || !reassignToBde || reassignFromBde === reassignToBde) {
      setReassignError('Select a source BDE and a different active target BDE.');
      return;
    }
    const success = reassignBdeLeads(reassignFromBde, reassignToBde, 'BDE absent/transferred');
    if (!success) {
      setReassignError(
        'Reassignment failed. Confirm both BDEs are active members of this team and the source has open leads.'
      );
      return;
    }
    clearReplenishmentAlert(reassignFromBde);
    const targetName = teamBdes.find((b) => b.id === reassignToBde)?.name || 'target BDE';
    setActionStatus(`Open leads were reassigned to ${targetName}.`);
    setShowReassignModal(false);
  };

  return (
    <div className="space-y-5 sm:space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-6">
        <div>
          <div className="flex items-center gap-2 text-[#2563EB] text-xs font-bold uppercase tracking-wider mb-1">
            <FiUsers />
            <span>Team Lead Operational Command</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-[#0F172A] tracking-tight">
            {currentTeamName} Operational Command
          </h1>
          <p className="text-[#64748B] text-xs sm:text-sm mt-1">
            Manage your team pool, distribute leads to active BDEs, and balance frontline workload.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={openStage2Modal}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl shimmer-button text-white font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            <FiSend />
            <span>Distribute from Pool ({teamPoolLeads.length} Available)</span>
          </button>
        </div>
      </div>

      {(actionStatus || actionError) && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold border ${
            actionError
              ? 'bg-[#FEF2F2] border-[#FECACA] text-[#B91C1C]'
              : 'bg-[#ECFDF5] border-[#A7F3D0] text-[#047857]'
          }`}
        >
          {actionError || actionStatus}
        </div>
      )}

      <div className="tab-strip flex border-b border-[#E2E8F0] pb-2 gap-2 overflow-x-auto select-none">
        <button
          onClick={() => handleTabChange('WORKBENCH')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'WORKBENCH'
              ? 'shimmer-button text-white shadow-xs'
              : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]'
          }`}
        >
          <FiGrid />
          <span>Team Workbench Overview</span>
        </button>

        <button
          onClick={() => handleTabChange('POOL')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'POOL'
              ? 'shimmer-button text-white shadow-xs'
              : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]'
          }`}
        >
          <FiLayers />
          <span>Team Lead Pool ({teamPoolLeads.length} Unallocated)</span>
        </button>

        <button
          onClick={() => handleTabChange('DISTRIBUTE')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'DISTRIBUTE'
              ? 'shimmer-button text-white shadow-xs'
              : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]'
          }`}
        >
          <FiUsers />
          <span>BDE Distribution & Workload ({teamBdes.length} BDEs)</span>
          {teamAlerts.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-[#D97706] animate-ping" />
          )}
        </button>
      </div>

      {teamEscalation && teamPoolLeads.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-4 rounded-2xl bg-[#FEF2F2] border border-[#FECACA] space-y-1 shadow-xs"
        >
          <div className="flex items-center gap-2 text-[#B91C1C] font-bold text-sm">
            <FiAlertTriangle className="text-lg" />
            <span>{currentTeamName} Pool Empty — Admin Notified</span>
          </div>
          <p className="text-xs text-[#64748B] font-medium">
            Raised{' '}
            {escalationTime && !Number.isNaN(escalationTime.getTime())
              ? escalationTime.toLocaleString()
              : teamEscalation.timestamp}
            . This clears automatically when new leads arrive in your pool.
          </p>
        </motion.div>
      )}

      {teamAlerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 sm:p-5 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] space-y-3 shadow-xs"
        >
          <div className="flex items-center gap-2 text-[#D97706] font-bold text-sm">
            <FiAlertTriangle className="text-lg text-[#D97706] animate-bounce" />
            <span>BDE Lead Exhaustion Alert ({teamAlerts.length} Needs Leads)</span>
          </div>
          <p className="text-xs text-[#64748B] font-medium">
            The following BDEs have 0 open leads in their queue:
          </p>
          <div className="flex flex-wrap gap-3">
            {teamAlerts.map((alert) => {
              const bde = teamBdes.find((item) => item.id === alert.bdeId);
              const reason = bdeIneligibilityReason(alert.bdeId);
              return (
                <div
                  key={alert.bdeId}
                  className="flex items-center justify-between gap-4 p-3 rounded-xl bg-white border border-[#E2E8F0] text-xs shadow-xs"
                >
                  <div>
                    <span className="font-bold text-[#0F172A]">{alert.bdeName}</span>
                    <div className="text-[10px] text-[#64748B]">Alerted at {alert.timestamp}</div>
                  </div>
                  <button
                    onClick={() => bde && handleQuickReplenish(bde)}
                    disabled={!bde || !!reason}
                    title={reason || 'Add up to 5 pooled leads'}
                    className="px-3.5 py-1.5 rounded-lg shimmer-button text-white font-bold text-xs cursor-pointer shadow-xs disabled:opacity-40"
                  >
                    Quick Replenish (up to 5)
                  </button>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {activeTab === 'WORKBENCH' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4">
            <motion.div whileHover={{ y: -3 }} className="glass-panel p-5 rounded-2xl relative overflow-hidden min-w-0">
              <div className="flex items-center justify-between text-[#64748B] text-xs font-bold">
                <span className="truncate">Team Lead Pool (Unassigned)</span>
                <div className="p-2 rounded-xl bg-[#EFF6FF] text-[#2563EB]">
                  <FiLayers className="text-base" />
                </div>
              </div>
              <div className="text-3xl font-black text-[#2563EB] mt-2">{teamPoolLeads.length}</div>
              <div className="text-xs text-[#64748B] mt-1 font-medium">Ready for Stage 2 Distribution</div>
            </motion.div>

            <motion.div whileHover={{ y: -3 }} className="glass-panel p-5 rounded-2xl relative overflow-hidden min-w-0">
              <div className="flex items-center justify-between text-[#64748B] text-xs font-bold">
                <span className="truncate">Distributed to BDEs</span>
                <div className="p-2 rounded-xl bg-[#EFF6FF] text-[#2563EB]">
                  <FiPhoneForwarded className="text-base" />
                </div>
              </div>
              <div className="text-3xl font-black text-[#0F172A] mt-2">{teamDistributedLeads.length}</div>
              <div className="text-xs text-[#2563EB] mt-1 font-semibold">Open leads in BDE queues</div>
            </motion.div>

            <motion.div whileHover={{ y: -3 }} className="glass-panel p-5 rounded-2xl relative overflow-hidden min-w-0">
              <div className="flex items-center justify-between text-[#64748B] text-xs font-bold">
                <span className="truncate">Team Conversions</span>
                <div className="p-2 rounded-xl bg-[#EFF6FF] text-[#2563EB]">
                  <FiCheckCircle className="text-base" />
                </div>
              </div>
              <div className="text-3xl font-black text-[#2563EB] mt-2">{teamConvertedLeads.length}</div>
              <div className="text-xs text-[#64748B] mt-1 font-medium">Closed Enrollments</div>
            </motion.div>

            <motion.div whileHover={{ y: -3 }} className="glass-panel p-5 rounded-2xl relative overflow-hidden min-w-0">
              <div className="flex items-center justify-between text-[#64748B] text-xs font-bold">
                <span className="truncate">Team Conversion %</span>
                <div className="p-2 rounded-xl bg-[#EFF6FF] text-[#2563EB]">
                  <FiTrendingUp className="text-base" />
                </div>
              </div>
              <div className="text-3xl font-black text-[#0F172A] mt-2">{teamConversionPct}%</div>
              <div className="text-[11px] text-[#64748B] mt-1 font-mono">
                (Team Conversions ÷ Total Leads) × 100
              </div>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              onClick={() => handleTabChange('POOL')}
              className="glass-panel p-5 rounded-2xl cursor-pointer hover:border-[#BFDBFE] transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-[#EFF6FF] text-[#2563EB] group-hover:scale-110 transition-transform">
                    <FiLayers className="text-xl" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#0F172A]">Manage Team Lead Pool</h4>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      {teamPoolLeads.length} unassigned leads available for batch allocation.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold text-[#2563EB] group-hover:translate-x-1 transition-transform">
                  View Pool →
                </span>
              </div>
            </div>

            <div
              onClick={() => handleTabChange('DISTRIBUTE')}
              className="glass-panel p-5 rounded-2xl cursor-pointer hover:border-[#BFDBFE] transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-[#EFF6FF] text-[#2563EB] group-hover:scale-110 transition-transform">
                    <FiUsers className="text-xl" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#0F172A]">BDE Workload Matrix</h4>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      Monitor {teamBdes.length} executives, replenish queues, or transfer leads.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold text-[#2563EB] group-hover:translate-x-1 transition-transform">
                  View Matrix →
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div
              onClick={() => navigate(APP_ROUTES.TEAM_LEAD.ATTENDANCE)}
              className="glass-panel p-4 rounded-2xl cursor-pointer hover:border-[#BFDBFE] transition-all group flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 rounded-xl bg-[#EFF6FF] text-[#2563EB] shrink-0">
                  <FiClock className="text-lg" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-[#0F172A]">Team Attendance</h4>
                  <p className="text-[11px] text-[#64748B]">Punch records and corrections</p>
                </div>
              </div>
              <span className="text-xs font-bold text-[#2563EB] shrink-0 group-hover:translate-x-1 transition-transform">
                Open →
              </span>
            </div>

            <div
              onClick={() => navigate(APP_ROUTES.TEAM_LEAD.REPORTS)}
              className="glass-panel p-4 rounded-2xl cursor-pointer hover:border-[#BFDBFE] transition-all group flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 rounded-xl bg-[#EFF6FF] text-[#2563EB] shrink-0">
                  <FiTrendingUp className="text-lg" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-[#0F172A]">Team Performance</h4>
                  <p className="text-[11px] text-[#64748B]">Conversion and calling analytics</p>
                </div>
              </div>
              <span className="text-xs font-bold text-[#2563EB] shrink-0 group-hover:translate-x-1 transition-transform">
                Open →
              </span>
            </div>

            <div className="glass-panel p-4 rounded-2xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 rounded-xl bg-[#FFFBEB] text-[#D97706] shrink-0">
                  <FiCalendar className="text-lg" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-[#0F172A]">Overdue Follow-ups</h4>
                  <p className="text-[11px] text-[#64748B]">Pending callbacks past scheduled time</p>
                </div>
              </div>
              <span className="text-xl font-black text-[#D97706] shrink-0">{overdueFollowUps}</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'POOL' && (
        <div className="space-y-4">
          <div className="glass-panel p-4 rounded-2xl space-y-3">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <div className="relative flex-1">
                <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B]" />
                <input
                  type="text"
                  placeholder="Search unassigned pool leads by name, phone, or email..."
                  value={poolSearch}
                  onChange={(e) => setPoolSearch(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-10 pr-4 py-2 text-xs font-semibold text-[#0F172A] placeholder-[#64748B] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="flex items-center gap-2">
                <FiFilter className="text-[#64748B]" />
                <select
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                  className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs font-semibold text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                >
                  <option value="ALL">All Marketing Channels</option>
                  {sourceOptions.map((source) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between bg-white">
              <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                <FiLayers className="text-[#2563EB]" />
                <span>{currentTeamName} Pool: {filteredPoolLeads.length} Unassigned Leads</span>
              </h3>
              <button
                onClick={openStage2Modal}
                className="px-4 py-2 rounded-xl shimmer-button text-white font-bold text-xs shadow-xs cursor-pointer"
              >
                Batch Allocate to BDEs
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-[#64748B] font-bold bg-[#F8FAFC]">
                    <th className="py-3 px-4">Candidate Name</th>
                    <th className="py-3 px-4">Phone / Contact</th>
                    <th className="py-3 px-4">Channel Source</th>
                    <th className="py-3 px-4">Program Interest</th>
                    <th className="py-3 px-4">Added To {currentTeamName}</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {filteredPoolLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3 px-4 font-bold text-[#0F172A]">{lead.candidateName}</td>
                      <td className="py-3 px-4 text-[#475569] font-mono">{lead.phone}</td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
                          {lead.source || 'Unspecified'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-[#0F172A]">{lead.education || 'Graduate'}</td>
                      <td className="py-3 px-4 text-[#64748B] text-[11px]">{lead.createdAt || 'Today'}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
                          Ready in Pool
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredPoolLeads.length === 0 && (
              <div className="p-8 text-center text-[#64748B] text-xs">
                No pool leads matched your criteria.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'DISTRIBUTE' && (
        <div className="space-y-4">
          <div className="glass-panel rounded-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                  <FiUserCheck className="text-[#2563EB]" />
                  <span>BDE Workforce Performance & Workload Monitoring</span>
                </h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Real-time workload balancing and queue depths. Eligibility uses ACTIVE status and the{' '}
                  {maxLeadsPerBde}-lead cap; punch-in is only tracked for the signed-in session, so it is not
                  used to gate allocation.
                </p>
              </div>

              <button
                onClick={openReassignModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-[#0F172A] border border-[#E2E8F0] text-xs font-bold cursor-pointer shadow-xs transition-colors"
              >
                <FiRepeat />
                <span>Reassign Leads (Absence / Leave)</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-[#64748B] font-bold bg-[#F8FAFC]">
                    <th className="py-3.5 px-3">BDE Name</th>
                    <th className="py-3.5 px-3">Status</th>
                    <th className="py-3.5 px-3 text-center">Assigned</th>
                    <th className="py-3.5 px-3 text-center">Open / Queue</th>
                    <th className="py-3.5 px-3 text-center">Conversions</th>
                    <th className="py-3.5 px-3 text-center">Conversion Rate</th>
                    <th className="py-3.5 px-3">Workload Status</th>
                    <th className="py-3.5 px-3 text-right">Action</th>
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
                        <td className="py-3.5 px-3 font-bold text-[#0F172A]">{bde.name}</td>
                        <td className="py-3.5 px-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              bde.status === 'ACTIVE'
                                ? 'bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]'
                                : 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]'
                            }`}
                          >
                            {bde.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-center font-semibold text-[#0F172A]">{bdeLeads.length}</td>
                        <td className="py-3.5 px-3 text-center font-bold">
                          <span className={pending === 0 ? 'text-[#D97706]' : 'text-[#2563EB]'}>
                            {pending} / {maxLeadsPerBde}
                          </span>
                          <div className="text-[10px] text-[#64748B] font-medium">{capacity} slot(s) left</div>
                        </td>
                        <td className="py-3.5 px-3 text-center font-bold text-[#2563EB]">{conv}</td>
                        <td className="py-3.5 px-3 text-center font-black text-[#2563EB]">{convPct}%</td>
                        <td className="py-3.5 px-3">
                          {reason ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] font-bold">
                              Ineligible: {reason}
                            </span>
                          ) : pending === 0 ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A] font-bold">
                              Queue Empty (Needs Leads)
                            </span>
                          ) : pending >= maxLeadsPerBde ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] font-bold">
                              At Workload Cap
                            </span>
                          ) : pending >= Math.ceil(maxLeadsPerBde * 0.8) ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A] font-bold">
                              High Workload
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] font-bold">
                              Normal Capacity
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          <button
                            onClick={() => handleQuickReplenish(bde)}
                            disabled={!!reason}
                            title={reason || 'Add up to 5 pooled leads'}
                            className="px-3 py-1.5 rounded-xl shimmer-button text-white font-bold text-[11px] disabled:opacity-40 cursor-pointer shadow-xs"
                          >
                            Add Leads
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showStage2Modal && (
        <div className="fixed inset-0 bg-[#0F172A]/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="modal-panel bg-white w-full max-w-lg rounded-2xl p-6 border border-[#E2E8F0] shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                <FiSend className="text-[#2563EB]" />
                <span>Stage 2: Distribute to Team BDEs</span>
              </h3>
              <button
                onClick={() => setShowStage2Modal(false)}
                className="text-[#64748B] hover:text-[#0F172A] text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteStage2} className="space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E40AF] font-semibold">
                Total Unassigned Leads in {currentTeamName} Pool: <strong>{teamPoolLeads.length}</strong>
              </div>

              <div>
                <label htmlFor="allocation-method" className="block text-[#0F172A] font-bold mb-1">
                  Allocation Method
                </label>
                <select
                  id="allocation-method"
                  value={allocationMethod}
                  onChange={(e) => {
                    setAllocationMethod(e.target.value as AllocationMethod);
                    setAllocationError('');
                  }}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                >
                  <option value="EQUAL">Equal distribution</option>
                  <option value="WORKLOAD_BASED">Workload based</option>
                  <option value="MANUAL">Manual batch sizes</option>
                </select>
              </div>

              <div>
                <label className="block text-[#0F172A] font-bold mb-2">Select Eligible BDEs</label>
                <p className="text-[10px] text-[#64748B] mb-2 font-medium">
                  Only ACTIVE BDEs with free capacity can be selected. Punch-in is tracked for the signed-in
                  session only, so it is not used as an eligibility gate.
                </p>
                <div className="space-y-2">
                  {teamBdes.map((b) => {
                    const reason = bdeIneligibilityReason(b.id);
                    return (
                      <label
                        key={b.id}
                        className={`flex flex-wrap items-center gap-2.5 p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] transition-colors ${
                          reason ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-white'
                        }`}
                      >
                        <input
                          type="checkbox"
                          disabled={!!reason}
                          checked={selectedBdes.includes(b.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedBdes((prev) => [...prev, b.id]);
                              setManualQuotas((prev) => ({
                                ...prev,
                                [b.id]: clampBatch(countPerBde, maxBatchForBde(b.id)),
                              }));
                            } else {
                              setSelectedBdes((prev) => prev.filter((id) => id !== b.id));
                            }
                          }}
                          className="accent-[#2563EB]"
                        />
                        <span className="font-bold text-[#0F172A]">{b.name}</span>
                        <span className="text-[#2563EB] text-[10px] font-semibold">
                          {b.status} · {openLeadsForBde(b.id)}/{maxLeadsPerBde} open
                        </span>
                        {reason && (
                          <span className="text-[10px] font-bold text-[#DC2626]">({reason})</span>
                        )}
                      </label>
                    );
                  })}
                  {teamBdes.length === 0 && (
                    <p className="text-[11px] text-[#64748B]">No BDEs are assigned to this team.</p>
                  )}
                </div>
              </div>

              {allocationMethod !== 'MANUAL' && (
                <div>
                  <label className="block text-[#0F172A] font-bold mb-1">Leads per BDE</label>
                  <input
                    type="number"
                    min="1"
                    max={maxBatchCeiling}
                    value={countPerBde}
                    onChange={(e) => setCountPerBde(clampBatch(Number(e.target.value), maxBatchCeiling) || 1)}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] font-bold focus:outline-none focus:border-[#2563EB] focus:bg-white"
                  />
                  <p className="text-[10px] text-[#64748B] mt-1 font-medium">
                    Capped at {maxBatchCeiling} (pool size and remaining workload capacity).
                  </p>
                </div>
              )}

              {allocationMethod === 'MANUAL' && (
                <div className="space-y-2">
                  <label className="block text-[#0F172A] font-bold mb-1">Manual Batch Sizes</label>
                  {selectedBdes.map((id) => {
                    const bde = teamBdes.find((b) => b.id === id);
                    if (!bde) return null;
                    const cap = maxBatchForBde(id);
                    return (
                      <div
                        key={id}
                        className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]"
                      >
                        <div>
                          <div className="font-bold text-[#0F172A]">{bde.name}</div>
                          <div className="text-[10px] text-[#64748B]">
                            {openLeadsForBde(id)}/{maxLeadsPerBde} open · max {cap} batch
                          </div>
                        </div>
                        <input
                          type="number"
                          min="0"
                          max={cap}
                          value={manualQuotas[id] ?? 0}
                          onChange={(e) =>
                            setManualQuotas((prev) => ({
                              ...prev,
                              [id]: clampBatch(Number(e.target.value), cap),
                            }))
                          }
                          className="w-20 bg-white border border-[#E2E8F0] rounded-xl p-2 text-[#0F172A] font-bold focus:outline-none focus:border-[#2563EB]"
                        />
                      </div>
                    );
                  })}
                  {selectedBdes.length === 0 && (
                    <p className="text-[11px] text-[#DC2626] font-semibold">
                      Select at least one eligible BDE to set a manual batch.
                    </p>
                  )}
                  <p className="text-[10px] text-[#64748B] font-medium">
                    Each batch is clamped to min(leads per BDE, free capacity, pool size); the combined total
                    cannot exceed {teamPoolLeads.length} pooled leads.
                  </p>
                </div>
              )}

              {allocationError && (
                <p className="text-[11px] font-semibold text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] rounded-xl p-2.5">
                  {allocationError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setShowStage2Modal(false)}
                  className="px-4 py-2 rounded-xl bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0] text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl shimmer-button text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  Distribute Leads
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {showReassignModal && (
        <div className="fixed inset-0 bg-[#0F172A]/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="modal-panel bg-white w-full max-w-lg rounded-2xl p-6 border border-[#E2E8F0] shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h3 className="text-base font-bold text-[#0F172A]">Reassign Leads (Absence / Deactivation)</h3>
              <button
                onClick={() => setShowReassignModal(false)}
                className="text-[#64748B] hover:text-[#0F172A] text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteReassign} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#0F172A] font-bold mb-1">From Absent BDE</label>
                <select
                  value={reassignFromBde}
                  onChange={(e) => {
                    setReassignFromBde(e.target.value);
                    setReassignError('');
                  }}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                >
                  <option value="">Select source BDE...</option>
                  {teamBdes.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#0F172A] font-bold mb-1">To Active BDE</label>
                <select
                  value={reassignToBde}
                  onChange={(e) => {
                    setReassignToBde(e.target.value);
                    setReassignError('');
                  }}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                >
                  <option value="">Select target BDE...</option>
                  {teamBdes
                    .filter((b) => b.status === 'ACTIVE' && b.id !== reassignFromBde)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                </select>
              </div>

              {reassignError && (
                <p className="text-[11px] font-semibold text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] rounded-xl p-2.5">
                  {reassignError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setShowReassignModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0] text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl shimmer-button text-white text-xs font-bold cursor-pointer shadow-md"
                >
                  Transfer Active Leads
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default TLDashboard;
