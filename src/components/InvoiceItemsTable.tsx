"use client";

interface InvoiceItemsTableProps {
  items: any[];
}

export default function InvoiceItemsTable({ items }: InvoiceItemsTableProps) {
  if (!items || items.length === 0) return null;

  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Order Items</h3>
      <div className="bg-white dark:bg-[#16161f] border border-gray-200 dark:border-[#2a2a38] rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 dark:bg-[#1c1c28] text-gray-600 dark:text-gray-400 text-xs uppercase font-semibold">
            <tr>
              <th className="px-4 py-3 border-b border-gray-200 dark:border-[#2a2a38]">Item</th>
              <th className="px-4 py-3 border-b border-gray-200 dark:border-[#2a2a38]">Qty</th>
              <th className="px-4 py-3 border-b border-gray-200 dark:border-[#2a2a38]">Rate</th>
              <th className="px-4 py-3 border-b border-gray-200 dark:border-[#2a2a38] text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-[#2a2a38]">
            {items.map((item, idx) => {
              const taxInclusiveTotal = (item.item_total || 0) + (item.tax_amount || 0);
              const taxInclusiveRate = item.final_price || (item.quantity ? taxInclusiveTotal / item.quantity : 0);
              return (
                <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-[#1c1c28]/50">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-200">{item.name || item.item_id || '—'}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{item.quantity ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">₹{taxInclusiveRate.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">₹{taxInclusiveTotal.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
