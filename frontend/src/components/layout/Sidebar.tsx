import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useApp } from '../../context/useApp';
import { APP_ROUTES } from '../../utils/constants';
import {
  FiGrid,
  FiUsers,
  FiUserCheck,
  FiUploadCloud,
  FiDollarSign,
  FiClock,
  FiBarChart2,
  FiSettings,
  FiLayers,
  FiPhoneForwarded,
  FiCalendar,
  FiTrendingUp,
  FiRotateCcw as FiHistory,
  FiChevronsRight,
  FiX,
} from 'react-icons/fi';

type NavVariant = 'full' | 'rail' | 'drawer' | 'mobile';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  badge?: string;
  badgeColor?: string;
  badgeDotColor?: string;
  highlight?: boolean;
}

const SHORT_LABELS: Record<string, string> = {
  'Org Overview': 'Overview',
  'Team Directory': 'Teams',
  'Employee Users': 'Users',
  'Lead Ingestion & Alloc.': 'Leads',
  'Financial Management': 'Finance',
  'Attendance Audit': 'Audit',
  'Executive Reports': 'Reports',
  'System Settings': 'Settings',
  'Audit Trail': 'Trail',
  'Team Workbench': 'Workbench',
  'Team Lead Pool': 'Pool',
  'BDE Distribution': 'Dist.',
  'Team Attendance': 'Attendance',
  'Team Performance': 'Performance',
  'My Workbench': 'Workbench',
  'Working Queue': 'Queue',
  'Follow-up Calendar': 'Follow-ups',
  'Punch In / Out': 'Punch',
  'My Performance': 'Performance',
};

