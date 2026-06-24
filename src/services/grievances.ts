import { api } from './api';

export const grievanceService = {
  list(page: number, limit: number) {
    return api.get<{ success: boolean; grievances?: unknown[]; pagination?: { total: number; page: number; limit: number; totalPages: number }; error?: string }>(
      '/api/grievances',
      { page: String(page), limit: String(limit) }
    );
  },
};
