import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/useApp';
import type { UserRole } from '../../types';
import { motion } from 'framer-motion';
import {
  FiShield,
  FiUsers,
  FiUserCheck,
  FiUser,
  FiClock,
  FiZap,
  FiMenu,
  FiRotateCcw,
} from 'react-icons/fi';
import { APP_ROUTES } from '../../utils/constants';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const {
    currentUser,
    currentRole,
    setCurrentRole,
    replenishmentAlerts,
    punchState,
    punchInTime,
  } = useApp();

  const roles: Array<{
    role: UserRole;
    label: string;
    shortLabel: string;
    path: string;
    icon: React.ReactNode;
  }> = [
    {
      role: 'ADMIN',
      label: 'Admin Portal',
      shortLabel: 'Admin',
      path: APP_ROUTES.ADMIN.DASHBOARD,
      icon: <FiShield className="text-[#2563EB]" />,
    },
    {
      role: 'TEAM_LEAD',
      label: 'Team Lead',
      shortLabel: 'TL',
      path: APP_ROUTES.TEAM_LEAD.DASHBOARD,
      icon: <FiUsers className="text-[#64748B]" />,
    },
    {
      role: 'BDE',
      label: 'BDE Desk',
      shortLabel: 'BDE',
      path: APP_ROUTES.BDE.DASHBOARD,
      icon: <FiUserCheck className="text-[#2563EB]" />,
    },
  ];

  const handleRoleChange = (role: UserRole, path: string) => {
    setCurrentRole(role);
    navigate(path);
  };

  const handleToggleTabletNav = () => {
    window.dispatchEvent(new CustomEvent('leadflow:toggle-tablet-nav'));
  };

  // Clean formatted user name (removes any parenthetical tags like "(Admin)" or "(BDE)")
  const cleanUserName = currentUser?.name
    ? currentUser.name.replace(/\s*\(.*?\)/g, '').trim()
    : 'User';

  const userRoleTitle =
    currentUser?.role === 'ADMIN'
      ? 'Super Administrator'
      : currentUser?.role === 'TEAM_LEAD'
      ? 'Alpha Team Lead'
      : 'BDE Executive';

  const handleSwitchToAdmin = () => {
    setCurrentRole('ADMIN');
    navigate(APP_ROUTES.ADMIN.DASHBOARD);
  };

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
            className="hidden md:inline-flex lg:hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white text-[#64748B] transition-colors hover:border-[#BFDBFE] hover:bg-[#EFF6FF] hover:text-[#2563EB]"
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
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-[#0B1120] via-[#0F172A] to-[#2563EB] flex items-center justify-center shadow-md shadow-[#2563EB]/25 text-white font-extrabold text-base sm:text-lg shrink-0"
            >
              <FiZap className="text-white text-sm sm:text-base" />
            </motion.div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <span className="font-extrabold text-base sm:text-lg gradient-text-cobalt tracking-tight truncate">
                  Enabler
                </span>
                <span className="hidden sm:inline-block text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE] font-bold uppercase tracking-wider shrink-0">
                  ENTERPRISE
                </span>
              </div>
              <span className="hidden sm:block text-[10px] text-[#64748B] tracking-wider uppercase font-semibold truncate">
                Hierarchical Lead & Financial Engine
              </span>
            </div>
          </div>

          {currentRole === 'BDE' && (
            <div className="hidden xl:flex items-center gap-2 px-3 py-1 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] text-xs shrink-0">
              <FiClock className="text-[#2563EB]" />
              <span className="text-[#64748B] font-medium">Shift Clock:</span>
              <span
                className={`font-bold flex items-center gap-1.5 ${
                  punchState === 'PUNCHED_IN' ? 'text-[#2563EB]' : 'text-[#64748B]'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    punchState === 'PUNCHED_IN' ? 'bg-[#2563EB] animate-pulse' : 'bg-[#94A3B8]'
                  }`}
                />
                {punchState === 'PUNCHED_IN' ? `In since ${punchInTime}` : 'Punched Out'}
              </span>
            </div>
          )}
        </div>

        {/* Right side: Role Mode & Profile Container */}
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {/* Role Mode Switcher */}
          <div
            title="Demo role preview — switching roles does not authenticate anyone"
            className="flex min-w-0 bg-[#F1F5F9] p-0.5 sm:p-1 rounded-xl border border-[#E2E8F0] shadow-inner"
          >
            {roles.map(({ role, label, shortLabel, path, icon }) => {
              const isActive = currentRole === role;
              return (
                <button
                  key={role}
                  onClick={() => handleRoleChange(role, path)}
                  className={`relative px-2 sm:px-3.5 py-1 sm:py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 sm:gap-1.5 transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'text-white shadow-sm'
                      : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#E2E8F0]/50'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeRolePillCobalt"
                      className="absolute inset-0 bg-gradient-to-r from-[#1D4ED8] via-[#2563EB] to-[#3B82F6] rounded-lg -z-10 shadow-sm"
                      transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                    />
                  )}
                  <span className={isActive ? 'text-white' : ''}>{icon}</span>
                  <span className="hidden md:inline">{label}</span>
                  <span className="hidden sm:inline md:hidden">{shortLabel}</span>
                  {role === 'TEAM_LEAD' && replenishmentAlerts.length > 0 && (
                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#F59E0B] animate-ping" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Vertical divider */}
          <div className="h-7 w-px bg-[#E2E8F0] hidden sm:block" />

          <div className="flex items-center gap-2 sm:gap-3 pl-1 sm:pl-2">
            {/* User Info (Avatar + Name) */}
            <div className="flex items-center gap-2.5">
              {/* Avatar Wrapper */}
              <div className="relative shrink-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-[#EFF6FF] to-[#DBEAFE] border border-[#BFDBFE] flex items-center justify-center text-[#2563EB] shadow-xs">
                  <FiUser className="text-sm sm:text-base text-[#2563EB]" />
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
              onClick={handleSwitchToAdmin}
              title="Switch to Admin view (demo role preview, no login involved)"
              aria-label="Switch to Admin view"
              className="inline-flex h-8 sm:h-9 items-center gap-1.5 rounded-full border border-[#CBD5E1] bg-white px-2 sm:px-3 shadow-xs hover:border-[#BFDBFE] hover:bg-[#EFF6FF] transition-all duration-200 cursor-pointer active:scale-95 group shrink-0"
            >
              <FiRotateCcw className="text-sm sm:text-base text-[#2563EB] group-hover:rotate-45 transition-transform" />
              <span className="hidden lg:inline text-[10px] font-bold text-[#475569]">Admin view</span>
            </button>
          </div>
        </div>
      </header>
    </>
  );
};

export default Navbar;
