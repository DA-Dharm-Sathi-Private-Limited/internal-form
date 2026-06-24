"use client";

import { TrackingShipmentData } from "@/types/delhivery";

interface TrackingPanelProps {
  shipments: TrackingShipmentData[];
}

export default function TrackingPanel({ shipments }: TrackingPanelProps) {
  return (
    <div className="flex flex-col gap-6">
      {shipments.map((trackingData, tIdx) => (
        <div
          key={tIdx}
          className={
            tIdx > 0
              ? "pt-4 border-t border-indigo-200 dark:border-indigo-800/50"
              : ""
          }
        >
          <div className="flex justify-between items-center border-b border-indigo-100 dark:border-indigo-900/50 pb-3 mb-4">
            <div>
              <h4 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                {trackingData.Shipment.AWB}
                {shipments.length > 1 && (
                  <span className="text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 px-2 py-0.5 rounded-full font-medium shadow-sm">
                    Box {tIdx + 1} of {shipments.length}
                  </span>
                )}
              </h4>
              <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
                Expected Delivery:{" "}
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {trackingData.Shipment.ExpectedDeliveryDate
                    ? new Date(trackingData.Shipment.ExpectedDeliveryDate).toLocaleDateString()
                    : "—"}
                </span>
              </p>
            </div>
            <div className="px-2.5 py-1 bg-white dark:bg-[#16161f] border border-indigo-100 dark:border-indigo-800/50 text-indigo-700 dark:text-indigo-400 rounded-md text-xs font-bold tracking-wider shadow-sm">
              {(trackingData.Shipment.CurrentStatus || trackingData.Shipment.Status)?.Status || "UNKNOWN"}
            </div>
          </div>

          <div className="space-y-4 relative before:absolute before:inset-0 before:ml-[11px] before:-translate-x-preg before:h-full before:w-0.5 before:bg-indigo-200 dark:before:bg-indigo-900/50">
            {trackingData.Shipment.Scans?.map((scanItem: any, idx: number) => {
              const scan = "ScanDetail" in scanItem ? scanItem.ScanDetail : scanItem;
              return (
                <div key={idx} className="relative flex items-start gap-4">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/80 border-2 border-white dark:border-gray-800 flex items-center justify-center z-10 shrink-0 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                  </div>
                  <div className="bg-white dark:bg-[#16161f] border border-gray-100 dark:border-[#2a2a38] p-3 rounded-lg w-full shadow-sm">
                    <div className="flex flex-col sm:flex-row justify-between mb-1 gap-1">
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {scan.ScanType || scan.Scan || "-"}
                      </span>
                      <span className="text-xs font-medium text-gray-500">
                        {scan.ScanDateTime
                          ? new Date(scan.ScanDateTime).toLocaleString()
                          : "—"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                      {scan.Instructions || "-"}
                    </p>
                    {scan.ScannedLocation && (
                      <p className="text-[11px] font-medium text-indigo-500 mt-2 flex items-center gap-1">
                        📍 {scan.ScannedLocation}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
