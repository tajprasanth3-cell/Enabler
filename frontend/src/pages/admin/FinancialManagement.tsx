import React, { useState } from 'react';
import { useApp } from '../../context/useApp';
import {
  calculateRevenueShare,
  calculateProfitShare,
  calculateDiscount,
  calculateGrowth,
} from '../../utils/calculations';
import { motion } from 'framer-motion';
import {
  FiDollarSign,
  FiPieChart,
  FiPercent,
  FiTrendingUp,
  FiCheckCircle,
  FiAlertCircle,
  FiClock,
  FiPlusCircle,
  FiLayers,
  FiFileText,
} from 'react-icons/fi';

export const FinancialManagement: React.FC = () => {
  const {
    transactions,
    calculationLogs,
    leads,
    companySharePct,
    setCompanySharePct,
    confirmPaymentTransaction,
    logFinancialCalculation,
    systemSettings,
  } = useApp();

  // Active Tab for Calculators
  const [activeTab, setActiveTab] = useState<'30_70' | 'PROFIT' | 'ADDITIONAL'>('30_70');

  // 1. Revenue Share Calculator State
  const [calcCompanySharePct, setCalcCompanySharePct] = useState<number>(companySharePct);
  const [revInput, setRevInput] = useState<number>(50000);
  const revResult = calculateRevenueShare(revInput, calcCompanySharePct);

  // 2. Profit Share Calculator State
  const [profitInvInput, setProfitInvInput] = useState<number>(20000);
  const [profitRevInput, setProfitRevInput] = useState<number>(50000);
  const [profitSharePct, setProfitSharePct] = useState<number>(systemSettings.profitSharePercentage);
  const profitResult = calculateProfitShare(profitInvInput, profitRevInput, profitSharePct);

  // 3. Additional Calculators State
  const [discPrice, setDiscPrice] = useState<number>(45000);
  const [discPct, setDiscPct] = useState<number>(15);
  const discResult = calculateDiscount(discPrice, discPct);

  const [growthPrev, setGrowthPrev] = useState<number>(300000);
  const [growthCurr, setGrowthCurr] = useState<number>(450000);
  const growthResult = calculateGrowth(growthPrev, growthCurr);

  // Modal to confirm payment on converted lead
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [txGrossAmount, setTxGrossAmount] = useState<number>(50000);
  const [txInvestmentCost, setTxInvestmentCost] = useState<number>(15000);
  const [txNotes, setTxNotes] = useState<string>('Course enrollment fee via Bank Transfer');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Converted leads that are ready for payment confirmation
  const convertedLeads = leads.filter(
    (l) => l.status === 'CONVERTED' && !transactions.some((t) => t.leadId === l.id)
  );

  // Summary Metrics
  const confirmedTransactions = transactions.filter((t) => t.status === 'CONFIRMED');
  const totalRecordedRevenue = confirmedTransactions.reduce((acc, t) => acc + t.grossAmount, 0);
  const totalCompanyShare = confirmedTransactions.reduce((acc, t) => acc + t.companyShareAmount, 0);
  const totalRemainingShare = confirmedTransactions.reduce((acc, t) => acc + t.remainingShareAmount, 0);
  const totalCalculatedProfit = confirmedTransactions.reduce((acc, t) => acc + t.netProfit, 0);
  const storedCompanyRatios = Array.from(new Set(confirmedTransactions.map((t) => t.companySharePercentage))).sort(
    (a, b) => a - b
  );
  const storedRemainingRatios = Array.from(new Set(confirmedTransactions.map((t) => t.remainingSharePercentage))).sort(
    (a, b) => a - b
  );
  const ratioText = (values: number[]) => (values.length ? values.map((value) => `${value}%`).join(', ') : '—');
  const txSharePreview = calculateRevenueShare(txGrossAmount, companySharePct);
  const txProfitPreview = calculateProfitShare(txInvestmentCost, txGrossAmount, systemSettings.profitSharePercentage);

  const handleSaveRevCalculation = () => {
    logFinancialCalculation(
      'REVENUE_SHARE_30_70',
      { totalRevenue: revInput, companySharePct: calcCompanySharePct },
      { companyShare: revResult.companyShare, remainingShare: revResult.remainingShare },
      `Revenue split calculation at ${calcCompanySharePct}:${100 - calcCompanySharePct}`
    );
  };

  const handleSaveProfitCalculation = () => {
    logFinancialCalculation(
      'PROFIT_SHARE',
      { investment: profitInvInput, revenue: profitRevInput, profitSharePct },
      {
        netProfit: profitResult.netProfit,
        companyProfitShare: profitResult.companyProfitShare,
        remainingProfitShare: profitResult.remainingProfitShare,
      },
      `Profit split calculation: Net profit ₹${profitResult.netProfit}`
    );
  };

  const handleSaveDiscountCalculation = () => {
    logFinancialCalculation(
      'DISCOUNT_FINAL_PRICE',
      { originalPrice: discPrice, discountPercentage: discPct },
      { discountAmount: discResult.discountAmount, finalPrice: discResult.finalPrice },
      `Discount calculation at ${discPct}%`
    );
  };

  const handleSaveGrowthCalculation = () => {
    logFinancialCalculation(
      'SALES_GROWTH',
      { previousRevenue: growthPrev, currentRevenue: growthCurr },
      { difference: growthResult.difference, growthPercentage: growthResult.growthPercentage },
      `Revenue growth from ₹${growthPrev.toLocaleString()} to ₹${growthCurr.toLocaleString()}`
    );
  };

  const handleSaveDefaultRatio = () => {
    const safePct = Math.min(95, Math.max(5, Number.isFinite(calcCompanySharePct) ? calcCompanySharePct : 30));
    setCalcCompanySharePct(safePct);
    setCompanySharePct(safePct);
    setFeedback({
      type: 'success',
      message: `Default company ratio saved as ${safePct}:${100 - safePct}.`,
    });
  };

  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadId) return;
    if (
      !Number.isFinite(txGrossAmount) ||
      txGrossAmount <= 0 ||
      !Number.isFinite(txInvestmentCost) ||
      txInvestmentCost < 0
    ) {
      setFeedback({
        type: 'error',
        message: 'Gross payment must be greater than ₹0 and investment/direct cost cannot be negative.',
      });
      return;
    }
    const lead = convertedLeads.find((item) => item.id === selectedLeadId);
    const confirmed = confirmPaymentTransaction(selectedLeadId, txGrossAmount, txInvestmentCost, txNotes);
    if (!confirmed) {
      setFeedback({
        type: 'error',
        message: 'Payment was not confirmed. Verify the lead, amounts and that no transaction exists for this conversion.',
      });
      return;
    }
    setFeedback({
      type: 'success',
      message: `Payment for ${lead?.candidateName || 'the converted lead'} confirmed and posted to the ledger.`,
    });
    setShowConfirmModal(false);
    const nextLead = convertedLeads.find((item) => item.id !== selectedLeadId);
    if (nextLead) setSelectedLeadId(nextLead.id);
  };

  return (
    <div className="space-y-5 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-6">
        <div>
          <div className="flex items-center gap-2 text-[#2563EB] text-xs font-bold uppercase tracking-wider mb-1">
            <FiDollarSign />
            <span>Admin Executive Financial Suite</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-[#0F172A] tracking-tight">
            Financial Management & Revenue Sharing
          </h1>
          <p className="text-[#64748B] text-sm mt-1">
            Manage 30:70 business percentage models, profit distributions, and confirmed lead conversion revenues.
          </p>
        </div>

        <button
          disabled={convertedLeads.length === 0}
          onClick={() => {
            if (convertedLeads.length > 0) {
              setSelectedLeadId(convertedLeads[0].id);
              setFeedback(null);
              setShowConfirmModal(true);
            }
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl shimmer-button text-white font-bold text-xs shadow-md cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FiPlusCircle />
          <span>Confirm Converted Lead Payment</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 border ${
            feedback.type === 'success'
              ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#047857]'
              : 'bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]'
          }`}
        >
          {feedback.type === 'success' ? <FiCheckCircle /> : <FiAlertCircle />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4">
        <motion.div whileHover={{ y: -3 }} className="glass-panel p-5 rounded-2xl relative overflow-hidden min-w-0">
          <div className="flex items-center justify-between text-[#64748B] text-xs font-bold">
            <span>Total Confirmed Revenue</span>
            <div className="p-2 rounded-xl bg-[#EFF6FF] text-[#2563EB]">
              <FiDollarSign className="text-base" />
            </div>
          </div>
          <div className="text-3xl font-black text-[#0F172A] mt-2 truncate">
            ₹{totalRecordedRevenue.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-[#2563EB] mt-1 flex items-center gap-1 font-semibold">
            <FiCheckCircle />
            <span>{confirmedTransactions.length} Confirmed Transactions</span>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -3 }} className="glass-panel p-5 rounded-2xl relative overflow-hidden min-w-0">
          <div className="flex items-center justify-between text-[#64748B] text-xs font-bold">
            <span>Company Share (stored: {ratioText(storedCompanyRatios)})</span>
            <div className="p-2 rounded-xl bg-[#EFF6FF] text-[#2563EB]">
              <FiPieChart className="text-base" />
            </div>
          </div>
          <div className="text-3xl font-black text-[#2563EB] mt-2 truncate">
            ₹{totalCompanyShare.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-[#64748B] mt-1 font-medium">Ratio recorded on each confirmed transaction</div>
        </motion.div>

        <motion.div whileHover={{ y: -3 }} className="glass-panel p-5 rounded-2xl relative overflow-hidden min-w-0">
          <div className="flex items-center justify-between text-[#64748B] text-xs font-bold">
            <span>Remaining Share (stored: {ratioText(storedRemainingRatios)})</span>
            <div className="p-2 rounded-xl bg-[#EFF6FF] text-[#2563EB]">
              <FiLayers className="text-base" />
            </div>
          </div>
          <div className="text-3xl font-black text-[#0F172A] mt-2 truncate">
            ₹{totalRemainingShare.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-[#64748B] mt-1 font-medium">Partner / Operations Pool (as recorded)</div>
        </motion.div>

        <motion.div whileHover={{ y: -3 }} className="glass-panel p-5 rounded-2xl relative overflow-hidden min-w-0">
          <div className="flex items-center justify-between text-[#64748B] text-xs font-bold">
            <span>Calculated Net Profit</span>
            <div className="p-2 rounded-xl bg-[#EFF6FF] text-[#2563EB]">
              <FiTrendingUp className="text-base" />
            </div>
          </div>
          <div className="text-3xl font-black text-[#2563EB] mt-2 truncate">
            ₹{totalCalculatedProfit.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-[#64748B] mt-1 font-medium">Revenue minus Direct Investment</div>
        </motion.div>
      </div>

      {/* Interactive Calculators Workspace */}
      <div className="glass-panel rounded-2xl p-6 space-y-6">
        {/* Calculator Tabs */}
        <div className="tab-strip flex border-b border-[#E2E8F0] pb-3 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('30_70')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === '30_70'
                ? 'shimmer-button text-white shadow-xs'
                : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]'
            }`}
          >
            <FiPieChart />
            <span>30:70 Revenue Sharing Calculator</span>
          </button>

          <button
            onClick={() => setActiveTab('PROFIT')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'PROFIT'
                ? 'shimmer-button text-white shadow-xs'
                : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]'
            }`}
          >
            <FiTrendingUp />
            <span>Profit Sharing Calculator</span>
          </button>

          <button
            onClick={() => setActiveTab('ADDITIONAL')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'ADDITIONAL'
                ? 'shimmer-button text-white shadow-xs'
                : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]'
            }`}
          >
            <FiPercent />
            <span>Discount & Growth Calculators</span>
          </button>
        </div>

        {/* Tab 1: 30:70 Revenue Share Calculator */}
        {activeTab === '30_70' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-2">
                  Total Gross Revenue (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-[#2563EB] font-bold">₹</span>
                  <input
                    type="number"
                    value={revInput}
                    onChange={(e) => setRevInput(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl py-2.5 pl-8 pr-4 text-[#0F172A] font-bold text-lg focus:outline-none focus:border-[#2563EB] focus:bg-white"
                    placeholder="Enter revenue amount..."
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-[#0F172A]">
                    Company Share Ratio ({companySharePct}%)
                  </label>
                  <span className="text-xs text-[#2563EB] font-mono font-bold">
                    Remaining: {100 - companySharePct}%
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="95"
                  value={companySharePct}
                  onChange={(e) => setCompanySharePct(Number(e.target.value))}
                  className="w-full accent-[#2563EB] cursor-pointer"
                />
              </div>
            </div>

            {/* Split Visual Meter */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-[#64748B] font-bold">
                <span className="text-[#2563EB]">Company Share: {revResult.companyPercentage}%</span>
                <span className="text-[#64748B]">Remaining Partner Share: {revResult.remainingPercentage}%</span>
              </div>
              <div className="h-4 w-full bg-[#F8FAFC] rounded-full overflow-hidden flex shadow-inner border border-[#E2E8F0]">
                <motion.div
                  className="bg-gradient-to-r from-[#1D4ED8] to-[#2563EB] h-full"
                  animate={{ width: `${revResult.companyPercentage}%` }}
                  transition={{ duration: 0.4 }}
                />
                <motion.div
                  className="bg-[#CBD5E1] h-full"
                  animate={{ width: `${revResult.remainingPercentage}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
            </div>

            {/* Output Calculation Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE]">
                <div className="text-xs text-[#2563EB] font-bold uppercase tracking-wider">
                  Company Share ({revResult.companyPercentage}%)
                </div>
                <div className="text-3xl font-black text-[#0F172A] mt-2">
                  ₹{revResult.companyShare.toLocaleString('en-IN')}
                </div>
                <div className="text-xs text-[#64748B] mt-1">
                  Formula: ₹{revInput.toLocaleString()} × ({revResult.companyPercentage} ÷ 100)
                </div>
              </div>

              <div className="p-5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                <div className="text-xs text-[#64748B] font-bold uppercase tracking-wider">
                  Remaining Share ({revResult.remainingPercentage}%)
                </div>
                <div className="text-3xl font-black text-[#0F172A] mt-2">
                  ₹{revResult.remainingShare.toLocaleString('en-IN')}
                </div>
                <div className="text-xs text-[#64748B] mt-1">
                  Formula: ₹{revInput.toLocaleString()} − ₹{revResult.companyShare.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSaveRevCalculation}
                className="px-4 py-2.5 rounded-xl bg-[#F8FAFC] hover:bg-white text-[#0F172A] text-xs font-bold flex items-center gap-2 border border-[#E2E8F0] transition-all cursor-pointer shadow-xs"
              >
                <FiFileText className="text-[#2563EB]" />
                <span>Save Calculation to Audit Log</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* Tab 2: Profit Sharing Calculator */}
        {activeTab === 'PROFIT' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-2">
                  Total Direct Investment / Cost (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-[#2563EB] font-bold">₹</span>
                  <input
                    type="number"
                    value={profitInvInput}
                    onChange={(e) => setProfitInvInput(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl py-2 pl-7 pr-3 text-[#0F172A] text-xs font-bold focus:outline-none focus:border-[#2563EB] focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-2">
                  Total Revenue (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-[#2563EB] font-bold">₹</span>
                  <input
                    type="number"
                    value={profitRevInput}
                    onChange={(e) => setProfitRevInput(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl py-2 pl-7 pr-3 text-[#0F172A] text-xs font-bold focus:outline-none focus:border-[#2563EB] focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-2">
                  Company Profit Share % ({profitSharePct}%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={profitSharePct}
                  onChange={(e) => setProfitSharePct(Math.min(100, Math.max(0, Number(e.target.value))))}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl py-2 px-3 text-[#0F172A] text-xs font-bold focus:outline-none focus:border-[#2563EB] focus:bg-white"
                />
              </div>
            </div>

            {/* Profit Results */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div
                className={`p-5 rounded-xl border ${
                  profitResult.isProfitable
                    ? 'bg-[#EFF6FF] border-[#BFDBFE] text-[#1E40AF]'
                    : 'bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]'
                }`}
              >
                <div className="text-xs font-bold uppercase tracking-wider">
                  Calculated Net Profit
                </div>
                <div className="text-2xl font-black text-[#0F172A] mt-1">
                  ₹{profitResult.netProfit.toLocaleString('en-IN')}
                </div>
                <div className="text-xs mt-1 font-medium">
                  {profitResult.isProfitable ? 'Positive Net Margin' : 'Negative Margin / Loss'}
                </div>
              </div>

              <div className="p-5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                <div className="text-xs text-[#2563EB] font-bold uppercase tracking-wider">
                  Company Profit Share ({profitSharePct}%)
                </div>
                <div className="text-2xl font-black text-[#0F172A] mt-1">
                  ₹{profitResult.companyProfitShare.toLocaleString('en-IN')}
                </div>
                <div className="text-xs text-[#64748B] mt-1 font-medium">
                  Applied to Net Profit
                </div>
              </div>

              <div className="p-5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                <div className="text-xs text-[#64748B] font-bold uppercase tracking-wider">
                  Remaining Share ({100 - profitSharePct}%)
                </div>
                <div className="text-2xl font-black text-[#0F172A] mt-1">
                  ₹{profitResult.remainingProfitShare.toLocaleString('en-IN')}
                </div>
                <div className="text-xs text-[#64748B] mt-1 font-medium">
                  Residual Profit Balance
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSaveProfitCalculation}
                className="px-4 py-2.5 rounded-xl bg-[#F8FAFC] hover:bg-white text-[#0F172A] text-xs font-bold flex items-center gap-2 border border-[#E2E8F0] transition-all cursor-pointer shadow-xs"
              >
                <FiFileText className="text-[#2563EB]" />
                <span>Save Profit Split to Audit Log</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* Tab 3: Discount & Growth Calculators */}
        {activeTab === 'ADDITIONAL' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Discount Calculator */}
            <div className="p-5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-4">
              <div className="flex items-center gap-2 text-[#2563EB] font-bold text-sm">
                <FiPercent />
                <span>Discount & Net Pricing Calculator</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#64748B] font-semibold mb-1">Original Price (₹)</label>
                  <input
                    type="number"
                    value={discPrice}
                    onChange={(e) => setDiscPrice(Number(e.target.value))}
                    className="w-full bg-white border border-[#E2E8F0] rounded-lg p-2 text-xs text-[#0F172A] font-bold focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#64748B] font-semibold mb-1">Discount %</label>
                  <input
                    type="number"
                    value={discPct}
                    onChange={(e) => setDiscPct(Number(e.target.value))}
                    className="w-full bg-white border border-[#E2E8F0] rounded-lg p-2 text-xs text-[#0F172A] font-bold focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
              </div>
              <div className="p-3 bg-white rounded-lg border border-[#E2E8F0] flex justify-between items-center text-xs shadow-xs">
                <div>
                  <div className="text-[#64748B] font-medium">Discount Amount:</div>
                  <div className="text-[#2563EB] font-bold text-sm">
                    ₹{discResult.discountAmount.toLocaleString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[#64748B] font-medium">Final Realized Price:</div>
                  <div className="text-[#0F172A] font-bold text-sm">
                    ₹{discResult.finalPrice.toLocaleString()}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSaveDiscountCalculation}
                className="w-full px-4 py-2.5 rounded-xl bg-white hover:bg-[#EFF6FF] text-[#0F172A] text-xs font-bold flex items-center justify-center gap-2 border border-[#E2E8F0] transition-all cursor-pointer shadow-xs"
              >
                <FiFileText className="text-[#2563EB]" />
                <span>Save Discount to Audit Log</span>
              </button>
            </div>

            {/* Sales Growth Calculator */}
            <div className="p-5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-4">
              <div className="flex items-center gap-2 text-[#2563EB] font-bold text-sm">
                <FiTrendingUp />
                <span>Revenue Growth & Variance</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#64748B] font-semibold mb-1">Previous Month Revenue (₹)</label>
                  <input
                    type="number"
                    value={growthPrev}
                    onChange={(e) => setGrowthPrev(Number(e.target.value))}
                    className="w-full bg-white border border-[#E2E8F0] rounded-lg p-2 text-xs text-[#0F172A] font-bold focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#64748B] font-semibold mb-1">Current Month Revenue (₹)</label>
                  <input
                    type="number"
                    value={growthCurr}
                    onChange={(e) => setGrowthCurr(Number(e.target.value))}
                    className="w-full bg-white border border-[#E2E8F0] rounded-lg p-2 text-xs text-[#0F172A] font-bold focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
              </div>
              <div className="p-3 bg-white rounded-lg border border-[#E2E8F0] flex justify-between items-center text-xs shadow-xs">
                <div>
                  <div className="text-[#64748B] font-medium">Absolute Increase:</div>
                  <div className="text-[#0F172A] font-bold text-sm">
                    ₹{growthResult.difference.toLocaleString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[#64748B] font-medium">Growth Rate:</div>
                  <div
                    className={`font-bold text-sm ${
                      growthResult.growthPercentage >= 0 ? 'text-[#2563EB]' : 'text-[#DC2626]'
                    }`}
                  >
                    {growthResult.growthPercentage >= 0 ? '+' : ''}
                    {growthResult.growthPercentage}%
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSaveGrowthCalculation}
                className="w-full px-4 py-2.5 rounded-xl bg-white hover:bg-[#EFF6FF] text-[#0F172A] text-xs font-bold flex items-center justify-center gap-2 border border-[#E2E8F0] transition-all cursor-pointer shadow-xs"
              >
                <FiFileText className="text-[#2563EB]" />
                <span>Save Growth to Audit Log</span>
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Confirmed Financial Transactions Ledger */}
      <div className="glass-panel rounded-2xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[#0F172A] font-bold text-base">
            <FiCheckCircle className="text-[#2563EB]" />
            <span>Confirmed Financial Transactions Ledger (Lead Conversions)</span>
          </div>
          <span className="text-xs text-[#2563EB] font-medium bg-[#EFF6FF] px-2.5 py-1 rounded-full border border-[#BFDBFE]">
            Verified Converted Inflows
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-[#64748B] font-bold bg-[#F8FAFC]">
                <th className="py-3.5 px-3">Transaction ID</th>
                <th className="py-3.5 px-3">Candidate / Deal</th>
                <th className="py-3.5 px-3">BDE / Team</th>
                <th className="py-3.5 px-3">Gross Revenue</th>
                <th className="py-3.5 px-3">Net Profit</th>
                <th className="py-3.5 px-3">Company Share ({companySharePct}%)</th>
                <th className="py-3.5 px-3">Remaining Share</th>
                <th className="py-3.5 px-3">Confirmed Date</th>
                <th className="py-3.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="py-3.5 px-3 font-mono text-[#64748B]">{tx.id}</td>
                  <td className="py-3.5 px-3 font-bold text-[#0F172A]">{tx.candidateName}</td>
                  <td className="py-3.5 px-3 text-[#475569]">
                    <div className="font-semibold text-[#0F172A]">{tx.bdeName}</div>
                    <div className="text-[10px] text-[#64748B]">{tx.teamName}</div>
                  </td>
                  <td className="py-3.5 px-3 font-bold text-[#2563EB]">
                    ₹{tx.grossAmount.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-3 font-bold text-[#0F172A]">
                    ₹{tx.netProfit.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-3 font-bold text-[#2563EB]">
                    ₹{tx.companyShareAmount.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-3 font-bold text-[#64748B]">
                    ₹{tx.remainingShareAmount.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-3 text-[#64748B]">{tx.confirmedAt}</td>
                  <td className="py-3.5 px-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
                      {tx.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Financial Calculation History Table */}
      <div className="glass-panel rounded-2xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[#0F172A] font-bold text-base">
            <FiClock className="text-[#2563EB]" />
            <span>Calculation Audit Trail & Saved Projections</span>
          </div>
          <span className="text-xs text-[#64748B]">Stored history with actor & timestamps</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-[#64748B] font-bold bg-[#F8FAFC]">
                <th className="py-3 px-3">Timestamp</th>
                <th className="py-3 px-3">Calculation Type</th>
                <th className="py-3 px-3">Inputs</th>
                <th className="py-3 px-3">Outputs</th>
                <th className="py-3 px-3">Operator</th>
                <th className="py-3 px-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {calculationLogs.map((log) => (
                <tr key={log.id} className="hover:bg-[#F8FAFC] text-[#475569]">
                  <td className="py-2.5 px-3 text-[#64748B] font-mono">{log.createdAt}</td>
                  <td className="py-2.5 px-3 font-mono text-[#2563EB] font-bold">{log.calcType}</td>
                  <td className="py-2.5 px-3 text-[11px] font-mono text-[#475569]">
                    {JSON.stringify(log.inputValues)}
                  </td>
                  <td className="py-2.5 px-3 text-[11px] font-mono text-[#2563EB] font-bold">
                    {JSON.stringify(log.resultValues)}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-[#0F172A]">{log.calculatedByName}</td>
                  <td className="py-2.5 px-3 text-[#64748B]">{log.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Confirm Payment Transaction on Converted Lead */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-[#0F172A]/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="modal-panel bg-white w-full max-w-lg rounded-2xl p-6 border border-[#E2E8F0] shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                <FiDollarSign className="text-[#2563EB]" />
                <span>Confirm Payment for Converted Lead</span>
              </h3>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="text-[#64748B] hover:text-[#0F172A] text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmPayment} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#0F172A] font-bold mb-1">
                  Select Converted Candidate
                </label>
                <select
                  value={selectedLeadId}
                  onChange={(e) => setSelectedLeadId(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] text-xs font-semibold focus:outline-none focus:border-[#2563EB] focus:bg-white"
                >
                  {convertedLeads.map((lead) => (
                    <option key={lead.id} value={lead.id}>
                      {lead.candidateName} ({lead.phone}) - Closed by {lead.currentBdeName || 'BDE'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#0F172A] font-bold mb-1">Gross Payment (₹)</label>
                  <input
                    type="number"
                    value={txGrossAmount}
                    onChange={(e) => setTxGrossAmount(Number(e.target.value))}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] font-bold focus:outline-none focus:border-[#2563EB] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[#0F172A] font-bold mb-1">Investment / Direct Cost (₹)</label>
                  <input
                    type="number"
                    value={txInvestmentCost}
                    onChange={(e) => setTxInvestmentCost(Number(e.target.value))}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] font-bold focus:outline-none focus:border-[#2563EB] focus:bg-white"
                  />
                </div>
              </div>

              <div className="p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-1.5">
                <div className="flex justify-between text-[#64748B]">
                  <span>Net Profit:</span>
                  <span className="text-[#0F172A] font-bold">
                    ₹{(txGrossAmount - txInvestmentCost).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-[#64748B]">
                  <span>Company Share ({companySharePct}%):</span>
                  <span className="text-[#2563EB] font-bold">
                    ₹{((txGrossAmount * companySharePct) / 100).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-[#64748B]">
                  <span>Remaining Share ({100 - companySharePct}%):</span>
                  <span className="text-[#64748B] font-bold">
                    ₹{(txGrossAmount - (txGrossAmount * companySharePct) / 100).toLocaleString()}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[#0F172A] font-bold mb-1">Transaction Notes</label>
                <input
                  type="text"
                  value={txNotes}
                  onChange={(e) => setTxNotes(e.target.value)}
                  placeholder="e.g. UPI Ref / Bank wire confirmed"
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] focus:outline-none focus:border-[#2563EB] focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0] text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl shimmer-button text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  Confirm & Post Transaction
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default FinancialManagement;
