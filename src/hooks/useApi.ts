import { useState, useCallback } from 'react';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiReturn<T> extends UseApiState<T> {
  execute: (...args: unknown[]) => Promise<T | undefined>;
  reset: () => void;
}

export function useApi<T = unknown>(
  fn: (...args: unknown[]) => Promise<T>
): UseApiReturn<T> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (...args: unknown[]): Promise<T | undefined> => {
      setState({ data: null, loading: true, error: null });
      try {
        const result = await fn(...args);
        setState({ data: result, loading: false, error: null });
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setState({ data: null, loading: false, error: msg });
        return undefined;
      }
    },
    [fn]
  );

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return { ...state, execute, reset };
}
