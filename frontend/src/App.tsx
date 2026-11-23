import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import AppRoutes from './routes/AppRoutes';
import ScrollToTop from './components/common/ScrollToTop';

interface ErrorBoundaryState {
  error: Error | null;
}

class AppErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Application render error:', error, info);
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children;

    return (
      <div role="alert" className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-6 text-[#0F172A]">
        <div className="max-w-lg w-full rounded-2xl border border-[#FECACA] bg-white p-6 shadow-xl">
          <h1 className="text-lg font-black text-[#B91C1C]">Something went wrong</h1>
          <p className="mt-2 text-sm font-medium text-[#475569] break-words">{this.state.error.message}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 rounded-xl bg-[#10B981] px-4 py-2 text-xs font-bold text-white cursor-pointer hover:bg-[#059669]"
          >
            Reload application
          </button>
        </div>
      </div>
    );
  }
}

export const App: React.FC = () => {
  return (
    <AppErrorBoundary>
      <AppProvider>
        <BrowserRouter>
          <ScrollToTop />
          <AppRoutes />
        </BrowserRouter>
      </AppProvider>
    </AppErrorBoundary>
  );
};

export default App;
