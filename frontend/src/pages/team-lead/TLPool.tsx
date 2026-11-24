import React, { useState } from 'react';
import { useApp } from '../../context/useApp';
import { motion } from 'framer-motion';
import {
  FiLayers,
  FiSearch,
  FiFilter,
  FiSend,
} from 'react-icons/fi';
import { OPEN_LEAD_STATUSES } from '../../utils/constants';

type AllocationMethod = 'EQUAL' | 'WORKLOAD_BASED' | 'MANUAL';

export const TLPool: React.FC = () => {
  const {
    leads,
    users,
    teams,
    managedTeamIds,
    systemSettings,
    allocateStage2TeamToBdes,
    escalatePoolEmpty,
    clearPoolEscalation,
  } = useApp();

  const [selectedTeamId, setSelectedTeamId] = useState<string>('ALL');

  const maxLeadsPerBde = systemSettings.maxLeadsPerBde;

  const managedTeams = teams.filter((team) => managedTeamIds.includes(team.id));
  const managedTeamNames = managedTeams.map((team) => team.name);
  const effectiveTeamIds =
    selectedTeamId === 'ALL'
      ? managedTeamIds
      : managedTeamIds.includes(selectedTeamId)
      ? [selectedTeamId]
      : [];
  const activeTeamName =
    selectedTeamId === 'ALL'
      ? managedTeamNames.length > 0
        ? `All Teams (${managedTeamNames.join(' & ')})`
        : 'All Teams (Unassigned)'
      : teams.find((t) => t.id === selectedTeamId)?.name || 'Unassigned';

  const teamLeads = leads.filter((l) => effectiveTeamIds.includes(l.currentTeamId || ''));
  const teamPoolLeads = teamLeads.filter(
    (l) => !l.currentBdeId && OPEN_LEAD_STATUSES.includes(l.status)
  );

  const teamBdes = users.filter((u) => effectiveTeamIds.includes(u.teamId || '') && u.role === 'BDE');
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

  const [poolSearch, setPoolSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [actionStatus, setActionStatus] = useState('');
  const [actionError, setActionError] = useState('');

  const sourceOptions = Array.from(
    new Set(teamPoolLeads.map((lead) => lead.source?.trim()).filter((value): value is string => !!value))
  ).sort();

  const filteredPoolLeads = teamPoolLeads.filter((l) => {
    const matchesSearch =
      l.candidateName.toLowerCase().includes(poolSearch.toLowerCase()) ||
      l.phone.includes(poolSearch) ||
      (l.email && l.email.toLowerCase().includes(poolSearch.toLowerCase())) ||
      (l.city && l.city.toLowerCase().includes(poolSearch.toLowerCase()));
    const matchesSource =
      sourceFilter === 'ALL' || (l.source || '').toLowerCase() === sourceFilter.toLowerCase();
    return matchesSearch && matchesSource;
  });

  // Stage 2 Modal state
  const [showStage2Modal, setShowStage2Modal] = useState(false);
  const [allocationMethod, setAllocationMethod] = useState<AllocationMethod>('EQUAL');
  const [selectedBdes, setSelectedBdes] = useState<string[]>([]);
  const [countPerBde, setCountPerBde] = useState<number>(3);
  const [manualQuotas, setManualQuotas] = useState<Record<string, number>>({});
  const [allocationError, setAllocationError] = useState('');

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
      effectiveTeamIds.forEach((teamId) => {
        const hasPool = leads.some(
          (lead) =>
            lead.currentTeamId === teamId &&
            !lead.currentBdeId &&
            OPEN_LEAD_STATUSES.includes(lead.status)
        );
        if (!hasPool) escalatePoolEmpty(teamId);
      });
      setActionError(`${activeTeamName}'s pool is empty. Admin has been notified.`);
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

    // Allocate per team if multiple teams selected
    let totalAllocated = 0;
    const targetTeams = selectedTeamId === 'ALL' ? managedTeams : managedTeams.filter((t) => t.id === selectedTeamId);
    targetTeams.forEach((t) => {
      const teamEligibleBdes = eligibleIds.filter((bId) => {
        const b = users.find((u) => u.id === bId);
        return b?.teamId === t.id;
      });
      if (teamEligibleBdes.length > 0) {
        const teamPoolCount = leads.filter(
          (lead) =>
            lead.currentTeamId === t.id &&
            !lead.currentBdeId &&
            OPEN_LEAD_STATUSES.includes(lead.status)
        ).length;
        const teamCapacity = teamEligibleBdes.reduce((sum, id) => sum + bdeCapacity(id), 0);
        const teamBatch = Math.max(1, Math.min(batch, teamPoolCount, teamCapacity));
        const count = allocateStage2TeamToBdes(
          t.id,
          teamEligibleBdes,
          teamBatch,
          allocationMethod,
          allocationMethod === 'MANUAL' ? manualBatchQuotas : undefined
        );
        totalAllocated += count;
        if (count > 0) clearPoolEscalation(t.id);
      }
    });

    if (totalAllocated > 0) {
      setActionStatus(`Successfully distributed ${totalAllocated} leads across selected BDEs.`);
      setShowStage2Modal(false);
    } else {
      setAllocationError('No leads were allocated. Check pool availability and BDE workload capacity.');
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 border-b border-[#E2E8F0] pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#059669]">
            <FiLayers />
            <span>Lead Inventory &amp; Pool Governance · {managedTeamNames.join(' & ') || 'Unassigned'}</span>
          </div>
          <h1 className="break-words text-2xl font-black leading-tight tracking-tight text-[#0F172A] sm:text-3xl">
            {activeTeamName} Lead Pool
          </h1>
          <p className="mt-1 text-xs leading-relaxed text-[#64748B] sm:text-sm">
            Browse and search candidate leads allocated from Admin Master Pool, waiting for Stage 2 distribution to BDEs.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 shrink-0 self-start lg:self-center">
          {/* Team Switcher Tabs */}
          <div className="inline-flex items-center gap-1 rounded-xl border border-[#E2E8F0] bg-[#F1F5F9] p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => setSelectedTeamId('ALL')}
              className={`rounded-lg px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer ${
                selectedTeamId === 'ALL'
                  ? 'bg-white text-[#059669] shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              All Pools
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

          <button
            onClick={openStage2Modal}
            disabled={teamPoolLeads.length === 0}
            className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-xs font-bold text-white shadow-md transition-colors ${
              teamPoolLeads.length === 0
                ? 'bg-[#94A3B8] cursor-not-allowed opacity-75'
                : 'shimmer-button cursor-pointer'
            }`}
          >
            <FiSend />
            <span>Batch Allocate to BDEs ({teamPoolLeads.length} Available)</span>
          </button>
        </div>
      </div>

      {/* Action Banner */}
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

      {/* Search & Filter Bar */}
      <div className="glass-panel flex flex-col gap-3 rounded-2xl border border-[#CBD5E1] bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B]" />
          <input
            type="text"
            placeholder="Search candidate name, phone, email, city..."
            value={poolSearch}
            onChange={(e) => setPoolSearch(e.target.value)}
            className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold text-[#0F172A] placeholder-[#64748B] focus:outline-none focus:border-[#10B981]"
          />
        </div>

        <div className="flex items-center gap-2">
          <FiFilter className="text-[#64748B]" />
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2.5 text-xs font-semibold text-[#0F172A] focus:outline-none focus:border-[#10B981]"
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

      {/* Pool Table */}
      <div className="glass-panel rounded-2xl border border-[#CBD5E1] bg-white overflow-hidden shadow-xs">
        <div className="flex flex-col gap-3 border-b border-[#E2E8F0] bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
            <FiLayers className="text-[#059669]" />
            <span>Unassigned Pool Candidates ({filteredPoolLeads.length} Leads)</span>
          </h3>
          <span className="text-xs text-[#64748B] font-medium">
            Stage 1 Pool Allocation Verified
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                <th className="px-4 py-3.5 sm:px-5">Candidate Name</th>
                <th className="px-4 py-3.5 sm:px-5">Contact Phone</th>
                <th className="px-4 py-3.5 sm:px-5">Email</th>
                <th className="px-4 py-3.5 sm:px-5">Location</th>
                <th className="px-4 py-3.5 sm:px-5">Education / Program</th>
                <th className="px-4 py-3.5 sm:px-5">Acquisition Channel</th>
                <th className="px-4 py-3.5 sm:px-5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filteredPoolLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="px-4 py-3.5 sm:px-5 font-bold text-[#0F172A]">{lead.candidateName}</td>
                  <td className="px-4 py-3.5 sm:px-5 font-mono text-[#475569]">{lead.phone}</td>
                  <td className="px-4 py-3.5 sm:px-5 text-[#64748B]">{lead.email || '—'}</td>
                  <td className="px-4 py-3.5 sm:px-5 text-[#64748B]">{lead.city || 'India'}</td>
                  <td className="px-4 py-3.5 sm:px-5 font-medium text-[#0F172A]">{lead.education || 'Graduate'}</td>
                  <td className="px-4 py-3.5 sm:px-5">
                    <span className="rounded-full px-2.5 py-1 text-[10px] font-bold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
                      {lead.source || 'Website'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 sm:px-5 text-center">
                    <span className="rounded-full px-2.5 py-1 text-[10px] font-bold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
                      Ready in Pool
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredPoolLeads.length === 0 && (
          <div className="border-t border-[#E2E8F0] px-5 py-10 text-center text-xs text-[#64748B]">
            No leads in the team pool matched your filters.
          </div>
        )}
      </div>

      {/* Stage 2 Modal */}
      {showStage2Modal && (
        <div className="fixed inset-0 bg-[#0F172A]/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="modal-panel w-full max-w-lg space-y-5 rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-2xl sm:p-6"
          >
            <div className="flex items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
              <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                <FiSend className="text-[#059669]" />
                <span>Distribute Leads to Team BDEs</span>
              </h3>
              <button
                onClick={() => setShowStage2Modal(false)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg font-bold text-[#64748B] cursor-pointer hover:text-[#0F172A]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteStage2} className="space-y-4 text-xs">
              <div className="rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] p-4 font-semibold text-[#065F46]">
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
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] focus:outline-none focus:border-[#10B981]"
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
                        className={`flex flex-wrap items-center gap-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 transition-colors ${
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
                          className="accent-[#10B981]"
                        />
                        <span className="font-bold text-[#0F172A]">{b.name}</span>
                        <span className="text-[#059669] text-[10px] font-semibold">
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
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] font-bold focus:outline-none focus:border-[#10B981]"
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
                        className="flex items-center justify-between gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5"
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
                          className="w-20 bg-white border border-[#E2E8F0] rounded-xl p-2 text-[#0F172A] font-bold focus:outline-none focus:border-[#10B981]"
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

              <div className="flex justify-end gap-2 border-t border-[#E2E8F0] pt-4">
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
    </div>
  );
};

export default TLPool;
