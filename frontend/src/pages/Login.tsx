import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  FiAlertCircle,
  FiArrowRight,
  FiLock,
  FiMail,
  FiZap,
} from 'react-icons/fi';
import { useApp } from '../context/useApp';
import { APP_ROUTES, ROLE_HOME_ROUTES } from '../utils/constants';

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0 },
};

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, login, currentRole } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: string } | null)?.from;

  if (isAuthenticated) {
    return <Navigate to={from || ROLE_HOME_ROUTES[currentRole] || APP_ROUTES.ADMIN.DASHBOARD} replace />;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Enter your email address.');
      return;
    }
    if (!password.trim()) {
      setError('Enter your password.');
      return;
    }

    setSubmitting(true);
    const result = await login(email, password);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    navigate(from || ROLE_HOME_ROUTES[result.role || currentRole] || APP_ROUTES.ADMIN.DASHBOARD, { replace: true });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F8FAFC] text-[#0F172A]">
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          className="absolute -left-28 -top-28 h-96 w-96 rounded-full bg-[#10B981]/15 blur-3xl"
          animate={{ x: [0, 60, 0], y: [0, 35, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-32 -right-20 h-[30rem] w-[30rem] rounded-full bg-[#7C3AED]/15 blur-3xl"
          animate={{ x: [0, -50, 0], y: [0, -40, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute left-1/2 top-1/3 h-64 w-64 rounded-full bg-[#0F766E]/10 blur-3xl"
          animate={{ x: [-40, 40, -40], opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div className="relative mx-auto grid min-h-screen max-w-7xl gap-8 px-5 py-6 lg:grid-cols-2 lg:items-center lg:px-8 lg:py-8">
        <motion.div
          className="hidden lg:block"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
        >
          <motion.div variants={fadeUp} transition={{ duration: 0.5 }} className="mb-6 flex items-center gap-3">
            <motion.div
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#10B981] text-white shadow-xl"
              animate={{ rotate: [0, 8, 0, -8, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            >
              <FiZap className="text-xl" />
            </motion.div>
            <div>
              <div className="text-xl font-black tracking-tight">Enabler</div>
              <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#64748B]">
                Lead Intelligence Suite
              </div>
            </div>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="max-w-xl text-5xl font-black leading-[1.05] tracking-tight text-[#0F172A]"
          >
            Every lead, every follow-up,{' '}
            <span className="bg-gradient-to-r from-[#10B981] to-[#7C3AED] bg-clip-text text-transparent">
              in perfect motion.
            </span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="mt-6 max-w-lg text-sm font-medium leading-relaxed text-[#64748B]"
          >
            A single command center for admin allocation, teamlead distribution, BDE execution, attendance and
            revenue reconciliation.
          </motion.p>

          <motion.div variants={fadeUp} transition={{ duration: 0.5 }} className="mt-6 grid max-w-lg grid-cols-3 gap-3">
            {[
              { value: '3', label: 'Live roles' },
              { value: '10', label: 'API groups' },
              { value: '24/7', label: 'Audit trail' },
            ].map((stat) => (
              <motion.div
                key={stat.label}
                whileHover={{ y: -5 }}
                className="rounded-2xl border border-white bg-white/70 p-4 shadow-lg backdrop-blur"
              >
                <div className="text-2xl font-black text-[#059669]">{stat.value}</div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[#64748B]">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto w-full max-w-md"
        >
          <div className="rounded-3xl border border-white bg-white/85 p-4 shadow-2xl shadow-[#0F172A]/10 backdrop-blur-xl sm:p-5">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } } }}
            >
              <motion.div variants={fadeUp} transition={{ duration: 0.4 }} className="mb-2 flex items-center gap-2 lg:hidden">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#10B981] text-white">
                  <FiZap />
                </div>
                <span className="text-lg font-black">Enabler</span>
              </motion.div>

              <motion.h2 variants={fadeUp} transition={{ duration: 0.4 }} className="text-2xl font-black tracking-tight">
                Welcome back
              </motion.h2>
              <motion.p variants={fadeUp} transition={{ duration: 0.4 }} className="mt-1 text-xs font-medium text-[#64748B]">
                Sign in to continue to your workspace.
              </motion.p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <motion.div variants={fadeUp} transition={{ duration: 0.4 }}>
                  <label className="mb-1.5 block text-[11px] font-bold text-[#475569]">Email address</label>
                  <div className="flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 focus-within:border-[#10B981] focus-within:bg-white">
                    <FiMail className="text-[#94A3B8]" />
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        setError('');
                      }}
                      autoComplete="username"
                      className="w-full bg-transparent py-3 text-xs font-semibold text-[#0F172A] outline-none"
                      placeholder="you@leadflow.io"
                    />
                  </div>
                </motion.div>

                <motion.div variants={fadeUp} transition={{ duration: 0.4 }}>
                  <label className="mb-1.5 block text-[11px] font-bold text-[#475569]">Password</label>
                  <div className="flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 focus-within:border-[#10B981] focus-within:bg-white">
                    <FiLock className="text-[#94A3B8]" />
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => {
                        setPassword(event.target.value);
                        setError('');
                      }}
                      autoComplete="current-password"
                      className="w-full bg-transparent py-3 text-xs font-semibold text-[#0F172A] outline-none"
                      placeholder="Enter your password"
                    />
                  </div>
                </motion.div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      key={error}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: [0, -6, 6, -4, 4, 0] }}
                      exit={{ opacity: 0, x: 8 }}
                      transition={{ duration: 0.45 }}
                      role="alert"
                      className="flex items-center gap-2 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3 py-2.5 text-[11px] font-bold text-[#B91C1C]"
                    >
                      <FiAlertCircle className="shrink-0" />
                      <span>{error}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.button
                  variants={fadeUp}
                  transition={{ duration: 0.4 }}
                  type="submit"
                  disabled={submitting}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#10B981] px-4 py-3 text-xs font-black text-white shadow-lg shadow-[#10B981]/25 transition-colors hover:bg-[#047857] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submitting ? 'Signing in…' : 'Sign in to workspace'}
                  {!submitting && <FiArrowRight />}
                </motion.button>
              </form>

              <motion.div variants={fadeUp} transition={{ duration: 0.4 }} className="mt-6 border-t border-[#E2E8F0] pt-5">
                <p className="text-[11px] font-medium leading-relaxed text-[#64748B]">
                  Don&apos;t have an account?{' '}
                  <a
                    href="mailto:admin@leadflow.io?subject=Enabler%20Account%20Request"
                    className="font-bold text-[#2563EB] hover:text-[#1D4ED8]"
                  >
                    Contact your administrator
                  </a>
                  .
                </p>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
