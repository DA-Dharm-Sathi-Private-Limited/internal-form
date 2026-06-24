"use client";

import { useState, useEffect, useCallback } from "react";
import { TrackingShipmentData } from "@/types/delhivery";
import { ordersService } from "@/services/orders";
import { delhiveryService } from "@/services/delhivery";
import { OrderData, formatCurrency } from "./OrderDetailsExpanded";
import RevenueDateFilter, { DateFilterType } from "./RevenueDateFilter";
import RevenueSummaryCards from "./RevenueSummaryCards";
import RevenueOrderCard from "./RevenueOrderCard";

interface SalespersonRevenue {
  salespersonName: string;
  totalRevenue: number;
  orderCount: number;
  orders: OrderData[];
}

const RANK_EMOJIS = ["🥇", "🥈", "🥉", "4️⃣"];

export default function TrackRevenue() {
  const [data, setData] = useState<SalespersonRevenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedPerson, setExpandedPerson] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilterType>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [expandedTracking, setExpandedTracking] = useState<Set<string>>(new Set());
  const [trackingDataMap, setTrackingDataMap] = useState<Record<string, TrackingShipmentData[]>>({});
  const [trackingLoading, setTrackingLoading] = useState<Record<string, boolean>>({});
  const [trackingError, setTrackingError] = useState<Record<string, string>>({});

  const fetchRevenue = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const today = new Date();
      today.setHours(23, 59, 59, 999);

      let params: Record<string, string | undefined> = {};
      if (dateFilter === "weekly") {
        const past = new Date(today);
        past.setDate(today.getDate() - today.getDay());
        past.setHours(0, 0, 0, 0);
        params = { startDate: past.toISOString(), endDate: today.toISOString() };
      } else if (dateFilter === "monthly") {
        const past = new Date(today.getFullYear(), today.getMonth(), 1);
        past.setHours(0, 0, 0, 0);
        params = { startDate: past.toISOString(), endDate: today.toISOString() };
      } else if (dateFilter === "custom") {
        if (startDate) params.startDate = new Date(startDate).toISOString();
        if (endDate) params.endDate = new Date(endDate).toISOString();
      }

      const json = await ordersService.getRevenue(params);
      if (json.success) {
        setData(json.data as unknown as SalespersonRevenue[]);
      } else {
        setError(json.error || "Failed to load revenue data");
      }
    } catch {
      setError("Network error – could not fetch revenue data");
    } finally {
      setLoading(false);
    }
  }, [dateFilter, startDate, endDate]);

  useEffect(() => {
    fetchRevenue();
  }, [fetchRevenue]);

  const maxRevenue = data.length > 0 ? data[0].totalRevenue : 1;
  const totalAllRevenue = data.reduce((s, d) => s + d.totalRevenue, 0);
  const totalAllOrders = data.reduce((s, d) => s + d.orderCount, 0);

  function toggleExpand(name: string) {
    setExpandedPerson((prev) => (prev === name ? null : name));
  }

  function toggleOrderExpand(orderId: string, e: React.MouseEvent) {
    e.stopPropagation();
    setExpandedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  }

  const fetchTrackingForOrder = async (order: OrderData) => {
    const orderSysId = order._id;
    setTrackingLoading((prev) => ({ ...prev, [orderSysId]: true }));
    setTrackingError((prev) => ({ ...prev, [orderSysId]: "" }));
    try {
      const waybills = new Set<string>();
      if (order.waybill) waybills.add(order.waybill);
      if (order.shipments && order.shipments.length > 0) {
        order.shipments.forEach((s) => {
          if (s.waybill) waybills.add(s.waybill);
        });
      }

      let trackParams: { waybill?: string; ref_ids?: string } = {};
      if (waybills.size > 0) {
        trackParams = { waybill: Array.from(waybills).join(",") };
      } else {
        const baseId = order.orderId.trim();
        trackParams = { ref_ids: `${baseId},${baseId}-pkg-1,${baseId}-pkg-2,${baseId}-pkg-3` };
      }

      const res = await delhiveryService.track(trackParams);

      if (res.Error) {
        if (
          typeof res.Error === "string" &&
          (res.Error.includes("No such waybill") ||
            res.Error.includes("Not Found") ||
            res.Error.includes("Order Id found"))
        ) {
          throw new Error("Shipment created, but not yet scanned by Delhivery.");
        }
        throw new Error(`Delhivery returned: ${res.Error}`);
      }

      if (res.ShipmentData && res.ShipmentData.length > 0) {
        setTrackingDataMap((prev) => ({
          ...prev,
          [orderSysId]: res.ShipmentData as TrackingShipmentData[],
        }));
      } else {
        throw new Error("No tracking info found for this order");
      }
    } catch (err) {
      setTrackingError((prev) => ({
        ...prev,
        [orderSysId]: err instanceof Error ? err.message : "Unknown error",
      }));
    } finally {
      setTrackingLoading((prev) => ({ ...prev, [orderSysId]: false }));
    }
  };

  function toggleTrackingExpand(order: OrderData, e: React.MouseEvent) {
    e.stopPropagation();
    const orderSysId = order._id;
    setExpandedTracking((prev) => {
      const next = new Set(prev);
      if (next.has(orderSysId)) {
        next.delete(orderSysId);
      } else {
        next.add(orderSysId);
        if (!trackingDataMap[orderSysId] && !trackingLoading[orderSysId]) {
          fetchTrackingForOrder(order);
        }
      }
      return next;
    });
  }

  return (
    <div className="max-w-4xl mx-auto w-full">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-indigo-600 dark:from-white dark:to-indigo-400 bg-clip-text text-transparent mb-2">
          💰 Track Revenue
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Revenue breakdown by salesperson — sorted highest to lowest
        </p>
      </div>

      <RevenueDateFilter
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
      />

      {!loading && !error && (
        <RevenueSummaryCards
          totalRevenue={totalAllRevenue}
          totalOrders={totalAllOrders}
          salespersonCount={data.length}
        />
      )}

      {loading && (
        <div className="flex flex-col gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden relative animate-pulse"
            />
          ))}
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-4 rounded-xl mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
          <button
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            onClick={fetchRevenue}
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && data.map((sp, idx) => {
        const isExpanded = expandedPerson === sp.salespersonName;
        const barWidth = maxRevenue > 0 ? (sp.totalRevenue / maxRevenue) * 100 : 0;

        return (
          <div
            key={sp.salespersonName}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl mb-4 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-all overflow-hidden"
          >
            <button
              className="w-full flex items-center p-5 text-left bg-transparent border-none cursor-pointer gap-4 focus:outline-none"
              onClick={() => toggleExpand(sp.salespersonName)}
            >
              <div className="text-2xl w-10 text-center font-bold text-gray-400">
                {RANK_EMOJIS[idx] || `#${idx + 1}`}
              </div>
              <div className="flex-1">
                <div className="text-lg font-bold text-gray-900 dark:text-white mb-0.5">
                  {sp.salespersonName}
                </div>
                <div className="text-sm text-gray-500">
                  {sp.orderCount} order{sp.orderCount !== 1 ? "s" : ""}
                </div>
              </div>
              <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mr-4">
                {formatCurrency(sp.totalRevenue)}
              </div>
              <div
                className={`text-xl text-gray-400 transition-transform duration-200 ${isExpanded ? "rotate-180 text-indigo-600 dark:text-indigo-400" : ""}`}
              >
                ▾
              </div>
            </button>

            <div className="h-1.5 bg-gray-100 dark:bg-gray-900 w-full relative">
              <div
                className="absolute top-0 left-0 h-full bg-indigo-500 rounded-r-md transition-all duration-1000 ease-out"
                style={{ width: `${barWidth}%` }}
              />
            </div>

            {isExpanded && (
              <div className="border-t border-gray-200 dark:border-gray-700 p-5 bg-gray-50 dark:bg-gray-900/50 flex flex-col gap-4">
                {sp.orders.length === 0 && (
                  <div className="text-center py-8 text-gray-500 italic">
                    No orders found for this salesperson.
                  </div>
                )}
                {sp.orders.map((order) => (
                  <RevenueOrderCard
                    key={order._id}
                    order={order}
                    isOrderExpanded={expandedOrders.has(order._id)}
                    isTrackingExpanded={expandedTracking.has(order._id)}
                    trackingData={trackingDataMap[order._id]}
                    trackingLoading={!!trackingLoading[order._id]}
                    trackingError={trackingError[order._id] || ""}
                    onToggleOrder={(e) => toggleOrderExpand(order._id, e)}
                    onToggleTracking={(e) => toggleTrackingExpand(order, e)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
