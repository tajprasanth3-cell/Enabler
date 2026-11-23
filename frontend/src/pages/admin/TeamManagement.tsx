import React, { useState } from 'react';
import { useApp } from '../../context/useApp';
import { motion } from 'framer-motion';
import {
  FiUsers,
  FiPlusCircle,
  FiAlertCircle,
} from 'react-icons/fi';

export const TeamManagement: React.FC = () => {
  const { teams, users, toggleUserStatus, createTeam } = useApp();

  const [showAddTeamModal, setShowAddTeamModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [selectedTLId, setSelectedTLId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const ledTeamIds = new Set(teams.map((t) => t.teamLeadId).filter(Boolean));
  const eligibleTeamLeads = users.filter(
    (u) => u.role === 'TEAM_LEAD' && u.status === 'ACTIVE' && !ledTeamIds.has(u.id)
  );

  const handleCreateTeamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim() || !selectedTLId) {
      setFormError('Team name and team lead are required.');
      return;
    }
    if (!createTeam(newTeamName.trim(), selectedTLId)) {
      setFormError('Could not create the team. The selected team lead may already lead a team.');
      return;
    }
    setFormError(null);
    setShowAddTeamModal(false);
    setNewTeamName('');
    setSelectedTLId('');
  };

  const handleToggleStatus = (memberId: string, name: string, isActive: boolean) => {
    if (!toggleUserStatus(memberId)) {
      setFormError(`Could not ${isActive ? 'deactivate' : 'activate'} ${name}. The last active admin cannot be deactivated.`);
      return;
    }
    setFormError(null);
  };

  const handleOpenCreateTeam = () => {
    if (!eligibleTeamLeads.length) {
      setFormError('No eligible team leads are available. Add a new team lead before creating another team.');
      return;
    }
    setFormError(null);
    setSelectedTLId(eligibleTeamLeads[0].id);
    setShowAddTeamModal(true);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
        <div>
          <div className="flex items-center gap-2 text-[#059669] text-xs font-bold uppercase tracking-wider mb-1">
            <FiUsers />
            <span>Hierarchy & Organizational Structure</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-[#0F172A] tracking-tight">
            Teams & Workforce Directory
          </h1>
          <p className="text-[#64748B] text-sm mt-1">
            Configure dynamic hierarchy: Admin → Team Leads → Business Development Executives.
          </p>
        </div>

        <button
          onClick={handleOpenCreateTeam}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl shimmer-button text-white font-bold text-xs shadow-md transition-all cursor-pointer"
        >
          <FiPlusCircle />
          <span>Create New Team</span>
        </button>
      </div>

      {formError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] text-xs font-bold flex items-center gap-2"
        >
          <FiAlertCircle className="text-base shrink-0" />
          <span>{formError}</span>
          <button
            onClick={() => setFormError(null)}
            className="ml-auto font-bold cursor-pointer"
            aria-label="Dismiss message"
          >
            ✕
          </button>
        </motion.div>
      )}

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams.map((t) => {
          const members = users.filter((u) => u.teamId === t.id);
          return (
            <motion.div
              key={t.id}
              whileHover={{ y: -3 }}
              className="glass-panel rounded-2xl p-4 sm:p-5 space-y-4 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-[#0F172A]">{t.name}</h3>
                  <div className="text-xs text-[#059669] font-bold">
                    Team Lead: {t.teamLeadName || 'Unassigned'}
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
                  {t.status}
                </span>
              </div>

              <div className="p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-2 text-xs">
                <div className="flex justify-between text-[#64748B]">
                  <span>Assigned BDE Count:</span>
                  <span className="text-[#0F172A] font-bold">{members.filter((m) => m.role === 'BDE').length} Executives</span>
                </div>
                <div className="flex justify-between text-[#64748B]">
                  <span>Active Capacity:</span>
                  <span className="text-[#059669] font-bold">
                    {members.filter((m) => m.role === 'BDE' && m.status === 'ACTIVE').length} Active
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-[#64748B]">Team Members:</div>
                <div className="space-y-1.5">
                  {members.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs"
                    >
                      <div>
                        <span className="font-bold text-[#0F172A]">{m.name}</span>
                        <span className="text-[10px] text-[#64748B] ml-2 font-mono">({m.role})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${m.status === 'ACTIVE' ? 'bg-[#10B981]' : 'bg-[#94A3B8]'
                            }`}
                        />
                        <button
                          onClick={() => handleToggleStatus(m.id, m.name, m.status === 'ACTIVE')}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${m.status === 'ACTIVE'
                              ? 'bg-[#FEF2F2] text-[#DC2626] hover:bg-[#FEE2E2]'
                              : 'bg-[#ECFDF5] text-[#059669] hover:bg-[#D1FAE5]'
                            }`}
                        >
                          {m.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Add Team Modal */}
      {showAddTeamModal && (
        <div className="fixed inset-0 bg-[#0F172A]/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="modal-panel bg-white w-full max-w-md rounded-2xl p-4 sm:p-5 border border-[#E2E8F0] shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                <FiPlusCircle className="text-[#059669]" />
                <span>Create New Operational Team</span>
              </h3>
              <button
                onClick={() => setShowAddTeamModal(false)}
                className="text-[#64748B] hover:text-[#0F172A] text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTeamSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#0F172A] font-bold mb-1">Team Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Team Gamma"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] font-semibold focus:outline-none focus:border-[#10B981]"
                />
              </div>

              <div>
                <label className="block text-[#0F172A] font-bold mb-1">Assign Team Lead *</label>
                <select
                  required
                  value={selectedTLId}
                  onChange={(e) => setSelectedTLId(e.target.value)}
                  disabled={!eligibleTeamLeads.length}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] font-semibold focus:outline-none focus:border-[#10B981] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {eligibleTeamLeads.map((tl) => (
                    <option key={tl.id} value={tl.id}>
                      {tl.name} ({tl.email})
                    </option>
                  ))}
                </select>
                {!eligibleTeamLeads.length && (
                  <p className="mt-2 text-[11px] font-semibold text-[#DC2626]">
                    No eligible team leads. Every active team lead already leads a team.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setShowAddTeamModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0] text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!eligibleTeamLeads.length}
                  className={`px-4 py-2 rounded-xl text-xs font-bold shadow-md ${
                    eligibleTeamLeads.length
                      ? 'shimmer-button text-white cursor-pointer'
                      : 'bg-[#F1F5F9] text-[#94A3B8] cursor-not-allowed'
                  }`}
                >
                  Create Team
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default TeamManagement;
