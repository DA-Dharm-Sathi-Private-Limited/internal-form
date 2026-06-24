"use client";

import InvoiceItemsTable from './InvoiceItemsTable';

interface SelfShippedOrderCardProps {
  orderId: string | null | undefined;
  selfShipStatus: string;
  selfShipNotes: string;
  onStatusChange: (s: string) => void;
  onNotesChange: (n: string) => void;
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
  invoiceItems: any[];
}

export default function SelfShippedOrderCard({
  orderId,
  selfShipStatus,
  selfShipNotes,
  onStatusChange,
  onNotesChange,
  onSave,
  onClose,
  saving,
  invoiceItems,
}: SelfShippedOrderCardProps) {
  return (
    <div className="bg-white dark:bg-[#12121a] border border-gray-200 dark:border-[#2a2a38] rounded-xl p-6 shadow-xl dark:shadow-2xl animate-in fade-in slide-in-from-bottom-4 mb-12">
      <button
        onClick={onClose}
        className="mb-4 flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 bg-white dark:bg-[#16161f] hover:text-accent dark:hover:text-accent hover:bg-gray-50 dark:hover:bg-[#1c1c28] border border-gray-200 dark:border-[#2a2a38] rounded-lg transition-all shadow-sm w-fit"
      >
        ← Back to Orders
      </button>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-200 dark:border-[#2a2a38] pb-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Self-Shipped Order</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
            Order ID: <span className="text-gray-700 dark:text-gray-300">{orderId}</span>
          </p>
        </div>
        <div className="mt-4 md:mt-0 px-4 py-2 border rounded-full text-sm font-bold tracking-wider text-purple-600 bg-purple-100 border-purple-200 dark:text-purple-400 dark:bg-purple-900/20 dark:border-purple-800">
          {selfShipStatus || 'Order Created'}
        </div>
      </div>

      <div className="mb-8">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Order Status</label>
        <select
          className="form-input w-full md:w-1/2 p-3 text-sm bg-white dark:bg-[#16161f] text-gray-900 dark:text-white border border-gray-300 dark:border-[#2a2a38] rounded-lg focus:ring-accent focus:border-accent transition-colors"
          value={selfShipStatus}
          onChange={(e) => onStatusChange(e.target.value)}
        >
          <option value="Order Created">Order Created</option>
          <option value="Order shipped">Order shipped</option>
          <option value="Order Completed">Order Completed</option>
        </select>
      </div>

      <div className="mb-8">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Additional Notes</label>
        <textarea
          className="form-input w-full p-3 text-sm bg-white dark:bg-[#16161f] text-gray-900 dark:text-white border border-gray-300 dark:border-[#2a2a38] rounded-lg focus:ring-accent focus:border-accent transition-colors"
          rows={4}
          maxLength={500}
          placeholder="Add tracking notes for self-shipped or pooja orders here..."
          value={selfShipNotes}
          onChange={(e) => onNotesChange(e.target.value)}
        />
        <div className="text-right text-xs text-gray-400 mt-1">{selfShipNotes.length}/500 chars</div>
      </div>

      <div className="flex justify-end border-t border-gray-200 dark:border-[#2a2a38] pt-6 gap-3">
        <button
          className="btn bg-gray-200 hover:bg-gray-300 dark:bg-[#2a2a38] dark:hover:bg-[#3a3a4a] text-gray-800 dark:text-white py-2 px-6 rounded-lg font-medium transition-colors"
          onClick={onClose}
          disabled={saving}
        >
          Close
        </button>
        <button
          className="btn btn-primary py-2 px-6 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 min-w-[140px]"
          onClick={onSave}
          disabled={saving}
        >
          {saving ? <span className="w-5 h-5 flex-shrink-0 border-2 border-white border-t-transparent rounded-full animate-spin"></span> : 'Save Details'}
        </button>
      </div>

      <InvoiceItemsTable items={invoiceItems} />
    </div>
  );
}
