import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/useApp';
import type { User } from '../../types';
import { calculateConversionRate } from '../../utils/calculations';
import { motion } from 'framer-motion';
import {
  FiUsers,
  FiRepeat,
  FiSend,
  FiUserCheck,
  FiArrowLeft,
  FiAlertTriangle,
} from 'react-icons/fi';
import { APP_ROUTES, OPEN_LEAD_STATUSES } from '../../utils/constants';

type AllocationMethod = 'EQUAL' | 'WORKLOAD_BASED' | 'MANUAL';

export const TLDistribution: React.FC = () => {
  const navigate = useNavigate();
  const {
    leads,
    users,
    teams,
    currentUser,
    systemSettings,
    allocateStage2TeamToBdes,
    replenishmentAlerts,
    clearReplenishmentAlert,
    reassignBdeLeads,
    escalatePoolEmpty,
    clearPoolEscalation,
  } = useApp();

  const userTeamId = currentUser.teamId || 'team-1';
  const currentTeamName =
    teams.find((team) => team.id === userTeamId)?.name || currentUser.teamName || 'Team Alpha';
  const maxLeadsPerBde = systemSettings.maxLeadsPerBde;

  const teamLeads = leads.filter((l) => l.currentTeamId === userTeamId);
  const teamPoolLeads = teamLeads.filter(
    (l) => !l.currentBdeId && OPEN_LEAD_STATUSES.includes(l.status)
  );

  const teamBdes = users.filter((u) => u.teamId === userTeamId && u.role === 'BDE');
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

  const [actionStatus, setActionStatus] = useState('');
  const [actionError, setActionError] = useState('');

  // Modals
  const [showStage2Modal, setShowStage2Modal] = useState(false);
  const [allocationMethod, setAllocationMethod] = useState<AllocationMethod>('EQUAL');
  const [selectedBdes, setSelectedBdes] = useState<string[]>([]);
  const [countPerBde, setCountPerBde] = useState<number>(3);
  const [manualQuotas, setManualQuotas] = useState<Record<string, number>>({});
  const [allocationError, setAllocationError] = useState('');

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
      setActionError(`${currentTeamName}'s pool is empty. Admin has been notified.`);
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

    const eligibleIds = selectedBdes.filter((id) => !bdeIneligibilityReason(id));
    if (!eligibleIds.length) {
      setAllocationError('Select at least one active BDE with available workload capacity.');
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
      setActionStatus(`Distributed ${allocated} leads to active BDEs.`);
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
      clearReplenishmentAlert(bde.id);
    } else {
      setActionError(`No leads were added to ${bde.name}.`);
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
      setReassignError('Reassignment failed. Confirm both BDEs are active and source has open leads.');
      return;
    }
    clearReplenishmentAlert(reassignFromBde);
    const targetName = teamBdes.find((b) => b.id === reassignToBde)?.name || 'target BDE';
    setActionStatus(`Open leads were reassigned to ${targetName}.`);
    setShowReassignModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-6">
        <div className="max-w-2xl min-w-0">
          <button
            onClick={() => navigate(APP_ROUTES.TEAM_LEAD.DASHBOARD)}
            className="flex items-center gap-1.5 text-xs font-bold text-[#64748B] hover:text-[#2563EB] mb-2 cursor-pointer transition-colors"
          >
            <FiArrowLeft />
            <span>Back to Team Workbench</span>
          </button>
          <div className="flex items-center gap-2 text-[#2563EB] text-xs font-bold uppercase tracking-wider mb-1">
            <FiUsers />
            <span>Frontline Workforce Balancing</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-[#0F172A] tracking-tight">
            BDE Distribution & Workload Matrix
          </h1>
          <p className="text-[#64748B] text-xs sm:text-sm mt-1 leading-relaxed">
            Monitor real-time executive queue depth, distribute pooled leads, and reassign workloads during team leave.
          </p>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 flex-wrap sm:flex-nowrap">
          <button
            onClick={openReassignModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-white hover:bg-[#F8FAFC] text-[#0F172A] border border-[#CBD5E1] text-xs font-bold shadow-xs cursor-pointer whitespace-nowrap"
          >
            <FiRepeat className="text-[#2563EB]" />
            <span>Reassign Leads (Absence / Leave)</span>
          </button>
          <button
            onClick={openStage2Modal}
            className="inline-flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl shimmer-button text-white font-bold text-xs shadow-md transition-all cursor-pointer whitespace-nowrap"
          >
            <FiSend />
            <span>Batch Distribute ({teamPoolLeads.length} in Pool)</span>
          </button>
        </div>
      </div>

      {/* Action Banner */}
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

      {/* Alert Banner */}
      {teamAlerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 sm:p-5 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] space-y-3 shadow-xs"
        >
          <div className="flex items-center gap-2 text-[#D97706] font-bold text-sm">
            <FiAlertTriangle className="text-lg text-[#D97706] animate-bounce" />
            <span>Queue Empty Alerts ({teamAlerts.length} Executives Waiting)</span>
          </div>
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
                    <div className="text-[10px] text-[#64748B]">Queue empty</div>
                  </div>
                  <button
                    onClick={() => bde && handleQuickReplenish(bde)}
                    disabled={!bde || !!reason}
                    className="px-3 py-1.5 rounded-lg shimmer-button text-white font-bold text-xs cursor-pointer shadow-xs disabled:opacity-40"
                  >
                    Quick Replenish (+5)
                  </button>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Workload Matrix Table */}
      <div className="glass-panel rounded-2xl border border-[#CBD5E1] bg-white overflow-hidden shadow-xs">
        <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between bg-white">
          <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
            <FiUserCheck className="text-[#2563EB]" />
            <span>BDE Workload Balancing & Quota Matrix ({teamBdes.length} Executives)</span>
          </h3>
          <span className="text-xs text-[#64748B] font-semibold">Max Threshold: {maxLeadsPerBde} leads</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-[#64748B] font-bold bg-[#F8FAFC]">
                <th className="py-3.5 px-4">Executive Name</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-center">Total Assigned</th>
                <th className="py-3.5 px-4 text-center">Active Queue</th>
                <th className="py-3.5 px-4 text-center">Conversions</th>
                <th className="py-3.5 px-4 text-center">Win Rate %</th>
                <th className="py-3.5 px-4">Workload Status</th>
                <th className="py-3.5 px-4 text-right">Quick Allocation</th>
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
                    <td className="py-3.5 px-4 font-bold text-[#0F172A]">{bde.name}</td>
                    <td className="py-3.5 px-4">
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
                    <td className="py-3.5 px-4 text-center font-semibold text-[#0F172A]">{bdeLeads.length}</td>
                    <td className="py-3.5 px-4 text-center font-bold">
                      <span className={pending === 0 ? 'text-[#D97706]' : 'text-[#2563EB]'}>
                        {pending} / {maxLeadsPerBde}
                      </span>
                      <div className="w-24 bg-[#E2E8F0] h-1.5 rounded-full mx-auto mt-1 overflow-hidden">
                        <div
                          className={`h-full ${
                            pending >= maxLeadsPerBde
                              ? 'bg-[#DC2626]'
                              : pending >= maxLeadsPerBde * 0.8
                              ? 'bg-[#D97706]'
                              : 'bg-[#2563EB]'
                          }`}
                          style={{ width: `${Math.min(100, (pending / maxLeadsPerBde) * 100)}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-[#2563EB]">{conv}</td>
                    <td className="py-3.5 px-4 text-center font-black text-[#0F172A]">{convPct}%</td>
                    <td className="py-3.5 px-4">
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
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] font-bold">
                          {capacity} slots free
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleQuickReplenish(bde)}
                        disabled={!!reason}
                        className="px-3 py-1.5 rounded-xl shimmer-button text-white font-bold text-[11px] disabled:opacity-40 cursor-pointer shadow-xs"
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

      {/* Stage 2 Modal */}
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
                <span>Distribute Leads to Team BDEs</span>
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
                Available in Pool: <strong>{teamPoolLeads.length} leads</strong>
              </div>

              <div>
                <label className="block text-[#0F172A] font-bold mb-1">Strategy</label>
                <select
                  value={allocationMethod}
                  onChange={(e) => {
                    setAllocationMethod(e.target.value as AllocationMethod);
                    setAllocationError('');
                  }}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                >
                  <option value="EQUAL">Equal Distribution</option>
                  <option value="WORKLOAD_BASED">Workload-Based (Free Capacity)</option>
                  <option value="MANUAL">Manual Batch Quotas</option>
                </select>
              </div>

              <div>
                <label className="block text-[#0F172A] font-bold mb-2">Select Target BDEs</label>
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
                        {reason && <span className="text-[10px] font-bold text-[#DC2626]">({reason})</span>}
                      </label>
                    );
                  })}
                </div>
              </div>

              {allocationMethod !== 'MANUAL' && (
                <div>
                  <label className="block text-[#0F172A] font-bold mb-1">Batch per BDE</label>
                  <input
                    type="number"
                    min="1"
                    max={maxBatchCeiling}
                    value={countPerBde}
                    onChange={(e) => setCountPerBde(clampBatch(Number(e.target.value), maxBatchCeiling) || 1)}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] font-bold focus:outline-none focus:border-[#2563EB]"
                  />
                  <p className="text-[10px] text-[#64748B] mt-1 font-medium">Max ceiling: {maxBatchCeiling}</p>
                </div>
              )}

              {allocationMethod === 'MANUAL' && (
                <div className="space-y-2">
                  <label className="block text-[#0F172A] font-bold mb-1">Manual Quotas</label>
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
                          <div className="text-[10px] text-[#64748B]">max {cap} batch</div>
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

      {/* Reassign Modal */}
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
                      {b.name} ({openLeadsForBde(b.id)} open leads)
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
                        {b.name} ({bdeCapacity(b.id)} slots free)
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

export default TLDistribution;
