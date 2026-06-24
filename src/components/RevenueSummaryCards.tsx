"use client";

import { formatCurrency } from "./OrderDetailsExpanded";

interface RevenueSummaryCardsProps {
  totalRevenue: number;
  totalOrders: number;
  salespersonCount: number;
}

export default function RevenueSummaryCards({
  totalRevenue,
  totalOrders,
  salespersonCount,
}: RevenueSummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 flex flex-col items-center justify-center shadow-sm">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
          Total Revenue
        </span>
        <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
          {formatCurrency(totalRevenue)}
        </span>
      </div>
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 flex flex-col items-center justify-center shadow-sm">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
          Total Orders
        </span>
        <span className="text-2xl font-bold text-gray-900 dark:text-white">
          {totalOrders}
        </span>
      </div>
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 flex flex-col items-center justify-center shadow-sm">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
          Salespersons
        </span>
        <span className="text-2xl font-bold text-gray-900 dark:text-white">
          {salespersonCount}
        </span>
      </div>
    </div>
  );
}
