import { useEffect, useState } from 'react';

export const DEFAULT_DEBOUNCE_MS = 300;

/**
 * Devuelve `value` retardado `delayMs` (default 300 ms).
 * Útil para search en tiempo real sin una petición por tecla.
 */
export function useDebouncedValue<T>(
  value: T,
  delayMs: number = DEFAULT_DEBOUNCE_MS,
): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [value, delayMs]);

  return debouncedValue;
}
