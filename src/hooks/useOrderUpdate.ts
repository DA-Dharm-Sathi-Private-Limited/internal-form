import { useState, useCallback } from 'react';
import { ordersService, UpdateOrderPayload } from '@/services/orders';

export function useOrderUpdate() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateOrder = useCallback(async (id: string, payload: UpdateOrderPayload) => {
    setLoading(true);
    setError(null);
    try {
      const result = await ordersService.update(id, payload);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update order';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { updateOrder, loading, error };
}
