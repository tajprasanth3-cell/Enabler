/**
 * LeadFlow Calculation Engine
 * Pure mathematical functions for conversions, revenue splits, and profit sharing.
 */

/**
 * Calculates conversion percentage: (conversions / total) * 100
 */
export function calculateConversionRate(conversions: number, totalAssigned: number): number {
  if (!totalAssigned || totalAssigned <= 0) return 0;
  return Number(((conversions / totalAssigned) * 100).toFixed(2));
}

/**
 * 30:70 (or configurable ratio) Revenue Sharing Calculator
 */
export function calculateRevenueShare(
  totalRevenue: number,
  companyPercentage: number = 30
): {
  companyShare: number;
  remainingShare: number;
  companyPercentage: number;
  remainingPercentage: number;
} {
  const compPct = Math.max(0, Math.min(100, companyPercentage));
  const remPct = 100 - compPct;
  const companyShare = Number(((totalRevenue * compPct) / 100).toFixed(2));
  const remainingShare = Number((totalRevenue - companyShare).toFixed(2));

  return {
    companyShare,
    remainingShare,
    companyPercentage: compPct,
    remainingPercentage: remPct,
  };
}

/**
 * Profit Sharing Calculator: Net Profit = Revenue - Investment
 * Applies configured split to the positive net profit.
 */
export function calculateProfitShare(
  investment: number,
  revenue: number,
  companyProfitPercentage: number = 30
): {
  netProfit: number;
  companyProfitShare: number;
  remainingProfitShare: number;
  isProfitable: boolean;
} {
  const netProfit = Number((revenue - investment).toFixed(2));
  const isProfitable = netProfit > 0;

  if (!isProfitable) {
    return {
      netProfit,
      companyProfitShare: 0,
      remainingProfitShare: 0,
      isProfitable: false,
    };
  }

  const compPct = Math.max(0, Math.min(100, companyProfitPercentage));
  const companyProfitShare = Number(((netProfit * compPct) / 100).toFixed(2));
  const remainingProfitShare = Number((netProfit - companyProfitShare).toFixed(2));

  return {
    netProfit,
    companyProfitShare,
    remainingProfitShare,
    isProfitable: true,
  };
}

/**
 * Custom Percentage Calculator
 */
export function calculateCustomPercentage(
  baseValue: number,
  percentage: number
): { calculatedAmount: number; remainderAmount: number } {
  const calculatedAmount = Number(((baseValue * percentage) / 100).toFixed(2));
  const remainderAmount = Number((baseValue - calculatedAmount).toFixed(2));
  return { calculatedAmount, remainderAmount };
}

/**
 * Discount and Final Price Calculator
 */
export function calculateDiscount(
  originalPrice: number,
  discountPercentage: number
): { discountAmount: number; finalPrice: number } {
  const discountAmount = Number(((originalPrice * discountPercentage) / 100).toFixed(2));
  const finalPrice = Number((originalPrice - discountAmount).toFixed(2));
  return { discountAmount, finalPrice };
}

/**
 * Percentage Growth / Change Calculator
 */
export function calculateGrowth(
  previousValue: number,
  currentValue: number
): { growthPercentage: number; difference: number } {
  const difference = Number((currentValue - previousValue).toFixed(2));
  if (previousValue === 0) {
    return { growthPercentage: currentValue > 0 ? 100 : 0, difference };
  }
  const growthPercentage = Number(((difference / Math.abs(previousValue)) * 100).toFixed(2));
  return { growthPercentage, difference };
}

/**
 * Parses a clock value (HH:MM, HH:MM AM/PM, or an ISO timestamp) to local minutes since midnight.
 */
export function parseClockToMinutes(value?: string | null): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed.includes('T')) {
    const date = new Date(trimmed);
    if (Number.isNaN(date.getTime())) return null;
    return date.getHours() * 60 + date.getMinutes();
  }
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();
  if (meridiem) {
    if (hours === 12) hours = 0;
    if (meridiem === 'PM') hours += 12;
  }
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/**
 * Formats a stored clock/ISO value as a 24-hour HH:MM string for display.
 */
export function formatClock(value?: string | null): string | null {
  if (!value) return null;
  const isoMatch = value.trim().match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
  if (isoMatch) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }
  const minutes = parseClockToMinutes(value);
  if (minutes === null) return null;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

/**
 * Converts an ISO timestamp to the local value used by <input type="datetime-local">.
 */
export function toDateTimeLocalValue(iso: string): string {
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

/**
 * Validates that a datetime-local string exists and is in the future.
 */
export function isFutureDateTime(value: string): boolean {
  if (!value) return false;
  const timestamp = new Date(value).getTime();
  return !Number.isNaN(timestamp) && timestamp > Date.now();
}

/**
 * Currency Formatter (INR Currency Format)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}
