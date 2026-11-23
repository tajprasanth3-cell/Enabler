import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../context/useApp';

export const AppLayout: React.FC = () => {
  const { notification, dismissNotification } = useApp();

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-clip transition-colors duration-200 bg-[#F8FAFC] text-[#0F172A] selection:bg-[#10B981] selection:text-white bde-theme">
      <div className="ambient-bg">
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
                className={`sticky top-0 z-30 mb-4 flex items-start gap-3 rounded-xl border px-4 py-3 text-xs font-semibold shadow-lg ${
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
