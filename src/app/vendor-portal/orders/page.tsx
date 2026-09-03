'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Package, Truck, CheckCircle2, Clock, Filter, LogOut, Search, X, Loader2, AlertCircle } from 'lucide-react';

interface VendorOrder {
  _id: string;
  orderId: string;
  zohoInvoiceId: string;
  customerDetails?: {
    customer_name?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  invoiceItems?: Array<{
    name: string;
    quantity: number;
    carat_size?: string;
  }>;
  status: string;
  createdAt: string;
  shipments?: Array<{
    deliveryPartner?: string;
    waybill?: string;
    selfShipmentProvider?: string;
  }>;
}

export default function VendorOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [vendorInfo, setVendorInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');

  // Ship modal state
  const [selectedOrder, setSelectedOrder] = useState<VendorOrder | null>(null);
  const [deliveryPartner, setDeliveryPartner] = useState('Delhivery');
  const [waybill, setWaybill] = useState('');
  const [selfShipmentProvider, setSelfShipmentProvider] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  useEffect(() => {
    fetchVendorProfile();
    fetchOrders();
  }, [filterStatus, dateFrom, dateTo]);

  const fetchVendorProfile = async () => {
    try {
      const res = await fetch('/api/vendor-auth/me');
      const data = await res.json();
      if (res.ok && data.success) {
        setVendorInfo(data.vendor);
      } else {
        router.push('/vendor-portal/login');
      }
    } catch {
      router.push('/vendor-portal/login');
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      let url = `/api/vendor/orders?status=${filterStatus}`;
      if (dateFrom) url += `&dateFrom=${dateFrom}`;
      if (dateTo) url += `&dateTo=${dateTo}`;

      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.success) {
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/vendor-auth/logout', { method: 'POST' });
    router.push('/vendor-portal/login');
  };

  const handleOpenShipModal = (order: VendorOrder) => {
    setSelectedOrder(order);
    const existingShipment = order.shipments?.[0];
    setDeliveryPartner(existingShipment?.deliveryPartner || 'Delhivery');
    setWaybill(existingShipment?.waybill || '');
    setSelfShipmentProvider(existingShipment?.selfShipmentProvider || '');
    setNotes('');
    setModalError('');
  };

  const handleConfirmShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    if (!deliveryPartner.trim()) {
      setModalError('Please select or enter the Delivery Partner / Courier.');
      return;
    }

    if (!waybill.trim()) {
      setModalError('Please enter the AWB / Tracking number.');
      return;
    }

    setSubmitting(true);
    setModalError('');

    try {
      const res = await fetch(`/api/vendor/orders/${selectedOrder._id}/ship`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deliveryPartner,
          waybill,
          selfShipmentProvider,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update shipment status');
      }

      // Close modal and refresh list
      setSelectedOrder(null);
      fetchOrders();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Error updating shipment');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      o.orderId.toLowerCase().includes(term) ||
      (o.customerDetails?.customer_name || '').toLowerCase().includes(term) ||
      (o.customerDetails?.phone || '').includes(term)
    );
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-12">
      {/* Top Header */}
      <header className="sticky top-0 z-20 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center">
            <Package className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="font-black text-sm text-white">{vendorInfo?.facilityName || 'Vendor Portal'}</h1>
            <p className="text-[11px] text-slate-400">Assigned Fulfillment Queue</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Logout</span>
        </button>
      </header>

      {/* Main Container */}
      <main className="max-w-xl mx-auto p-4 space-y-4">
        {/* Filter Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search Order ID or Customer..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {['ALL', 'PENDING_SHIPPING', 'SHIPPED', 'SELF_SHIPPED'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  filterStatus === st
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {st === 'ALL' ? 'All Orders' : st === 'PENDING_SHIPPING' ? 'Pending' : st}
              </button>
            ))}
          </div>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            <span className="text-xs font-medium">Loading assigned orders...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-500">
            <Package className="w-12 h-12 mx-auto mb-3 text-slate-700" />
            <p className="font-bold text-sm text-slate-400">No orders found</p>
            <p className="text-xs mt-1">Try adjusting your status or search filter.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order) => {
              const isShipped = ['SHIPPED', 'DTDC_SCHEDULED', 'SHADOWFAX_SCHEDULED', 'SELF_SHIPPED'].includes(order.status);
              const shipment = order.shipments?.[0];

              return (
                <div
                  key={order._id}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 space-y-3 transition shadow-lg"
                >
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                    <div>
                      <span className="text-xs font-black text-amber-400">#{order.orderId}</span>
                      <span className="text-[11px] text-slate-500 ml-2">
                        {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isShipped ? (
                        <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold rounded-lg flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Shipped</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-bold rounded-lg flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Pending</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Customer & Product Details */}
                  <div className="text-xs space-y-1">
                    <p className="font-bold text-white">{order.customerDetails?.customer_name || 'Customer'}</p>
                    <p className="text-slate-400 leading-relaxed">
                      {order.customerDetails?.address}, {order.customerDetails?.city} ({order.customerDetails?.pincode})
                    </p>
                  </div>

                  <div className="bg-slate-950 p-2.5 rounded-xl text-xs space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Items:</span>
                    {order.invoiceItems?.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between font-medium text-slate-300">
                        <span>{item.name}</span>
                        <span className="font-bold text-amber-400">x{item.quantity}</span>
                      </div>
                    ))}
                  </div>

                  {/* Shipping Details or Action Button */}
                  {isShipped && shipment?.waybill ? (
                    <div className="bg-slate-950/60 border border-slate-800 p-2.5 rounded-xl text-xs flex items-center justify-between text-slate-300">
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">Courier:</span>
                        <span className="font-bold text-white">{shipment.deliveryPartner}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">AWB / Waybill:</span>
                        <span className="font-mono font-bold text-amber-400">{shipment.waybill}</span>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleOpenShipModal(order)}
                      className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
                    >
                      <Truck className="w-4 h-4" />
                      <span>{isShipped ? 'Update AWB / Courier' : 'Mark as Shipped'}</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Ship Order Entry Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-black text-sm text-white">Report Shipment Status</h3>
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

            <form onSubmit={handleConfirmShipment} className="space-y-4">
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

              {deliveryPartner === 'SELF' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Self-Shipment Provider Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Local Auto / Porter / Staff Delivery"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white placeholder:text-slate-600 focus:ring-2 focus:ring-amber-500 outline-none"
                    value={selfShipmentProvider}
                    onChange={(e) => setSelfShipmentProvider(e.target.value)}
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional dispatch notes..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white placeholder:text-slate-600 focus:ring-2 focus:ring-amber-500 outline-none"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
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
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm & Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
