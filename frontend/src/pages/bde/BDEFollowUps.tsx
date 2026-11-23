import React, { useState } from 'react';
import { FiCalendar, FiPhone, FiCheck } from 'react-icons/fi';
import { useApp } from '../../context/useApp';
import type { FollowUpItem } from '../../types';

const FOLLOW_UP_STATUS_CONFIG: Record<
  FollowUpItem['status'],
  { label: string; className: string; actionable: boolean }
> = {
  PENDING: {
    label: 'Pending',
    className: 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]',
    actionable: true,
  },
  OVERDUE: {
    label: 'Overdue',
    className: 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]',
    actionable: true,
  },
  COMPLETED: {
    label: 'Completed',
    className: 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]',
    actionable: false,
  },
  CANCELLED: {
    label: 'Cancelled',
    className: 'bg-[#F1F5F9] text-[#64748B] border-[#E2E8F0]',
    actionable: false,
  },
  MISSED: {
    label: 'Missed',
    className: 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]',
    actionable: false,
  },
};

const parseScheduledTime = (value: string): number | null => {
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
};

const formatScheduledTime = (value: string): string => {
  const timestamp = parseScheduledTime(value);
  if (timestamp === null) return value;
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
};

export const BDEFollowUps: React.FC = () => {
  const { followUps, completeFollowUp, currentUser } = useApp();
  const [completionErrors, setCompletionErrors] = useState<Record<string, string>>({});

  const myFollowUps = followUps
    .filter((fol: FollowUpItem) => fol.bdeId === currentUser.id)
    .sort((a: FollowUpItem, b: FollowUpItem) => {
      const first = parseScheduledTime(a.scheduledTime);
      const second = parseScheduledTime(b.scheduledTime);
      if (first === null && second === null) return 0;
      if (first === null) return 1;
      if (second === null) return -1;
      return first - second;
    });

  const statusCounts = myFollowUps.reduce<Record<FollowUpItem['status'], number>>(
    (counts, fol) => {
      counts[fol.status] += 1;
      return counts;
    },
    { PENDING: 0, COMPLETED: 0, OVERDUE: 0, CANCELLED: 0, MISSED: 0 }
  );

  const handleComplete = (fol: FollowUpItem) => {
    const succeeded = completeFollowUp(fol.id);
    setCompletionErrors((prev) => {
      const next = { ...prev };
      if (succeeded) {
        delete next[fol.id];
      } else {
        next[fol.id] = 'Could not complete this follow-up. It may no longer be assigned to you.';
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-[#0F172A] tracking-tight flex items-center gap-2">
            <FiCalendar className="text-[#059669]" />
            <span>Follow-up Calendar & Callback Agenda</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] font-medium mt-0.5">
            Priority schedule of upcoming candidate touchpoints, reminders, and callback notes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#059669] bg-[#ECFDF5] px-3.5 py-1.5 rounded-xl border border-[#A7F3D0] font-bold">
            {statusCounts.PENDING} Pending · {statusCounts.OVERDUE} Overdue
          </span>
        </div>
      </div>

      {/* Follow-up Cards Container */}
      <div className="glass-panel rounded-2xl p-4 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E8F0] pb-3">
          <h3 className="text-sm font-bold text-[#0F172A]">Scheduled Candidate Appointments</h3>
          <span className="text-xs text-[#64748B]">Total: {myFollowUps.length} scheduled for you</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {(Object.keys(FOLLOW_UP_STATUS_CONFIG) as FollowUpItem['status'][]).map((status) => (
            <span
              key={status}
              className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${FOLLOW_UP_STATUS_CONFIG[status].className}`}
            >
              {FOLLOW_UP_STATUS_CONFIG[status].label}: {statusCounts[status]}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
          {myFollowUps.map((fol: FollowUpItem) => {
            const statusConfig = FOLLOW_UP_STATUS_CONFIG[fol.status];
            return (
              <div
                key={fol.id}
                className={`p-4 rounded-2xl border flex flex-col justify-between text-xs transition-all ${
                  statusConfig.actionable
                    ? 'bg-white border-[#E2E8F0] shadow-xs hover:border-[#A7F3D0]'
                    : 'bg-[#F8FAFC]/60 border-[#E2E8F0] opacity-70'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-bold text-[#0F172A] text-sm">{fol.candidateName}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0] font-bold shrink-0">
                      {formatScheduledTime(fol.scheduledTime)}
                    </span>
                  </div>

                  <div className="text-[#64748B] font-mono">{fol.candidatePhone}</div>

                  <p className="text-[#475569] text-[11px] italic bg-[#F8FAFC] p-2.5 rounded-xl border border-[#E2E8F0]">
                    "{fol.remarks}"
                  </p>
                </div>

                <div className="pt-3 border-t border-[#F1F5F9] mt-3">
                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:${fol.candidatePhone.replace(/\s+/g, '')}`}
                      className="p-2 rounded-xl bg-[#ECFDF5] text-[#059669] hover:bg-[#D1FAE5] border border-[#A7F3D0]"
                      title="Direct Call Candidate"
                    >
                      <FiPhone className="text-xs" />
                    </a>

                    {statusConfig.actionable ? (
                      <button
                        onClick={() => handleComplete(fol)}
                        className="flex-1 py-2 rounded-xl bg-[#ECFDF5] hover:bg-[#D1FAE5] text-[#059669] border border-[#A7F3D0] font-bold text-[11px] cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <FiCheck />
                        <span>
                          {fol.status === 'OVERDUE' ? 'Mark Overdue Callback Done' : 'Mark Follow-up Completed'}
                        </span>
                      </button>
                    ) : (
                      <span className="flex-1 py-1.5 rounded-xl bg-[#F1F5F9] text-[#64748B] text-center font-bold text-[11px]">
                        {fol.status === 'COMPLETED' ? 'Completed ✓' : statusConfig.label}
                      </span>
                    )}
                  </div>

                  {completionErrors[fol.id] && (
                    <p className="mt-2 text-[11px] font-semibold text-[#B91C1C]">{completionErrors[fol.id]}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {myFollowUps.length === 0 && (
          <div className="py-12 text-center text-xs text-[#64748B]">
            No follow-ups are assigned to you yet. When you schedule callbacks from your calling disposition, they will appear here.
          </div>
        )}
      </div>
    </div>
  );
};

export default BDEFollowUps;
