import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/useApp';
import { motion } from 'framer-motion';
import {
  FiUser,
  FiClock,
  FiZap,
  FiMenu,
  FiLogOut,
} from 'react-icons/fi';
import { APP_ROUTES, ROLE_HOME_ROUTES } from '../../utils/constants';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const {
    currentUser,
    currentRole,
    users,
    switchUser,
    notify,
    punchState,
    punchInTime,
    logout,
  } = useApp();

  const activeUsers = users.filter((user) => user.status === 'ACTIVE');

  const handleUserChange = (userId: string) => {
    const targetUser = users.find((user) => user.id === userId);
    const result = switchUser(userId);
    if (!result.ok) {
      notify('error', result.message);
      return;
    }
    notify('success', result.message);
    if (targetUser) navigate(ROLE_HOME_ROUTES[targetUser.role]);
  };

  const handleToggleTabletNav = () => {
    window.dispatchEvent(new CustomEvent('leadflow:toggle-tablet-nav'));
  };

  // Clean formatted user name (removes any parenthetical tags like "(Admin)" or "(BDE)")
  const cleanUserName = currentUser?.name
    ? currentUser.name.replace(/\s*\(.*?\)/g, '').trim()
    : 'User';

  const userRoleTitle =
    currentUser.role === 'ADMIN'
      ? 'Super Administrator'
      : currentUser.role === 'TEAM_LEAD'
      ? `${currentUser.teamName || 'Team'} Lead`
      : `${currentUser.teamName || 'Team'} BDE`;

  return (
    <>
      <header className="app-header h-16 border-b border-[#E2E8F0] bg-white/95 backdrop-blur-md sticky top-0 z-40 px-3 sm:px-6 flex items-center justify-between gap-3 shadow-xs">
        {/* Left side: Logo & Clock */}
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <button
            type="button"
            onClick={handleToggleTabletNav}
            title="Toggle navigation"
            aria-label="Toggle navigation"
            className="hidden md:inline-flex lg:hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white text-[#64748B] transition-colors hover:border-[#A7F3D0] hover:bg-[#ECFDF5] hover:text-[#059669]"
          >
            <FiMenu className="text-base" />
          </button>

          <div
            className="flex min-w-0 items-center gap-2.5 sm:gap-3 cursor-pointer"
            onClick={() => navigate('/')}
          >
            <motion.div
              whileHover={{ scale: 1.06, rotate: 4 }}
              whileTap={{ scale: 0.95 }}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-[#0B1120] via-[#0F172A] to-[#10B981] flex items-center justify-center shadow-md shadow-[#10B981]/25 text-white font-extrabold text-base sm:text-lg shrink-0"
            >
              <FiZap className="text-white text-sm sm:text-base" />
            </motion.div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <span className="font-extrabold text-base sm:text-lg gradient-text-cobalt tracking-tight truncate">
                  Enabler
                </span>
                <span className="hidden sm:inline-block text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0] font-bold uppercase tracking-wider shrink-0">
                  ENTERPRISE
                </span>
              </div>
              <span className="hidden sm:block text-[10px] text-[#64748B] tracking-wider uppercase font-semibold truncate">
                Hierarchical Lead & Financial Engine
              </span>
            </div>
          </div>

          {currentRole === 'BDE' && (
            <div className="hidden xl:flex items-center gap-2 px-3 py-1 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-xs shrink-0">
              <FiClock className="text-[#059669]" />
              <span className="text-[#64748B] font-medium">Shift Clock:</span>
              <span
                className={`font-bold flex items-center gap-1.5 ${
                  punchState === 'PUNCHED_IN' ? 'text-[#059669]' : 'text-[#64748B]'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    punchState === 'PUNCHED_IN' ? 'bg-[#10B981] animate-pulse' : 'bg-[#94A3B8]'
                  }`}
                />
                {punchState === 'PUNCHED_IN' ? `In since ${punchInTime}` : 'Punched Out'}
              </span>
            </div>
          )}
        </div>

        {/* Right side: Identity Switcher & Profile Container */}
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <label
            title="Switch between the configured Alpha/Beta users"
            className="flex min-w-0 items-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-[#F1F5F9] px-2 py-1 text-xs shadow-inner"
          >
            <FiUser className="shrink-0 text-[#059669]" />
            <span className="hidden lg:inline text-[10px] font-bold uppercase text-[#64748B]">Viewing as</span>
            <select
              value={currentUser.id}
              onChange={(event) => handleUserChange(event.target.value)}
              className="max-w-[9rem] bg-transparent text-[11px] font-bold text-[#0F172A] outline-none sm:max-w-[12rem]"
            >
              {activeUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} · {user.teamName || user.role}
                </option>
              ))}
            </select>
          </label>

          {/* Vertical divider */}
          <div className="h-7 w-px bg-[#E2E8F0] hidden sm:block" />

          <div className="flex items-center gap-2 sm:gap-3 pl-1 sm:pl-2">
            {/* User Info (Avatar + Name) */}
            <div className="flex items-center gap-2.5">
              {/* Avatar Wrapper */}
              <div className="relative shrink-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-[#ECFDF5] to-[#D1FAE5] border border-[#A7F3D0] flex items-center justify-center text-[#059669] shadow-xs">
                  <FiUser className="text-sm sm:text-base text-[#059669]" />
                </div>
                <span
                  className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#10B981] border-2 border-white ring-1 ring-[#10B981]/20"
                  title="Active Now"
                />
              </div>

              {/* User Name Text & Role Subtitle */}
              <div className="hidden sm:block text-left min-w-0">
                <div className="text-xs font-bold text-[#0F172A] leading-tight truncate max-w-[120px] lg:max-w-[160px]">
                  {cleanUserName}
                </div>
                <div className="text-[10px] text-[#64748B] font-semibold tracking-wide truncate">
                  {userRoleTitle}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                logout();
                navigate(APP_ROUTES.LOGIN, { replace: true });
              }}
              title="Sign out"
              aria-label="Sign out"
              className="inline-flex h-8 sm:h-9 items-center gap-1.5 rounded-full border border-[#FECACA] bg-white px-2 sm:px-3 shadow-xs hover:border-[#FCA5A5] hover:bg-[#FEF2F2] transition-all duration-200 cursor-pointer active:scale-95 shrink-0"
            >
              <FiLogOut className="text-sm sm:text-base text-[#DC2626]" />
              <span className="hidden lg:inline text-[10px] font-bold text-[#B91C1C]">Sign out</span>
            </button>
          </div>
        </div>
      </header>
    </>
  );
};

export default Navbar;
