import { PlannedShipment } from './types';
import { Input } from '@/components/ui/Input';

interface InvoiceItem {
  name: string;
  quantity: number;
  final_price?: number;
  item_total?: number;
  tax_amount?: number;
  description?: string;
}

interface Props {
  items: InvoiceItem[];
  shipment: PlannedShipment;
  onChangeQty: (shipmentId: string, lineIndex: number, quantity: number) => void;
  getAllocatedQty: (lineIndex: number) => number;
}

export function ItemAllocationTable({ items, shipment, onChangeQty, getAllocatedQty }: Props) {
  const perUnitTotal = (it: InvoiceItem) =>
    it.final_price ?? (((it.item_total || 0) + (it.tax_amount || 0)) / (it.quantity || 1));

  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase border-b border-gray-200 dark:border-[#2a2a38]">
          <tr>
            <th className="px-2 py-2 font-semibold">Item</th>
            <th className="px-2 py-2 font-semibold text-center">Price</th>
            <th className="px-2 py-2 font-semibold text-center">Order Qty</th>
            <th className="px-2 py-2 font-semibold text-center">Shipment Qty</th>
            <th className="px-2 py-2 font-semibold text-center">Shipment Total</th>
            <th className="px-2 py-2 font-semibold text-center">Remaining</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-[#2a2a38]">
          {items.map((it, lineIndex) => {
            const thisQty = shipment.items.find((x) => x.lineIndex === lineIndex)?.quantity || 0;
            const allocated = getAllocatedQty(lineIndex);
            const remaining = Math.max(0, it.quantity - allocated + thisQty);
            const ppu = perUnitTotal(it);
            return (
              <tr key={lineIndex} className="text-gray-700 dark:text-gray-300">
                <td className="px-2 py-2.5 font-medium">{it.name}</td>
                <td className="px-2 py-2.5 text-center">₹{ppu.toFixed(2)}</td>
                <td className="px-2 py-2.5 text-center">{it.quantity}</td>
                <td className="px-2 py-2.5 text-center">
                  <input
                    type="number"
                    className="form-input w-24 text-center py-1 mx-auto block"
                    min={0}
                    max={remaining}
                    value={thisQty}
                    onChange={(e) => {
                      const next = Math.max(0, Math.min(remaining, Number(e.target.value) || 0));
                      onChangeQty(shipment.id, lineIndex, next);
                    }}
                  />
                </td>
                <td className="px-2 py-2.5 text-center font-medium text-emerald-600 dark:text-emerald-400">
                  ₹{(ppu * thisQty).toFixed(2)}
                </td>
                <td className="px-2 py-2.5 text-center text-xs text-gray-500 dark:text-gray-400">
                  {remaining - thisQty}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-gray-50 dark:bg-[#1c1c28] border-t border-gray-200 dark:border-[#2a2a38] font-semibold text-gray-900 dark:text-gray-100">
            <td colSpan={4} className="px-2 py-3 text-right">Shipment Total Value:</td>
            <td className="px-2 py-3 text-center text-emerald-600 dark:text-emerald-400">
              ₹{items.reduce((acc, it, i) => {
                const q = shipment.items.find((x) => x.lineIndex === i)?.quantity || 0;
                return acc + perUnitTotal(it) * q;
              }, 0).toFixed(2)}
            </td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
