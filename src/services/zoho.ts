import { api } from './api';

export const zohoService = {
  async getItems() {
    const res = await api.get<{ items: unknown[] }>('/api/zoho/items');
    return res.items || [];
  },

  async getTaxes() {
    const res = await api.get<{ taxes: unknown[] }>('/api/zoho/taxes');
    return res.taxes || [];
  },

  getSettings() {
    return api.get<Record<string, unknown>>('/api/zoho/settings');
  },

  createInvoice(payload: Record<string, unknown>) {
    return api.post<Record<string, unknown>>('/api/invoices', payload);
  },

  getInvoicePdf(id: string) {
    // returns blob, use raw fetch
    return fetch(`/api/invoices/${id}/pdf`);
  },

  updateInvoice(id: string, payload: Record<string, unknown>) {
    return api.put<Record<string, unknown>>(`/api/invoices/${id}`, payload);
  },

  /** Fetches discount metadata for the given order (DB first, Zoho fallback). */
  getInvoiceDiscount(orderId: string) {
    return api.get<{ discount: number; discount_type: string; is_discount_before_tax: boolean }>(`/api/invoices/${orderId}`);
  },

  recordPayment(payload: Record<string, unknown>) {
    return api.post<Record<string, unknown>>('/api/payments', payload);
  },

  searchCustomers(query: string) {
    return api.get<unknown[]>('/api/customers', { q: query });
  },
};
