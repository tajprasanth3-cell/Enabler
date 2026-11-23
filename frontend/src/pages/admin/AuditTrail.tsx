import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FiActivity,
  FiCalendar,
  FiDollarSign,
  FiEdit3,
  FiGitBranch,
  FiSearch,
  FiShield,
  FiUserCheck,
  FiRefreshCw,
} from 'react-icons/fi';
import { useApp } from '../../context/useApp';
import { LEAD_STATUS_CONFIG } from '../../utils/constants';
import { formatClock } from '../../utils/calculations';
import { auditService } from '../../services/auditService';
import type {
  AttendanceCorrection,
  AuditEvent,
  LeadAssignmentHistory,
  LeadStatus,
  User,
} from '../../types';

type TabKey = 'ACTIVITY' | 'STATUS' | 'ASSIGNMENT' | 'CORRECTION' | 'CALCULATION';

const formatTimestamp = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatJson = (value: unknown): string => {
  if (value === undefined || value === null) return '—';
  try {
    return JSON.stringify(value, null, 2) ?? '—';
  } catch {
    return String(value);
  }
};

const formatPunchOut = (value: string | null): string => (value ? formatClock(value) || value : '—');

const StatusBadge: React.FC<{ status: string | null }> = ({ status }) => {
  if (!status) return <span className="text-[10px] font-bold text-[#94A3B8]">—</span>;
  const config = LEAD_STATUS_CONFIG[status as LeadStatus];
  const color = config?.color ?? '#64748B';
  return (
    <span
      className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap"
      style={{ color, borderColor: color, backgroundColor: `${color}14` }}
    >
      {config?.label ?? status}
    </span>
  );
};

