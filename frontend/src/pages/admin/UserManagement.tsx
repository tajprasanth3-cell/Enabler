import React, { useRef, useState } from 'react';
import { useApp } from '../../context/useApp';
import { motion } from 'framer-motion';
import {
  FiUsers,
  FiUserCheck,
  FiUserX,
  FiSearch,
  FiUserPlus,
  FiCheckCircle,
  FiAlertCircle,
  FiPhone,
  FiMail,
} from 'react-icons/fi';
import type { User, UserRole, UserStatus } from '../../types';

export const UserManagement: React.FC = () => {
  const { currentUser, users, teams, toggleUserStatus, createUser, reassignUserTeam } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | UserStatus>('ALL');
  const [teamFilter, setTeamFilter] = useState<string>('ALL');
  const [showAddUserModal, setShowAddUserModal] = useState(false);

  // New user form state
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('BDE');
  const [newUserTeam, setNewUserTeam] = useState<string>(teams[0]?.id || '');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ type, message });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  };

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.phone && u.phone.includes(searchQuery));
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'ALL' || u.status === statusFilter;
    const matchesTeam = teamFilter === 'ALL' || u.teamId === teamFilter;
    return matchesSearch && matchesRole && matchesStatus && matchesTeam;
  });

  const activeCount = users.filter((u) => u.status === 'ACTIVE').length;
  const bdeCount = users.filter((u) => u.role === 'BDE').length;
  const tlCount = users.filter((u) => u.role === 'TEAM_LEAD').length;
  const adminCount = users.filter((u) => u.role === 'ADMIN').length;

  const handleAddUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newUserName.trim();
    const email = newUserEmail.trim();
    if (!name || !email) {
      showToast('error', 'Name and email are required.');
      return;
    }

    const teamId = newUserRole === 'ADMIN' ? undefined : newUserTeam;
    const created = createUser(name, email, newUserRole, teamId, newUserPhone.trim() || undefined);
    if (!created) {
      showToast('error', 'Could not add employee: an employee with this email already exists.');
      return;
    }

    setShowAddUserModal(false);
    setNewUserName('');
    setNewUserEmail('');
    setNewUserPhone('');
    showToast('success', `${name} added to the directory. No login credentials or passwords are created in this demo.`);
  };

  const handleToggleStatus = (user: User) => {
    if (user.id === currentUser?.id && user.status === 'ACTIVE') {
      showToast('error', 'You cannot deactivate your own active admin account.');
      return;
    }
    if (!toggleUserStatus(user.id)) {
      showToast(
        'error',
        user.status === 'ACTIVE'
          ? 'Cannot deactivate the last active admin.'
          : `Could not activate ${user.name}.`
      );
      return;
    }
    showToast('success', `${user.name} is now ${user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'}.`);
  };

  const handleReassignTeam = (user: User, teamId: string) => {
    const team = teams.find((item) => item.id === teamId);
    if (!team) {
      showToast('error', 'Selected team was not found.');
      return;
    }
    if (!reassignUserTeam(user.id, team.id, team.name)) {
      showToast('error', `Could not move ${user.name} to ${team.name}.`);
      return;
    }
    showToast('success', `${user.name} moved to ${team.name}.`);
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
        <div>
          <div className="flex items-center gap-2 text-[#059669] text-xs font-bold uppercase tracking-wider mb-1">
            <FiUserCheck />
            <span>Workforce Directory (Demo)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight">
            Employee Directory
          </h1>
          <p className="text-[#64748B] text-xs sm:text-sm mt-1">
            Manage the demo directory: team placement and operational states. No login credentials or passwords are created.
          </p>
        </div>

        <button
          onClick={() => setShowAddUserModal(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl shimmer-button text-white font-bold text-xs shadow-md transition-all cursor-pointer"
        >
          <FiUserPlus className="text-base" />
          <span>Add New Employee</span>
        </button>
      </div>

      {/* Action Feedback */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs ${
            toast.type === 'error'
              ? 'bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626]'
              : 'bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46]'
          }`}
        >
          {toast.type === 'error' ? (
            <FiAlertCircle className="text-base shrink-0" />
          ) : (
            <FiCheckCircle className="text-base text-[#059669] shrink-0" />
          )}
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-auto font-bold cursor-pointer"
            aria-label="Dismiss message"
          >
            ✕
          </button>
        </motion.div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="glass-panel p-4 rounded-2xl">
          <div className="text-[11px] font-bold text-[#64748B]">Total Workforce</div>
          <div className="text-2xl sm:text-3xl font-black text-[#0F172A] mt-1">{users.length}</div>
          <div className="text-[11px] text-[#059669] font-semibold mt-1">{activeCount} Currently Active</div>
        </div>
        <div className="glass-panel p-4 rounded-2xl">
          <div className="text-[11px] font-bold text-[#64748B]">Business Executives (BDE)</div>
          <div className="text-2xl sm:text-3xl font-black text-[#059669] mt-1">{bdeCount}</div>
          <div className="text-[11px] text-[#64748B] mt-1">Frontline Calling Agents</div>
        </div>
        <div className="glass-panel p-4 rounded-2xl">
          <div className="text-[11px] font-bold text-[#64748B]">Team Leads (TL)</div>
          <div className="text-2xl sm:text-3xl font-black text-[#0F172A] mt-1">{tlCount}</div>
          <div className="text-[11px] text-[#64748B] mt-1">Lead Distributors</div>
        </div>
        <div className="glass-panel p-4 rounded-2xl">
          <div className="text-[11px] font-bold text-[#64748B]">System Administrators</div>
          <div className="text-2xl sm:text-3xl font-black text-[#059669] mt-1">{adminCount}</div>
          <div className="text-[11px] text-[#64748B] mt-1">Demo role only</div>
        </div>
      </div>

      {/* Controls & Filter Bar */}
      <div className="glass-panel p-4 rounded-2xl space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B]" />
            <input
              type="text"
              placeholder="Search by employee name, email address, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-10 pr-4 py-2 text-xs font-semibold text-[#0F172A] placeholder-[#64748B] focus:outline-none focus:border-[#10B981]"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs font-semibold text-[#0F172A] focus:outline-none focus:border-[#10B981]"
            >
              <option value="ALL">All Roles</option>
              <option value="BDE">BDE Only</option>
              <option value="TEAM_LEAD">Team Lead Only</option>
              <option value="ADMIN">Admin Only</option>
            </select>

            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs font-semibold text-[#0F172A] focus:outline-none focus:border-[#10B981]"
            >
              <option value="ALL">All Teams</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs font-semibold text-[#0F172A] focus:outline-none focus:border-[#10B981]"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
              <option value="SUSPENDED">Suspended Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Employee List (Responsive Card/Table Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUsers.map((u) => {
          const userTeam = teams.find((t) => t.id === u.teamId);
          return (
            <motion.div
              key={u.id}
              whileHover={{ y: -3 }}
              className="glass-panel p-5 rounded-2xl flex flex-col justify-between space-y-4 relative overflow-hidden"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-center text-sm font-black text-[#059669] shrink-0">
                      {u.name
                        .replace(/[^a-zA-Z\s]/g, '')
                        .trim()
                        .split(/\s+/)
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#0F172A]">{u.name}</h4>
                      <span
                        className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.role === 'ADMIN'
                            ? 'bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]'
                            : u.role === 'TEAM_LEAD'
                            ? 'bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1]'
                            : 'bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]'
                        }`}
                      >
                        {u.role === 'ADMIN' ? 'Administrator' : u.role === 'TEAM_LEAD' ? 'Team Lead' : 'BDE Executive'}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      u.status === 'ACTIVE'
                        ? 'bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]'
                        : u.status === 'SUSPENDED'
                        ? 'bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]'
                        : 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        u.status === 'ACTIVE'
                          ? 'bg-[#10B981]'
                          : u.status === 'SUSPENDED'
                          ? 'bg-[#D97706]'
                          : 'bg-[#DC2626]'
                      }`}
                    />
                    {u.status}
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-[#E2E8F0] space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 text-[#475569]">
                    <FiMail className="text-[#059669] shrink-0" />
                    <span className="truncate">{u.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#475569]">
                    <FiPhone className="text-[#059669] shrink-0" />
                    <span>{u.phone || '+91 98765 00000'}</span>
                  </div>
                  {userTeam && (
                    <div className="flex items-center gap-2 text-[#475569]">
                      <FiUsers className="text-[#059669] shrink-0" />
                      <span>{userTeam.name}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-t border-[#E2E8F0]">
                <span className="text-[10px] text-[#64748B] font-mono">ID: {u.id}</span>
                <div className="flex flex-wrap items-center gap-2">
                  {u.role !== 'ADMIN' && (
                    <select
                      aria-label={`Reassign ${u.name} to a team`}
                      value={u.teamId || ''}
                      onChange={(e) => handleReassignTeam(u, e.target.value)}
                      className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-2 py-1.5 text-[11px] font-semibold text-[#475569] focus:outline-none focus:border-[#10B981]"
                    >
                      <option value="">Unassigned</option>
                      {teams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  )}
                  <span
                    className="inline-flex"
                    title={
                      u.id === currentUser?.id && u.status === 'ACTIVE'
                        ? 'You cannot deactivate the current demo user'
                        : undefined
                    }
                  >
                    <button
                      onClick={() => handleToggleStatus(u)}
                      disabled={u.id === currentUser?.id && u.status === 'ACTIVE'}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        u.id === currentUser?.id && u.status === 'ACTIVE'
                          ? 'bg-[#F1F5F9] text-[#94A3B8] border border-[#E2E8F0] cursor-not-allowed'
                          : u.status === 'ACTIVE'
                          ? 'bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA] cursor-pointer'
                          : 'bg-[#ECFDF5] hover:bg-[#D1FAE5] text-[#059669] border border-[#A7F3D0] cursor-pointer'
                      }`}
                    >
                      {u.status === 'ACTIVE' ? 'Deactivate User' : 'Activate User'}
                    </button>
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {filteredUsers.length === 0 && (
        <div className="glass-panel p-6 text-center rounded-2xl text-[#64748B]">
          <FiUserX className="text-4xl mx-auto mb-2 text-[#059669]" />
          <h3 className="text-base font-bold text-[#0F172A]">No Employees Found</h3>
          <p className="text-xs mt-1">No employees matched your search query or filter parameters.</p>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-[#0F172A]/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="modal-panel bg-white w-full max-w-md rounded-2xl p-4 sm:p-5 border border-[#E2E8F0] shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                <FiUserPlus className="text-[#059669]" />
                <span>Add New Employee</span>
              </h3>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="text-[#64748B] hover:text-[#0F172A] text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[11px] text-[#64748B] font-medium">
              This demo stores a directory record only — no login credentials or passwords are created.
            </p>

            <form onSubmit={handleAddUserSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#0F172A] font-bold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] font-semibold focus:outline-none focus:border-[#10B981]"
                />
              </div>

              <div>
                <label className="block text-[#0F172A] font-bold mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. rahul@leadflow.internal"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] font-semibold focus:outline-none focus:border-[#10B981]"
                />
              </div>

              <div>
                <label className="block text-[#0F172A] font-bold mb-1">Phone Number</label>
                <input
                  type="tel"
                  placeholder="e.g. +91 98765 43210"
                  value={newUserPhone}
                  onChange={(e) => setNewUserPhone(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] font-semibold focus:outline-none focus:border-[#10B981]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#0F172A] font-bold mb-1">System Role *</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] font-semibold focus:outline-none focus:border-[#10B981]"
                  >
                    <option value="BDE">BDE Executive</option>
                    <option value="TEAM_LEAD">Team Lead</option>
                    <option value="ADMIN">System Admin</option>
                  </select>
                </div>

                {newUserRole !== 'ADMIN' && (
                  <div>
                    <label className="block text-[#0F172A] font-bold mb-1">Assign Team *</label>
                    <select
                      value={newUserTeam}
                      onChange={(e) => setNewUserTeam(e.target.value)}
                      className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] font-semibold focus:outline-none focus:border-[#10B981]"
                    >
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0] text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl shimmer-button text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  Add Employee
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
