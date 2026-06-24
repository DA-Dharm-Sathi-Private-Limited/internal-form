import { api } from './api';

export const dtdcService = {
  download(start: string, end: string) {
    return api.get<{ success: boolean; files?: { filename: string; content: string }[]; error?: string }>(
      '/api/dtdc/download',
      { start, end }
    );
  },

  downloadOuter(start: string, end: string) {
    return api.get<{ success: boolean; files?: { filename: string; content: string }[]; error?: string }>(
      '/api/dtdc/download-outer',
      { start, end }
    );
  },
};
