"use client";

import { DELHIIVERY_WAREHOUSES } from '@/config/warehouses';

interface TrackingFilterPanelProps {
  dateFrom: string;
  setDateFrom: (d: string) => void;
  warehouseFilter: string;
  setWarehouseFilter: (w: string) => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  onFetch: () => void;
  loading: boolean;
}

export default function TrackingFilterPanel({
  dateFrom,
  setDateFrom,
  warehouseFilter,
  setWarehouseFilter,
  statusFilter,
  setStatusFilter,
  onFetch,
  loading,
}: TrackingFilterPanelProps) {
  return (
    <div className="max-w-xl mx-auto mb-10 p-4 bg-white dark:bg-[#12121a] border border-gray-200 dark:border-[#2a2a38] rounded-xl shadow-sm flex flex-col sm:flex-row flex-wrap gap-4 items-end justify-between">
      <div className="flex-1 w-full sm:min-w-[150px]">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Select Start Date</label>
        <input
          type="date"
          className="form-input w-full p-2 text-sm bg-gray-50 dark:bg-[#16161f] text-gray-900 dark:text-white border border-gray-300 dark:border-[#2a2a38] rounded-lg focus:ring-accent focus:border-accent transition-colors"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
        />
      </div>
      <div className="flex-1 w-full sm:min-w-[150px]">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Warehouse</label>
        <select
          className="form-input w-full p-2 text-sm bg-gray-50 dark:bg-[#16161f] text-gray-900 dark:text-white border border-gray-300 dark:border-[#2a2a38] rounded-lg focus:ring-accent focus:border-accent transition-colors"
          value={warehouseFilter}
          onChange={(e) => setWarehouseFilter(e.target.value)}
        >
          <option value="">All Warehouses</option>
          {DELHIIVERY_WAREHOUSES.map((w: string) => (
            <option key={w} value={w}>{w}</option>
          ))}
        </select>
      </div>
      <div className="flex-1 w-full sm:min-w-[150px]">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Status</label>
        <select
          className="form-input w-full p-2 text-sm bg-gray-50 dark:bg-[#16161f] text-gray-900 dark:text-white border border-gray-300 dark:border-[#2a2a38] rounded-lg focus:ring-accent focus:border-accent transition-colors"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="MANIFESTED">Manifested</option>
          <option value="IN TRANSIT">In Transit</option>
          <option value="PENDING">Pending</option>
          <option value="DISPATCHED">Dispatched</option>
          <option value="PICKED UP">Picked Up</option>
          <option value="OUT FOR DELIVERY">Out for Delivery</option>
          <option value="DELIVERED">Delivered</option>
          <option value="RTO">RTO</option>
          <option value="ORDER CREATED">Self: Order Created</option>
          <option value="ORDER SHIPPED">Self: Order shipped</option>
          <option value="ORDER COMPLETED">Self: Order Completed</option>
        </select>
      </div>
      <button
        onClick={onFetch}
        disabled={loading}
        className="btn w-full sm:w-auto btn-primary py-2 px-6 whitespace-nowrap"
      >
        {loading ? 'Fetching...' : 'Fetch Orders'}
      </button>
    </div>
  );
}