export const Sidebar: React.FC = () => {
  const { currentRole, managedTeamIds, replenishmentAlerts, unassignedAdminLeadsCount, isBdeExhausted } = useApp();
  const location = useLocation();
  const teamAlerts = replenishmentAlerts.filter((alert) => managedTeamIds.includes(alert.teamId));
  const [tabletNavPath, setTabletNavPath] = useState<string | null>(null);
  const tabletExpanded = tabletNavPath === location.pathname;

  useEffect(() => {
    const handleToggle = () => {
      setTabletNavPath((current) => (current === location.pathname ? null : location.pathname));
    };
    window.addEventListener('leadflow:toggle-tablet-nav', handleToggle);
    return () => window.removeEventListener('leadflow:toggle-tablet-nav', handleToggle);
  }, [location.pathname]);

  const getNavItems = (): NavItem[] => {
    switch (currentRole) {
      case 'ADMIN':
        return [
          { label: 'Org Overview', path: APP_ROUTES.ADMIN.DASHBOARD, icon: <FiGrid /> },
          { label: 'Team Directory', path: APP_ROUTES.ADMIN.TEAMS, icon: <FiUsers /> },
          { label: 'Employee Users', path: APP_ROUTES.ADMIN.USERS, icon: <FiUserCheck /> },
          {
            label: 'Lead Ingestion & Alloc.',
            path: APP_ROUTES.ADMIN.LEADS,
            icon: <FiUploadCloud />,
            badge: unassignedAdminLeadsCount > 0 ? `${unassignedAdminLeadsCount} in pool` : undefined,
            badgeColor: 'bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]',
            badgeDotColor: 'bg-[#10B981]',
          },
          {
            label: 'Financial Management',
            path: APP_ROUTES.ADMIN.FINANCE,
            icon: <FiDollarSign />,
            highlight: true,
          },
          { label: 'Attendance Audit', path: APP_ROUTES.ADMIN.ATTENDANCE, icon: <FiClock /> },
          { label: 'Audit Trail', path: APP_ROUTES.ADMIN.AUDIT, icon: <FiHistory /> },
          { label: 'Executive Reports', path: APP_ROUTES.ADMIN.REPORTS, icon: <FiBarChart2 /> },
          { label: 'System Settings', path: APP_ROUTES.ADMIN.SETTINGS, icon: <FiSettings /> },
        ];
      case 'TEAM_LEAD':
        return [
          { label: 'Team Workbench', path: APP_ROUTES.TEAM_LEAD.DASHBOARD, icon: <FiGrid /> },
          { label: 'Team Lead Pool', path: APP_ROUTES.TEAM_LEAD.LEAD_POOL, icon: <FiLayers /> },
          {
            label: 'BDE Distribution',
            path: APP_ROUTES.TEAM_LEAD.DISTRIBUTION,
            icon: <FiUsers />,
            badge: teamAlerts.length > 0 ? `${teamAlerts.length} Needs Leads` : undefined,
            badgeColor: 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]',
            badgeDotColor: 'bg-[#DC2626]',
          },
          { label: 'Team Attendance', path: APP_ROUTES.TEAM_LEAD.ATTENDANCE, icon: <FiClock /> },
          { label: 'Team Performance', path: APP_ROUTES.TEAM_LEAD.REPORTS, icon: <FiTrendingUp /> },
        ];
      case 'BDE':
        return [
          { label: 'My Workbench', path: APP_ROUTES.BDE.DASHBOARD, icon: <FiGrid /> },
          {
            label: 'Working Queue',
            path: APP_ROUTES.BDE.LEADS_QUEUE,
            icon: <FiPhoneForwarded />,
            badge: isBdeExhausted ? '0 Leads' : undefined,
            badgeColor: 'bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]',
            badgeDotColor: 'bg-[#D97706]',
          },
          { label: 'Follow-up Calendar', path: APP_ROUTES.BDE.FOLLOW_UPS, icon: <FiCalendar /> },
          { label: 'Punch In / Out', path: APP_ROUTES.BDE.ATTENDANCE, icon: <FiClock /> },
          { label: 'My Performance', path: APP_ROUTES.BDE.PERFORMANCE, icon: <FiTrendingUp /> },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  const getShortLabel = (label: string): string => SHORT_LABELS[label] ?? label.split(' ')[0] ?? label;

  const renderDemoNotice = () => (
    <div className="p-3.5 rounded-2xl border border-[#E2E8F0] bg-white text-xs space-y-1.5 shadow-xs shrink-0">
      <div className="flex items-center gap-2 font-bold text-[#0F172A]">
        <span className="w-2 h-2 rounded-full bg-[#D97706] shrink-0" />
        <span className="truncate">Demo role preview</span>
      </div>
      <p className="text-[11px] text-[#64748B] leading-relaxed">
        All data is local to this browser; no server-side authorization.
      </p>
    </div>
  );

  const renderNavItem = (item: NavItem, variant: NavVariant) => {
    const key = `${variant}-${item.path}`;

    if (variant === 'rail') {
      return (
        <NavLink
          key={key}
          to={item.path}
          title={item.label}
          aria-label={item.label}
          className={({ isActive }) =>
            `relative flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-200 ${
              isActive
                ? 'bg-[#ECFDF5] text-[#047857] ring-1 ring-[#A7F3D0] shadow-xs'
                : 'text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#059669]'
            }`
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <span className="absolute -left-3 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-[#10B981]" />
              )}
              <span className="text-lg shrink-0">{item.icon}</span>
              {item.badge && (
                <span className={`absolute right-1 top-1 h-2 w-2 rounded-full ${item.badgeDotColor || 'bg-[#10B981]'} ring-2 ring-white`} />
              )}
            </>
          )}
        </NavLink>
      );
    }

    if (variant === 'mobile') {
      return (
        <NavLink
          key={key}
          to={item.path}
          title={item.label}
          aria-label={item.label}
          className={({ isActive }) =>
            `relative flex min-w-[4.5rem] shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl px-2.5 py-2 text-[10px] font-bold transition-all duration-200 ${
              isActive ? 'text-[#059669]' : 'text-[#64748B] hover:text-[#0F172A]'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span className="text-lg leading-none shrink-0">{item.icon}</span>
              <span className="block w-full max-w-[4.25rem] truncate text-center leading-tight">
                {getShortLabel(item.label)}
              </span>
              {isActive && (
                <span className="absolute bottom-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-[#10B981]" />
              )}
              {item.badge && (
                <span className={`absolute right-2 top-1 h-2 w-2 rounded-full ${item.badgeDotColor || 'bg-[#10B981]'} ring-2 ring-white`} />
              )}
            </>
          )}
        </NavLink>
      );
    }

    return (
      <NavLink
        key={key}
        to={item.path}
        title={item.label}
        aria-label={item.label}
        className={({ isActive }) =>
          `flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 group ${
            isActive
              ? 'bg-[#ECFDF5] text-[#047857] border-l-4 border-l-[#10B981] border-y border-r border-[#A7F3D0] font-bold shadow-xs'
              : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]'
          }`
        }
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-base text-[#64748B] group-hover:text-[#059669] transition-colors shrink-0">
            {item.icon}
          </span>
          <span className="truncate">{item.label}</span>
        </div>

        {item.badge && (
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold animate-pulse shrink-0 ${
              item.badgeColor || 'bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]'
            }`}
          >
            {item.badge}
          </span>
        )}

        {item.highlight && !item.badge && (
          <span className="text-[9px] uppercase px-2 py-0.5 rounded-full text-white font-extrabold shadow-xs shrink-0 bg-gradient-to-r from-[#047857] to-[#10B981]">
            Suite
          </span>
        )}
      </NavLink>
    );
  };

  return (
    <>
      <aside className="hidden lg:flex w-72 shrink-0 self-start sticky top-16 h-[calc(100dvh-64px)] min-h-0 flex-col justify-start gap-3 border-r border-[#E2E8F0] bg-white/90 backdrop-blur-md p-4 overflow-y-auto select-none z-20 shadow-xs">
        <div className="space-y-1 min-w-0">
          <div className="px-3 py-2 text-[11px] font-bold text-[#64748B] uppercase tracking-wider flex items-center justify-between gap-2 min-w-0">
            <span className="truncate">Navigation</span>
            <span className="text-[10px] text-[#047857] bg-[#ECFDF5] px-2.5 py-0.5 rounded-full border border-[#A7F3D0] font-mono font-bold shrink-0 max-w-[7rem] truncate">
              {currentRole}
            </span>
          </div>

          {navItems.map((item) => renderNavItem(item, 'full'))}
        </div>

        {renderDemoNotice()}
      </aside>

      <aside className="hidden md:flex lg:hidden w-20 shrink-0 self-start sticky top-16 h-[calc(100dvh-64px)] min-h-0 flex-col items-center gap-3 border-r border-[#E2E8F0] bg-white/90 backdrop-blur-md p-3 overflow-y-auto select-none z-20 shadow-xs" aria-label="Compact navigation">
        <button
          type="button"
          onClick={() => setTabletNavPath(location.pathname)}
          title="Expand navigation"
          aria-label="Expand navigation"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white text-[#64748B] transition-colors hover:border-[#A7F3D0] hover:bg-[#ECFDF5] hover:text-[#059669]"
        >
          <FiChevronsRight className="text-base" />
        </button>

        <div className="flex w-full min-h-0 flex-1 flex-col items-center gap-1 overflow-y-auto">
          {navItems.map((item) => renderNavItem(item, 'rail'))}
        </div>
      </aside>

      {tabletExpanded && (
        <div className="hidden md:flex lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-[#0B1120]/40 backdrop-blur-sm"
            onClick={() => setTabletNavPath(null)}
            aria-hidden="true"
          />
          <aside className="relative flex h-full w-72 max-w-[85vw] shrink-0 flex-col gap-3 border-r border-[#E2E8F0] bg-white p-4 shadow-2xl" aria-label="Expanded navigation">
            <div className="flex items-center justify-between gap-2 px-1 min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                  Navigation
                </span>
                <span className="max-w-[7rem] shrink-0 truncate rounded-full border border-[#A7F3D0] bg-[#ECFDF5] px-2.5 py-0.5 font-mono text-[10px] font-bold text-[#047857]">
                  {currentRole}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setTabletNavPath(null)}
                title="Collapse navigation"
                aria-label="Collapse navigation"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white text-[#64748B] transition-colors hover:border-[#A7F3D0] hover:bg-[#ECFDF5] hover:text-[#059669]"
              >
                <FiX className="text-base" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
              {navItems.map((item) => renderNavItem(item, 'drawer'))}
            </div>

            {renderDemoNotice()}
          </aside>
        </div>
      )}

      <nav className="mobile-bottom-nav md:hidden fixed bottom-0 left-0 right-0 z-40 flex max-w-full items-stretch gap-1 overflow-x-auto border-t border-[#E2E8F0] bg-white/95 px-2 pt-2 shadow-lg backdrop-blur-md" aria-label="Mobile navigation">
        {navItems.map((item) => renderNavItem(item, 'mobile'))}
      </nav>
    </>
  );
};

export default Sidebar;
