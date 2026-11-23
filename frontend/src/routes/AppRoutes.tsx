import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import AdminDashboard from '../pages/admin/AdminDashboard';
import AuditTrail from '../pages/admin/AuditTrail';
import FinancialManagement from '../pages/admin/FinancialManagement';
import LeadIngestion from '../pages/admin/LeadIngestion';
import TeamManagement from '../pages/admin/TeamManagement';
import UserManagement from '../pages/admin/UserManagement';
import AttendanceOverview from '../pages/admin/AttendanceOverview';
import ReportsAnalytics from '../pages/admin/ReportsAnalytics';
import SystemSettings from '../pages/admin/SystemSettings';
import TLWorkbench from '../pages/team-lead/TLWorkbench';
import TLPool from '../pages/team-lead/TLPool';
import TLDistribution from '../pages/team-lead/TLDistribution';
import BDEDashboard from '../pages/bde/BDEDashboard';
import BDEWorkingQueue from '../pages/bde/BDEWorkingQueue';
import BDEFollowUps from '../pages/bde/BDEFollowUps';
import BDEAttendance from '../pages/bde/BDEAttendance';
import BDEPerformance from '../pages/bde/BDEPerformance';
import { APP_ROUTES, ROLE_HOME_ROUTES } from '../utils/constants';
import { useApp } from '../context/useApp';
import type { UserRole } from '../types';

const RoleGuard: React.FC<{ allow: UserRole[]; children: React.ReactNode }> = ({ allow, children }) => {
  const { currentRole } = useApp();
  if (!allow.includes(currentRole)) {
    return <Navigate to={ROLE_HOME_ROUTES[currentRole] || APP_ROUTES.ADMIN.DASHBOARD} replace />;
  }
  return <>{children}</>;
};

const RoleHome: React.FC = () => {
  const { currentRole } = useApp();
  return <Navigate to={ROLE_HOME_ROUTES[currentRole] || APP_ROUTES.ADMIN.DASHBOARD} replace />;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<RoleHome />} />

        <Route path="admin">
          <Route index element={<RoleHome />} />
          <Route path="dashboard" element={<RoleGuard allow={['ADMIN']}><AdminDashboard /></RoleGuard>} />
          <Route path="finance" element={<RoleGuard allow={['ADMIN']}><FinancialManagement /></RoleGuard>} />
          <Route path="leads" element={<RoleGuard allow={['ADMIN']}><LeadIngestion /></RoleGuard>} />
          <Route path="teams" element={<RoleGuard allow={['ADMIN']}><TeamManagement /></RoleGuard>} />
          <Route path="users" element={<RoleGuard allow={['ADMIN']}><UserManagement /></RoleGuard>} />
          <Route path="attendance" element={<RoleGuard allow={['ADMIN']}><AttendanceOverview /></RoleGuard>} />
          <Route path="reports" element={<RoleGuard allow={['ADMIN', 'TEAM_LEAD']}><ReportsAnalytics /></RoleGuard>} />
          <Route path="settings" element={<RoleGuard allow={['ADMIN']}><SystemSettings /></RoleGuard>} />
          <Route path="audit" element={<RoleGuard allow={['ADMIN']}><AuditTrail /></RoleGuard>} />
        </Route>

        <Route path="team-lead">
          <Route index element={<RoleHome />} />
          <Route path="dashboard" element={<RoleGuard allow={['TEAM_LEAD']}><TLWorkbench /></RoleGuard>} />
          <Route path="pool" element={<RoleGuard allow={['TEAM_LEAD']}><TLPool /></RoleGuard>} />
          <Route path="distribute" element={<RoleGuard allow={['TEAM_LEAD']}><TLDistribution /></RoleGuard>} />
          <Route path="attendance" element={<RoleGuard allow={['TEAM_LEAD']}><AttendanceOverview /></RoleGuard>} />
          <Route path="reports" element={<RoleGuard allow={['TEAM_LEAD']}><ReportsAnalytics /></RoleGuard>} />
        </Route>

        <Route path="bde">
          <Route index element={<RoleHome />} />
          <Route path="dashboard" element={<RoleGuard allow={['BDE']}><BDEDashboard /></RoleGuard>} />
          <Route path="leads" element={<RoleGuard allow={['BDE']}><BDEWorkingQueue /></RoleGuard>} />
          <Route path="follow-ups" element={<RoleGuard allow={['BDE']}><BDEFollowUps /></RoleGuard>} />
          <Route path="attendance" element={<RoleGuard allow={['BDE']}><BDEAttendance /></RoleGuard>} />
          <Route path="performance" element={<RoleGuard allow={['BDE']}><BDEPerformance /></RoleGuard>} />
        </Route>
      </Route>

      <Route path="*" element={<RoleHome />} />
    </Routes>
  );
};

export default AppRoutes;
