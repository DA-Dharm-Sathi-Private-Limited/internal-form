import { api } from './api';

export interface OrderShipment {
  vendor: string;
  deliveryPartner?: string;
  waybill?: string;
  shippingCost: number;
  warehouse: string;
  paymentMode?: string;
  codAmount?: number;
  items: { lineIndex: number; quantity: number }[];
}

export interface CreateOrderPayload {
  zohoInvoiceId: string;
  orderId: string;
  customerDetails: Record<string, string | undefined>;
  astrologerDetails?: Record<string, string | undefined>;
  invoiceItems: unknown[];
  invoiceTotal: number;
  invoiceDate: string;
  salespersonName: string;
  paymentMode: string;
  status: string;
  selfShipped: boolean;
  waybill?: string;
  labelUrl?: string | null;
}

export interface UpdateOrderPayload {
  status?: string;
  selfShipped?: boolean;
  shipmentsAppend?: OrderShipment[];
  waybill?: string | null;
  waybills?: string[];
  shippingCost?: number;
  selfShipmentStatus?: string;
  selfShipmentNotes?: string;
  invoiceItems?: { cost_price: number }[];
}

export interface OrderResponse {
  success: boolean;
  order?: Record<string, unknown>;
  orders?: Record<string, unknown>[];
  error?: string;
}

export interface RevenueResponse {
  success: boolean;
  data?: { salespersonName: string; totalRevenue: number; orderCount: number; orders: Record<string, unknown>[] }[];
  error?: string;
}

export const ordersService = {
  list(all = false) {
    return api.get<OrderResponse>('/api/orders', { all: all ? 'true' : undefined });
  },

  getTracked(params: Record<string, string | number | undefined | null> = {}) {
    return api.get<{ success?: boolean; waybills?: unknown[] }>('/api/orders/tracked', params);
  },

  search(type: string, query: string) {
    return api.get<{ success: boolean; orders?: Record<string, unknown>[] }>('/api/orders/search', { type, q: query });
  },

  get(id: string) {
    return api.get<OrderResponse>(`/api/orders/${id}`);
  },

  create(payload: CreateOrderPayload) {
    return api.post<OrderResponse>('/api/orders', payload);
  },

  update(id: string, payload: UpdateOrderPayload) {
    return api.patch<OrderResponse>(`/api/orders/${id}`, payload);
  },

  del(id: string) {
    return api.del<OrderResponse>(`/api/orders/${id}`);
  },

  syncDaily() {
    return api.post<{ message: string }>('/api/orders/sync-daily');
  },

  getRevenue(params: Record<string, string | number | undefined | null> = {}) {
    return api.get<RevenueResponse>('/api/orders/revenue', params);
  },
};
