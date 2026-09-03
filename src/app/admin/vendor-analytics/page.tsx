'use client';

import { useState, useEffect } from 'react';
import {
  BarChart3,
  Building2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Truck,
  Filter,
  Loader2,
} from 'lucide-react';

export default function VendorAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  // Filters
  const [selectedVendor, setSelectedVendor] = useState('ALL');
  const [selectedPartner, setSelectedPartner] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    fetchAnalytics();
  }, [selectedVendor, selectedPartner, selectedStatus, dateFrom, dateTo]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      let url = `/api/staff/analytics/all?vendor=${selectedVendor}&deliveryPartner=${selectedPartner}&status=${selectedStatus}`;
      if (dateFrom) url += `&dateFrom=${dateFrom}`;
      if (dateTo) url += `&dateTo=${dateTo}`;

      const res = await fetch(url);
      const json = await res.json();

      if (res.ok && json.success) {
        setData(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const summary = data?.summary || {
    totalAssigned: 0,
    totalShipped: 0,
    totalPending: 0,
    totalDelayed: 0,
    avgDispatchHours: 0,
    overallOnTimeRate: 100,
  };

  const vendorBreakdown = data?.vendorBreakdown || {};
  const partnerBreakdown = data?.partnerBreakdown || {};

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 space-y-6">
      {/* Top Header */}
      <div className="bg-slate-900 border border-slate-800 p-4 sm:p-6 rounded-2xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-amber-400" />
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Shipment & Vendor Analytics</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">Fulfillment speed, dispatch delays, and courier performance breakdown</p>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedVendor}
            onChange={(e) => setSelectedVendor(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs font-bold text-slate-300 rounded-xl py-2 px-3 focus:border-amber-500 outline-none"
          >
            <option value="ALL">All Vendors</option>
            {Object.keys(vendorBreakdown).map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>

          <select
            value={selectedPartner}
            onChange={(e) => setSelectedPartner(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs font-bold text-slate-300 rounded-xl py-2 px-3 focus:border-amber-500 outline-none"
          >
            <option value="ALL">All Couriers</option>
            <option value="Delhivery">Delhivery</option>
            <option value="DTDC">DTDC</option>
            <option value="Shadowfax">Shadowfax</option>
            <option value="SELF">Self-Shipped</option>
          </select>

          <input
            type="date"
            className="bg-slate-950 border border-slate-800 text-xs font-medium text-slate-300 rounded-xl py-2 px-3 focus:border-amber-500 outline-none"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />

          <input
            type="date"
            className="bg-slate-950 border border-slate-800 text-xs font-medium text-slate-300 rounded-xl py-2 px-3 focus:border-amber-500 outline-none"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
          <span className="text-xs font-medium">Calculating analytics metrics...</span>
        </div>
      ) : (
        <>
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Assigned Orders</span>
              <span className="text-2xl font-black text-white">{summary.totalAssigned}</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Shipped</span>
              <span className="text-2xl font-black text-emerald-400">{summary.totalShipped}</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Pending</span>
              <span className="text-2xl font-black text-amber-400">{summary.totalPending}</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Delayed (&gt;48h)</span>
              <span className="text-2xl font-black text-rose-400">{summary.totalDelayed}</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Avg Dispatch</span>
              <span className="text-2xl font-black text-indigo-400">{summary.avgDispatchHours}h</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">On-Time Rate</span>
              <span className="text-2xl font-black text-amber-400">{summary.overallOnTimeRate}%</span>
            </div>
          </div>

          {/* Vendors Performance Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl p-5 space-y-4">
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-amber-400" />
              <span>Per-Vendor Performance Metrics</span>
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3">Vendor Facility</th>
                    <th className="p-3 text-center">Assigned</th>
                    <th className="p-3 text-center">Shipped</th>
                    <th className="p-3 text-center">Pending</th>
                    <th className="p-3 text-center">Delayed (&gt;48h)</th>
                    <th className="p-3 text-center">Avg Dispatch Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {Object.keys(vendorBreakdown).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-500">
                        No vendor data available.
                      </td>
                    </tr>
                  ) : (
                    Object.entries(vendorBreakdown).map(([vName, vData]: [string, any]) => (
                      <tr key={vName} className="hover:bg-slate-800/40 transition">
                        <td className="p-3 font-bold text-white flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-slate-500" />
                          <span>{vName}</span>
                        </td>
                        <td className="p-3 text-center font-bold text-slate-300">{vData.assigned}</td>
                        <td className="p-3 text-center font-bold text-emerald-400">{vData.shipped}</td>
                        <td className="p-3 text-center font-bold text-amber-400">{vData.pending}</td>
                        <td className="p-3 text-center font-bold text-rose-400">{vData.delayed}</td>
                        <td className="p-3 text-center font-bold text-indigo-300">{vData.avgHours}h</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Delivery Partner Breakdown */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl p-5 space-y-4">
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <Truck className="w-5 h-5 text-amber-400" />
              <span>Delivery Partner Breakdown</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(partnerBreakdown).map(([pName, pData]: [string, any]) => (
                <div key={pName} className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white">{pName}</span>
                    <span className="text-xs font-mono font-bold text-amber-400">{pData.total} total</span>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1 text-slate-400 border-t border-slate-800/80">
                    <span>Shipped: <strong className="text-emerald-400">{pData.shipped}</strong></span>
                    <span>Pending: <strong className="text-amber-400">{pData.pending}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
