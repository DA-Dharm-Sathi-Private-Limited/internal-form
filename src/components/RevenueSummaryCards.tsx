"use client";

import { formatCurrency } from "./OrderDetailsExpanded";

interface RevenueSummaryCardsProps {
  totalRevenue: number;
  totalOrders: number;
  salespersonCount: number;
  dateFilterLabel?: string;
}

export default function RevenueSummaryCards({
  totalRevenue,
  totalOrders,
  salespersonCount,
  dateFilterLabel = "Selected",
}: RevenueSummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 border border-indigo-200 dark:border-indigo-800/50 rounded-2xl p-5 flex flex-col items-center justify-center shadow-sm">
        <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider mb-1">
          {dateFilterLabel} Revenue
        </span>
        <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
          {formatCurrency(totalRevenue)}
        </span>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 flex flex-col items-center justify-center shadow-sm">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
          {dateFilterLabel} Orders
        </span>
        <span className="text-2xl font-black text-gray-900 dark:text-white">
          {totalOrders}
        </span>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 flex flex-col items-center justify-center shadow-sm">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
          Active Team Members
        </span>
        <span className="text-2xl font-black text-gray-900 dark:text-white">
          {salespersonCount}
        </span>
      </div>
    </div>
  );
}
