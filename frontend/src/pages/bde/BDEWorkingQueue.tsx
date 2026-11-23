import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiPhoneCall,
  FiPhone,
  FiMessageSquare,
  FiSearch,
  FiFilter,
  FiGrid,
  FiList,
  FiClock,
  FiRefreshCw,
  FiAlertCircle,
} from 'react-icons/fi';
import { useApp } from '../../context/useApp';
import type { Lead, LeadStatus } from '../../types';
import StatusBadge from '../../components/common/Badge';
import { LEAD_STATUS_CONFIG, OPEN_LEAD_STATUSES } from '../../utils/constants';
import { isFutureDateTime, toDateTimeLocalValue } from '../../utils/calculations';

const formatFollowUpDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export const BDEWorkingQueue: React.FC = () => {
  const {
    leads,
    currentUser,
    updateLeadStatus,
    isBdeExhausted,
    requestLeadReplenishment,
    replenishmentAlerts,
    getAllowedStatuses,
    notify,
  } = useApp();

  const myLeads = leads.filter((l: Lead) => l.currentBdeId === currentUser.id);
  const openLeads = myLeads.filter((l: Lead) => OPEN_LEAD_STATUSES.includes(l.status));
  const isAlertSent = replenishmentAlerts.some((a: { bdeId: string }) => a.bdeId === currentUser.id);

  const handleRequestReplenishment = () => {
    const result = requestLeadReplenishment();
    notify(result.ok ? 'success' : 'warning', result.message);
  };

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('OPEN');
  const [viewMode, setViewMode] = useState<'CARDS' | 'TABLE'>('CARDS');

  // Call Disposition Modal State
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [newStatus, setNewStatus] = useState<LeadStatus>('CONTACTED');
  const [callRemarks, setCallRemarks] = useState('');
  const [scheduleFollowUpTime, setScheduleFollowUpTime] = useState('');
  const [scheduleFollowUpNote, setScheduleFollowUpNote] = useState('');
  const [showDispositionModal, setShowDispositionModal] = useState(false);
  const [formError, setFormError] = useState('');
  const [minFollowUpTime, setMinFollowUpTime] = useState(() =>
    toDateTimeLocalValue(new Date().toISOString())
  );
  const allowedStatuses = selectedLead ? getAllowedStatuses(selectedLead.status) : [];

  useEffect(() => {
    const updateMinimum = () => setMinFollowUpTime(toDateTimeLocalValue(new Date().toISOString()));
    updateMinimum();
    const timer = setInterval(updateMinimum, 60_000);
    return () => clearInterval(timer);
  }, []);

  const handleOpenDisposition = (lead: Lead) => {
    const statuses = getAllowedStatuses(lead.status);
    setSelectedLead(lead);
    setNewStatus(statuses[0] || lead.status);
    setCallRemarks('');
    setScheduleFollowUpTime('');
    setScheduleFollowUpNote('');
    setFormError('');
    setShowDispositionModal(true);
  };

  const handleSaveDisposition = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;
    if (!callRemarks.trim()) {
      setFormError('Call remarks are required before saving a disposition.');
      return;
    }
    if (newStatus === 'FOLLOW_UP_REQUIRED' && !isFutureDateTime(scheduleFollowUpTime)) {
      setFormError('Select a future date and time for the required follow-up.');
      return;
    }
    if (scheduleFollowUpTime && !isFutureDateTime(scheduleFollowUpTime)) {
      setFormError('The follow-up slot must be a valid future date and time.');
      return;
    }

    const succeeded = updateLeadStatus(
      selectedLead.id,
      newStatus,
      callRemarks.trim(),
      scheduleFollowUpTime ? { time: scheduleFollowUpTime, note: scheduleFollowUpNote.trim() } : undefined
    );
    if (!succeeded) {
      setFormError('Could not save this disposition. Check the status transition and your lead assignment.');
      return;
    }
    setShowDispositionModal(false);
    setSelectedLead(null);
    setFormError('');
  };

  // Filtered Leads
  const filteredLeads = myLeads.filter((l: Lead) => {
    const matchesSearch =
      l.candidateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.phone.includes(searchTerm) ||
      (l.city && l.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (l.education && l.education.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (l.email && l.email.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === 'OPEN'
        ? OPEN_LEAD_STATUSES.includes(l.status)
        : statusFilter === 'ALL' || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-[#0F172A] tracking-tight flex items-center gap-2">
            <FiPhoneCall className="text-[#059669]" />
            <span>Assigned Working Queue</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] font-medium mt-0.5">
            Outreach to candidate leads, direct dial, log call dispositions, and schedule callbacks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#059669] bg-[#ECFDF5] px-3 py-1.5 rounded-xl border border-[#A7F3D0]">
            {filteredLeads.length} of {openLeads.length} Open Leads
          </span>
        </div>
      </div>

      {/* Lead Exhaustion Banner */}
      {isBdeExhausted && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 sm:p-5 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs"
        >
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-white text-[#D97706] border border-[#FDE68A] mt-0.5 shrink-0">
              <FiAlertCircle className="text-xl" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#0F172A]">No New Leads Remaining in Queue!</h4>
              <p className="text-xs text-[#64748B] mt-0.5 max-w-xl leading-relaxed">
                You have completed all assigned leads. Your pending queue is at 0. Request fresh candidate leads from your Team Lead.
              </p>
            </div>
          </div>

          <button
            onClick={handleRequestReplenishment}
            disabled={isAlertSent}
            className={`w-full md:w-auto px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              isAlertSent
                ? 'bg-white text-[#64748B] border border-[#E2E8F0] cursor-default shadow-xs'
                : 'shimmer-button text-white shadow-xs'
            }`}
          >
            <FiRefreshCw className={isAlertSent ? '' : 'animate-spin'} />
            <span>{isAlertSent ? 'Alert Sent to Team Lead ✓' : 'Request Lead Replenishment'}</span>
          </button>
        </motion.div>
      )}

      {/* Main Calling Queue Container */}
      <div className="glass-panel rounded-2xl p-4 sm:p-6 space-y-4">
        {/* Search, Filter & View Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            {/* Search Bar */}
            <div className="relative flex-1 sm:flex-initial min-w-[220px]">
              <FiSearch className="absolute left-3 top-2.5 text-[#64748B] text-xs" />
              <input
                type="text"
                placeholder="Search candidate, phone, city..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-8 pr-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#10B981] focus:bg-white"
              />
            </div>

            {/* Status Filter Dropdown */}
            <div className="flex items-center gap-1.5 text-xs">
              <FiFilter className="text-[#64748B]" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs text-[#0F172A] font-medium focus:outline-none focus:border-[#10B981]"
              >
                <option value="OPEN">Open Queue ({openLeads.length})</option>
                <option value="ALL">All Leads ({myLeads.length})</option>
                <option value="NEW">New Leads</option>
                <option value="CONTACTED">Contacted</option>
                <option value="INTERESTED">Interested</option>
                <option value="FOLLOW_UP_REQUIRED">Follow-up Due</option>
                <option value="CONVERTED">Converted 🎉</option>
                <option value="NOT_REACHABLE">Not Reachable</option>
                <option value="NOT_INTERESTED">Not Interested</option>
                <option value="LOST">Lost</option>
              </select>
            </div>
          </div>

          {/* Cards vs Table Switcher */}
          <div className="flex items-center bg-[#F1F5F9] p-1 rounded-xl border border-[#E2E8F0] self-start lg:self-auto">
            <button
              type="button"
              onClick={() => setViewMode('CARDS')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                viewMode === 'CARDS'
                  ? 'bg-white text-[#059669] shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
              title="Card View (Optimized for Mobile)"
            >
              <FiGrid />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('TABLE')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                viewMode === 'TABLE'
                  ? 'bg-white text-[#059669] shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
              title="Table View (Optimized for Desktop/Tablet)"
            >
              <FiList />
            </button>
          </div>
        </div>

        {/* Empty State */}
        {filteredLeads.length === 0 && (
          <div className="py-12 text-center text-xs text-[#64748B] space-y-2">
            <FiPhoneCall className="mx-auto text-3xl text-[#059669] opacity-60" />
            <div className="font-bold text-sm text-[#0F172A]">No candidates found</div>
            <p>Try resetting search filters or requesting additional leads from your Team Lead.</p>
          </div>
        )}

        {/* VIEW MODE A: MOBILE & TABLET CARDS */}
        {viewMode === 'CARDS' && filteredLeads.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2">
            {filteredLeads.map((lead: Lead) => (
              <motion.div
                key={lead.id}
                whileHover={{ y: -2 }}
                className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs hover:border-[#A7F3D0] transition-all flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-sm text-[#0F172A]">{lead.candidateName}</h4>
                      <div className="text-[11px] text-[#64748B] font-mono">{lead.id}</div>
                    </div>
                    <StatusBadge status={lead.status} />
                  </div>

                  <div className="space-y-1 text-xs text-[#475569]">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#0F172A]">{lead.phone}</span>
                      {lead.email && <span className="text-[11px] text-[#64748B]">({lead.email})</span>}
                    </div>
                    <div className="text-[11px] text-[#64748B]">
                      {lead.city} • <span className="font-medium text-[#0F172A]">{lead.education}</span>
                    </div>
                  </div>

                  {lead.nextFollowUpDate && (
                    <div className="p-2 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] text-[11px] text-[#065F46] flex items-center justify-between font-semibold">
                      <span>Follow-up:</span>
                      <span className="font-bold">{formatFollowUpDate(lead.nextFollowUpDate)}</span>
                    </div>
                  )}
                </div>

                {/* Quick Action Buttons */}
                <div className="flex items-center gap-2 pt-2 border-t border-[#F1F5F9]">
                  <a
                    href={`tel:${lead.phone.replace(/\s+/g, '')}`}
                    className="p-2.5 rounded-xl bg-[#ECFDF5] text-[#059669] hover:bg-[#D1FAE5] border border-[#A7F3D0] text-xs font-bold transition-colors"
                    title="Direct Call Candidate"
                  >
                    <FiPhone />
                  </a>

                  <a
                    href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-xl bg-[#F0FDF4] text-[#16A34A] hover:bg-[#DCFCE7] border border-[#BBF7D0] text-xs font-bold transition-colors"
                    title="WhatsApp Chat"
                  >
                    <FiMessageSquare />
                  </a>

                  <button
                    onClick={() => handleOpenDisposition(lead)}
                    className="flex-1 py-2 rounded-xl shimmer-button text-white font-bold text-xs shadow-xs cursor-pointer text-center"
                  >
                    Call & Disposition
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* VIEW MODE B: TABLE */}
        {viewMode === 'TABLE' && filteredLeads.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
            <table className="w-full text-left text-xs border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-[#64748B] font-bold bg-[#F8FAFC]">
                  <th className="py-3 px-3">Lead ID</th>
                  <th className="py-3 px-3">Candidate Name</th>
                  <th className="py-3 px-3">Contact</th>
                  <th className="py-3 px-3">City / Qualification</th>
                  <th className="py-3 px-3">Calling Status</th>
                  <th className="py-3 px-3">Next Action</th>
                  <th className="py-3 px-3 text-right">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredLeads.map((lead: Lead) => (
                  <tr key={lead.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3.5 px-3 font-mono text-[#64748B]">{lead.id}</td>
                    <td className="py-3.5 px-3 font-bold text-[#0F172A]">{lead.candidateName}</td>
                    <td className="py-3.5 px-3 text-[#0F172A] font-mono">
                      <div className="font-semibold">{lead.phone}</div>
                      <div className="text-[10px] text-[#64748B]">{lead.email || '—'}</div>
                    </td>
                    <td className="py-3.5 px-3 text-[#475569]">
                      <div>{lead.city}</div>
                      <div className="text-[10px] text-[#64748B]">{lead.education}</div>
                    </td>
                    <td className="py-3.5 px-3">
                      <StatusBadge status={lead.status} />
                    </td>
                    <td className="py-3.5 px-3 text-[#475569]">
                      {lead.nextFollowUpDate ? (
                        <span className="text-[#065F46] font-bold bg-[#ECFDF5] px-2 py-0.5 rounded-full border border-[#A7F3D0]">
                          {formatFollowUpDate(lead.nextFollowUpDate)}
                        </span>
                      ) : (
                        <span className="text-[#64748B]">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        <a
                          href={`tel:${lead.phone.replace(/\s+/g, '')}`}
                          className="p-1.5 rounded-lg bg-[#ECFDF5] text-[#059669] hover:bg-[#D1FAE5] border border-[#A7F3D0]"
                          title="Direct Call"
                        >
                          <FiPhone className="text-xs" />
                        </a>
                        <button
                          onClick={() => handleOpenDisposition(lead)}
                          className="px-3 py-1.5 rounded-xl shimmer-button text-white font-bold text-xs shadow-xs cursor-pointer"
                        >
                          Disposition
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Disposition Modal */}
      <AnimatePresence>
        {showDispositionModal && selectedLead && (
          <motion.div
            key="disposition-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#0F172A]/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          >
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="modal-panel bg-white w-full max-w-lg rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 border border-[#E2E8F0] shadow-2xl space-y-4"
            >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                  <FiPhoneCall className="text-[#059669]" />
                  <span>Call Disposition: {selectedLead.candidateName}</span>
                </h3>
                <div className="text-xs text-[#64748B] font-mono mt-0.5">
                  Phone: {selectedLead.phone} | {selectedLead.city} ({selectedLead.education})
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDispositionModal(false)}
                className="text-[#64748B] hover:text-[#0F172A] text-xl font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDisposition} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#0F172A] font-bold mb-1">
                  Update Candidate Calling Status *
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => {
                    setNewStatus(e.target.value as LeadStatus);
                    setFormError('');
                  }}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] text-xs font-bold focus:outline-none focus:border-[#10B981] focus:bg-white"
                >
                  {allowedStatuses.map((status) => (
                    <option key={status} value={status}>
                      {LEAD_STATUS_CONFIG[status].label}
                    </option>
                  ))}
                  {allowedStatuses.length === 0 && (
                    <option value={selectedLead.status}>
                      {LEAD_STATUS_CONFIG[selectedLead.status].label} (Final status)
                    </option>
                  )}
                </select>
                {allowedStatuses.length === 0 && (
                  <p className="text-[11px] text-[#B45309] mt-1 font-semibold">
                    This lead is in a final state. Contact your Team Lead for reassignment instead.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[#0F172A] font-bold mb-1">
                  Call Remarks & Candidate Discussion Summary *
                </label>
                <textarea
                  required
                  rows={3}
                  value={callRemarks}
                  onChange={(e) => {
                    setCallRemarks(e.target.value);
                    setFormError('');
                  }}
                  placeholder="Detail conversation points, student queries, course preferences, or reasons for follow-up..."
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] text-xs font-medium focus:outline-none focus:border-[#10B981] focus:bg-white"
                />
              </div>

              {/* Schedule Follow-up section */}
              {['FOLLOW_UP_REQUIRED', 'INTERESTED', 'CONTACTED'].includes(newStatus) && (
                <div className="p-3.5 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] space-y-3">
                  <div className="flex items-center gap-1.5 text-[#065F46] font-bold">
                    <FiClock />
                    <span>Schedule Callback / Follow-up Slot</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[#0F172A] font-semibold mb-1 text-[11px]">
                        Follow-up Date &amp; Time {newStatus === 'FOLLOW_UP_REQUIRED' && <span className="text-[#B91C1C]">*</span>}
                      </label>
                      <input
                        type="datetime-local"
                        min={minFollowUpTime}
                        value={scheduleFollowUpTime}
                        onChange={(e) => {
                          setScheduleFollowUpTime(e.target.value);
                          setFormError('');
                        }}
                        className="w-full bg-white border border-[#A7F3D0] rounded-lg p-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#10B981]"
                      />
                    </div>
                    <div>
                      <label className="block text-[#0F172A] font-semibold mb-1 text-[11px]">
                        Follow-up Agenda Note
                      </label>
                      <input
                        type="text"
                        value={scheduleFollowUpNote}
                        onChange={(e) => {
                          setScheduleFollowUpNote(e.target.value);
                          setFormError('');
                        }}
                        placeholder="e.g. Discuss fee structure with parents"
                        className="w-full bg-white border border-[#A7F3D0] rounded-lg p-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#10B981]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {formError && (
                <p className="text-[11px] font-semibold text-[#B91C1C] bg-[#FEF2F2] border border-[#FECACA] rounded-xl p-2.5">
                  {formError}
                </p>
              )}

              {/* Action buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setShowDispositionModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0] font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={allowedStatuses.length === 0}
                  className="px-5 py-2.5 rounded-xl shimmer-button text-white font-bold shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Call Disposition
                </button>
              </div>
            </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BDEWorkingQueue;
