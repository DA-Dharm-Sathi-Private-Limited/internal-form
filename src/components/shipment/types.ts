import { DELHIIVERY_WAREHOUSES } from '@/config/warehouses';
import { SHIPPING_PROVIDERS } from '@/config/providers';

export type DeliveryPartner = 'Delhivery' | 'DTDC' | 'Shadowfax' | 'SELF';

export interface PlannedShipment {
  id: string;
  vendor: string;
  deliveryPartner: DeliveryPartner;
  warehouse: string;
  items: { lineIndex: number; quantity: number }[];
  isSelfShipment?: boolean;
  shipping_mode: 'Surface' | 'Express';
  payment_mode: 'Prepaid' | 'COD';
  fragile: boolean;
  weight: number;
  length: number;
  width: number;
  height: number;
  products_desc: string;
  cod_amount?: number | '';
  provider?: string;
  awb?: string;
}

export function isSelfShipment(s: PlannedShipment) {
  return s.isSelfShipment || s.deliveryPartner === 'SELF';
}

export function getPartnerLabel(s: PlannedShipment) {
  if (isSelfShipment(s)) return 'SELF SHIPPED';
  return s.deliveryPartner.toUpperCase();
}

export const WAREHOUSE_OPTIONS = DELHIIVERY_WAREHOUSES.map((w: string) => ({ value: w, label: w }));
export const PROVIDER_OPTIONS = [
  { value: '', label: 'Select Provider' },
  ...SHIPPING_PROVIDERS.map((p: string) => ({ value: p, label: p })),
];