const PlainBadge: React.FC<{ label: string; tone?: 'teal' | 'amber' | 'slate' | 'cobalt' }> = ({ label, tone = 'slate' }) => {
  const tones = {
    cobalt: 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]',
    teal: 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]',
    amber: 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]',
    slate: 'bg-[#F8FAFC] text-[#475569] border-[#E2E8F0]',
  };
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${tones[tone]}`}>
      {label || '—'}
    </span>
  );
};

const ActorCell: React.FC<{ id: string; name: string; meta?: string; users: User[] }> = ({ id, name, meta, users }) => {
  const resolvedName = users.find((user) => user.id === id)?.name ?? (name || id);
  return (
    <div>
      <div className="font-bold text-[#0F172A] whitespace-nowrap">{resolvedName}</div>
      <div className="text-[10px] text-[#059669] font-mono font-semibold whitespace-nowrap">{meta || id || '—'}</div>
    </div>
  );
};

const EmptyRow: React.FC<{ colSpan: number; message: string }> = ({ colSpan, message }) => (
  <tr>
    <td colSpan={colSpan} className="py-8 px-4 text-center text-xs font-semibold text-[#64748B]">
      {message}
    </td>
  </tr>
);

const sectionTitleClass = 'text-base font-bold text-[#0F172A] flex items-center gap-2';
const tableHeaderClass = 'border-b border-[#E2E8F0] text-[#64748B] font-bold bg-[#F8FAFC]';
const cellClass = 'py-3.5 px-4 align-top';
const jsonClass = 'whitespace-pre-wrap font-mono text-[10px] leading-relaxed';

export const AuditTrail: React.FC = () => {
  const {
    auditEvents,
    leadStatusHistory,
    leadAssignmentHistory,
    attendanceCorrections,
    attendanceRecords,
    calculationLogs,
    systemSettings,
    leads,
    users,
  } = useApp();

  const [activeTab, setActiveTab] = useState<TabKey>('ACTIVITY');
  const [activitySearch, setActivitySearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [statusSearch, setStatusSearch] = useState('');
  const [backendLogs, setBackendLogs] = useState<any[]>([]);
  const [loadingBackendLogs, setLoadingBackendLogs] = useState(false);

  const fetchBackendAudit = useCallback(async () => {
    setLoadingBackendLogs(true);
    try {
      const res = await auditService.getAuditLogs({ limit: 100 });
      if (res && res.logs) {
        setBackendLogs(res.logs);
      }
    } catch (e) {
      console.warn('Backend audit fetch error:', e);
    } finally {
      setLoadingBackendLogs(false);
    }
  }, []);

  useEffect(() => {
    fetchBackendAudit();
  }, [fetchBackendAudit]);

  const combinedActivity = useMemo(() => {
    const backendAdapted: AuditEvent[] = backendLogs.map((log) => ({
      id: log.id,
      action: log.action,
      entityType: log.category,
      entityId: log.targetId || log.targetType || 'SYSTEM',
      summary: log.summary,
      details: { ...log.details, ipAddress: log.ipAddress },
      actorId: log.actorId,
      actorName: log.actorName,
      actorRole: log.actorRole,
      timestamp: log.timestamp,
    }));

    const existingIds = new Set(auditEvents.map((e) => e.id));
    const uniqueBackend = backendAdapted.filter((e) => !existingIds.has(e.id));
    return [...auditEvents, ...uniqueBackend].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [auditEvents, backendLogs]);

  const actionOptions: string[] = useMemo(
    () => Array.from(new Set<string>(combinedActivity.map((event: AuditEvent) => String(event.action)))).sort(),
    [combinedActivity]
  );

  const filteredActivity = useMemo(() => {
    const query = activitySearch.trim().toLowerCase();
    return combinedActivity.filter((event: AuditEvent) => {
      if (actionFilter !== 'ALL' && event.action !== actionFilter) return false;
      if (!query) return true;
      return [event.id, event.action, event.entityType, event.entityId, event.summary, event.actorName]
        .some((field) => String(field).toLowerCase().includes(query));
    });
  }, [combinedActivity, activitySearch, actionFilter]);

  const filteredStatusHistory = useMemo(() => {
    const query = statusSearch.trim().toLowerCase();
    if (!query) return leadStatusHistory;
    return leadStatusHistory.filter((entry) => {
      const lead = leads.find((item) => item.id === entry.leadId);
      return [
        entry.leadId,
        lead?.candidateName ?? '',
        entry.changedByName,
        entry.previousStatus ?? '',
        entry.newStatus,
        entry.remarks ?? '',
      ].some((field) => String(field).toLowerCase().includes(query));
    });
  }, [leadStatusHistory, leads, statusSearch]);

  const kpis = [
    { label: 'Total Events', value: combinedActivity.length, icon: FiActivity, hint: 'Immutable audit records' },
    { label: 'Lead Status Changes', value: leadStatusHistory.length, icon: FiGitBranch, hint: `${systemSettings.statuses.length} workflow statuses` },
    { label: 'Assignments', value: leadAssignmentHistory.length, icon: FiUserCheck, hint: 'Allocation & distribution moves' },
    { label: 'Attendance Corrections', value: attendanceCorrections.length, icon: FiEdit3, hint: 'Supervisor timesheet overrides' },
    { label: 'Calculation Logs', value: calculationLogs.length, icon: FiDollarSign, hint: 'Revenue & profit split records' },
  ];

  const tabs = [
    { key: 'ACTIVITY' as TabKey, label: 'Activity Log', icon: FiActivity, count: combinedActivity.length },
    { key: 'STATUS' as TabKey, label: 'Lead Status History', icon: FiGitBranch, count: leadStatusHistory.length },
    { key: 'ASSIGNMENT' as TabKey, label: 'Assignment History', icon: FiUserCheck, count: leadAssignmentHistory.length },
    { key: 'CORRECTION' as TabKey, label: 'Attendance Corrections', icon: FiEdit3, count: attendanceCorrections.length },
    { key: 'CALCULATION' as TabKey, label: 'Financial Calculations', icon: FiDollarSign, count: calculationLogs.length },
  ];

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
        <div>
          <div className="flex items-center gap-2 text-[#059669] text-xs font-bold uppercase tracking-wider mb-1">
            <FiShield />
            <span>Enterprise Compliance & Governance</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-[#0F172A] tracking-tight">System Audit Trail</h1>
          <p className="text-[#64748B] text-sm mt-1">
            Immutable, append-only record of all system events — status changes, allocations, biometric timesheet corrections,
            and 30:70 financial split calculations with actor identity, timestamp, IP, and payload diffs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchBackendAudit}
            disabled={loadingBackendLogs}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-[#F8FAFC] text-[#0F172A] border border-[#CBD5E1] text-xs font-bold shadow-xs cursor-pointer transition-colors"
          >
            <FiRefreshCw className={loadingBackendLogs ? 'animate-spin text-[#059669]' : 'text-[#059669]'} />
            <span>Refresh Audit Logs</span>
          </button>
          <span className="inline-flex items-center gap-2 text-xs font-bold text-[#059669] bg-[#ECFDF5] border border-[#A7F3D0] px-3.5 py-2 rounded-xl shadow-xs">
            <FiShield />
            <span>Immutable & Verified</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <motion.div key={kpi.label} whileHover={{ y: -2 }} className="glass-panel p-5 rounded-2xl border border-[#CBD5E1] bg-white shadow-xs">
              <div className="flex items-center justify-between text-[#64748B] text-xs font-bold">
                <span>{kpi.label}</span>
                <div className="p-2 rounded-xl bg-[#ECFDF5] text-[#059669]">
                  <Icon className="text-base" />
                </div>
              </div>
              <div className="text-3xl font-black text-[#0F172A] mt-2">{kpi.value}</div>
              <div className="text-[11px] text-[#64748B] mt-1 font-medium">{kpi.hint}</div>
            </motion.div>
          );
        })}
      </div>

      <div className="glass-panel rounded-2xl border border-[#CBD5E1] bg-white p-4 sm:p-5 space-y-4 shadow-xs">
        <div className="tab-strip flex border-b border-[#E2E8F0] pb-3 gap-2 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0 whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'shimmer-button text-white shadow-xs'
                    : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]'
                }`}
              >
                <Icon />
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-white/20 text-white' : 'bg-[#F1F5F9] text-[#64748B]'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {activeTab === 'ACTIVITY' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <h3 className={sectionTitleClass}>
                <FiActivity className="text-[#059669]" />
                <span>System Activity Log</span>
              </h3>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative">
                  <FiSearch className="absolute left-3 top-2.5 text-[#94A3B8]" />
                  <input
                    type="text"
                    value={activitySearch}
                    onChange={(event) => setActivitySearch(event.target.value)}
                    placeholder="Search action, entity or actor..."
                    className="w-full sm:w-64 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl py-2 pl-9 pr-3 text-xs text-[#0F172A] focus:outline-none focus:border-[#10B981] focus:bg-white"
                  />
                </div>
                <select
                  value={actionFilter}
                  onChange={(event) => setActionFilter(event.target.value)}
                  className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl py-2 px-3 text-xs font-semibold text-[#0F172A] focus:outline-none focus:border-[#10B981] focus:bg-white cursor-pointer"
                >
                  <option value="ALL">All action types</option>
                  {actionOptions.map((action) => (
                    <option key={action} value={action}>
                      {action.replaceAll('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[920px]">
                <thead>
                  <tr className={tableHeaderClass}>
                    <th className={cellClass}>Timestamp</th>
                    <th className={cellClass}>Action / Category</th>
                    <th className={cellClass}>Summary</th>
                    <th className={cellClass}>Actor</th>
                    <th className={cellClass}>Payload & Network Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {filteredActivity.length === 0 ? (
                    <EmptyRow colSpan={5} message="No activity events match the selected filters." />
                  ) : (
                    filteredActivity.map((event: AuditEvent) => (
                      <tr key={event.id} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className={`${cellClass} font-mono text-[#64748B] whitespace-nowrap`}>
                          <div>{formatTimestamp(event.timestamp)}</div>
                          <div className="text-[10px] text-[#94A3B8]">{event.id}</div>
                        </td>
                        <td className={cellClass}>
                          <div className="font-bold text-[#059669] whitespace-nowrap">{String(event.action).replaceAll('_', ' ')}</div>
                          <div className="text-[10px] text-[#64748B] font-mono whitespace-nowrap">
                            {event.entityType} · {event.entityId}
                          </div>
                        </td>
                        <td className={`${cellClass} text-[#475569] max-w-xs font-medium`}>{event.summary}</td>
                        <td className={cellClass}>
                          <ActorCell id={event.actorId} name={event.actorName} meta={event.actorRole} users={users} />
                        </td>
                        <td className={`${cellClass} ${jsonClass} text-[#475569] max-w-xs`}>{formatJson(event.details)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === 'STATUS' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <h3 className={sectionTitleClass}>
                <FiGitBranch className="text-[#059669]" />
                <span>Lead Status Change History</span>
              </h3>
              <div className="relative">
                <FiSearch className="absolute left-3 top-2.5 text-[#94A3B8]" />
                <input
                  type="text"
                  value={statusSearch}
                  onChange={(event) => setStatusSearch(event.target.value)}
                  placeholder="Search lead, status, remarks or actor..."
                  className="w-full sm:w-72 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl py-2 pl-9 pr-3 text-xs text-[#0F172A] focus:outline-none focus:border-[#10B981] focus:bg-white"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[860px]">
                <thead>
                  <tr className={tableHeaderClass}>
                    <th className={cellClass}>Timestamp</th>
                    <th className={cellClass}>Lead</th>
                    <th className={cellClass}>Previous Status</th>
                    <th className={cellClass}>New Status</th>
                    <th className={cellClass}>Changed By</th>
                    <th className={cellClass}>Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {filteredStatusHistory.length === 0 ? (
                    <EmptyRow colSpan={6} message="No lead status changes recorded yet." />
                  ) : (
                    filteredStatusHistory.map((entry) => (
                      <tr key={entry.id} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className={`${cellClass} font-mono text-[#64748B] whitespace-nowrap`}>
                          {formatTimestamp(entry.timestamp)}
                        </td>
                        <td className={cellClass}>
                          <div className="font-bold text-[#0F172A] whitespace-nowrap">
                            {leads.find((lead) => lead.id === entry.leadId)?.candidateName ?? 'Unknown lead'}
                          </div>
                          <div className="text-[10px] text-[#64748B] font-mono whitespace-nowrap">{entry.leadId}</div>
                        </td>
                        <td className={cellClass}>
                          <StatusBadge status={entry.previousStatus} />
                        </td>
                        <td className={cellClass}>
                          <StatusBadge status={entry.newStatus} />
                        </td>
                        <td className={cellClass}>
                          <ActorCell id={entry.changedById} name={entry.changedByName} users={users} />
                        </td>
                        <td className={`${cellClass} text-[#475569] max-w-xs font-medium`}>{entry.remarks || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === 'ASSIGNMENT' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <h3 className={sectionTitleClass}>
              <FiUserCheck className="text-[#059669]" />
              <span>Lead Assignment History</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[860px]">
                <thead>
                  <tr className={tableHeaderClass}>
                    <th className={cellClass}>Assigned At</th>
                    <th className={cellClass}>Lead</th>
                    <th className={cellClass}>Assigned To</th>
                    <th className={cellClass}>Assigned By</th>
                    <th className={cellClass}>Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {leadAssignmentHistory.length === 0 ? (
                    <EmptyRow colSpan={5} message="No lead assignments recorded yet." />
                  ) : (
                    leadAssignmentHistory.map((entry: LeadAssignmentHistory) => (
                      <tr key={entry.id} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className={`${cellClass} font-mono text-[#64748B] whitespace-nowrap`}>
                          {formatTimestamp(entry.assignedAt)}
                        </td>
                        <td className={cellClass}>
                          <div className="font-bold text-[#0F172A] whitespace-nowrap">
                            {leads.find((lead) => lead.id === entry.leadId)?.candidateName ?? 'Unknown lead'}
                          </div>
                          <div className="text-[10px] text-[#64748B] font-mono whitespace-nowrap">{entry.leadId}</div>
                        </td>
                        <td className={cellClass}>
                          <div className="font-bold text-[#059669] whitespace-nowrap">
                            {entry.assignedToBdeName || entry.assignedToTeamName || '—'}
                          </div>
                          <div className="text-[10px] text-[#64748B] font-mono whitespace-nowrap">
                            {entry.assignedToBdeId || entry.assignedToTeamId || 'Unassigned'}
                          </div>
                        </td>
                        <td className={cellClass}>
                          <ActorCell id={entry.assignedById} name={entry.assignedByName} users={users} />
                        </td>
                        <td className={`${cellClass} text-[#475569] max-w-xs font-medium`}>{entry.reason || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === 'CORRECTION' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <h3 className={sectionTitleClass}>
              <FiEdit3 className="text-[#059669]" />
              <span>Attendance Correction Log</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[960px]">
                <thead>
                  <tr className={tableHeaderClass}>
                    <th className={cellClass}>Timestamp</th>
                    <th className={cellClass}>Record</th>
                    <th className={cellClass}>Status Change</th>
                    <th className={cellClass}>Punch-Out Change</th>
                    <th className={cellClass}>Reason</th>
                    <th className={cellClass}>Corrected By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {attendanceCorrections.length === 0 ? (
                    <EmptyRow colSpan={6} message="No attendance corrections recorded yet." />
                  ) : (
                    attendanceCorrections.map((entry: AttendanceCorrection) => (
                      <tr key={entry.id} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className={`${cellClass} font-mono text-[#64748B] whitespace-nowrap`}>
                          {formatTimestamp(entry.timestamp)}
                        </td>
                        <td className={cellClass}>
                          <div className="font-bold text-[#0F172A] whitespace-nowrap">
                            {attendanceRecords.find((record) => record.id === entry.recordId)?.userName || 'Unknown record'}
                          </div>
                          <div className="text-[10px] text-[#64748B] font-mono whitespace-nowrap">{entry.recordId}</div>
                        </td>
                        <td className={cellClass}>
                          <div className="text-[10px] text-[#94A3B8] font-bold">Original → revised status</div>
                          <div className="flex items-center gap-2 flex-wrap mt-1">
                            <PlainBadge label={entry.previousStatus} />
                            <span className="text-[#94A3B8] font-bold">→</span>
                            <PlainBadge
                              label={entry.newStatus}
                              tone={entry.newStatus === 'PRESENT' ? 'cobalt' : entry.newStatus === 'LATE' ? 'amber' : 'slate'}
                            />
                          </div>
                        </td>
                        <td className={`${cellClass} font-mono text-[#475569] whitespace-nowrap`}>
                          <div className="text-[10px] text-[#94A3B8] font-bold">Original → revised punch-out</div>
                          <div className="mt-1">
                            {formatPunchOut(entry.previousPunchOutTime)}{' '}
                            <span className="text-[#94A3B8]">→</span> {formatPunchOut(entry.newPunchOutTime)}
                          </div>
                        </td>
                        <td className={`${cellClass} text-[#475569] max-w-xs font-medium`}>{entry.reason || '—'}</td>
                        <td className={cellClass}>
                          <ActorCell
                            id={entry.correctedById}
                            name={entry.correctedByName}
                            meta={entry.correctedById}
                            users={users}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === 'CALCULATION' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <h3 className={sectionTitleClass}>
              <FiDollarSign className="text-[#059669]" />
              <span>Financial Calculation Log</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[960px]">
                <thead>
                  <tr className={tableHeaderClass}>
                    <th className={cellClass}>Timestamp</th>
                    <th className={cellClass}>Calculation</th>
                    <th className={cellClass}>Inputs</th>
                    <th className={cellClass}>Results</th>
                    <th className={cellClass}>Calculated By</th>
                    <th className={cellClass}>Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {calculationLogs.length === 0 ? (
                    <EmptyRow colSpan={6} message="No financial calculations logged yet." />
                  ) : (
                    calculationLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className={`${cellClass} font-mono text-[#64748B] whitespace-nowrap`}>
                          <div>{formatTimestamp(log.createdAt)}</div>
                          <div className="text-[10px] text-[#94A3B8]">{log.id}</div>
                        </td>
                        <td className={`${cellClass} font-bold text-[#059669] whitespace-nowrap`}>
                          {String(log.calcType).replaceAll('_', ' ')}
                        </td>
                        <td className={`${cellClass} ${jsonClass} text-[#475569]`}>{formatJson(log.inputValues)}</td>
                        <td className={`${cellClass} ${jsonClass} text-[#059669] font-bold`}>{formatJson(log.resultValues)}</td>
                        <td className={cellClass}>
                          <ActorCell id={log.calculatedById} name={log.calculatedByName} users={users} />
                        </td>
                        <td className={`${cellClass} text-[#64748B] max-w-xs font-medium`}>{log.notes || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </div>

      <div className="glass-panel rounded-2xl border border-[#CBD5E1] bg-white p-5 flex items-start gap-3 shadow-xs">
        <div className="p-2 rounded-xl bg-[#ECFDF5] text-[#059669] shrink-0">
          <FiCalendar />
        </div>
        <div>
          <div className="text-xs font-bold text-[#0F172A]">Retention & Integrity Verification</div>
          <p className="text-[11px] text-[#64748B] mt-1">
            Records are appended immutably at the moment each workflow event occurs, stored synchronously on disk in JSON persistence, and verifiable across audit logs.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuditTrail;
