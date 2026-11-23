import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/useApp';
import type { User, LeadStatus } from '../../types';
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
} from 'react-icons/fi';
import { APP_ROUTES, OPEN_LEAD_STATUSES, LEAD_STATUS_CONFIG } from '../../utils/constants';

export const TLWorkbench: React.FC = () => {
  const navigate = useNavigate();

  const {
    leads,
    users,
    teams,
    currentUser,
    systemSettings,
    followUps,
    leadStatusHistory,
    attendanceRecords,
    allocateStage2TeamToBdes,
    replenishmentAlerts,
    clearReplenishmentAlert,
    escalatePoolEmpty,
  } = useApp();

  const userTeamId = currentUser.teamId || 'team-1';
  const currentTeamName =
    teams.find((team) => team.id === userTeamId)?.name || currentUser.teamName || 'Team Alpha';
  const maxLeadsPerBde = systemSettings.maxLeadsPerBde;

  // Filter team-specific data
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

  // Attendance metrics
  const today = new Date().toISOString().split('T')[0];
  const todayAttendance = attendanceRecords.filter(
    (a) => a.date === today && teamBdeIds.has(a.userId)
  );
  const presentCount = todayAttendance.filter((a) => a.status === 'PRESENT' || a.status === 'LATE').length;

  // Overdue followups
  const nowMs = Date.now();
  const overdueFollowUps = followUps.filter((item) => {
    if (item.status !== 'PENDING' || !teamBdeIds.has(item.bdeId)) return false;
    const scheduled = new Date(item.scheduledTime).getTime();
    return !Number.isNaN(scheduled) && scheduled < nowMs;
  }).length;

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

  // Lead queue search & filter in workbench
  const [queueSearch, setQueueSearch] = useState('');
  const [queueStatusFilter, setQueueStatusFilter] = useState('ALL');
  const [queueBdeFilter, setQueueBdeFilter] = useState('ALL');

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
      clearReplenishmentAlert(bde.id);
    } else {
      setActionError(`No leads were added to ${bde.name}. Its queue may have reached the workload cap.`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-6">
        <div>
          <div className="flex items-center gap-2 text-[#059669] text-xs font-bold uppercase tracking-wider mb-1">
            <FiUsers />
            <span>Team Lead Operational Command</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-[#0F172A] tracking-tight">
            Team Workbench: {currentTeamName}
          </h1>
          <p className="text-[#64748B] text-xs sm:text-sm mt-1 leading-relaxed">
            Real-time frontline operations workbench for supervising BDE call activity, queue balancing, and stage progression.
          </p>
        </div>
      </div>

      {/* Action Banners */}
      {(actionStatus || actionError) && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold border flex items-center justify-between ${
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
          className="p-4 sm:p-5 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] space-y-3 shadow-xs"
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
                  className="flex items-center justify-between gap-4 p-3 rounded-xl bg-white border border-[#E2E8F0] text-xs shadow-xs"
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        <motion.div
          whileHover={{ y: -2 }}
          onClick={() => navigate(APP_ROUTES.TEAM_LEAD.LEAD_POOL)}
          className="glass-panel p-4 rounded-2xl border border-[#CBD5E1] bg-white cursor-pointer hover:border-[#10B981] transition-all"
        >
          <div className="flex items-center justify-between text-[#64748B] text-xs font-bold">
            <span className="truncate">Team Pool</span>
            <div className="p-1.5 rounded-lg bg-[#ECFDF5] text-[#059669]">
              <FiLayers />
            </div>
          </div>
          <div className="text-2xl font-black text-[#059669] mt-1.5">{teamPoolLeads.length}</div>
          <div className="text-[11px] text-[#64748B] mt-0.5 font-medium flex items-center justify-between">
            <span>Unassigned</span>
            <span className="text-[#059669] font-bold">View Pool →</span>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          onClick={() => navigate(APP_ROUTES.TEAM_LEAD.DISTRIBUTION)}
          className="glass-panel p-4 rounded-2xl border border-[#CBD5E1] bg-white cursor-pointer hover:border-[#10B981] transition-all"
        >
          <div className="flex items-center justify-between text-[#64748B] text-xs font-bold">
            <span className="truncate">Active in Queue</span>
            <div className="p-1.5 rounded-lg bg-[#ECFDF5] text-[#059669]">
              <FiPhoneForwarded />
            </div>
          </div>
          <div className="text-2xl font-black text-[#0F172A] mt-1.5">{teamDistributedLeads.length}</div>
          <div className="text-[11px] text-[#64748B] mt-0.5 font-medium flex items-center justify-between">
            <span>In BDE Queues</span>
            <span className="text-[#059669] font-bold">Matrix →</span>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} className="glass-panel p-4 rounded-2xl border border-[#CBD5E1] bg-white">
          <div className="flex items-center justify-between text-[#64748B] text-xs font-bold">
            <span className="truncate">Conversions</span>
            <div className="p-1.5 rounded-lg bg-[#ECFDF5] text-[#059669]">
              <FiCheckCircle />
            </div>
          </div>
          <div className="text-2xl font-black text-[#059669] mt-1.5">{teamConvertedLeads.length}</div>
          <div className="text-[11px] text-[#64748B] mt-0.5 font-medium">Closed Deals</div>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} className="glass-panel p-4 rounded-2xl border border-[#CBD5E1] bg-white">
          <div className="flex items-center justify-between text-[#64748B] text-xs font-bold">
            <span className="truncate">Win Rate %</span>
            <div className="p-1.5 rounded-lg bg-[#ECFDF5] text-[#059669]">
              <FiTrendingUp />
            </div>
          </div>
          <div className="text-2xl font-black text-[#0F172A] mt-1.5">{teamConversionPct}%</div>
          <div className="text-[11px] text-[#64748B] mt-0.5 font-medium">Converted / Total</div>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          onClick={() => navigate(APP_ROUTES.TEAM_LEAD.ATTENDANCE)}
          className="glass-panel p-4 rounded-2xl border border-[#CBD5E1] bg-white cursor-pointer hover:border-[#10B981] transition-all"
        >
          <div className="flex items-center justify-between text-[#64748B] text-xs font-bold">
            <span className="truncate">Attendance Today</span>
            <div className="p-1.5 rounded-lg bg-[#ECFDF5] text-[#059669]">
              <FiClock />
            </div>
          </div>
          <div className="text-2xl font-black text-[#0F172A] mt-1.5">
            {presentCount} / {teamBdes.length}
          </div>
          <div className="text-[11px] text-[#64748B] mt-0.5 font-medium flex items-center justify-between">
            <span>Clocked In</span>
            <span className="text-[#059669] font-bold">Review →</span>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} className="glass-panel p-4 rounded-2xl border border-[#CBD5E1] bg-white">
          <div className="flex items-center justify-between text-[#64748B] text-xs font-bold">
            <span className="truncate">Overdue Calls</span>
            <div className="p-1.5 rounded-lg bg-[#FFFBEB] text-[#D97706]">
              <FiCalendar />
            </div>
          </div>
          <div className="text-2xl font-black text-[#D97706] mt-1.5">{overdueFollowUps}</div>
          <div className="text-[11px] text-[#64748B] mt-0.5 font-medium">Pending Callbacks</div>
        </motion.div>
      </div>

      {/* Frontline BDE Workload & Queue Status Table */}
      <div className="glass-panel rounded-2xl border border-[#CBD5E1] bg-white overflow-hidden shadow-xs">
        <div className="p-4 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
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
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-[#64748B] font-bold bg-[#F8FAFC]">
                <th className="py-3 px-4">BDE Name</th>
                <th className="py-3 px-4">Employee Status</th>
                <th className="py-3 px-4 text-center">Allocated</th>
                <th className="py-3 px-4 text-center">Working Queue</th>
                <th className="py-3 px-4 text-center">Conversions</th>
                <th className="py-3 px-4 text-center">Win Rate %</th>
                <th className="py-3 px-4">Capacity Status</th>
                <th className="py-3 px-4 text-right">Quick Action</th>
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
                    <td className="py-3 px-4 font-bold text-[#0F172A]">{bde.name}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          bde.status === 'ACTIVE'
                            ? 'bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]'
                            : 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]'
                        }`}
                      >
                        {bde.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-[#0F172A]">{bdeLeads.length}</td>
                    <td className="py-3 px-4 text-center font-bold">
                      <span className={pending === 0 ? 'text-[#D97706]' : 'text-[#059669]'}>
                        {pending} / {maxLeadsPerBde}
                      </span>
                      <div className="w-24 bg-[#E2E8F0] h-1.5 rounded-full mx-auto mt-1 overflow-hidden">
                        <div
                          className={`h-full ${
                            pending >= maxLeadsPerBde
                              ? 'bg-[#DC2626]'
                              : pending >= maxLeadsPerBde * 0.8
                              ? 'bg-[#D97706]'
                              : 'bg-[#10B981]'
                          }`}
                          style={{ width: `${Math.min(100, (pending / maxLeadsPerBde) * 100)}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-[#059669]">{conv}</td>
                    <td className="py-3 px-4 text-center font-black text-[#0F172A]">{convPct}%</td>
                    <td className="py-3 px-4">
                      {reason ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] font-bold">
                          {reason}
                        </span>
                      ) : pending === 0 ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A] font-bold">
                          Queue Empty
                        </span>
                      ) : pending >= maxLeadsPerBde ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] font-bold">
                          At Cap
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] font-bold">
                          {capacity} slots free
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleQuickReplenish(bde)}
                        disabled={!!reason}
                        className="px-3 py-1 rounded-xl shimmer-button text-white font-bold text-[11px] disabled:opacity-40 cursor-pointer shadow-xs"
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
        <div className="p-4 border-b border-[#E2E8F0] flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white">
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
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
              <input
                type="text"
                placeholder="Search candidates, phone..."
                value={queueSearch}
                onChange={(e) => setQueueSearch(e.target.value)}
                className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-9 pr-3 py-1.5 text-xs font-semibold text-[#0F172A] placeholder-[#64748B] focus:outline-none focus:border-[#10B981]"
              />
            </div>

            <select
              value={queueBdeFilter}
              onChange={(e) => setQueueBdeFilter(e.target.value)}
              className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-2.5 py-1.5 text-xs font-semibold text-[#0F172A] focus:outline-none focus:border-[#10B981]"
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
              className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-2.5 py-1.5 text-xs font-semibold text-[#0F172A] focus:outline-none focus:border-[#10B981]"
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
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-[#64748B] font-bold bg-[#F8FAFC]">
                <th className="py-3 px-4">Candidate</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Assigned BDE</th>
                <th className="py-3 px-4">Current Status</th>
                <th className="py-3 px-4">Program / Education</th>
                <th className="py-3 px-4">Next Follow-Up</th>
                <th className="py-3 px-4">Last Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filteredQueueLeads.map((lead) => {
                const conf = LEAD_STATUS_CONFIG[lead.status as LeadStatus] || {
                  label: lead.status,
                  color: '#64748B',
                };
                return (
                  <tr key={lead.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3 px-4 font-bold text-[#0F172A]">{lead.candidateName}</td>
                    <td className="py-3 px-4 font-mono text-[#475569]">{lead.phone}</td>
                    <td className="py-3 px-4 font-semibold text-[#059669]">{lead.currentBdeName || 'Assigned BDE'}</td>
                    <td className="py-3 px-4">
                      <span
                        className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border"
                        style={{
                          backgroundColor: `${conf.color}15`,
                          borderColor: `${conf.color}40`,
                          color: conf.color,
                        }}
                      >
                        {conf.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-[#0F172A]">{lead.education || 'Graduate'}</td>
                    <td className="py-3 px-4 text-[#64748B] font-mono text-[11px]">
                      {lead.nextFollowUpDate || '—'}
                    </td>
                    <td className="py-3 px-4 text-[#64748B] max-w-xs truncate">
                      {leadStatusHistory.find((h) => h.leadId === lead.id)?.remarks || (lead as any).remarks || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredQueueLeads.length === 0 && (
          <div className="p-8 text-center text-[#64748B] text-xs">
            No active queue leads matched your search criteria.
          </div>
        )}
      </div>
    </div>
  );
};

export default TLWorkbench;
