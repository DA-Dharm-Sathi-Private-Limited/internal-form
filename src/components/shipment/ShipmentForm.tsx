import { PlannedShipment } from './types';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { DELHIIVERY_WAREHOUSES } from '@/config/warehouses';

interface Props {
  shipment: PlannedShipment;
  index: number;
  onChange: (id: string, updates: Partial<PlannedShipment>) => void;
  deliveryPartnerOptions: { value: string; label: string }[];
  showPartnerSelector: boolean;
}

export function ShipmentForm({ shipment, index, onChange, deliveryPartnerOptions, showPartnerSelector }: Props) {
  return (
    <div className="form-grid-2">
      {showPartnerSelector && (
        <div className="form-group">
          <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1.5 text-sm">Delivery Partner</label>
          <div className="flex gap-4 mt-1">
            {deliveryPartnerOptions.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={shipment.deliveryPartner === opt.value}
                  onChange={() => onChange(shipment.id, { deliveryPartner: opt.value as PlannedShipment['deliveryPartner'] })}
                  className="accent-accent"
                />
                <span className="text-sm text-gray-700 dark:text-gray-200">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="form-group">
        <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1.5 text-sm">Vendor / Origin</label>
        <select
          className="form-input"
          value={shipment.warehouse}
          onChange={(e) => onChange(shipment.id, { warehouse: e.target.value, vendor: e.target.value })}
        >
          {DELHIIVERY_WAREHOUSES.map((w) => (
            <option key={w} value={w}>{w}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1.5 text-sm">Shipping Mode</label>
        <div className="flex gap-4 mt-1">
          {(['Surface', 'Express'] as const).map((m) => (
            <label key={m} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={shipment.shipping_mode === m}
                onChange={() => onChange(shipment.id, { shipping_mode: m })}
                className="accent-accent"
              />
              <span className="text-sm text-gray-700 dark:text-gray-200">{m}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1.5 text-sm">Payment Mode *</label>
        <div className="flex gap-4 mt-1">
          {(['Prepaid', 'COD'] as const).map((m) => (
            <label key={m} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={shipment.payment_mode === m}
                onChange={() => onChange(shipment.id, { payment_mode: m })}
                className="accent-accent"
              />
              <span className="text-sm text-gray-700 dark:text-gray-200">{m === 'COD' ? 'Cash on Delivery (COD)' : 'Prepaid'}</span>
            </label>
          ))}
        </div>
      </div>

      {shipment.payment_mode === 'COD' && (
        <Input
          label="Custom COD Amount (Optional)"
          type="number"
          value={shipment.cod_amount ?? ''}
          placeholder="Leave empty for auto-calculate"
          onChange={(e) => onChange(shipment.id, { cod_amount: e.target.value === '' ? '' : Number(e.target.value) })}
        />
      )}

      <div className="form-group">
        <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1.5 text-sm">Fragile Shipment?</label>
        <div className="flex items-center gap-2 h-10">
          <input
            type="checkbox"
            checked={!!shipment.fragile}
            onChange={(e) => onChange(shipment.id, { fragile: e.target.checked })}
            className="w-4 h-4 accent-accent rounded"
          />
          <span className="text-sm text-gray-600 dark:text-gray-300">Yes, handle with care</span>
        </div>
      </div>

      <Input
        label="Chargeable Weight (Grams) *"
        type="number"
        value={shipment.weight || ''}
        placeholder="e.g. 500"
        onChange={(e) => onChange(shipment.id, { weight: Number(e.target.value) })}
      />

      <div className="form-group">
        <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1.5 text-sm">Dimensions (cm) - Optional</label>
        <div className="flex gap-2">
          <input className="form-input flex-1" type="number" placeholder="L" value={shipment.length || ''}
            onChange={(e) => onChange(shipment.id, { length: Number(e.target.value) })} />
          <input className="form-input flex-1" type="number" placeholder="W" value={shipment.width || ''}
            onChange={(e) => onChange(shipment.id, { width: Number(e.target.value) })} />
          <input className="form-input flex-1" type="number" placeholder="H" value={shipment.height || ''}
            onChange={(e) => onChange(shipment.id, { height: Number(e.target.value) })} />
        </div>
      </div>

      <div className="form-group col-span-1 md:col-span-2">
        <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1.5 text-sm">Package Contents Description *</label>
        <input
          className="form-input"
          value={shipment.products_desc || ''}
          onChange={(e) => onChange(shipment.id, { products_desc: e.target.value })}
          placeholder="e.g. T-shirts, Books"
        />
      </div>
    </div>
  );
}
