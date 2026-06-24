"use client";

import { TrackingShipmentData } from "@/types/delhivery";
import OrderDetailsExpanded, { OrderData, formatCurrency, getOrderTotal } from "./OrderDetailsExpanded";
import TrackingPanel from "./TrackingPanel";

interface RevenueOrderCardProps {
  order: OrderData;
  isOrderExpanded: boolean;
  isTrackingExpanded: boolean;
  trackingData: TrackingShipmentData[] | undefined;
  trackingLoading: boolean;
  trackingError: string;
  onToggleOrder: (e: React.MouseEvent) => void;
  onToggleTracking: (e: React.MouseEvent) => void;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getStatusLabel(status?: string): string {
  switch (status) {
    case "PENDING_SHIPPING":
      return "Pending";
    case "PARTIALLY_SHIPPED":
      return "Partial";
    case "SHIPPED":
      return "Scheduled";
    case "SELF_SHIPPED":
      return "Self-Shipped";
    default:
      return status || "—";
  }
}

export default function RevenueOrderCard({
  order,
  isOrderExpanded,
  isTrackingExpanded,
  trackingData,
  trackingLoading,
  trackingError,
  onToggleOrder,
  onToggleTracking,
}: RevenueOrderCardProps) {
  const isClickable = order.status === "SHIPPED" || order.status === "PARTIALLY_SHIPPED";

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
      <div
        className={`flex flex-col md:flex-row md:items-start justify-between gap-4 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg p-2 -m-2 ${
          isOrderExpanded ? "mb-4 pb-4 border-b border-dashed border-gray-200 dark:border-gray-700" : ""
        }`}
        onClick={onToggleOrder}
      >
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span
              className={`text-gray-400 text-xs transition-transform ${
                isOrderExpanded ? "rotate-90 text-indigo-500" : ""
              }`}
            >
              ▶
            </span>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Order
            </span>
          </div>
          <span className="font-mono text-base font-semibold text-gray-900 dark:text-white ml-5">
            {order.orderId}
          </span>
        </div>
        <div className="flex flex-row flex-wrap items-center gap-3">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            💰 {formatCurrency(getOrderTotal(order))}
          </span>
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
            🔮 {order.astrologerDetails?.astrologerName?.trim() || "-"}
          </span>
          {order.customerDetails?.customer_name && (
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
              👤 {order.customerDetails.customer_name}
            </span>
          )}
          <span className="text-sm text-gray-500">📅 {formatDate(order.createdAt)}</span>
          {order.paymentMode && (
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wide ${
                order.paymentMode === "COD"
                  ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                  : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              }`}
            >
              {order.paymentMode}
            </span>
          )}
          {order.status && (
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wide ${
                order.status === "SHIPPED" || order.status === "SELF_SHIPPED"
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : order.status === "PARTIALLY_SHIPPED"
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
              }`}
            >
              {getStatusLabel(order.status)}
            </span>
          )}

          <button
            type="button"
            onClick={(e) => {
              if (isClickable) onToggleTracking(e);
            }}
            disabled={!isClickable}
            className={`text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wide border flex items-center gap-1 transition-all ${
              isClickable
                ? "bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800/50 dark:hover:bg-indigo-900/50 cursor-pointer"
                : "bg-gray-50 text-gray-400 border-gray-200 dark:bg-gray-800/50 dark:text-gray-500 dark:border-gray-700/50 cursor-not-allowed"
            }`}
            title={
              !isClickable
                ? "Tracking not available for un-shipped or self-shipped orders"
                : "Track Order"
            }
          >
            📍 Track{isTrackingExpanded ? "ing..." : ""}
          </button>
        </div>
      </div>

      {isTrackingExpanded && (
        <div className="animate-fadeIn mt-2 mb-4 p-4 border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-xl relative">
          {trackingLoading && (
            <div className="text-sm text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></span>
              Fetching tracking details...
            </div>
          )}
          {trackingError && (
            <div className="text-sm text-red-500 dark:text-red-400">
              ⚠️ {trackingError}
            </div>
          )}
          {!trackingLoading && trackingData && trackingData.length > 0 && (
            <TrackingPanel shipments={trackingData} />
          )}
        </div>
      )}

      {isOrderExpanded && (
        <div className="animate-fadeIn mt-2 pl-2 border-l-2 border-indigo-100 dark:border-indigo-900/30">
          <OrderDetailsExpanded order={order} />
        </div>
      )}
    </div>
  );
}
