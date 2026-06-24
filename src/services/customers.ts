import { api } from './api';

export const customerService = {
  get(id: string) {
    return api.get<Record<string, unknown>>(`/api/customers/${id}`);
  },

  create(payload: Record<string, unknown>) {
    return api.post<Record<string, unknown>>('/api/customers', payload);
  },

  update(id: string, payload: Record<string, unknown>) {
    return api.put<Record<string, unknown>>(`/api/customers/${id}`, payload);
  },

  search(query: string) {
    return api.get<{ customers?: unknown[] }>('/api/customers', { q: query });
  },
};
