import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { FiBell } from 'react-icons/fi';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../context/useApp';
import { APP_ROUTES } from '../../utils/constants';

export const AppLayout: React.FC = () => {
  const {
    notification,
    dismissNotification,
    currentUser,
    currentRole,
    assignmentNotifications,
    dismissAssignmentNotification,
  } = useApp();
  const navigate = useNavigate();
  const myAssignmentNotifications =
    currentRole === 'BDE'
      ? assignmentNotifications.filter((item) => item.bdeId === currentUser.id)
      : [];

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-clip transition-colors duration-200 text-[#0F172A] selection:bg-[#10B981] selection:text-white bde-theme">
      <div className="ambient-bg" aria-hidden="true">
        <div className="ambient-image-layer" />
        <div className="ambient-gradient-overlay" />
        <div className="orb orb-cobalt" />
        <div className="orb orb-ice" />
        <div className="orb orb-navy" />
      </div>

      <Navbar />

      <div className="flex flex-1 relative min-w-0">
        <Sidebar />
        <main className="min-w-0 flex-1 relative z-10 p-4 sm:p-5 lg:p-5 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-5 overflow-x-clip">
          <div className="max-w-[1800px] mx-auto w-full">
            {notification && (
              <div
                role="alert"
                className={`sticky top-16 z-30 mb-4 flex items-start gap-3 rounded-xl border px-4 py-3 text-xs font-semibold shadow-lg ${
                  notification.type === 'error'
                    ? 'border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]'
                    : notification.type === 'success'
                      ? 'border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]'
                      : 'border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]'
                }`}
              >
                <span className="uppercase tracking-wide">{notification.type}</span>
                <span className="flex-1">{notification.message}</span>
                <button
                  type="button"
                  onClick={dismissNotification}
                  aria-label="Dismiss notification"
                  className="text-lg leading-none cursor-pointer"
                >
                  ×
                </button>
              </div>
            )}

            {myAssignmentNotifications.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                role="status"
                className="mb-4 rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] px-4 py-3 text-xs shadow-xs"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <FiBell className="mt-0.5 shrink-0 text-base text-[#059669]" />
                    <div className="min-w-0">
                      <p className="font-bold text-[#065F46]">
                        {myAssignmentNotifications.length === 1
                          ? `${myAssignmentNotifications[0].count} new lead${myAssignmentNotifications[0].count === 1 ? '' : 's'} assigned to you by ${myAssignmentNotifications[0].assignedByName}`
                          : `${myAssignmentNotifications.length} new lead assignments from your Team Lead`}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#047857]">
                        {myAssignmentNotifications
                          .slice(0, 2)
                          .map((item) => `${item.count} lead${item.count === 1 ? '' : 's'} · ${item.reason}`)
                          .join(' | ')}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        myAssignmentNotifications.forEach((item) => dismissAssignmentNotification(item.id));
                        navigate(APP_ROUTES.BDE.LEADS_QUEUE);
                      }}
                      className="rounded-lg border border-[#A7F3D0] bg-white px-3 py-1.5 font-bold text-[#059669] cursor-pointer hover:bg-[#F0FDF4]"
                    >
                      View Queue
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        myAssignmentNotifications.forEach((item) => dismissAssignmentNotification(item.id))
                      }
                      aria-label="Dismiss assignment notifications"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg font-bold text-[#047857] cursor-pointer hover:bg-white"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
            <AnimatePresence mode="wait">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
