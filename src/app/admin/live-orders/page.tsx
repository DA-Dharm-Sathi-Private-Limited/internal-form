'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  Filter,
  AlertCircle,
  X,
  Loader2,
  Calendar,
  Building2,
  CheckSquare,
  Square,
  AlertTriangle,
} from 'lucide-react';

interface LiveOrder {
  id: string;
  orderId: string;
  zohoInvoiceId: string;
  customerName: string;
  phone: string;
  address: string;
  product: string;
  quantity: number;
  vendor: string;
  vendorAccountStatus: 'active' | 'deactivated';
  deliveryPartner: string;
  waybill: string;
  status: string;
  invoiceTotal: number;
  createdAt: string;
  updatedAt: string;
}

export default function StaffLiveOrdersPage() {
  const [orders, setOrders] = useState<LiveOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [pollError, setPollError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [secondsAgo, setSecondsAgo] = useState(0);

  // Filters
  const [vendorFilter, setVendorFilter] = useState('ALL');
  const [partnerFilter, setPartnerFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');

  // Tick-shipped modal
  const [selectedOrder, setSelectedOrder] = useState<LiveOrder | null>(null);
  const [deliveryPartner, setDeliveryPartner] = useState('Delhivery');
  const [waybill, setWaybill] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  const fetchRef = useRef<() => void>(() => {});

  const fetchLiveOrders = async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      let url = `/api/staff/orders/live?vendor=${vendorFilter}&deliveryPartner=${partnerFilter}&status=${statusFilter}`;
      if (dateFrom) url += `&dateFrom=${dateFrom}`;
      if (dateTo) url += `&dateTo=${dateTo}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch live orders');
      }

      setOrders(data.orders || []);
      setLastUpdated(new Date());
      setPollError('');
    } catch (err) {
      setPollError(err instanceof Error ? err.message : 'Error syncing dashboard');
    } finally {
      setLoading(false);
    }
  };

  fetchRef.current = () => fetchLiveOrders(false);

  // Auto-polling interval (every 12s) and window focus re-fetch
  useEffect(() => {
    fetchLiveOrders(true);

    const pollInterval = setInterval(() => {
      if (fetchRef.current) fetchRef.current();
    }, 12000);

    const handleFocus = () => {
      if (fetchRef.current) fetchRef.current();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [vendorFilter, partnerFilter, statusFilter, dateFrom, dateTo, search]);

  // Timer updating "Last updated Xs ago"
  useEffect(() => {
    const timer = setInterval(() => {
      if (lastUpdated) {
        setSecondsAgo(Math.floor((new Date().getTime() - lastUpdated.getTime()) / 1000));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [lastUpdated]);

  const handleCheckboxClick = (order: LiveOrder) => {
    const isShipped = ['SHIPPED', 'DTDC_SCHEDULED', 'SHADOWFAX_SCHEDULED', 'SELF_SHIPPED'].includes(order.status);
    if (isShipped) return; // Already shipped

    // Open modal to ensure courier & AWB are present
    setSelectedOrder(order);
    setDeliveryPartner(order.deliveryPartner || 'Delhivery');
    setWaybill(order.waybill || '');
    setModalError('');
  };

  const handleConfirmTickShipped = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    if (!deliveryPartner.trim()) {
      setModalError('Courier / Delivery Partner is required.');
      return;
    }

    if (!waybill.trim()) {
      setModalError('AWB / Waybill number is required.');
      return;
    }

    setSubmitting(true);
    setModalError('');

    try {
      const res = await fetch(`/api/staff/orders/${selectedOrder.id}/tick-shipped`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deliveryPartner,
          waybill,
          vendorFacility: selectedOrder.vendor,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update shipment status');
      }

      setSelectedOrder(null);
      fetchLiveOrders(false);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Error updating order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 space-y-6">
      {/* Header & Polling Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 sm:p-6 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Staff Live Orders</h1>
            <span className="px-2.5 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold rounded-full">
              Live Real-Time
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Vendor fulfillment tracking & one-click shipment reporting</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5 justify-end">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Auto-polling (12s)</span>
            </div>
            <span className="text-[11px] text-slate-500 block">
              {lastUpdated ? `Last updated ${secondsAgo}s ago` : 'Syncing...'}
            </span>
          </div>

          <button
            onClick={() => fetchLiveOrders(true)}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition cursor-pointer"
            title="Refresh Now"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {pollError && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-3 text-rose-300 text-sm font-medium">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>Polling Error: {pollError}. Retrying automatically...</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search Order ID, Customer, Phone, or AWB..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs font-bold text-slate-300 rounded-xl py-2 px-3 focus:border-amber-500 outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING_SHIPPING">Pending Shipping</option>
            <option value="SHIPPED">Shipped</option>
            <option value="SELF_SHIPPED">Self Shipped</option>
            <option value="DTDC_SCHEDULED">DTDC Scheduled</option>
            <option value="SHADOWFAX_SCHEDULED">Shadowfax Scheduled</option>
          </select>

          <select
            value={partnerFilter}
            onChange={(e) => setPartnerFilter(e.target.value)}
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

      {/* Orders Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-4 text-center">Shipped</th>
                <th className="p-4">Order ID</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Product</th>
                <th className="p-4">Assigned Vendor</th>
                <th className="p-4">Delivery Partner</th>
                <th className="p-4">AWB / Waybill</th>
                <th className="p-4">Date</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-400" />
                    <span>Loading live order status data...</span>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500">
                    No matching orders found.
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const isShipped = ['SHIPPED', 'DTDC_SCHEDULED', 'SHADOWFAX_SCHEDULED', 'SELF_SHIPPED'].includes(order.status);

                  return (
                    <tr key={order.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleCheckboxClick(order)}
                          className={`p-1 rounded-md transition cursor-pointer ${
                            isShipped
                              ? 'text-emerald-400 hover:text-emerald-300'
                              : 'text-slate-600 hover:text-amber-400'
                          }`}
                          title={isShipped ? 'Already Shipped' : 'Tick to Mark Shipped'}
                        >
                          {isShipped ? (
                            <CheckSquare className="w-5 h-5 fill-emerald-500/20" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )}
                        </button>
                      </td>
                      <td className="p-4 font-mono font-bold text-amber-400">{order.orderId}</td>
                      <td className="p-4">
                        <div className="font-bold text-white">{order.customerName}</div>
                        <div className="text-[11px] text-slate-500">{order.phone}</div>
                      </td>
                      <td className="p-4 font-medium text-slate-200">
                        {order.product} (x{order.quantity})
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-slate-200 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-500" />
                          <span>{order.vendor}</span>
                        </div>
                        {order.vendorAccountStatus === 'deactivated' && (
                          <span className="text-[10px] text-rose-400 font-bold block mt-0.5">
                            Account Deactivated
                          </span>
                        )}
                      </td>
                      <td className="p-4 font-bold text-slate-300">{order.deliveryPartner}</td>
                      <td className="p-4 font-mono font-bold text-slate-200">
                        {order.waybill ? order.waybill : <span className="text-slate-600 italic">Missing AWB</span>}
                      </td>
                      <td className="p-4 text-slate-400">
                        {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </td>
                      <td className="p-4">
                        {isShipped ? (
                          <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold rounded-lg inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Shipped</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-bold rounded-lg inline-flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Pending</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tick-Shipped Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-black text-sm text-white">Staff Shipment Override</h3>
                <p className="text-xs text-slate-400">Order #{selectedOrder.orderId}</p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmTickShipped} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Delivery Partner / Courier *
                </label>
                <select
                  value={deliveryPartner}
                  onChange={(e) => setDeliveryPartner(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white font-bold focus:ring-2 focus:ring-amber-500 outline-none"
                  required
                >
                  <option value="Delhivery">Delhivery</option>
                  <option value="DTDC">DTDC</option>
                  <option value="Shadowfax">Shadowfax</option>
                  <option value="Bluedart">Blue Dart</option>
                  <option value="India Post">India Post</option>
                  <option value="SELF">Self-Shipped / Local</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  AWB / Tracking Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 44324210014615"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs font-mono font-bold text-amber-400 placeholder:text-slate-600 focus:ring-2 focus:ring-amber-500 outline-none"
                  value={waybill}
                  onChange={(e) => setWaybill(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm & Mark Shipped'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
