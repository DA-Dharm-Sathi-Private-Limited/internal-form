'use client';

interface DiscountEditorProps {
  discount: string;
  discountFormatType: 'percentage' | 'fixed';
  appliedDiscountAmount: number;
  onDiscountChange: (value: string) => void;
  onFormatTypeChange: (type: 'percentage' | 'fixed') => void;
}

/**
 * Shared discount editor widget with ₹/% toggle, numeric input,
 * and resolved-amount indicator.  Used by both the create-order
 * Items step and the edit-invoice page.
 */
export default function DiscountEditor({
  discount,
  discountFormatType,
  appliedDiscountAmount,
  onDiscountChange,
  onFormatTypeChange,
}: DiscountEditorProps) {
  return (
    <div className="total-row items-start mt-2 border-t border-gray-100 dark:border-[#2a2a38] pt-3 pb-2">
      <div className="flex flex-col gap-2">
        <span className="text-gray-700 dark:text-gray-300">Discount</span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onFormatTypeChange('percentage')}
            className={`btn-toggle ${discountFormatType === 'percentage' ? 'active' : ''}`}
          >%</button>
          <button
            type="button"
            onClick={() => onFormatTypeChange('fixed')}
            className={`btn-toggle ${discountFormatType === 'fixed' || !discountFormatType ? 'active' : ''}`}
          >₹</button>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <div className="relative">
          <input
            type="number"
            className="form-input no-spinner w-32 text-right py-1 pr-8"
            value={discount}
            inputMode="decimal"
            onWheel={(e) => e.currentTarget.blur()}
            onChange={(e) => onDiscountChange(e.target.value)}
            placeholder="0.00"
            step="0.01"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">
            {discountFormatType === 'percentage' ? '%' : '₹'}
          </span>
        </div>
        {discountFormatType === 'percentage' && appliedDiscountAmount > 0 && (
          <span className="text-xs text-green-600 dark:text-green-500 font-medium">-₹{appliedDiscountAmount.toFixed(2)}</span>
        )}
      </div>
    </div>
  );
}
