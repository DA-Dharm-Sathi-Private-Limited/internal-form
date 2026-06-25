import { api } from './api';

export const shadowfaxService = {
  checkServiceability(params: { service?: string; pincodes?: string; page?: number; count?: number }) {
    return api.get<{ success: boolean; data?: unknown; error?: string }>(
      '/api/shadowfax/serviceability',
      params as Record<string, string | number | undefined | null>
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

  track(awbNumber: string) {
    return api.get<{ success: boolean; data?: Record<string, unknown>; error?: string }>(
      `/api/shadowfax/track/${awbNumber}`
    );
  },

  trackMultiple(awbNumbers: string[]) {
    return api.post<{ success: boolean; data?: Record<string, unknown>; error?: string }>(
      '/api/shadowfax/track/',
      { awb_numbers: awbNumbers }
    );
  },

  cancel(clientOrderId: string, cancelRemarks: string) {
    return api.post<{ success: boolean; error?: string }>(
      '/api/shadowfax/cancel',
      { client_order_id: clientOrderId, cancel_remarks: cancelRemarks }
    );
  },

  updateOrder(payload: Record<string, unknown>) {
    return api.post<{ success: boolean; data?: Record<string, unknown>; error?: string; message?: string }>(
      '/api/shadowfax/update',
      payload
    );
  },
};
