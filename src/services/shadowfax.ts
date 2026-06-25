import { api } from './api';

export const shadowfaxService = {
  checkServiceability(pincodes: string) {
    return api.get<{ success: boolean; data?: { pincode: string; serviceable: boolean }[]; error?: string }>(
      '/api/shadowfax/serviceability',
      { pincodes }
    );
  },

  generateAWB(count: number = 1) {
    return api.post<{ success: boolean; awbs?: string[]; error?: string }>(
      '/api/shadowfax/generate-awb',
      { count }
    );
  },

  createShipment(payload: Record<string, unknown>) {
    return api.post<{ success: boolean; data?: Record<string, unknown>; error?: string }>(
      '/api/shadowfax/create',
      payload
    );
  },

  track(clientOrderId: string) {
    return api.get<{ success: boolean; data?: Record<string, unknown>; error?: string }>(
      `/api/shadowfax/track/${clientOrderId}`
    );
  },

  cancel(clientOrderId: string, cancelRemarks: string) {
    return api.post<{ success: boolean; error?: string }>(
      '/api/shadowfax/cancel',
      { client_order_id: clientOrderId, cancel_remarks: cancelRemarks }
    );
  },
};
