"use client";

import { TrackingShipmentData } from '@/types/delhivery';
import InvoiceItemsTable from './InvoiceItemsTable';

interface TrackingResultCardProps {
  trackingData: TrackingShipmentData;
  dbOrders: any[];
  onBack: () => void;
}

function getStatusColor(statusType: string) {
  switch (statusType?.toUpperCase()) {
    case 'DELIVERED': return 'text-green-400 bg-green-400/10 border-green-500/20';
    case 'IN TRANSIT': return 'text-blue-400 bg-blue-400/10 border-blue-500/20';
    case 'RTO': return 'text-red-400 bg-red-400/10 border-red-500/20';
    case 'DISPATCHED': return 'text-yellow-400 bg-yellow-400/10 border-yellow-500/20';
    case 'PICKED UP': return 'text-cyan-400 bg-cyan-400/10 border-cyan-500/20';
    default: return 'text-gray-400 bg-gray-400/10 border-gray-500/20';
  }
}

export default function TrackingResultCard({
  trackingData,
  dbOrders,
  onBack,
}: TrackingResultCardProps) {
  const matchOrder = dbOrders.find(
    (o: any) => o.waybill === trackingData.Shipment.AWB || o.orderId === trackingData.Shipment.ReferenceNo
  );

  return (
    <div className="bg-white dark:bg-[#12121a] border border-gray-200 dark:border-[#2a2a38] rounded-xl p-6 shadow-xl dark:shadow-2xl animate-in fade-in slide-in-from-bottom-4 mb-12">
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 bg-white dark:bg-[#16161f] hover:text-accent dark:hover:text-accent hover:bg-gray-50 dark:hover:bg-[#1c1c28] border border-gray-200 dark:border-[#2a2a38] rounded-lg transition-all shadow-sm w-fit"
      >
        ← Back to Orders
      </button>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-200 dark:border-[#2a2a38] pb-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{trackingData.Shipment.AWB}</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
            Order ID: <span className="text-gray-700 dark:text-gray-300">{trackingData.Shipment.ReferenceNo}</span>
          </p>
        </div>
        <div className={`mt-4 md:mt-0 px-4 py-2 border rounded-full text-sm font-bold tracking-wider ${getStatusColor((trackingData.Shipment.CurrentStatus || trackingData.Shipment.Status)?.StatusType || '')}`}>
          {(trackingData.Shipment.CurrentStatus || trackingData.Shipment.Status)?.Status || 'UNKNOWN STATUS'}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gray-50 dark:bg-[#16161f] p-3 rounded-lg border border-gray-100 dark:border-transparent">
          <p className="text-gray-500 text-xs uppercase mb-1 font-semibold">Expected Delivery</p>
          <p className="text-gray-900 dark:text-white font-medium">
            {trackingData.Shipment.ExpectedDeliveryDate ? new Date(trackingData.Shipment.ExpectedDeliveryDate).toLocaleDateString() : '—'}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-[#16161f] p-3 rounded-lg border border-gray-100 dark:border-transparent">
          <p className="text-gray-500 text-xs uppercase mb-1 font-semibold">Consignee</p>
          <p className="text-gray-900 dark:text-white font-medium">{trackingData.Shipment.Consignee?.Name || '—'}</p>
        </div>
        <div className="bg-gray-50 dark:bg-[#16161f] p-3 rounded-lg border border-gray-100 dark:border-transparent">
          <p className="text-gray-500 text-xs uppercase mb-1 font-semibold">Destination</p>
          <p className="text-gray-900 dark:text-white font-medium">{trackingData.Shipment.Destination || '—'}</p>
        </div>
        <div className="bg-gray-50 dark:bg-[#16161f] p-3 rounded-lg border border-gray-100 dark:border-transparent">
          <p className="text-gray-500 text-xs uppercase mb-1 font-semibold">Amount to Collect</p>
          <p className="text-gray-900 dark:text-white font-bold text-lg text-accent">₹{trackingData.Shipment.InvoiceAmount || 0}</p>
        </div>
      </div>

      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Tracking History</h3>
      <div className="space-y-0 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-[#3a3a4a] before:to-transparent">
        {trackingData.Shipment.Scans?.map((scanItem: any, idx: number) => {
          const scan = 'ScanDetail' in scanItem ? scanItem.ScanDetail : scanItem;
          return (
            <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-[#12121a] bg-accent text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 ms-0 md:mx-auto">
                <span className="w-2 h-2 bg-white rounded-full"></span>
              </div>
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-[#16161f] border border-[#2a2a38] p-4 rounded-xl shadow ml-4 md:ml-0 md:group-odd:mr-4 md:group-even:ml-4">
                <div className="flex flex-col sm:flex-row justify-between items-start mb-1">
                  <h4 className="font-semibold text-white text-sm">{scan.ScanType || scan.Scan || '-'}</h4>
                  <span className="text-xs text-gray-400 whitespace-nowrap mt-1 sm:mt-0 font-mono">
                    {scan.ScanDateTime ? new Date(scan.ScanDateTime).toLocaleString() : '—'}
                  </span>
                </div>
                <p className="text-sm text-gray-400">{scan.Instructions || '-'}</p>
                {scan.ScannedLocation && <p className="text-xs text-accent mt-2">📍 {scan.ScannedLocation}</p>}
              </div>
            </div>
          );
        })}
      </div>

      {matchOrder?.invoiceItems && <InvoiceItemsTable items={matchOrder.invoiceItems} />}
    </div>
  );
}
