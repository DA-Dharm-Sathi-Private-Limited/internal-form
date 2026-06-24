import { api } from './api';

export const delhiveryService = {
  createShipment(payload: Record<string, unknown>) {
    return api.post<{ results?: { status: number; data: Record<string, unknown> }[]; success: boolean }>(
      '/api/delhivery/shipment',
      payload
    );
  },

  getShippingCost(params: Record<string, string | number | undefined | null>) {
    return api.get<unknown[]>('/api/delhivery/shipping-cost', params);
  },

  getTat(params: Record<string, string | number | undefined | null>) {
    return api.get<{ data?: { tat: number }; expected_delivery_date?: string }>('/api/delhivery/tat', params);
  },

  checkPincode(pincode: string) {
    return api.get<{ delivery_codes?: unknown[] }>('/api/delhivery/pincode', { code: pincode });
  },

  getLabel(waybill: string, pdfSize = 'A4') {
    return api.get<Record<string, unknown>>('/api/delhivery/label', { waybill, pdf_size: pdfSize });
  },

  track(params: { waybill?: string; ref_ids?: string }) {
    return api.get<{ ShipmentData?: unknown[]; Error?: string }>('/api/delhivery/track', params);
  },

  requestPickup(data: { pickup_date: string; pickup_time: string; pickup_location: string; expected_package_count: number }) {
    return api.post<Record<string, unknown>>('/api/delhivery/pickup', data);
  },
};
