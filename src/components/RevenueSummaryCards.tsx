"use client";

import { formatCurrency } from "./OrderDetailsExpanded";

interface RevenueSummaryCardsProps {
  totalRevenue: number;
  totalOrders: number;
  salespersonCount: number;
  summary?: {
    totalDaily: number;
    totalWeekly: number;
    totalMonthly: number;
    totalYearly: number;
    totalLifetime: number;
    totalOrderCount: number;
  };
}

export default function RevenueSummaryCards({
  totalRevenue,
  totalOrders,
  salespersonCount,
  summary,
}: RevenueSummaryCardsProps) {
  return (
    <div className="flex flex-col gap-4 mb-8">
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex flex-col items-center justify-center shadow-sm">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
              ☀️ Today
            </span>
            <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
              {formatCurrency(summary.totalDaily)}
            </span>
          </div>

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex flex-col items-center justify-center shadow-sm">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
              📅 This Week
            </span>
            <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
              {formatCurrency(summary.totalWeekly)}
            </span>
          </div>

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex flex-col items-center justify-center shadow-sm">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
              📆 This Month
            </span>
            <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
              {formatCurrency(summary.totalMonthly)}
            </span>
          </div>

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex flex-col items-center justify-center shadow-sm">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
              👑 Lifetime
            </span>
            <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
              {formatCurrency(summary.totalLifetime)}
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/50 rounded-xl p-4 flex flex-col items-center justify-center shadow-sm">
          <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider mb-0.5">
            Selected Revenue
          </span>
          <span className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400">
            {formatCurrency(totalRevenue)}
          </span>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex flex-col items-center justify-center shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-0.5">
            Filtered Orders
          </span>
          <span className="text-xl font-bold text-gray-900 dark:text-white">
            {totalOrders}
          </span>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex flex-col items-center justify-center shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-0.5">
            Active Team
          </span>
          <span className="text-xl font-bold text-gray-900 dark:text-white">
            {salespersonCount}
          </span>
        </div>
      </div>
    </div>
  );
}
